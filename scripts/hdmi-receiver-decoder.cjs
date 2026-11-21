// Offline receiver attribution. Private identifiers stay inside one decode invocation.
const {isDeepStrictEqual} = require('node:util');

const hdmi = 'com.webos.service.extinputs.hdmi';
const tvrm = 'com.webos.service.tvrm';
const media = 'com.webos.media';
const maxBytes = 4 * 1024 * 1024;
const stockMaxBytes = 3 * 1024 * 1024;
const stockLineBytes = 32768;
const maxLines = 4096;
const isId = value => typeof value === 'string' && /^[A-Za-z0-9_.:+=/-]{1,192}$/.test(value);
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const unknown = reason => ({status: 'unknown', reason, events: []});

function exchangeKey(sender, destination, token) {
    if (isId(sender) && isId(destination) && Number.isSafeInteger(token) && token >= 0)
        return JSON.stringify([sender, destination, token]);
}

function readRows(lines) {
    const rows = [];
    let lastElapsed = 0;
    for (const [index, line] of lines.entries()) {
        if (!line.trim()) continue;
        const message = JSON.parse(line);
        if (!object(message) || typeof message.type !== 'string') throw Error('invalid_envelope');
        // A collector may annotate envelopes with its relative monotonic clock.
        const elapsed = message.elapsedMs;
        if (elapsed !== undefined) {
            if (!Number.isSafeInteger(elapsed) || elapsed < lastElapsed) throw Error('invalid_elapsed_time');
            lastElapsed = elapsed;
        }
        rows.push({...message, line: index + 1});
    }
    return rows;
}

function collect(rows, selected) {
    const calls = new Map();
    for (const message of rows) {
        const {type, transport, destination, senderUniqueName, destinationUniqueName,
            payload, method, line, elapsedMs: elapsed} = message;
        if (type === 'call') {
            if (!selected(message)) continue;
            const key = exchangeKey(senderUniqueName, destinationUniqueName, message.token);
            if (!key || !object(payload) || !['TX','RX'].includes(transport)) throw Error('invalid_call');
            const old = calls.get(key);
            if (old) {
                if (old.transports.has(transport) || old.method !== method || old.destination !== destination ||
                    !isDeepStrictEqual(old.payload, payload)) throw Error('ambiguous_exchange');
                old.transports.add(transport);
            } else {
                calls.set(key, {method, destination, caller: senderUniqueName, peer: destinationUniqueName, payload, line, elapsed,
                    transports: new Set([transport])});
            }
        } else if (type === 'return' || type === 'error') {
            const call = calls.get(exchangeKey(destinationUniqueName, senderUniqueName, message.replyToken));
            if (!call) continue;
            if (!['TX','RX'].includes(transport)) throw Error('invalid_reply');
            if (call.reply) {
                if (call.reply.transports.has(transport) || call.reply.type !== type ||
                    !isDeepStrictEqual(call.reply.payload, payload)) throw Error('ambiguous_exchange');
                call.reply.transports.add(transport);
            } else {
                call.reply = {type, payload, line, elapsed, transports: new Set([transport])};
            }
        }
    }
    return [...calls.values()];
}

function accepted(call) {
    return call.reply?.type === 'return' && call.reply.payload?.returnValue === true;
}

function resourceEvent(call) {
    const reply = call.reply?.payload;
    if (!call.reply) return {kind: 'unknown', reason: 'missing_reply'};
    if (!accepted(call) || reply.tvcoResult !== 0) return {kind: 'unknown', reason: 'no_successful_tvrm_result'};
    if (call.method === 'releaseResource') return {kind: 'release_acknowledged'};
    if (reply.resources?.pipelineId !== call.payload.pipelineId) return {kind: 'unknown', reason: 'pipeline_mismatch'};
    const entries = reply.resources.data;
    if (!Array.isArray(entries) || !entries.every(e => Number.isInteger(e?.type)))
        return {kind: 'unknown', reason: 'invalid_resource_list'};
    const receivers = entries.filter(e => e.type === 19); // TVRM VHDMIRX
    if (!receivers.length) return {kind: 'no_receiver_in_reply'};
    if (receivers.length !== 1 || !Number.isInteger(receivers[0].port) ||
        receivers[0].port < 0 || receivers[0].port > 7) return {kind: 'unknown', reason: 'ambiguous_receiver'};
    return {kind: 'receiver_assigned', receiverIndex: receivers[0].port};
}

function tvrmEvents(calls) {
    const switches = calls.filter(c => c.method === 'switchExternalInput');
    const operations = calls.filter(c => c.destination === tvrm);
    const inputs = new Set(switches.filter(c => [1,4].includes(c.payload.portId)).map(c => c.payload.pipelineId));
    const events = [];
    for (const id of inputs) {
        if (!isId(id)) throw Error('invalid_pipeline');
        const bindings = switches.filter(c => c.payload.pipelineId === id);
        const binding = bindings[0];
        const port = binding.payload.portId;
        const operationsForId = operations.filter(c => c.payload.pipelineId === id);
        // The allocator compares up to 31 bytes. Never join colliding identifiers.
        const collision = calls.some(c => isId(c.payload.pipelineId) && c.payload.pipelineId !== id &&
            c.payload.pipelineId.slice(0,31) === id.slice(0,31));
        if (bindings.length !== 1 || collision || !accepted(binding)) {
            for (const candidate of bindings.filter(c => [1,4].includes(c.payload.portId))) {
                events.push({port: candidate.payload.portId, callLine: candidate.line,
                    kind: 'unknown', reason: 'unproven_port_binding'});
            }
            continue;
        }
        const close = calls.find(c => c.method === 'close' && c.payload.pipelineId === id && c.line > binding.line);
        const reopened = calls.find(c => c.method === 'open' && c.line > binding.line &&
            accepted(c) && c.reply.payload.pipelineId === id);
        let found = false;
        for (const [i, call] of operationsForId.entries()) {
            if (call.line < binding.line) continue;
            found = true;
            const event = {port, operation: call.method, callLine: call.line, replyLine: call.reply?.line ?? null};
            if (call.elapsed !== undefined) event.callElapsedMs = call.elapsed;
            if (call.reply?.elapsed !== undefined) event.replyElapsedMs = call.reply.elapsed;
            const end = call.reply?.line ?? call.line;
            // A nested release can finish while the backend close is still in flight.
            const insideClose = call.method === 'releaseResource' && close && accepted(close) &&
                call.line > close.line && end < close.reply.line;
            if ((reopened && end >= reopened.line) || (close && end >= close.line && !insideClose)) {
                Object.assign(event, {kind: 'unknown', reason: 'uncertain_session_lifetime'});
            } else {
                Object.assign(event, resourceEvent(call));
            }
            const previous = operationsForId[i - 1];
            const prior = events.at(-1);
            if (event.kind === 'release_acknowledged' && prior?.kind === 'receiver_assigned' &&
                prior.port === port && prior.callLine === previous?.line && previous.caller === call.caller &&
                prior.replyLine < call.line && object(call.payload.input) && object(call.payload.purpose) &&
                isDeepStrictEqual(previous.payload.input, call.payload.input) &&
                isDeepStrictEqual(previous.payload.purpose, call.payload.purpose) &&
                !operationsForId.some(other => other !== previous && other !== call && other.line < end &&
                    (other.reply?.line ?? Infinity) > previous.line)) {
                event.priorAllocationReplyLine = prior.replyLine;
            }
            events.push(event);
        }
        if (!found) events.push({port, callLine: binding.line, kind: 'unknown', reason: 'no_tvrm_exchange'});
    }
    return events;
}

const slotNumber = n => Number.isInteger(n) && n >= 0 && n < 8;

// These are normalized observations from a single ordered capture. Two isolated
// log lines cannot attest coverage of slot lifetimes and handle transfers.
function slotObservation(row) {
    const {kind, slot, pipelineId, connectionId, fromSlot, toSlot} = row;
    if ((kind === 'copy' || kind === 'move') && slotNumber(fromSlot) && slotNumber(toSlot)) return row;
    if (slotNumber(slot)) {
        if (kind === 'reuse') return row;
        if (kind === 'pipeline' && typeof row.enabled === 'boolean' &&
            (!row.enabled || isId(pipelineId) && row.fullId === true)) return row;
        if (kind === 'connection' && isId(connectionId) && row.fullId === true) return row;
    }
    return {line: row.line, kind: 'gap'};
}

function portEvidence(diagnostics, backend, registration, completion) {
    const seen = diagnostics.filter(d => d.line < completion.line);
    if (seen.some(d => d.kind === 'gap')) return;
    const connections = seen.filter(d => d.kind === 'connection' && d.connectionId === completion.payload.connectionId);
    const slot = connections[0]?.slot;
    if (slot === undefined || connections.some(d => d.slot !== slot || d.line <= registration.reply.line)) return;
    if (seen.some(d => (d.kind === 'copy' || d.kind === 'move') && (d.fromSlot === slot || d.toSlot === slot))) return;

    const local = seen.filter(d => d.slot === slot);
    const pipeline = local.find(d => d.kind === 'pipeline' && d.enabled);
    if (!pipeline) return;
    const id = pipeline.pipelineId;
    const firstObservation = Math.min(pipeline.line, connections[0].line);
    for (const d of local) {
        if (d.kind === 'reuse') return;
        if (d.kind === 'connection' && d.connectionId !== completion.payload.connectionId) return;
        if (d.kind !== 'pipeline') continue;
        if (d.enabled && d.pipelineId !== id) return;
        if (!d.enabled && (d.line >= firstObservation || connections[0].line < pipeline.line)) return;
    }
    // TVRM compares up to 31 bytes. A conflicting slot or backend with that
    // prefix makes even a full-text match unsafe to attribute.
    const prefix = id.slice(0,31);
    if (seen.some(d => d.kind === 'pipeline' && d.enabled && d.slot !== slot && d.pipelineId.slice(0,31) === prefix)) return;
    const related = backend.filter(c => c.line < completion.line && isId(c.payload.pipelineId) &&
        c.payload.pipelineId.slice(0,31) === prefix);
    if (related.some(c => c.payload.pipelineId !== id)) return;
    const switches = related.filter(c => c.method === 'switchExternalInput');
    const binding = switches[0];
    if (switches.length !== 1 || !accepted(binding) || ![1,2,3,4].includes(binding.payload.portId) ||
        binding.line >= firstObservation || (binding.reply.payload.pipelineId !== undefined && binding.reply.payload.pipelineId !== id)) return;
    // A grant can be nested inside the switch exchange. Its eventual success
    // must belong to the same selection, even when the reply comes later.
    const end = Math.max(binding.reply.line, completion.line);
    if (diagnostics.some(d => d.kind === 'gap' && d.line < end)) return;
    for (const call of backend) {
        if (call.line <= binding.line || call.line >= end) continue;
        if (call.payload.pipelineId === id && ['close','switchExternalInput'].includes(call.method)) return;
        if (call.method === 'open' && accepted(call) && call.reply.payload.pipelineId === id) return;
    }
    let previousEnd = 0;
    for (const op of related.filter(c => c.destination === tvrm)) {
        if (op.line < previousEnd) return;
        previousEnd = op.reply?.line ?? Infinity;
    }
    return {port: binding.payload.portId, switchCallLine: binding.line, slotPipelineLine: pipeline.line,
        slotConnectionLine: connections[0].line};
}

function mediaEvents(rows, backend) {
    const methods = ['registerPipeline','unregisterPipeline','acquire','tryAcquire'];
    const calls = collect(rows, c => c.destination === media && methods.includes(c.method) ||
        c.sender === media && c.method === 'acquireComplete');
    const registrations = calls.filter(c => c.method === 'registerPipeline' && c.reply?.type === 'return' &&
        isId(c.reply.payload?.connectionId) && [undefined, true].includes(c.reply.payload.returnValue) &&
        [undefined, true].includes(c.reply.payload.state));
    const covered = rows[0]?.type === 'tvrmSlotCoverage' && rows[0].continuous === true;
    const diagnostics = covered ? rows.filter(r => r.type === 'tvrmSlot').map(slotObservation) : [];
    const events = [];
    const pending = new Map();
    for (const call of calls) {
        const id = call.payload.connectionId;
        if (call.method === 'acquire' || call.method === 'tryAcquire') {
            const requests = pending.get(id) ?? {count: 0};
            requests.count++;
            if (requests.count > 1) requests.ambiguous = true;
            pending.set(id, requests);
            continue;
        }
        if (call.method !== 'acquireComplete') continue;
        const matches = registrations.filter(r => r.reply.line < call.line && r.reply.payload.connectionId === id);
        const registration = matches[0];
        const registered = matches.length === 1 && registration.caller === call.peer && registration.peer === call.caller &&
            !calls.some(c => c.method === 'unregisterPipeline' && c.payload.connectionId === id &&
                c.line > registration.reply.line && c.line < call.line);
        const requests = pending.get(id);
        if (registered && requests) {
            requests.count--;
            if (requests.count === 0) pending.delete(id);
        }
        const entries = call.payload.resources;
        const validList = Array.isArray(entries) && entries.every(e => typeof e?.resource === 'string');
        const receivers = validList ? entries.filter(e => e.resource === 'VHDMIRX') : [];
        if (call.payload.state === true && validList && !receivers.length && entries.length) continue;
        const event = {operation: call.method, callLine: call.line, kind: 'unknown'};
        events.push(event);
        if (!registered) {
            event.reason = 'unproven_registration';
            continue;
        }
        event.registrationReplyLine = registration.reply.line;
        if (call.payload.state !== true) event.reason = 'no_successful_media_completion';
        else if (receivers.length !== 1 || !Number.isSafeInteger(receivers[0].index) || receivers[0].index < 0)
            event.reason = 'no_unique_receiver_index';
        else {
            event.kind = 'media_receiver_assigned';
            event.receiverIndex = receivers[0].index;
            event.port = null;
            if (covered && !requests?.ambiguous)
                Object.assign(event, portEvidence(diagnostics, backend, registration, call));
        }
    }
    return events;
}

function decode(text) {
    if (Buffer.byteLength(text) > maxBytes) return unknown('size_limit');
    const lines = text.trimEnd().split(/\r?\n/);
    if (lines.length > maxLines) return unknown('line_limit');
    let rows;
    try {
        rows = readRows(lines);
    } catch (error) {
        return unknown(error instanceof SyntaxError ? 'invalid_jsonl' : error.message);
    }
    if (rows.slice(1).some(r => r.type === 'tvrmSlotCoverage')) return unknown('unexpected_capture_header');
    let backend = [], events = [];
    const errors = [];
    try {
        backend = collect(rows, c => c.destination === hdmi && ['open','switchExternalInput','close'].includes(c.method) ||
            c.destination === tvrm && ['requestResource','releaseResource'].includes(c.method));
        events = tvrmEvents(backend);
    } catch (error) {
        backend = [];
        errors.push({kind: 'unknown', reason: error.message});
    }
    try {
        events.push(...mediaEvents(rows, backend));
    } catch (error) {
        errors.push({operation: 'acquireComplete', kind: 'unknown', reason: error.message});
    }
    return reportEvents(events, 'no_target_switch', errors);
}

function reportEvents(events, emptyReason, errors = []) {
    if (!events.length) return unknown(errors[0]?.reason ?? emptyReason);
    events.sort((a,b) => a.callLine - b.callLine);
    events.push(...errors);
    const observed = events.some(e => e.kind !== 'unknown');
    const status = observed && events.some(e => e.kind === 'unknown') ? 'partial' : observed ? 'observed' : 'unknown';
    return {status, events};
}

// Replay stdout from stock-hdmi1-monitor.awk. Its READY/END markers delimit one
// filter invocation. Once any selected line is lost, discard the whole finding.
function decodeStock(text) {
    if (Buffer.byteLength(text) > stockMaxBytes) return unknown('size_limit');
    if (!text.endsWith('\n')) return unknown('incomplete_stock_stream');
    const lines = text.split(/\r?\n/);
    lines.pop(); // terminating newline
    if (lines[0] !== 'FOCUSED_STREAM_READY' || lines.at(-1) !== 'FOCUSED_STREAM_END')
        return unknown('incomplete_stock_stream');
    const envelopes = lines.slice(1, -1);
    if (envelopes.length > maxLines) return unknown('line_limit');
    for (const line of envelopes) {
        if (line === 'FOCUSED_LINE_CAPPED' || Buffer.byteLength(line) > stockLineBytes) return unknown('stock_line_capped');
        if (line.startsWith('FOCUSED_') || !line.trim()) return unknown('invalid_stock_stream');
    }
    try {
        const rows = readRows(envelopes);
        if (rows.some(r => !['call','return','error'].includes(r.type) || !['TX','RX'].includes(r.transport)))
            return unknown('invalid_envelope');
        // The stock projector required a named service in sender or destination.
        // This replay exports media findings only. The wire filter has no slot evidence.
        const mediaRows = rows.filter(r => r.sender === media || r.destination === media);
        return reportEvents(mediaEvents(mediaRows, []), 'no_media_completion');
    } catch (error) {
        return unknown(error instanceof SyntaxError ? 'invalid_jsonl' : error.message);
    }
}

async function fromStdin(stock) {
    const chunks = [];
    let size = 0;
    for await (const chunk of process.stdin) {
        size += chunk.length;
        if (size > (stock ? stockMaxBytes : maxBytes)) return unknown('size_limit');
        chunks.push(chunk);
    }
    const text = Buffer.concat(chunks).toString('utf8');
    return stock ? decodeStock(text) : decode(text);
}

if (require.main === module) fromStdin(process.argv[2] === '--stock-hdmi1').catch(() => unknown('unreadable_input')).then(report => {
    console.log(JSON.stringify(report));
    if (report.status !== 'observed') process.exitCode = 1;
});
module.exports = {decode, decodeStock, stockMaxBytes, stockLineBytes, maxLines};
