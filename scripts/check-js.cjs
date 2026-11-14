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
for (const name of ['scripts/hdmi-window-report.cjs', 'scripts/capture-hdmi-window.cjs',
    'scripts/hdmi-window-launch.cjs', 'tests/host/hdmi-window-launch.test.cjs',
    'scripts/hdmi-window-modes.cjs', 'scripts/restore-hdmi-window-modes.cjs', 'tests/host/hdmi-window-modes.test.cjs',
    'scripts/hdmi-window-installed-role.cjs', 'tests/host/hdmi-window-installed-role.test.cjs',
    'scripts/hdmi-utp-coverage.cjs', 'scripts/check-hdmi-utp-coverage.cjs', 'tests/host/hdmi-utp-coverage.test.cjs',
    'tests/host/hdmi-window-report.test.cjs']) {
    acorn.parse(fs.readFileSync(name, 'utf8'), {ecmaVersion: 2022});
}
console.log('HDMI capture host syntax checks passed');
