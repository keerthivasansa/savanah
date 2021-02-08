import gfs from "graceful-fs";
const { appendFile, createWriteStream } = gfs;
import { getShardName } from "./sharding.js";
import { dirname } from "path";
import { fileURLToPath } from "url";
import { encode } from "savanahdb/src/base/other.js";

const __dirname = dirname(fileURLToPath(import.meta.url))


export function insert(doc, path, opts) {
    return new Promise((res, rej) => {
        appendFile(path + '/docs.wr', JSON.stringify(doc) + '\n', _ => res());
    })
}

export function multiInsert(arr, path) {
    return new Promise((res, rej) => {
        let wr = createWriteStream(path + '/docs.wr', { flags: 'a' })
        wr.on('finish', _ =>
            res()
        )
        for (let d of arr) {
            wr.write(JSON.stringify(d) + '\n')
        }
        wr.end()
    })
}


export function insertSM(docs, path, shards) {
    return new Promise((res, rej) => {
        const i = docs.length;
        let c = 0;
        async function write() {
            c++;
            if (c >= i) return res()
        }
        docs.forEach(d => {
            insertS(d, shards, path).then(_ => write())
        })
    })
}

export function insertS(doc, shards, path) {
    return new Promise((res, rej) => {
        appendFile(path + '/shards/' + encode(getShardName(doc, shards)) , JSON.stringify(doc, shards) + '\n', _ => res(0))
    });
}