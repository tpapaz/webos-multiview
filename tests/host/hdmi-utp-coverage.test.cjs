const assert = require('node:assert/strict');
const {group, methods, coverage, evaluatePhase, evaluateTransaction} = require('../../scripts/hdmi-utp-coverage.cjs');
const {validateCaptureOrder} = require('../../scripts/check-hdmi-utp-coverage.cjs');
const copy = value => JSON.parse(JSON.stringify(value));
// Small sanitized fixture retaining the actual C1 caller groups and target rules.
const baseline = {
    app: {returnValue: true, client: ['public', 'luna.internal.public', 'signals.all.subscribe', 'signals.register'],
        api: {'/*': ['all'], '/com/palm/luna/private/ping': ['public', 'luna.internal.public']}},
    utp: {returnValue: true, client: ['tv', 'luna.internal.public'],
        api: {'/*': ['all'], '/open': ['private', 'private'], '/switchExternalInput': ['private', 'private'],
            '/stop': ['private', 'private'], '/close': ['private', 'private'], '/pause': ['private']}}
};
const original = copy(baseline);
const overlay = copy(baseline);
overlay.app.client.push(group);
for (const method of methods) overlay.utp.api['/' + method].push(group);
const removed = copy(baseline);
// Group order/duplication is provenance, not extra authorization.
removed.app.client.reverse();
removed.utp.api['/open'] = ['private'];
assert.deepEqual(coverage(baseline), [0, 0, 0, 0]);
assert(evaluatePhase('baseline', baseline).coverageAccepted);
assert.deepEqual(coverage(overlay), [1, 1, 1, 1]);
assert(evaluatePhase('overlay', overlay, baseline).coverageAccepted);
assert(evaluatePhase('removed', removed, baseline).coverageAccepted);
const transaction = evaluateTransaction(baseline, overlay, removed);
assert(transaction.coverageTransactionAccepted);
assert.equal(transaction.deploymentAuthorized, false);
assert.equal(transaction.actualUtpAdmission, 'unknown');
assert.equal(transaction.phases.baseline.nativePredictionsUsed, false);
assert.equal(transaction.phases.overlay.activeCallerContext, 'unknown');
assert.deepEqual(baseline, original); // Comparing phases must not alter retained data.

const wildcard = copy(baseline);
wildcard.utp.api['/op*'] = ['public'];
assert.deepEqual(coverage(wildcard), [1, 0, 0, 0]); // Union all matching rules, not just the exact private one.
assert(!evaluatePhase('baseline', wildcard).coverageAccepted);
const broad = copy(baseline);
broad.app.client.push('all');
assert.deepEqual(coverage(broad), [1, 1, 1, 1]);
assert(!evaluatePhase('baseline', broad).coverageAccepted);

// Reject an overlay that changes anything beyond the own membership and four exact targets.
for (const mutate of [
    s => {s.utp.api['/pause'].push(group);},
    s => {s.utp.api['/*'].push(group);},
    s => {s.app.client.push('private');},
    s => {s.utp.client.push(group);},
    s => {s.app.api['/*'].push(group);},
    s => {s.utp.api['/unrelated'] = ['private'];},
    s => {s.app.client = s.app.client.filter(x => x !== 'public');},
    s => {s.utp.api['/close'] = ['private'];},
    s => {s.utp.api['/pause'] = ['public'];}
]) {
    const changed = copy(overlay); mutate(changed);
    assert(!evaluatePhase('overlay', changed, baseline).coverageAccepted);
    assert(!evaluateTransaction(baseline, changed, removed).coverageTransactionAccepted);
}
const revokedMembershipOnly = copy(overlay);
revokedMembershipOnly.app.client = baseline.app.client.slice();
assert.deepEqual(coverage(revokedMembershipOnly), [0, 0, 0, 0]);
assert(!evaluatePhase('removed', revokedMembershipOnly, baseline).coverageAccepted);
assert(!evaluateTransaction(baseline, overlay, revokedMembershipOnly).coverageTransactionAccepted);
const leftoverMembership = copy(baseline); leftoverMembership.app.client.push(group);
assert(!evaluatePhase('baseline', leftoverMembership).coverageAccepted);
assert(!evaluatePhase('removed', leftoverMembership, baseline).coverageAccepted);
const unrelatedRestoration = copy(baseline); unrelatedRestoration.utp.api['/pause'].push('public');
assert(!evaluatePhase('removed', unrelatedRestoration, baseline).coverageAccepted);

// Permissive firmware empty-data branches must become unknown/rejected locally.
for (const mutate of [
    s => {s.app.client = [];},
    s => {s.utp.api = {};},
    s => {s.utp.api = {'/only-unrelated': ['private']};},
    s => {s.utp.api['/open'] = [];},
    s => {s.utp.api['/o*en'] = ['public'];},
    s => {s.utp.api['/**'] = ['public'];},
    s => {s.app.client = ['public '];},
    s => {s.utp.returnValue = false;},
    s => {s.app.extra = 'unreviewed';},
    s => {s.utp.api['/open'] = [true];}
]) {
    const changed = copy(baseline); mutate(changed);
    assert.throws(() => coverage(changed));
}
assert.throws(() => evaluatePhase('other', baseline));
assert.throws(() => evaluatePhase('overlay', overlay));
assert.throws(() => evaluatePhase('removed', removed, broad));
// A correctly shaped map from an earlier/later or concurrent capture cannot stand
// in for baseline -> activated -> removed evidence. Times are validated by the loader.
const captures = [[10, 20], [30, 40], [50, 60]].map(([started, finished]) =>
    ({captureWindow: {started, finished}}));
validateCaptureOrder(captures);
validateCaptureOrder([captures[0], captures[2]]); // Separate removed-phase check.
for (const sequence of [
    [captures[1], captures[0]],
    [captures[0], captures[2], captures[1]],
    [captures[0], captures[0]],
    [captures[0], {captureWindow: {started: 15, finished: 25}}],
    [captures[0], {captureWindow: {started: 20, finished: 30}}]
]) assert.throws(() => validateCaptureOrder(sequence), /strictly ordered/);
console.log('UTP coverage: empty-context rejection, exact scope/removal and ordered capture phases passed');
