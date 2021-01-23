import { createReadStream } from "fs";
import { createInterface, emitKeypressEvents } from "readline";
import { createInflate, createInflateRaw } from "zlib";

function stripElements(str) {
    return str.replace(/[\?,{,},\],\',\",;,:,(,),.,`,!,\^]/g, '')
}
function relCalc(str, str2) {
    str2 = stripElements(str2).split(' ')
     let c = str.filter(d => str2.includes(d)).length

    return { c, rel: c / str2.length * 100 }
}

export function textSearch(path, str, crit, l) {
    return new Promise((res, rej) => {
        let re = []
        if (!crit) crit = 65
        if (!l) l = 1;
        let sp = str.split(' : ')
        let val = 'd'
        sp[0].split('.').forEach(d => {
            val += '?.["' + d + '"]'
        })
        let ftr = stripElements(sp[1]).split(' ')
        let r = createInterface(createReadStream(path + 'docs.wr')).on('line', d => {
            if (!d) return;
            d = JSON.parse(d)
            let va = eval(val)
            if (va) d['__rel'] = relCalc(ftr, va).rel
    
            
            if (d['__rel'] >= crit) { re.push(d); if (re.length >= l) r.close() }
        }).on('close', _ => {
            res(re)
        }
        )
    })
}

console.log(await textSearch('/home/keerthivasan/nwrench/', 'msg : "school"', 0, 1))