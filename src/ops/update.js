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
