// Scope, evidence binding and operational-bound acceptance. All remote operations are synthetic.
const assert = require('node:assert/strict'), {EventEmitter} = require('node:events');
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), Module = require('node:module');
const {spawnSync} = require('node:child_process'), originalLoad = Module._load, originalRead = fs.readFileSync;
let cases = 0, forbiddenImports = 0, credentialReads = 0, stage = 'start';
const watchdog = setTimeout(() => { throw Error('Acceptance stalled: ' + stage); }, 20000);
Module._load = function(name, ...args) {
    if (/ssh2|resource-client-connection|hdmi-element-connection|phase1-device|^(node:)?net$/.test(name)) { forbiddenImports++; throw Error('Live transport forbidden'); }
    return originalLoad.call(this, name, ...args);
};
fs.readFileSync = function(file, ...args) {
    if (/novacom-devices|[\\/]\.ssh[\\/]/.test(String(file))) { credentialReads++; throw Error('Credential read forbidden'); }
    return originalRead.call(this, file, ...args);
};
const {collect, contract, seeds, parents, descriptorBinding, elfIdentity} = require('../../scripts/videooutput-collector.cjs');
const descriptor = Buffer.from('[D-BUS Service]\nName=com.webos.service.videooutput\nExec=/usr/sbin/videooutputd\nType=static\n');
function elf(bits = 32, big = false) {
    const b = Buffer.alloc(bits === 32 ? 52 : 64); b.write('\x7fELF', 'ascii'); b[4] = bits === 32 ? 1 : 2; b[5] = big ? 2 : 1; b[6] = 1;
    const u16 = (v, p) => big ? b.writeUInt16BE(v, p) : b.writeUInt16LE(v, p);
    u16(3, 16); u16(bits === 32 ? 40 : 183, 18); big ? b.writeUInt32BE(1, 20) : b.writeUInt32LE(1, 20); u16(b.length, bits === 32 ? 40 : 52); return b;
}
const meta = (type, size = 0) => ({mode: ({file: 0o100000, directory: 0o040000, link: 0o120000, other: 0o020000}[type]) | 0o444, uid: 1, gid: 1, size, mtime: 10});
const failure = code => Object.assign(Error('PRIVATE_VENDOR_TEXT'), {code});
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
function fixture({text = descriptor, elfSize = 128, header = elf(), hooks = {}, closeConnection = true, closeSubsystem = true} = {}) {
    const clock = new Clock(), files = new Map(parents.map(p => [p, {attrs: meta('directory')}]));
    files.set(seeds[0].path, {attrs: meta('file', text.length), data: text, size: text.length});
    files.set(seeds[1].path, {attrs: meta('file', elfSize), data: header, size: elfSize});
    const log = [], counts = {}, client = new EventEmitter(), sftp = new EventEmitter();
    let started = 0, destroyed = 0, verified = true, completed, active = 0, retained = 0, next = 0;
    const dispatch = (method, args, cb, body) => {
        counts[method] = (counts[method] || 0) + 1; const entry = {method, args, at: clock.now(), index: counts[method]}; log.push(entry);
        if (hooks[method]?.({entry, files, cb, clock, client, sftp}) !== true) body();
    };
    for (const method of ['lstat', 'stat']) sftp[method] = (name, cb) => dispatch(method, [name], cb, () => files.has(name) ? cb(null, {...files.get(name).attrs}) : cb(failure(2)));
    sftp.open = (name, flags, cb) => dispatch('open', [name, flags], cb, () => { assert.equal(flags, 'r'); assert.equal(active, 0); active++; cb(null, {path: name}); });
    sftp.fstat = (h, cb) => dispatch('fstat', [h.path], cb, () => cb(null, {...files.get(h.path).attrs}));
    sftp.read = (h, b, offset, length, position, cb) => dispatch('read', [h.path, length, position], cb, () => {
        assert(length >= 1 && length <= contract.chunkBytes); const file = files.get(h.path), n = Math.max(0, Math.min(length, file.size - position));
        b.fill(0, offset, offset + n); if (position < file.data.length) file.data.copy(b, offset, position, Math.min(position + n, file.data.length)); cb(null, n);
    });
    sftp.close = (h, cb) => dispatch('close', [h.path], cb, () => { assert.equal(active, 1); active--; cb(null); });
    for (const name of ['exec', 'readdir', 'readlink', 'realpath', 'write', 'unlink', 'chmod', 'rename', 'setstat', 'fsetstat']) {
        sftp[name] = client[name] = () => { throw Error('Forbidden operation ' + name); };
    }
    sftp.end = () => { log.push({method: 'sftp.end'}); if (closeSubsystem) sftp.emit('close'); };
    client.sftp = cb => dispatch('sftp', [], cb, () => cb(null, sftp));
    client.end = () => { log.push({method: 'client.end'}); if (closeConnection) client.emit('close'); };
    client.destroy = () => { destroyed++; if (closeConnection) client.emit('close'); };
    const sink = {begin(name) {
        assert.equal(name, seeds[next++].name); const digest = crypto.createHash('sha256'); let bytes = 0;
        return {write(b) { hooks.write?.(); retained += b.length; bytes += b.length; digest.update(b); },
            finish() { hooks.finish?.(); return {bytes, sha256: digest.digest('hex'), localFile: name}; }};
    }, complete(r) { hooks.complete?.(); assert.equal(completed, undefined); completed = r; }};
    const factory = () => { hooks.factory?.({clock}); return {client, hostKeyVerified: () => verified, start() {
        started++; assert.equal(started, 1); dispatch('connect', [], () => {}, () => client.emit('ready'));
    }}; };
    return {run: signal => collect({allowOneRead: true, connectionFactory: factory, sink, signal, clock}), factory,
        files, clock, log, counts, client, sftp, sink, unverify() { verified = false; },
        get starts() { return started; }, get destroyed() { return destroyed; }, get retained() { return retained; }, get completed() { return completed; }};
}
const drain = async () => { for (let i = 0; i < 1500; i++) await Promise.resolve(); };
async function outcome(f, reason) {
    const r = await f.run(); cases++; assert.equal(r.status, 'partial'); assert.equal(r.stopReason, reason);
    assert(!JSON.stringify(r).includes('PRIVATE_VENDOR_TEXT')); assert(f.starts <= 1); assert((f.counts.open || 0) <= 2); return r;
}
(async () => {
    stage = 'binding and success'; let f = fixture(), r = await f.run(); cases++;
    assert.equal(r.status, 'retrieved'); assert.equal(r.opens, 2); assert.equal(r.savedBytes, descriptor.length + 128);
    assert.deepEqual(r.descriptorBinding, {service: 'com.webos.service.videooutput', executable: seeds[1].path, directExec: true});
    assert.equal(r.connectionAttempts, 1); assert.equal(r.sftpAttempts, 1); assert(r.handlesClosed && r.subsystemClosed && r.connectionClosed);
    assert.equal(f.clock.timers.size, 0); assert.equal(f.counts.close, 2);
    const opens = f.log.filter(x => x.method === 'open'); assert.deepEqual(opens.map(x => x.args[0]), seeds.map(s => s.path));
    assert(f.log.indexOf(f.log.find(x => x.method === 'close')) < f.log.indexOf(opens[1]));
    assert(f.log.filter(x => ['lstat', 'stat'].includes(x.method)).every(x => [...parents, ...seeds.map(s => s.path)].includes(x.args[0])));
    for (const [bits, big] of [[32, false], [64, false], [64, true]]) { assert.equal(elfIdentity(elf(bits, big)).classBits, bits); cases++; }
    const accepted = '[D-BUS Service]\nName=com.webos.service.videooutput;com.webos.service.videooutput.display;\nExec=/usr/sbin/videooutputd --mode=static\n';
    assert.equal(descriptorBinding(Buffer.from(accepted)).directExec, true); cases++;
    const badExec = ['/usr/bin/videooutputd', '/bin/sh /usr/sbin/videooutputd',
        ...[';touch x', ' $(x)', ' | x', ' && x', ' "$x"', ' %s', '\\x'].map(s => '/usr/sbin/videooutputd' + s)];
    const badDescriptor = [descriptor.toString().replace('Name=com.webos.service.videooutput', 'Name=other'), descriptor.toString() + 'Exec=/usr/sbin/videooutputd\n',
        descriptor.toString() + '[D-BUS Service]\n', descriptor.toString().replace('[D-BUS Service]', '[Other]'), '\0', '\u00ff', '#\n'.repeat(513),
        descriptor.toString().replace('Name=com.webos.service.videooutput', 'Name=com.webos.service.videooutput;other')];
    for (const [text, reason] of [...badExec.map(s => [descriptor.toString().replace('Exec=/usr/sbin/videooutputd', 'Exec=' + s), 'exec_binding']),
        ...badDescriptor.map(s => [s, 'descriptor']), ['', 'file_bound']]) {
        f = fixture({text: Buffer.from(text)}); await outcome(f, reason);
        assert((f.counts.open || 0) <= 1); assert(!f.log.some(x => ['open', 'read'].includes(x.method) && x.args[0] === seeds[1].path));
    }
    stage = 'file and aggregate bounds';
    f = fixture({elfSize: contract.totalBytes - descriptor.length}); r = await f.run(); cases++;
    assert.equal(r.status, 'retrieved'); assert.equal(r.savedBytes, contract.totalBytes); assert(r.readCalls <= 515);
    const padded = Buffer.concat([descriptor, Buffer.from('#' + 'x'.repeat(seeds[0].cap - descriptor.length - 1))]);
    f = fixture({text: padded}); r = await f.run(); cases++; assert.equal(r.status, 'retrieved'); assert.equal(r.files[0].bytes, seeds[0].cap);
    for (const [index, size] of [[0, 0], [0, 65537], [1, 0], [1, contract.totalBytes], [1, contract.totalBytes + 1]]) {
        f = fixture(); f.files.get(seeds[index].path).attrs.size = size; await outcome(f, 'file_bound'); assert.equal(f.counts.open || 0, index);
    }
    for (const name of [...parents, ...seeds.map(s => s.path)]) {
        f = fixture(); f.files.get(name).attrs = meta('link', 20); await outcome(f, 'link_bound');
    }
    for (const type of ['directory', 'other']) { f = fixture(); f.files.get(seeds[0].path).attrs = meta(type, 20); await outcome(f, 'metadata'); assert(!f.counts.open); }
    for (const index of [0, 1]) { f = fixture(); f.files.delete(seeds[index].path); await outcome(f, 'absent'); assert.equal(f.counts.open || 0, index); }
    f = fixture({header: Buffer.alloc(64)}); await outcome(f, 'elf_header');
    for (const code of [3, 4]) { f = fixture({hooks: {lstat({cb}) { cb(failure(code)); return true; }}}); await outcome(f, code === 3 ? 'permission_denied' : 'operation_failed'); }
    stage = 'identity and stream refusal';
    for (const field of ['mode', 'uid', 'gid', 'size', 'mtime']) {
        f = fixture({hooks: {fstat({entry, files, cb}) { const a = files.get(entry.args[0]).attrs; cb(null, {...a, [field]: a[field] + 1}); return true; }}});
        await outcome(f, 'changed'); assert(!f.counts.read); assert.equal(f.counts.close, 1);
    }
    f = fixture({hooks: {stat({entry, files, cb}) { cb(null, {...files.get(entry.args[0]).attrs, mtime: 11}); return true; }}}); await outcome(f, 'changed'); assert(!f.counts.open);
    f = fixture({hooks: {read({entry, files}) { if (entry.args[0] === seeds[1].path) files.get(seeds[0].path).attrs.mtime++; }}}); await outcome(f, 'changed');
    f = fixture({hooks: {read({files}) { files.get('/usr').attrs.mtime++; }}}); await outcome(f, 'changed'); assert.equal(f.counts.open, 1);
    f = fixture(); f.files.get('/usr').attrs.mtime = NaN; await outcome(f, 'metadata');
    for (const n of [-1, 1.5, 65537, undefined]) { f = fixture({hooks: {read({cb}) { cb(null, n); return true; }}}); await outcome(f, 'read_bound'); }
    f = fixture({hooks: {read({cb}) { cb(null, 0); return true; }}}); await outcome(f, 'short_file');
    f = fixture(); f.files.get(seeds[0].path).size++; await outcome(f, 'growth');
    f = fixture({hooks: {read({cb}) { cb(null, 1); return true; }}}); f.files.get(seeds[0].path).attrs.size = 65536;
    r = await outcome(f, 'read_bound'); assert.equal(r.readCalls, 2049); assert.equal(f.counts.open, 1);
    for (const method of ['write', 'finish', 'complete']) { f = fixture({hooks: {[method]() { throw Error('PRIVATE_VENDOR_TEXT'); }}}); await outcome(f, 'local_io'); }
    stage = 'deadlines and cancellation';
    for (const duration of [27000, 30000]) {
        f = fixture({hooks: {factory({clock}) { clock.time = duration; }}}); await outcome(f, duration === 30000 ? 'total_deadline' : 'work_deadline'); assert.equal(f.starts, 0);
    }
    f = fixture({hooks: {connect() { return true; }}}); let job = f.run(); await drain(); f.clock.tick(3000); await drain(); r = await job; cases++;
    assert.equal(r.stopReason, 'operation_timeout'); assert(!f.counts.sftp); assert.equal(f.destroyed, 1);
    let late; f = fixture({hooks: {read({cb}) { late = cb; return true; }}}); job = f.run(); await drain(); f.clock.tick(3000); await drain(); r = await job; cases++;
    assert.equal(r.status, 'partial'); assert.equal(r.stopReason, 'operation_timeout'); const frozen = JSON.stringify(r), retained = f.retained; late(null, 1); await drain();
    f.client.emit('close'); f.sftp.emit('close'); assert.equal(JSON.stringify(r), frozen); assert.equal(f.retained, retained);
    f = fixture({hooks: {factory({clock}) { clock.time = 26999; }, read() { return true; }}}); job = f.run(); await drain(); f.clock.tick(1); await drain(); r = await job; cases++;
    assert.equal(r.stopReason, 'work_deadline'); assert.equal(r.elapsedMs, 27000); assert.equal(f.counts.close, 1); assert.equal(f.counts.open, 1);
    f = fixture({hooks: {read({clock}) { clock.time = 29999; }, close() { return true; }}}); job = f.run(); await drain(); f.clock.tick(1); await drain(); r = await job; cases++;
    assert.equal(r.elapsedMs, 30000); assert.equal(r.status, 'partial'); assert.equal(f.counts.close, 1); assert.equal(f.destroyed, 1);
    f = fixture({hooks: {close({cb}) { cb(failure(4)); return true; }}}); r = await outcome(f, 'handle_close_unconfirmed'); assert.equal(f.counts.open, 1); assert.equal(f.counts.close, 1); assert.equal(r.handlesClosed, false);
    f = fixture({hooks: {open({cb}) { late = cb; return true; }}}); job = f.run(); await drain(); f.clock.tick(3000); await drain(); r = await job; cases++;
    assert.equal(r.stopReason, 'operation_timeout'); assert.equal(r.handlesClosed, false); assert.equal(f.counts.open, 1);
    const lateSnapshot = JSON.stringify(r); late(null, {path: seeds[0].path}); await drain(); assert.equal(JSON.stringify(r), lateSnapshot); assert(!f.counts.read);
    f = fixture({hooks: {factory({clock}) { clock.time = 26999; }, close() { return true; }}}); job = f.run(); await drain(); f.clock.tick(3000); await drain(); r = await job; cases++;
    assert.equal(r.status, 'partial'); assert.equal(r.elapsedMs, 29999); assert.equal(f.counts.open, 1); assert.equal(f.counts.close, 1);
    f = fixture({hooks: {read({clock}) { clock.time += 3000; }}}); await outcome(f, 'operation_timeout'); assert.equal(f.retained, 0);
    f = fixture({hooks: {write() { f.clock.time = 27000; }}}); r = await outcome(f, 'work_deadline'); assert.equal(r.savedBytes, descriptor.length); assert.equal(f.counts.open, 1);
    const abort = new AbortController(); f = fixture({hooks: {read() { abort.abort(); return true; }}}); r = await f.run(abort.signal); cases++; assert.equal(r.stopReason, 'cancelled');
    const pre = new AbortController(); pre.abort(); f = fixture(); r = await f.run(pre.signal); cases++; assert.equal(f.starts, 0); assert.equal(r.stopReason, 'cancelled');
    f = fixture(); f.unverify(); await outcome(f, 'host_key_unverified'); assert(!f.counts.sftp);
    for (const options of [{closeConnection: false}, {closeSubsystem: false}]) {
        f = fixture(options); job = f.run(); await drain(); f.clock.tick(3000); await drain(); r = await job; cases++;
        assert.equal(r.status, 'partial'); assert.equal(f.destroyed, 1); assert.equal(r.stopReason, 'operation_timeout');
    }
    f = fixture({closeSubsystem: false}); f.sftp.end = () => f.clock.setTimeout(() => f.sftp.emit('close'), 2);
    job = f.run(); await drain(); f.clock.tick(2); await drain(); r = await job; cases++; assert.equal(r.status, 'retrieved'); assert.equal(r.elapsedMs, 2);
    stage = 'offline entry points';
    await assert.rejects(collect({allowOneRead: false, connectionFactory: f.factory, sink: f.sink})); cases++;
    const {main} = require('../../scripts/collect-videooutput.cjs'); let plan; const print = console.log;
    try { console.log = s => { plan = JSON.parse(s); }; await main(['--plan']); } finally { console.log = print; }
    assert.equal(plan.TVConnections, 0); assert.equal(plan.dispatch, false); assert.equal(plan.contract.links, 0); cases++;
    for (const args of [[], ['--plan', 'extra'], ['--allow-one-videooutput-evidence-read'],
        ['--allow-one-videooutput-evidence-read', '--device', 'fixture', 'build/other'],
        ['--allow-one-videooutput-evidence-read', '--device', 'fixture', 'build/phase-2/hdmi-videooutput-evidence-20261117-001', 'extra']]) { await assert.rejects(main(args)); cases++; }
    assert.equal(forbiddenImports, 0); assert.equal(credentialReads, 0);
    stage = 'private capture';
    const {reserveCapture} = require('../../scripts/videooutput-capture.cjs');
    const base = fs.mkdtempSync(path.resolve('build/phase-2/videooutput-host-')), output = path.join(base, 'capture');
    const capture = reserveCapture(output); assert.throws(() => capture.begin(seeds[1].name)); assert.throws(() => capture.begin('../x'));
    let file = capture.begin(seeds[0].name); assert.throws(() => capture.begin(seeds[1].name)); assert.throws(() => capture.complete({}));
    assert.throws(() => file.write(Buffer.alloc(65537))); file.write(descriptor); const saved = file.finish(); assert.equal(saved.bytes, descriptor.length);
    assert.equal(saved.sha256, crypto.createHash('sha256').update(descriptor).digest('hex')); assert.throws(() => file.finish()); assert.throws(() => file.write(Buffer.from('x')));
    assert.throws(() => capture.begin(seeds[0].name)); file = capture.begin(seeds[1].name); assert.throws(() => file.write(Buffer.alloc(contract.totalBytes)));
    file.write(elf()); file.finish(); assert.throws(() => capture.begin(seeds[1].name));
    capture.complete({synthetic: true}); assert.throws(() => capture.complete({})); assert.throws(() => reserveCapture(output)); cases++;
    if (process.platform === 'win32') {
        const script = '$ErrorActionPreference="Stop"; $sid=[System.Security.Principal.WindowsIdentity]::GetCurrent().User; ' +
            'foreach($p in @($env:MULTIVIEW_VIDEOOUTPUT_TEST_CAPTURE,(Join-Path $env:MULTIVIEW_VIDEOOUTPUT_TEST_CAPTURE "videooutput.service"),' +
            '(Join-Path $env:MULTIVIEW_VIDEOOUTPUT_TEST_CAPTURE "videooutput.elf"),(Join-Path $env:MULTIVIEW_VIDEOOUTPUT_TEST_CAPTURE "inventory.json"))){' +
            '$a=Get-Acl -LiteralPath $p; $r=@($a.GetAccessRules($true,$true,[System.Security.Principal.SecurityIdentifier])); ' +
            'if($a.GetOwner([System.Security.Principal.SecurityIdentifier]) -ne $sid -or $r.Count -ne 1 -or $r[0].IdentityReference -ne $sid -or $r[0].AccessControlType -ne "Allow"){throw "ACL"}}';
        const acl = spawnSync('pwsh.exe', ['-NoProfile', '-NonInteractive', '-Command', script], {env: {...process.env, MULTIVIEW_VIDEOOUTPUT_TEST_CAPTURE: output}, windowsHide: true, timeout: 5000, stdio: 'ignore'});
        assert.equal(acl.status, 0); cases++;
    }
    const childPlan = spawnSync(process.execPath, ['scripts/collect-videooutput.cjs', '--plan'], {encoding: 'utf8'}); assert.equal(childPlan.status, 0, childPlan.stderr); assert.equal(JSON.parse(childPlan.stdout).TVConnections, 0);
    const refused = spawnSync(process.execPath, ['scripts/collect-videooutput.cjs'], {encoding: 'utf8'}); assert.equal(refused.status, 1); assert(!refused.stderr.includes('PRIVATE')); cases++;
    fs.readFileSync = originalRead; Module._load = originalLoad; clearTimeout(watchdog);
    console.log(JSON.stringify({status: 'passed', acceptanceCases: cases, TVConnections: 0, credentialReads, forbiddenImports, syntheticCapture: output}));
})().catch(e => { clearTimeout(watchdog); Module._load = originalLoad; fs.readFileSync = originalRead; console.error(e); process.exitCode = 1; });
