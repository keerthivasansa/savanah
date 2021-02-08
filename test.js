import { Server, Client, genKey } from './index.js'
import ora from 'ora'
import { rmdirSync, unlinkSync } from 'fs';

const key = genKey(64);

console.log('+-------------------------------------+')
console.log('       SavanahDB - Quality Control     ')
console.log('+-------------------------------------+')

function test(exp, res, name) {
    console.log('')
    let em;
    if (exp === res) em = '✅'
    else em = '❌'
    console.log(`  ${name}\t ${em}`)
}

async function testProm(promise, r, name, id) {
    return new Promise((res, rej) => {
        console.log('')
        let em = '❌'
        let s = ora(name).start()
        promise.then(d => {
            if ((id === false ? d : d?.[0]?.['id']) === r) em = '✅'
            s.stopAndPersist({
                text: `${name}\t${em}`
            })
            res()
        }).catch(er => {
            s.stopAndPersist({
                text: `${name}\t${em}`
            })
            res()
        })
    })
}

test(key?.length, 64, 'Generating key')


try {
    const server = new Server({
        path: './__test/',
        masterKey: key,
        syncInterval : 'passive'
    })
    test(1, 1, 'Opening a new Server in localhost')
} catch (er) {
    test(0, 1, 'Opening a new Server in localhost')
    throw er;
}
try {
    const client = new Client({
        user: 'root',
        pass: 'create a new admin account with a secure password and delete this'
    })

    test(1, 1, 'Connecting to server')


    const tb = client.db('test').table('demo', { syncInterval: 'passive' });

    let rt = Math.random();
    let rt2 = Math.random();
    let rt3 = Math.random();

    await testProm(tb.insert({
        author: 'Robert',
        price: 150,
        id: rt,
    }), 0, 'Inserting a Document', false)

    await testProm(tb.insertSet([{
        author: 'Mathew',
        price: 45
    }, {
        author: 'Olive',
        price: 23
    }]), 0, 'Inserting a set of Documents', false)
    await testProm(tb.search('price == 150'), rt, 'Searching through documents')

    await tb.update('author == "Robert"', { id: rt3 })

    await testProm(tb.search('price == 150'), rt3, 'Updating documents')

    await tb.delete('price <= 250')

    await testProm(tb.search('price == 150'), undefined, 'Deleting documents')

    console.log('')
    console.log('x---   Test completed    ---x')

    unlinkSync('./__test/test/demo/docs.wr')
    rmdirSync('./__test/test/demo/')
    rmdirSync('./__test/test/')
    rmdirSync('./__test/__meta/')
    rmdirSync('./__test/')


} catch (er) {
    test(0, 1, 'Connecting to server')
    throw er;
}
