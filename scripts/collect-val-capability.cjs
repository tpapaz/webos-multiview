// Fixed inert VAL capability-file reader. No transport/profile/key access until explicit dispatch.
const {performance} = require('node:perf_hooks');
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const {metadata} = require('./hdmi-element-collector.cjs');
const contract = Object.freeze({workMs: 27000, totalMs: 30000, operationMs: 3000, closureMs: 3000,
    chunkBytes: 65536, readCalls: 2, totalBytes: 65536, observedBytes: 65537, metadataCalls: 15, links: 0, opens: 1});
const seed = Object.freeze({path: '/etc/palm/val/device-cap.json', name: 'device-cap.json', cap: contract.totalBytes});
const parents = Object.freeze(['/etc', '/etc/palm', '/etc/palm/val']);
const fault = code => Object.assign(Error(code), {code});
const known = new Set(['cancelled', 'work_deadline', 'total_deadline', 'operation_timeout', 'connection_lost',
    'metadata', 'changed', 'file_bound', 'link_bound', 'read_bound', 'short_file', 'growth', 'local_io',
    'host_key_unverified', 'endpoint_binding_unverified', 'handle_close_unconfirmed', 'closure_unconfirmed', 'metadata_bound']);
const category = e => known.has(e?.code) ? e.code : e?.code === 3 ? 'permission_denied' : 'operation_failed';
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
// Inspect closed local bytes only. JSON.parse validates grammar; the iterative token
// walk detects duplicate keys (including escaped spellings) without recursive parsing.
function interpret(bytes) {
    if (!Buffer.isBuffer(bytes) || bytes.length < 1 || bytes.length > seed.cap) return {status: 'byte_bound'};
    let text, value;
    try { text = new TextDecoder('utf-8', {fatal: true, ignoreBOM: true}).decode(bytes); }
    catch { return {status: 'invalid_utf8'}; }
    try { value = JSON.parse(text); } catch { return {status: 'invalid_json'}; }
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {status: 'invalid_root'};
    const stack = [];
    for (const [token] of text.matchAll(/"(?:\\.|[^"\\])*"|[{}\[\],:]/g)) {
        const top = stack[stack.length - 1];
        if (token === '{') stack.push({keys: new Set(), key: true});
        else if (token === '[') stack.push({});
        else if (token === '}' || token === ']') stack.pop();
        else if (token === ',' && top?.keys) top.key = true;
        else if (token[0] === '"' && top?.keys && top.key) {
            const key = JSON.parse(token);
            if (top.keys.has(key)) return {status: 'ambiguous_keys'};
            top.keys.add(key); top.key = false;
        }
    }
    const missing = !Object.hasOwn(value, 'planes');
    if (!missing && !Array.isArray(value.planes)) return {status: 'planes_not_array'};
    if (!missing && value.planes.some(name => typeof name !== 'string' || !/^[\x01-\x7f]+$/.test(name)))
        return {status: 'unsupported_plane_name'};
    const names = missing ? ['MAIN'] : [...new Set(value.planes)].sort();
    const candidates = names.slice(0, 2).map((name, ordinal) => ({name, ordinal,
        planeID: 44 + ordinal, node: '/dev/video' + (30 + ordinal)}));
    return {status: missing ? 'default_candidate' : 'mapped', planesDisposition: missing ? 'missing' : names.length ? 'list' : 'empty',
        originalPlanes: missing ? null : value.planes, sortedUniqueNames: names, candidateSinks: candidates,
        extraOrdinals: names.length - candidates.length,
        MAIN: candidates.find(s => s.name === 'MAIN')?.ordinal ?? null,
        SUB0: candidates.find(s => s.name === 'SUB0')?.ordinal ?? null,
        activeLoadedConfiguration: 'unknown', dualHdmi: 'unknown', mappingStatus: 'candidate_for_saved_provider'};
}
const realClock = {now: () => performance.now(), setTimeout, clearTimeout};
async function collect({allowOneRead, connectionFactory, sink, signal, clock = realClock} = {}) {
    if (allowOneRead !== true || typeof connectionFactory !== 'function' ||
        typeof sink?.begin !== 'function' || typeof sink?.complete !== 'function') throw fault('scope');
    const row = {path: seed.path, status: 'not_started', bytes: 0, sha256: null, readCalls: 0};
    const report = {schemaVersion: 1, kind: 'val_capability_read_only_collection', status: 'partial', file: row,
        parentsBefore: [], parentsAfter: [], connectionAttempts: 0, sftpAttempts: 0, opens: 0,
        readBytes: 0, savedBytes: 0, metadataCalls: 0, handlesClosed: true, subsystemClosed: false, connectionClosed: false,
        transportForced: false, elapsedMs: 0, stopReason: null, snapshotAtomic: false,
        candidateLocation: 'loader_path_not_remote_verified', rawCapture: 'incomplete', interpretation: {status: 'not_attempted'},
        activeLoadedConfiguration: 'unknown', dualHdmi: 'unknown', hostKeyMatched: false, endpointBindingMatched: false};
    const start = clock.now(), elapsed = () => Math.max(0, clock.now() - start);
    const chunks = []; let cleanupEnd = contract.totalMs;
    let client, sftp, handle, output, pending, closureNotify, stop, ended = false, sealed = false, lost = false, destroyed = false;
    const destroy = () => {
        if (!client || destroyed) return;
        destroyed = true; report.transportForced = true;
        try { client.destroy(); } catch { /* Retain unconfirmed closure. */ }
    };
    const abort = code => { stop ||= code; if (!(code === 'work_deadline' && pending?.cleanup)) pending?.(fault(code)); };
    const cancel = () => { abort('cancelled'); destroy(); };
    // Both timers precede connectionFactory (including lazy profile/key/client construction).
    const workTimer = clock.setTimeout(() => abort('work_deadline'), contract.workMs);
    const totalTimer = clock.setTimeout(() => { abort('total_deadline'); destroy(); }, contract.totalMs);
    signal?.addEventListener('abort', cancel, {once: true});
    function check(cleanup = false) {
        if (elapsed() >= contract.totalMs) throw fault('total_deadline');
        if (cleanup && elapsed() >= cleanupEnd) throw fault('closure_unconfirmed');
        if (!cleanup && signal?.aborted) throw fault('cancelled');
        if (!cleanup && (stop || elapsed() >= contract.workMs)) throw fault(stop || 'work_deadline');
        if (lost && !cleanup) throw fault('connection_lost');
    }
    function operation(invoke, cleanup = false) {
        check(cleanup);
        return new Promise((resolve, reject) => {
            let settled = false;
            const deadline = Math.min(elapsed() + contract.operationMs, cleanup ? cleanupEnd : contract.workMs);
            const finish = (error, value) => {
                if (settled) return;
                settled = true; clock.clearTimeout(timer); if (pending === fail) pending = null;
                if (!error) {
                    try { check(cleanup); if (elapsed() >= deadline) throw fault('operation_timeout'); }
                    catch (e) { error = e; }
                }
                if (error?.code === 'operation_timeout') { if (!cleanup) stop ||= 'operation_timeout'; destroy(); }
                error ? reject(error) : resolve(value);
            };
            const fail = error => finish(error); fail.cleanup = cleanup;
            const timer = clock.setTimeout(() => finish(fault('operation_timeout')), deadline - elapsed());
            pending = fail;
            try { invoke(finish); } catch (e) { finish(e); }
        });
    }
    const call = (method, ...args) => operation(cb => sftp[method](...args, cb));
    const attributes = async (method, value) => {
        if (report.metadataCalls >= contract.metadataCalls) throw fault('metadata_bound');
        report.metadataCalls++; return metadata(await call(method, value));
    };
    const stat = name => attributes('lstat', name);
    async function parentSnapshot() {
        const result = [];
        for (const name of parents) {
            const attrs = await stat(name);
            if (attrs.type !== 'directory') throw fault('metadata');
            result.push({path: name, metadata: attrs});
        }
        return result;
    }
    async function leaf() {
        const attrs = await stat(seed.path);
        if (attrs.type !== 'file' || attrs.size < 1 || attrs.size > seed.cap) throw fault('file_bound');
        return attrs;
    }
    async function recheck() { if (!same(await leaf(), row.metadata)) throw fault('changed'); }
    const closed = () => {
        if (report.connectionClosed && (!sftp || report.subsystemClosed)) closureNotify?.(null);
    };
    try {
        check();
        const connection = connectionFactory(); client = connection.client;
        client.on('error', () => { if (!sealed && !ended) { abort('connection_lost'); destroy(); } });
        client.on('close', () => {
            if (sealed) return;
            report.connectionClosed = true; lost = true; closed(); if (!ended) abort('connection_lost');
        });
        check();
        await operation(cb => { client.once('ready', () => cb(null)); report.connectionAttempts++; connection.start(); });
        if (connection.hostKeyVerified?.() !== true) throw fault('host_key_unverified');
        report.hostKeyMatched = true;
        if (connection.endpointBindingVerified?.() !== true) throw fault('endpoint_binding_unverified');
        report.endpointBindingMatched = true;
        sftp = await operation(cb => { report.sftpAttempts++; client.sftp(cb); });
        sftp.on('error', () => { if (!sealed && !ended) { abort('connection_lost'); destroy(); } });
        sftp.once('close', () => {
            if (sealed) return;
            report.subsystemClosed = true; closed(); if (!ended) { lost = true; abort('connection_lost'); destroy(); }
        });
        report.parentsBefore = await parentSnapshot(); row.status = 'started';
        try { row.metadata = await leaf(); }
        catch (e) { if (e.code === 2) row.status = 'absent'; else throw e; }
        if (row.metadata) {
            if (!same(await parentSnapshot(), report.parentsBefore)) throw fault('changed');
            await recheck();
            report.opens++; row.handleClose = 'unknown'; report.handlesClosed = false;
            handle = await call('open', seed.path, 'r');
            row.openedMetadata = await attributes('fstat', handle);
            if (!same(row.openedMetadata, row.metadata)) throw fault('changed');
            await recheck();
            try { output = sink.begin(seed.name); } catch { throw fault('local_io'); }
            const buffer = Buffer.alloc(contract.chunkBytes);
            for (let offset = 0;;) {
                if (row.readCalls >= contract.readCalls) throw fault('read_bound');
                const length = Math.min(buffer.length, row.metadata.size - offset + 1);
                row.readCalls++;
                const n = await operation(cb => sftp.read(handle, buffer, 0, length, offset, cb));
                if (!Number.isInteger(n) || n < 0 || n > length) throw fault('read_bound');
                report.readBytes += n; if (report.readBytes > contract.observedBytes) throw fault('read_bound');
                if (offset + n > row.metadata.size) throw fault('growth');
                if (n === 0) { if (offset !== row.metadata.size) throw fault('short_file'); break; }
                if (report.savedBytes + n > contract.totalBytes) throw fault('read_bound');
                check();
                chunks.push(Buffer.from(buffer.subarray(0, n)));
                try { output.write(buffer.subarray(0, n)); } catch { throw fault('local_io'); }
                check(); report.savedBytes += n; offset += n;
            }
            row.afterMetadata = await attributes('fstat', handle);
            if (!same(row.afterMetadata, row.metadata)) throw fault('changed');
            await recheck();
            row.status = 'read';
        }
        report.parentsAfter = await parentSnapshot();
        if (!same(report.parentsAfter, report.parentsBefore)) throw fault('changed');
    } catch (e) { stop ||= category(e); row.status = 'partial'; row.reason = stop; }
    finally {
        // No further content/metadata, including after a late callback. Never retry CLOSE.
        ended = true; cleanupEnd = Math.min(contract.totalMs, elapsed() + contract.closureMs); clock.clearTimeout(workTimer);
        if (output) {
            try { Object.assign(row, output.finish()); }
            catch { row.bytes = null; row.sha256 = null; row.localFile = seed.name; stop ||= 'local_io'; }
        }
        if (handle !== undefined) {
            try {
                if (lost) throw fault('connection_lost');
                await operation(cb => sftp.close(handle, cb), true);
                row.handleClose = 'confirmed'; report.handlesClosed = true;
            } catch { row.handleClose = 'unconfirmed'; stop ||= 'handle_close_unconfirmed'; }
        }
        if (client && !(report.connectionClosed && (!sftp || report.subsystemClosed))) {
            try {
                await operation(cb => {
                    closureNotify = cb;
                    if (sftp && !report.subsystemClosed) sftp.end();
                    if (!report.connectionClosed) client.end();
                    closed();
                }, true);
            } catch { stop ||= 'closure_unconfirmed'; destroy(); }
        }
        clock.clearTimeout(totalTimer); signal?.removeEventListener('abort', cancel);
        if (elapsed() >= contract.totalMs) { stop ||= 'total_deadline'; destroy(); }
        if (!report.connectionClosed || (sftp && !report.subsystemClosed)) stop ||= 'closure_unconfirmed';
        report.savedBytes = row.bytes; report.elapsedMs = elapsed(); report.stopReason = stop || null;
        if (!stop && report.handlesClosed && report.subsystemClosed && report.connectionClosed) {
            if (row.status === 'read') { report.status = 'retrieved'; report.rawCapture = 'complete'; }
            else if (row.status === 'absent') report.status = 'absent';
        }
        if (stop) { row.status = 'partial'; row.reason ||= stop; }
        if (report.rawCapture === 'complete') report.interpretation = interpret(Buffer.concat(chunks));
        sealed = true;
        // Store a sealed copy; late events cannot amend the receipt.
        const snapshot = JSON.parse(JSON.stringify(report));
        try { sink.complete(snapshot); }
        catch { snapshot.status = 'partial'; snapshot.stopReason = 'local_io'; }
        return snapshot;
    }
}

// Fixed single-output capture: keep completed capture allowlists unchanged.
function reserveCapture(directory) {
    const privateCapture = require('./hdmi-element-capture.cjs').reserveCapture(directory);
    let started = false, active = false;
    return {
        begin(name) {
            if (started || name !== seed.name) throw Error('VAL capability capture scope refused');
            const fd = fs.openSync(path.join(directory, name), 'wx', 0o600);
            started = true; active = true;
            let bytes = 0, done = false;
            const digest = crypto.createHash('sha256');
            return {
                write(buffer) {
                    if (done || !Buffer.isBuffer(buffer) || bytes + buffer.length > seed.cap) throw Error('Capture bound');
                    for (let offset = 0; offset < buffer.length;) {
                        const n = fs.writeSync(fd, buffer, offset, buffer.length - offset);
                        if (n < 1) throw Error('Local write stopped');
                        digest.update(buffer.subarray(offset, offset + n)); bytes += n; offset += n;
                    }
                },
                finish() {
                    if (done) throw Error('Capture already closed');
                    done = true;
                    try { fs.fsyncSync(fd); return {bytes, sha256: digest.digest('hex'), localFile: name}; }
                    finally { try { fs.closeSync(fd); } finally { active = false; } }
                }
            };
        },
        complete(report) { if (active) throw Error('Capture still open'); privateCapture.complete(report); }
    };
}
const root = path.resolve(__dirname, '..');
const requestFile = 'build/phase-2/hdmi-val-capability-request-20261117-001/request.json';
const requestSha256 = '68f0d2b231bb9a86890488e373f9e7a201f7bbdb996448deaa9924343e115001';
function localBindings() {
    const bytes = fs.readFileSync(path.join(root, requestFile));
    if (crypto.createHash('sha256').update(bytes).digest('hex') !== requestSha256) throw Error('Prepared request changed');
    const r = JSON.parse(bytes);
    if (r.candidatePath !== seed.path || JSON.stringify(r.parents) !== JSON.stringify(parents) ||
        r.bounds.totalMs !== contract.totalMs || r.bounds.workCutoffMs !== contract.workMs || r.bounds.operationMs !== contract.operationMs ||
        r.bounds.maxBytes !== contract.totalBytes || r.bounds.chunkBytes !== contract.chunkBytes || r.bounds.readCalls !== contract.readCalls ||
        r.bounds.maxLinks !== contract.links || r.bounds.maxOpens !== contract.opens || r.bounds.maxFiles !== 1 ||
        r.bounds.maxSimultaneousFileHandles !== 1 || r.bounds.sftpSubsystems !== 1 ||
        r.bounds.maxMetadataCalls !== contract.metadataCalls || r.bounds.maxObservedBytes !== contract.observedBytes || r.bounds.eofProbeBytes !== 1 || r.bounds.connections !== 1 || r.bounds.retries !== 0 ||
        r.bounds.connectMs !== 3000 || r.bounds.closureMs !== 3000) throw Error('Prepared scope changed');
    for (const p of [r.provenance.provider, r.provenance.reviewedFindings, r.provenance.priorAudit, r.transport.connectionHelper]) {
        if (crypto.createHash('sha256').update(fs.readFileSync(p.file)).digest('hex') !== p.sha256) throw Error('Evidence binding changed');
    }
    const workingControl = require('./collect-val-library.cjs').localBindings();
    if (!same(workingControl, r.transport.workingControlBindings)) throw Error('Working control changed');
    return {requestSha256, workingControl};
}
async function main(args) {
    if (args.length === 1 && args[0] === '--plan') {
        console.log(JSON.stringify({mode: 'offline_plan', ...localBindings(), seed, parents, contract,
            location: 'loader_path_not_remote_verified', dispatch: false, TVConnections: 0})); return;
    }
    if (args.length !== 4 || args[0] !== '--allow-one-val-capability-evidence-read' || args[1] !== '--device' || !args[2]) throw Error('Scope refused');
    const directory = path.resolve(args[3]);
    if (path.dirname(directory) !== path.join(root, 'build', 'phase-2') ||
        !/^hdmi-val-capability-evidence-\d{8}-\d{3}$/.test(path.basename(directory)) || fs.existsSync(directory)) throw Error('Fresh fixed local slot required');
    const bindings = localBindings(), capture = reserveCapture(directory);
    const sink = {...capture, complete: report => capture.complete({...report, bindings, trustMode: 'tofu', independentlyVerified: false})};
    const stop = new AbortController(), cancel = () => stop.abort();
    process.on('SIGINT', cancel); process.on('SIGTERM', cancel);
    try {
        const result = await collect({allowOneRead: true, sink, signal: stop.signal,
            connectionFactory: () => ({...require('./resource-client-connection.cjs').savedConnection({alias: args[2]}),
                endpointBindingVerified: () => true})});
        console.log(JSON.stringify({status: result.status, stopReason: result.stopReason,
            fileRead: result.file.status === 'read', interpretationStatus: result.interpretation.status, savedBytes: result.savedBytes, handlesClosed: result.handlesClosed,
            subsystemClosed: result.subsystemClosed, connectionClosed: result.connectionClosed, elapsedMs: result.elapsedMs}));
        if (result.status !== 'retrieved') process.exitCode = 1;
    } finally { process.removeListener('SIGINT', cancel); process.removeListener('SIGTERM', cancel); }
}
if (require.main === module) main(process.argv.slice(2)).catch(() => {
    console.error('VAL capability reader refused or stopped; no retry. Review the private local outcome.'); process.exitCode = 1;
});
module.exports = {collect, contract, seed, parents, interpret, reserveCapture, localBindings, main, requestFile, requestSha256};

