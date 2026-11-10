const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const root = path.resolve(__dirname, '..');
const stage = path.join(root, 'build', 'package', 'probe-ui');
fs.rmSync(stage, {recursive: true, force: true});
fs.mkdirSync(stage, {recursive: true});
// Only ship this reviewed allowlist. Never copy reports, credentials or build tools.
for (const name of ['appinfo.json', 'index.html', 'style.css', 'probe.js', 'ui.js', 'icon.png']) {
    fs.copyFileSync(path.join(root, 'apps', 'probe-ui', name), path.join(stage, name));
}
fs.mkdirSync(path.join(root, 'dist'), {recursive: true});
const command = path.join(root, 'node_modules', '.bin', 'ares-package');
// Keep the CLI's default device/config files inside build, away from user profiles.
const appData = path.join(root, 'build', 'cli-data');
fs.mkdirSync(appData, {recursive: true});
const result = cp.spawnSync(command, [stage, '--no-minify', '-o', path.join(root, 'dist')], {
    stdio: 'inherit', cwd: root, env: {...process.env, APPDATA: appData}
});
if (result.error) console.error(result.error.message);
process.exit(result.status === null ? 1 : result.status);
