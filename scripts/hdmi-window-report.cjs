// Acceptance rules for the fixed native report. No device connection or raw IDs.
const id = 'io.github.tpapaz.multiview.hdmiwindow';
const version = '0.1.3';
const phases = ['baseline', 'overlay', 'removed', 'picture-ready', 'after-picture'];
function filename(mode) {
    if (mode === 'picture') return 'picture-' + version + '.json';
    if (phases.includes(mode)) return 'admission-' + mode + '-' + version + '.json';
    throw Error('unknown capture mode');
}
function validateReport(bytes, mode) {
    filename(mode);
    if (!Buffer.isBuffer(bytes) || !bytes.length || bytes.length > 2048) throw Error('report size');
    const r = JSON.parse(bytes.toString('utf8'));
    const picture = mode === 'picture';
    const common = ['schemaVersion', 'appId', 'appVersion', 'mode', 'elapsedMs', 'status', 'localCleanup'];
    const keys = common.concat(picture ? ['port', 'opened', 'selected', 'stopAcknowledged',
        'closeAcknowledged', 'acquisitionUncertain', 'hardwareRelease', 'livePicture', 'restoration', 'dualHdmi'] :
        ['callerReady', 'calls', 'actualUtpCalls', 'policyAllowed']);
    const require = (ok, message) => { if (!ok) throw Error(message); };
    require(r && typeof r === 'object' && !Array.isArray(r) &&
        Object.keys(r).length === keys.length && keys.every(k => Object.hasOwn(r, k)), 'report fields');
    require(r.schemaVersion === 1 && r.appId === id && r.appVersion === version &&
        r.mode === mode, 'report binding');
    require(Number.isSafeInteger(r.elapsedMs) && r.elapsedMs >= 0 &&
        r.elapsedMs < (picture ? 22000 : 12000), 'report elapsed');
    const flags = picture ? ['localCleanup', 'opened', 'selected', 'stopAcknowledged',
        'closeAcknowledged', 'acquisitionUncertain'] : ['localCleanup', 'callerReady'];
    require(flags.every(k => typeof r[k] === 'boolean'), 'report flags');
    if (picture) {
        require(['setup_failed', 'open_failed', 'select_failed', 'cancelled',
            'candidate_interval_completed', 'cleanup_failed'].includes(r.status), 'picture status');
        require(r.port === 4 && ['hardwareRelease', 'livePicture', 'restoration', 'dualHdmi']
            .every(k => r[k] === 'unknown'), 'picture scope');
        require((!r.selected || r.opened) && (!r.opened || r.acquisitionUncertain) &&
            (!(r.stopAcknowledged || r.closeAcknowledged) || r.acquisitionUncertain), 'picture sequence');
        if (r.status === 'setup_failed') require(!r.opened && !r.selected &&
            !r.acquisitionUncertain && !r.stopAcknowledged && !r.closeAcknowledged, 'setup sequence');
        if (r.status === 'open_failed') require(!r.opened && !r.selected, 'open sequence');
        if (r.status === 'select_failed') require(r.opened && !r.selected, 'select sequence');
        if (['candidate_interval_completed', 'cleanup_failed'].includes(r.status))
            require(r.opened && r.selected, 'completion sequence');
        const clean = r.stopAcknowledged && r.closeAcknowledged && r.localCleanup;
        if (r.status === 'candidate_interval_completed') require(clean, 'completion cleanup');
        if (r.status === 'cleanup_failed') require(!clean, 'failed cleanup');
    } else {
        require(['policy_checked', 'setup_failed', 'cancelled', 'query_failed', 'cleanup_failed']
            .includes(r.status), 'admission status');
        require(Number.isInteger(r.calls) && r.calls >= 0 && r.calls <= 4 &&
            r.actualUtpCalls === 0, 'admission calls');
        require(Array.isArray(r.policyAllowed) && r.policyAllowed.length === 4 &&
            r.policyAllowed.every(x => [-1, 0, 1].includes(x)), 'admission predictions');
        let unknown = false;
        r.policyAllowed.forEach((x, i) => {
            if (x === -1) unknown = true;
            require((!unknown || x === -1) && (i < r.calls || x === -1), 'admission sequence');
        });
        require(r.callerReady || (r.calls === 0 && r.policyAllowed.every(x => x === -1)), 'caller readiness');
        if (r.status === 'policy_checked') require(r.callerReady && r.localCleanup &&
            r.calls === 4 && !unknown, 'incomplete policy check');
        if (r.status === 'setup_failed') require(!r.callerReady && r.localCleanup, 'admission setup');
        if (r.status === 'cleanup_failed') require(!r.localCleanup, 'admission cleanup');
        if (r.status === 'query_failed') require(r.callerReady && r.calls > 0 &&
            r.policyAllowed[r.calls - 1] === -1, 'query failure');
    }
    return r;
}
function phaseAccepted(r) {
    if (!phases.includes(r.mode)) return false;
    const expected = ['overlay', 'picture-ready'].includes(r.mode) ? 1 : 0;
    return r.status === 'policy_checked' && r.policyAllowed.every(x => x === expected);
}
module.exports = {id, version, phases, filename, validateReport, phaseAccepted};
