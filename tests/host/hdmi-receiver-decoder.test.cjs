const test = require('node:test');
const assert = require('node:assert/strict');
const {execFileSync, spawnSync} = require('node:child_process');
const path = require('node:path');
const {decode, decodeStock} = require('../../scripts/hdmi-receiver-decoder.cjs');

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

const media = 'com.webos.media';
const registration = {...call(media, 'registerPipeline', 1, {type: 'test-receiver'}, ':receiver'),
    destinationUniqueName: ':media'};
const connectionId = 'private-registration';
const registered = reply(registration, {connectionId});
const acquire = {...registration, method: 'acquire', token: 2, payload: {connectionId}};
const payload = {connectionId, state: true, resources: [{resource: 'HDMI_INPUT'}, {resource: 'VHDMIRX', index: 0}]};
const complete = {...call('private-client', 'acquireComplete', 6, payload, ':media'),
    sender: media, destinationUniqueName: ':receiver'};
const coverage = {type: 'tvrmSlotCoverage', continuous: true};
const pipeline = {type: 'tvrmSlot', kind: 'pipeline', slot: 5, enabled: true, fullId: true, pipelineId: b.payload.pipelineId};
const connection = {type: 'tvrmSlot', kind: 'connection', slot: 5, fullId: true, connectionId};
const beforeSlot = [coverage, b, registration, registered];
const mediaFindings = rows => run(rows).events.filter(e => e.operation === 'acquireComplete');

test('joins the server grant to the full backend switch inside one observed enabled slot lifetime', () => {
    const clientCopy = {...acquire, method: 'acquireComplete', token: 3, payload};
    const rows = [...beforeSlot, pipeline, connection, acquire, complete, {...complete, transport: 'RX'},
        clientCopy, reply(acquire), reply(b)];
    const report = run(rows);
    assert.deepEqual(mediaFindings(rows), [{operation: 'acquireComplete', callLine: 8,
        registrationReplyLine: 4, kind: 'media_receiver_assigned', receiverIndex: 0, port: 1,
        switchCallLine: 2, slotPipelineLine: 5, slotConnectionLine: 6}]);
    assert.equal(report.events[0].reason, 'no_tvrm_exchange');
    assert.doesNotMatch(JSON.stringify(report), /private-|:receiver|:media|:switcher|:backend/);
    assert.deepEqual(mediaFindings([registration, registered, acquire, clientCopy]), []);
});

test('requires a registered connection and reversed server/client endpoints even without a switch', () => {
    const rows = [registration, registered, complete];
    assert.deepEqual(run(rows), {status: 'observed', events: [{operation: 'acquireComplete', callLine: 3,
        kind: 'media_receiver_assigned', registrationReplyLine: 2, receiverIndex: 0, port: null}]});
    for (const messages of [
        [complete], [registration, complete, registered], [registration, {...registered, type: 'error'}, complete],
        [registration, reply(registration, {connectionId, returnValue: false}), complete],
        [registration, {...registered, replyToken: 44}, complete],
        [registration, registered, {...complete, payload: {...payload, connectionId: connectionId + '-other'}}],
        [registration, registered, {...complete, destinationUniqueName: ':unrelated'}],
        [registration, registered, {...complete, senderUniqueName: ':different-server'}],
        [registration, registered, {...acquire, method: 'unregisterPipeline'}, complete]
    ]) assert.equal(mediaFindings(messages)[0].reason, 'unproven_registration');
    assert.deepEqual(mediaFindings([registration, registered, {...complete, sender: 'private-client'}]), []);
});

test('failed, names-only, quantity-only and ambiguous receiver completions leave the index unknown', () => {
    for (const change of [
        {state: false}, {state: 'true'}, {state: undefined, resources: ['HDMI_INPUT','VHDMIRX']},
        {resources: [{resource: 'VHDMIRX', qty: 1}]}, {resources: [{resource: 'VHDMIRX'}]},
        ...[-1, 1.5, '0', null].map(index => ({resources: [{resource: 'VHDMIRX', index}]})),
        {resources: [...payload.resources, {resource: 'VHDMIRX', index: 1}]}
    ]) {
        const [event] = mediaFindings([registration, registered, {...complete, payload: {...payload, ...change}}]);
        assert.equal(event.kind, 'unknown');
        assert.equal(event.receiverIndex, undefined);
    }
});

test('missing or interrupted slot evidence retains the grant for the connection alone', () => {
    const match = [pipeline, connection];
    for (const evidence of [
        [pipeline], [connection], [{...pipeline, enabled: false}, connection],
        [{...pipeline, enabled: false}, connection, pipeline], [pipeline, {...connection, slot: 1}],
        [{...pipeline, pipelineId: pipeline.pipelineId.slice(0,-1)}, connection],
        [{...pipeline, fullId: false}, connection], [pipeline, {...connection, connectionId: 'another'}],
        [...match, {...pipeline, enabled: false}, pipeline], [...match, {...pipeline, pipelineId: 'another'}],
        [...match, {...connection, connectionId: 'another'}], [...match, {...connection, slot: 1}],
        [...match, {...pipeline, slot: 1}], [...match, {type: 'tvrmSlot', kind: 'reuse', slot: 5}],
        ...['copy','move'].flatMap(kind => [[...match, {type: 'tvrmSlot', kind, fromSlot: 5, toSlot: 2}],
            [...match, {type: 'tvrmSlot', kind, fromSlot: 2, toSlot: 5}]]),
        [pipeline, {type: 'tvrmSlot', kind: 'gap'}, connection], [pipeline, {...connection, slot: -1}, connection],
        [...match, acquire, {...acquire, token: 30, method: 'tryAcquire'}],
        [...match, select(pipeline.pipelineId, 4)], [...match, call(hdmi, 'close', 40, {pipelineId: pipeline.pipelineId}, ':switcher')]
    ]) {
        const [event] = mediaFindings([...beforeSlot, ...evidence, complete, reply(b)]);
        assert.equal(event.port, null);
        assert.equal(event.receiverIndex, 0);
    }
    for (const rows of [
        [...beforeSlot.slice(1), ...match, complete, reply(b)],
        [coverage, registration, registered, ...match, b, reply(b), complete],
        [...beforeSlot, ...match, complete, reply(b, {returnValue: false})],
        [...beforeSlot, pipeline, complete, connection, reply(b)]
    ]) assert.equal(mediaFindings(rows)[0].port, null);
});

test('prefix collisions and competing switches across a nested completion break the port match', () => {
    const prefix = 'x'.repeat(31);
    const binding = select(prefix + '1', 2);
    const other = select(prefix + '2', 4);
    const start = [coverage, binding, registration, registered, {...pipeline, pipelineId: prefix + '1'}, connection];
    assert.equal(mediaFindings([...start, complete, reply(binding)])[0].port, 2);
    assert.equal(mediaFindings([...start, other, complete, reply(binding)])[0].port, null);
    assert.equal(mediaFindings([...start, complete, select(prefix + '1', 4), reply(binding)])[0].port, null);
});

test('one successful TVRM list can omit type 19 while the media server assigns an indexed receiver', () => {
    const allocatorReply = reply(getB, {...result, resources: {pipelineId: b.payload.pipelineId, data: []}});
    const rows = [...beforeSlot, getB, pipeline, connection, complete, allocatorReply, reply(b)];
    const full = run(rows);
    assert.equal(full.status, 'observed');
    assert.deepEqual(full.events.map(e => [e.kind, e.port]), [['no_receiver_in_reply',1], ['media_receiver_assigned',1]]);
    const badMedia = run([...rows, {...complete, transport: 'RX', payload: {}}]);
    assert.equal(badMedia.status, 'partial');
    assert.deepEqual(badMedia.events[0], full.events[0]);
    const badSwitch = mediaFindings([...rows, {...b, transport: 'RX', payload: {...b.payload, portId: 3}}]);
    assert.equal(badSwitch[0].receiverIndex, 0);
    assert.equal(badSwitch[0].port, null);
});

test('the HDMI 1 stock and reconnect controls give independent, incomplete findings', () => {
    // Replay only the fields retained in the stock callback and the separate TVRM allocation verdict.
    const namesOnly = {...complete, payload: {connectionId, resources: ['HDMI_INPUT','VHDMIRX']}};
    const stock = mediaFindings([registration, registered, namesOnly]);
    assert.equal(stock[0].kind, 'unknown');
    assert.equal(stock[0].receiverIndex, undefined);
    const reconnect = [b, getB, reply(getB, {...result, resources: {pipelineId: b.payload.pipelineId, data: []}}), reply(b)];
    assert.deepEqual(run(reconnect).events.map(e => [e.port, e.kind]), [[1, 'no_receiver_in_reply']]);
    assert.equal(mediaFindings([...reconnect, complete])[0].reason, 'unproven_registration');
    assert.equal(run([coverage, registration, registered, coverage, complete]).reason, 'unexpected_capture_header');
});

function stockFilter(messages) {
    const awk = process.platform === 'win32'
        ? path.resolve(execFileSync('git', ['--exec-path'], {encoding: 'utf8'}).trim(), '../../../usr/bin/awk.exe')
        : 'awk';
    const program = path.resolve(__dirname, '../../scripts/stock-hdmi1-monitor.awk');
    return execFileSync(awk, ['-f', program], {input: messages.map(m => JSON.stringify(m)).join('\n') + '\n',
        encoding: 'utf8', timeout: 5000});
}

test('stock HDMI 1 filter preserves the server payload and the registration reply through stdin replay', () => {
    // Receiver subsequence of stock events 59, 63, 65, 73, 80, 81, 83, 247.
    // The receipt supplies ordering and resource names. IDs, state and index here are synthetic.
    const clientCopy = {...acquire, method: 'acquireComplete', token: 83, payload};
    const server = {...complete, payload: {...payload, resources: [{resource: 'VHDMIRX', index: 2}]}};
    const request = {...acquire, payload: {connectionId, resources: ['HDMI_INPUT','VHDMIRX'].map(resource => ({resource, qty: 1}))}};
    const rows = [b, registration, {...registered, sender: media}, request, server,
        {...reply(acquire), sender: media}, clientCopy, {...reply(b), sender: hdmi}];
    const unrelated = {...registration, destination: media + '.other'};
    const ignoredMethod = {...registration, method: 'getStatus'};
    const stream = stockFilter([unrelated, ignoredMethod, ...rows]);
    assert.deepEqual(stream.trimEnd().split(/\r?\n/).slice(1,-1).map(line => JSON.parse(line)), rows);
    const proc = spawnSync(process.execPath, [require.resolve('../../scripts/hdmi-receiver-decoder.cjs'), '--stock-hdmi1'],
        {input: stream, encoding: 'utf8'});
    assert.equal(proc.status, 0);
    assert.equal(proc.stderr, '');
    assert.deepEqual(JSON.parse(proc.stdout), {status: 'observed', events: [{operation: 'acquireComplete',
        callLine: 5, registrationReplyLine: 3, kind: 'media_receiver_assigned', receiverIndex: 2, port: null}]});

    for (const change of [{state: false}, {resources: [{resource: 'VHDMIRX'}]},
        {state: undefined, resources: ['HDMI_INPUT','VHDMIRX']}]) {
        const altered = rows.map(r => r === server ? {...server, payload: {...server.payload, ...change}} : r);
        const report = decodeStock(stockFilter(altered));
        assert.equal(report.status, 'unknown');
        assert.equal(report.events.length, 1);
        assert.equal(report.events[0].registrationReplyLine, 3);
        assert.equal(report.events[0].receiverIndex, undefined);
    }
    assert.equal(decodeStock(stockFilter(rows.filter(r => r !== server))).reason, 'no_media_completion');
});

test('incomplete, capped or concatenated stock streams never export an earlier grant', () => {
    const rows = [registration, {...registered, sender: media}, complete];
    const stream = stockFilter(rows);
    const capped = stockFilter([...rows, {...complete, payload: {private: 'x'.repeat(32768)}}]);
    assert.match(capped, /FOCUSED_LINE_CAPPED/);
    for (const [input, reason] of [
        [capped, 'stock_line_capped'], [stream + stream, 'invalid_stock_stream'],
        [stream.slice(0, stream.lastIndexOf('FOCUSED_STREAM_END')), 'incomplete_stock_stream'],
        [stream.trimEnd(), 'incomplete_stock_stream'],
        [stream.replace('FOCUSED_STREAM_END', '{"private-data":\nFOCUSED_STREAM_END'), 'invalid_jsonl'],
        [stream.replace('FOCUSED_STREAM_END', '{}\n'.repeat(4096) + 'FOCUSED_STREAM_END'), 'line_limit'],
        [stream + 'x'.repeat(3 * 1024 * 1024), 'size_limit']
    ]) assert.deepEqual(decodeStock(input), {status: 'unknown', reason, events: []});
});
