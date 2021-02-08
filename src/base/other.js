import gfs from "graceful-fs";
const { existsSync, mkdirSync } = gfs;
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

// Taken from StackOverflow. Credits to 


const illegal_file = {
    '\\': "[_uni92__]",
    '/': "[_uni47__]",
    '?': "[_uni92__]",
    '%': "[_uni37__]",
    '*': "[_uni42__",
    ':': "[_uni58__]",
    '|': "[_uni124__]",
    '"': "[_uni34__]",
    '<': "[_uni60__]",
    '>': "[_uni62__]",
    '.': "[_uni46__]",
    '=': "[_uni61__]",
}

const rillegal = {
    "[_uni92__]": "?",
    "[_uni47__]": "/",
    "[_uni37__]": "%",
    "[_uni42__": "*",
    "[_uni58__]": ":",
    "[_uni124__]": "|",
    "[_uni34__]": '"',
    "[_uni60__]": "<",
    "[_uni62__]": ">",
    "[_uni46__]": ".",
    "[_uni61__]": "="
}

export function encode(str) {
    Object.keys(illegal_file).forEach(d => {
        str = str.replace(d, illegal_file[d])
    })
    return str
}

export function decode(str) {
    Object.keys(rillegal).forEach(d => {
        str = str.replace(d, rillegal[d])
    })
    return str
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

export function sliceKey(str) {
    return Buffer.from(str.slice(0,16) )
}