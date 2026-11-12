// Two fixed native lifecycle cases. Importing never connects/stages.
const crypto = require('node:crypto');
const {TextDecoder} = require('node:util');
const {performance} = require('node:perf_hooks');
const PIN = Object.freeze({bytes: 17780, sha256: '375e17c98229221392a98fc11ffacadfb713dd50a09b1d425002af0dcb07bec0'});
const RUNTIME = Object.freeze([
    ['/lib/ld-linux.so.3', 1324672, 'e64aab4a464eb8d582a444a67efb2a9954d5d940aaf75c0dcd6fb7fa1a37eb24'],
    ['/lib/libc.so.6', 16434188, '3c3da115dfe9af7df0cbe3b643d54bb8d770b8e3909f882414c10defe2b8d9f0'],
    ['/lib/librt.so.1', 424056, '7e44c21f3bf199748a630a41854438400f2ae58efe5c21e29705f2fbbd07b9ea'],
    ['/lib/libpthread.so.0', 2741448, 'fa9722e9e7da8e4a3c9e4e0ce59760272c54628d1b50b927207d890185718086']
].map(([path, bytes, sha256]) => Object.freeze({path, bytes, sha256})));
const APP = '/media/developer/apps/usr/palm/applications/io.github.tpapaz.multiview.admission/multiview-admission';
const APP_EXES = [APP, '/var/palm/jail/io.github.tpapaz.multiview.admission' + APP];
const SHA_COMMAND = 'sha256sum ' + RUNTIME.map(p => "'" + p.path + "'").join(' ');
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const decode = bytes => new TextDecoder('utf-8', {fatal: true}).decode(bytes);
const number = (n, min, max) => Number.isInteger(n) && n >= min && n <= max;

function parseOwned(bytes) {
    if (bytes.length > 4096) throw Error('invalid_metadata');
    const lines = decode(bytes).trim().split('\n').filter(Boolean);
    if (lines.length > 4) throw Error('invalid_metadata');
    const seen = new Set(), pids = new Set();
    return lines.map(line => {
        const row = JSON.parse(line);
        if (Object.keys(row).sort().join() !== 'pid,role,session,start' ||
            !['launcher', 'supervisor', 'actor', 'worker'].includes(row.role) || seen.has(row.role) || pids.has(row.pid) ||
            !number(row.pid, 1, 2147483647) || !number(row.session, 1, 2147483647) ||
            typeof row.start !== 'string' || !/^[1-9]\d{0,19}$/.test(row.start)) throw Error('invalid_metadata');
        seen.add(row.role); pids.add(row.pid);
        return Object.freeze({pid: row.pid, role: row.role, start: row.start, session: row.session});
    });
}
function parseReport(bytes, expectedCase = 'normal') {
    if (!['normal', 'control_loss'].includes(expectedCase)) throw Error('invalid_case');
    if (!bytes.length || bytes.length > 8192) throw Error('invalid_report');
    const r = JSON.parse(decode(bytes));
    const fixed = {schemaVersion: 1, mode: 'native_lifecycle_fake_workers', case: expectedCase, iwcCalls: 0,
        hardwareRestoration: 'not_tested'};
    const flags = ['cleanupConfirmed', 'separateSession', 'hostControlLost', 'actorLossObserved',
        'actorStarted', 'workerStarted', 'fakeReplyValidated', 'actorReaped', 'workerReaped'];
    const counts = {termRequests: [0, 2], killRequests: [0, 2], replyObservedMs: [-1, 8000],
        workerExitObservedMs: [-1, 8000], elapsedMs: [0, 8000]};
    const statuses = ['startup_failed', 'readiness_lost', 'poll_failed', 'unexpected_control_data',
        'worker_start_failed', 'oversized_fake_reply', 'pipe_failed', 'cancelled_cleanly',
        'lifecycle_control_passed', 'invalid_fake_reply', 'fake_work_timeout', 'cleanup_unconfirmed',
        'control_loss_not_observed'];
    const keys = [...Object.keys(fixed), ...flags, ...Object.keys(counts), 'status'];
    if (!r || Object.keys(r).length !== keys.length || Object.keys(r).some(k => !keys.includes(k)) ||
        Object.entries(fixed).some(([k, v]) => r[k] !== v) || !statuses.includes(r.status) ||
        flags.some(k => typeof r[k] !== 'boolean') ||
        Object.entries(counts).some(([k, [lo, hi]]) => !number(r[k], lo, hi))) throw Error('invalid_report');
    return r;
}

async function runCase(testCase, connect, bytes, {signal, saveReport, timers = globalThis, now = () => performance.now()} = {}) {
    // Private function: only the two fixed wrappers below select a case.
    const loss = testCase === 'control_loss';
    const state = {schemaVersion: 1, context: loss ? 'C1 native lifecycle control-channel loss' : 'C1 native lifecycle normal control',
        case: testCase, controlEofSent: false, controlEofMs: null, status: 'preflight_failed',
        binarySha256: PIN.sha256, executionRequested: false, readinessConfirmed: false,
        launcherExitConfirmed: false, launcherExitCode: null, helperProcessesAbsent: false,
        appAbsentBefore: false, appAbsentAfter: false, emergencyCleanupAttempted: false,
        stageRemoved: false, nativeReport: null, runtimeVerified: false, temporaryDirectory: null,
        iwcCalls: 0, hardwareRestoration: 'not_tested', elapsedMs: 0};
    if (!Buffer.isBuffer(bytes) || bytes.length !== PIN.bytes || hash(bytes) !== PIN.sha256) return state;
    if (typeof saveReport !== 'function') return {...state, status: 'capture_not_saved'};
    const started = now(), abort = new AbortController(), clients = [], tasks = new Set();
    let expired = false, cancelled = signal?.aborted || false, channel, phase = 'preflight';
    let stageOwned = false, binaryCreated = false, sftp, runStarted = null, observed = [];
    let wire = null, exitCode = null, exitSeen = false, exitSignal = false, closed = false;
    let wireOutput = [], wireSize = 0, dirtyStderr = false, readinessAt = null;
    let rejectBudget;
    const budget = new Promise((_, reject) => { rejectBudget = reject; });
    const later = (fn, ms) => { const id = timers.setTimeout(fn, ms); tasks.add(id); return id; };
    const stop = () => {
        expired = true; abort.abort();
        for (const client of clients) client.destroy();
        rejectBudget(Error('deadline'));
    };
    const preflightTimer = later(stop, 10000);
    const guard = () => {
        if (expired) throw Error('deadline');
        if (cancelled && phase === 'preflight') throw Error('cancelled');
    };
    const bounded = promise => Promise.race([promise, budget]);
    const rpc = (object, method, ...args) => {
        guard();
        return bounded(new Promise((resolve, reject) => object[method](...args,
            (error, value) => error ? reject(Error(error.code === 2 ? 'absent' : 'io_failed')) : resolve(value))));
    };
    const cancelledNow = () => {
        cancelled = true;
        if (phase === 'preflight') abort.abort();
        try { channel?.signal('TERM', () => {}); } catch { /* No exit proof implied. */ }
    };
    signal?.addEventListener('abort', cancelledNow, {once: true});
    const pause = ms => bounded(new Promise(resolve => later(resolve, ms)));
    async function read(file, cap) {
        const handle = await rpc(sftp, 'open', file, 'r');
        const buffer = Buffer.alloc(cap + 1);
        let offset = 0;
        try {
            while (offset < buffer.length) {
                const n = await bounded(new Promise((resolve, reject) => {
                    guard();
                    sftp.read(handle, buffer, offset, buffer.length - offset, offset,
                        (error, count) => error ? reject(Error('io_failed')) : resolve(count));
                }));
                if (!number(n, 0, buffer.length - offset)) throw Error('io_failed');
                if (!n) break;
                offset += n;
            }
        } finally { if (!expired) await rpc(sftp, 'close', handle); }
        if (offset > cap) throw Error('oversized_file');
        return buffer.subarray(0, offset);
    }
    async function privateRead(file, cap) {
        const st = await rpc(sftp, 'lstat', file);
        if (!st.isFile() || st.uid !== 0 || (st.mode & 0o7777) !== 0o600 || st.size > cap) throw Error('unsafe_file');
        return read(file, cap);
    }
    async function listProcesses() {
        const entries = await rpc(sftp, 'readdir', '/proc');
        const names = entries.filter(e => /^\d+$/.test(e.filename));
        if (names.length > 1024) throw Error('process_bound');
        let helpers = 0, apps = 0;
        for (const {filename} of names) {
            let exe;
            try { exe = await rpc(sftp, 'readlink', '/proc/' + filename + '/exe'); }
            catch (e) { if (e.message === 'absent') continue; throw e; }
            if (state.temporaryDirectory && [binaryPath(), binaryPath() + ' (deleted)'].includes(exe)) ++helpers;
            if (APP_EXES.some(p => exe === p || exe === p + ' (deleted)')) ++apps;
        }
        return {helpers, apps};
    }
    const binaryPath = () => state.temporaryDirectory + '/multiview-lifecycle';
    async function execSmall(client, command) {
        const stream = await rpc(client, 'exec', command, {pty: false});
        let data = [], size = 0, code, exited = false, stderr = false;
        return bounded(new Promise((resolve, reject) => {
            stream.on('data', part => {
                size += part.length;
                if (size > 2048) { stream.destroy(); reject(Error('oversized_command')); }
                else data.push(Buffer.from(part));
            });
            stream.stderr.on('data', () => { stderr = true; });
            stream.on('error', () => reject(Error('io_failed')));
            stream.on('exit', (n, sig) => { exited = true; code = sig ? null : n; });
            stream.on('close', () => {
                if (!exited || code !== 0 || stderr) reject(Error('command_failed'));
                else resolve(decode(Buffer.concat(data)).trim());
            });
            stream.end(); // Verification commands never control helper lifetime.
        }));
    }
    async function metadata() {
        try {
            const rows = parseOwned(await privateRead(state.temporaryDirectory + '/owned.jsonl', 4096));
            for (const row of observed) {
                const next = rows.find(r => r.role === row.role);
                if (!next || JSON.stringify(next) !== JSON.stringify(row)) throw Error('changed_identity');
            }
            observed = rows;
        } catch (e) {
            if (e instanceof SyntaxError && !closed) return; // A bounded append may still be in flight.
            if (e.message !== 'absent') throw e;
        }
    }
    async function probe(row) {
        let stat;
        try { stat = decode(await read(`/proc/${row.pid}/stat`, 4096)); }
        catch (e) { if (e.message === 'absent') return 'absent'; throw e; }
        const tail = stat.slice(stat.lastIndexOf(')') + 2).trim().split(/\s+/);
        if (tail[19] !== row.start) return 'reused';
        if (tail[0] === 'Z') return 'zombie';
        const exe = await rpc(sftp, 'readlink', `/proc/${row.pid}/exe`);
        const argv = decode(await read(`/proc/${row.pid}/cmdline`, 1024));
        const expected = [binaryPath(), '--case', testCase, '--directory', state.temporaryDirectory, ''].join('\0');
        if (exe !== binaryPath() || argv !== expected || hash(await read(`/proc/${row.pid}/exe`, PIN.bytes)) !== PIN.sha256) return 'not_owned';
        const again = decode(await read(`/proc/${row.pid}/stat`, 4096)).split(')').slice(1).join(')').trim().split(/\s+/);
        return again[19] === row.start ? 'owned' : 'not_owned';
    }
    async function signalOwned(row, name) {
        if (!['TERM', 'KILL'].includes(name)) throw Error('invalid_signal');
        if (await probe(row) !== 'owned') return false;
        const p = row.pid, path = binaryPath(), dir = state.temporaryDirectory;
        // Repeat all identity guards at the point of signalling. No supplied shell fragments.
        const check = `test "$(awk '{print $22}' /proc/${p}/stat 2>/dev/null)" = '${row.start}' && ` +
            `test "$(readlink /proc/${p}/exe 2>/dev/null)" = '${path}' && ` +
            `test "$(sha256sum /proc/${p}/exe 2>/dev/null | cut -d' ' -f1)" = '${PIN.sha256}' && ` +
            `test "$(tr '\\000' ' ' < /proc/${p}/cmdline 2>/dev/null)" = '${path} --case ${testCase} --directory ${dir} ' && ` +
            `test "$(awk '{print $22}' /proc/${p}/stat 2>/dev/null)" = '${row.start}'`;
        return await execSmall(clients[1], `if ${check}; then kill -${name} ${p} && echo signalled; else echo identity_refused; fi`) === 'signalled';
    }
    async function removeStage() {
        // Only an exclusively created directory, exact allowlisted files, no recursion.
        const files = await rpc(sftp, 'readdir', state.temporaryDirectory);
        const allowed = ['multiview-lifecycle', 'owned.jsonl', 'report.json'];
        if (files.some(f => !allowed.includes(f.filename))) throw Error('unexpected_stage_file');
        for (const {filename} of files) {
            const file = state.temporaryDirectory + '/' + filename;
            const st = await rpc(sftp, 'lstat', file);
            if (!st.isFile() || st.uid !== 0) throw Error('unsafe_file');
        }
        for (const {filename} of files) await rpc(sftp, 'unlink', state.temporaryDirectory + '/' + filename);
        await rpc(sftp, 'rmdir', state.temporaryDirectory);
        state.stageRemoved = true;
    }
    try {
        if (cancelled) { state.status = 'cancelled'; return state; }
        // Both independent clients must be ready before creating any TV files.
        const open = async () => {
            const client = await connect(abort.signal);
            if (expired) { client.destroy(); throw Error('deadline'); }
            clients.push(client);
            client.on('error', () => {}); // All failures are projected into fixed categories below.
            return client;
        };
        await bounded(open()); await bounded(open());
        sftp = await rpc(clients[1], 'sftp');
        state.appAbsentBefore = (await listProcesses()).apps === 0;
        if (!state.appAbsentBefore) throw Error('app_running');
        for (const pin of RUNTIME) {
            const st = await rpc(sftp, 'stat', pin.path);
            if (!st.isFile() || st.size !== pin.bytes) throw Error('runtime_mismatch');
        }
        const hashes = (await execSmall(clients[1], SHA_COMMAND)).split('\n');
        if (hashes.length !== RUNTIME.length || hashes.some((line, i) => line !== `${RUNTIME[i].sha256}  ${RUNTIME[i].path}`)) throw Error('runtime_mismatch');
        state.runtimeVerified = true;
        const tmp = await rpc(sftp, 'lstat', '/tmp');
        if (!tmp.isDirectory() || tmp.uid !== 0) throw Error('unsafe_tmp');
        const dir = '/tmp/multiview-lifecycle-' + crypto.randomBytes(16).toString('hex');
        if (!/^\/tmp\/multiview-lifecycle-[0-9a-f]{32}$/.test(dir)) throw Error('unsafe_tmp');
        state.temporaryDirectory = dir;
        await rpc(sftp, 'mkdir', dir, {mode: 0o700}); stageOwned = true;
        const created = await rpc(sftp, 'lstat', dir);
        if (!created.isDirectory() || created.uid !== 0 || (created.mode & 0o7777) !== 0o700) throw Error('unsafe_stage');
        const upload = await rpc(sftp, 'open', binaryPath(), 'wx', {mode: 0o700}); binaryCreated = true;
        try {
            await bounded(new Promise((resolve, reject) => sftp.write(upload, bytes, 0, bytes.length, 0,
                error => error ? reject(Error('upload_failed')) : resolve())));
        } finally { if (!expired) await rpc(sftp, 'close', upload); }
        const installed = await rpc(sftp, 'lstat', binaryPath());
        if (!installed.isFile() || installed.uid !== 0 || installed.size !== PIN.bytes || (installed.mode & 0o7777) !== 0o700 ||
            hash(await read(binaryPath(), PIN.bytes)) !== PIN.sha256) throw Error('upload_mismatch');
        if (cancelled) throw Error('cancelled');
        timers.clearTimeout(preflightTimer); tasks.delete(preflightTimer);
        runStarted = now(); phase = 'run'; later(stop, 15000);
        state.executionRequested = true;
        clients[0].exec(`exec '${binaryPath()}' --case ${testCase} --directory '${dir}'`, {pty: false}, (error, stream) => {
            if (error) { wire = 'exec_failed'; return; }
            channel = stream;
            if (expired) { try { stream.signal('TERM', () => {}); } catch {} stream.destroy(); return; }
            stream.on('error', () => { wire = 'transport_failed'; });
            stream.on('data', part => {
                wireSize += part.length;
                if (wireSize > 128) wire = 'invalid_readiness';
                else {
                    wireOutput.push(Buffer.from(part));
                    try {
                        const ready = JSON.parse(decode(Buffer.concat(wireOutput)));
                        if (Object.keys(ready).length === 1 && ready.ready === true && readinessAt === null) readinessAt = now();
                    } catch { /* A bounded readiness frame may arrive in chunks. */ }
                }
            });
            stream.stderr.on('data', () => { dirtyStderr = true; wire = 'helper_stderr'; });
            stream.on('exit', (n, sig) => { exitSeen = true; exitCode = number(n, 0, 255) ? n : null; exitSignal = Boolean(sig); });
            stream.on('close', () => { closed = true; });
            // Normal keeps stdin open; loss ends it once from the gated loop below.
            if (cancelled) cancelledNow();
        });
        let emergencyDone = false, absent = false;
        while (now() - runStarted < 14500) {
            await metadata();
            if (loss && !state.controlEofSent && !cancelled && !wire && !exitSeen && !closed && channel &&
                readinessAt !== null && readinessAt - runStarted <= 2000 && now() - runStarted <= 2000 && observed.length === 4) {
                // Four append-only rows include the worker recorded before its gate opens.
                // No signal, SSH disconnect or host tick drives the supervisor's cleanup.
                const supervisor = observed.find(r => r.role === 'supervisor');
                if (supervisor.session !== supervisor.pid || observed.some(r =>
                    ['actor', 'worker'].includes(r.role) && r.session !== supervisor.pid)) throw Error('changed_identity');
                channel.end();
                state.controlEofSent = true; state.controlEofMs = Math.max(0, Math.floor(now() - runStarted));
            }
            if (exitSeen && closed) {
                state.launcherExitConfirmed = true; state.launcherExitCode = exitCode;
                const scan = await listProcesses();
                let gone = true;
                for (const row of observed) if (!['absent', 'reused'].includes(await probe(row))) gone = false;
                absent = gone && scan.helpers === 0;
                state.appAbsentAfter = scan.apps === 0;
                if (absent) break;
            }
            if ((cancelled || now() - runStarted >= 10000) && !emergencyDone) {
                emergencyDone = true; state.emergencyCleanupAttempted = true;
                try { channel?.signal('TERM', () => {}); } catch {}
                for (const row of observed) await signalOwned(row, 'TERM');
                await pause(250);
                for (const row of observed) await signalOwned(row, 'KILL');
            }
            await pause(50);
        }
        state.helperProcessesAbsent = absent;
        try {
            const ready = JSON.parse(decode(Buffer.concat(wireOutput)));
            state.readinessConfirmed = wireSize <= 128 && Object.keys(ready).length === 1 && ready.ready === true &&
                readinessAt !== null && readinessAt - runStarted <= 2000;
        } catch { wire = wire || 'invalid_readiness'; }
        try { state.nativeReport = parseReport(await privateRead(dir + '/report.json', 8192), testCase); }
        catch { wire = wire || 'invalid_report'; }
        const r = state.nativeReport;
        const casePassed = loss ? state.controlEofSent && r?.status === 'cancelled_cleanly' && r.hostControlLost && !r.fakeReplyValidated :
            r?.status === 'lifecycle_control_passed' && !r.hostControlLost && r.fakeReplyValidated;
        state.status = cancelled ? 'cancelled' : wire || (state.launcherExitConfirmed && !exitSignal && exitCode === 0 &&
            !dirtyStderr && state.readinessConfirmed && absent && state.appAbsentAfter && observed.length === 4 &&
            casePassed && r.cleanupConfirmed && r.separateSession && !r.actorLossObserved &&
            r.actorStarted && r.workerStarted && r.actorReaped && r.workerReaped && !state.emergencyCleanupAttempted ?
            loss ? 'control_loss_passed' : 'normal_control_passed' : 'lifecycle_inconclusive');
        // Require confirmed launcher exit as well as absence before removing executable.
        state.elapsedMs = Math.max(0, Math.floor(now() - started));
        if (state.launcherExitConfirmed && absent && r) {
            try { await bounded(Promise.resolve(saveReport({...state}))); } catch { throw Error('capture_not_saved'); }
            await removeStage();
        }
    } catch (error) {
        const categories = ['app_running', 'runtime_mismatch', 'unsafe_tmp', 'unsafe_stage', 'upload_failed',
            'upload_mismatch', 'cancelled', 'changed_identity', 'invalid_metadata', 'unsafe_file', 'unexpected_stage_file', 'capture_not_saved'];
        state.status = expired ? 'deadline' : cancelled ? 'cancelled' : categories.includes(error.message) ? error.message : phase === 'preflight' ? 'preflight_failed' : 'capture_failed';
        if (!expired && stageOwned && !state.executionRequested && binaryCreated) {
            try { await removeStage(); } catch { /* Retain stage path; no cleanup claim on failure. */ }
        }
    } finally {
        signal?.removeEventListener('abort', cancelledNow);
        for (const id of tasks) timers.clearTimeout(id);
        expired = true; abort.abort();
        for (const client of clients) client.destroy();
        wireOutput = [];
        state.elapsedMs = Math.max(0, Math.floor(now() - started));
    }
    return state;
}
const runNormal = (connect, bytes, options) => runCase('normal', connect, bytes, options);
const runControlLoss = (connect, bytes, options) => runCase('control_loss', connect, bytes, options);
module.exports = {PIN, RUNTIME, SHA_COMMAND, parseOwned, parseReport, runNormal, runControlLoss};
