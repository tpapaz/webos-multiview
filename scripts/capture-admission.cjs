// Read-only SFTP collector. Never launches, signals, deletes or writes on TV.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const {connect} = require('./phase1-device.cjs');
const id = 'io.github.tpapaz.multiview.admission';
const base = '/media/developer/apps/usr/palm/applications/' + id;
const jail = '/var/palm/jail/' + id;
const relative = '/tmp/' + id + '/report-0.1.2.json';
const reports = [jail + relative, relative];
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const root = path.resolve(__dirname, '..');
async function main() {
    const [mode, destination, ...extra] = process.argv.slice(2);
    if (!['--prepare', '--collect'].includes(mode) || !destination || extra.length) {
        throw Error('arguments');
    }
    const dir = path.resolve(destination);
    let client;
    const timer = setTimeout(() => { client?.destroy(); process.exitCode = 1; }, 30000);
    try {
        client = await connect();
        const sftp = await new Promise((resolve, reject) => client.sftp((e, s) => e ? reject(e) : resolve(s)));
        const call = (name, ...args) => new Promise((resolve, reject) =>
            sftp[name](...args, (e, result) => e ? reject(e) : resolve(result)));
        async function read(name, limit) {
            const stat = await call('lstat', name);
            if (!stat.isFile() || stat.size > limit) throw Error('file');
            const data = await call('readFile', name);
            if (data.length !== stat.size) throw Error('changed');
            return {data, mode: stat.mode & 4095};
        }
        async function absent(name) {
            try { await call('lstat', name); return false; }
            catch (e) { if (e.code === 2) return true; throw e; }
        }
        async function exited() {
            const entries = await call('readdir', '/proc');
            const processes = entries.filter(e => /^\d+$/.test(e.filename));
            if (processes.length > 1024) throw Error('process bound');
            for (const p of processes) {
                let exe;
                try { exe = await call('readlink', '/proc/' + p.filename + '/exe'); }
                catch (e) { if (e.code === 2) continue; throw e; }
                if ([base + '/multiview-admission', jail + base + '/multiview-admission'].some(x =>
                    exe === x || exe === x + ' (deleted)')) return false;
            }
            return true;
        }
        const binary = await read(base + '/multiview-admission', 1024 * 1024);
        const manifest = await read(base + '/appinfo.json', 4096);
        if (binary.mode !== 493 || hash(binary.data) !== hash(fs.readFileSync(path.join(root,
            'build/phase-2/admission-arm/multiview-admission'))) ||
            !manifest.data.equals(fs.readFileSync(path.join(root, 'native/phase2-admission/appinfo.json')))) {
            throw Error('installed artifact');
        }
        const policies = {};
        for (const side of ['pub', 'prv']) {
            const item = await read('/var/palm/ls2-dev/roles/' + side + '/' + id + '.json', 16384);
            const role = JSON.parse(item.data);
            const permission = role.permissions.find(p => p.service === id);
            if (role.role.exeName !== base + '/multiview-admission' || role.role.type !== 'regular' ||
                !role.role.allowedNames.includes(id) || !permission ||
                JSON.stringify(permission.inbound) !== '[]' || JSON.stringify(permission.outbound) !== '["*"]') {
                throw Error('role');
            }
            policies[side] = hash(item.data);
        }
        const clientPolicy = await read('/var/luna-service2-dev/client-permissions.d/' + id + '.app.json', 4096);
        if (JSON.stringify(JSON.parse(clientPolicy.data)[id]) !== '["public"]') throw Error('group');
        policies.client = hash(clientPolicy.data);
        if (!await exited()) throw Error('app running');
        const binding = {binarySha256: hash(binary.data), manifestSha256: hash(manifest.data), policies};
        if (mode === '--prepare') {
            for (const name of reports) if (!await absent(name)) throw Error('existing report');
            fs.mkdirSync(dir, {recursive: true});
            fs.writeFileSync(path.join(dir, 'preflight.json'), JSON.stringify({
                schemaVersion: 1, preparedAt: new Date().toISOString(), appId: id,
                appVersion: '0.1.2', binding, reportsAbsent: true, processAbsent: true,
                launchPerformed: false
            }, null, 2) + '\n', {flag: 'wx'});
            console.log('Preflight saved. App not launched.');
        } else {
            const baseline = JSON.parse(fs.readFileSync(path.join(dir, 'preflight.json')));
            if (!baseline.reportsAbsent || !baseline.processAbsent ||
                JSON.stringify(baseline.binding) !== JSON.stringify(binding)) throw Error('binding');
            const found = [];
            for (const name of reports) if (!await absent(name)) found.push(name);
            if (!found.length) throw Error('missing report');
            const file = await read(found[0], 2048);
            if (file.mode !== 384) throw Error('report mode');
            // Bind mounts can expose the same report through both paths. Retain
            // that provenance; never choose between differing report contents.
            for (const name of found.slice(1)) {
                const copy = await read(name, 2048);
                if (copy.mode !== file.mode || !copy.data.equals(file.data)) throw Error('conflicting reports');
            }
            const report = JSON.parse(file.data);
            const statuses = ['read_admission_passed', 'registration_failed', 'identity_mismatch',
                'transport_failed', 'cancelled', 'deadline', 'reply_timeout', 'invalid_reply', 'denied', 'cleanup_failed', 'invalid_launch_arguments'];
            const booleans = ['registered', 'identityMatched', 'cleanupConfirmed', 'listAdmitted'];
            const ranges = {calls: [0, 3], listPolicyAllowed: [-1, 1], resetPolicyAllowed: [-1, 1],
                publicationCount: [0, 64], hdmiCandidateCount: [0, 64], elapsedMs: [0, 8000]};
            const constants = {schemaVersion: 1, appVersion: '0.1.2', appId: id,
                executionContext: 'unverified', baseline: 'unknown', appliedGeometry: 'unknown'};
            const keys = [...Object.keys(constants), ...booleans, ...Object.keys(ranges), 'status'];
            if (Object.keys(report).length !== keys.length || Object.keys(report).some(k => !keys.includes(k)) ||
                Object.entries(constants).some(([k, v]) => report[k] !== v) || !statuses.includes(report.status) ||
                booleans.some(k => typeof report[k] !== 'boolean') || Object.entries(ranges).some(([k, [lo, hi]]) =>
                    !Number.isInteger(report[k]) || report[k] < lo || report[k] > hi)) throw Error('report schema');
            if (!await exited()) throw Error('process reappeared');
            fs.writeFileSync(path.join(dir, 'capture.json'), JSON.stringify({schemaVersion: 1,
                capturedAt: new Date().toISOString(), binding, report,
                processAbsent: true, exitCode: 'unknown', launchContext: 'owner confirmation required',
                source: found[0] === reports[0] ? 'app jail tmp' : 'host tmp',
                reportLocations: found.map(name => name === reports[0] ? 'app jail tmp' : 'host tmp'),
                reportSha256: hash(file.data)}, null, 2) + '\n', {flag: 'wx'});
            console.log('Bounded report saved; process absent. No launch or TV writes performed.');
        }
    } finally { clearTimeout(timer); client?.end(); }
}
main().catch(() => { console.error('Admission capture gate failed; no launch or TV writes performed.'); process.exitCode = 1; });
