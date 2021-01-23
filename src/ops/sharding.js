
export function getShardName(obj, shard) {
    let name = ''
    shard.forEach(d => {
        if (obj[d]) name += obj[d]
        name += ','
    })
    return name;
}
