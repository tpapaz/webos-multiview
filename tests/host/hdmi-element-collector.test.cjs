// Acceptance tests for the owner's fixed read scope/bounds; no real device imports.
const assert = require('node:assert/strict');
const {EventEmitter} = require('node:events');
const crypto = require('node:crypto');
const fs = require('node:fs'), path = require('node:path');
const {spawnSync} = require('node:child_process');
const Module = require('node:module');
const originalLoad = Module._load, originalRead = fs.readFileSync;
let forbiddenImports = 0, profileReads = 0, cases = 0, stage = 'initial';
const watchdog = setTimeout(() => { throw Error('Acceptance did not complete: ' + stage); }, 10000);
Module._load = function(name, ...args) {
    if (/ssh2|phase1-device|hdmi-element-connection/.test(name)) { forbiddenImports++; throw Error('Live transport import forbidden'); }
    return originalLoad.call(this, name, ...args);
};
fs.readFileSync = function(file, ...args) {
    if (String(file).includes('novacom-devices') || /[\\/]\.ssh[\\/]/.test(String(file))) { profileReads++; throw Error('Credential read forbidden'); }
    return originalRead.call(this, file, ...args);
};
const {collect, seeds, parents, linkTarget, contract} = require('../../scripts/hdmi-element-collector.cjs');
class Clock {
    constructor() { this.time = 0; this.next = 0; this.timers = new Map(); }
    now = () => this.time;
    setTimeout = (fn, ms) => { const id = ++this.next; this.timers.set(id, {at: this.time + ms, fn}); return id; };
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
const error = code => Object.assign(Error('PRIVATE_VENDOR_IDENTIFIER'), {code});
const meta = (type, size = 0) => ({mode: ({file: 0o100000, directory: 0o040000, link: 0o120000, other: 0o020000}[type]) | 0o444,
    uid: 1, gid: 1, size, mtime: 10});
function fixture({clock = new Clock(), hooks = {}, sizes = [12, 19, 23], closeConnection = true, closeSubsystem = true} = {}) {
    const files = new Map(parents.map(p => [p, {attrs: meta('directory')}]));
    seeds.forEach((s, i) => files.set(s.path, {attrs: meta('file', sizes[i]), size: sizes[i]}));
    const log = [], sftp = new EventEmitter(), client = new EventEmitter(), written = new Map(), counts = {};
    let starts = 0, destroyed = 0, completed, connectionVerified = true;
    function dispatch(method, args, cb, body) {
        counts[method] = (counts[method] || 0) + 1;
        const entry = {method, args, at: clock.now(), index: counts[method]}; log.push(entry);
        if (hooks[method]?.({entry, files, cb, clock, client, sftp}) === true) return;
        body();
    }
    sftp.lstat = (name, cb) => dispatch('lstat', [name], cb, () => files.has(name) ? cb(null, {...files.get(name).attrs}) : cb(error(2)));
    sftp.readlink = (name, cb) => dispatch('readlink', [name], cb, () => cb(null, files.get(name).link));
    sftp.open = (name, flags, cb) => dispatch('open', [name, flags], cb, () => { assert.equal(flags, 'r'); cb(null, {path: name}); });
    sftp.fstat = (h, cb) => dispatch('fstat', [h.path], cb, () => cb(null, {...files.get(h.path).attrs}));
    sftp.read = (h, b, offset, length, position, cb) => dispatch('read', [h.path, length, position], cb, () => {
        assert(length <= 65536 && length >= 1);
        const n = Math.max(0, Math.min(length, files.get(h.path).size - position)); b.fill(65, offset, offset + n); cb(null, n);
    });
    sftp.close = (h, cb) => dispatch('close', [h.path], cb, () => cb(null));
    for (const method of ['exec', 'readdir', 'stat', 'realpath', 'write', 'unlink', 'chmod', 'rename']) sftp[method] = () => { throw Error('Forbidden operation ' + method); };
    sftp.end = () => { log.push({method: 'sftp.end', at: clock.now()}); if (closeSubsystem) sftp.emit('close'); };
    client.sftp = cb => dispatch('sftp', [], cb, () => cb(null, sftp));
    client.end = () => { log.push({method: 'client.end', at: clock.now()}); if (closeConnection) client.emit('close'); };
    client.destroy = () => { destroyed++; log.push({method: 'client.destroy', at: clock.now()}); if (closeConnection) client.emit('close'); };
    const sink = {
        begin(name) {
            assert(!written.has(name));
            const row = {bytes: 0, digest: crypto.createHash('sha256')}; written.set(name, row);
            return {write(b) { row.bytes += b.length; row.digest.update(b); },
                finish() { return {bytes: row.bytes, sha256: row.digest.digest('hex'), localFile: name}; }};
        },
        complete(report) { assert.equal(completed, undefined); completed = report; }
    };
    const run = signal => collect({allowOneRead: true, clock, signal, sink, connectionFactory: () => ({client,
        hostKeyVerified: () => connectionVerified, start() { starts++; assert.equal(starts, 1); dispatch('connect', [], () => {}, () => client.emit('ready')); }})});
    return {run, files, log, clock, client, sftp, written, sink, counts, get completed() { return completed; },
        get starts() { return starts; }, get destroyed() { return destroyed; }, unverify() { connectionVerified = false; }};
}
const drain = async () => { for (let i = 0; i < 1000; i++) await Promise.resolve(); };
async function outcome(f, reason) {
    const r = await f.run(); cases++;
    assert.equal(r.status, 'partial'); assert.equal(r.stopReason, reason); assert.equal(f.starts, 1);
    assert(!JSON.stringify(r).includes('PRIVATE_VENDOR_IDENTIFIER'));
    return r;
}
(async () => {
    let f = fixture(), r = await f.run(); cases++;
    assert.equal(r.status, 'retrieved'); assert.equal(r.opens, 3); assert.equal(r.savedBytes, 54);
    assert.equal(r.connectionAttempts, 1); assert.equal(r.sftpAttempts, 1);
    assert(r.connectionClosed && r.subsystemClosed && r.handlesClosed); assert.equal(f.clock.timers.size, 0);
    assert(f.log.filter(x => x.method === 'lstat').every(x => [...parents, ...seeds.map(s => s.path)].includes(x.args[0])));
    // Inclusive per-file and aggregate caps: streams the full 64 MiB + 64 KiB without keeping it in RAM.
    f = fixture({sizes: seeds.map(s => s.cap)}); r = await f.run(); cases++;
    assert.equal(r.status, 'retrieved'); assert.equal(r.savedBytes, contract.totalBytes); assert.equal(r.readBytes, contract.totalBytes);
    for (const i of [0, 1, 2]) { f = fixture(); f.files.get(seeds[i].path).attrs.size = seeds[i].cap + 1; await outcome(f, 'file_bound'); assert(!f.log.some(x => x.method === 'open' && x.args[0] === seeds[i].path)); }
    for (const i of [0, 1, 2]) { f = fixture(); f.files.delete(seeds[i].path); r = await f.run(); cases++; assert.equal(r.files[i].status, 'absent'); assert.equal(r.files.length, 3); assert.equal(r.status, 'partial'); }
    f = fixture(); f.files.get(seeds[0].path).attrs.size = 0; await outcome(f, 'file_bound');
    for (const type of ['link', 'other', 'directory']) { f = fixture(); f.files.get(seeds[0].path).attrs = meta(type, 12); await outcome(f, type === 'link' ? 'link_bound' : 'file_bound'); }
    // Only READLINK-disclosed own-stem numeric suffixes may be opened; exactly two hops pass.
    f = fixture(); const s = seeds[1], one = s.path + '.1', two = one + '.0.0';
    f.files.set(s.path, {attrs: meta('link', path.posix.basename(one).length), link: path.posix.basename(one)});
    f.files.set(one, {attrs: meta('link', two.length), link: two}); f.files.set(two, {attrs: meta('file', 19), size: 19});
    r = await f.run(); cases++; assert.equal(r.status, 'retrieved'); assert.equal(r.files[1].chain.length, 2);
    assert.deepEqual(f.log.filter(x => x.method === 'open').map(x => x.args[0]), [seeds[0].path, two, seeds[2].path]);
    for (const text of ['../lib.so', './libelement-video-hdmi.so', '/tmp/libelement-video-hdmi.so',
        'libelement-video-sink.so.1', 'libelement-video-hdmi.so.x', 'libelement-video-hdmi.so.1.2.3.4', '', 'x\n', 'é', 'a'.repeat(513)]) {
        assert.throws(() => linkTarget(text, s.stem));
        f = fixture(); f.files.set(s.path, {attrs: meta('link', 20), link: text}); await outcome(f, 'link_bound');
        assert(!f.log.some(x => x.method === 'lstat' && ![...parents, ...seeds.map(x => x.path)].includes(x.args[0])));
    }
    f = fixture(); f.files.set(s.path, {attrs: meta('link', path.posix.basename(s.path).length), link: path.posix.basename(s.path)}); await outcome(f, 'link_bound');
    f = fixture(); f.files.set(s.path, {attrs: meta('link', path.posix.basename(one).length), link: path.posix.basename(one)});
    f.files.set(one, {attrs: meta('link', path.posix.basename(two).length), link: path.posix.basename(two)});
    f.files.set(two, {attrs: meta('link', path.posix.basename(s.path + '.2').length), link: path.posix.basename(s.path + '.2')}); await outcome(f, 'link_bound');
    assert(!f.log.some(x => x.method === 'readlink' && x.args[0] === two));
    f = fixture({hooks: {readlink({entry, cb}) { if (entry.index === 4) { cb(null, path.posix.basename(s.path + '.2')); return true; } }}});
    f.files.set(s.path, {attrs: meta('link', path.posix.basename(one).length), link: path.posix.basename(one)});
    f.files.set(one, {attrs: meta('file', 19), size: 19}); await outcome(f, 'changed'); assert.equal(f.counts.open, 2);
    f = fixture({hooks: {lstat({entry, cb}) { if (entry.args[0] === seeds[0].path) { cb(error(3)); return true; } }}});
    await outcome(f, 'permission_denied'); assert.equal(f.counts.open || 0, 0);
    f = fixture({hooks: {fstat({entry, files, cb}) { const a = {...files.get(entry.args[0]).attrs, mtime: 99}; cb(null, a); return true; }}});
    await outcome(f, 'changed'); assert.equal(f.counts.read || 0, 0); assert.equal(f.counts.close, 1);
    f = fixture({hooks: {read({entry, files, cb}) { if (entry.index === 2) { files.get(seeds[0].path).attrs.mtime++; } }}});
    await outcome(f, 'changed'); assert.equal(f.counts.open, 1);
    f = fixture({hooks: {read({entry, cb}) { if (entry.index === 1) { cb(null, 0); return true; } }}});
    await outcome(f, 'short_file');
    f = fixture(); f.files.get(seeds[0].path).size = 13; r = await outcome(f, 'growth'); assert.equal(r.savedBytes, 0);
    f = fixture({sizes: [2050, 19, 23], hooks: {read({cb}) { cb(null, 1); return true; }}});
    await outcome(f, 'read_bound'); assert.equal(f.counts.read, 2049); assert.equal(f.written.get('elementList.json').bytes, 2049);
    f = fixture(); f.files.get('/usr/lib').attrs = meta('link', 8); await outcome(f, 'metadata'); assert.equal(f.counts.open || 0, 0);
    f = fixture({hooks: {read({files}) { files.get('/usr/lib/element').attrs.mtime = 20; }}});
    await outcome(f, 'changed'); assert.equal(f.counts.open, 1);
    f = fixture({hooks: {close({cb}) { cb(error(4)); return true; }}});
    r = await outcome(f, 'handle_close_unconfirmed'); assert.equal(f.counts.close, 1); assert.equal(r.handlesClosed, false);
    f = fixture({hooks: {read({client}) { client.emit('close'); return true; }}});
    await outcome(f, 'connection_lost'); assert.equal(f.counts.open, 1);
    f = fixture(); const normalBegin = f.sink.begin;
    f.sink.begin = name => { const output = normalBegin(name); return {...output, finish() { output.finish(); throw Error('PRIVATE_VENDOR_IDENTIFIER'); }}; };
    r = await outcome(f, 'local_io'); assert.equal(r.files[0].bytes, null); assert.equal(r.savedBytes, null); assert.equal(r.files[0].handleClose, 'confirmed');
    // Late read callbacks never write evidence or dispatch another seed after a timeout.
    stage = 'late read';
    let late;
    f = fixture({hooks: {read({cb}) { late = cb; return true; }}});
    let job = f.run(); await drain(); f.clock.tick(3000); await drain(); r = await job; cases++;
    assert.equal(r.stopReason, 'operation_timeout'); const before = f.log.length;
    late(null, 12); await drain(); assert.equal(f.log.length, before); assert.equal(r.savedBytes, 0);
    f = fixture({hooks: {open({cb}) { late = cb; return true; }}});
    job = f.run(); await drain(); f.clock.tick(3000); await drain(); r = await job; cases++;
    const openLogCount = f.log.length; late(null, {path: seeds[0].path}); await drain();
    assert.equal(f.log.length, openLogCount); assert.equal(r.handlesClosed, false); assert.equal(r.status, 'partial');
    // The work cutoff does not cancel CLOSE; it only prevents further content/metadata.
    stage = 'work cutoff';
    f = fixture({hooks: {read({entry, clock}) { if (entry.index === 2) clock.time = 26999; },
        close({cb, clock}) { clock.setTimeout(() => cb(null), 2); return true; }}});
    job = f.run(); await drain(); f.clock.tick(2); await drain(); r = await job; cases++;
    assert.equal(r.stopReason, 'work_deadline'); assert.equal(r.files[0].handleClose, 'confirmed');
    assert(!f.log.some(x => x.at >= 27000 && !['close', 'sftp.end', 'client.end', 'client.destroy'].includes(x.method)));
    stage = 'closure timeout';
    f = fixture({closeConnection: false}); job = f.run(); await drain(); f.clock.tick(3000); await drain(); r = await job; cases++;
    assert.equal(r.stopReason, 'operation_timeout'); assert.equal(r.connectionClosed, false); assert.equal(f.destroyed, 1);
    const frozen = JSON.stringify(r); f.client.emit('close'); f.sftp.emit('close'); await drain(); assert.equal(JSON.stringify(r), frozen);
    stage = 'subsystem close';
    f = fixture({closeSubsystem: false}); r = await f.run(); cases++; assert.equal(r.status, 'partial'); assert.equal(r.subsystemClosed, false);
    stage = 'cancellation';
    const abort = new AbortController(); f = fixture({hooks: {read() { abort.abort(); return true; }}});
    r = await f.run(abort.signal); cases++; assert.equal(r.stopReason, 'cancelled'); assert.equal(r.status, 'partial');
    stage = 'connect timeout';
    f = fixture({hooks: {connect() { return true; }}}); job = f.run(); await drain(); f.clock.tick(3000); await drain(); r = await job; cases++;
    assert.equal(r.stopReason, 'operation_timeout'); assert.equal(f.counts.sftp || 0, 0); assert.equal(f.destroyed, 1);
    f = fixture(); f.unverify(); await outcome(f, 'host_key_unverified'); assert.equal(f.counts.sftp || 0, 0);
    f = fixture({hooks: {connect({clock}) { clock.time = 30000; }}}); r = await f.run(); cases++;
    assert.equal(r.stopReason, 'total_deadline'); assert.equal(f.counts.sftp || 0, 0); assert.equal(r.elapsedMs, 30000);
    const preAbort = new AbortController(); preAbort.abort(); f = fixture(); r = await f.run(preAbort.signal); cases++;
    assert.equal(r.stopReason, 'cancelled'); assert.equal(f.starts, 0);
    f = fixture(); await assert.rejects(collect({allowOneRead: false, sink: f.sink, connectionFactory() { throw Error('Should not connect'); }})); cases++;
    const {main} = require('../../scripts/collect-hdmi-elements.cjs');
    const logPlan = console.log; let planObject;
    try { console.log = value => { planObject = JSON.parse(value); }; await main(['--plan']); }
    finally { console.log = logPlan; }
    assert.equal(planObject.TVConnections, 0);
    await assert.rejects(main(['--allow-one-element-evidence-read'])); cases++;
    assert.equal(forbiddenImports, 0); assert.equal(profileReads, 0);
    // Pinned adapter is inspected only with fake profile/key/client providers.
    Module._load = originalLoad;
    const {pinnedConnection} = require('../../scripts/hdmi-element-connection.cjs');
    let options, imports = 0;
    assert.throws(() => pinnedConnection({alias: 'fixture', hostKeySha256: '', loadProfiles() { imports++; }})); assert.equal(imports, 0);
    const conn = pinnedConnection({alias: 'fixture', hostKeySha256: 'a'.repeat(64),
        loadProfiles: () => [{name: 'fixture', username: 'root', privateKey: {openSsh: 'fixture'}}],
        readKey: () => Buffer.from('fixture'), createClient: () => ({connect(o) { options = o; }})});
    conn.start(); assert.equal(options.readyTimeout, 3000); assert.equal(options.hostHash, 'sha256');
    assert.equal(options.hostVerifier('b'.repeat(64)), false); assert.equal(options.hostVerifier('a'.repeat(64)), true);
    assert.equal(conn.hostKeyVerified(), true); assert.throws(() => conn.start()); cases++;
    // Real local output verifies exclusive capture, private ACL and byte/hash retention once.
    const {reserveCapture} = require('../../scripts/hdmi-element-capture.cjs');
    const base = path.resolve('build/phase-2');
    const slot = fs.mkdtempSync(path.join(base, 'element-collector-host-'));
    const output = path.join(slot, 'capture'), sink = reserveCapture(output);
    const file = sink.begin('elementList.json'); file.write(Buffer.from('fixture')); const receipt = file.finish();
    assert.equal(receipt.bytes, 7); assert.equal(receipt.sha256, crypto.createHash('sha256').update('fixture').digest('hex'));
    sink.complete({synthetic: true}); assert.throws(() => reserveCapture(output)); assert.throws(() => sink.begin('elementList.json')); assert.throws(() => sink.complete({})); cases++;
    const plan = spawnSync(process.execPath, ['scripts/collect-hdmi-elements.cjs', '--plan'], {encoding: 'utf8'});
    assert.equal(plan.status, 0, plan.stderr); assert.equal(JSON.parse(plan.stdout).TVConnections, 0);
    const refused = spawnSync(process.execPath, ['scripts/collect-hdmi-elements.cjs', '--allow-one-element-evidence-read'], {encoding: 'utf8'});
    assert.equal(refused.status, 1); assert(!refused.stderr.includes('PRIVATE')); cases++;
    fs.readFileSync = originalRead; clearTimeout(watchdog);
    console.log(JSON.stringify({status: 'passed',acceptanceCases: cases, TVConnections: 0, profileReads, forbiddenImports, syntheticCapture: output}));
})().catch(e => { clearTimeout(watchdog); Module._load = originalLoad; fs.readFileSync = originalRead; console.error(e); process.exitCode = 1; });
