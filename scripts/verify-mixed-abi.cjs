// Read-only firmware export check; never runs a TV diagnostic or changes TV state.
const {spawn} = require('node:child_process');
const crypto = require('node:crypto');
const {connect} = require('./phase1-device.cjs');
const path = require('node:path');
const fs = require('node:fs');
const {nativeBuild} = require('./phase1-native-ssh.cjs');
const args = process.argv.slice(2);
const endurance = args.includes('--endurance');
const sinks = args.includes('--sinks') || endurance;
const aliases = args.filter(arg => !['--sinks','--endurance'].includes(arg));
if (aliases.length > 1 || aliases.some(arg => arg.startsWith('--'))) throw new Error('Use [SSH profile] [--sinks|--endurance]');
const target = endurance ? 'endurance' : sinks ? 'sinks' : 'mixed';
const build = nativeBuild(target);
const libraries = ['ld-linux.so.3', ...(sinks ? [] : ['libNDL_directmedia.so.1']), 'libplayerAPIs.so.1',
    'libSDL2-2.0.so.0', 'libstdc++.so.6', 'libm.so.6', 'libgcc_s.so.1', 'libc.so.6'];
async function readLibrary(client, name) {
    return new Promise((resolve, reject) => {
        let channel;
        const timer = setTimeout(() => { channel?.destroy(); reject(new Error('Firmware read timed out')); }, 15000);
        client.exec(`for dir in /lib /usr/lib; do if test -f "$dir/${name}"; then base64 "$dir/${name}"; exit; fi; done; exit 1`, (error, stream) => {
            if (error) { clearTimeout(timer); reject(new Error('Firmware read unavailable')); return; }
            channel = stream;
            let output = '';
            stream.on('data', chunk => { output += chunk; if (output.length > 32 * 1024 * 1024) stream.destroy(); });
            stream.stderr.resume();
            stream.on('error', () => { clearTimeout(timer); reject(new Error('Firmware read failed')); });
            stream.on('close', code => { clearTimeout(timer); if (code === 0) resolve(output.replace(/\s/g, '')); else reject(new Error('Firmware library unavailable')); });
        });
    });
}
async function main() {
    const client = await connect(aliases[0]);
    const firmware = {}, hashes = {};
    try {
        for (const name of libraries) {
            const encoded = await readLibrary(client, name);
            const key = (name === 'ld-linux.so.3' ? '/lib/' : '/usr/lib/') + name;
            firmware[key] = encoded;
            hashes[name] = crypto.createHash('sha256').update(Buffer.from(encoded, 'base64')).digest('hex');
        }
    } finally { client.end(); }
    const root = path.resolve(__dirname, '..').replace(/\\/g, '/').replace(/^([A-Za-z]):/, (_, drive) => '/mnt/' + drive.toLowerCase());
    const report = await new Promise((resolve, reject) => {
        const child = spawn('wsl', ['-d', 'Ubuntu', '--exec', 'python3', `${root}/scripts/verify-native-abi.py`, `${root}/build/phase-1/${target}/${build.executable}`], {timeout: 30000});
        let output = '';
        child.stdout.on('data', chunk => { output += chunk; });
        child.stderr.on('data', chunk => { output += chunk; });
        child.on('error', () => reject(new Error('WSL ABI checker unavailable')));
        child.stdin.on('error', () => {});
        child.on('close', code => code === 0 ? resolve(output) : reject(new Error('ABI check failed: ' + output)));
        child.stdin.end(JSON.stringify(firmware));
    });
    const binarySha256 = crypto.createHash('sha256').update(fs.readFileSync(path.join(__dirname, '../build/phase-1', target, build.executable))).digest('hex');
    fs.writeFileSync(path.join(__dirname, `../build/phase-1/abi-${target}-${build.version}.json`), JSON.stringify({schemaVersion: 1, binarySha256, firmwareLibrarySha256: hashes, report}, null, 2) + '\n');
    console.log(report.trim());
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
