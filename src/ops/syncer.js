import gfs from "graceful-fs";
const { appendFile, createReadStream, createWriteStream, existsSync, readdirSync, rename, renameSync, rmdirSync, unlinkSync, writeFileSync } = gfs;
import es from 'event-stream'
import { createFolders } from "../base/other.js";
import { getShardName } from "./sharding.js";
import { baseFtrParse } from "../base/parser.js";
import { chkStr } from "./virtualize.js";
import { SavanahError } from "../base/error.js";

function randomStr() {
    return (Math.random() * 9999).toString(32)
}

export class Syncer {
    constructor(path, interval, shard) {
        this.path = path;
        this.interval = interval;
        this.shard = shard;
        this.synced()
        if (interval != 'passive') setInterval(_ => { this.sync() }, interval)
    }
    count(name, l) {
        this.counter[name] += 1;
        return this.counter[name] <= l
    }
    updateQ(ftr, upd, l = 1) {
        this.toSync = true;
        let str;
        if (l != 'none') {
            let n = randomStr()
            while (this.counter[n]) n = randomStr()
            this.counter[n] = 0
            str = `if(${ftr} && this.count("${n}",${l})) {  ${upd} };`
        }
        else str = `if(${ftr}) {  ${upd} };`
        this.queue.push(str)
    }
    updateShard(ftr, shard, shards, upd, l = 1) {
        this.toSync = true;
        let str;
        if (l != 'none') {
            let n = randomStr()
            while (this.counter[n]) n = randomStr()
            this.counter[n] = 0
            str = `if(${ftr} && this.count("${n}",${l})) { ${upd} };`
        }
        else str = `if(${ftr}) {  ${upd} };`
        this.shardSync[shard] ? this.shardSync[shard].push(str) : this.shardSync[shard] = [str]
        this.shards = shards;
    }
    deleteQ(ftr, l = 1) {
        this.toSync = true;
        let str;
        if (l != 'none') {
            let n = randomStr()
            while (this.counter[n]) n = randomStr()
            this.counter[n] = 0
            str = `if(${ftr} && this.count("${n}",${l})) return undefined;`
        }
        else str = `if(${ftr}) return undefined;`
        this.queue.push(str)


    }
    async shardExec(execStr, shard, path, shards) {
        return new Promise((res, rej) => {
            let c = 0;
            let str = ''
            let w = createWriteStream(path + '/shards/' + shard + '.tmp', { highWaterMark: 3072 })
            eval(`
           let r = createReadStream(path + '/shards/' + shard).on('close' , _ => { if(str[0]) w.write(str); w.end()})
           r.pipe(es.split()).pipe(es.parse()).pipe(es.mapSync(d => {               
               ${execStr.join(' ')}              
               return d;
           })).pipe(es.stringify()).on('data' , d => {
               c+=1;
               str += d;
               if (c % 3072 == 0) {w.write(d);str =''}
           })
           `)
            w.on('finish', _ => { rename(path + '/shards/' + shard + '.tmp', path + '/shards/' + shard, _ => { res(0) }); })
        })
    }
    deleteShard(ftr, shards, shard, l) {
        this.toSync = true;
        let str;
        if (!l) l = 1;
        if (l != 'none') {
            let n = randomStr()
            while (this.counter[n]) n = randomStr()
            this.counter[n] = 0
            str = `if(${ftr} && this.count("${n}",${l}))  return undefined;`
        }
        else str = `if(${ftr}) return undefined;`
        this.shardSync[shard] ? this.shardSync[shard].push(str) : this.shardSync[shard] = [str]
        this.shards = shards;
    }
    synced() {
        this.syncing = false;
        this.toSync = false;
        this.topProcess = {};
        this.counter = {}
        this.queue = []
        this.shardSync = {}
    }
    splitShard(arr, path) {
        function nxt() {
            return new Promise((res, rej) => {
                let i = 0;
                let c = 0;
                async function chk() {
                    i += 1;
                    if (i == c) res(0)
                }
                writeFileSync(path + '/shard.meta', arr.toString())
                createFolders(path + '/shards/')
                if (existsSync(path + '/docs.wr')) {
                    let r = createReadStream(path + '/docs.wr')
                        .pipe(es.split()).pipe(es.parse()).on('data', d => {
                            c += 1;
                            appendFile(path + '/shards/' + getShardName(d, arr), JSON.stringify(d) + '\n', _ =>
                                chk()
                            )
                        })
                    r.on('close', _ => {
                        unlinkSync(path + '/docs.wr')
                    })
                }
                else return res(0)
            })
        }
        let sync = this.getSync()
        return new Promise((res, rej) => {
            if (sync[0]) this.sync().then(_ => nxt().then(_ => res(0)))
            else nxt().then(_ => res())
        })
    }
    baseSearch(ftr, path, l = 1) {
        let sync = this.getSync()      
        return new Promise((res, rej) => {
            let re = []
            let str = baseFtrParse(ftr)
            if (!chkStr(str, 'd'))
                throw new SavanahError({
                    msg: 'Malformed Fiter Expression',
                    name: 'Invalid Filter'
                })
            let r = createReadStream(path + '/docs.wr', { encoding: 'utf-8' }).on('close', _ => res(re))
            eval(`
            r.pipe(es.split()).pipe(es.parse()).pipe(es.mapSync(d => {
                ${sync}
                return d;
            })).on('data', d => {          
                if (eval(str)) {                
                    re.push(d)
                    if (re.length >= l) { res(re); r.close() }
                }
            }) `)
        })
    }
    unshard(path, shards) {
        return new Promise((res, rej) => {
            let self = this;
            if (!shards) return;
            let i = 0;
            let w = createWriteStream(path + '/docs.tmp', { highWaterMark: 3072 })
            let totshards = readdirSync(path + '/shards/')

            async function shard(name) {
                let sync = self.shardSync[name] ? self.shardSync[name] : ''
                let str = ''
                let c = 0
                let r = createReadStream(path + '/shards/' + name, { encoding: 'utf8' })
                eval(` 
                r.pipe(es.split()).pipe(es.parse()).pipe(es.mapSync(d =>{
                ${sync}
                return d;
            })).pipe(es.stringify()).on('data', d => {
                str += d;
                c += 1;
                if (c % 3072 == 0) { w.write(str); str = '' }
            })
               `)

                r.on('close', _ => {
                    if (str[0]) w.write(str);
                    i += 1;
                    if (i == totshards.length) w.end()
                })
            }
            totshards.forEach(sh => shard(sh))
            w.on('finish', _ => {
                totshards.forEach(d => unlinkSync(path + '/shards/' + d))
                unlinkSync(path + '/shard.meta')
                rmdirSync(path + '/shards/')
                renameSync(path + '/docs.tmp', path + '/docs.wr')
                res()
            })
        })

    }
    getSync() {
        return this.queue.join(' ')
    }
    sync() {
        return new Promise((res, rej) => {
            let self = this;
            if (self.interval == 'passive') return res()
            if (!this.toSync) return res()
            if (this.syncing) return res({ msg: 'Resource Busy - Syncing', code: 5 });
            this.syncing = true;
            if (this.shard) {
                let c = 0;
                let shards = Object.keys(this.shardSync);
                let fr = {}
                shards.forEach(sh => {
                    fr[sh] = this.shardSync[sh]
                    this.shardExec(this.shardSync[sh], sh, this.path, this.shards).then(_ => {
                        c += 1;
                        this.shardSync[sh].slice(fr[sh].length)
                        if (c == shards.length) { this.synced(); res(); }
                    }).catch(er => console.log(er))
                })
            } else {
                let c = 0;
                let str = ''
                let y = this.queue.length;
                let sync = this.queue.join(' ');
                let w = createWriteStream(this.path + '/docs.tmp', { highWaterMark: 3072 })
                let r = createReadStream(this.path + '/docs.wr').on('close', _ => { if (str[0]) w.write(str); w.end() })
                eval(`r.pipe(es.split()).pipe(es.parse()).pipe(es.mapSync(d => { 
                    ${sync}
                    return d;
                })).pipe(es.stringify()).on('data', d => {                      
                    str += d;
                    c+=1;
                    if (c % 3072 == 0) { w.write(str); str = '' }
                })`)
                w.on('finish', _ => { rename(this.path + '/docs.tmp', this.path + '/docs.wr', _ => { this.synced(); res(); this.queue = this.queue.slice(y) }); })
            }
        })
    }
}

export class Communicator {

}