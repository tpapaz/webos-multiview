const assert = require('node:assert/strict');
const {FRESH_MS, assessArming, createModel} = require('../../scripts/iwc-recovery-model.cjs');
const clone = value => JSON.parse(JSON.stringify(value));
const {evidence} = require('../fixtures/iwc-synthetic-evidence.cjs');
function setup() {
    const model = createModel(), input = evidence();
    assert.equal(model.step({type: 'arm', evidence: input}, 10000).report.state, 'armed');
    return {model, input};
}
function act(model, at = 10001) {
    const result = model.step({type: 'act'}, at);
    assert.equal(result.intents.length, 1); assert.equal(result.intents[0].kind, 'simulate_action');
    assert.equal(result.intents[0].priority, 0);
    return result.intents[0];
}
const observed = type => ({type, framingNormal: true, motionNormal: true, soundNormal: true});
function validRevalidation(token, at = 10004) {
    return {type: 'reply', token, accepted: true, observedAtMs: at, viewEpoch: 1,
        publicationCount: 1, hdmiCandidateCount: 1, logicalFullViewMatched: true, target: evidence().discovery.target};
}
function throughReset() {
    const {model} = setup(), action = act(model);
    model.step({type: 'reply', token: action.token, accepted: true}, 10002);
    const check = model.step({type: 'cancel'}, 10003).intents[0];
    const reset = model.step(validRevalidation(check.token), 10004).intents[0];
    const close = model.step({type: 'reply', token: reset.token, accepted: true}, 10005).intents[0];
    return {model, action, check, reset, close};
}

// Every unresolved gate must refuse arming without producing any writer work.
for (const section of ['baseline', 'discovery', 'writer']) {
    const e = evidence(); delete e[section];
    const result = createModel().step({type: 'arm', evidence: e}, 10000);
    assert.equal(result.report.state, 'blocked'); assert.deepEqual(result.intents, []);
}
for (const [section, fields] of [['baseline', ['normalFullView', 'uncropped', 'pipOff', 'framingNormal', 'motionNormal', 'soundNormal']],
    ['writer', ['permitted', 'setterAdmissionVerified', 'independentOfActor', 'independentOfHost', 'soleWriter', 'orderingVerified', 'ready', 'cleanupBounded']]]) {
    for (const key of fields) for (const value of [false, 'unknown', undefined]) {
        const e = evidence(); e[section][key] = value;
        assert.notEqual(assessArming(e, 10000), null);
    }
}
for (const change of [e => { e.baseline.observedAtMs -= FRESH_MS + 1; },
    e => { e.discovery.observedAtMs += 1; }, e => { e.discovery.observedAtMs -= FRESH_MS + 1; },
    e => { e.discovery.viewEpoch = 2; }, e => { e.discovery.hdmiCandidateCount = 2; },
    e => { e.discovery.publicationCount = 0; }, e => { e.discovery.logicalFullViewMatched = false; },
    e => { e.discovery.target.appId = 'com.webos.app.hdmi1'; }, e => { e.discovery.target.width = 0; },
    e => { e.discovery.target.height = 1.5; }, e => { e.discovery.target.publishId = -1; },
    e => { e.discovery.target.windowId = ''; }, e => { e.baseline.port = 5; }]) {
    const e = evidence(); change(e); assert.notEqual(assessArming(e, 10000), null);
}
assert.equal(assessArming({publicationCount: 1, hdmiCandidateCount: 1}, 10000), 'baseline_incomplete'); // Saved count-only evidence cannot arm.

// One action, immutable target and logical full reset (not a fixed panel size).
{
    const {model, input} = setup(); input.discovery.target.width = 3840; input.discovery.target.publishId = 999;
    const action = act(model); assert.equal(action.target.publishId, 17);
    assert.deepEqual(action.destination, {x: 0, y: 0, width: 800, height: 450});
    assert.equal(model.step({type: 'act'}, 10002).intents.length, 0);
    model.step({type: 'reply', token: action.token, accepted: true}, 10003);
    const check = model.step({type: 'tick'}, 14000).intents[0];
    assert.equal(check.kind, 'simulate_revalidate');
    const reset = model.step(validRevalidation(check.token, 14001), 14001).intents[0];
    assert.deepEqual(reset.destination, {x: 0, y: 0, width: 1600, height: 900});
    assert.equal(reset.priority, action.priority); assert.equal(reset.target.publishId, 17);
}

// Reply + clean exit is not restored-video evidence; both observations are mandatory.
{
    const {model, close} = throughReset();
    assert.equal(model.report().outcome, 'pending');
    model.step(observed('observe_after_reset'), 10006);
    model.step({type: 'writer_closed', token: close.token, clean: true}, 10007);
    assert.equal(model.report().outcome, 'awaiting_simulated_observations');
    model.step(observed('observe_after_exit'), 10008);
    const r = model.report(); assert.equal(r.outcome, 'simulated_acceptance_passed');
    assert.equal(r.hardwareRestoration, 'unknown'); assert.equal(r.deviceTested, false);
    assert(!JSON.stringify(r).includes('SYNTHETIC-PRIVATE-WINDOW'));
    assert(!JSON.stringify(r).includes('publishId')); assert.equal(r.manualRecoveryRequired, false);
    assert.equal(model.step({type: 'arm', evidence: evidence()}, 10009).intents.length, 0);
}
for (const key of ['framingNormal', 'motionNormal', 'soundNormal']) {
    const {model, close} = throughReset();
    model.step({...observed('observe_after_reset'), [key]: 'unknown'}, 10006);
    model.step({type: 'writer_closed', token: close.token, clean: true}, 10007);
    model.step(observed('observe_after_exit'), 10008);
    model.step(observed('observe_after_reset'), 10009); // First observation cannot be rewritten to hide a failure.
    assert.equal(model.report().outcome, 'simulated_recovery_not_confirmed');
}

// Independent supervisor continues on actor/host loss; no actor input can extend deadlines.
for (const type of ['cancel', 'actor_died', 'host_lost']) {
    const {model} = setup(), action = act(model);
    assert.equal(model.step({type}, 10002).report.state, 'stopping');
    assert.equal(model.step({type: 'act'}, 10003).intents.length, 0);
    const check = model.step({type: 'reply', token: action.token, accepted: true}, 10004).intents[0];
    assert.equal(check.kind, 'simulate_revalidate');
    const reset = model.step(validRevalidation(check.token, 10005), 10005).intents[0];
    assert.equal(reset.kind, 'simulate_reset');
    const late = model.step({type: 'reply', token: action.token, accepted: true}, 10006);
    assert.equal(late.intents.length, 0); assert.equal(late.report.state, 'resetting');
    assert.equal(model.step({type: 'act'}, 10007).intents.length, 0);
}

// Unknown in-flight delivery never triggers a blindly queued reset.
{
    const {model} = setup(), action = act(model);
    model.step({type: 'actor_died'}, 10002);
    const timeout = model.step({type: 'tick'}, 12001);
    assert.equal(timeout.report.reason, 'action_delivery_uncertain'); assert.equal(timeout.report.resetAttempted, false);
    assert.equal(model.step({type: 'reply', token: action.token, accepted: true}, 12002).intents.length, 0);
}
for (const change of [e => { e.target.publishId++; }, e => { e.target.windowId = 'other'; },
    e => { e.target.appId = 'com.webos.app.hdmi1'; }, e => { e.target.width++; },
    e => { e.target.height++; }, e => { e.viewEpoch++; }, e => { e.hdmiCandidateCount++; },
    e => { e.observedAtMs -= FRESH_MS + 1; }, e => { e.accepted = false; }, e => { e.logicalFullViewMatched = false; }]) {
    const {model} = setup(), action = act(model);
    model.step({type: 'reply', token: action.token, accepted: true}, 10002);
    const check = model.step({type: 'cancel'}, 10003).intents[0], event = clone(validRevalidation(check.token)); change(event);
    const result = model.step(event, 10004); assert.equal(result.report.resetAttempted, false);
    assert.equal(result.report.reason, 'target_not_revalidated');
}
for (const type of ['target_changed', 'transport_lost', 'supervisor_failed']) {
    const {model} = setup(); act(model);
    const r = model.step({type}, 10002);
    assert.equal(r.report.resetAttempted, false); assert.equal(r.report.actorChannelOpen, false);
    assert.equal(r.report.manualRecoveryRequired, true);
}
// Refusal, timeout and cleanup failure never become restoration acceptance.
{
    const {model} = setup(), action = act(model);
    const r = model.step({type: 'reply', token: action.token, accepted: false}, 10002);
    assert.equal(r.report.reason, 'action_rejected_or_invalid'); assert.equal(r.report.resetAttempted, false);
    assert.equal(model.step({type: 'act'}, 10003).intents.length, 0);
}
{
    const {model} = setup(), action = act(model);
    model.step({type: 'reply', token: action.token, accepted: true}, 10002);
    model.step({type: 'cancel'}, 10003);
    const r = model.step({type: 'tick'}, 11003);
    assert.equal(r.report.reason, 'revalidation_timeout'); assert.equal(r.report.resetAttempted, false);
}
for (const timeout of [false, true]) {
    const {model} = setup(), action = act(model);
    model.step({type: 'reply', token: action.token, accepted: true}, 10002);
    const check = model.step({type: 'cancel'}, 10003).intents[0];
    const reset = model.step(validRevalidation(check.token), 10004).intents[0];
    const r = timeout ? model.step({type: 'tick'}, 12004) :
        model.step({type: 'reply', token: reset.token, accepted: false}, 10005);
    assert.equal(r.report.reason, timeout ? 'reset_delivery_uncertain' : 'reset_rejected_or_invalid');
    assert.equal(r.intents[0].kind, 'simulate_close');
    assert.equal(model.step({type: 'act'}, timeout ? 12005 : 10006).intents.length, 0);
}
for (const timeout of [false, true]) {
    const {model, close} = throughReset();
    const r = timeout ? model.step({type: 'tick'}, 11005) :
        model.step({type: 'writer_closed', token: close.token, clean: false}, 10006);
    assert.equal(r.report.outcome, 'inconclusive'); assert.equal(r.report.cleanupConfirmed, false);
    assert.equal(r.report.manualRecoveryRequired, true);
}
for (const afterClose of [false, true]) {
    const {model, close} = throughReset();
    if (afterClose) model.step({type: 'writer_closed', token: close.token, clean: true}, 10006);
    assert.equal(model.step({type: 'target_changed'}, 10007).intents.length, 0);
    if (!afterClose) model.step({type: 'writer_closed', token: close.token, clean: true}, 10008);
    model.step(observed('observe_after_reset'), 10009); model.step(observed('observe_after_exit'), 10010);
    assert.equal(model.report().outcome, 'inconclusive');
}
{
    const {model} = setup();
    model.step(observed('observe_after_reset'), 10001); model.step(observed('observe_after_exit'), 10002);
    const r = model.step({type: 'host_lost'}, 10003), close = r.intents[0];
    assert.equal(r.report.actionAttempted, false); assert.equal(r.report.resetAttempted, false);
    assert.equal(model.step({type: 'writer_closed', token: close.token, clean: true}, 10004).report.outcome, 'no_action');
}
{
    const {model} = setup(); act(model);
    const r = model.step({type: 'tick'}, 18000);
    assert.equal(r.report.state, 'failed'); assert.equal(r.report.reason, 'hard_deadline');
    assert.equal(model.step({type: 'act'}, 18001).intents.length, 0);
}
{
    const {model} = setup(); act(model);
    const r = model.step({type: 'tick'}, 9999);
    assert.equal(r.report.reason, 'clock_invalid'); assert.equal(r.report.resetAttempted, false);
}
console.log('Local IWC recovery model passed: arming gates, immutable binding, sole-writer cutoff, uncertain delivery, fault deadlines and observation separation');
