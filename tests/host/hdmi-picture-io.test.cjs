const assert = require('node:assert/strict');
const {openIo, commandFor} = require('../../scripts/hdmi-picture-io.cjs');
const {id, version, filename} = require('../../scripts/hdmi-picture-report.cjs');
const alias = '/tmp/' + id + '/' + filename('picture'), jail = '/var/palm/jail/' + id + alias;
const report = {schemaVersion: 1, appId: id, appVersion: version, mode: 'picture', elapsedMs: 10,
    status: 'setup_failed', port: 4, opened: false, selected: false, stopAcknowledged: false,
    closeAcknowledged: false, acquisitionUncertain: false, localCleanup: true,
    hardwareRelease: 'unknown', livePicture: 'unknown', restoration: 'unknown', dualHdmi: 'unknown'};
async function fixture(files, denied = false) {
    const reads = [];
    const stat = name => ({mode: 0o100777, uid: 1, gid: 1, size: files.get(name).length, mtime: 1,
        isFile: () => true, isDirectory: () => false});
    const s = {
        lstat(name, cb) {
            if (name === alias && denied) return cb(Object.assign(Error('PRIVATE'), {code: 3}));
            if (files.has(name)) return cb(null, stat(name));
            if ([alias, jail].some(p => p.slice(0, p.lastIndexOf('/')) === name))
                return cb(null, {mode: 0o40700, uid: 1, gid: 1, size: 0, mtime: 1, isFile: () => false, isDirectory: () => true});
            cb(Object.assign(Error('PRIVATE'), {code: 2}));
        },
        open(name, flags, cb) { assert.equal(flags, 'r'); cb(null, name); },
        fstat(name, cb) { cb(null, stat(name)); },
        close(name, cb) { cb(null); },
        read(name, b, offset, length, position, cb) {
            assert(length <= ([alias, jail].includes(name) ? 2048 : 32768)); reads.push(name);
            const data = files.get(name).subarray(position, position + length); data.copy(b, offset); cb(null, data.length);
        }
    };
    const io = await openIo({sftp: cb => cb(null, s)}, async (label, fn) => fn(), () => true);
    return {io, reads};
}
(async () => {
    const valid = Buffer.from(JSON.stringify(report) + '\n');
    for (const [bytes, expected] of [[valid, 'valid'], [Buffer.alloc(0), 'empty'], [Buffer.from('{'), 'partial'],
        [Buffer.from('{"PRIVATE":"secret"}\n'), 'invalid'], [Buffer.from('{"PRIVATE":"secret"}'), 'invalid'],
        [Buffer.alloc(2049), 'invalid']]) {
        const f = await fixture(new Map([[alias, bytes], [jail, valid]]));
        const result = []; await f.io.reports(result);
        assert.equal(result[0].state, expected); assert.equal(result[1].state, 'valid');
        // Nonstandard file mode is evidence and cannot hide valid report contents.
        if (expected === 'valid') assert.equal(result[0].metadata.mode, 0o777);
        if (bytes.length > 2048) assert(!f.reads.includes(alias));
        assert(!JSON.stringify(result).includes('PRIVATE')); assert(!JSON.stringify(result).includes('secret'));
    }
    let f = await fixture(new Map([[jail, valid]])), reports = []; await f.io.reports(reports);
    assert.equal(reports[0].state, 'absent');
    f = await fixture(new Map([[jail, valid]]), true); reports = []; await f.io.reports(reports);
    assert.equal(reports[0].state, 'unreadable'); assert.equal(reports[1].state, 'valid');
    for (const [size, type, reason] of [[100, 'file', 'truncated_or_rotated'], [65537 + 200, 'file', 'size_cap'], [200, 'other', 'cursor_not_regular']]) {
        f = await fixture(new Map([['/var/log/messages', Buffer.alloc(size)]]));
        const log = await f.io.logDelta({state: 'available', metadata: {type, size: 200, uid: 1, gid: 1, mode: 0o777}});
        assert.equal(log.reason, reason); assert.equal(log.actualExit, 'unknown'); assert.equal(f.reads.length, 0);
    }
    assert.throws(() => commandFor({acquireHdmi4: true, launchBootId: "'; injected", launchStartByBoottimeMs: 1, launchStartByRealtimeMs: 2}));
    console.log('Physical report states, 2 KiB cap, mode independence, privacy and distinct bounded-log failures passed; zero TV access');
})().catch(e => { console.error(e); process.exitCode = 1; });
