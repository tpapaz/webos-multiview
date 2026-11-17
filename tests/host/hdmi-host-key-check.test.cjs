// Acceptance: one bounded pre-auth observation, honest TOFU, no device/profile/key reads.
const assert = require('node:assert/strict'), {EventEmitter} = require('node:events');
const fs = require('node:fs'), Module = require('node:module'), crypto = require('node:crypto');
const {spawnSync} = require('node:child_process');
const {observeHostKey, bounds, keyIdentity, checkConnection} = require('../../scripts/hdmi-host-key-check.cjs');
let cases = 0, profileReads = 0, transportImports = 0;
const originalRead = fs.readFileSync, originalLoad = Module._load;
fs.readFileSync = function(file, ...args) {
    if (/novacom-devices|[\\/]\.ssh[\\/]/.test(String(file))) { profileReads++; throw Error('Real identity read forbidden'); }
    return originalRead.call(this, file, ...args);
};
class Clock {
    constructor() { this.time = 0; this.id = 0; this.timers = new Map(); }
    now = () => this.time;
    setTimeout = (fn, ms) => { const id = ++this.id; this.timers.set(id, {at: this.time + ms, fn}); return id; };
    clearTimeout = id => this.timers.delete(id);
    tick(ms) {
        const end = this.time + ms;
        for (;;) {
            const first = [...this.timers].filter(([, t]) => t.at <= end).sort((a, b) => a[1].at - b[1].at)[0];
            if (!first) break;
            this.timers.delete(first[0]); this.time = first[1].at; first[1].fn();
        }
        this.time = end;
    }
}
const text = Buffer.from('ssh-ed25519'), blob = Buffer.concat([Buffer.alloc(4), text, Buffer.alloc(36)]);
blob.writeUInt32BE(text.length); blob.writeUInt32BE(32, text.length + 4);
const expectedHash = crypto.createHash('sha256').update(blob).digest('hex');
function fixture({action, closes = true, storageFails = false} = {}) {
    const clock = new Clock(), client = new EventEmitter(); let callbacks, saved, starts = 0, destroys = 0, factories = 0, writes = 0;
    client.destroy = () => { destroys++; if (closes) client.emit('close'); };
    for (const name of ['exec', 'shell', 'sftp', 'forwardOut', 'subsys']) client[name] = () => { throw Error('Forbidden session'); };
    return {clock, client, get callbacks() { return callbacks; }, get saved() { return saved; },
        get starts() { return starts; }, get destroys() { return destroys; }, get factories() { return factories; }, get writes() { return writes; },
        run(signal, allowOneCheck = true) { return observeHostKey({allowOneCheck, signal, clock,
            sink: {complete(r) { writes++; if (storageFails) throw Error('Private failure'); saved = r; }},
            connectionFactory(c) { factories++; callbacks = c; return {client, start() { starts++; action?.(c, client, clock); }}; }}); }};
}
const reject = (c, client) => { assert.equal(c.hostVerifier(blob), false); client.emit('error', Object.assign(Error('Host denied (verification failed)'), {level: 'handshake'})); client.emit('close'); };
(async () => {
    let f = fixture({action: reject}), r = await f.run(); cases++;
    assert.equal(r.status, 'tofu_recorded'); assert.equal(r.trustMode, 'tofu'); assert.equal(r.independentlyVerified, false);
    assert.equal(r.possessionVerified, false); assert.equal(r.key.sha256, expectedHash); assert.equal(f.starts, 1);
    assert.equal(r.unexpectedAuthentication, false); assert.equal(f.writes, 1);
    const sealed = JSON.stringify(f.saved); assert.equal(f.callbacks.hostVerifier(blob), false);
    f.callbacks.authHandler(); f.client.emit('close'); assert.equal(JSON.stringify(f.saved), sealed); assert.equal(f.writes, 1); cases++;
    for (const bad of [Buffer.alloc(0), Buffer.alloc(bounds.maxKeyBytes + 1), Buffer.from('private-invalid'), 'text', null]) {
        f = fixture({action(c) { assert.equal(c.hostVerifier(bad), false); }}); r = await f.run();
        assert.equal(r.status, 'partial'); assert.equal(r.stopReason, 'invalid_key'); assert.equal(r.key, null); cases++;
    }
    assert.throws(() => keyIdentity(Buffer.concat([Buffer.from([0, 0, 0, 3]), Buffer.from('bad!')]))); cases++;
    f = fixture(); let job = f.run(); f.clock.tick(3000); r = await job;
    assert.equal(r.stopReason, 'handshake_timeout'); assert.equal(r.connectionClosed, true); assert.equal(f.starts, 1); cases++;
    f = fixture({closes: false}); job = f.run(); f.clock.tick(5000); r = await job;
    assert.equal(r.status, 'partial'); assert.equal(r.connectionClosed, false); assert.equal(r.elapsedMs, 5000); assert.equal(f.destroys, 1); cases++;
    f = fixture({action(c) { c.hostVerifier(blob); }, closes: false}); job = f.run(); f.clock.tick(2000); r = await job;
    assert.equal(r.stopReason, 'closure_timeout'); assert.equal(r.status, 'partial'); assert.equal(r.connectionClosed, false); cases++;
    f = fixture({action(c, client, clock) { clock.time = 3000; c.hostVerifier(blob); }}); r = await f.run();
    assert.equal(r.stopReason, 'handshake_timeout'); assert.equal(r.key, null); cases++;
    f = fixture({action(c, client, clock) { clock.time = 2999; c.hostVerifier(blob); clock.time = 4998; client.emit('close'); }}); r = await f.run();
    assert.equal(r.status, 'tofu_recorded'); assert.equal(r.keyObservedMs, 2999); cases++;
    f = fixture({action(c, client, clock) { c.hostVerifier(blob); clock.time = 2000; client.emit('close'); }}); r = await f.run();
    assert.equal(r.stopReason, 'closure_timeout'); assert.equal(r.status, 'partial'); cases++;
    f = fixture({action(c, client, clock) { clock.time = 2999; c.hostVerifier(blob); clock.time = 5000; client.emit('close'); }}); r = await f.run();
    assert.equal(r.stopReason, 'total_deadline'); assert.equal(r.status, 'partial'); cases++;
    f = fixture({action(c) { c.hostVerifier(blob); c.hostVerifier(blob); }}); r = await f.run(); assert.equal(r.stopReason, 'multiple_keys'); cases++;
    for (const action of [(c, client) => c.authHandler(), (c, client) => client.emit('ready')]) {
        f = fixture({action}); r = await f.run(); assert.equal(r.stopReason, 'unexpected_authentication'); assert.equal(r.status, 'partial'); cases++;
    }
    f = fixture({action(c, client) { client.emit('error', Error('PRIVATE_SERVER_TEXT')); }}); r = await f.run();
    assert.equal(r.stopReason, 'connection_failed'); assert(!JSON.stringify(r).includes('PRIVATE')); cases++;
    f = fixture({action(c, client) { c.hostVerifier(blob); client.emit('error', Error('PRIVATE_AFTER_KEY')); }}); r = await f.run();
    assert.equal(r.stopReason, 'connection_failed'); assert.equal(r.status, 'partial'); cases++;
    f = fixture({action(c, client) { client.emit('close'); }}); r = await f.run(); assert.equal(r.stopReason, 'no_key'); cases++;
    const abort = new AbortController(); abort.abort(); f = fixture(); r = await f.run(abort.signal);
    assert.equal(r.stopReason, 'cancelled'); assert.equal(f.factories, 0); cases++;
    const later = new AbortController(); f = fixture(); job = f.run(later.signal); later.abort(); r = await job;
    assert.equal(r.stopReason, 'cancelled'); assert.equal(f.destroys, 1); cases++;
    f = fixture({storageFails: true, action: reject}); r = await f.run(); assert.equal(r.stopReason, 'local_io'); assert.equal(r.status, 'partial'); cases++;
    f = fixture(); await assert.rejects(f.run(undefined, false)); assert.equal(f.factories, 0); cases++;
    // Adapter passes no credentials, agents, auth defaults or address overrides to ssh2.
    let options, profileLoads = 0;
    const profile = {name: 'fixture', username: 'root', host: '127.0.0.1', port: 12345, privateKey: {openSsh: 'DO_NOT_READ'}, passphrase: 'DO_NOT_PASS'};
    const connection = checkConnection({alias: 'fixture', hostVerifier: () => false, authHandler: () => false,
        loadProfiles: () => { profileLoads++; return [profile]; }, createClient: () => ({connect(o) { options = o; }})});
    connection.start(); assert.throws(() => connection.start());
    assert.equal(profileLoads, 1); assert.equal(options.username, 'host-key-check'); assert.equal(options.readyTimeout, 3000);
    for (const key of ['privateKey', 'password', 'passphrase', 'agent', 'hostHash', 'debug', 'sock']) assert.equal(Object.hasOwn(options, key), false);
    assert.equal(options.hostVerifier(blob), false); assert.equal(options.authHandler(), false); cases++;
    for (const fields of [{host: 'hostname.invalid'}, {port: 0}, {port: '22'}]) {
        assert.throws(() => checkConnection({alias: 'fixture', loadProfiles: () => [{...profile, ...fields}], createClient() { throw Error('Should not load client'); }})); cases++;
    }
    // Default plan and refusals must not load a real SSH implementation or profile.
    Module._load = function(name, ...args) { if (name === 'ssh2') { transportImports++; throw Error('Live import forbidden'); } return originalLoad.call(this, name, ...args); };
    const {main} = require('../../scripts/check-hdmi-host-key.cjs');
    const oldLog = console.log; let plan;
    try { console.log = value => { plan = JSON.parse(value); }; await main(['--plan']); } finally { console.log = oldLog; }
    assert.equal(plan.TVConnections, 0); assert.equal(plan.connectionAuthorized, false); cases++;
    await assert.rejects(main(['--allow-one-tofu-host-key-check']));
    await assert.rejects(main(['--allow-one-tofu-host-key-check', '--owner-target-confirmed', '--device', 'fixture', 'build/phase-2'])); cases++;
    assert.equal(profileReads, 0); assert.equal(transportImports, 0);
    Module._load = originalLoad;
    // Real installed ssh2 against a loopback-only ephemeral server: zero userauth/session events.
    const ssh = Module.createRequire(require.resolve('@webos-tools/cli/package.json'))('ssh2');
    const hostKey = ssh.utils.generateKeyPairSync('ed25519'), peers = new Set(); let authenticationEvents = 0, sessionEvents = 0;
    const server = new ssh.Server({hostKeys: [hostKey.private]}, peer => {
        peers.add(peer); peer.on('error', () => {}); peer.on('close', () => peers.delete(peer));
        peer.on('authentication', ctx => { authenticationEvents++; ctx.reject(); });
        peer.on('session', rejectSession => { sessionEvents++; rejectSession(); });
    });
    server.on('error', () => {});
    try {
        await new Promise((resolve, rejectListen) => { server.once('error', rejectListen); server.listen(0, '127.0.0.1', resolve); });
        const port = server.address().port; let complete;
        r = await observeHostKey({allowOneCheck: true, sink: {complete(x) { complete = x; }},
            connectionFactory: callbacks => checkConnection({alias: 'fixture', ...callbacks,
                loadProfiles: () => [{...profile, port}], createClient: () => new ssh.Client()})});
        assert.equal(r.status, 'tofu_recorded'); assert.equal(r.connectionClosed, true);
        assert.equal(authenticationEvents, 0); assert.equal(sessionEvents, 0); assert.equal(r.key.algorithm, 'ssh-ed25519');
        assert.equal(complete.independentlyVerified, false); cases++;
    } finally { for (const peer of peers) peer.destroy(); await new Promise(resolve => server.close(resolve)); }
    const cli = spawnSync(process.execPath, ['scripts/check-hdmi-host-key.cjs', '--plan'], {encoding: 'utf8'});
    assert.equal(cli.status, 0); assert.equal(JSON.parse(cli.stdout).TVConnections, 0); cases++;
    fs.readFileSync = originalRead;
    console.log(JSON.stringify({status: 'passed', acceptanceCases: cases, TVConnections: 0, profileReads, privateKeyReads: 0,
        forbiddenTransportImports: transportImports, loopbackAuthenticationEvents: authenticationEvents, loopbackSessionEvents: sessionEvents}));
})().catch(() => { fs.readFileSync = originalRead; Module._load = originalLoad; console.error('Host-key acceptance failed; no private details printed'); process.exitCode = 1; });
