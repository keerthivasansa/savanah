import pkg from "graceful-fs";
import { SavanahError } from "../base/error.js";
import { baseFtrParse, op, removeOp, shardFtrRemoveOthers, shardFtrRemoveShards } from "../base/parser.js";
import { chkStr } from "./virtualize.js";
const { readdir } = pkg;
export function getShardName(obj, shard) {
    let name = ''
    shard.forEach(d => {
        if (obj[d]) name += obj[d]
        name += ','
    })
    return name;
}


export function updateShard(path, shards, ftr) {
    return new Promise((res, rej) => {
        ftr = removeOp(ftr)
        let ftrShard = op(shardFtrRemoveOthers(ftr, shards))
        ftr = op(baseFtrParse(shardFtrRemoveShards(ftr, shards)))
        if (!chkStr(ftr, 'd') || !chkStr(ftrShard, 'files')) 
            throw new SavanahError({
                msg: 'Malformed Fiter Expression',
                name: 'Invalid Filter'
            })
        readdir(path + '/shards', (err, files) => {
            if (err)
                return rej(err)
            files = files.filter(f => {
                f = f.split(',');
                if (eval(ftrShard)) return true;
            })
            res({ ftr, files })
        })
    })
}