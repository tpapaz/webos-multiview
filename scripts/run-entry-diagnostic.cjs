// One explicitly authorized inert 0.1.6 SAM launch; no retry, repair or HDMI API.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const {id, version, filename, classify} = require('./entry-diagnostic-report.cjs');
const {prepare} = require('./tv-launch-authority.cjs');
const {project} = require('./entry-exit-evidence.cjs');
const root = path.resolve(__dirname, '..');
const base = '/media/developer/apps/usr/palm/applications/' + id;
const jail = '/var/palm/jail/' + id;
const aliases = ['/tmp/' + id + '/' + filename, jail + '/tmp/' + id + '/' + filename];
const hash = b => crypto.createHash('sha256').update(b).digest('hex');
const attrs = s => ({type: s.isFile() ? 'file' : s.isDirectory() ? 'directory' : 'other',
    mode: s.mode & 0o7777, uid: s.uid, gid: s.gid, size: s.size, mtime: s.mtime});
const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const fail = code => Object.assign(Error(), {code});
const category = e => ({2: 'absent', 3: 'unreadable', 4: 'remote_failure',
    DEADLINE: 'deadline', GATE: 'binding_or_readiness', CHANGED: 'changed_file',
    ACK: 'launch_acknowledgment', LEASE: 'lease', BOUND: 'bound'}[e?.code] || 'transport_or_local_failure');
function commandFor(p) {
    if (!equal(Object.keys(p).sort(), ['acquireHdmi4', 'launchBootId', 'launchStartByBoottimeMs', 'launchStartByRealtimeMs'].sort()) ||
        p.acquireHdmi4 !== true || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(p.launchBootId) ||
        !['launchStartByBoottimeMs', 'launchStartByRealtimeMs'].every(k => Number.isSafeInteger(p[k]) && p[k] > 0)) throw fail('GATE');
    return "/usr/bin/luna-send -n 1 -w 2000 'luna://com.webos.applicationManager/launch' '" +
        JSON.stringify({id, subscribe: false, params: p}) + "'";
}
async function run(connect, pkg, emit, savePrivate, {wait = ms => new Promise(r => setTimeout(r, ms)), timeoutMs = 30000} = {}) {
    const result = {schemaVersion: 1, appId: id, appVersion: version, mode: 'inert_entry_diagnostic',
        startedAt: new Date().toISOString(), status: 'incomplete', launchCount: 0, acknowledgment: 'not_submitted',
        installed: {}, reportsBefore: [], reports: [], processBefore: 'unknown', processAfter: 'unknown',
        log: {state: 'unknown'}, stages: [], original014Cause: 'unknown'};
    const controller = new AbortController(), started = performance.now();
    let client, sftp, stopped = false, active, logHandle, logCursor, timer, closed = false;
    function check() { if (stopped) throw fail('DEADLINE'); }
    function event(stage, outcome) {
        check(); active = outcome === 'started' ? stage : undefined;
        const e = {stage, outcome, elapsedMs: Math.round(performance.now() - started)};
        result.stages.push(e); emit(e);
    }
    async function stage(name, fn) {
        event(name, 'started');
        try { const value = await fn(); check(); event(name, 'ok'); return value; }
        catch (e) { if (!stopped) event(name, category(e)); throw e; }
    }
    const call = (label, method, ...args) => stage(label + '.' + method, () =>
        new Promise((resolve, reject) => sftp[method](...args, (e, value) => e ? reject(e) : resolve(value))));
    async function range(label, handle, position, length) {
        const b = Buffer.alloc(length); let count = 0;
        while (count < length) {
            const n = await stage(label + '.read', () => new Promise((resolve, reject) =>
                sftp.read(handle, b, count, Math.min(32768, length - count), position + count,
                    (e, n) => e ? reject(e) : resolve(n))));
            if (!n) break;
            count += n;
        }
        return b.subarray(0, count);
    }
    async function read(label, name, cap, proc = false) {
        const finding = {state: 'unreadable'}; let data;
        try {
            const before = attrs(await call(label, 'lstat', name)); finding.metadata = before;
            if (before.type !== 'file' || before.size > cap || (proc && before.size !== 0)) throw fail('BOUND');
            const h = await call(label, 'open', name, 'r');
            try {
                if (!equal(attrs(await call(label, 'fstat', h)), before)) throw fail('CHANGED');
                data = await range(label, h, 0, proc ? cap : before.size);
                const after = attrs(await call(label, 'fstat', h));
                if ((!proc && (data.length !== before.size || !equal(after, before))) || after.type !== 'file') throw fail('CHANGED');
            } finally { if (!stopped) await call(label, 'close', h); }
            finding.state = data.length ? 'readable' : 'empty'; finding.sha256 = hash(data);
        } catch (e) {
            check(); data = undefined; finding.reason = category(e);
            finding.state = e.code === 2 && !finding.metadata ? 'absent' : e.code === 'BOUND' ? 'invalid' : 'unreadable';
            if (![2, 3, 4, 'BOUND', 'CHANGED'].includes(e.code)) throw e;
        }
        return {finding, data};
    }
    async function ownProcess(label) {
        let uncertain = false;
        const entries = (await call(label, 'readdir', '/proc')).filter(e => /^\d+$/.test(e.filename));
        if (entries.length > 1024) return 'unknown';
        for (const p of entries) {
            try {
                const exe = await call(label, 'readlink', '/proc/' + p.filename + '/exe');
                if ([base, jail + base].some(prefix => [prefix + '/multiview-hdmi-window',
                    prefix + '/multiview-hdmi-window (deleted)'].includes(exe))) return 'present';
            } catch (e) { if (e.code !== 2) { if (![3, 4].includes(e.code)) throw e; uncertain = true; } }
        }
        return uncertain ? 'unknown' : 'absent';
    }
    async function reports(label, target) {
        for (let i = 0; i < aliases.length; i++) {
            const prefix = label + '.' + (i ? 'jail' : 'host');
            const entry = {parent: {state: 'unreadable'}, state: 'unreadable'}; target.push(entry);
            try {
                entry.parent.metadata = attrs(await call(prefix + '.parent', 'lstat', path.posix.dirname(aliases[i])));
                entry.parent.state = entry.parent.metadata.type === 'directory' ? 'present' : 'invalid';
            } catch (e) {
                if (![2, 3, 4].includes(e.code)) throw e;
                entry.parent.state = e.code === 2 ? 'absent' : 'unreadable';
            }
            if (entry.parent.state === 'invalid') { entry.reason = 'parent_not_directory'; continue; }
            const f = await read(prefix, aliases[i], 2048);
            Object.assign(entry, f.finding);
            if (f.data) Object.assign(entry, classify(f.data));
        }
    }
    async function collectLog() {
        if (logHandle === undefined || !Number.isSafeInteger(logCursor)) return;
        try {
            const after = attrs(await call('log.after', 'fstat', logHandle));
            const length = after.size - logCursor;
            if (after.type !== 'file' || length < 0 || length > 65536) { result.log = {state: 'unknown', reason: 'changed_or_cap'}; return; }
            const bytes = await range('log.delta', logHandle, logCursor, length);
            result.log = {state: bytes.length === length ? 'captured' : 'short_read', bytes: bytes.length,
                sha256: hash(bytes), projection: project(bytes)};
        } catch (e) { check(); result.log = {state: 'unknown', reason: category(e)}; }
    }
    const deadline = new Promise((_, reject) => {
        timer = setTimeout(() => {
            const e = {stage: active || 'run', outcome: 'deadline', elapsedMs: Math.round(performance.now() - started)};
            result.stages.push(e); emit(e); stopped = true; controller.abort(); client?.destroy(); reject(fail('DEADLINE'));
        }, timeoutMs);
    });
    const work = async () => {
        client = await stage('connection', () => connect(undefined, {signal: controller.signal}));
        client.once('close', () => { closed = true; });
        sftp = await stage('sftp', () => new Promise((resolve, reject) => client.sftp((e, s) => e ? reject(e) : resolve(s))));
        for (const [key, file, cap, expected, mode] of [
            ['executable', 'multiview-hdmi-window', 1048576, pkg.binarySha256, 0o755],
            ['appinfo', 'appinfo.json', 4096, pkg.manifestSha256, 0o644]]) {
            const {finding} = await read('installed.' + key, base + '/' + file, cap);
            result.installed[key] = {...finding, hashMatches: finding.sha256 === expected,
                metadataMatches: Boolean(finding.metadata && finding.metadata.mode === mode && finding.metadata.uid === 1000 && finding.metadata.gid === 1000)};
        }
        result.processBefore = await ownProcess('before.own-process');
        await reports('before.report', result.reportsBefore);
        const ready = Object.values(result.installed).every(f => f.hashMatches && f.metadataMatches) &&
            result.processBefore === 'absent' && result.reportsBefore.every(f => f.state === 'absent');
        await stage('launch.readiness', async () => { if (!ready) throw fail('GATE'); });
        try {
            const st = attrs(await call('log.before', 'lstat', '/var/log/messages'));
            if (st.type !== 'file') throw fail('BOUND');
            logHandle = await call('log.before', 'open', '/var/log/messages', 'r');
            const opened = attrs(await call('log.before', 'fstat', logHandle));
            if (opened.type !== 'file') throw fail('BOUND');
            logCursor = opened.size; result.log = {state: 'cursor_opened'};
        } catch (e) { result.log = {state: 'unknown', reason: category(e)}; }
        const issued = performance.now();
        const lease = await prepare({now: () => performance.now(),
            read: async (name, cap) => {
                const value = await read('lease.sample', name, cap, true);
                if (!value.data) throw fail('LEASE');
                return value.data.toString('ascii');
            },
            exec: (command, limits) => stage('lease.tv-realtime', () => new Promise((resolve, reject) => {
                let stream, done = false, bytes = 0, stderrBytes = 0, chunks = [];
                const finish = (error, value) => { if (done) return; done = true; clearTimeout(timer); error ? reject(error) : resolve(value); };
                const timer = setTimeout(() => { stream?.destroy(); finish(fail('LEASE')); }, limits.timeoutMs);
                client.exec(command, (error, s) => {
                    if (error) { finish(error); return; } stream = s;
                    s.on('data', b => { bytes += b.length; if (bytes > limits.stdoutCap) { s.destroy(); finish(fail('BOUND')); } else chunks.push(b); });
                    s.stderr.on('data', b => { stderrBytes += b.length; if (stderrBytes > limits.stderrCap) { s.destroy(); finish(fail('BOUND')); } });
                    s.on('error', () => finish(fail('LEASE')));
                    s.on('close', (code, signal) => finish(null, {code, signal, stderrBytes, stdout: Buffer.concat(chunks).toString('ascii')}));
                });
            }))});
        result.submissionIntentCount = 1;
        event('launch.submission_intent', 'recorded');
        try {
            await stage('launch.sam', () => new Promise((resolve, reject) => {
                let done = false, stream, size = 0, stderr = 0, chunks = [];
                const finish = e => { if (done) return; done = true; clearTimeout(limit); client.removeListener('close', lost); e ? reject(e) : resolve(); };
                const lost = () => finish(fail('ACK'));
                const limit = setTimeout(() => { stream?.destroy(); finish(fail('ACK')); }, 3000);
                client.once('close', lost);
                // Final lease check is adjacent to the single dispatch, after fsync stages.
                try { lease.dispatch(payload => {
                savePrivate('launch.json', payload);
                if (performance.now() - issued >= 2000) throw fail('LEASE');
                result.launchCount = 1; result.submittedAt = new Date().toISOString(); result.issueToDispatchMs = Math.round(performance.now() - issued);
                client.exec(commandFor(payload), (e, s) => {
                    if (e) { finish(e); return; } stream = s;
                    s.on('data', b => { size += b.length; if (size > 4096) { s.destroy(); finish(fail('BOUND')); } else chunks.push(b); });
                    s.stderr.on('data', b => { stderr += b.length; if (stderr > 1024) { s.destroy(); finish(fail('BOUND')); } });
                    s.on('error', () => finish(fail('ACK')));
                    s.on('close', (code, signal) => {
                        if (done) return;
                        result.utilityExitCode = Number.isInteger(code) ? code : 'unknown';
                        result.utilitySignalPresent = Boolean(signal); result.stderrBytes = stderr;
                        const bytes = Buffer.concat(chunks); result.ackSha256 = hash(bytes);
                        try { if (code !== 0 || signal || stderr || JSON.parse(bytes).returnValue !== true) throw fail('ACK');
                            result.acknowledgment = 'accepted'; result.issueToAckMs = Math.round(performance.now() - issued); finish(); }
                        catch { finish(fail('ACK')); }
                    });
                });
                }); } catch (error) { finish(error); }
            }));
        } catch (e) { result.acknowledgment = 'unknown'; result.launchFailure = category(e); }
        await stage('native.cap-wait', () => wait(6000));
        await reports('after.report', result.reports);
        result.processAfter = await ownProcess('after.own-process');
        await collectLog();
        const [a, b] = result.reports;
        result.aliasComparison = a.sha256 && b.sha256 ? a.sha256 === b.sha256 ? 'identical_bytes' : 'conflicting' :
            a.state === 'absent' && b.state === 'absent' ? 'both_absent' : 'not_comparable';
        result.status = 'completed';
    };
    try { await Promise.race([work(), deadline]); }
    catch (e) { result.failure = category(e); }
    finally {
        // Closing transport closes any outstanding SFTP descriptors; never signal the app.
        clearTimeout(timer); stopped = true; controller.abort(); client?.destroy();
        const remaining = Math.max(0, 30000 - (performance.now() - started));
        if (client && !closed && remaining > 0) await new Promise(resolve => {
            const end = setTimeout(resolve, Math.min(250, remaining));
            client.once('close', () => { clearTimeout(end); resolve(); });
        });
        result.transportClosed = closed; result.elapsedMs = Math.round(performance.now() - started);
    }
    return result;
}
function local() {
    const recordBytes = fs.readFileSync(path.join(root, 'build/phase-2/entry-diagnostic-' + version + '/package-validation.json'));
    const validation = JSON.parse(fs.readFileSync(path.join(root, 'build/phase-2/entry-diagnostic-' + version + '/local-validation.json')));
    if (hash(recordBytes) !== validation.packageRecordSha256) throw fail('GATE');
    const pkg = JSON.parse(recordBytes);
    if (pkg.appId !== id || pkg.appVersion !== version || !pkg.noClientGraphicsBusOrAcquisitionCalls ||
        !pkg.archiveVerified || hash(fs.readFileSync(path.join(root, pkg.package))) !== pkg.packageSha256 ||
        hash(fs.readFileSync(path.join(root, pkg.binary))) !== pkg.binarySha256) throw fail('GATE');
    for (const pin of pkg.sources) if (hash(fs.readFileSync(path.join(root, pin.file))) !== pin.sha256) throw fail('GATE');
    return pkg;
}
async function main(args) {
    const pkg = local();
    if (args.length === 1 && args[0] === '--plan') { console.log('Local diagnostic/package pins pass; no device import or connection.'); return; }
    if (args.length !== 2 || args[0] !== '--allow-one-inert-run') throw fail('GATE');
    const directory = path.resolve(args[1]); fs.mkdirSync(directory, {mode: 0o700});
    const fd = fs.openSync(path.join(directory, 'stages.jsonl'), 'wx', 0o600);
    try {
        const result = await run((...a) => require('./phase1-device.cjs').connect(...a), pkg,
            e => { fs.writeSync(fd, JSON.stringify(e) + '\n'); fs.fsyncSync(fd); },
            (name, value) => fs.writeFileSync(path.join(directory, name), JSON.stringify(value) + '\n', {flag: 'wx', mode: 0o600}));
        result.packageSha256 = pkg.packageSha256; result.runnerSha256 = hash(fs.readFileSync(__filename));
        fs.writeFileSync(path.join(directory, 'capture.json'), JSON.stringify(result, null, 2) + '\n', {flag: 'wx', mode: 0o600});
        console.log('Inert run ' + result.status + '; launches ' + result.launchCount + '; sanitized capture saved; transport closed.');
        if (result.status !== 'completed') process.exitCode = 1;
    } finally { fs.closeSync(fd); }
}
if (require.main === module) main(process.argv.slice(2)).catch(() => {
    console.error('Inert diagnostic local setup/save failed; no automatic retry.'); process.exitCode = 1;
});
module.exports = {run, commandFor, hash, base, aliases};
