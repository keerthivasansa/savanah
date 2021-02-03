import { SSL_OP_NO_SSLv3, SSL_OP_NO_TLSv1_1 } from 'constants';
import { randomBytes } from 'crypto';
import { EventEmitter } from 'events';
import ws from 'ws'
import { decJson, encJson, henc } from './base/crypto.js';
import { SavanahError } from './base/error.js';
import { sliceKey } from './base/other.js';
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
        let { pass, secure, port, host, user, encryptionKey } = opts;
        ensure(pass, 'string', 'Password')
        ensure(user, 'string', 'User')
        if (host) ensure(host, 'string', 'Host')
        else host = '127.0.0.1'
        this.loaded = false;
        if (port) {
            let t = typeof (port)
            if (t != 'string' && t != 'number')
                throw new SavanahError({
                    msg: 'Port should be a number or a string',
                    name: 'Invalid port'
                })
        }
        else port = '7777'
        this.enckey = encryptionKey ? sliceKey(encryptionKey) : sliceKey(pass)
        if (secure)
            this.url = `wss://${host}:${port}`
        else this.url = `ws://${host}:${port}`
        this.ws = new ws(this.url, {
            protocolVersion: 8,
            origin: 'https://localhost:7777',
            rejectUnauthorized: false,
            headers: {
                user, pass
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
            this.reqCache[m.id].emit('data', m)
        })
    }
    db(name) {
        ensure(name, 'string', 'Database Name')
        return new Database(name, this)
    }
    load() {
        return new Promise((res, rej) => {
            if (this.ws.OPEN != this.ws.readyState) this.ws.on('open', _ => res())
            else res()
            this.loaded = true
        })
    }
    send(json) {
        return new Promise((res, rej) => {
            this.load().then(_ => {
                let id = idGen()
                while (this.reqCache[id]) { id = idGen() }
                json['id'] = id;
                json['usr'] = this.usr;
                this.ws.send(JSON.stringify(json))
                this['reqCache'][id] = new EventEmitter()
                this.reqCache[id].on('data', d => {
                    if (d.res === false) {
                        let m;
                        switch (d.code) {
                            case 2:
                                m = "[ERROR] User is not authorized to perform this action"
                                break;
                            case 3:
                                m = "[ERROR] Unauthorized Action"
                                break;
                            case 4:
                                m = "[ERROR] Only the root account can delete itself";
                                break
                            case 5:
                                m = "[ERROR] Cannot delete the only account with root permissions";
                                break
                            case 6:
                                m = "[ERROR] No such account found";
                                break;
                            default:
                                m = "[ERROR] Server turned down request unexpectedly"
                                break;
                        }
                        let e = new Error(m)
                        throw e;
                    }
                    res(d.res);
                    delete this['reqCache'][id]
                })
            })
        })
    }
    createUser(opts) {
        ensure(opts, 'obj', 'User Object')
        let { user, pass } = opts;
        ensure(user, 'string', 'Username')
        ensure(pass, 'string', 'Password')
        if (pass.length == 32)
            throw new Error('The Password must have a length of 32')
        opts['auth'] = henc(pass, randomBytes(8).toString('hex'))
        delete opts['pass']
        return this.send({
            cmd: 'createusr',
            params: { load: opts }
        })
    }
    deleteUser(user) {
        ensure(user, 'string', 'Username')
        return this.send({
            cmd: 'deleteusr',
            params: { user }
        })
    }
    editUser(user, perms) {
        ensure(user, 'string', 'Username')
        ensure(perms, 'obj', 'User Permissions')
        delete perms['user'];
        delete perms['auth']
        return this.send({
            cmd: 'editusr',
            params: { user, perms }
        })
    }
}

class Database {
    constructor(name, client) {
        this.client = client;
        this.name = name;
    }
    table(name, opts) {
        ensure(name, 'string', 'Table Name')
        if (opts) {
            ensure(opts, 'obj', 'Table Options')
            let ekey
            let { syncInterval, encrypt, decrypt, encryptionKey } = opts;
            if (syncInterval) ensure(syncInterval, 'number', 'SyncInterval')
            if (encrypt) {
                ensure(encrypt, 'arr', 'Fields to be encrypted');
                ekey = encryptionKey ? encryptionKey : 'c'
                if (!eKey)
                    throw new Error('There is no encryption key provided in the Client Options or Table Options')
            }
            return new Table(name, this.name, this.client, syncInterval, encrypt, decrypt, ekey)
        }
        return new Table(name, this.name, this.client)
    }
}



class Table {
    constructor(name, db, com, si, encrypt, decrypt, ekey) {
        this.client = com;
        this.db = db;
        this.name = name;
        this.decrypt = decrypt;
        this.loaded = false;
        this.syncInterval = si;
        this.encrypt = encrypt;
        if (ekey != 'c') this.ekey = ekey;
    }
    result(res) {
        if (this.encrypt && this.decrypt)
            return res.map(d => { return decJson(this.ekey ? this.ekey : this.client.enckey, doc, keys) })
        else return res;
    }
    send(json) {
        json['tb'] = this.name;
        json['db'] = this.db;
        return this.client.send(json)
    }
    encrypter(doc, keys) {
        return encJson(this.ekey ? this.ekey : this.client.enckey, doc, keys)
    }
    insert(doc) {
        ensure(doc, 'obj', 'Document')
        if (this.encrypt) doc = this.encrypter(doc)
        return this.send({
            cmd: 'insert',
            params: { doc }
        })
    }
    insertSet(docs) {
        ensure(docs, 'arr', 'DocumentSet')
        if (this.encrypt) docs = docs.map(d => { return this.encrypter(d) })
        return this.send({
            cmd: 'insertset',
            params: { docs }
        })
    }
    search(ftr, opts) {
        if (opts) ensure(opts, 'obj', 'SearchOptions')
        return new Promise((res, rej) => {
            this.send({
                cmd: 'search',
                params: { ftr, opts }
            }).then(r => {
                res(this.result(r))
            })
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