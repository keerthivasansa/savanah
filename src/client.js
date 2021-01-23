import { EventEmitter } from 'events';
import ws from 'ws'
import { SavanahError } from './base/error.js';
import { ensure } from './base/type.js';
import { filterChk } from './ops/virtualize.js';


function idGen() {
    return Math.random().toString(32) + Math.random().toString(32)
}


export class Client {
    constructor(opts) {
        this.com = new EventEmitter()
        this.reqCache = {}
        ensure(opts, 'obj', 'ClientOptions')
        let { key, secure, port, host } = opts;
        ensure(key, 'string', 'Key')
        if (host) ensure(host, 'string', 'Host')
        else host = '127.0.0.1'
        if (port) {
            let t = typeof (port)
            if (t == 'string' || t == 'number')
                throw new SavanahError({
                    msg: 'Port should be a number or a string',
                    name: 'Invalid port'
                })
        }
        else port = '7777'
        if (secure)
            this.url = `wss://${host}:${port}`
        else this.url = `ws://${host}:${port}`

        this.ws = new ws(this.url, {
            headers: {
                key
            }
        }).on('unexpected-response', (req, res) => {
            switch (res.statusCode) {
                case 405:
                    throw new SavanahError({
                        msg: 'This Key is not valid for the given address',
                        name: 'Key Mismatch'
                    })
                case 403:
                    throw new SavanahError({
                        msg: 'Unauthorized',
                        name: 'Forbidden'
                    })
            }
        }).on('error', (err) => {
            switch (err.code) {
                case 'ECONNREFUSED':
                    throw new SavanahError({
                        msg: 'Server does not exist / refused to connect',
                        name: 'Connection Failed'
                    })
                default:
                    throw err;
            }
        }).on('message', m => {
            m = JSON.parse(m)
            this.reqCache[m.id].emit('data', m.res)
        })
    }
    db(name) {
        ensure(name, 'string', 'Database Name')
        return new Database(name, this)
    }
}

class Database {
    constructor(name, client) {
        this.client = client;
        this.name = name;
    }
    table(name) {
        ensure(name, 'string', 'Table Name')
        return new Table(name, this.name, this.client)
    }
}
class Table {
    constructor(name, db, com) {
        this.client = com;
        this.db = db;
        this.name = name;
        this.loaded = false;
    }
    send(json) {
        return new Promise((res, rej) => {
            this.load().then(_ => {
                let id = idGen()
                while (this.client.reqCache[id]) { id = idGen() }
                json['tb'] = this.name;
                json['db'] = this.db;
                json['id'] = id;
                this.client.ws.send(JSON.stringify(json))
                this.client['reqCache'][id] = new EventEmitter()
                this.client.reqCache[id].on('data', d => {
                    res(d);
                    delete this.client['reqCache'][id]
                })
            })
        })
    }
    load() {
        return new Promise((res, rej) => {
            if (this.client.ws.OPEN != this.client.ws.readyState) this.client.ws.on('open', _ => res())
            else res()
            this.loaded = true
        })
    }
    insert(doc) {
        ensure(doc, 'obj', 'Document')
        return this.send({
            cmd: 'insert',
            params: { doc }
        })
    }
    insertSet(docs) {
        ensure(docs, 'arr', 'DocumentSet')
        return this.send({
            cmd: 'insertset',
            params: { docs }
        })
    }
    search(ftr, opts) {
        if (opts) ensure(opts, 'obj', 'SearchOptions')
        return this.send({
            cmd: 'search',
            params: { ftr, opts }
        })
    }
    update(ftr, upd, opts) {
        ensure(ftr, 'string', 'Filter')
        if (opts) ensure(opts, 'obj', 'UpdateOptions')
        ensure(upd, 'obj', 'UpdateObject')
        ftr = baseFtrParse(ftr)
        upd = updateDocParser(upd)
        filterChk(upd)
        filterChk(condition)
        return this.send({
            cmd: 'update',
            params: { ftr, upd, opts }
        })
    }
    shard(array) {
        ensure(array, 'arr', 'Shard Keys')
        return this.send({
            cmd: 'shard',
            params: { array }
        })
    }
    unshard() {
        return this.send({
            cmd: 'unshard',
            params: 0
        })
    }
    delete(ftr, opts) {

        ensure(ftr, 'string', 'Filter')
        if (opts) ensure(opts, 'obj', 'UpdateOptions')
        ftr = baseFtrParse(ftr)
        filterChk(ftr)
        return this.send({
            cmd: 'delete',
            params: { ftr, opts }
        })
    }
}