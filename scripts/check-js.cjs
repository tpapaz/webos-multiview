const fs = require('node:fs');
const path = require('node:path');
const acorn = require('acorn');
function files(directory) {
    return fs.readdirSync(directory, {withFileTypes: true}).flatMap(entry => {
        const name = path.join(directory, entry.name);
        return entry.isDirectory() ? files(name) : entry.isFile() ? [name] : [];
    });
}
const appFiles = files('apps');
for (const name of appFiles.filter(name => name.endsWith('.js'))) {
    acorn.parse(fs.readFileSync(name, 'utf8'), {ecmaVersion: 5});
}
for (const name of [...appFiles, ...files('native'), ...files('schemas')].filter(name => name.endsWith('.json'))) {
    JSON.parse(fs.readFileSync(name, 'utf8'));
}
console.log('ES5 syntax and JSON checks passed');
for (const name of [...files('scripts'), ...files('tests/host')].filter(name => name.endsWith('.cjs'))) {
    acorn.parse(fs.readFileSync(name, 'utf8'), {ecmaVersion: 2022});
}
console.log('Host script syntax checks passed');
