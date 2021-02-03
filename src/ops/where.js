import { createReadStream, readdirSync } from "fs";
import { baseFtrParse, joinFtrParse, shardFtrRemoveOthers, op, removeOp, shardFtrRemoveShards, joinShardParse } from "../base/parser.js";
import { createInterface } from "readline";
import { chkStr } from "./virtualize.js";
import { SavanahError } from './../base/error.js'
import es from 'event-stream'
const ops = ['==', '<', '>', '<=', '>=', '!=']

export function joinParser(val, d, length) {
    let ftr;
    let n;
    let str = ''
    if (val.indexOf('as') != -1) {
        let s = val.split(' as ')
        n = s[1]
        ftr = joinFtrParse(s[0])
    } else { n = d; ftr = joinFtrParse(val) };
    for (let i = 0; i < length; i++) {
        if (i != 0) str += `else `
        str += `if (${ftr.replace('d?.', `ds[${i}]?.`)})  { ds[${i}]["${n}"] ? ds[${i}]["${n}"] : ds[${i}]["${n}"] = [ doc ]; if (c+=1 == ds.length) r.close() }\n`
    }
    console.log(str)
    return [d, str];
}



async function shardRead(ftr, file, shardvalue, shards, sync) {
    return new Promise((res, rej) => {
        let re = []
        let r = createReadStream(file).on('close', _ => { res(re); })
        r.pipe(es.split()).pipe(es.parse()).on('data', d => {
            d = JSON.parse(d)
            eval(sync)
            if (eval(ftr)) {
                re.push(d)
            }
        })
    })
}



export function joinShard(pObj, doc, shards, raw_path, comObj) {
    let fin = {}
    let close = ''

    pObj.forEach(ob => {
        let { ftr, tb, p, n } = ob;
        ftr = removeOp(ftr)
        if (!n) n = tb
        let path = raw_path + '/' + tb + '/'
        let ftrShard = op(shardFtrRemoveOthers(ftr, shards))
        ftr = op(baseFtrParse(shardFtrRemoveShards(ftr, shards)))
        try {
            let files = readdirSync(path + '/shards').filter(f => {
                f = f.split(',');
                if (eval(ftrShard)) return true;
            })
            files.forEach(f => {
                if (fin[f]) fin[f]['ftr'] += `else `
                else { fin[f] = {}; fin[f]['path'] = path; fin[f]['ftr'] = '' }
                fin[f]['ftr'] += `if(${ftr}) {if(doc[${p}]["${n}"]) doc[${p}]["${n}"].push(d); else doc[${p}]["${n}"] = [d];}`
                fin[f]['sync'] = comObj[tb]?.['sync']?.['shardSync']?.[f] ? comObj[tb]?.['sync']?.['shardSync']?.[f].join(' ') : ''
            })
        } catch (er) {
            if (er.code != 'ENOENT') throw er;
            else return;
        }

    })
    return new Promise((res, rej) => {
        let keys = Object.keys(fin)
        if (!keys[0]) return res(doc)
        let c = 0;

        keys.forEach(k => {
            (async () => {
                let r = createReadStream(fin[k]['path'] + '/shards/' + k).on('close', _ => {
                    c++;
                    if (c == keys.length) res(doc)
                })
                r.pipe(es.split()).pipe(es.parse()).on('data', d => {
                    eval(fin[k]['sync'])
                    eval(fin[k]['ftr'])
                })
            })().catch(er => console.log(er))
        })
    })
}

export function shardSearch(ftr, path, shards, l, sync) {
    ftr = removeOp(ftr)
    let ftrShard = op(shardFtrRemoveOthers(ftr, shards))
    ftr = op(baseFtrParse(shardFtrRemoveShards(ftr, shards)))
    if (!chkStr(ftr, 'd') || chkStr(ftrShard, 'files'))
        throw new SavanahError({
            msg: 'Malformed Fiter Expression',
            name: 'Invalid Filter'
        })
    let files = readdirSync(path + '/shards').filter(f => {
        f = f.split(',');
        if (eval(ftrShard)) return true;
    })
    let c = 0;
    return new Promise((res, rej) => {
        let re = []
        files.forEach(f => {
            shardRead(ftr, path + '/shards/' + f, f, shards, sync[f] ? sync[f].join(' ') : '').then(d => {
                re = re.concat(d)
                c += 1;
                if (c == files.length) return res(re)
            }).catch(err => rej(err))
        })
    })
}

/**
 console.log(await fsbaseSearch('name == "More than just a books"' , '/home/keerthivasan/Desktop/nw/lib/books/'))
 */