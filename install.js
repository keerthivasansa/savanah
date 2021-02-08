import { readFileSync, writeFileSync } from "fs";

let pkg = JSON.parse(readFileSync('./package.json'))

if (!pkg?.['scripts']) pkg['scripts'] = {}


if (!pkg?.['scripts']?.['savanah-test'])
    pkg['scripts']['savanah-test'] = 'node node_modules/savanahdb/test.js'

writeFileSync('package.json', JSON.stringify(pkg))
