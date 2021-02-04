import gfs from "graceful-fs";
const { createReadStream, existsSync, readFile, readFileSync } = gfs
import { SavanahError } from "./base/error.js";
import { createFolders } from "./base/other.js";
import { joinShardParse } from "./base/parser.js";
import { ensure } from "./base/type.js";
import { insert, insertS, insertSM, multiInsert } from "./ops/insert.js";
import { joinParser, shardSearch, joinShard } from "./ops/where.js";
import { Syncer, Communicator } from "./ops/syncer.js";
import es from 'event-stream'
import ws from 'ws'
import { createServer } from 'https'
import { decryptFile, encryptFile, hdec } from "./base/crypto.js";
import { updateShard } from "./ops/sharding.js";

class ServerCom {

}

const admincmds = ['createusr', 'deleteusr', 'editusr']


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
        let { masterKey, cert, privateKey, server, allowedIps, path, syncInterval, port, sslPassphrase } = opts;
        ensure(masterKey, 'string', 'MasterKey')
        if (masterKey.length != 64)
            throw new Error('The MasterKey must be of length 64. You can use genKey(64) to generate a new key easily')
        this.path = path;
        if (existsSync(path + '/__meta/usr.conf')) {
            decryptFile(masterKey, path + '/__meta/usr.conf').then(res => {
                if (res == 't')
                    throw new Error('The User Configurate has been tampered with or the masterKey is not the same key used to encrypt before.')
                this.users = JSON.parse(res)
            })
        } else {
            createFolders(path + '/__meta/usr.conf')
            this.users = {
                root: {
                    admin: true,
                    auth: 'IYFehruErliQetvYxankdtDXko9JSNPCkc+9VBjNavLxcrRsWTQkkAmzIqBL3wqGJiuLT1X0ABMfBc0t3sZXPg==9IyiKeGAYZDtlqY=.hki9Yr0ddJ4UT+x8Gs/zDMW4vhs9wXXE2/H/iInBw9uc='
                }
                // { user : "root" , pass : "create a new admin account with a secure password and delete this" }
                // This account is just here to make SavanahDB familiar to use for you. Once you are done with basics and setting up, create a new admin account and delete this account.
                // ANYONE can access your Database over network if you keep this account. You SHOULD NOT open SavanahDB beyond localhost before deleting this account
            }
        }
        if (port) {
            let t = typeof (port)
            if (t != 'string' && t != 'number')
                throw new SavanahError({
                    msg: 'Port should be a number or a string',
                    name: 'Invalid port'
                })
        }
        else port = 7777

        function verifyUsr(name, pass) {
            if (!self.users?.[name]?.auth) return false;
            return hdec(pass, self.users[name]['auth'])?.tamper != true ? true : false;
        }
        this.config['allowedIps'] = allowedIps ? allowedIps : ['::ffff:127.0.0.1', '127.0.0.1']
        if (cert) {
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
                key: this.config['privateKey'],
                rejectUnauthorized: false
            }, (req, res) => {
                res.write("Hello, welcome!")
                res.end()
            })
            secureServer.listen(2309)
            server = new ws.Server({
                server: secureServer,
                port,
                verifyClient: (client, done) => {
                    if (!this.config['allowedIps'].includes('0.0.0.0') && !this.config['allowedIps'].includes(client.req.socket.remoteAddress)) return done(false, 403)
                    if (!verifyUsr(client.req.headers['user'], client.req.headers['pass'])) return done(false, 405);
                    done(true, 200)
                }
            })
        } else server = new ws.Server({
            port,
            verifyClient: (client, done) => {
                if (!this.config['allowedIps'].includes('0.0.0.0') && !this.config['allowedIps'].includes(client.req.socket.remoteAddress)) return done(false, 403)
                if (!verifyUsr(client.req.headers['user'], client.req.headers['pass'])) return done(false, 405);
                done(true, 200)
            }
        })

        ensure(path, 'string', 'path')
        this.com = new ServerCom()
        this.path = path;

        function sendMsg(ws, json) {
            ws.send(JSON.stringify(json))
        }

        function emergency() {
            let i = 0;
            let c = 0;
            server.close()
            let dbs = Object.keys(self.com)
            return new Promise((res, rej) => {
                if (dbs.length == 0) return res()
                dbs.forEach(db => {
                    let tbs = Object.keys(self.com[db]).filter(d => d != 'com')
                    c += tbs.length;
                    tbs.forEach(tb => {
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
        function isAuth(db, usr, cmd) {
            if (self.users?.[usr]?.["admin"] === true)
                return true;
            else if (self.users?.[usr]?.[db] === "all" ? true : self.users?.[usr]?.[db]?.includes(cmd))
                return true
            else return false;
        }
        function isAdmin(usr) {
            return self.users?.[usr]?.["admin"] === true ? true : false
        }
        server.on('connection', (ws, req) => {
            function updateUsrConfig(id) {
                encryptFile(masterKey, JSON.stringify(self.users), path + '/__meta/usr.conf').then(_ => {
                    sendMsg(ws, { res: 0, id })
                })
            }
            ws.on('message', m => {
                m = JSON.parse(m)
                let { id, db, tb, usr, cmd, params } = m;
                if (!admincmds.includes(cmd) ? isAdmin(usr) : isAuth(db, usr, cmd))
                    return sendMsg(ws, { res: false, code: 2, id })
                let t = getTable(db, tb)
                let { doc, docs, ftr, opts, upd, array } = params
                switch (cmd) {
                    case 'ping':
                        return sendMsg(ws, { res: 0, id })
                    case 'createusr':
                        let usr_ = m.params['load']['user'];
                        if (this.users[usr_]) return sendMsg(ws, { res: false, code: 7, id })
                        this.users[usr_] = m.params['load']
                        updateUsrConfig(id)
                        break;
                    case 'editusr':
                        let usredit = this.users[m.params['load']['user']];
                        if (!usredit) return sendMsg(ws, { res: false, code: 8, id })
                        if (usredit?.admin === true && usredit['user'] != usr) return sendMsg(ws, { res: false, code: 8, id })
                        Object.keys(m.params['perms']).forEach(key => {
                            this.users[m.params['perms']['user']][key] = m.params['perms'][key]
                        })
                        updateUsrConfig(id)
                        break;
                    case 'deleteusr':
                        let user = m.params['user']
                        if (!this.users[user]) return sendMsg(ws, { res: false, code: 6, id })
                        if (user != usr) return sendMsg(ws, { res: false, code: 4, id })
                        let tmp = this.users[user];
                        delete this.users[user]
                        if (Object.keys(this.users).filter(d => this.users[d]['root'] == true).length < 1) {
                            this.users[user] = tmp;
                            return sendMsg(ws, { res: false, code: 5, id })
                        }
                        updateUsrConfig(id)
                        break;
                    case 'insert':
                        t.insert(doc).then(_ => sendMsg(ws, { res: 0, id }))
                        break;
                    case 'insertset':
                        t.insertSet(docs).then(_ => sendMsg(ws, { res: 0, id }))
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
        if (!existsSync(this.path + '/docs.wr')) return new Promise((res, rej) => res([]))
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
                            if (!existsSync(this.raw_path + '/' + n + '/docs.wr')) return;
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
            updateShard(this.path, this.shards, condition, upd).then(a => {
                return a.files.forEach(sh => {
                    this.sync.updateShard(a.ftr, sh, this.shards, upd, limit)
                })
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
            updateShard(this.path, this.shards, condition).then(a => {
                return a.files.forEach(sh => {
                    this.sync.deleteShard(a.ftr, this.shards, sh, limit)
                })
            })
        }
        else return this.sync.deleteQ(condition, limit)
    }
    forceSync() {
        return this.sync.sync()
    }
}