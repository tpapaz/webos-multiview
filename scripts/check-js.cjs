const fs = require('node:fs');
const acorn = require('acorn');
for (const name of ['probe.js', 'ui.js']) {
    acorn.parse(fs.readFileSync('apps/probe-ui/' + name, 'utf8'), {ecmaVersion: 5});
}
for (const name of ['apps/probe-ui/appinfo.json', 'schemas/capability-v1.schema.json']) {
    JSON.parse(fs.readFileSync(name, 'utf8'));
}
console.log('ES5 syntax and JSON checks passed');
