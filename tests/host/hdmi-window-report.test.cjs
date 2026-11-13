const assert = require('node:assert/strict');
const {id, version, phases, filename, validateReport, phaseAccepted} = require('../../scripts/hdmi-window-report.cjs');
const bytes = r => Buffer.from(JSON.stringify(r) + '\n');
const policy = (mode, allowed) => ({schemaVersion: 1, appId: id, appVersion: version, mode,
    elapsedMs: 20, status: 'policy_checked', localCleanup: true, callerReady: true,
    calls: 4, actualUtpCalls: 0, policyAllowed: allowed});
const picture = {schemaVersion: 1, appId: id, appVersion: version, mode: 'picture', elapsedMs: 10000,
    status: 'candidate_interval_completed', port: 4, opened: true, selected: true,
    stopAcknowledged: true, closeAcknowledged: true, acquisitionUncertain: true, localCleanup: true,
    hardwareRelease: 'unknown', livePicture: 'unknown', restoration: 'unknown', dualHdmi: 'unknown'};
for (const mode of phases) {
    const expected = ['overlay', 'picture-ready'].includes(mode) ? 1 : 0;
    assert(phaseAccepted(validateReport(bytes(policy(mode, [expected, expected, expected, expected])), mode)));
    assert(!phaseAccepted(validateReport(bytes(policy(mode, [1 - expected, expected, expected, expected])), mode)));
    assert(filename(mode).startsWith('admission-' + mode));
}
const denied = validateReport(bytes(policy('baseline', [0, 0, 0, 0])), 'baseline');
assert.equal(denied.status, 'policy_checked'); // Target denial is a successful permission prediction.
assert.deepEqual(validateReport(bytes(picture), 'picture'), picture);
const invalid = (r, mode = r.mode) => assert.throws(() => validateReport(bytes(r), mode));
for (const patch of [{pipelineId: 'private'}, {rawError: 'private'}, {appId: 'other'},
    {appVersion: '0.1.0'}, {port: 1}, {hardwareRelease: 'verified'}, {livePicture: 'verified'},
    {acquisitionUncertain: false}, {stopAcknowledged: false}, {elapsedMs: 22000}, {localCleanup: 1}])
    invalid({...picture, ...patch});
invalid(picture, 'baseline');
assert.throws(() => validateReport(Buffer.alloc(2049), 'picture'));
assert.throws(() => validateReport(Buffer.from('{'), 'picture'));
assert.throws(() => filename('../picture'));
for (const patch of [{actualUtpCalls: 1}, {calls: 3}, {callerReady: false},
    {policyAllowed: [1, -1, 1, 1]}, {policyAllowed: [true, 1, 1, 1]}, {elapsedMs: 12000}])
    invalid({...policy('overlay', [1, 1, 1, 1]), ...patch});
const failed = {...policy('baseline', [0, -1, -1, -1]), status: 'query_failed', calls: 2};
assert(!phaseAccepted(validateReport(bytes(failed), 'baseline')));
invalid({...failed, policyAllowed: [0, 0, -1, -1]});
// A rejected open can still return an ID used for cleanup. Do not discard that evidence.
validateReport(bytes({...picture, status: 'open_failed', opened: false, selected: false}), 'picture');
validateReport(bytes({...picture, status: 'cleanup_failed', closeAcknowledged: false}), 'picture');
console.log('HDMI report privacy, phase gates and cleanup uncertainty checks passed');
