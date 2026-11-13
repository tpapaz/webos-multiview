const assert = require('node:assert/strict');
const {launchPayload} = require('../../scripts/hdmi-window-launch.cjs');
const boot = '00112233-4455-6677-8899-aabbccddeeff\n'; // Synthetic, not a TV identifier.
const payload = launchPayload(boot, '100.00 30.00\n', boot);
assert.deepEqual(payload, {acquireHdmi4: true, launchBootId: boot.trim(), launchStartByBoottimeMs: 103000});
assert.equal(launchPayload(boot, '0.01 0.00\n', boot).launchStartByBoottimeMs, 3010);
assert.equal(launchPayload(boot, '100.99 200.00\n', boot).launchStartByBoottimeMs, 103990);
assert.throws(() => launchPayload(boot, '100.00 30.00\n', 'ffeeddcc-bbaa-9988-7766-554433221100\n'));
for (const bad of ['', '100', '-1.00 0.00\n', '100.000 0.00\n', '100.00 0.00\nextra',
    'NaN 0.00\n', '9999999999999.00 0.00\n']) assert.throws(() => launchPayload(boot, bad, boot));
for (const bad of ['', boot.trim(), boot.toUpperCase(), boot + '\n'])
    assert.throws(() => launchPayload(bad, '100.00 30.00\n', bad));
console.log('HDMI boot-bound three-second launch payload checks passed');
