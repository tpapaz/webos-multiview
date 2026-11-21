const test = require('node:test');
const assert = require('node:assert/strict');
const {spawnSync} = require('node:child_process');
const {decode} = require('../../scripts/hdmi-receiver-decoder.cjs');

const hdmi = 'com.webos.service.extinputs.hdmi';
const tvrm = 'com.webos.service.tvrm';
const scope = {input: {type: 3}, purpose: {type: 1}};
function call(destination, method, token, payload, senderUniqueName) {
    return {type: 'call', transport: 'TX', destination, senderUniqueName,
        destinationUniqueName: destination === tvrm ? ':allocator' : ':backend', token, method, payload};
}
function reply(request, payload = {returnValue: true}) {
    return {type: 'return', transport: 'RX', senderUniqueName: request.destinationUniqueName,
        destinationUniqueName: request.senderUniqueName, replyToken: request.token, payload};
}
const select = (pipelineId, portId) => call(hdmi, 'switchExternalInput', portId, {pipelineId, portId}, ':switcher');
const resource = (method, pipelineId, token) =>
    call(tvrm, method, token, {pipelineId, ...scope}, pipelineId === 'private-A' ? ':clientA' : ':clientB');
const result = {returnValue: true, tvcoResult: 0};
const grant = (request, index) => reply(request, {...result, resources: {
    pipelineId: request.payload.pipelineId, data: [{type: 37, port: 0}, {type: 19, port: index}]
}});
const run = rows => decode(rows.map(row => JSON.stringify(row)).join('\n'));
const a = select('private-A', 4), b = select('private-B', 1);
const getA = resource('requestResource', 'private-A', 70), getB = resource('requestResource', 'private-B', 70);
const release = resource('releaseResource', 'private-B', 71);

test('attributes nested calls and out-of-order replies with reused tokens to the right jacks', () => {
    const close = call(hdmi, 'close', 20, {pipelineId: 'private-B'}, ':switcher');
    const rows = [a, {...a, transport: 'RX'}, getA, b, getB, grant(getB, 0), grant(getA, 1),
        reply(b), reply(a), close, release, reply(release, result), reply(close)];
    const report = run(rows.map((row,i) => ({...row, elapsedMs: 100*i})));
    assert.equal(report.status, 'observed');
    assert.deepEqual(report.events.map(e => [e.port, e.kind, e.receiverIndex, e.callLine, e.replyLine]), [
        [4,'receiver_assigned',1,3,7], [1,'receiver_assigned',0,5,6],
        [1,'release_acknowledged',undefined,11,12]
    ]);
    assert.equal(report.events[2].replyElapsedMs, 1100);
    assert.equal(report.events[2].priorAllocationReplyLine, 6);
    assert.doesNotMatch(JSON.stringify(report), /private-|:client|:backend/);
});

test('requires matching service, successful switch and allocation, full pipeline ID and one VHDMIRX index', () => {
    const good = grant(getA, 1);
    const output = (change, answer = reply(a)) => run([a, getA, change, answer]).events[0];
    assert.equal(output({...good, destinationUniqueName: ':unrelated'}).reason, 'missing_reply');
    assert.equal(output({...good, type: 'error'}).reason, 'no_successful_tvrm_result');
    assert.equal(output(reply(getA,{...good.payload,tvcoResult: 2})).reason, 'no_successful_tvrm_result');
    assert.equal(output(good, reply(a,{returnValue:false})).reason, 'unproven_port_binding');
    assert.equal(output(reply(getA,{...result,resources: {pipelineId: 'wrong',data: []}})).reason, 'pipeline_mismatch');
    const withData = data => output(reply(getA,{...result,resources: {pipelineId: 'private-A',data}}));
    assert.equal(withData([{type:15,port:0},{type:37,port:1}]).kind, 'no_receiver_in_reply');
    assert.equal(withData([{type:19,port:255}]).reason, 'ambiguous_receiver');
    assert.equal(withData([{type:19,port:0},{type:19,port:1}]).reason, 'ambiguous_receiver');
    assert.equal(withData([{}]).reason, 'invalid_resource_list');
    const unrelated = resource('requestResource', 'private-background', 90);
    assert.equal(run([a, reply(a), unrelated, grant(unrelated,0)]).events[0].reason, 'no_tvrm_exchange');
    assert.equal(run([{...a,destination:'com.webos.service.utp.extinputs'}, reply(a), getA, good]).reason, 'no_target_switch');
});

test('never attributes release by timing, disconnect, a reused ID or an overlapping operation', () => {
    const first = [b, getB, grant(getB,1), reply(b)];
    const close = call(hdmi,'close',32,{pipelineId:'private-B'},':switcher');
    const other = resource('requestResource','private-B',88);
    const changedPurpose = {...release,payload:{...release.payload,purpose:{type:2}}};
    assert.equal(run([...first,close,reply(close)]).events.length, 1);
    assert.equal(run([...first,release]).events[1].reason, 'missing_reply');
    assert.equal(run([...first,release,reply(release,{returnValue:false,tvcoResult:-1})]).status, 'partial');
    assert.equal(run([...first,changedPurpose,reply(changedPurpose,result)]).events[1].priorAllocationReplyLine, undefined);
    assert.equal(run([...first,release,other,reply(release,result),grant(other,0)]).events[1].priorAllocationReplyLine, undefined);
    assert.equal(run([...first,close,reply(close),release,reply(release,result)]).events[1].reason, 'uncertain_session_lifetime');
    const rebound = select('private-B',4);
    assert.equal(run([...first,rebound,reply(rebound)]).status,'unknown');
    const prefix = 'x'.repeat(31);
    const s1 = select(prefix+'A',1), s4 = select(prefix+'B',4);
    assert.equal(run([s1,reply(s1),s4,reply(s4)]).events.every(e => e.reason === 'unproven_port_binding'),true);
});

test('conflicting transport copies, broken framing and clock regression fail without leaking input', () => {
    const good = grant(getA,1);
    assert.equal(run([a,getA,good,{...good,transport:'TX',payload:{}},reply(a)]).reason,'ambiguous_exchange');
    assert.equal(run([a,{...a,transport:'RX',payload:{...a.payload,portId:1}}]).reason,'ambiguous_exchange');
    assert.equal(run([{...a,elapsedMs:5},{...reply(a),elapsedMs:4}]).reason,'invalid_elapsed_time');
    assert.equal(decode('{"private":').reason,'invalid_jsonl');
    assert.equal(run([{events:[]}]).reason,'invalid_envelope');
});

test('stdin replay preserves the other jack when a release reply is missing', () => {
    const rows = [a, getA, grant(getA,0), reply(a), b, getB, grant(getB,1), reply(b), release];
    function replay(messages) {
        const proc = spawnSync(process.execPath,[require.resolve('../../scripts/hdmi-receiver-decoder.cjs')],{
            input: messages.map(message => JSON.stringify(message)).join('\n'), encoding: 'utf8'
        });
        assert.equal(proc.stderr, '');
        return {exit: proc.status, report: JSON.parse(proc.stdout)};
    }
    const partial = replay(rows);
    assert.equal(partial.exit, 1);
    assert.deepEqual(partial.report.events.map(e => e.receiverIndex), [0,1,undefined]);
    assert.equal(partial.report.events[2].reason, 'missing_reply');
    const full = replay([...rows, reply(release, result)]);
    assert.equal(full.exit, 0);
    assert.equal(full.report.events[2].priorAllocationReplyLine, 7);
    assert.equal(full.report.events[2].replyElapsedMs, undefined);
});

test('acknowledges each release independently when both callers use the same release token', () => {
    const releaseA = resource('releaseResource','private-A',71);
    const rows = [a,b,getB,getA,grant(getA,0),reply(a),grant(getB,1),reply(b),
        releaseA,release,reply(release,result),reply(releaseA,result)];
    assert.deepEqual(run(rows).events.filter(e => e.kind === 'release_acknowledged')
        .map(e => [e.port,e.replyLine,e.priorAllocationReplyLine]), [[4,12,5],[1,11,7]]);
});
