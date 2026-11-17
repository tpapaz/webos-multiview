// Acceptance criteria for the one-candidate request. Every SSH/SFTP operation below is synthetic.
const assert = require('node:assert/strict'), {EventEmitter} = require('node:events');
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const {spawnSync} = require('node:child_process'), Module = require('node:module');
const originalLoad = Module._load, originalRead = fs.readFileSync;
let cases = 0, forbiddenImports = 0, credentialReads = 0, stage = 'start';
const watchdog = setTimeout(() => { throw Error('Acceptance stalled: ' + stage); }, 20000);
Module._load = function(name, ...args) {
    if (/ssh2|phase1-device|resource-client-connection|hdmi-element-connection/.test(name)) {
        forbiddenImports++; throw Error('Live transport import forbidden');
    }
    return originalLoad.call(this, name, ...args);
};
fs.readFileSync = function(file, ...args) {
    if (/novacom-devices|[\\/]\.ssh[\\/]/.test(String(file))) { credentialReads++; throw Error('Credential read forbidden'); }
    return originalRead.call(this, file, ...args);
};
const {collect, contract, seed, parents, linkTarget} = require('../../scripts/resource-client-collector.cjs');
class Clock {
    time = 0; next = 0; timers = new Map();
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
const error = code => Object.assign(Error('PRIVATE_VENDOR_TEXT'), {code});
const meta = (type, size = 0) => ({mode: ({file: 0o100000, directory: 0o040000, link: 0o120000, other: 0o020000}[type]) | 0o444,
    uid: 1, gid: 1, size, mtime: 10});
function fixture({size = 19, hooks = {}, closeConnection = true, closeSubsystem = true} = {}) {
    const clock = new Clock(), files = new Map(parents.map(p => [p, {attrs: meta('directory')}]));
    files.set(seed.path, {attrs: meta('file', size), size});
    const log = [], counts = {}, client = new EventEmitter(), sftp = new EventEmitter();
    let started = 0, destroyed = 0, verified = true, completed, retained = 0, began = false;
    function dispatch(method, args, cb, body) {
        counts[method] = (counts[method] || 0) + 1;
        const entry = {method, args, at: clock.now(), index: counts[method]}; log.push(entry);
        if (hooks[method]?.({entry, files, cb, clock, client, sftp}) !== true) body();
    }
    sftp.lstat = (name, cb) => dispatch('lstat', [name], cb, () => files.has(name) ? cb(null, {...files.get(name).attrs}) : cb(error(2)));
    sftp.readlink = (name, cb) => dispatch('readlink', [name], cb, () => cb(null, files.get(name).link));
    sftp.open = (name, flags, cb) => dispatch('open', [name, flags], cb, () => { assert.equal(flags, 'r'); cb(null, {path: name}); });
    sftp.fstat = (h, cb) => dispatch('fstat', [h.path], cb, () => cb(null, {...files.get(h.path).attrs}));
    sftp.read = (h, b, offset, length, position, cb) => dispatch('read', [h.path, length, position], cb, () => {
        assert(length >= 1 && length <= contract.chunkBytes);
        const n = Math.max(0, Math.min(length, files.get(h.path).size - position)); b.fill(65, offset, offset + n); cb(null, n);
    });
    sftp.close = (h, cb) => dispatch('close', [h.path], cb, () => cb(null));
    for (const name of ['exec', 'readdir', 'stat', 'realpath', 'write', 'unlink', 'chmod', 'rename']) {
        const forbidden = () => { throw Error('Forbidden operation ' + name); }; sftp[name] = forbidden; client[name] = forbidden;
    }
    sftp.end = () => { log.push({method: 'sftp.end', at: clock.now()}); if (closeSubsystem) sftp.emit('close'); };
    client.sftp = cb => dispatch('sftp', [], cb, () => cb(null, sftp));
    client.end = () => { log.push({method: 'client.end', at: clock.now()}); if (closeConnection) client.emit('close'); };
    client.destroy = () => { destroyed++; log.push({method: 'client.destroy', at: clock.now()}); if (closeConnection) client.emit('close'); };
    const sink = {
        begin(name) {
            assert.equal(name, seed.name); assert.equal(began, false); began = true;
            const digest = crypto.createHash('sha256');
            return {write(b) { retained += b.length; digest.update(b); },
                finish() { return {bytes: retained, sha256: digest.digest('hex'), localFile: name}; }};
        },
        complete(r) { assert.equal(completed, undefined); completed = r; }
    };
    const factory = () => {
        hooks.factory?.({clock});
        return {client, hostKeyVerified: () => verified, start() {
            started++; assert.equal(started, 1); dispatch('connect', [], () => {}, () => client.emit('ready'));
        }};
    };
    return {run: signal => collect({allowOneRead: true, connectionFactory: factory, sink, signal, clock}),
        factory, clock, files, log, counts, sink, client, sftp, unverify() { verified = false; },
        get starts() { return started; }, get destroyed() { return destroyed; }, get retained() { return retained; }, get completed() { return completed; }};
}
const drain = async () => { for (let i = 0; i < 1000; i++) await Promise.resolve(); };
async function outcome(f, reason) {
    const r = await f.run(); cases++;
    assert.equal(r.status, 'partial'); assert.equal(r.stopReason, reason);
    assert(!JSON.stringify(r).includes('PRIVATE_VENDOR_TEXT')); assert(f.starts <= 1); assert((f.counts.open || 0) <= 1);
    return r;
}
function link(f, from, to) { f.files.set(from, {attrs: meta('link', Buffer.byteLength(to)), link: to}); }
(async () => {
    let f = fixture(), r = await f.run(); cases++;
    assert.equal(r.status, 'retrieved'); assert.equal(r.opens, 1); assert.equal(r.savedBytes, 19);
    assert.equal(r.connectionAttempts, 1); assert.equal(r.sftpAttempts, 1); assert.equal(f.counts.close, 1);
    assert(r.handlesClosed && r.subsystemClosed && r.connectionClosed); assert.equal(f.clock.timers.size, 0);
    assert(f.log.filter(x => x.method === 'lstat').every(x => [...parents, seed.path].includes(x.args[0])));
    // Inclusive byte cap streams without retaining 32 MiB in the test process.
    f = fixture({size: seed.cap}); r = await f.run(); cases++;
    assert.equal(r.status, 'retrieved'); assert.equal(r.savedBytes, seed.cap); assert.equal(r.file.readCalls, 513);
    for (const size of [0, seed.cap + 1]) { f = fixture({size}); await outcome(f, 'file_bound'); assert(!f.counts.open); }
    for (const type of ['other', 'directory']) { f = fixture(); f.files.get(seed.path).attrs = meta(type, 19); await outcome(f, 'file_bound'); }
    f = fixture(); f.files.delete(seed.path); r = await f.run(); cases++;
    assert.equal(r.status, 'absent'); assert.equal(r.file.status, 'absent'); assert(!f.counts.open);
    assert.deepEqual(f.log.filter(x => x.method === 'lstat' && !parents.includes(x.args[0])).map(x => x.args[0]), [seed.path]);
    const one = seed.path + '.0', two = seed.path + '.0.0';
    f = fixture(); link(f, seed.path, path.posix.basename(one)); link(f, one, two);
    f.files.set(two, {attrs: meta('file', 19), size: 19}); r = await f.run(); cases++;
    assert.equal(r.status, 'retrieved'); assert.equal(r.file.chain.length, 2);
    assert.deepEqual(f.log.filter(x => x.method === 'open').map(x => x.args[0]), [two]);
    for (const text of ['../libresource_mgr_client.so.1', './libresource_mgr_client.so.1', '/lib/libresource_mgr_client.so.1',
        '/usr/lib/sub/libresource_mgr_client.so.1', 'libresource_mgr_client.so', 'libresource_mgr_client_c.so.1',
        'libresource_mgr_client.so.1.x', 'libresource_mgr_client.so.1.0.0.0', '', 'x\n', 'é', 'a'.repeat(513),
        'libresource_mgr_client.so.1.' + '1'.repeat(128)]) {
        assert.throws(() => linkTarget(text)); f = fixture(); link(f, seed.path, text);
        // Empty/oversized link metadata is rejected before READLINK as well.
        await outcome(f, 'link_bound'); assert(!f.counts.open);
        assert(f.log.filter(x => x.method === 'lstat').every(x => [...parents, seed.path].includes(x.args[0])));
    }
    f = fixture(); link(f, seed.path, path.posix.basename(seed.path)); await outcome(f, 'link_bound');
    f = fixture(); link(f, seed.path, one); link(f, one, two); link(f, two, seed.path + '.2');
    await outcome(f, 'link_bound'); assert(!f.log.some(x => x.method === 'readlink' && x.args[0] === two));
    f = fixture(); link(f, seed.path, one); await outcome(f, 'operation_failed'); assert(!f.counts.open);
    f = fixture(); link(f, seed.path, one); f.files.get(seed.path).attrs.size++;
    await outcome(f, 'changed'); assert(!f.counts.open);
    f = fixture({hooks: {readlink({entry, cb}) { if (entry.index === 2) { cb(null, two); return true; } }}});
    link(f, seed.path, one); f.files.set(one, {attrs: meta('file', 19), size: 19}); await outcome(f, 'changed'); assert(!f.counts.open);
    for (const code of [3, 4]) {
        f = fixture({hooks: {lstat({entry, cb}) { if (entry.args[0] === seed.path) { cb(error(code)); return true; } }}});
        await outcome(f, code === 3 ? 'permission_denied' : 'operation_failed'); assert(!f.counts.open);
    }
    for (const field of ['mode', 'uid', 'gid', 'size', 'mtime']) {
        f = fixture({hooks: {fstat({entry, files, cb}) { cb(null, {...files.get(entry.args[0]).attrs, [field]: files.get(entry.args[0]).attrs[field] + 1}); return true; }}});
        await outcome(f, 'changed'); assert(!f.counts.read); assert.equal(f.counts.close, 1);
    }
    f = fixture(); f.files.get(seed.path).attrs.mtime = NaN; await outcome(f, 'metadata');
    f = fixture({hooks: {read({files}) { files.get(seed.path).attrs.mtime++; }}}); await outcome(f, 'changed');
    f = fixture({hooks: {read({cb}) { cb(null, 0); return true; }}}); await outcome(f, 'short_file');
    f = fixture(); f.files.get(seed.path).size++; r = await outcome(f, 'growth');
    assert.equal(r.readBytes, 20); assert.equal(r.savedBytes, 0);
    f = fixture({size: seed.cap}); f.files.get(seed.path).size++; r = await outcome(f, 'growth');
    assert.equal(r.readBytes, seed.cap + 1); assert(r.savedBytes <= seed.cap);
    for (const value of [-1, 0.5, 65537]) {
        f = fixture({hooks: {read({cb}) { cb(null, value); return true; }}}); await outcome(f, 'read_bound');
    }
    f = fixture({size: 2050, hooks: {read({cb}) { cb(null, 1); return true; }}});
    await outcome(f, 'read_bound'); assert.equal(f.counts.read, 2049); assert.equal(f.retained, 2049);
    for (const parent of parents) { f = fixture(); f.files.get(parent).attrs = meta('link', 7); await outcome(f, 'metadata'); assert(!f.counts.open); }
    f = fixture({hooks: {read({files}) { files.get('/usr/lib').attrs.mtime++; }}}); await outcome(f, 'changed');
    f = fixture({hooks: {close({cb}) { cb(error(4)); return true; }}});
    r = await outcome(f, 'handle_close_unconfirmed'); assert.equal(f.counts.close, 1); assert.equal(r.handlesClosed, false);
    f = fixture({hooks: {read({client}) { client.emit('close'); return true; }}}); await outcome(f, 'connection_lost');
    f = fixture(); f.sink.begin = () => { throw error(4); }; await outcome(f, 'local_io'); assert.equal(f.counts.close, 1);
    for (const method of ['write', 'finish']) {
        f = fixture(); const begin = f.sink.begin;
        f.sink.begin = name => { const file = begin(name); return {...file, [method]() { throw error(4); }}; };
        r = await outcome(f, 'local_io'); assert.equal(f.counts.close, 1); if (method === 'finish') assert.equal(r.savedBytes, null);
    }
    stage = 'late callbacks';
    for (const method of ['read', 'open']) {
        let late;
        f = fixture({hooks: {[method]({cb}) { late = cb; return true; }}});
        const job = f.run(); await drain(); f.clock.tick(3000); await drain(); r = await job; cases++;
        assert.equal(r.stopReason, 'operation_timeout'); assert.equal(r.status, 'partial');
        const count = f.log.length, frozen = JSON.stringify(r);
        late(null, method === 'read' ? 19 : {path: seed.path}); f.client.emit('close'); f.sftp.emit('close'); await drain();
        assert.equal(f.log.length, count); assert.equal(JSON.stringify(r), frozen); assert.equal(r.savedBytes, 0);
        if (method === 'open') assert.equal(r.handlesClosed, false);
    }
    stage = 'deadlines';
    f = fixture({hooks: {factory({clock}) { clock.time = 26999; },
        close({cb, clock}) { clock.setTimeout(() => cb(null), 2); return true; }}});
    let job = f.run(); await drain(); f.clock.tick(2); await drain(); r = await job; cases++;
    assert.equal(r.file.handleClose, 'confirmed'); assert.equal(r.status, 'retrieved'); assert.equal(r.elapsedMs, 27001);
    assert(!f.log.some(x => x.at >= 27000 && !['close', 'sftp.end', 'client.end', 'client.destroy'].includes(x.method)));
    // Cumulative progress cannot renew the work budget, even when each call is under3 s.
    f = fixture({size: 1000000, hooks: {read({clock}) { clock.time += 2000; }}});
    await outcome(f, 'work_deadline'); assert(f.clock.time >= 27000); assert.equal(f.counts.open, 1);
    for (const duration of [27000, 30000]) {
        f = fixture({hooks: {factory({clock}) { clock.time = duration; }}});
        r = await outcome(f, duration === 30000 ? 'total_deadline' : 'work_deadline'); assert.equal(f.starts, 0);
    }
    f = fixture({hooks: {connect() { return true; }}}); job = f.run(); await drain(); f.clock.tick(3000); await drain(); r = await job; cases++;
    assert.equal(r.stopReason, 'operation_timeout'); assert(!f.counts.sftp); assert.equal(f.destroyed, 1);
    // Neither a pending read at the work cutoff nor cleanup at the outer cap may renew a deadline.
    f = fixture({hooks: {factory({clock}) { clock.time = 26999; }, read() { return true; }}});
    job = f.run(); await drain(); f.clock.tick(1); await drain(); r = await job; cases++;
    assert.equal(r.stopReason, 'work_deadline'); assert.equal(r.elapsedMs, 27000); assert.equal(f.counts.close, 1);
    f = fixture({hooks: {factory({clock}) { clock.time = 26999; }, close() { return true; }}});
    job = f.run(); await drain(); f.clock.tick(3000); await drain(); r = await job; cases++;
    assert.equal(r.status, 'partial'); assert.equal(r.elapsedMs, 29999); assert.equal(f.counts.close, 1);
    f = fixture({hooks: {read({clock}) { clock.time = 29999; }, close() { return true; }}});
    job = f.run(); await drain(); f.clock.tick(1); await drain(); r = await job; cases++;
    assert.equal(r.status, 'partial'); assert.equal(r.elapsedMs, 30000); assert.equal(f.destroyed, 1); assert.equal(f.counts.close, 1);
    f = fixture({hooks: {read({clock}) { clock.time += 3000; }}});
    await outcome(f, 'operation_timeout'); assert.equal(f.retained, 0); assert.equal(f.destroyed, 1);
    f = fixture(); f.unverify(); await outcome(f, 'host_key_unverified'); assert(!f.counts.sftp);
    // Closing the connection before its subsystem is not sufficient; wait for both within cleanup budget.
    f = fixture({closeSubsystem: false});
    f.sftp.end = () => f.clock.setTimeout(() => f.sftp.emit('close'), 2);
    job = f.run(); await drain(); f.clock.tick(2); await drain(); r = await job; cases++;
    assert.equal(r.status, 'retrieved'); assert.equal(r.elapsedMs, 2); assert(r.subsystemClosed && r.connectionClosed);
    for (const options of [{closeConnection: false}, {closeSubsystem: false}]) {
        f = fixture(options); job = f.run(); await drain(); f.clock.tick(3000); await drain(); r = await job; cases++;
        assert.equal(r.status, 'partial'); assert.equal(f.destroyed, 1); assert.equal(r.stopReason, 'operation_timeout');
    }
    f = fixture({hooks: {read({entry, clock}) { if (entry.index === 2) clock.time = 29999; }}});
    await outcome(f, 'work_deadline'); assert(f.clock.time < 30001);
    stage = 'cancellation';
    const abort = new AbortController(); f = fixture({hooks: {read() { abort.abort(); return true; }}});
    r = await f.run(abort.signal); cases++; assert.equal(r.stopReason, 'cancelled'); assert.equal(r.status, 'partial');
    const pre = new AbortController(); pre.abort(); f = fixture(); r = await f.run(pre.signal); cases++;
    assert.equal(f.starts, 0); assert.equal(r.stopReason, 'cancelled');
    await assert.rejects(collect({allowOneRead: false, connectionFactory() { throw Error('Must not run'); }, sink: f.sink})); cases++;
    // Plans and malformed/extra live arguments must neither import transport nor load profiles.
    const {main} = require('../../scripts/collect-resource-client.cjs');
    const print = console.log; let plan;
    try { console.log = value => { plan = JSON.parse(value); }; await main(['--plan']); } finally { console.log = print; }
    assert.equal(plan.TVConnections, 0); assert.equal(plan.contract.opens, 1); assert.equal(plan.collectionAuthorized, false); cases++;
    for (const args of [[], ['--allow-one-resource-client-evidence-read'], ['--plan', 'extra'],
        ['--allow-one-resource-client-evidence-read', '--owner-read-only-evidence-ready', '--device', 'fixture', 'build/other']]) {
        await assert.rejects(main(args)); cases++;
    }
    assert.equal(forbiddenImports, 0); assert.equal(credentialReads, 0);
    // Only injected fixtures inspect saved-pin binding. No real profile, receipt pin or SSH key is parsed here.
    Module._load = originalLoad;
    const {savedConnection} = require('../../scripts/resource-client-connection.cjs');
    const profile = {name: 'fixture', host: '192.0.2.1', port: 22, username: 'root', privateKey: {openSsh: 'fixture'}};
    const receipt = {kind: 'ssh_host_key_first_use', status: 'tofu_recorded', trustMode: 'tofu', ownerTargetConfirmed: true,
        connectionClosed: true, authenticationBlocked: true, unexpectedAuthentication: false, stopReason: null,
        key: {sha256: 'a'.repeat(64)}, endpointBindingSha256: crypto.createHash('sha256').update(JSON.stringify({alias: 'fixture', host: profile.host, port: profile.port})).digest('hex')};
    let keyReads = 0, profileReads = 0, connects = 0, options;
    const inject = {alias: 'fixture', loadReceipt: () => receipt, loadProfiles: () => { profileReads++; return [profile]; },
        readKey: () => { keyReads++; return Buffer.from('fixture'); }, createClient: () => ({connect(o) { connects++; options = o; }})};
    const connection = savedConnection(inject); assert.equal(connects, 0); assert.equal(profileReads, 1); assert.equal(keyReads, 1);
    connection.start(); assert.equal(options.hostVerifier('b'.repeat(64)), false); assert.equal(options.hostVerifier('a'.repeat(64)), true);
    assert.equal(connection.hostKeyVerified(), true); assert.equal(options.readyTimeout, 3000); assert.throws(() => connection.start()); cases++;
    for (const patch of [{endpointBindingSha256: 'b'.repeat(64)}, {ownerTargetConfirmed: false}, {status: 'partial'}, {key: {sha256: 'bad'}}]) {
        assert.throws(() => savedConnection({...inject, loadReceipt: () => ({...receipt, ...patch})})); cases++;
    }
    assert.equal(keyReads, 1); assert.equal(connects, 1);
    stage = 'private local capture';
    const {reserveCapture} = require('../../scripts/resource-client-capture.cjs');
    const base = fs.mkdtempSync(path.resolve('build/phase-2/resource-client-host-')), output = path.join(base, 'capture');
    const capture = reserveCapture(output); assert.throws(() => capture.begin('video-sink.elf'));
    const file = capture.begin(seed.name); file.write(Buffer.from('fixture')); const retained = file.finish();
    assert.equal(retained.bytes, 7); assert.equal(retained.sha256, crypto.createHash('sha256').update('fixture').digest('hex'));
    assert.throws(() => file.write(Buffer.from('x'))); assert.throws(() => capture.begin(seed.name));
    capture.complete({synthetic: true}); assert.throws(() => capture.complete({})); assert.throws(() => reserveCapture(output)); cases++;
    if (process.platform === 'win32') {
        const command = '$ErrorActionPreference="Stop"; $sid=[System.Security.Principal.WindowsIdentity]::GetCurrent().User; ' +
            'foreach($p in @($env:MULTIVIEW_RESOURCE_TEST_CAPTURE,(Join-Path $env:MULTIVIEW_RESOURCE_TEST_CAPTURE "resource-client.elf"),' +
            '(Join-Path $env:MULTIVIEW_RESOURCE_TEST_CAPTURE "inventory.json"))){$a=Get-Acl -LiteralPath $p; ' +
            'if($a.GetOwner([System.Security.Principal.SecurityIdentifier]) -ne $sid){throw "owner"}; ' +
            '$r=@($a.GetAccessRules($true,$true,[System.Security.Principal.SecurityIdentifier])); ' +
            'if($r.Count -ne 1 -or $r[0].IdentityReference -ne $sid -or $r[0].AccessControlType -ne "Allow" -or ' +
            '($r[0].FileSystemRights -band [System.Security.AccessControl.FileSystemRights]::FullControl) -ne ' +
            '[System.Security.AccessControl.FileSystemRights]::FullControl){throw "rules"}}';
        const acl = spawnSync('pwsh.exe', ['-NoProfile', '-NonInteractive', '-Command', command], {
            env: {...process.env, MULTIVIEW_RESOURCE_TEST_CAPTURE: output}, windowsHide: true, timeout: 5000, stdio: 'ignore'});
        assert.equal(acl.status, 0, 'Owner-only directory/raw/inventory ACL check'); cases++;
    }
    const childPlan = spawnSync(process.execPath, ['scripts/collect-resource-client.cjs', '--plan'], {encoding: 'utf8'});
    assert.equal(childPlan.status, 0, childPlan.stderr); assert.equal(JSON.parse(childPlan.stdout).TVConnections, 0);
    const refused = spawnSync(process.execPath, ['scripts/collect-resource-client.cjs'], {encoding: 'utf8'});
    assert.equal(refused.status, 1); assert(!refused.stderr.includes('PRIVATE')); cases++;
    fs.readFileSync = originalRead; clearTimeout(watchdog);
    console.log(JSON.stringify({status: 'passed', acceptanceCases: cases, TVConnections: 0, credentialReads, forbiddenImports, syntheticCapture: output}));
})().catch(e => {
    clearTimeout(watchdog); Module._load = originalLoad; fs.readFileSync = originalRead; console.error(e); process.exitCode = 1;
});
