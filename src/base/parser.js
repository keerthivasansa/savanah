import { getIndexes } from "./other.js"


const ops = ['==', '<', '>', '<=', '>=', '===', '!=']

export function changeInd(str, i, val, l) {
    if (!l) l = 0;
    else l--;
    return str.slice(0, i) + val + str.slice(i + l + 1)
}
export function streamJSON(d) {
    console.time('stream')
    if (!d) return;
    let r = {}
    d.split('\\;\\').forEach(d => {
        let k = d.split(':')
        r[k[0]] = k.slice(1).join(':')
    })
    return r;
}

export function removeOp(str) {
    let i = getIndexes('"', str)
    for (var n = 0; n < i.length; n += 2) {
        let p = str.slice(i[n], i[n + 1])
        ops.forEach(o => getIndexes(o, p).forEach(ind => {
            str = changeInd(str, i[n] + ind, '__o/' + o, o.length)
        }))
    }
    return str.replace('(', ' ( ').replace(')', ' ) ');
}
export function op(str) {

    return str.split(' ').map(d => {
        if (d.startsWith('__o/')) return d.slice(4)
        else return d;
    }).join(' ')
}
export function baseFtrParse(str, n) {
    if (!n) n = 'd'
    str = removeOp(str)
    let wrds = str.split(' ')
    ops.forEach(o => {
        getIndexes(o, wrds).forEach(d => {
            let s = n;

            wrds[d - 1].split('.').forEach(d => {
                s += '?.["' + d + '"]'
            })
            wrds[d - 1] = s
        })
    })
    return op(wrds.join(' '))
}
export function shardFtrRemoveOthers(ftr, shards) {
    ftr = extractQuotes(ftr)
    let wrds = ftr[0].split(' ')
    ops.forEach(o => {
        getIndexes(o, wrds).forEach(i => {
            wrds[i - 1] = wrds[i - 1].startsWith('d?.["') ? wrds[i - 1].slice(5, wrds[i - 1].length - 2) : wrds[i - 1]

            if (!shards.includes(wrds[i - 1])) {
                wrds[i - 1] = ''
                wrds[i] = '1'
                wrds[i + 1] = ''
            } else wrds[i - 1] = `f[${shards.indexOf(wrds[i - 1])}]`
        })
    })
    return retractQuotes([wrds, ftr[1]])
}
export function extractQuotes(str) {
    let va = []
    str.match(/(["'])(?:(?=(\\?))\2.)*?\1/g)?.filter(d => {
        let i = str.indexOf(d)
        return str[i - 1] != '['
    })?.forEach(d => {
        va.push(d);
        str = str.replace(d, `__v/${va.length - 1}`)
    })
    return [str, va]
}

export function retractQuotes([str, val]) {
    return str.map((d, o) => {
        let i = d.indexOf('__v/')
        if (i != -1) {
            let ind = str[o].slice(i, i + 5).slice(4)
            return str[o].replace(`__v/${ind}`, val[ind])
        }
        else return d;
    }).join(' ')
}
export function shardFtrRemoveShards(ftr, shards) {
    let s = extractQuotes(ftr)
    let wrds = s[0].split(' ')
    let val = s[1]
    ops.forEach(o => {
        getIndexes(o, wrds).forEach(i => {
            wrds[i - 1] = wrds[i - 1].startsWith('d?.["') ? wrds[i - 1].slice(5, wrds[i - 1].length - 2) : wrds[i - 1]
            if (shards.includes(wrds[i - 1])) {
                wrds[i - 1] = ''
                wrds[i] = '1'
                wrds[i + 1] = ''
            }
        })
    })
    return retractQuotes([wrds, val])
}
// { posts : 'this.uid == that.ownerid'}
/*
    {
        posts : " that.owner == this.user && that.city == this.pokemon" -> 'owner == "Robert" && city == "Helo"'
    }
*/
function val(cont, d) {
    let f = eval(cont)
    if (typeof (f) == 'string') return '"' + f + '"'
    else return f
}
export function joinShardParse(str, tb, ds) { // 
    let fin = []

    let nm
    let wrds;
    if (str.indexOf(' as ')) { let wr = str.split(' as '); wrds = wr[0].split(' '); nm = wr[1] }
    else { wrds = str.split(' '); }
    ops.forEach(o => {
        getIndexes(o, wrds).forEach(i => {
            // that.city == this.city as city
            let y = 'd'
            wrds[i - 1].slice(5).split('.').forEach(d => {
                y += '?.["' + d + '"]'
            })
            let t = 'doc'
            wrds[i + 1].slice(5).split('.').forEach(d => {
                t += '?.["' + d + '"]'
            })
            ds.forEach((d, p) => {
                fin.push({ ftr: `${wrds[i + 1].slice(5)} ${o} ${val(y, d)}`, tb, p, n: nm })
            })
        })
    })
    return fin;
}

export function joinFtrParse(str, n, n2) {
    if (!n) {
        n = 'd';
        n2 = 'doc'
    }
    str = extractQuotes(str)
    let wrds = str[0].split(' ')
    let val = str[1]
    ops.forEach(o => {
        getIndexes(o, wrds).forEach(d => {
            let s = n
            if (wrds[d + 1].indexOf('this.') != -1)
                wrds[d + 1].split('this.')[1].split('.').forEach(d => {
                    s += '?.["' + d + '"]'
                });
            else s = wrds[d + 1]
            wrds[d + 1] = s
            let r = n2
            if (wrds[d - 1].indexOf('that.') != -1)
                wrds[d - 1].split('that.')[1].split('.').forEach(d => {
                    r += '?.["' + d + '"]'
                });
            else r = wrds[d + 1]
            wrds[d - 1] = r
        })
    })
    return retractQuotes([wrds, val])
}