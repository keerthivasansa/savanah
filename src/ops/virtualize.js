import { SavanahError } from "../base/error.js";

export function chkStr(str, t) {
    switch (t) {
        case 'd':
            let d = {}
            try {
                eval(str)
            } catch {
                return false;
            }
            return true;
        case 'files':
            let files = ['test,,', 'test,demo']
            try {
                files.filter(f => { eval(str) })
            } catch {
                return false;
            }
            return true;
    }
}

export function filterChk(str) {
    if (!chkStr(str, 'd'))
        throw new SavanahError({
            msg: 'Malformed Filter',
            name: 'Invalid Fitler'
        })
}