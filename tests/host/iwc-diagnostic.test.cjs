// Core acceptance cases; mock SSH/SFTP/clock only. No network or TV execution.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const {EventEmitter} = require('node:events');
const {COMMAND, PINS, parseReply} = require('../../scripts/iwc-diagnostic.cjs');
const source = fs.readFileSync(require.resolve('../../scripts/iwc-diagnostic.cjs'), 'utf8');
const {collect} = (() => {
    const context = {module: {exports: {}}, Buffer, AbortController, Date, require(name) {
        if (name !== 'node:crypto') return require(name);
        // Digest verification is mocked; simulate a matching saved evidence file
        // only when every byte and its exact length match that pin's fixture.
        return {createHash: () => ({data: null, update(data) { this.data = data; return this; }, digest() {
            const pin = PINS.find((p, i) => this.data.equals(Buffer.alloc(p.bytes, i + 1)));
            return pin?.sha256 || 'mismatched-digest';
        }})};
    }};
    vm.runInNewContext(source, context);
    return context.module.exports;
})();
function clock() {
    let time = 0, next = 0;
    const tasks = new Map();
    return {now: () => time, tasks,
        setTimeout(fn, ms) { const id = ++next; tasks.set(id, {fn, at: time + ms}); return id; },
        clearTimeout(id) { tasks.delete(id); },
        tick(ms) {
            const target = time + ms;
            for (;;) {
                const row = [...tasks].filter(([, t]) => t.at <= target).sort((a, b) => a[1].at - b[1].at)[0];
                if (!row) break;
                tasks.delete(row[0]); time = row[1].at; row[1].fn();
            }
            time = target;
        }};
}
const flush = () => new Promise(resolve => setImmediate(resolve));
const window = {publishId: 123, appId: 'com.webos.app.hdmi1', windowId: 'PRIVATE-FIXTURE', width: 1920, height: 1080};
const reply = list => Buffer.from(JSON.stringify({returnValue: true, publishedWindows: list}));
function setup({badHash, badMode, symlink, slowPreflight = false, lateConnect = false} = {}) {
    const time = clock(), channel = new EventEmitter(), client = new EventEmitter();
    channel.stderr = new EventEmitter();
    const signals = [], commands = [];
    channel.signal = (name, cb) => { signals.push(name); cb?.(); };
    channel.destroy = () => {};
    let releaseRead;
    const sftp = {
        lstat(p, cb) {
            const i = PINS.findIndex(x => x.path === p); assert(i >= 0);
            cb(null, {isFile: () => !symlink, size: PINS[i].bytes,
                mode: i === 0 ? (badMode ? 0o755 : 0o700) : 0o644});
        },
        open(p, flags, cb) { assert.equal(flags, 'r'); cb(null, PINS.findIndex(x => x.path === p)); },
        read(handle, data, offset, length, position, cb) {
            assert.equal(offset, position);
            const n = Math.min(length, PINS[handle].bytes - position);
            if (n > 0) data.fill(badHash ? 99 : handle + 1, offset, offset + n);
            if (slowPreflight) releaseRead = () => cb(null, n);
            else cb(null, n);
        },
        close(handle, cb) { cb(); }, end() {}
    };
    client.sftp = cb => cb(null, sftp);
    client.exec = (command, options, cb) => { commands.push(command); assert.equal(options.pty, false); cb(null, channel); };
    client.destroy = () => { client.emit('close'); };
    let resolveConnection, connectSignal;
    const connection = new Promise(resolve => { resolveConnection = resolve; });
    const connect = signal => { connectSignal = signal; return lateConnect ? connection : Promise.resolve(client); };
    const abort = new AbortController();
    const result = collect(connect, {signal: abort.signal, timers: time, now: time.now});
    return {time, channel, client, signals, commands, result, abort,
        releaseRead: () => releaseRead(),
        connectSignal: () => connectSignal, resolveConnection: () => resolveConnection(client),
        close(code = 0, signal) { channel.emit('exit', code, signal); channel.emit('close'); }};
}
(async () => {
    assert.equal(COMMAND, 'exec /usr/bin/luna-send -n 1 -w 2000 ' +
        "'luna://com.webos.service.iwc/listPublishedWindows' '{\"subscribe\":false}'");
    assert(!/setExportedWindow|Crop| -m | -a | -s | -t | -i /.test(COMMAND));
    const ok = setup(); await flush();
    assert.deepEqual(ok.commands, [COMMAND]);
    const payload = reply([window]);
    ok.channel.emit('data', payload.subarray(0, 13)); ok.channel.emit('data', payload.subarray(13)); ok.close();
    const report = await ok.result;
    assert.equal(report.status, 'read_admission_passed');
    assert.equal(report.publicationCount, 1); assert.equal(report.hdmiCandidateCount, 1);
    assert.equal(report.utilityExitConfirmed, true); assert.equal(report.verifiedBindings.length, 8);
    assert(!JSON.stringify(report).includes('PRIVATE-FIXTURE')); assert.equal(ok.time.tasks.size, 0);

    for (const option of [{badHash: true}, {badMode: true}, {symlink: true}]) {
        const f = setup(option); const r = await f.result;
        assert.equal(r.status, 'preflight_failed'); assert.equal(f.commands.length, 0);
        assert.equal(r.executionRequested, false);
    }
    const valid = parseReply(reply([])); assert.equal(valid.publicationCount, 0);
    assert.equal(parseReply(Buffer.from('{"returnValue":false,"errorText":"SECRET"}')).status, 'service_rejected');
    for (const bad of [Buffer.from(''), Buffer.from('garbage'), Buffer.from('{}'), Buffer.from('null'),
        Buffer.from('{"returnValue":true,"publishedWindows":[],"subscribed":true}'),
        Buffer.from(reply([]).toString() + '{}'), Buffer.from([0xff]), Buffer.alloc(32769),
        reply([window, window]), reply(Array.from({length: 65}, (_, i) => ({...window, publishId: i}))),
        reply([{...window, width: 0}]), reply([{...window, publishId: -1}]),
        reply([{...window, windowId: '\0SECRET'}])]) assert.throws(() => parseReply(bad));

    for (const kind of ['empty', 'nonzero', 'signal', 'no-exit', 'service-error']) {
        const f = setup(); await flush();
        if (kind !== 'empty') f.channel.emit('data', kind === 'service-error' ? Buffer.from('{"returnValue":false}') : reply([]));
        if (kind === 'no-exit') f.channel.emit('close');
        else f.close(kind === 'nonzero' ? 1 : 0, kind === 'signal' ? 'TERM' : undefined);
        const r = await f.result;
        assert.notEqual(r.status, 'read_admission_passed'); assert.equal(r.publicationCount, null);
    }
    for (const kind of ['oversized', 'stderr', 'cancel', 'deadline']) {
        const f = setup(); await flush();
        if (kind === 'oversized') f.channel.emit('data', Buffer.alloc(32769));
        if (kind === 'stderr') f.channel.stderr.emit('data', Buffer.from('SECRET'));
        if (kind === 'cancel') f.abort.abort();
        if (kind === 'deadline') f.time.tick(6500);
        assert.equal(f.signals[0], 'TERM'); f.time.tick(500); assert.equal(f.signals[1], 'KILL');
        f.time.tick(500);
        const r = await f.result;
        assert.equal(r.cleanupConfirmed, false); assert.equal(r.utilityExitConfirmed, false);
        assert.notEqual(r.status, 'read_admission_passed'); assert.equal(f.time.tasks.size, 0);
        assert(!JSON.stringify(r).includes('SECRET'));
        f.channel.emit('data', reply([])); f.close(); // Late events cannot rewrite the settled result.
        assert.equal(r.utilityExitConfirmed, false);
    }
    const graceful = setup(); await flush(); graceful.abort.abort(); graceful.close(null, 'TERM');
    assert.equal((await graceful.result).cleanupConfirmed, true);
    const late = setup({lateConnect: true}); late.time.tick(6500);
    assert.equal((await late.result).executionRequested, false); assert(late.connectSignal().aborted);
    late.resolveConnection(); await flush(); assert.equal(late.commands.length, 0);
    const broken = setup(); await flush(); broken.client.emit('error', Error('PRIVATE'));
    broken.close(null, 'TERM'); assert.equal((await broken.result).status, 'transport_failed');
    const slow = setup({slowPreflight: true}); await flush(); slow.time.tick(6500);
    const expired = await slow.result; slow.releaseRead(); await flush();
    assert.equal(slow.commands.length, 0); assert.equal(expired.verifiedBindings.length, 0);
    assert.equal(expired.executionRequested, false);
    console.log('IWC diagnostic acceptance passed: fixed command, pinned preflight, strict/redacted replies, exit evidence, deadlines and cancellation');
})().catch(e => { console.error(e); process.exitCode = 1; });
