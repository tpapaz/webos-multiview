const assert = require('node:assert/strict');
const {EventEmitter} = require('node:events');
const {run, hash, base, aliases, commandFor} = require('../../scripts/run-entry-diagnostic.cjs');
const {project} = require('../../scripts/entry-exit-evidence.cjs');
const {id, version} = require('../../scripts/entry-diagnostic-report.cjs');
const boot = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
const main = {schemaVersion: 1, appId: id, diagnosticVersion: version, event: 'main_entered', reservation: 'reserved'};
const trace = Buffer.from([main, {event: 'parser', outcome: 'picture_accepted'},
    {event: 'guard', bootRead: 'available', bootMatch: 'match', boottime: 'within', realtime: 'within', allowed: true},
    {event: 'exit_intent', code: 0}].map(JSON.stringify).join('\n') + '\n');
const execLine = 'app launch exec(' + base + '/multiview-hdmi-window ' + JSON.stringify({acquireHdmi4: true,
    launchBootId: boot, launchStartByBoottimeMs: 4000, launchStartByRealtimeMs: 7000, nid: 'PRIVATE_SECRET'}) + ')';
const closeLine = ' SAM APP_CLOSED ' + JSON.stringify({app_id: id, pid: 9876, type: 'native', exit_status: 0});
const ownLog = Buffer.from(execLine + '\n' + closeLine + '\n');
let evidence = project(ownLog);
assert.deepEqual(evidence.termination, {state: 'normal_exit', code: 0});
assert(!JSON.stringify(evidence).includes('PRIVATE_SECRET'));
assert(!JSON.stringify(evidence).includes(boot));
assert(!JSON.stringify(evidence).includes('9876'));
assert.equal(project(Buffer.from(closeLine)).termination.state, 'unknown');
assert.equal(project(Buffer.concat([ownLog, ownLog])).termination.state, 'unknown');
assert.equal(project(Buffer.from(execLine + '\n' + closeLine.replace('"exit_status":0', '"exit_status":16384'))).termination.code, 64);
assert.equal(project(Buffer.from(execLine + '\n' + closeLine.replace('"exit_status":0', '"exit_status":11'))).termination.signal, 11);
assert.equal(project(Buffer.from(closeLine.replace(id, 'other'))).rows.length, 0);
assert.throws(() => commandFor({acquireHdmi4: true, launchBootId: "'; private", launchStartByBoottimeMs: 1, launchStartByRealtimeMs: 2}));
function fixture({mismatch = false, existing = false, deniedReport = false, hang = false} = {}) {
    const binary = Buffer.from('synthetic ELF'), manifest = Buffer.from('{}');
    const pkg = {binarySha256: hash(binary), manifestSha256: hash(manifest)};
    const files = new Map([[base + '/multiview-hdmi-window', binary], [base + '/appinfo.json', manifest],
        ['/proc/sys/kernel/random/boot_id', Buffer.from(boot + '\n')], ['/proc/uptime', Buffer.from('1.00 1.00\n')],
        ['/var/log/messages', Buffer.from('old unrelated log\n')]]);
    if (existing) files.set(aliases[0], trace);
    const events = []; let commands = 0, connections = 0, destroyed = false;
    const error = code => Object.assign(Error('PRIVATE_SECRET'), {code});
    const stat = name => ({mode: 0o100000 | (mismatch ? 0o777 : name.endsWith('appinfo.json') ? 0o644 : 0o755),
        uid: 1000, gid: 1000, mtime: 1, size: name.startsWith('/proc/') ? 0 : files.get(name).length,
        isFile: () => true, isDirectory: () => false});
    const sftp = {
        lstat(name, cb) {
            if (deniedReport && commands && name === aliases[0]) { cb(error(3)); return; }
            if (files.has(name)) cb(null, stat(name)); else cb(error(2));
        },
        open(name, flags, cb) { assert.equal(flags, 'r'); assert(files.has(name)); cb(null, name); },
        fstat(name, cb) { cb(null, stat(name)); },
        read(name, b, offset, length, position, cb) {
            assert(length <= (aliases.includes(name) ? 2048 : 32768));
            const data = files.get(name).subarray(position, position + length); data.copy(b, offset); cb(null, data.length);
        },
        close(name, cb) { cb(null); },
        readdir(name, cb) { assert.equal(name, '/proc'); cb(null, [{filename: '123'}]); },
        readlink(name, cb) { cb(null, '/private/unrelated-process'); }
    };
    const client = new EventEmitter();
    client.sftp = cb => { if (!hang) cb(null, sftp); };
    client.destroy = () => { destroyed = true; client.emit('close'); };
    client.exec = (command, cb) => {
        if (command === 'date +%s') {
            const stream = new EventEmitter(); stream.stderr = new EventEmitter(); stream.destroy = () => {};
            cb(null, stream); queueMicrotask(() => { stream.emit('data', Buffer.from('1700000000\n')); stream.emit('close', 0, null); }); return;
        }
        commands++; assert.equal(commands, 1); assert(command.startsWith("/usr/bin/luna-send -n 1 -w 2000 'luna://com.webos.applicationManager/launch'"));
        files.set(aliases[0], trace); files.set(aliases[1], trace);
        files.set('/var/log/messages', Buffer.concat([files.get('/var/log/messages'), ownLog]));
        const stream = new EventEmitter(); stream.stderr = new EventEmitter(); stream.destroy = () => {};
        cb(null, stream); queueMicrotask(() => { stream.emit('data', Buffer.from('{"returnValue":true}')); stream.emit('close', 0, null); });
    };
    return {run: () => run(async () => { connections++; return client; }, pkg, e => events.push(e), () => {},
        {wait: async () => {}, timeoutMs: hang ? 10 : 30000}), commands: () => commands,
        connections: () => connections, destroyed: () => destroyed, events};
}
(async () => {
    const f = fixture(); const r = await f.run();
    assert.equal(r.status, 'completed'); assert.equal(f.commands(), 1); assert.equal(f.connections(), 1); assert(f.destroyed());
    assert.equal(r.acknowledgment, 'accepted'); assert.equal(r.aliasComparison, 'identical_bytes');
    assert(r.reports.every(r => r.state === 'valid')); assert.equal(r.log.projection.termination.code, 0);
    assert(!JSON.stringify(r).includes('PRIVATE_SECRET')); assert(!JSON.stringify(r).includes(boot));
    for (const options of [{mismatch: true}, {existing: true}]) {
        const f = fixture(options), r = await f.run();
        assert.equal(r.failure, 'binding_or_readiness'); assert.equal(f.commands(), 0); assert.equal(r.launchCount, 0); assert(f.destroyed());
    }
    const denied = await fixture({deniedReport: true}).run();
    assert.equal(denied.reports[0].state, 'unreadable'); assert.equal(denied.reports[1].state, 'valid');
    assert(denied.stages.some(e => e.stage === 'after.report.host.lstat' && e.outcome === 'unreadable'));
    const hanging = fixture({hang: true}), timed = await hanging.run();
    assert.equal(timed.failure, 'deadline'); assert.equal(hanging.commands(), 0); assert(hanging.destroyed());
    console.log('Inert one-shot, readiness refusal, sanitized own-exit correlation, report independence and deadline passed; zero TV connections');
})().catch(e => { console.error(e); process.exitCode = 1; });
