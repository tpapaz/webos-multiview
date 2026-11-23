const assert = require('node:assert/strict');
const {id, payload, commandFor, launchBinding, digest} = require('./physical-candidate-contract.cjs');
const {hash} = require('./hdmi-picture-io.cjs');
const {classifyTermination} = require('./hdmi-termination-evidence.cjs');

const version = '0.1.13';
const executable = 'multiview-hdmi-clip';
const lifecycle = 'lifecycle_validation';
const picture = 'physical_picture';
const isLifecycle = mode => mode === lifecycle;

function names(mode) {
    assert([lifecycle, picture].includes(mode));
    const stem = isLifecycle(mode) ? 'lifecycle' : 'clip';
    return {report: stem + '-' + version + '.json', witness: 'termination-' + stem + '-' + version + '.json'};
}

function request(authority, mode, gate) {
    const normalized = payload(authority, mode, gate);
    const command = commandFor(normalized);
    const wire = {...normalized};
    if (mode === picture) {
        delete wire.acquireHdmi4;
        wire.acquireHdmi4WithClip = true;
    }
    return {wire, binding: launchBinding(normalized),
        command: mode === picture ? command.replace('"acquireHdmi4":true', '"acquireHdmi4WithClip":true') : command};
}

const flags = ['opened', 'selected', 'stopAcknowledged', 'closeAcknowledged', 'acquisitionUncertain',
    'localCleanup', 'clipFrame', 'clipAdvanced', 'clipCloseCompleted', 'workerReady',
    'workerReaped', 'continuityWindow'];
function report(bytes, mode, binding) {
    try {
        if (!bytes.length) return {state: 'empty'};
        if (bytes.at(-1) !== 10) return {state: 'partial'};
        const value = JSON.parse(bytes);
        assert.deepEqual(Object.keys(value).sort(), ['schemaVersion', 'appVersion', 'mode',
            'launchBindingSha256', 'status', 'exitIntent', 'picture', 'hardwareRelease',
            'restoration', ...flags].sort());
        assert.equal(value.schemaVersion, 1);
        assert.equal(value.appVersion, version);
        assert.equal(value.mode, isLifecycle(mode) ? 'lifecycle' : 'hdmi4_clip');
        assert(digest(binding));
        assert.equal(value.launchBindingSha256, binding);
        assert(flags.every(flag => typeof value[flag] === 'boolean'));
        assert(['setup_failed', 'open_failed', 'select_failed', 'cancelled',
            'candidate_interval_completed', 'cleanup_failed'].includes(value.status));
        assert([0, 1, 75].includes(value.exitIntent));
        assert(['picture', 'hardwareRelease', 'restoration'].every(key => value[key] === 'unknown'));
        const hdmiProgress = ['opened', 'selected', 'stopAcknowledged', 'closeAcknowledged', 'acquisitionUncertain'];
        const clipProgress = ['clipFrame', 'clipAdvanced', 'clipCloseCompleted', 'continuityWindow'];
        if (isLifecycle(mode)) assert([...hdmiProgress, ...clipProgress].every(key => !value[key]));
        if (value.exitIntent === 0) {
            assert.equal(value.status, 'candidate_interval_completed');
            assert(value.localCleanup && value.workerReady && value.workerReaped);
            if (!isLifecycle(mode)) assert([...hdmiProgress, ...clipProgress].every(key => value[key]));
        }
        return {state: 'valid', report: value};
    } catch {
        return {state: 'invalid'};
    }
}

function witness(bytes, mode, binding, correlation) {
    if (!bytes.length) return {state: 'empty'};
    if (bytes.length > 256 || !digest(binding)) return {state: 'invalid'};
    const text = bytes.toString('utf8');
    const prefix = JSON.stringify([1, version, isLifecycle(mode) ? 0 : 1, binding]) + '\n';
    if (!text.startsWith(prefix)) return {state: 'invalid'};
    return classifyTermination(Buffer.from(text.slice(prefix.length)), correlation);
}

function restoreReceipt(captureBytes) {
    return {appVersion: version, captureSha256: hash(captureBytes),
        picture: true, sound: true, remote: true};
}

function gate(captureBytes, launchBytes, ownerBytes, references) {
    const capture = JSON.parse(captureBytes);
    const authority = JSON.parse(launchBytes);
    assert.deepEqual(JSON.parse(ownerBytes), restoreReceipt(captureBytes));
    assert.equal(capture.appId, id);
    assert.equal(capture.appVersion, version);
    assert.equal(capture.packageSha256, references.pkg.packageSha256);
    assert.equal(capture.packageRecordSha256, references.packageRecordSha256);
    assert.equal(capture.mode, lifecycle);
    assert.equal(capture.status, 'collected');
    assert.equal(capture.attempts, 1);
    assert.equal(capture.acknowledgment, 'accepted');
    assert.equal(capture.processAfter, 'absent');
    assert.equal(capture.processTermination, 'independently_observed');
    assert.equal(capture.preflight.readiness, true);
    assert.deepEqual(capture.preflight.queries, []);
    assert.deepEqual(capture.connections.map(connection => connection.name), ['submission', 'collection']);
    assert(capture.connections.every(connection => connection.closed && connection.elapsedMs >= 0 && connection.elapsedMs < 30000));
    assert(capture.connections[0].startedMs + capture.connections[0].elapsedMs < capture.connections[1].startedMs);
    assert(capture.collectionStartedMs >= capture.dispatchMs + 27000);
    const binding = launchBinding(authority);
    assert.equal(authority.verifyLifecycle, true);
    assert.equal(capture.aliasComparison, 'identical_bytes');
    assert.equal(capture.reports.length, 2);
    assert.equal(capture.terminationReports.length, 2);
    assert.equal(capture.terminationReports[0].sha256, capture.terminationReports[1].sha256);
    assert(digest(capture.terminationReports[0].sha256));
    assert.equal(capture.reports[0].sha256, capture.reports[1].sha256);
    assert(digest(capture.reports[0].sha256));
    for (const trace of capture.reports) {
        assert.equal(trace.state, 'valid');
        assert.equal(trace.report.launchBindingSha256, binding);
        assert.equal(trace.report.exitIntent, 0);
    }
    for (const [key, expected] of [['executable', references.pkg.binarySha256], ['appinfo', references.pkg.manifestSha256]]) {
        assert.equal(capture.preflight.bindings[key].sha256, expected);
        assert.equal(capture.installedAfter[key].sha256, expected);
        assert.equal(capture.installedAfter[key].hashMatches, true);
    }
    assert(capture.terminationReports.every(entry => entry.state === 'observed_terminated'));
    return {bootId: authority.launchBootId,
        digest: hash(Buffer.from(JSON.stringify([hash(captureBytes), hash(launchBytes), hash(ownerBytes)])))};
}

module.exports = {id, version, executable, lifecycle, picture, names, request, report, witness, restoreReceipt, gate};
