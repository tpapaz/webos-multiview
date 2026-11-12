// Synthetic local evidence only: these values are not measurements of a TV.
function evidence(now = 10000) {
    return {baseline: {observedAtMs: now, viewEpoch: 1, port: 4, normalFullView: true,
        uncropped: true, pipOff: true, framingNormal: true, motionNormal: true, soundNormal: true},
    discovery: {observedAtMs: now, viewEpoch: 1, publicationCount: 1, hdmiCandidateCount: 1,
        logicalFullViewMatched: true, target: {publishId: 17, windowId: 'SYNTHETIC-PRIVATE-WINDOW',
            appId: 'com.webos.app.hdmi4', width: 1600, height: 900}},
    writer: {permitted: true, setterAdmissionVerified: true, independentOfActor: true, independentOfHost: true,
        soleWriter: true, orderingVerified: true, ready: true, cleanupBounded: true}};
}
const SCENARIOS = Object.freeze(['normal', 'actor_loss', 'host_loss', 'host_loss_before_action', 'status_loss', 'action_hang',
    'partial_reply', 'revalidate_hang', 'reset_hang', 'cleanup_hang', 'delayed_exit', 'supervisor_loss', 'supervisor_hang']);
module.exports = {evidence, SCENARIOS};
