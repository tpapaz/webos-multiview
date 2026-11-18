const assert = require('node:assert/strict');
const {classify} = require('../../scripts/hdmi2-scaler-evidence.cjs');

const logicalId = 'private-logical';
const serviceId = 'private-watcher';
const pipelineId = 'private-backend';
const childId = 'private-connector';
const coverage = {startedBeforeOpen: true, continuous: true, requestStreamComplete: true};
const registration = {kind: 'register', pipelineId, childId, connectionType: 'avconnector'};
const association = {kind: 'associate', ownerPipelineId: pipelineId, childId, accepted: true};
const trace = [
    {kind: 'open', logicalId, disposition: 'fresh'},
    {kind: 'bind', logicalId, serviceId, port: 2},
    {kind: 'element_open', serviceId, pipelineId, firstParentId: pipelineId, disposition: 'fresh'},
    registration,
    association
];
const acquire = (id, ...resources) => ({kind: 'acquire', source: 'media-server', eventId: 'ACQUIRE_REQUEST',
    message: `connectionId: ${id}. resources: ${JSON.stringify(resources.map(resource => ({resource, qty: 1})))}`});
const check = (events, bounds = coverage) => classify({version: 1, coverage: bounds, events});
const withEvent = (index, change) => trace.map((event, i) => i === index ? {...event, ...change} : event);

const siblings = [
    {...trace[0], logicalId: 'other-input'},
    {...trace[1], logicalId: 'other-input', serviceId: 'other-service', port: 1},
    ...trace, {...registration, childId: 'audio-child'},
    {...association, childId: 'audio-child'}, acquire('audio-child', 'ADEC'),
    acquire(childId, 'MAIN_SCALER')
];
assert.equal(check(siblings).firstScaler, 'MAIN_SCALER');
assert.equal(check([...siblings, acquire('audio-child', 'SUB_SCALER')]).reason, 'video_child_unproven');
assert.equal(check([...siblings, {kind: 'grant', childId: 'audio-child', resource: 'MAIN_SCALER'}]).reason,
    'video_child_unproven');
assert.equal(check([...siblings, {kind: 'acquire'}]).reason, 'unreadable_acquire_request');
assert.equal(check(siblings.map(event => event === association ? {...event, accepted: false} : event)).reason,
    'owner_association_unproven');

const firstMain = check([...trace, acquire(childId, 'MAIN_SCALER'), acquire(childId, 'SUB_SCALER'),
    {kind: 'grant', childId, resource: 'SUB_SCALER'}, {kind: 'descriptor', childId, sink: 'SUB0'}]);
assert.deepEqual(firstMain, {status: 'first_request_observed', port: 2, firstScaler: 'MAIN_SCALER',
    associationOrder: 'before_request'});
assert.deepEqual(check([...trace, acquire('other-connector', 'MAIN_SCALER'), acquire(childId, 'ADEC'),
    acquire(childId, 'SUB_SCALER', 'OVERLAY_VIDEO')]), {status: 'first_request_observed', port: 2,
    firstScaler: 'SUB_SCALER', associationOrder: 'before_request'});
assert.equal(check([...trace.slice(0, 4), acquire(childId, 'MAIN_SCALER'), association]).associationOrder, 'after_request');
assert.equal(check([...trace, {kind: 'grant', childId, resource: 'SUB_SCALER'},
    acquire(childId, 'MAIN_SCALER')]).reason, 'earlier_scaler_grant');
assert.equal(check([...trace, {kind: 'descriptor', childId, sink: 'SUB0'}]).reason, 'no_scaler_request');
assert.equal(check([...trace, acquire(childId, 'SUB_SCALER')], {...coverage, requestStreamComplete: false})
    .reason, 'capture_incomplete');
assert.equal(check([...withEvent(0, {disposition: 'adopted'}), acquire(childId, 'SUB_SCALER')]).reason, 'fresh_open_unproven');
assert.equal(check([...withEvent(1, {port: 1}), acquire(childId, 'SUB_SCALER')]).reason, 'hdmi2_binding_unproven');
assert.equal(check([...withEvent(2, {firstParentId: 'old-parent'}), acquire(childId, 'SUB_SCALER')]).reason,
    'fresh_element_unproven');
assert.equal(check([...withEvent(3, {pipelineId: serviceId}), acquire(childId, 'SUB_SCALER')]).reason,
    'child_registration_unproven');
assert.equal(check([...trace, {...association, ownerPipelineId: 'other-owner'}, acquire(childId, 'SUB_SCALER')]).reason,
    'owner_association_unproven');
assert.equal(check([...trace.slice(0, 3), acquire(childId, 'MAIN_SCALER'), registration, association]).reason,
    'identity_order_conflict');
assert.equal(check([...trace, {...acquire(childId, 'MAIN_SCALER'), source: 'resource-client'},
    acquire(childId, 'SUB_SCALER')]).reason, 'unreadable_acquire_request');
assert.equal(check([...trace, acquire(childId, 'SUB_SCALER', 'MAIN_SCALER')]).reason, 'ambiguous_first_scaler');
assert.equal(check([...trace, acquire(childId, 'GP_SCALER'), acquire(childId, 'SUB_SCALER')]).reason,
    'unclassified_first_scaler');
assert(!JSON.stringify(firstMain).includes('private-'));
console.log('HDMI 2 first-request correlation checks passed');
