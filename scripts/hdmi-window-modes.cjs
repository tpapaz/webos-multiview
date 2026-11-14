// Fixed two-file restoration; adapter only. No transport, credentials, CLI or launch.
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const {id, version} = require('./hdmi-window-report.cjs');
const base = '/media/developer/apps/usr/palm/applications/' + id;
const parents = ['/media/developer', '/media/developer/apps', '/media/developer/apps/usr',
    '/media/developer/apps/usr/palm', '/media/developer/apps/usr/palm/applications', base];
function modeTargets(pkg) {
    assert.equal(pkg.appId, id);
    assert.equal(pkg.appVersion, version);
    assert(Number.isSafeInteger(pkg.binaryBytes) && pkg.binaryBytes > 0 && pkg.binaryBytes <= 1048576);
    for (const value of [pkg.binarySha256, pkg.manifestSha256]) assert(/^[0-9a-f]{64}$/.test(value));
    return [
        {name: 'appinfo', path: base + '/appinfo.json', size: 263, mode: 0o644,
            hash: pkg.manifestSha256},
        {name: 'binary', path: base + '/multiview-hdmi-window', size: pkg.binaryBytes, mode: 0o755,
            hash: pkg.binarySha256}
    ];
}
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
function metadata(attrs) {
    assert(attrs && ['file', 'directory', 'symlink', 'other'].includes(attrs.type));
    for (const key of ['mode', 'uid', 'gid', 'size', 'mtime']) assert(Number.isSafeInteger(attrs[key]));
    return Object.fromEntries(['type', 'mode', 'uid', 'gid', 'size', 'mtime'].map(key => [key, attrs[key]]));
}
function initialFile(attrs, target) {
    assert.equal(attrs.type, 'file');
    assert.equal(attrs.uid, 1000); assert.equal(attrs.gid, 1000);
    assert.equal(attrs.size, target.size);
    assert([0o777, target.mode].includes(attrs.mode));
}
async function restoreModes(adapter, record, pkg) {
    const targets = modeTargets(pkg);
    assert(record && typeof record === 'object');
    const result = record.modeCorrection = {
        status: 'preparing', stage: 'app_absence_before', events: [], primaryFailure: null,
        closeFailures: [], modeRequestsAttempted: 0, appAbsentBefore: false,
        appAbsentAfter: false, filesVerifiedAfter: false, parentsStable: false,
        limitation: 'SFTP attributes lack inode identity and OPEN lacks O_NOFOLLOW. Requires quiet installation/no active writer; path-race elimination and persistence are not established.'
    };
    record.modeCorrectionAccepted = false;
    const opened = [], directoryMetadata = new Map();
    const failure = stage => ({stage, category: 'validation_or_adapter_failure'});
    async function checkParents() {
        for (const [path, before] of directoryMetadata) assert.deepEqual(metadata(await adapter.lstat(path)), before);
    }
    async function checkFile(file, mode) {
        const expected = {...file.before, mode};
        assert.deepEqual(metadata(await adapter.fstat(file.handle)), expected);
        const bytes = await adapter.readFile(file.handle, file.target.size);
        assert(Buffer.isBuffer(bytes)); assert.equal(bytes.length, file.target.size);
        assert.equal(hash(bytes), file.target.hash);
        assert.deepEqual(metadata(await adapter.fstat(file.handle)), expected);
        assert.deepEqual(metadata(await adapter.lstat(file.target.path)), expected);
    }
    try {
        assert.equal(await adapter.checkAppAbsent(), true); result.appAbsentBefore = true;
        result.stage = 'parent_metadata';
        for (const path of parents) {
            const attrs = metadata(await adapter.lstat(path)); assert.equal(attrs.type, 'directory');
            directoryMetadata.set(path, attrs);
        }
        // Both files and handles must be bound before the first change.
        for (const target of targets) {
            result.stage = 'validate_' + target.name;
            const before = metadata(await adapter.lstat(target.path)); initialFile(before, target);
            const handle = await adapter.open(target.path, 'r');
            const file = {target, before, handle}; opened.push(file);
            await checkFile(file, before.mode);
        }
        result.stage = 'parents_before_changes'; await checkParents();
        // Final revalidation of both handles before any fchmod request.
        for (const file of opened) await checkFile(file, file.before.mode);
        for (const file of opened) {
            const {target, before} = file;
            result.stage = 'change_' + target.name;
            const event = {target: target.name, path: target.path, beforeMode: before.mode,
                targetMode: target.mode, requestAttempted: false, acknowledged: false,
                verified: false, alreadyTarget: before.mode === target.mode};
            result.events.push(event);
            if (!event.alreadyTarget) {
                assert.equal(await adapter.checkAppAbsent(), true);
                await checkParents();
                await checkFile(file, before.mode);
                // This records host intent; it does not prove server receipt.
                event.intentRecordedAt = new Date().toISOString();
                event.requestAttempted = true; result.modeRequestsAttempted++;
                assert(result.modeRequestsAttempted <= 2);
                await adapter.fchmod(file.handle, target.mode);
                event.acknowledged = true;
            }
            result.stage = 'verify_' + target.name;
            await checkFile(file, target.mode); event.verified = true;
        }
        result.stage = 'final_file_readback';
        for (const file of opened) await checkFile(file, file.target.mode);
        result.filesVerifiedAfter = true;
        result.stage = 'parents_after_changes'; await checkParents(); result.parentsStable = true;
    } catch {
        result.primaryFailure = failure(result.stage);
    } finally {
        // After-check failure must not overwrite the original failed operation.
        try {
            assert.equal(await adapter.checkAppAbsent(), true); result.appAbsentAfter = true;
        } catch {
            result.appAbsenceAfterFailure = true;
            if (!result.primaryFailure) result.primaryFailure = failure('app_absence_after');
        }
        for (const file of opened.slice().reverse()) {
            try { await adapter.close(file.handle); }
            catch { result.closeFailures.push({target: file.target.name, category: 'close_failed'}); }
        }
    }
    record.modeCorrectionAccepted = !result.primaryFailure && result.closeFailures.length === 0 &&
        result.appAbsentBefore && result.appAbsentAfter && result.filesVerifiedAfter && result.parentsStable;
    result.status = record.modeCorrectionAccepted ? 'complete' : 'stopped';
    result.mutationOutcome = result.modeRequestsAttempted === 0 ? 'no_mode_request_attempted' :
        record.modeCorrectionAccepted ? 'verified_at_capture' : 'partial_or_unknown';
    result.uncertainRequests = result.events.filter(event => event.requestAttempted && !event.acknowledged).length;
    result.stage = record.modeCorrectionAccepted ? 'complete' :
        result.primaryFailure ? result.primaryFailure.stage : 'close_handles';
    return record;
}
module.exports = {restoreModes, modeTargets};
