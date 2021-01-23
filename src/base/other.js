import { existsSync, mkdirSync } from "fs";
import { dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url))

export function createFolders(filename) {
    let filepath = filename.replace(/\\/g, '/');
    let root = '';
    if (filepath[0] === '/') {
        root = '/';
        filepath = filepath.slice(1);
    }
    else if (filepath[1] === ':') {
        root = filepath.slice(0, 3);
        filepath = filepath.slice(3);
    }
    const folders = filepath.split('/').slice(0, -1);
    folders.reduce(
        (acc, folder) => {
            const folderPath = acc + folder + '/';
            if (!existsSync(folderPath)) {
                mkdirSync(folderPath);
            }
            return folderPath
        },
        root
    );
}

export function getIndexes(val, str) {
    var indexes = [], i = -1;
    while ((i = str.indexOf(val, i + 1)) != -1) {
        indexes.push(i);
    }
    return indexes;
}
export function rand(arr) {
    return arr[Math.ceil(Math.random() * (arr.length - 1))]
}

