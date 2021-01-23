import { createReadStream, createWriteStream, rename } from "fs"
import es from 'event-stream'

function val(cont) {
    return cont?.['split'] ? '"' + cont + '"' : cont
}

export function updateDocParser(ftr) {
    let fin = ''
    Object.keys(ftr).forEach(l => {
        let str = 'd'
        l.split('.').forEach(o => {
            str += `["${o}"]`
        })
        str = str + '=' + val(ftr[l]) + ';'
        fin += str;
    })
    ftr['_inc']?.forEach(d => {
        let str = 'd'
        d.split('.').forEach(o => {
            str += `["${o}"]`
        })
        str = str + '=' + str + ' + 1;'
        fin += str;
    })
    ftr['_dec']?.forEach(d => {
        let str = 'd'
        d.split('.').forEach(o => {
            str += `["${o}"]`
        })
        str = str + '=' + str + ' - 1;'
        fin += str;
    })
    delete ftr['_inc']
    delete ftr['_dec']

    return fin;
}

export function update(ftr, up, path, sync, opts) {
    return new Promise((res, rej) => {
        let c = 0;
        let str = ''
        let w = createWriteStream(path + '/docs.tmp', { highWaterMark: 3072 })
        let r = createReadStream(path + '/docs.wr').on('close', _ => { if (str != '') w.write(str); w.end() })
        r.pipe(es.split()).pipe(es.parse()).pipe(es.map(d => {
            eval(sync)
            if (eval(ftr))
                eval(up)
            return d
        })).pipe(es.stringify()).on('data', d => {
            if (c += 1 % 3072 == 0) { w.write(str); str = '' }
            else str += d
        })
        w.on('finish', _ => { rename(path + '/docs.tmp', path + '/docs.wr', _ => res(0)); })
    })
}
