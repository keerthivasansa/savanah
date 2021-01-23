import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes } from "crypto"
import isObj from 'type/object/is.js'

function val(c) {
    if (isObj(c)) return 'o' + JSON.stringify(c)
    else return 'n' + c;
}

function deval(c) {
    if (c.startsWith('o')) return JSON.parse(c.slice(1))
    else return c.slice(1)
}

export function encrypt(tsecret, v) {
    let iv = randomBytes(12)
    let c = createCipheriv('aes-128-ccm', tsecret, iv, { authTagLength: 12 })
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
    let hmac = y[1]
    if (!verify(tsecret, data, hmac))
        return '[Tampered]'
    let iv = Buffer.from(data.slice(0, 16), 'base64')
    let c = createCipheriv('aes-128-ccm', tsecret, iv, { authTagLength: 12 })
    let d = c.update(Buffer.from(data.slice(16), 'base64'))
    return deval(Buffer.concat([d, c.final()]).toString())
}

let t = Buffer.from('faF#$Pokf09skfAWefl[plafew_efawefaspokfe', 'utf8').slice(0, 16)

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