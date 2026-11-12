const fs = require('node:fs');
const acorn = require('acorn');
for (const name of ['apps/probe-ui/probe.js', 'apps/probe-ui/ui.js', 'apps/phase1-browser/playback.js']) {
    acorn.parse(fs.readFileSync(name, 'utf8'), {ecmaVersion: 5});
}
for (const name of [
    'apps/probe-ui/appinfo.json',
    'apps/phase1-browser/appinfo.json',
    'native/phase1/appinfo.json',
    'native/phase1-ndl/appinfo.json',
    'native/phase1-mixed/appinfo.json',
    'native/phase1-sinks/appinfo.json',
    'native/phase1-endurance/appinfo.json',
    'native/phase2-admission/appinfo.json',
    'native/phase2-hdmi-window/appinfo.json',
    'schemas/capability-v1.schema.json'
]) {
    JSON.parse(fs.readFileSync(name, 'utf8'));
}
console.log('ES5 syntax and JSON checks passed');
