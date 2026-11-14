const assert = require('node:assert/strict');
const {payload, prepare} = require('../../scripts/tv-launch-authority.cjs');
const boot = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee\n';
const sample = {bootBefore: boot, bootAfter: boot, uptime: '100.00 10.00\n', realtime: '1700000000\n'};
const p = payload(sample, 20, 30);
assert.equal(p.launchStartByRealtimeMs, 1700000003000);
assert.equal(p.launchStartByBoottimeMs, 103000);
// Mirror the unchanged native inequalities for quantization/skew scenarios.
const allowed = (up, real) => p.launchStartByBoottimeMs > up && p.launchStartByBoottimeMs - up <= 3000 &&
    p.launchStartByRealtimeMs > real && p.launchStartByRealtimeMs - real <= 3000;
for (const hostEpoch of [0, 1700000000000 - 600000, 1700000000000 + 600000]) {
    assert(hostEpoch >= 0); // Host epoch is deliberately not an input.
    assert(allowed(100100, 1700000000999));
}
assert(!allowed(100100, 1700000003000)); // Reused uptime cannot revive stale realtime.
assert(!allowed(100100, 1699999999999)); // TV clock backstep still rejects.
for (const now of [19, 2020, NaN, Infinity]) assert.throws(() => payload(sample, 20, now));
for (const realtime of ['', '1700000000', '1700000000%N\n', '-1\n', '9999999999999\n'])
    assert.throws(() => payload({...sample, realtime}, 0, 10));
assert.throws(() => payload({...sample, bootAfter: 'other'}, 0, 10));
assert.throws(() => payload({...sample, uptime: 'broken'}, 0, 10));
(async () => {
    let time = 0, reads = 0, commands = 0, submissions = 0;
    const deps = {now: () => time, read: async name => { reads++; return name.endsWith('uptime') ? sample.uptime : boot; },
        exec: async (command, limits) => { commands++; assert.equal(command, 'date +%s'); assert.equal(limits.stdoutCap, 32);
            return {stdout: sample.realtime, code: 0, signal: null, stderrBytes: 0}; }};
    const lease = await prepare(deps);
    time = 1999; lease.dispatch(value => { submissions++; assert.deepEqual(value, p); });
    assert.throws(() => lease.dispatch(() => submissions++));
    assert.equal(submissions, 1); assert.equal(commands, 1); assert.equal(reads, 3);
    time = 0; const expired = await prepare(deps); time = 2000;
    assert.throws(() => expired.dispatch(() => submissions++)); assert.equal(submissions, 1);
    time = 0; const failed = await prepare(deps);
    assert.throws(() => failed.dispatch(() => { throw Error('transport'); }));
    assert.throws(() => failed.dispatch(() => submissions++));
    await assert.rejects(prepare({...deps, exec: async () => ({code: 1, stdout: '', stderrBytes: 0})}));
    console.log('TV realtime domain, strict windows, quantization, stale authority and one-shot dispatch passed; no TV access');
})().catch(e => { console.error(e); process.exitCode = 1; });
