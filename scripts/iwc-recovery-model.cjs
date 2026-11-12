// Local deterministic simulation only. No transport, timers, process execution,
// Luna URI or device adapter belongs in this module.
const FRESH_MS = 1000; // Candidate host-model limit, not a measured TV guarantee.
const MAX_INT = 2147483647;
const integer = (value, min = 0) => Number.isInteger(value) && value >= min && value <= MAX_INT;
const text = value => typeof value === 'string' && value.length > 0 &&
    Buffer.byteLength(value) <= 256 && !value.includes('\0');
const fresh = (at, now) => Number.isSafeInteger(at) && at >= 0 && at <= now && now - at <= FRESH_MS;

function assessArming(evidence, now) {
    const {baseline: b, discovery: d, writer: w} = evidence || {};
    if (!Number.isSafeInteger(now) || now < 0) return 'invalid_clock';
    if (!b || !fresh(b.observedAtMs, now) || !integer(b.viewEpoch) || !integer(b.port, 1) || b.port > 4 ||
        b.normalFullView !== true || b.uncropped !== true || b.pipOff !== true ||
        b.framingNormal !== true || b.motionNormal !== true || b.soundNormal !== true) return 'baseline_incomplete';
    if (!d || !fresh(d.observedAtMs, now) || d.viewEpoch !== b.viewEpoch ||
        d.publicationCount !== 1 || d.hdmiCandidateCount !== 1) return 'target_not_fresh_unique';
    const t = d.target;
    if (!t || !integer(t.publishId) || !text(t.windowId) || t.appId !== `com.webos.app.hdmi${b.port}` ||
        !integer(t.width, 2) || !integer(t.height, 2) || d.logicalFullViewMatched !== true) return 'target_baseline_mismatch';
    if (!w || w.permitted !== true || w.setterAdmissionVerified !== true || w.independentOfActor !== true ||
        w.independentOfHost !== true || w.soleWriter !== true || w.orderingVerified !== true ||
        w.ready !== true || w.cleanupBounded !== true) return 'recovery_not_ready';
    return null;
}
const matches = (a, b) => a && b && ['publishId', 'windowId', 'appId', 'width', 'height'].every(key => a[key] === b[key]);
const observation = value => value && ['framingNormal', 'motionNormal', 'soundNormal'].every(key => value[key] === true);

function createModel() {
    let state = 'idle', reason = null, target, viewEpoch, armedAt = null, lastTime = null;
    let pending = null, nextToken = 0, commandOpen = false, actionAttempted = false, resetAttempted = false;
    let actionAcknowledged = false, resetAcknowledged = false, clean = false;
    let resetObservation = null, exitObservation = null, rejectedActorRequests = 0;
    let stageDeadline = null, intents = [];
    const emit = (kind, limit) => {
        pending = {kind, token: ++nextToken};
        stageDeadline = limit;
        const intent = {kind: 'simulate_' + kind, token: pending.token};
        if (kind === 'action' || kind === 'reset') {
            intent.target = target;
            intent.priority = 0;
            intent.destination = Object.freeze(kind === 'reset' ? {x: 0, y: 0, width: target.width, height: target.height} :
                {x: 0, y: 0, width: Math.floor(target.width / 2), height: Math.floor(target.height / 2)});
        }
        intents.push(Object.freeze(intent));
    };
    const close = (why, now) => {
        commandOpen = false;
        reason = why;
        pending = null;
        state = 'closing';
        emit('close', Math.min(now + 1000, armedAt + 8000));
    };
    const revalidate = now => {
        state = 'revalidating';
        emit('revalidate', Math.min(now + 1000, armedAt + 5000));
    };
    const recover = (why, now) => {
        commandOpen = false;
        if (state === 'closing' || state === 'closed' || state === 'failed') return;
        if (!actionAttempted) { close('no_action', now); return; }
        if (pending?.kind === 'action') { state = 'stopping'; return; }
        if (state === 'revalidating' || state === 'resetting') return;
        revalidate(now);
    };
    const report = () => {
        let outcome = 'pending';
        if (state === 'blocked') outcome = 'arming_refused';
        if (state === 'failed') outcome = 'inconclusive';
        if (state === 'closed') {
            if (!clean) outcome = 'inconclusive';
            else if (!actionAttempted) outcome = 'no_action';
            else if (!resetAcknowledged || reason !== 'reset_acknowledged') outcome = 'inconclusive';
            else if (resetObservation === false || exitObservation === false) outcome = 'simulated_recovery_not_confirmed';
            else if (resetObservation === true && exitObservation === true) outcome = 'simulated_acceptance_passed';
            else outcome = 'awaiting_simulated_observations';
        }
        return {schemaVersion: 1, mode: 'local_simulation', deviceTested: false, state, outcome, reason,
            actionAttempted, resetAttempted, actionAcknowledged, resetAcknowledged,
            cleanupConfirmed: clean, actorChannelOpen: commandOpen, rejectedActorRequests,
            manualRecoveryRequired: actionAttempted && outcome !== 'simulated_acceptance_passed',
            hardwareRestoration: 'unknown', normalAppAdmission: 'not established', simultaneousHdmi: 'unknown'};
    };
    function step(event, now) {
        intents = [];
        event = event || {};
        if (!Number.isSafeInteger(now) || now < 0 || (lastTime !== null && now < lastTime)) {
            if (state === 'closing') {
                state = 'failed'; reason = 'clock_invalid'; pending = null;
            } else if (armedAt !== null && !['closed', 'failed'].includes(state)) {
                close('clock_invalid', lastTime);
            } else if (state === 'idle') { state = 'blocked'; reason = 'invalid_clock'; }
            return {intents, report: report()};
        }
        lastTime = now;
        if (armedAt !== null && !['closed', 'failed'].includes(state)) {
            if (now >= armedAt + 8000) {
                state = 'failed'; reason = 'hard_deadline'; commandOpen = false; pending = null;
            } else if (stageDeadline !== null && now >= stageDeadline) {
                if (state === 'closing') { state = 'failed'; reason = 'cleanup_timeout'; pending = null; }
                else close(pending?.kind === 'action' ? 'action_delivery_uncertain' :
                    pending?.kind === 'reset' ? 'reset_delivery_uncertain' : 'revalidation_timeout', now);
            } else if (now >= armedAt + 4000 && ['armed', 'acting', 'active'].includes(state)) {
                recover('active_deadline', now);
            }
        }
        if (event.type === 'arm' && state === 'idle') {
            reason = assessArming(event.evidence, now);
            if (reason) state = 'blocked';
            else {
                const t = event.evidence.discovery.target;
                target = Object.freeze({publishId: t.publishId, windowId: t.windowId, appId: t.appId, width: t.width, height: t.height});
                viewEpoch = event.evidence.baseline.viewEpoch;
                state = 'armed'; armedAt = now; commandOpen = true;
            }
        } else if (event.type === 'act') {
            if (state !== 'armed' || !commandOpen || actionAttempted) ++rejectedActorRequests;
            else {
                state = 'acting'; actionAttempted = true;
                emit('action', Math.min(now + 2000, armedAt + 4000));
            }
        } else if (['cancel', 'actor_died', 'host_lost'].includes(event.type) &&
            ['armed', 'acting', 'active', 'stopping', 'revalidating', 'resetting'].includes(state)) {
            recover(event.type, now);
        } else if (['target_changed', 'transport_lost'].includes(event.type) &&
            ['armed', 'acting', 'active', 'stopping', 'revalidating', 'resetting'].includes(state)) {
            close(event.type, now); // Cannot safely retarget or presume delivery ordering.
        } else if (event.type === 'target_changed' && (state === 'closing' ||
            (state === 'closed' && report().outcome !== 'simulated_acceptance_passed'))) {
            reason = 'target_changed'; // Invalidate pending observations without issuing more work.
        } else if (event.type === 'supervisor_failed' && armedAt !== null && !['closed', 'failed'].includes(state)) {
            state = 'failed'; reason = 'supervisor_failed'; commandOpen = false; pending = null;
        } else if (event.type === 'reply' && pending && event.token === pending.token &&
            ['acting', 'stopping', 'revalidating', 'resetting'].includes(state)) {
            const kind = pending.kind;
            pending = null; stageDeadline = null;
            if (kind === 'action') {
                if (event.accepted !== true) close('action_rejected_or_invalid', now);
                else {
                    actionAcknowledged = true;
                    if (state === 'stopping') revalidate(now);
                    else state = 'active';
                }
            } else if (kind === 'revalidate') {
                if (event.accepted !== true || event.logicalFullViewMatched !== true ||
                    !fresh(event.observedAtMs, now) || event.viewEpoch !== viewEpoch || event.publicationCount !== 1 ||
                    event.hdmiCandidateCount !== 1 || !matches(target, event.target)) close('target_not_revalidated', now);
                else {
                    state = 'resetting'; resetAttempted = true;
                    emit('reset', Math.min(now + 2000, armedAt + 7000));
                }
            } else if (kind === 'reset') {
                resetAcknowledged = event.accepted === true;
                close(resetAcknowledged ? 'reset_acknowledged' : 'reset_rejected_or_invalid', now);
            }
        } else if (event.type === 'writer_closed' && state === 'closing' && event.token === pending?.token) {
            clean = event.clean === true;
            pending = null; stageDeadline = null; state = 'closed';
        } else if (event.type === 'observe_after_reset' && resetAcknowledged && ['closing', 'closed'].includes(state) && resetObservation === null) {
            resetObservation = observation(event);
        } else if (event.type === 'observe_after_exit' && state === 'closed' && clean && resetAcknowledged && exitObservation === null) {
            exitObservation = observation(event);
        }
        return {intents, report: report()};
    }
    return Object.freeze({step, report});
}
module.exports = {FRESH_MS, assessArming, createModel};
