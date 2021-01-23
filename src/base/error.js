export class SavanahError extends Error {
    constructor(errorJSON) {
        super(errorJSON['msg'])
        if (!errorJSON['name']) errorJSON['name'] = 'Invalid Parameter'
        this.name = "WrenchDB Error - " + errorJSON['name']
        Object.keys(errorJSON).forEach(k => {
            if (k == 'name') return
            if (k == 'msg') this.message = errorJSON['msg']
            else this[`${k}`] = errorJSON[`${k}`]
        })
    }
}