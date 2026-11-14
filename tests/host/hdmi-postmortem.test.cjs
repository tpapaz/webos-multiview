// Acceptance tests for bounded read-only collection and truthful failure evidence.
const assert = require('node:assert/strict');
const {capture, base, aliases, sha256} = require('../../scripts/collect-hdmi-postmortem.cjs');
const {id, version} = require('../../scripts/hdmi-window-report.cjs');
const binary = Buffer.from('synthetic ELF'), appinfo = Buffer.from('{}');
const expected = {binarySha256: sha256(binary), manifestSha256: sha256(appinfo)};
const report = {schemaVersion: 1, appId: id, appVersion: version, mode: 'picture', elapsedMs: 10,
    status: 'setup_failed', port: 4, opened: false, selected: false, stopAcknowledged: false,
    closeAcknowledged: false, acquisitionUncertain: false, localCleanup: true,
    hardwareRelease: 'unknown', livePicture: 'unknown', restoration: 'unknown', dualHdmi: 'unknown'};
const valid = Buffer.from(JSON.stringify(report));
const error = code => Object.assign(Error('PRIVATE_IDENTIFIER_CREDENTIAL'), {code});
function fixture({reports = [null, null], modes = false, denied = false, broken = false,
    hang = false, processDenied = false, oversized = false} = {}) {
    const files = new Map([[base + '/multiview-hdmi-window', binary], [base + '/appinfo.json', appinfo]]);
    reports.forEach((bytes, i) => { if (bytes !== null) files.set(aliases[i], bytes); });
    const calls = [], events = [];
    let connections = 0, destroyed = 0;
    const stat = (name, directory = false) => ({mode: (directory ? 0o40000 : 0o100000) |
        (modes ? 0o777 : name.endsWith('appinfo.json') ? 0o644 : 0o755), uid: 1000, gid: 1000,
        size: directory ? 0 : oversized && name === aliases[0] ? 2049 : files.get(name).length,
        mtime: 100, isFile: () => !directory, isDirectory: () => directory});
    const sftp = {
        lstat(name, cb) {
            calls.push(['lstat', name]);
            if (broken && name === aliases[0]) return cb(error('ECONNRESET'));
            if (denied && name === aliases[0]) return cb(error(3));
            if (files.has(name)) cb(null, stat(name));
            else if (aliases.some(alias => alias.slice(0, alias.lastIndexOf('/')) === name)) cb(null, stat(name, true));
            else cb(error(2));
        },
        open(name, flags, cb) { calls.push(['open', name, flags]); assert.equal(flags, 'r'); cb(null, name); },
        fstat(handle, cb) { cb(null, stat(handle)); },
        read(handle, buffer, offset, length, position, cb) {
            calls.push(['read', handle, length]);
            assert(length <= (aliases.includes(handle) ? 2048 : 32768));
            const bytes = files.get(handle).subarray(position, position + length);
            bytes.copy(buffer, offset); cb(null, bytes.length);
        },
        close(handle, cb) { cb(null); },
        readdir(name, cb) { calls.push(['readdir', name]); assert.equal(name, '/proc'); cb(null, [{filename: '123'}]); },
        readlink(name, cb) {
            calls.push(['readlink', name]);
            cb(processDenied ? error(3) : null, '/private/unrelated-process');
        }
    };
    const connect = async () => {
        connections++;
        return {sftp(cb) { if (!hang) cb(null, sftp); }, destroy() { destroyed++; }};
    };
    return {run: () => capture(connect, expected, e => events.push(e), hang ? 10 : 30000),
        calls, events, connections: () => connections, destroyed: () => destroyed};
}
(async () => {
    for (const [bytes, state] of [[null, 'absent'], [Buffer.alloc(0), 'empty'], [Buffer.from('{'), 'invalid'], [valid, 'valid']]) {
        const f = fixture({reports: [bytes, null], modes: true});
        const r = await f.run();
        assert.equal(r.status, 'completed');
        assert.equal(r.installed.executable.hashMatches, true);
        assert.equal(r.installed.executable.metadataMatches, false);
        assert.equal(r.reports[0].state, state); // Mode mismatch never hides report findings.
        assert.equal(r.reports[0].parent.state, 'present');
        assert.equal(r.process.state, 'absent');
        assert.equal(r.nativeEntry, 'unknown');
        assert.equal(f.connections(), 1); assert(f.destroyed() > 0);
        assert(!JSON.stringify(r).includes('PRIVATE'));
        assert(!JSON.stringify(r).includes('unrelated-process'));
    }
    let r = await fixture({reports: [valid, Buffer.alloc(0)]}).run();
    assert.equal(r.aliasComparison, 'conflicting');
    r = await fixture({reports: [valid, valid]}).run();
    assert.equal(r.aliasComparison, 'identical_bytes');
    r = await fixture({denied: true, reports: [null, valid], processDenied: true}).run();
    assert.equal(r.reports[0].state, 'unreadable');
    assert.equal(r.reports[1].state, 'valid');
    assert.equal(r.process.state, 'unknown');
    assert(r.stages.some(e => e.stage === 'report.host.lstat' && e.outcome === 'permission_denied'));
    const large = fixture({reports: [valid, null], oversized: true});
    r = await large.run();
    assert.equal(r.reports[0].reason, 'exceeds_cap');
    assert(!large.calls.some(c => c[0] === 'read' && c[1] === aliases[0]));
    const broken = fixture({broken: true});
    r = await broken.run();
    assert.equal(r.status, 'incomplete');
    assert.equal(r.failure, 'transport_or_local_failure');
    assert(r.stages.some(e => e.stage === 'report.host.lstat' && e.outcome === r.failure));
    assert.equal(r.installed.executable.hashMatches, true);
    assert.equal(broken.connections(), 1);
    const hanging = fixture({hang: true});
    r = await hanging.run();
    assert.equal(r.failure, 'deadline');
    assert(r.stages.some(e => e.stage === 'sftp' && e.outcome === 'deadline'));
    assert.equal(hanging.connections(), 1); assert(hanging.destroyed() > 0);
    console.log('Postmortem report states, conflicts, mode independence, privacy, failed stages and deadline passed; zero TV connections');
})().catch(e => { console.error(e); process.exitCode = 1; });
