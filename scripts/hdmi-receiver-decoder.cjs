// Offline ls-monitor JSONL reader. Output contains only port numbers and capture positions.
const {isDeepStrictEqual} = require('node:util');

const hdmi = 'com.webos.service.extinputs.hdmi';
const tvrm = 'com.webos.service.tvrm';
const maxBytes = 4 * 1024 * 1024;
const maxLines = 4096;
const isId = value => typeof value === 'string' && /^[A-Za-z0-9_.:+=/-]{1,192}$/.test(value);
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const unknown = reason => ({status: 'unknown', reason, events: []});

function exchangeKey(sender, destination, token) {
    if (isId(sender) && isId(destination) && Number.isSafeInteger(token) && token >= 0)
        return JSON.stringify([sender, destination, token]);
}

function collect(lines) {
    const calls = new Map();
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
        const {type, transport, destination, senderUniqueName, destinationUniqueName, payload, method} = message;
        if (type === 'call') {
            const selected = destination === hdmi && ['open','switchExternalInput','close'].includes(method) ||
                destination === tvrm && ['requestResource','releaseResource'].includes(method);
            if (!selected) continue;
            const key = exchangeKey(senderUniqueName, destinationUniqueName, message.token);
            if (!key || !object(payload) || !['TX','RX'].includes(transport)) throw Error('invalid_call');
            const old = calls.get(key);
            if (old) {
                if (old.transports.has(transport) || old.method !== method || old.destination !== destination ||
                    !isDeepStrictEqual(old.payload, payload)) throw Error('ambiguous_exchange');
                old.transports.add(transport);
            } else {
                calls.set(key, {method, destination, caller: senderUniqueName, payload, line: index + 1, elapsed,
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
                call.reply = {type, payload, line: index + 1, elapsed, transports: new Set([transport])};
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

function decode(text) {
    if (Buffer.byteLength(text) > maxBytes) return unknown('size_limit');
    const lines = text.trimEnd().split(/\r?\n/);
    if (lines.length > maxLines) return unknown('line_limit');
    let calls;
    try {
        calls = collect(lines);
    } catch (error) {
        return unknown(error instanceof SyntaxError ? 'invalid_jsonl' : error.message);
    }
    const switches = calls.filter(c => c.method === 'switchExternalInput');
    const operations = calls.filter(c => c.destination === tvrm);
    const inputs = new Set(switches.filter(c => [1,4].includes(c.payload.portId)).map(c => c.payload.pipelineId));
    const events = [];
    for (const id of inputs) {
        if (!isId(id)) return unknown('invalid_pipeline');
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
    if (!events.length) return unknown('no_target_switch');
    events.sort((a,b) => a.callLine - b.callLine);
    const observed = events.some(e => e.kind !== 'unknown');
    const status = observed && events.some(e => e.kind === 'unknown') ? 'partial' : observed ? 'observed' : 'unknown';
    return {status, events};
}

async function fromStdin() {
    const chunks = [];
    let size = 0;
    for await (const chunk of process.stdin) {
        size += chunk.length;
        if (size > maxBytes) return unknown('size_limit');
        chunks.push(chunk);
    }
    return decode(Buffer.concat(chunks).toString('utf8'));
}

if (require.main === module) fromStdin().catch(() => unknown('unreadable_input')).then(report => {
    console.log(JSON.stringify(report));
    if (report.status !== 'observed') process.exitCode = 1;
});
module.exports = {decode};
