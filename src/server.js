import { createReadStream, existsSync, readFile, readFileSync } from "fs";
import { SavanahError as SavanahError } from "./base/error.js";
import { createFolders } from "./base/other.js";
import { joinShardParse } from "./base/parser.js";
import { ensure } from "./base/type.js";
import { insert, insertS, insertSM, multiInsert } from "./ops/insert.js";
import { joinParser, shardSearch, joinShard } from "./ops/where.js";
import { Syncer, Communicator } from "./ops/syncer.js";
import es from 'event-stream'
import ws from 'ws'
import { createServer } from 'https'

class ServerCom {

}

export class Server {
    constructor(opts) {
        let self = this;
        this.config = {}
        if (!opts)
            throw new SavanahError({
                msg: 'Provide path, key and other necessary details in the options',
                name: 'Missing Required Params'
            })
        ensure(opts, 'obj', 'ServerOptions')
        let { secure, cert, privateKey, server, allowedIps, path, key, syncInterval } = opts;


        this.config['allowedIps'] = allowedIps ? allowedIps : ['::ffff:127.0.0.1', '127.0.0.1']
        if (secure) {
            ensure(cert, 'string', 'Path to Certificate')
            ensure(privateKey, 'string', 'Path to Key')
            if (!existsSync(cert) || !existsSync(privateKey))
                throw new SavanahError({
                    msg: 'The given Certificate / Key does not exist',
                    name: 'Invalid Credentials'
                })
            this.config['cert'] = readFileSync(cert, { encoding: 'utf-8' })
            this.config['privateKey'] = readFileSync(privateKey, { encoding: 'utf-8' })
            let secureServer = createServer({
                cert: this.config['cert'],
                key: this.config['privateKey']
            })
            server = new ws.Server({
                server: secureServer,
                port: 7777,
                verifyClient: (client, done) => {
                    if (client.req.headers['key'] != key) return done(false, 405);
                    if (!this.config['allowedIps'].includes('0.0.0.0') && !this.config['allowedIps'].includes(client.req.socket.remoteAddress)) return done(false, 403)
                    done(true, 200)
                }
            })
        } else server = new ws.Server({
            port: 7777,
            verifyClient: (client, done) => {
                if (client.req.headers['key'] != key) return done(false, 405);
                if (!this.config['allowedIps'].includes('0.0.0.0') && !this.config['allowedIps'].includes(client.req.socket.remoteAddress)) return done(false, 403)
                done(true, 200)
            }
        })

        ensure(path, 'string', 'path')
        this.com = new ServerCom()
        this.path = path;

        ensure(key, 'string', 'Key')
        if (key.length < 16)
            throw new SavanahError({
                name: 'Invalid Key Length',
                msg: 'The Length of the Key must be greater than or equal to 16'
            })

        this.key = key;

        function sendMsg(ws, json) {
            ws.send(JSON.stringify(json))
        }

        function emergency() {
            let i = 0;
            let c = 0;
            server.close()
            let dbs = Object.keys(self.com)
            return new Promise((res, rej) => {
                dbs.forEach(db => {
                    let tbs = Object.keys(self.com[db]).filter(d => d != 'com')
                    c += tbs.length;
                    tbs.forEach(async tb => {
                        if (self.com[db][tb].syncing) new Promise((res, rej) => {
                            setInterval(_ => {
                                if (!self.com[db][tb].syncing) res()
                            }, 600)
                        }).then(_ => {
                            i += 1;
                            if (i == c) res()
                        })
                        else self.com[db][tb].sync.sync().then(_ => {
                            i += 1;
                            if (i == c) res()
                        })
                    })
                })
            })
        }

        function getTable(db, name) {
            if (!self.com?.[db]) {
                self.com[db] = {}
                self.com[db]['com'] = new Communicator()
            }
            if (!self.com[db]?.[name])
                self.com[db][name] = new Table(name, self.path + '/' + db, self.com[db]['com'], syncInterval)
            return self.com[db][name]
        }
        server.on('connection', (ws, req) => {
            ws.on('message', m => {
                m = JSON.parse(m)
                let t = getTable(m.db, m.tb)
                let { id } = m;
                let { doc, docs, ftr, opts, upd, array } = m.params
                switch (m.cmd) {
                    case 'insert':
                        t.insert(doc).then(_ => sendMsg(ws, { res: 0, id }))
                        break;
                    case 'insertset':
                        t.insertSet(docs, _ => sendMsg(ws, { res: 0, id }))
                        break;
                    case 'search':
                        t.search(ftr, opts).then(ds => sendMsg(ws, { res: ds, id }))
                        break;
                    case 'update':
                        t.update(ftr, upd, opts)
                        sendMsg(ws, { res: 0, id })
                        break;
                    case 'delete':
                        t.delete(ftr, opts)
                        sendMsg(ws, { res: 0, id })
                        break;
                    case 'shard':
                        t.shard(array).then(_ => sendMsg(ws, { res: 0, id }))
                        break;
                    case 'unshard':
                        t.unshard().then(_ => sendMsg(ws, { res: 0, id }))
                        break;
                }
            })
        })
        process.on('SIGINT', _ => {
            emergency().then(_ => process.kill(process.pid))
        })
        process.on('SIGKILL', _ => {
            emergency().then(_ => process.kill(process.pid))
        })
        /*
         process.on('uncaughtException' , e => {
            emergency().then(_ => console.log(e))
        })
        process.on('unhandledRejection' , e => {
            emergency().then(_ => console.log(e))
        })
        */

    }
}

class Table {
    constructor(name, path, com, syncInterval) {
        this.com = com;
        this.raw_path = path;
        this.path = path + '/' + name;
        if (existsSync(this.path + '/shard.meta') && !existsSync(this.path + '/docs.wr')) this.shards = readFileSync(this.path + '/shard.meta', { encoding: 'utf-8' }).split(',')
        this.sync = new Syncer(this.path, syncInterval ? syncInterval : 1500, this.shards)
        createFolders(this.path + '/')
    }
    insert(doc) {
        ensure(doc, 'json', 'Document')
        if (this.shards) return insertS(doc, this.shards, this.path)
        return insert(doc, this.path)
    }
    insertSet(arr) {
        ensure(arr, 'array', 'Document Set')
        if (this.shards) return insertSM(arr, this.path, this.shards)
        return multiInsert(arr, this.path)
    }
    search(condition, opts) {
        let l, join;
        if (opts)
            ({ l, join } = opts)
        let o = this.shards ? shardSearch(condition, this.path, this.shards, l, this.sync.shardSync) : this.sync.baseSearch(condition, this.path, l)
        if (!join) return o;
        else
            return new Promise((res, rej) => {
                let tbs = Object.keys(join)
                o.then(ds => {
                    let i = 0
                    tbs.forEach(tb => {
                        if (existsSync(this.raw_path + '/' + tb + '/shard.meta')) {
                            readFile(this.raw_path + '/' + tb + '/shard.meta', { encoding: 'utf-8' }, (err, shards) => {
                                if (err) throw err;
                                shards = shards.split(' ')
                                let u = joinShardParse(join[tb], tb, ds)
                                joinShard(u, ds, shards, this.raw_path, this.com).then(nd => {
                                    i += 1;
                                    if (i == tbs.length) res(nd)
                                }).catch(er => rej(er))
                            })
                        } else {
                            let ftr = joinParser(join[tb], tb, ds.length)
                            let sync = this.com[tb]?.sync?.queue ? this.com[tb].sync.queue.join(' ') : ''
                            let n = ftr[0];
                            let c = 0;
                            let r = createReadStream(this.raw_path + '/' + n + '/docs.wr')
                            r.pipe(es.split()).pipe(es.parse()).on('data', doc => {
                                eval(sync)
                                eval(ftr[1])
                            })
                            r.on('close', _ => {
                                i += 1;
                                if (i == tbs.length) res(o)
                            })
                        }
                    })
                })
            })
    }
    update(condition, upd, opts) {
        let limit;
        if (opts) ({ limit } = opts)
        if (this.shards) {
            let a = updateShard(this.path, this.shards, condition, upd)
            return a.files.forEach(sh => {
                this.sync.updateShard(a.ftr, sh, this.shards, upd, limit)
            })
        }
        else
            this.sync.updateQ(condition, upd, limit)
        return 0;
    }
    shard(array) {
        return new Promise((res, rej) => {
            this.sync.splitShard(array, this.path).then(_ => {
                res()
                this.shards = array
            })
        })
    }
    unshard() {
        return this.sync.unshard(this.path, this.shards)
    }
    delete(condition, opts) {
        let limit;
        if (opts)
            ({ limit } = opts)
        if (this.shards) {
            let a = updateShard(this.path, this.shards, condition)
            return a.files.forEach(sh => {
                this.sync.deleteShard(a.ftr, this.shards, sh, limit)
            })
        }
        else return this.sync.deleteQ(condition, limit)
    }
    forceSync() {
        return this.sync.sync()
    }
}