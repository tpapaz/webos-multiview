// Portable simulated SSH/SFTP only. No network, subprocesses or device writes.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const crypto = require('node:crypto');
const {EventEmitter} = require('node:events');
const original = require('../../scripts/lifecycle-controller.cjs');
const fixtureBinary = Buffer.alloc(original.PIN.bytes, 1);
const source = fs.readFileSync(require.resolve('../../scripts/lifecycle-controller.cjs'), 'utf8');
const context = {module: {exports: {}}, Buffer, AbortController, Date, require(name) {
    if (name !== 'node:crypto') return require(name);
    return {randomBytes: n => Buffer.alloc(n, 3), createHash: algorithm => {
        let bytes;
        return {update(data) { bytes = Buffer.from(data); return this; }, digest(encoding) {
            return bytes.equals(fixtureBinary) ? original.PIN.sha256 : crypto.createHash(algorithm).update(bytes).digest(encoding);
        }};
    }};
}};
vm.runInNewContext(source, context);
const {runNormal, runControlLoss, RUNTIME, PIN, SHA_COMMAND} = context.module.exports;
let scenarios = 0;
const DIR = '/tmp/multiview-lifecycle-' + '03'.repeat(16), BIN = DIR + '/multiview-lifecycle';
const app = '/media/developer/apps/usr/palm/applications/io.github.tpapaz.multiview.admission/multiview-admission';
const native = () => ({schemaVersion: 1, mode: 'native_lifecycle_fake_workers', case: 'normal',
    status: 'lifecycle_control_passed', cleanupConfirmed: true, separateSession: true,
    hostControlLost: false, actorLossObserved: false, actorStarted: true, workerStarted: true,
    fakeReplyValidated: true, actorReaped: true, workerReaped: true, termRequests: 1, killRequests: 0,
    replyObservedMs: 250, workerExitObservedMs: 251, elapsedMs: 260, iwcCalls: 0, hardwareRestoration: 'not_tested'});
const rows = ['launcher', 'supervisor', 'actor', 'worker'].map((role, i) => ({role, pid: 1001 + i,
    start: String(8001 + i), session: i ? 1002 : 1001}));
function clock() {
    let at = 0, next = 0;
    const jobs = new Map();
    return {jobs, now: () => at, setTimeout(fn, ms) { jobs.set(++next, {fn, at: at + ms}); return next; },
        clearTimeout(id) { jobs.delete(id); }, tick(ms) {
            const until = at + ms;
            for (;;) {
                const task = [...jobs].filter(([, x]) => x.at <= until).sort((a, b) => a[1].at - b[1].at)[0];
                if (!task) break;
                jobs.delete(task[0]); at = task[1].at; task[1].fn();
            }
            at = until;
        }};
}
const flush = () => new Promise(resolve => setImmediate(resolve));
async function exercise(options = {}) {
    ++scenarios;
    const testCase = options.loss ? 'control_loss' : 'normal';
    const time = clock(), abort = new AbortController(), files = new Map(), calls = [], clients = [];
    let created = false, ran = false, saved = 0, inputEnded = false, done = false, result;
    let readyDelivered = false, nativeReport, endCalls = 0, completionTimer;
    const alive = new Set();
    const put = (name, data, mode = 0o600) => files.set(name, {data: Buffer.from(data), mode});
    const statText = row => {
        const fields = Array(30).fill('0'); fields[0] = 'S'; fields[19] = options.reusedPid ? '999999' : row.start;
        return Buffer.from(`${row.pid} (multiview-life) ${fields.join(' ')}\n`);
    };
    const get = name => {
        if (files.has(name)) return files.get(name).data;
        const m = name.match(/^\/proc\/(\d+)\/(stat|cmdline|exe)$/);
        if (m && alive.has(Number(m[1]))) {
            const row = rows.find(r => r.pid === Number(m[1]));
            if (m[2] === 'stat') return statText(row);
            if (m[2] === 'exe') return fixtureBinary;
            return Buffer.from([BIN, '--case', testCase, '--directory', DIR, ''].join('\0'));
        }
        return null;
    };
    const fail = Object.assign(Error('SECRET-RAW-ERROR'), {code: 2});
    const attr = (size, mode, type = 'file') => ({size, mode, uid: 0,
        isFile: () => type === 'file', isDirectory: () => type === 'dir'});
    const sftp = {
        lstat(name, cb) {
            if (name === '/tmp') return cb(null, attr(0, 0o1777, options.tmpSymlink ? 'link' : 'dir'));
            if (name === DIR && created) return cb(null, attr(0, 0o700, 'dir'));
            const file = files.get(name);
            if (!file) return cb(fail);
            cb(null, attr(file.data.length, file.mode, options.symlinkReport && name.endsWith('/report.json') ? 'link' : 'file'));
        },
        stat(name, cb) { const pin = RUNTIME.find(p => p.path === name); assert(pin); cb(null, attr(pin.bytes, 0o755)); },
        readdir(name, cb) {
            if (name === '/proc') return cb(null, [...alive].map(pid => ({filename: String(pid)})).concat(
                options.appRunning || (ran && options.appAfter) ? [{filename: '2000'}] : []));
            assert.equal(name, DIR);
            cb(null, [...files.keys()].filter(p => p.startsWith(DIR + '/')).map(p => ({filename: p.slice(DIR.length + 1)})));
        },
        readlink(name, cb) {
            if (name === '/proc/2000/exe') return cb(null, app);
            const m = name.match(/^\/proc\/(\d+)\/exe$/);
            if (!m || !alive.has(Number(m[1]))) return cb(fail);
            cb(null, options.foreignExe ? '/unrelated/executable' : BIN);
        },
        mkdir(name, attrs, cb) { calls.push('mkdir'); assert.equal(name, DIR); assert.equal(attrs.mode, 0o700);
            if (options.collision) return cb(Object.assign(Error('SECRET'), {code: 4})); created = true; cb(); },
        open(name, flags, attrs, cb) {
            if (typeof attrs === 'function') { cb = attrs; attrs = null; }
            if (flags === 'wx') {
                assert.equal(name, BIN); assert.equal(attrs.mode, 0o700); assert(!files.has(name));
                put(name, Buffer.alloc(0), 0o700); cb(null, name);
            } else { assert.equal(flags, 'r'); cb(get(name) === null ? fail : null, name); }
        },
        read(handle, buffer, offset, length, position, cb) {
            if (options.hangRead || (options.verificationLost && ran)) return;
            const data = get(handle);
            if (data === null) return cb(fail);
            const n = Math.max(0, Math.min(length, data.length - position));
            data.copy(buffer, offset, position, position + n); cb(null, n);
        },
        write(handle, buffer, offset, length, position, cb) {
            assert.equal(handle, BIN); assert.equal(position, 0);
            calls.push('upload'); put(BIN, options.badUpload ? Buffer.alloc(PIN.bytes, 7) : buffer.subarray(offset, offset + length), 0o700); cb();
        },
        close(handle, cb) { cb(); },
        unlink(name, cb) { assert(saved > 0 || !ran, 'Remote deletion preceded durable local capture');
            calls.push('unlink:' + name.slice(DIR.length + 1)); assert(files.has(name)); files.delete(name); cb(); },
        rmdir(name, cb) { assert.equal(name, DIR); assert.equal(files.size, 0); created = false; calls.push('rmdir'); cb(); }
    };
    function stream() {
        const s = new EventEmitter(); s.stderr = new EventEmitter();
        s.destroy = () => {}; s.end = () => {}; return s;
    }
    const helper = stream();
    const endHelper = () => {
        time.clearTimeout(completionTimer);
        if (!options.noExit) helper.emit('exit', options.nonzeroExit ? 1 : 0);
        if (!options.noClose) helper.emit('close');
    };
    helper.end = () => {
        ++endCalls; inputEnded = true; calls.push('control-eof');
        assert(options.loss && readyDelivered, 'EOF preceded selected case/readiness');
        assert(JSON.parse(files.get(DIR + '/owned.jsonl').data.toString().trim().split('\n').at(-1)).role === 'worker');
        assert(!clients[1].destroyed, 'Verification connection lost before EOF');
        if (options.ignoreEof || options.stuck) return;
        nativeReport.hostControlLost = !options.lossNotObserved;
        nativeReport.status = options.lossNotObserved ? 'control_loss_not_observed' : 'cancelled_cleanly';
        nativeReport.fakeReplyValidated = false;
        if (options.unclean) nativeReport.cleanupConfirmed = false;
        put(DIR + '/report.json', JSON.stringify(nativeReport));
        alive.clear(); endHelper();
    };
    helper.signal = (name, cb) => {
        calls.push('channel-signal:' + name);
        if (!options.stuck) alive.clear();
        endHelper(); cb?.();
    };
    async function connect(signal) {
        const index = clients.length, client = new EventEmitter();
        clients.push(client); client.destroy = () => { client.destroyed = true; };
        client.sftp = cb => cb(null, sftp);
        client.exec = (command, attrs, cb) => {
            calls.push(command); assert.equal(attrs.pty, false);
            if (index === 0) {
                assert.equal(command, `exec '${BIN}' --case ${testCase} --directory '${DIR}'`);
                assert(!ran, 'More than one helper execution'); ran = true;
                put(DIR + '/owned.jsonl', rows.map(r => JSON.stringify(r)).join('\n') + '\n');
                if (options.missingWorker) put(DIR + '/owned.jsonl', rows.slice(0, 3).map(r => JSON.stringify(r)).join('\n') + '\n');
                if (options.badSession) put(DIR + '/owned.jsonl', rows.map(r => JSON.stringify({...r, session: 1})).join('\n') + '\n');
                if (options.invalidMetadata) put(DIR + '/owned.jsonl', rows.map(() => JSON.stringify(rows[0])).join('\n'));
                let report = native();
                if (options.loss) {
                    report.case = options.wrongCase ? 'normal' : 'control_loss';
                    report.status = 'control_loss_not_observed';
                }
                if (options.failedNative) report.status = 'cancelled_cleanly';
                if (options.extraReportField) report.secret = 'SECRET';
                nativeReport = report;
                put(DIR + '/report.json', options.invalidReport ? '{' : JSON.stringify(report));
                if (options.extraFile) put(DIR + '/unrelated', 'preserve');
                cb(null, helper);
                const emitHelper = () => {
                    readyDelivered = !options.invalidReady;
                    helper.emit('data', Buffer.from(options.invalidReady ? 'SECRET' : '{"ready":true}\n'));
                    if (options.stderr) helper.stderr.emit('data', Buffer.from('SECRET'));
                    if (options.loss) {
                        rows.forEach(r => alive.add(r.pid));
                        if (!options.stuck) completionTimer = time.setTimeout(() => { alive.clear(); endHelper(); }, 250);
                    } else if (options.stuck) rows.forEach(r => alive.add(r.pid));
                    else if (!options.noClose) endHelper();
                    if (options.cancel) abort.abort();
                    if (options.controlLost) { helper.emit('error', Error('SECRET')); helper.emit('close'); }
                };
                if (options.lateReadiness) time.setTimeout(emitHelper, 2500);
                else setImmediate(emitHelper);
            } else {
                const s = stream(); cb(null, s);
                setImmediate(() => {
                    let data;
                    if (command === SHA_COMMAND) data = RUNTIME.map((p, i) =>
                        `${options.badRuntime && i === 0 ? '0'.repeat(64) : p.sha256}  ${p.path}`).join('\n');
                    else {
                        assert(command.startsWith('if test '), 'Unexpected remote command');
                        assert(command.includes(PIN.sha256) && command.includes(BIN) && command.includes('cmdline'));
                        assert(command.includes('--case ' + testCase));
                        assert(!command.includes('killall') && !command.includes('pkill'));
                        const p = command.match(/kill -(TERM|KILL) (\d+) /); assert(p);
                        const row = rows.find(r => r.pid === Number(p[2])); assert(row);
                        assert(command.includes(row.start));
                        if (!options.guardRefused) alive.delete(row.pid);
                        data = options.guardRefused ? 'identity_refused' : 'signalled';
                    }
                    s.emit('data', Buffer.from(data + '\n')); s.emit('exit', 0); s.emit('close');
                });
            }
        };
        if (options.connectionHangs) return new Promise((resolve, reject) => {
            signal.addEventListener('abort', () => { client.destroy(); reject(Error('SECRET')); }, {once: true});
        });
        return client;
    }
    if (options.cancelBefore) abort.abort();
    const pending = (options.loss ? runControlLoss : runNormal)(connect, options.badLocal ? Buffer.alloc(1) : fixtureBinary, {
        signal: abort.signal, timers: time, now: time.now,
        saveReport: async r => { assert(r.nativeReport); if (options.saveFails) throw Error('SECRET');
            if (options.saveHangs) return new Promise(() => {}); ++saved; }
    }).then(r => { result = r; done = true; });
    for (let i = 0; i < 700 && !done; ++i) { await flush(); time.tick(50); }
    assert(done, 'Controller did not settle within its fake-clock budget'); await pending;
    if (!options.loss) assert.equal(inputEnded, false, 'Normal-control stdin was ended');
    else { assert.equal(result.controlEofSent, inputEnded); assert(endCalls <= 1, 'EOF sent more than once'); }
    time.clearTimeout(completionTimer); // Simulated remote lifetime is not a host controller timer.
    assert.equal(time.jobs.size, 0, 'Controller leaked timers: ' + JSON.stringify(options));
    assert(!JSON.stringify(result).includes('SECRET')); assert(!JSON.stringify(result).includes('"pid"'));
    assert(clients.every(c => c.destroyed));
    return {result, calls, saved, ran, files};
}
(async () => {
    const success = await exercise();
    assert.equal(success.result.status, 'normal_control_passed');
    assert.equal(success.result.stageRemoved, true); assert.equal(success.result.helperProcessesAbsent, true);
    assert.equal(success.saved, 1); assert.equal(success.calls.filter(c => c.startsWith('exec ')).length, 1);
    for (const o of [{badLocal: true}, {badRuntime: true}, {appRunning: true}, {tmpSymlink: true}, {collision: true}, {badUpload: true}, {cancelBefore: true}]) {
        const x = await exercise(o); assert(!x.ran); assert.notEqual(x.result.status, 'normal_control_passed');
    }
    for (const o of [{invalidReady: true}, {invalidReport: true}, {extraReportField: true}, {symlinkReport: true},
        {nonzeroExit: true}, {failedNative: true}, {stderr: true}, {noExit: true}, {noClose: true},
        {invalidMetadata: true}, {saveFails: true}, {extraFile: true}, {appAfter: true}, {cancel: true},
        {controlLost: true, noExit: true}, {lateReadiness: true}]) {
        const x = await exercise(o); assert(x.ran); assert.notEqual(x.result.status, 'normal_control_passed');
        if (o.saveFails || o.invalidReport || o.symlinkReport || o.extraReportField || o.extraFile || o.noExit || o.noClose || o.invalidMetadata) {
            assert.equal(x.result.stageRemoved, false, JSON.stringify(o));
        }
    }
    const rescued = await exercise({stuck: true});
    assert(rescued.result.emergencyCleanupAttempted); assert.equal(rescued.result.status, 'lifecycle_inconclusive');
    assert(rescued.calls.some(c => c.includes('kill -TERM')));
    for (const o of [{stuck: true, reusedPid: true}, {stuck: true, foreignExe: true}, {stuck: true, guardRefused: true}]) {
        const x = await exercise(o); assert(!x.result.stageRemoved); assert(!x.result.helperProcessesAbsent);
        if (!o.guardRefused) assert(!x.calls.some(c => c.includes('kill -')));
    }
    for (const o of [{connectionHangs: true}, {hangRead: true}, {saveHangs: true}, {verificationLost: true}]) {
        const x = await exercise(o); assert.equal(x.result.status, 'deadline'); assert.equal(x.ran, !!(o.saveHangs || o.verificationLost));
        assert(!x.result.stageRemoved);
    }
    assert.throws(() => original.parseOwned(Buffer.from('{"pid":1,"role":"actor","start":"1;kill","session":1}')));
    assert.throws(() => original.parseReport(Buffer.from(JSON.stringify({...native(), uri: 'SECRET'}))));
    const loss = await exercise({loss: true});
    assert.equal(loss.result.status, 'control_loss_passed');
    assert(loss.result.controlEofSent && loss.result.nativeReport.hostControlLost);
    assert(loss.result.stageRemoved && !loss.result.emergencyCleanupAttempted);
    assert(loss.calls.indexOf('control-eof') < loss.calls.findIndex(c => c.startsWith('unlink:')));
    for (const option of ['ignoreEof', 'lossNotObserved', 'missingWorker', 'badSession', 'invalidReady',
        'lateReadiness', 'wrongCase', 'unclean', 'noExit', 'noClose', 'verificationLost', 'cancel', 'saveFails', 'stuck']) {
        const x = await exercise({loss: true, [option]: true});
        assert.notEqual(x.result.status, 'control_loss_passed', option);
        if (['missingWorker', 'badSession', 'invalidReady', 'lateReadiness', 'verificationLost', 'cancel'].includes(option)) {
            assert(!x.result.controlEofSent, option);
        }
        if (['wrongCase', 'noExit', 'noClose', 'verificationLost', 'saveFails', 'badSession'].includes(option)) assert(!x.result.stageRemoved, option);
    }
    assert.throws(() => original.parseReport(Buffer.from(JSON.stringify(native())), 'control_loss'));
    assert.throws(() => original.parseReport(Buffer.from(JSON.stringify(native())), 'actor_loss'));
    console.log(`Native controller acceptance passed: ${scenarios} simulated scenarios; fixed cases, gated EOF, runtime/artifact pins, durable redacted capture, identity checks and deadlines`);
})().catch(e => { console.error(e); process.exitCode = 1; });
