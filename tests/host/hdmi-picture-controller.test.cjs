const assert = require('node:assert/strict');
const {EventEmitter} = require('node:events');
const {run} = require('../../scripts/hdmi-picture-controller.cjs');
const {fault} = require('../../scripts/hdmi-picture-io.cjs');
function fixture(options = {}) {
    let time = 0, submissions = 0, dates = 0, opens = 0, privateWrites = 0, checks = 0;
    const clients = [], controller = new AbortController(), events = [], snapshots = [];
    const boot = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee\n';
    const io = {
        logCursor: async () => ({state: 'available', metadata: {type: 'file', size: 0}}),
        read: async name => ({bytes: Buffer.from(name.endsWith('boot_id') ? boot : name.endsWith('uptime') ? '100.00 1.00\n' : 'synthetic'),
            metadata: {mode: options.modeMismatch ? 0o777 : 0o755}, sha256: 'expected'}),
        exec: async (command, limits) => {
            if (command === 'date +%s') { dates++; if (options.stale) time += 2000;
                return {code: 0, stdout: '1700000000\n', stderrBytes: 0}; }
            const text = command(); assert(text.includes('com.webos.applicationManager/launch'));
            limits.onDispatch(); submissions++;
            if (options.cancelAfter) controller.abort();
            if (options.uncertain) { clients[0].destroy(); throw Error('PRIVATE_SECRET'); }
            return {code: 0, signalPresent: false, stderrBytes: 0, stdout: '{"returnValue":true}'};
        },
        reports: async target => {
            target.push({state: options.partial ? 'partial' : 'valid', sha256: 'one'});
            if (options.hangCollection) await new Promise(() => {});
            target.push({state: options.unreadable ? 'unreadable' : 'valid', sha256: options.conflict ? 'two' : 'one'});
        },
        processState: async () => 'absent',
        logDelta: async () => ({state: 'unknown', reason: 'size_cap', actualExit: 'unknown'})
    };
    const dependencies = {
        now: () => time, sleep: async ms => { assert(clients[0].closed); time += ms; },
        signal: controller.signal, connectionCapMs: options.hangConnect || options.hangCollection ? 15 : 30000,
        connect: async () => {
            opens++; if (options.hangConnect) await new Promise(() => {});
            if (opens === 2) { assert(clients[0].closed); assert(time >= 27000); }
            const c = new EventEmitter(); c.closed = false; c.destroy = () => { c.closed = true; c.emit('close'); };
            clients.push(c); return c;
        },
        verify: async (client, check, r) => { checks++; r.readiness = !options.badGate; },
        open: async () => io, references: {pkg: {binarySha256: 'expected', manifestSha256: 'expected'}},
        ownerCue: () => { if (options.cancelBefore) controller.abort(); },
        emit: e => events.push(e), persist: r => snapshots.push(JSON.stringify(r)),
        savePrivate: () => { privateWrites++; }
    };
    return {go: () => run(dependencies), events, snapshots, clients,
        counts: () => ({submissions, dates, opens, privateWrites, checks})};
}
(async () => {
    await assert.rejects(run({connectionCapMs: 30001}));
    let f = fixture(), r = await f.go();
    assert.equal(r.status, 'collected'); assert.equal(r.attempts, 1);
    assert.equal(r.connections.length, 2); assert(r.connections.every(c => c.closed && c.elapsedMs <= 30000));
    assert(r.collectionStartedMs >= r.dispatchMs + 27000);
    assert.equal(r.actualExit, 'unknown'); assert.equal(r.hardwareRelease, 'unknown');
    assert.deepEqual(f.counts(), {submissions: 1, dates: 1, opens: 2, privateWrites: 1, checks: 1});
    for (const options of [{badGate: true}, {stale: true}, {cancelBefore: true}, {hangConnect: true}]) {
        f = fixture(options); r = await f.go();
        assert.equal(r.status, 'stopped_without_dispatch'); assert.equal(r.attempts, 0);
        assert.equal(f.counts().opens, 1); assert.equal(f.counts().submissions, 0);
    }
    for (const options of [{uncertain: true}, {cancelAfter: true}, {uncertain: true, cancelAfter: true}]) {
        f = fixture(options); r = await f.go();
        assert.equal(r.attempts, 1); assert.equal(r.status, 'collected');
        assert.equal(f.counts().opens, 2); assert.equal(f.counts().submissions, 1);
        assert(r.collectionStartedMs >= r.dispatchMs + 27000);
        assert(!JSON.stringify(r).includes('PRIVATE_SECRET'));
        if (options.uncertain) assert.equal(r.acknowledgment, 'unknown');
    }
    r = await fixture({conflict: true}).go(); assert.equal(r.aliasComparison, 'conflicting');
    r = await fixture({partial: true, modeMismatch: true}).go(); assert.equal(r.reports[0].state, 'partial');
    assert.equal(r.installedAfter.executable.metadata.mode, 0o777);
    r = await fixture({unreadable: true}).go(); assert.equal(r.reports[1].state, 'unreadable');
    f = fixture({hangCollection: true}); r = await f.go();
    assert.equal(r.status, 'incomplete'); assert.equal(r.reports.length, 1); assert.equal(r.attempts, 1);
    assert.equal(f.counts().opens, 2); assert(f.clients.every(c => c.closed));
    console.log('Physical controller: strict freshness, failed gates, single attempt, +27 s collection, separate caps, cancellation/uncertainty and partial evidence passed; zero TV access');
})().catch(e => { console.error(e); process.exitCode = 1; });
