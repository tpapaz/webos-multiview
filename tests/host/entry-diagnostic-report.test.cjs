const assert = require('node:assert/strict');
const {id, version, classify} = require('../../scripts/entry-diagnostic-report.cjs');
const main = {schemaVersion: 1, appId: id, diagnosticVersion: version, event: 'main_entered', reservation: 'reserved'};
const parser = {event: 'parser', outcome: 'picture_accepted'};
const guard = {event: 'guard', bootRead: 'available', bootMatch: 'match', boottime: 'within', realtime: 'within', allowed: true};
const exit = {event: 'exit_intent', code: 0};
const bytes = events => Buffer.from(events.map(e => JSON.stringify(e)).join('\n') + '\n');
for (const events of [[main], [main, parser], [main, parser, guard]]) assert.equal(classify(bytes(events)).state, 'partial');
let r = classify(bytes([main, parser, guard, exit]));
assert.equal(r.state, 'valid'); assert.equal(r.observedExit, 'unknown'); assert.equal(r.original014Cause, 'unknown');
for (const outcome of ['inert_or_invalid', 'non_picture_mode']) {
    assert.equal(classify(bytes([main, {event: 'parser', outcome}, {event: 'exit_intent', code: 64}])).state, 'valid');
}
for (const patch of [{realtime: 'expired'}, {boottime: 'future'}, {bootMatch: 'mismatch'},
    {bootRead: 'unavailable', bootMatch: 'unknown'}, {boottime: 'unavailable'}]) {
    const rejected = {...guard, ...patch, allowed: false};
    assert.equal(classify(bytes([main, parser, rejected, {event: 'exit_intent', code: 64}])).state, 'valid');
    assert.equal(classify(bytes([main, parser, rejected, exit])).state, 'invalid');
}
for (const events of [[main, parser, exit], [parser, main], [main, {...parser, privateId: 'SECRET'}],
    [{...main, appId: 'other'}], [main, parser, {...guard, allowed: false}],
    [main, parser, {...guard, bootRead: 'unavailable'}], [main, parser, guard, exit, exit]]) {
    const invalid = classify(bytes(events));
    assert.equal(invalid.state, 'invalid'); assert(!JSON.stringify(invalid).includes('SECRET'));
}
assert.equal(classify(Buffer.alloc(0)).state, 'empty');
assert.equal(classify(Buffer.alloc(2049)).state, 'invalid');
assert.equal(classify(Buffer.from('{')).state, 'invalid');
assert.equal(classify(Buffer.from('{}\n')).state, 'invalid');
const torn = classify(Buffer.concat([bytes([main, parser]), Buffer.from('{"event":')]));
assert.equal(torn.state, 'invalid'); assert.deepEqual(torn.events, [main, parser]);
console.log('Entry trace privacy, partial progress, guard consistency and exit-intent limits passed; no TV access');
