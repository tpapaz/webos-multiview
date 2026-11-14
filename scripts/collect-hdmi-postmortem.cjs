// Fixed read-only 0.1.4 postmortem. No shell, launch, policy, clock or TV write API.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const {id, version, filename, validateReport} = require('./hdmi-window-report.cjs');
const root = path.resolve(__dirname, '..');
const base = '/media/developer/apps/usr/palm/applications/' + id;
const jail = '/var/palm/jail/' + id;
const reportPath = '/tmp/' + id + '/' + filename('picture');
const aliases = [reportPath, jail + reportPath];
const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const metadata = s => ({mode: s.mode & 0o7777, uid: s.uid, gid: s.gid,
    size: s.size, mtime: s.mtime, type: s.isFile() ? 'file' : s.isDirectory() ? 'directory' : 'other'});
const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const category = e => e?.code === 2 ? 'absent' : e?.code === 3 ? 'permission_denied' :
    e?.code === 4 ? 'remote_failure' : e?.code === 'DEADLINE' ? 'deadline' : 'transport_or_local_failure';

async function capture(connect, expected, emit, timeoutMs = 30000) {
    const result = {schemaVersion: 1, appId: id, appVersion: version,
        startedAt: new Date().toISOString(), status: 'incomplete', stages: [],
        installed: {}, process: {state: 'unknown'}, reports: aliases.map(() => ({state: 'not_collected'})),
        aliasComparison: 'unknown', launchReadiness: 'not_established', exitReason: 'unknown',
        nativeEntry: 'unknown', actualUtpExecution: 'unknown', hardwareRelease: 'unknown'};
    const controller = new AbortController();
    const started = performance.now();
    let client, timer, stopped = false, active;
    function check() { if (stopped) throw Object.assign(Error(), {code: 'DEADLINE'}); }
    function event(stage, outcome) {
        check(); active = outcome === 'started' ? stage : undefined;
        const entry = {stage, outcome, elapsedMs: Math.round(performance.now() - started)};
        result.stages.push(entry); emit(entry);
    }
    async function stage(name, operation) {
        event(name, 'started');
        try { const value = await operation(); check(); event(name, 'ok'); return value; }
        catch (e) { if (!stopped) event(name, category(e)); throw e; }
    }
    const deadline = new Promise((_, reject) => {
        timer = setTimeout(() => {
            const entry = {stage: active || 'collection', outcome: 'deadline',
                elapsedMs: Math.round(performance.now() - started)};
            result.stages.push(entry); emit(entry);
            stopped = true; controller.abort(); client?.destroy();
            reject(Object.assign(Error(), {code: 'DEADLINE'}));
        }, timeoutMs);
    });
    const collect = async () => {
        client = await stage('connection', () => connect(undefined, {signal: controller.signal}));
        const sftp = await stage('sftp', () => new Promise((resolve, reject) =>
            client.sftp((e, value) => e ? reject(e) : resolve(value))));
        const call = (label, method, ...args) => stage(label + '.' + method, () =>
            new Promise((resolve, reject) => sftp[method](...args, (e, value) => e ? reject(e) : resolve(value))));
        async function inspect(label, name, limit, parentOnly = false, finding = {state: 'unreadable'}) {
            try {
                const before = await call(label, 'lstat', name);
                finding.metadata = metadata(before);
                if (parentOnly) {
                    finding.state = before.isDirectory() ? 'present' : 'invalid';
                    return finding;
                }
                if (!before.isFile() || before.size > limit) {
                    finding.state = 'invalid';
                    finding.reason = !before.isFile() ? 'not_regular' : 'exceeds_cap';
                    return finding;
                }
                const handle = await call(label, 'open', name, 'r');
                let bytes;
                try {
                    const opened = await call(label, 'fstat', handle);
                    if (!equal(metadata(opened), finding.metadata)) {
                        finding.reason = 'changed_file'; return finding;
                    }
                    bytes = Buffer.alloc(before.size);
                    let count = 0;
                    while (count < bytes.length) {
                        const n = await stage(label + '.read', () => new Promise((resolve, reject) =>
                            sftp.read(handle, bytes, count, Math.min(32768, bytes.length - count), count,
                                (e, size) => e ? reject(e) : resolve(size))));
                        if (!n) break;
                        count += n;
                    }
                    const after = await call(label, 'fstat', handle);
                    if (count !== before.size || !equal(metadata(after), finding.metadata)) {
                        finding.reason = 'changed_or_short_file'; return finding;
                    }
                } finally { if (!stopped) await call(label, 'close', handle); }
                finding.sha256 = sha256(bytes);
                finding.state = bytes.length ? 'readable' : 'empty';
                if (label.startsWith('report.')) {
                    if (bytes.length) {
                        try { finding.report = validateReport(bytes, 'picture'); finding.state = 'valid'; }
                        catch { finding.state = 'invalid'; finding.reason = 'schema_or_json'; }
                    }
                }
                return finding;
            } catch (e) {
                check();
                // ENOENT after successful lstat is a race, not proof of absence.
                finding.state = e.code === 2 && !finding.metadata ? 'absent' : 'unreadable';
                finding.reason = category(e);
                if (![2, 3, 4].includes(e.code)) throw e;
                return finding;
            }
        }
        for (const [key, file, cap, expectedHash, mode] of [
            ['executable', 'multiview-hdmi-window', 1048576, expected.binarySha256, 0o755],
            ['appinfo', 'appinfo.json', 4096, expected.manifestSha256, 0o644]
        ]) {
            const finding = result.installed[key] = {state: 'unreadable'};
            await inspect('installed.' + key, base + '/' + file, cap, false, finding);
            finding.hashMatches = finding.sha256 ? finding.sha256 === expectedHash : 'unknown';
            finding.metadataMatches = finding.metadata ? finding.metadata.mode === mode &&
                finding.metadata.uid === 1000 && finding.metadata.gid === 1000 : 'unknown';
        }
        // Read only exe links to identify our app; export neither PIDs nor other process data.
        let processes;
        try { processes = (await call('own-process', 'readdir', '/proc')).filter(e => /^\d+$/.test(e.filename)); }
        catch (e) {
            if (![2, 3, 4].includes(e.code)) throw e;
            result.process = {state: 'unknown', reason: category(e)};
        }
        if (processes) {
        if (processes.length > 1024) result.process = {state: 'unknown', reason: 'entry_cap'};
        else {
            let uncertain = false, present = false;
            for (const p of processes) {
                try {
                    const exe = await call('own-process', 'readlink', '/proc/' + p.filename + '/exe');
                    if ([base, jail + base].some(prefix => [prefix + '/multiview-hdmi-window',
                        prefix + '/multiview-hdmi-window (deleted)'].includes(exe))) present = true;
                } catch (e) {
                    if (e.code !== 2) {
                        if (![3, 4].includes(e.code)) throw e;
                        uncertain = true;
                    }
                }
            }
            result.process = {state: present ? 'present' : uncertain ? 'unknown' : 'absent'};
        }
        }
        for (let i = 0; i < aliases.length; i++) {
            const label = 'report.' + (i === 0 ? 'host' : 'jail');
            const finding = result.reports[i] = {state: 'unreadable', parent: {state: 'unreadable'}};
            await inspect(label + '-parent', path.posix.dirname(aliases[i]), 0, true, finding.parent);
            // Do not follow a non-directory/symlink parent.
            if (finding.parent.state === 'invalid') finding.reason = 'parent_not_directory';
            else await inspect(label, aliases[i], 2048, false, finding);
        }
        const [a, b] = result.reports;
        result.aliasComparison = a.sha256 && b.sha256 ?
            (a.sha256 === b.sha256 ? 'identical_bytes' : 'conflicting') :
            a.state === 'absent' && b.state === 'absent' ? 'both_absent' : 'not_comparable';
        result.status = 'completed';
    };
    try { await Promise.race([collect(), deadline]); }
    catch (e) { result.failure = category(e); }
    finally {
        clearTimeout(timer); stopped = true; controller.abort(); client?.destroy();
        result.elapsedMs = Math.round(performance.now() - started);
        result.transportClosed = true;
    }
    return result;
}

async function main(args) {
    if (args.length !== 2 || args[0] !== '--allow-tv-read') throw Error('scope');
    const expected = JSON.parse(fs.readFileSync(path.join(root, 'build/phase-2/hdmi-window-' + version + '/package-validation.json')));
    if (expected.appId !== id || expected.appVersion !== version || !expected.archiveVerified ||
        sha256(fs.readFileSync(path.join(root, expected.package))) !== expected.packageSha256) throw Error('local binding');
    const directory = path.resolve(args[1]);
    fs.mkdirSync(directory, {mode: 0o700}); // Fresh evidence only; never replace an original.
    const fd = fs.openSync(path.join(directory, 'stages.jsonl'), 'wx', 0o600);
    try {
        const result = await capture((...values) => require('./phase1-device.cjs').connect(...values), expected,
            event => { fs.writeSync(fd, JSON.stringify(event) + '\n'); fs.fsyncSync(fd); });
        result.packageSha256 = expected.packageSha256;
        result.collectorSha256 = sha256(fs.readFileSync(__filename));
        fs.writeFileSync(path.join(directory, 'capture.json'), JSON.stringify(result, null, 2) + '\n', {flag: 'wx', mode: 0o600});
        console.log('Postmortem ' + result.status + '; sanitized stages saved; transport closed.');
        if (result.status !== 'completed') process.exitCode = 1;
    } finally { fs.closeSync(fd); }
}
if (require.main === module) main(process.argv.slice(2)).catch(() => {
    console.error('Postmortem local setup/save failed; no automatic retry.'); process.exitCode = 1;
});
module.exports = {capture, base, aliases, sha256};
