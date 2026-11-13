// Future explicitly authorized read-only SFTP capture. Never launches or writes on TV.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const {id, version, filename, validateReport, phaseAccepted} = require('./hdmi-window-report.cjs');
const {launchPayload} = require('./hdmi-window-launch.cjs');
const root = path.resolve(__dirname, '..');
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const base = '/media/developer/apps/usr/palm/applications/' + id;
const jail = '/var/palm/jail/' + id;
const recordPath = path.join(root, 'build/phase-2/hdmi-window-' + version + '/package-validation.json');
function save(name, value) {
    const fd = fs.openSync(name, 'wx', 0o600);
    try { fs.writeFileSync(fd, JSON.stringify(value, null, 2) + '\n'); fs.fsyncSync(fd); }
    finally { fs.closeSync(fd); }
}
async function main(args) {
    const [action, mode, destination, flag, ...extra] = args;
    filename(mode); // Reject unknown phases before loading credentials or connecting.
    if (action === '--check-report' && destination && !flag && !extra.length) {
        const stat = fs.lstatSync(destination);
        if (!stat.isFile() || stat.size > 2048) throw Error('local report size');
        const report = validateReport(fs.readFileSync(destination), mode);
        console.log(JSON.stringify({valid: true, phaseAccepted: phaseAccepted(report)}));
        return;
    }
    if (!['--prepare', '--collect'].includes(action) || !destination ||
        flag !== '--allow-tv-read' || extra.length) throw Error('explicit read scope required');
    const dir = path.resolve(destination);
    const local = JSON.parse(fs.readFileSync(recordPath));
    if (local.appId !== id || local.appVersion !== version || !local.archiveVerified ||
        hash(fs.readFileSync(path.join(root, local.package))) !== local.packageSha256)
        throw Error('local package binding');
    let baseline;
    if (action === '--prepare') fs.mkdirSync(dir); // Fresh host folder; no evidence replacement.
    else {
        baseline = JSON.parse(fs.readFileSync(path.join(dir, 'preflight.json')));
        if (baseline.appId !== id || baseline.appVersion !== version || baseline.mode !== mode ||
            !baseline.reportsAbsent || !baseline.processAbsent || baseline.packageSha256 !== local.packageSha256)
            throw Error('preflight binding');
        if (fs.existsSync(path.join(dir, 'capture.json'))) throw Error('existing capture');
    }
    const controller = new AbortController();
    let client, timer;
    const deadline = new Promise((_, reject) => {
        timer = setTimeout(() => {
            controller.abort(); client?.destroy(); reject(Error('capture deadline'));
        }, 30000);
    });
    const check = () => { if (controller.signal.aborted) throw Error('capture deadline'); };
    const collect = async () => {
        // Lazy import: offline validation never accesses device profiles.
        client = await require('./phase1-device.cjs').connect(undefined, {signal: controller.signal});
        check();
        const sftp = await new Promise((resolve, reject) => client.sftp((e, s) => e ? reject(e) : resolve(s)));
        const call = async (name, ...values) => {
            check();
            const result = await new Promise((resolve, reject) =>
                sftp[name](...values, (e, value) => e ? reject(e) : resolve(value)));
            check(); return result;
        };
        async function read(name, limit, procClock = false) {
            const before = await call('lstat', name);
            if (!before.isFile() || before.size > limit || (procClock && before.size !== 0))
                throw Error('regular file bound');
            const handle = await call('open', name, 'r'); // No write flags anywhere in this collector.
            try {
                const opened = await call('fstat', handle);
                if (!opened.isFile() || opened.size !== before.size || opened.mode !== before.mode ||
                    opened.mtime !== before.mtime) throw Error('changed file');
                const data = Buffer.alloc((procClock ? limit : before.size) + 1);
                let count = 0;
                while (count < data.length) {
                    const bytes = await new Promise((resolve, reject) =>
                        sftp.read(handle, data, count, Math.min(32768, data.length - count), count,
                            (e, n) => e ? reject(e) : resolve(n)));
                    check();
                    if (!bytes) break;
                    count += bytes;
                }
                const after = await call('fstat', handle);
                if ((procClock ? count > limit : count !== before.size) ||
                    after.size !== before.size || after.mode !== before.mode ||
                    (!procClock && after.mtime !== before.mtime)) throw Error('changed file');
                return {data: data.subarray(0, count), mode: before.mode & 0o7777};
            } finally { await call('close', handle); }
        }
        async function absent(name) {
            try { await call('lstat', name); return false; }
            catch (e) { if (e.code === 2) return true; throw e; }
        }
        async function processAbsent() {
            const processes = (await call('readdir', '/proc')).filter(e => /^\d+$/.test(e.filename));
            if (processes.length > 1024) throw Error('process bound');
            for (const p of processes) {
                let exe;
                try { exe = await call('readlink', '/proc/' + p.filename + '/exe'); }
                catch (e) { if (e.code === 2) continue; throw e; }
                if ([base, jail + base].some(prefix =>
                    exe === prefix + '/multiview-hdmi-window' ||
                    exe === prefix + '/multiview-hdmi-window (deleted)')) return false;
            }
            return true;
        }
        const binary = await read(base + '/multiview-hdmi-window', 1024 * 1024);
        const manifest = await read(base + '/appinfo.json', 4096);
        if (binary.mode !== 0o755 || hash(binary.data) !== local.binarySha256 ||
            hash(manifest.data) !== local.manifestSha256) throw Error('installed artifact');
        const policies = {};
        const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);
        for (const side of ['pub', 'prv']) {
            const file = await read('/var/palm/ls2-dev/roles/' + side + '/' + id + '.json', 16384);
            const role = JSON.parse(file.data);
            if (!role.role || role.role.exeName !== base + '/multiview-hdmi-window' ||
                role.role.type !== 'regular' || !equal(role.role.allowedNames, [id]) ||
                !Array.isArray(role.permissions) || role.permissions.length !== 1 ||
                role.permissions[0].service !== id || !equal(role.permissions[0].inbound, []) ||
                !equal(role.permissions[0].outbound, ['*'])) throw Error('generated role mismatch');
            policies[side] = hash(file.data);
        }
        const clientPolicy = await read('/var/luna-service2-dev/client-permissions.d/' + id + '.app.json', 4096);
        const clientObject = JSON.parse(clientPolicy.data);
        if (Object.keys(clientObject).length !== 1 || !equal(clientObject[id], ['public']))
            throw Error('generated client mismatch');
        policies.client = hash(clientPolicy.data);
        const binding = {binarySha256: hash(binary.data), manifestSha256: hash(manifest.data), policies};
        if (!await processAbsent()) throw Error('app running');
        const relative = '/tmp/' + id + '/' + filename(mode);
        const paths = [jail + relative, relative];
        if (action === '--prepare') {
            for (const name of paths) if (!await absent(name)) throw Error('existing report');
            check();
            save(path.join(dir, 'preflight.json'), {schemaVersion: 1, appId: id, appVersion: version,
                mode, preparedAt: new Date().toISOString(), packageSha256: local.packageSha256,
                binding, reportsAbsent: true, processAbsent: true, launchPerformed: false});
            if (mode === 'picture') {
                // No remote write/launch. Clock authority is read LAST, never
                // regenerated by a launch retry. A reboot between reads fails.
                const bootBefore = await read('/proc/sys/kernel/random/boot_id', 38, true);
                const uptime = await read('/proc/uptime', 64, true);
                const bootAfter = await read('/proc/sys/kernel/random/boot_id', 38, true);
                const payload = launchPayload(bootBefore.data.toString('ascii'), uptime.data.toString('ascii'),
                    bootAfter.data.toString('ascii'));
                check();
                save(path.join(dir, 'launch.json'), payload); // Private host file, no ID output.
            }
        } else {
            if (!equal(binding, baseline.binding)) throw Error('changed installed binding');
            let report, bytes;
            const locations = [];
            for (let i = 0; i < paths.length; ++i) {
                if (await absent(paths[i])) continue;
                const file = await read(paths[i], 2048);
                if (file.mode !== 0o600 || (bytes && !bytes.equals(file.data))) throw Error('report conflict');
                bytes = file.data;
                locations.push(i === 0 ? 'app jail tmp' : 'host tmp');
            }
            if (!bytes) throw Error('missing report');
            report = validateReport(bytes, mode);
            if (!await processAbsent()) throw Error('app reappeared');
            check();
            save(path.join(dir, 'capture.json'), {schemaVersion: 1, appId: id, appVersion: version,
                mode, capturedAt: new Date().toISOString(), packageSha256: local.packageSha256,
                binding, report, reportSha256: hash(bytes), reportLocations: locations,
                phaseAccepted: phaseAccepted(report), processAbsentAtCapture: true,
                exitCode: 'unknown', exitedWithinOwnerDeadline: 'unknown', launchPerformed: false});
        }
        console.log('Read-only capture saved. No launch or TV writes performed.');
    };
    try { await Promise.race([collect(), deadline]); }
    finally { clearTimeout(timer); controller.abort(); client?.destroy(); }
}
if (require.main === module) main(process.argv.slice(2)).catch(() => {
    console.error('HDMI capture gate failed; no launch or TV writes performed.'); process.exitCode = 1;
});
