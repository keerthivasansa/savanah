import { createCipheriv, createHmac, randomBytes } from "crypto"
import gfs from "graceful-fs";
const { writeFile  , readFile } = gfs;
import isObj from 'type/object/is.js'

function val(c) {
    if (isObj(c)) return 'o' + JSON.stringify(c)
    else return 'n' + c;
}

function deval(c) {
    if (c.startsWith('o')) return JSON.parse(c.slice(1))
    else return c.slice(1)
}

export function henc(tsecret, v) {
    tsecret = Buffer.from(tsecret).slice(0, 32)
    let iv = randomBytes(64)
    let c = createCipheriv('aes-256-gcm', tsecret, iv)
    let d = c.update(val(v))
    let fin = iv.toString('base64') + Buffer.concat([d, c.final()]).toString('base64')
    let hmac = createHmac('sha256', tsecret).update(fin).digest().toString('base64')
    return fin + '.h' + hmac
}
export function hdec(tsecret, str) {
    tsecret = Buffer.from(tsecret).slice(0, 32)
    let y = str.split('.h')
    let data = y[0]
    let hmac = y.slice(1).join('.h')
    if (!verify(tsecret, data, hmac))
        return { tamper: true }
    let iv = Buffer.from(data.slice(0, 88), 'base64')
    let c = createCipheriv('aes-256-gcm', tsecret, iv)
    let d = c.update(Buffer.from(data.slice(88), 'base64'))
    return deval(Buffer.concat([d, c.final()]).toString())
}
export function encrypt(tsecret, v) {
    let iv = randomBytes(16)
    let c = createCipheriv('aes-256-gcm', tsecret, iv)
    let d = c.update(val(v))
    let fin = iv.toString('base64') + Buffer.concat([d, c.final()]).toString('base64')
    let hmac = createHmac('sha256', tsecret).update(fin).digest().toString('base64')
    return fin + '.h' + hmac
}

function verify(sec, data, hash) {
    let hmac = createHmac('sha256', sec).update(data).digest().toString('base64')
    if (hmac == hash) return true;
    else return false;
}

export function decrypt(tsecret, str) {
    let y = str.split('.h')
    let data = y[0]
    let hmac = y.slice(1).join('.h')
    if (!verify(tsecret, data, hmac))
        return '[Tampered]'
    let iv = Buffer.from(data.slice(0, 24), 'base64')
    let c = createCipheriv('aes-256-gcm', tsecret, iv)
    let d = c.update(Buffer.from(data.slice(24), 'base64'))
    return deval(Buffer.concat([d, c.final()]).toString())
}

export function encJson(t, d, keys) {
    let str = ''
    keys.forEach(k => {
        let y = 'd'
        k.split('.').forEach(o => {
            y += `?.["${o}"]`
        })
        let v = y.replace(/\?\.\[/g, '[')
        str += `if (${y}) ${v} = encrypt(t,${v});`
    })
    eval(str);
    return d;
}

export function decJson(t, d, keys) {
    let str = ''
    keys.forEach(k => {
        let y = 'd'
        k.split('.').forEach(o => {
            y += `?.["${o}"]`
        })
        let v = y.replace(/\?\.\[/g, '[')
        str += `if (${y}) ${v} = decrypt(t,${v});`
    })
    eval(str);
    return d;
}

export function genKey(length, opts = {}) {
    let k = randomBytes(length / 2).toString('hex')
    let { silent = true, label = 'Generated Key' } = opts
    if (!silent) console.log(`Generated Key Pair : ${label} : ${k}`)
    return k
}

export function encryptFile(key, data, path) {
    return new Promise((res, rej) => writeFile(path, henc(key, data), _ => res()))
}
export function decryptFile(key, path) {
    return new Promise((res, rej) => readFile(path).then(buf => res(hdec(key, buf.toString()))))
}

/**
encryptFile(tse, JSON.stringify({
    root: {
        admin: true,
    }, node: {
        lib: ['insert', 'update'],
        node: ['search']
    } , user2 : {
        lib : ['search']
    } , imp : {
        auth : genKey(128),
        lib : 'all'
    }
}), 'users.conf')

 */
// Calling generateKeyPair() method
// with its parameters 