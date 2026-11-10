const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const root = path.resolve(__dirname, '..');
const target = process.argv[2] || 'probe';
if (target !== 'probe' && target !== 'browser') throw new Error('Expected package target probe or browser');
const app = target === 'browser' ? 'phase1-browser' : 'probe-ui';
const files = ['appinfo.json', 'index.html', 'style.css'].map(name => [`apps/${app}/${name}`, name]);
files.push(['apps/probe-ui/icon.png', 'icon.png']);
if (target === 'browser') {
    files.push([`apps/${app}/playback.js`, 'playback.js']);
} else {
    files.push(['apps/probe-ui/probe.js', 'probe.js'], ['apps/probe-ui/ui.js', 'ui.js']);
}
const stagingRoot = path.join(root, 'build', 'package');
fs.mkdirSync(stagingRoot, {recursive: true});
const stage = fs.mkdtempSync(path.join(stagingRoot, `${app}-`));
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
    fs.mkdirSync(path.join(root, 'dist'), {recursive: true});
    const command = require.resolve('@webos-tools/cli/bin/ares-package.js');
    // Keep the CLI's default device/config files inside build, away from user profiles.
    const appData = path.join(root, 'build', 'cli-data');
    fs.mkdirSync(appData, {recursive: true});
    const result = cp.spawnSync(process.execPath, [command, stage, '--no-minify', '-o', path.join(root, 'dist')], {
        stdio: 'inherit', cwd: root, env: {...process.env, APPDATA: appData}
    });
    if (result.error) console.error(result.error.message);
    process.exitCode = result.status === null ? 1 : result.status;
} finally {
    for (const name of fs.readdirSync(stage)) fs.unlinkSync(path.join(stage, name));
    fs.rmdirSync(stage);
}
