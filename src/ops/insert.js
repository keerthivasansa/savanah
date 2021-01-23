import { appendFile, createWriteStream } from "fs";
import { getShardName } from "./sharding.js";
import { dirname } from "path";
import { fileURLToPath } from "url";


const __dirname = dirname(fileURLToPath(import.meta.url))


export function insert(doc, path, opts) {
    return new Promise((res, rej) => {
        appendFile(path + '/docs.wr', JSON.stringify(doc) + '\n' , _ => res());       
    })
}

export function multiInsert(arr, path) {
    return new Promise((res, rej) => {
        let wr = createWriteStream(path + '/docs.wr', { flags: 'a' })
        for (let d of arr) {
            wr.write(JSON.stringify(d) + '\n')
        }
        wr.end()
        wr.on('finish', _ =>
            res(0)
        )
    })
}

export function insertSM(docs,path,shards) {
    docs.forEach(d => {
        insertS(d, shards, path)
    })
}


export async function insertS(doc, shards, path) {
    return appendFile(path + '/shards/' + getShardName(doc, shards), JSON.stringify(doc, shards) + '\n')
}