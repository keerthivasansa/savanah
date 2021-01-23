import { createReadStream, createWriteStream } from "fs"
import { createInterface } from "readline"

async function shardDelete(file, path, str) {
    return new Promise((res, rej) => {
        let w = createWriteStream(path + '/shards/' + file + '.tmp')
        createInterface(createReadStream(path + '/shards/' + file)).on('line', d => {
            d = JSON.parse(d)
            if (!eval(str)) w.write(JSON.stringify(d) + '\n')
        }).on('close', _ => w.end())
        w.on('finish', _ => res())
    })
}

export function deleteShard(condition, shards, path) {
    ftr = removeOp(condition)
    let ftrShard = op(shardFtrRemoveOthers(ftr, shards))
    ftr = op(baseFtrParse(shardFtrRemoveShards(ftr, shards)))
    let files = readdirSync(path + '/shards/').filter(f => {
        f = f.split(',');
        if (eval(ftrShard)) return true;
    })
    let c = 0;
    return new Promise((res, rej) => {
        files.forEach(f => {
            shardDelete(f, path, ftr).then(_ => {
                c++;
                if (c == files.length) res()
            }).catch(e => rej(e))
        })
    })
}