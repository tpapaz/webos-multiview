// Offline file checker only. Never imports a device/profile module or writes evidence.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const {isDeepStrictEqual} = require('node:util');
const {id, service, evaluatePhase, evaluateTransaction} = require('./hdmi-utp-coverage.cjs');
const root = path.resolve(__dirname, '..');
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
function read(file, limit) {
    const stat = fs.lstatSync(file);
    if (!stat.isFile() || stat.size > limit) throw Error('local evidence file bound');
    const fd = fs.openSync(file, 'r');
    try {
        const opened = fs.fstatSync(fd);
        if (!opened.isFile() || opened.size !== stat.size || opened.mtimeMs !== stat.mtimeMs)
            throw Error('local evidence changed');
        const buffer = Buffer.alloc(stat.size + 1);
        let count = 0, size;
        while (count < buffer.length && (size = fs.readSync(fd, buffer, count, buffer.length - count, count))) count += size;
        const after = fs.fstatSync(fd);
        if (count !== stat.size || after.size !== stat.size || after.mtimeMs !== stat.mtimeMs)
            throw Error('local evidence changed');
        return buffer.subarray(0, count);
    } finally { fs.closeSync(fd); }
}
function loadSnapshot(directory) {
    const capture = JSON.parse(read(path.join(directory, 'capture.json'), 16384));
    const requireFact = (ok, message) => { if (!ok) throw Error(message); };
    requireFact(capture.schemaVersion === 1 && capture.status === 'complete' && capture.connectionClosed === true &&
        capture.uri === 'luna://com.webos.service.bus/queryServicePermissions' &&
        capture.caller === 'stock luna-send default own identity; no -m/-a' &&
        capture.appLaunches === 0 && capture.UTPCalls === 0 && capture.policyMutations === 0 &&
        capture.TVFileWritesOrDeletes === 0 && capture.hostCapMs === 15000 && capture.replyCapBytes === 65536 &&
        Array.isArray(capture.queries) && capture.queries.length === 2, 'capture scope');
    const started = Date.parse(capture.startedAt), finished = Date.parse(capture.finishedAt);
    requireFact(Number.isFinite(started) && Number.isFinite(finished) && finished >= started &&
        finished - started < capture.hostCapMs, 'capture time bound');
    const reference = JSON.parse(read(path.join(root,
        'build/phase-2/hdmi-admin-caller-20261112-001/admin-caller-findings.json'), 16384)).sourceFiles;
    requireFact(Array.isArray(capture.pins) && capture.pins.length === reference.length &&
        new Set(capture.pins.map(p => p.path)).size === reference.length, 'capture pin set');
    for (const pin of reference) {
        const observed = capture.pins.find(p => p.path === pin.tvPath);
        requireFact(observed && observed.bytes === pin.bytes && observed.sha256 === pin.sha256 &&
            observed.matchesSaved === true && hash(read(path.join(root, pin.saved), 1048576)) === pin.sha256,
        'capture pin binding');
    }
    const replies = [id, service].map((subject, index) => {
        const q = capture.queries[index];
        const bytes = read(path.join(directory, 'reply-' + index + '.json'), 65536);
        requireFact(q.service === subject && q.attempts === 1 && q.status === 'captured_valid' &&
            q.utilityExitCode === 0 && q.utilitySignal === null && q.stderrBytes === 0 &&
            q.replyBytes === bytes.length && q.replySha256 === hash(bytes), 'query reply binding');
        const submitted = Date.parse(q.submittedAt), received = Date.parse(q.receivedAt);
        requireFact(Number.isFinite(submitted) && Number.isFinite(received) && submitted >= started &&
            received >= submitted && received <= finished && (index === 0 ||
            submitted >= Date.parse(capture.queries[index - 1].receivedAt)), 'query time binding');
        return JSON.parse(bytes);
    });
    return {app: replies[0], utp: replies[1], captureWindow: {started, finished}, binding: capture.pins.map(p =>
        [p.path, p.bytes, p.sha256]).sort(([a], [b]) => a.localeCompare(b))};
}
function validateCaptureOrder(snapshots) {
    for (let index = 1; index < snapshots.length; index++) {
        if (!(snapshots[index].captureWindow.started > snapshots[index - 1].captureWindow.finished))
            throw Error('capture phases must be strictly ordered without overlap');
    }
}
function main(args) {
    const [phase, ...directories] = args;
    const count = {baseline: 1, overlay: 2, removed: 2, transaction: 3}[phase];
    if (!count || directories.length !== count) throw Error('usage');
    const snapshots = directories.map(loadSnapshot);
    for (const current of snapshots.slice(1)) {
        if (!isDeepStrictEqual(current.binding, snapshots[0].binding)) throw Error('changed capture binding');
    }
    validateCaptureOrder(snapshots);
    const result = phase === 'transaction' ? evaluateTransaction(...snapshots) :
        evaluatePhase(phase, snapshots[phase === 'baseline' ? 0 : 1], snapshots[0]);
    console.log(JSON.stringify({schemaVersion: 1, phase, ...result,
        scope: 'loaded-map coverage only; installed/generated-policy readback and deployment gates remain separate'}));
    if (!(result.coverageAccepted ?? result.coverageTransactionAccepted)) process.exitCode = 1;
}
if (require.main === module) {
    try { main(process.argv.slice(2)); }
    catch { console.error('UTP coverage evidence failed validation; no device access or evidence writes.'); process.exitCode = 1; }
}
module.exports = {loadSnapshot, validateCaptureOrder, main};
