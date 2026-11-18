const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const root = path.resolve(__dirname, '..');
const target = process.argv[2] || 'probe';
const destination = path.resolve(process.argv[3] || path.join(root, 'dist'));
const targets = {
    probe: {app: 'probe-ui', scripts: ['probe.js', 'ui.js']},
    browser: {app: 'phase1-browser', scripts: ['playback.js']},
    'hdmi-preview': {app: 'phase2-hdmi-preview', scripts: ['preview.js']},
    'hdmi-pair': {app: 'phase2-hdmi-pair', scripts: ['pair.js']}
};
if (!Object.hasOwn(targets, target)) throw new Error(`Expected package target ${Object.keys(targets).join(', ')}`);
const {app, scripts} = targets[target];
const files = ['appinfo.json', 'index.html', 'style.css', ...scripts].map(name => [`apps/${app}/${name}`, name]);
files.push(['apps/probe-ui/icon.png', 'icon.png']);
const stagingRoot = path.join(root, 'build', 'package');
fs.mkdirSync(stagingRoot, {recursive: true});
const stage = fs.mkdtempSync(path.join(stagingRoot, `${app}-`));
let output;
// Only ship this reviewed allowlist. Never copy reports, credentials or build tools.
try {
    for (const [source, name] of files) fs.copyFileSync(path.join(root, source), path.join(stage, name));
    if (target === 'browser') {
        // Preserve the Phase 1 video bitstreams while keeping audio out of both paths.
        for (const name of ['clip-a.mp4', 'clip-b.mp4']) {
            const media = cp.spawnSync('ffmpeg', ['-v', 'error', '-nostdin', '-i',
                path.join(root, 'build', 'phase-1', 'media', name), '-map', '0:v:0', '-c:v', 'copy',
                '-movflags', '+faststart', path.join(stage, name)], {stdio: 'inherit'});
            if (media.error || media.status !== 0) throw new Error(`Could not prepare ${name} with FFmpeg`);
        }
    }
    output = fs.mkdtempSync(path.join(stagingRoot, 'ipk-'));
    const command = require.resolve('@webos-tools/cli/bin/ares-package.js');
    // Keep the CLI's default device/config files inside build, away from user profiles.
    const appData = path.join(root, 'build', 'cli-data');
    fs.mkdirSync(appData, {recursive: true});
    const result = cp.spawnSync(process.execPath, [command, stage, '--no-minify', '-o', output], {
        stdio: 'inherit', cwd: root, env: {...process.env, APPDATA: appData}
    });
    if (result.error) throw result.error;
    if (result.status !== 0) throw new Error('webOS packaging failed');
    const {id, version} = JSON.parse(fs.readFileSync(path.join(stage, 'appinfo.json'), 'utf8'));
    const ipk = `${id}_${version}_all.ipk`;
    fs.mkdirSync(destination, {recursive: true});
    fs.copyFileSync(path.join(output, ipk), path.join(destination, ipk), fs.constants.COPYFILE_EXCL);
    console.log(path.join(destination, ipk));
} finally {
    if (output) {
        for (const name of fs.readdirSync(output)) fs.unlinkSync(path.join(output, name));
        fs.rmdirSync(output);
    }
    for (const name of fs.readdirSync(stage)) fs.unlinkSync(path.join(stage, name));
    fs.rmdirSync(stage);
}
