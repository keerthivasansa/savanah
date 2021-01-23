import { SavanahError } from "./error.js";
import ensureStr from 'type/string/ensure.js'
import ensureObj from 'type/plain-object/ensure.js'
import ensureArr from 'type/array/ensure.js'

export function type(val) {
    let t = typeof (val);
    if (t == 'object') {
        if (val?.['join']) return 'array'
        else return 'json'
    } else return t
}
export function ensure(val, t, name) {
    switch (t) {
        case 'string':
            ensureStr(val, {
                errorMessage: `${name} must be a String`
            })
            break;
        case 'obj':
            ensureObj(val, {
                errorMessage: `${name} must be a JSON`
            })
            break;
        case 'arr':
            ensureArr(val , {
                errorMessage: `${name} must be an Array`
            })
            break;
    }
}
/**
   let ty = eval()
    let msg;
    if (!name) msg = `Expecting ${t}, received : ${ty}`
    else msg = `Expecting ${t} in "${name}", received : ${ty}`
    if (t != ty)

        throw new SavanahError({
            name: 'TypeError',
            msg
        })
 */
