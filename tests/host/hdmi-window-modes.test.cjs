// Core correction acceptance rules with synthetic bytes. No package or TV needed.
const assert = require('node:assert/strict');
const {createHash} = require('node:crypto');
const {restoreModes} = require('../../scripts/hdmi-window-modes.cjs');
const manifestBytes = Buffer.alloc(263, 65), binaryBytes = Buffer.from('synthetic native binary');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const pkg = {appId: 'io.github.tpapaz.multiview.hdmiwindow', appVersion: '0.1.4',
    manifestSha256: hash(manifestBytes), binarySha256: hash(binaryBytes), binaryBytes: binaryBytes.length};
const base = '/media/developer/apps/usr/palm/applications/io.github.tpapaz.multiview.hdmiwindow';
const info = base + '/appinfo.json', binary = base + '/multiview-hdmi-window';
function fixture(options = {}) {
    const attrs = new Map(), bytes = new Map(), requests = [], handles = [];
    for (const target of ['/media/developer', '/media/developer/apps', '/media/developer/apps/usr',
        '/media/developer/apps/usr/palm', '/media/developer/apps/usr/palm/applications', base])
        attrs.set(target, {type: 'directory', mode: 0o777, uid: 0, gid: 0, size: 4096, mtime: 100});
    bytes.set(info, Buffer.from(manifestBytes));
    bytes.set(binary, Buffer.from(binaryBytes));
    for (const target of [info, binary]) attrs.set(target,
        {type: 'file', mode: 0o777, uid: 1000, gid: 1000, size: bytes.get(target).length, mtime: 100});
    let absentCalls = 0;
    const adapter = {
        async lstat(target) { assert(attrs.has(target)); return {...attrs.get(target)}; },
        async open(target, flags) { assert.equal(flags, 'r'); const handle = {target, closed: false}; handles.push(handle); return handle; },
        async fstat(handle) { assert(!handle.closed); return {...attrs.get(handle.target)}; },
        async readFile(handle, max) { const data = bytes.get(handle.target); assert(data.length <= max); return Buffer.from(data); },
        async fchmod(handle, mode) {
            requests.push({path: handle.target, mode}); attrs.get(handle.target).mode = mode;
            if (options.uncertainFirst && requests.length === 1) throw Error('simulated transport loss after change');
            if (options.postMismatch) attrs.get(handle.target).mode = 0o777;
        },
        async close(handle) { handle.closed = true; if (options.closeFailure) throw Error('simulated close failure'); },
        async checkAppAbsent() { absentCalls++; return !options.appPresent && !(options.appAppears && absentCalls > 1); }
    };
    return {attrs, bytes, requests, handles, adapter};
}
async function run(test) { const record = {}; await restoreModes(test.adapter, record, pkg); return record; }
(async () => {
    const good = fixture(), complete = await run(good);
    assert(complete.modeCorrectionAccepted);
    assert.deepEqual(good.requests, [{path: info, mode: 0o644}, {path: binary, mode: 0o755}]);
    assert(good.handles.every(handle => handle.closed));
    assert.equal(complete.modeCorrection.modeRequestsAttempted, 2);
    // A bad second file must prevent even the first mode change.
    for (const corrupt of [
        f => { f.bytes.get(binary)[0] ^= 1; },
        f => { f.attrs.get(binary).uid = 0; },
        f => { f.attrs.get(binary).type = 'symlink'; },
        f => { f.attrs.get(base).type = 'symlink'; }
    ]) {
        const test = fixture(); corrupt(test); const result = await run(test);
        assert(!result.modeCorrectionAccepted); assert.equal(test.requests.length, 0);
        assert(test.handles.every(handle => handle.closed));
    }
    const uncertain = fixture({uncertainFirst: true, closeFailure: true}), stopped = await run(uncertain);
    assert(!stopped.modeCorrectionAccepted); assert.equal(uncertain.requests.length, 1);
    assert.equal(stopped.modeCorrection.primaryFailure.stage, 'change_appinfo');
    assert.equal(stopped.modeCorrection.uncertainRequests, 1);
    assert.equal(stopped.modeCorrection.closeFailures.length, 2);
    assert(uncertain.handles.every(handle => handle.closed));
    const already = fixture(); already.attrs.get(info).mode = 0o644; already.attrs.get(binary).mode = 0o755;
    assert((await run(already)).modeCorrectionAccepted); assert.equal(already.requests.length, 0);
    const mismatch = fixture({postMismatch: true}), rejected = await run(mismatch);
    assert(!rejected.modeCorrectionAccepted); assert.equal(mismatch.requests.length, 1);
    assert.equal(rejected.modeCorrection.events[0].acknowledged, true);
    assert.equal(rejected.modeCorrection.events[0].verified, false);
    const appeared = fixture({appAppears: true});
    assert(!(await run(appeared)).modeCorrectionAccepted);
    const present = fixture({appPresent: true});
    assert(!(await run(present)).modeCorrectionAccepted); assert.equal(present.requests.length, 0);
    assert.equal(present.handles.length, 0);
    console.log('Mode restoration acceptance passed: exact targets/order, pre-change rejection, uncertain/partial stop, no-op, readback and cleanup reporting. No TV access.');
})().catch(error => { console.error(error); process.exitCode = 1; });
