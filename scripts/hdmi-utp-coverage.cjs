// Pure coverage rules for the fixed C1 permission snapshots. No device or filesystem access.
const {isDeepStrictEqual} = require('node:util');
const {id} = require('./hdmi-window-report.cjs');
const service = 'com.webos.service.utp.extinputs';
const group = id + '.utp';
const methods = ['open', 'switchExternalInput', 'stop', 'close'];
const unique = values => [...new Set(values)].sort();
const object = value => value && typeof value === 'object' && !Array.isArray(value);
const requireFact = (value, message) => { if (!value) throw Error(message); };
function validateReply(reply) {
    requireFact(object(reply) && isDeepStrictEqual(Object.keys(reply).sort(), ['api', 'client', 'returnValue']) &&
        reply.returnValue === true && object(reply.api) && Array.isArray(reply.client), 'permission reply schema');
    requireFact(Buffer.byteLength(JSON.stringify(reply)) <= 65536, 'permission reply bound');
    const groups = values => Array.isArray(values) && values.length <= 256 &&
        values.every(value => typeof value === 'string' && /^[A-Za-z0-9_.-]{1,256}$/.test(value));
    requireFact(groups(reply.client) && Object.keys(reply.api).length <= 2048, 'permission group schema');
    for (const [pattern, values] of Object.entries(reply.api)) {
        // Saved helper supports an exact path or one final prefix wildcard.
        // Reject unreviewed syntax rather than silently missing possible grants.
        requireFact(pattern.length <= 512 && /^(?:\/[^\x00-\x20\x7f*]*\*?|\*)$/.test(pattern) &&
            groups(values) && values.length > 0, 'permission rule schema');
    }
    return reply;
}
const canonicalReply = reply => ({client: unique(reply.client),
    api: Object.entries(reply.api).sort(([a], [b]) => a.localeCompare(b)).map(([p, g]) => [p, unique(g)])});
const canonical = snapshot => ({app: canonicalReply(snapshot.app), utp: canonicalReply(snapshot.utp)});
function validateSnapshot(snapshot) {
    requireFact(object(snapshot), 'permission snapshot schema');
    validateReply(snapshot.app); validateReply(snapshot.utp);
    requireFact(snapshot.app.client.length > 0 && Object.keys(snapshot.utp.api).length > 0,
        'empty permission context');
    return snapshot;
}
const matches = (pattern, target) => pattern.endsWith('*') ?
    target.startsWith(pattern.slice(0, -1)) : pattern === target;
function coverage(snapshot) {
    validateSnapshot(snapshot);
    return methods.map(method => {
        const matching = Object.entries(snapshot.utp.api).filter(([p]) => matches(p, '/' + method));
        requireFact(matching.length > 0, 'missing target permission metadata');
        const provided = unique(matching.flatMap(([, values]) => values));
        const intersection = provided.filter(value => snapshot.app.client.includes(value));
        return intersection.length ? 1 : 0;
    });
}
const groupAnywhere = snapshot => [snapshot.app, snapshot.utp].some(reply =>
    reply.client.includes(group) || Object.values(reply.api).some(values => values.includes(group)));
const facts = (accepted, calculated, ownedGroupPresent) => ({coverageAccepted: accepted,
    calculatedCoverage: calculated, ownedGroupPresent, nativePredictionsUsed: false,
    activeCallerContext: 'unknown', actualUtpAdmission: 'unknown', hardwareRelease: 'unknown',
    deploymentAuthorized: false});
function evaluatePhase(phase, current, baseline) {
    requireFact(['baseline', 'overlay', 'removed'].includes(phase), 'unknown coverage phase');
    const calculated = coverage(current);
    const ownedGroupPresent = groupAnywhere(current);
    if (phase === 'baseline') return facts(!ownedGroupPresent && calculated.every(x => x === 0),
        calculated, ownedGroupPresent);
    requireFact(baseline && evaluatePhase('baseline', baseline).coverageAccepted,
        'accepted coverage baseline required');
    let expected = canonical(baseline);
    if (phase === 'overlay') {
        expected.app.client = unique(expected.app.client.concat(group));
        const rules = new Map(expected.utp.api);
        for (const method of methods) rules.set('/' + method, unique((rules.get('/' + method) || []).concat(group)));
        expected.utp.api = [...rules].sort(([a], [b]) => a.localeCompare(b));
    }
    const sameScope = isDeepStrictEqual(canonical(current), expected);
    const expectedCoverage = phase === 'overlay' ? 1 : 0;
    return facts(sameScope && ownedGroupPresent === (phase === 'overlay') &&
        calculated.every(x => x === expectedCoverage), calculated, ownedGroupPresent);
}
function evaluateTransaction(baseline, overlay, removed) {
    const phases = {baseline: evaluatePhase('baseline', baseline),
        overlay: evaluatePhase('overlay', overlay, baseline),
        removed: evaluatePhase('removed', removed, baseline)};
    return {coverageTransactionAccepted: Object.values(phases).every(p => p.coverageAccepted), phases,
        deploymentAuthorized: false, actualUtpAdmission: 'unknown', hardwareRelease: 'unknown'};
}
module.exports = {id, service, group, methods, validateReply, validateSnapshot, coverage,
    evaluatePhase, evaluateTransaction};
