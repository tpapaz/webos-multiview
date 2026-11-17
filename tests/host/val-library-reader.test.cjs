// Fixed VAL evidence scope and operational acceptance. All SSH/SFTP below is synthetic.
const assert = require('node:assert/strict'), {EventEmitter} = require('node:events');
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), Module = require('node:module');
const {spawnSync} = require('node:child_process'), originalLoad = Module._load, originalRead = fs.readFileSync;
let cases = 0, forbiddenImports = 0, credentialReads = 0, stage = 'start';
const watchdog = setTimeout(() => { throw Error('Acceptance stalled: ' + stage); }, 20000);
Module._load = function(name, ...args) {
    if (/ssh2|resource-client-connection|hdmi-element-connection|phase1-device|^(node:)?net$/.test(name)) { forbiddenImports++; throw Error('Real transport forbidden'); }
    return originalLoad.call(this, name, ...args);
};
fs.readFileSync = function(file, ...args) {
    if (/novacom-devices|[\\/]\.ssh[\\/]/.test(String(file))) { credentialReads++; throw Error('Credential read forbidden'); }
    return originalRead.call(this, file, ...args);
};
const reader = require('../../scripts/collect-val-library.cjs'), {collect, seed, parents, contract, linkTarget} = reader;
function header() { const b = Buffer.alloc(52); b.write('\x7fELF', 'ascii'); b[4] = 1; b[5] = 1; b[6] = 1; b.writeUInt16LE(3, 16); b.writeUInt16LE(40, 18); b.writeUInt32LE(1, 20); b.writeUInt16LE(52, 40); return b; }
const meta = (type, size = 0) => ({mode: ({file: 0o100000, directory: 0o040000, link: 0o120000, other: 0o020000}[type]) | 0o444, uid: 1, gid: 1, size, mtime: 10});
const error = code => Object.assign(Error('PRIVATE_VENDOR_TEXT'), {code});
class Clock {
    time = 0; next = 0; timers = new Map(); now = () => this.time;
    setTimeout = (fn, ms) => { const id = ++this.next; this.timers.set(id, {at: this.time + ms, fn}); return id; };
    clearTimeout = id => this.timers.delete(id);
    tick(ms) {
        const end = this.time + ms;
        for (;;) {
            const first = [...this.timers].filter(([, t]) => t.at <= end).sort((a, b) => a[1].at - b[1].at)[0];
            if (!first) break; this.timers.delete(first[0]); this.time = first[1].at; first[1].fn();
        }
        this.time = end;
    }
}
function fixture({size = 96, data = header(), hooks = {}, closeConnection = true, closeSubsystem = true} = {}) {
    const clock = new Clock(), files = new Map(parents.map(p => [p, {attrs: meta('directory')}]));
    files.set(seed.path, {attrs: meta('file', size), size, data});
    const log = [], counts = {}, client = new EventEmitter(), sftp = new EventEmitter();
    let started = 0, destroyed = 0, verified = true, completed, retained = 0;
    function dispatch(method, args, cb, body) {
        counts[method] = (counts[method] || 0) + 1; const entry = {method, args, index: counts[method], at: clock.now()}; log.push(entry);
        if (hooks[method]?.({entry, files, cb, clock, client, sftp}) !== true) body();
    }
    sftp.lstat = (name, cb) => dispatch('lstat', [name], cb, () => files.has(name) ? cb(null, {...files.get(name).attrs}) : cb(error(2)));
    sftp.readlink = (name, cb) => dispatch('readlink', [name], cb, () => cb(null, files.get(name).link));
    sftp.open = (name, flags, cb) => dispatch('open', [name, flags], cb, () => { assert.equal(flags, 'r'); cb(null, {path: name}); });
    sftp.fstat = (h, cb) => dispatch('fstat', [h.path], cb, () => cb(null, {...files.get(h.path).attrs}));
    sftp.read = (h, b, offset, length, position, cb) => dispatch('read', [h.path, length, position], cb, () => {
        assert(length > 0 && length <= contract.chunkBytes); const f = files.get(h.path), n = Math.max(0, Math.min(length, f.size - position));
        b.fill(0, offset, offset + n); if (position < f.data.length) f.data.copy(b, offset, position, Math.min(position + n, f.data.length)); cb(null, n);
    });
    sftp.close = (h, cb) => dispatch('close', [h.path], cb, () => cb(null));
    for (const name of ['exec', 'readdir', 'stat', 'realpath', 'write', 'unlink', 'chmod', 'rename', 'setstat', 'fsetstat']) sftp[name] = client[name] = () => { throw Error('Forbidden operation ' + name); };
    sftp.end = () => { log.push({method: 'sftp.end', at: clock.now()}); if (closeSubsystem) sftp.emit('close'); };
    client.sftp = cb => dispatch('sftp', [], cb, () => cb(null, sftp));
    client.end = () => { log.push({method: 'client.end', at: clock.now()}); if (closeConnection) client.emit('close'); };
    client.destroy = () => { destroyed++; log.push({method: 'client.destroy', at: clock.now()}); if (closeConnection) client.emit('close'); };
    const sink = {begin(name) { assert.equal(name, seed.name); let bytes = 0; const digest = crypto.createHash('sha256');
        return {write(b) { hooks.write?.(); retained += b.length; bytes += b.length; digest.update(b); },
            finish() { hooks.finish?.(); return {bytes, sha256: digest.digest('hex'), localFile: name}; }};
    }, complete(r) { hooks.complete?.(); assert.equal(completed, undefined); completed = r; }};
    const factory = () => { hooks.factory?.({clock}); return {client, hostKeyVerified: () => verified, start() {
        started++; assert.equal(started, 1); dispatch('connect', [], () => {}, () => client.emit('ready'));
    }}; };
    return {run: signal => collect({allowOneRead: true, connectionFactory: factory, sink, signal, clock}),
        factory, clock, files, log, counts, client, sftp, sink, unverify() { verified = false; },
        get starts() { return started; }, get destroyed() { return destroyed; }, get retained() { return retained; }, get completed() { return completed; }};
}
const drain = async () => { for (let i = 0; i < 1000; i++) await Promise.resolve(); };
async function outcome(f, reason) {
    const r = await f.run(); cases++; assert.equal(r.status, 'partial'); assert.equal(r.stopReason, reason);
    assert(!JSON.stringify(r).includes('PRIVATE_VENDOR_TEXT')); assert(f.starts <= 1); assert((f.counts.open || 0) <= 1); return r;
}
function link(f, from, to) { f.files.set(from, {attrs: meta('link', Buffer.byteLength(to)), link: to}); }
(async () => {
    stage = 'success and fixed scope'; let f = fixture(), r = await f.run(); cases++;
    assert.equal(r.status, 'retrieved'); assert.equal(r.opens, 1); assert.equal(r.savedBytes, 96); assert.equal(r.file.readCalls, 2);
    assert(r.handlesClosed && r.subsystemClosed && r.connectionClosed); assert.equal(r.connectionAttempts, 1); assert.equal(r.sftpAttempts, 1); assert.equal(f.counts.close, 1); assert.equal(f.clock.timers.size, 0);
    assert.equal(r.elfIdentity.machine, 40); assert.equal(r.providerIdentity, 'unknown_until_offline_soname_analysis'); assert.equal(r.activeLoadedIdentity, 'unknown');
    assert(f.log.filter(x => x.method === 'lstat').every(x => [...parents, seed.path].includes(x.args[0])));
    const one = seed.path + '.0', two = seed.path + '.0.0';
    f = fixture(); link(f, seed.path, path.posix.basename(one)); link(f, one, two); f.files.set(two, {attrs: meta('file', 96), size: 96, data: header()});
    r = await f.run(); cases++; assert.equal(r.status, 'retrieved'); assert.equal(r.file.chain.length, 2); assert.deepEqual(f.log.filter(x => x.method === 'open').map(x => x.args[0]), [two]);
    for (const target of ['../libval-starfish.so.1', './libval-starfish.so.1', '/lib/libval-starfish.so.1', '/usr/lib/sub/libval-starfish.so.1',
        '/usr/lib/../libval-starfish.so.1', 'libresource_mgr_client.so.1', 'libval-starfish.so', 'libval-starfish.so.1.x', 'libval-starfish.so.1.0.0.0',
        'libval-starfish.so.10', '', 'x\n', 'é', 'a'.repeat(513), 'libval-starfish.so.1.' + '1'.repeat(128)]) {
        assert.throws(() => linkTarget(target)); f = fixture(); link(f, seed.path, target); await outcome(f, 'link_bound'); assert(!f.counts.open);
        assert(f.log.filter(x => x.method === 'lstat').every(x => [...parents, seed.path].includes(x.args[0])));
    }
    f = fixture(); link(f, seed.path, path.posix.basename(seed.path)); await outcome(f, 'link_bound');
    f = fixture(); link(f, seed.path, one); link(f, one, two); link(f, two, seed.path + '.2'); await outcome(f, 'link_bound'); assert(!f.log.some(x => x.method === 'readlink' && x.args[0] === two));
    f = fixture(); link(f, seed.path, one); await outcome(f, 'operation_failed'); assert(!f.counts.open);
    f = fixture(); link(f, seed.path, one); f.files.get(seed.path).attrs.size++; await outcome(f, 'changed');
    f = fixture({hooks: {readlink({entry, cb}) { if (entry.index === 2) { cb(null, two); return true; } }}});
    link(f, seed.path, one); f.files.set(one, {attrs: meta('file', 96), size: 96, data: header()}); await outcome(f, 'changed'); assert(!f.counts.open);
    f = fixture({hooks: {read({files}) { files.get(seed.path).link = two; }}});
    link(f, seed.path, one); f.files.set(one, {attrs: meta('file', 96), size: 96, data: header()});
    await outcome(f, 'changed'); assert.equal(f.counts.open, 1); assert.equal(f.counts.close, 1); assert(!f.log.some(x => x.method === 'open' && x.args[0] === two));
    stage = 'bounds, identity and EOF';
    f = fixture({size: seed.cap}); r = await f.run(); cases++; assert.equal(r.status, 'retrieved'); assert.equal(r.savedBytes, seed.cap); assert.equal(r.file.readCalls, 513);
    for (const size of [0, seed.cap + 1]) { f = fixture({size}); await outcome(f, 'file_bound'); assert(!f.counts.open); }
    for (const type of ['other', 'directory']) { f = fixture(); f.files.get(seed.path).attrs = meta(type, 96); await outcome(f, 'file_bound'); assert(!f.counts.open); }
    f = fixture(); f.files.delete(seed.path); r = await f.run(); cases++; assert.equal(r.status, 'absent'); assert(!f.counts.open); assert(r.connectionClosed);
    assert(f.log.filter(x => x.method === 'lstat').every(x => [...parents, seed.path].includes(x.args[0])));
    f = fixture({data: Buffer.alloc(64)}); r = await outcome(f, 'elf_header'); assert.equal(r.file.bytes, 96); assert.equal(f.counts.close, 1);
    f = fixture({size: 51}); await outcome(f, 'elf_header');
    for (const code of [3, 4]) { f = fixture({hooks: {lstat({cb}) { cb(error(code)); return true; }}}); await outcome(f, code === 3 ? 'permission_denied' : 'operation_failed'); }
    for (const field of ['mode', 'uid', 'gid', 'size', 'mtime']) {
        f = fixture({hooks: {fstat({entry, files, cb}) { const a = files.get(entry.args[0]).attrs; cb(null, {...a, [field]: a[field] + 1}); return true; }}});
        await outcome(f, 'changed'); assert(!f.counts.read); assert.equal(f.counts.close, 1);
    }
    f = fixture(); f.files.get(seed.path).attrs.mtime = NaN; await outcome(f, 'metadata');
    f = fixture({hooks: {read({files}) { files.get(seed.path).attrs.mtime++; }}}); await outcome(f, 'changed');
    for (const parent of parents) { f = fixture(); f.files.get(parent).attrs = meta('link', 7); await outcome(f, 'metadata'); assert(!f.counts.open); }
    f = fixture({hooks: {read({files}) { files.get('/usr/lib').attrs.mtime++; }}}); await outcome(f, 'changed');
    f = fixture({hooks: {read({cb}) { cb(null, 0); return true; }}}); await outcome(f, 'short_file');
    f = fixture(); f.files.get(seed.path).size++; r = await outcome(f, 'growth'); assert.equal(r.readBytes, 97); assert.equal(r.savedBytes, 0);
    f = fixture({size: seed.cap}); f.files.get(seed.path).size++; r = await outcome(f, 'growth'); assert.equal(r.readBytes, seed.cap + 1); assert(r.savedBytes <= seed.cap);
    for (const n of [-1, 0.5, 65537, undefined]) { f = fixture({hooks: {read({cb}) { cb(null, n); return true; }}}); await outcome(f, 'read_bound'); }
    f = fixture({size: 2050, hooks: {read({cb}) { cb(null, 1); return true; }}}); await outcome(f, 'read_bound'); assert.equal(f.counts.read, 2049);
    for (const method of ['write', 'finish', 'complete']) { f = fixture({hooks: {[method]() { throw error(4); }}}); r = await outcome(f, 'local_io'); assert.equal(f.counts.close, 1); }
    stage = 'deadlines, closure and late callbacks';
    for (const method of ['read', 'open']) {
        let late; f = fixture({hooks: {[method]({cb}) { late = cb; return true; }}}); const job = f.run(); await drain(); f.clock.tick(3000); await drain(); r = await job; cases++;
        assert.equal(r.stopReason, 'operation_timeout'); const frozen = JSON.stringify(r), count = f.log.length;
        late(null, method === 'read' ? 96 : {path: seed.path}); f.client.emit('close'); f.sftp.emit('close'); await drain();
        assert.equal(JSON.stringify(r), frozen); assert.equal(f.log.length, count); assert.equal(r.savedBytes, 0); if (method === 'open') assert.equal(r.handlesClosed, false);
    }
    for (const duration of [27000, 30000]) { f = fixture({hooks: {factory({clock}) { clock.time = duration; }}}); await outcome(f, duration === 30000 ? 'total_deadline' : 'work_deadline'); assert.equal(f.starts, 0); }
    f = fixture({hooks: {connect() { return true; }}}); let job = f.run(); await drain(); f.clock.tick(3000); await drain(); r = await job; cases++;
    assert.equal(r.stopReason, 'operation_timeout'); assert(!f.counts.sftp); assert.equal(f.destroyed, 1);
    f = fixture({hooks: {factory({clock}) { clock.time = 26999; }, read() { return true; }}}); job = f.run(); await drain(); f.clock.tick(1); await drain(); r = await job; cases++;
    assert.equal(r.stopReason, 'work_deadline'); assert.equal(r.elapsedMs, 27000); assert.equal(f.counts.close, 1);
    f = fixture({size: 1000000, hooks: {read({clock}) { clock.time += 2000; }}}); await outcome(f, 'work_deadline'); assert.equal(f.counts.open, 1);
    f = fixture({hooks: {factory({clock}) { clock.time = 26999; }, close() { return true; }}}); job = f.run(); await drain(); f.clock.tick(3000); await drain(); r = await job; cases++;
    assert.equal(r.status, 'partial'); assert.equal(r.elapsedMs, 29999); assert.equal(f.counts.close, 1);
    f = fixture({hooks: {read({clock}) { clock.time = 29999; }, close() { return true; }}}); job = f.run(); await drain(); f.clock.tick(1); await drain(); r = await job; cases++;
    assert.equal(r.status, 'partial'); assert.equal(r.elapsedMs, 30000); assert.equal(f.destroyed, 1); assert.equal(f.counts.close, 1);
    f = fixture({hooks: {factory({clock}) { clock.time = 26999; }, close({cb, clock}) { clock.setTimeout(() => cb(null), 2); return true; }}});
    job = f.run(); await drain(); f.clock.tick(2); await drain(); r = await job; cases++; assert.equal(r.status, 'retrieved'); assert.equal(r.elapsedMs, 27001);
    assert(!f.log.some(x => x.at >= 27000 && !['close', 'sftp.end', 'client.end', 'client.destroy'].includes(x.method)));
    f = fixture({hooks: {read({clock}) { clock.time += 3000; }}}); await outcome(f, 'operation_timeout'); assert.equal(f.retained, 0);
    f = fixture({hooks: {close({cb}) { cb(error(4)); return true; }}}); r = await outcome(f, 'handle_close_unconfirmed'); assert.equal(r.handlesClosed, false); assert.equal(f.counts.close, 1);
    f = fixture({hooks: {read({client}) { client.emit('close'); return true; }}}); await outcome(f, 'connection_lost');
    f = fixture(); f.unverify(); await outcome(f, 'host_key_unverified'); assert(!f.counts.sftp);
    for (const options of [{closeConnection: false}, {closeSubsystem: false}]) { f = fixture(options); job = f.run(); await drain(); f.clock.tick(3000); await drain(); r = await job; cases++; assert.equal(r.status, 'partial'); assert.equal(r.stopReason, 'operation_timeout'); assert.equal(f.destroyed, 1); }
    f = fixture({closeSubsystem: false}); f.sftp.end = () => f.clock.setTimeout(() => f.sftp.emit('close'), 2); job = f.run(); await drain(); f.clock.tick(2); await drain(); r = await job; cases++; assert.equal(r.status, 'retrieved'); assert.equal(r.elapsedMs, 2);
    const abort = new AbortController(); f = fixture({hooks: {read() { abort.abort(); return true; }}}); r = await f.run(abort.signal); cases++; assert.equal(r.stopReason, 'cancelled');
    const pre = new AbortController(); pre.abort(); f = fixture(); r = await f.run(pre.signal); cases++; assert.equal(r.stopReason, 'cancelled'); assert.equal(f.starts, 0);
    stage = 'offline and refusal entry points';
    await assert.rejects(collect({allowOneRead: false, connectionFactory: f.factory, sink: f.sink})); cases++;
    let plan; const print = console.log; try { console.log = s => { plan = JSON.parse(s); }; await reader.main(['--plan']); } finally { console.log = print; }
    assert.equal(plan.TVConnections, 0); assert.equal(plan.dispatch, false); assert.equal(plan.location, 'candidate_not_verified'); assert.equal(plan.contract.links, 2); cases++;
    for (const args of [[], ['--plan', 'extra'], ['--allow-one-val-library-evidence-read'], ['--allow-one-val-library-evidence-read', '--device', 'fixture', 'build/other'],
        ['--allow-one-val-library-evidence-read', '--device', 'fixture', 'build/phase-2/hdmi-val-library-evidence-20261117-001', 'extra']]) { await assert.rejects(reader.main(args)); cases++; }
    stage = 'private capture';
    const base = fs.mkdtempSync(path.resolve('build/phase-2/val-library-host-')), output = path.join(base, 'capture'), capture = reader.reserveCapture(output);
    assert.throws(() => capture.begin('resource-client.elf')); assert.throws(() => capture.begin('../x'));
    const file = capture.begin(seed.name); assert.throws(() => capture.begin(seed.name)); assert.throws(() => capture.complete({})); assert.throws(() => file.write(Buffer.alloc(seed.cap + 1)));
    const b = header(); file.write(b); const retained = file.finish(); assert.equal(retained.bytes, b.length); assert.equal(retained.sha256, crypto.createHash('sha256').update(b).digest('hex'));
    assert.throws(() => file.finish()); assert.throws(() => file.write(b)); capture.complete({synthetic: true}); assert.throws(() => capture.complete({})); assert.throws(() => reader.reserveCapture(output)); cases++;
    // Occupied correctly named live slot must refuse before any profile/transport access.
    let occupied;
    for (let n = 0; n < 1000; n++) {
        const candidate = path.resolve('build/phase-2/hdmi-val-library-evidence-19000101-' + String(n).padStart(3, '0'));
        try { fs.mkdirSync(candidate); occupied = candidate; break; } catch (e) { if (e.code !== 'EEXIST') throw e; }
    }
    assert(occupied); fs.writeFileSync(path.join(occupied, 'synthetic-only.json'), '{"synthetic":true}\n', {flag: 'wx'});
    await assert.rejects(reader.main(['--allow-one-val-library-evidence-read', '--device', 'fixture', occupied])); cases++;
    if (process.platform === 'win32') {
        const script = '$ErrorActionPreference="Stop"; $sid=[System.Security.Principal.WindowsIdentity]::GetCurrent().User; foreach($p in @($env:MULTIVIEW_VAL_TEST_CAPTURE,' +
            '(Join-Path $env:MULTIVIEW_VAL_TEST_CAPTURE "val-starfish.elf"),(Join-Path $env:MULTIVIEW_VAL_TEST_CAPTURE "inventory.json"))){' +
            '$a=Get-Acl -LiteralPath $p; $r=@($a.GetAccessRules($true,$true,[System.Security.Principal.SecurityIdentifier])); if($a.GetOwner([System.Security.Principal.SecurityIdentifier]) -ne $sid -or ' +
            '$r.Count -ne 1 -or $r[0].IdentityReference -ne $sid -or $r[0].AccessControlType -ne "Allow"){throw "ACL"}}';
        const acl = spawnSync('pwsh.exe', ['-NoProfile', '-NonInteractive', '-Command', script], {env: {...process.env, MULTIVIEW_VAL_TEST_CAPTURE: output}, windowsHide: true, timeout: 5000, stdio: 'ignore'});
        assert.equal(acl.status, 0); cases++;
    }
    const childPlan = spawnSync(process.execPath, ['scripts/collect-val-library.cjs', '--plan'], {encoding: 'utf8'}); assert.equal(childPlan.status, 0, childPlan.stderr); assert.equal(JSON.parse(childPlan.stdout).TVConnections, 0);
    const refusal = spawnSync(process.execPath, ['scripts/collect-val-library.cjs'], {encoding: 'utf8'}); assert.equal(refusal.status, 1); assert(!refusal.stderr.includes('PRIVATE')); cases++;
    assert.equal(forbiddenImports, 0); assert.equal(credentialReads, 0); Module._load = originalLoad; fs.readFileSync = originalRead; clearTimeout(watchdog);
    console.log(JSON.stringify({status: 'passed', acceptanceCases: cases, TVConnections: 0, credentialReads, forbiddenImports, syntheticCapture: output}));
})().catch(e => { clearTimeout(watchdog); Module._load = originalLoad; fs.readFileSync = originalRead; console.error(e); process.exitCode = 1; });
