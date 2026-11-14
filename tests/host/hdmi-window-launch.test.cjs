const assert = require('node:assert/strict');
const {launchPayload} = require('../../scripts/hdmi-window-launch.cjs');
const boot = '00112233-4455-6677-8899-aabbccddeeff\n'; // Synthetic, not a TV identifier.
const issued = 1700000000000;
const make = (before, up, after, start = issued, end = issued + 100) => launchPayload(before, up, after, start, end);
const payload = make(boot, '100.00 30.00\n', boot);
assert.deepEqual(payload, {acquireHdmi4: true, launchBootId: boot.trim(),
    launchStartByBoottimeMs: 103000, launchStartByRealtimeMs: issued + 3000});
assert.equal(make(boot, '0.01 0.00\n', boot).launchStartByBoottimeMs, 3010);
assert.equal(make(boot, '100.99 200.00\n', boot).launchStartByBoottimeMs, 103990);
assert.throws(() => make(boot, '100.00 30.00\n', 'ffeeddcc-bbaa-9988-7766-554433221100\n'));
for (const bad of ['', '100', '-1.00 0.00\n', '100.000 0.00\n', '100.00 0.00\nextra',
    'NaN 0.00\n', '9999999999999.00 0.00\n']) assert.throws(() => make(boot, bad, boot));
for (const bad of ['', boot.trim(), boot.toUpperCase(), boot + '\n'])
    assert.throws(() => make(bad, '100.00 30.00\n', bad));
for (const [start, end] of [[issued, issued + 3000], [issued, issued - 1],
    [undefined, undefined], [-1, 0], [NaN, issued], [Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER]])
    assert.throws(() => launchPayload(boot, '100.00 30.00\n', boot, start, end));
console.log('HDMI dual-clock three-second launch payload checks passed');
