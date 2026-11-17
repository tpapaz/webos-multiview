// Fixed single-candidate read. No transport/profile imports; no caller-supplied paths or bounds.
const {performance} = require('node:perf_hooks');
const {metadata} = require('./hdmi-element-collector.cjs');
const contract = Object.freeze({workMs: 27000, totalMs: 30000, operationMs: 3000,
    chunkBytes: 65536, readCalls: 2049, totalBytes: 33554432, links: 2, opens: 1});
const seed = Object.freeze({path: '/usr/lib/libresource_mgr_client.so.1', name: 'resource-client.elf', cap: contract.totalBytes});
const parents = Object.freeze(['/usr', '/usr/lib']);
const fault = code => Object.assign(Error(code), {code});
const known = new Set(['cancelled', 'work_deadline', 'total_deadline', 'operation_timeout', 'connection_lost',
    'metadata', 'changed', 'file_bound', 'link_bound', 'read_bound', 'short_file', 'growth', 'local_io',
    'host_key_unverified', 'handle_close_unconfirmed', 'closure_unconfirmed']);
const category = e => known.has(e?.code) ? e.code : e?.code === 3 ? 'permission_denied' : 'operation_failed';
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
function linkTarget(text) {
    if (typeof text !== 'string' || !/^[\x20-\x7e]{1,512}$/.test(text)) throw fault('link_bound');
    const name = text.startsWith('/usr/lib/') ? text.slice(9) : text;
    if (name.length > 128 || !/^libresource_mgr_client\.so\.1(?:\.[0-9]+){0,2}$/.test(name)) throw fault('link_bound');
    return '/usr/lib/' + name;
}
const realClock = {now: () => performance.now(), setTimeout, clearTimeout};
async function collect({allowOneRead, connectionFactory, sink, signal, clock = realClock} = {}) {
    if (allowOneRead !== true || typeof connectionFactory !== 'function' ||
        typeof sink?.begin !== 'function' || typeof sink?.complete !== 'function') throw fault('scope');
    const row = {path: seed.path, status: 'not_started', chain: [], bytes: 0, sha256: null, readCalls: 0};
    const report = {schemaVersion: 1, kind: 'resource_client_read_only_collection', status: 'partial', file: row,
        parentsBefore: [], parentsAfter: [], connectionAttempts: 0, sftpAttempts: 0, opens: 0,
        readBytes: 0, savedBytes: 0, handlesClosed: true, subsystemClosed: false, connectionClosed: false,
        transportForced: false, elapsedMs: 0, stopReason: null, snapshotAtomic: false,
        seedLocation: 'candidate_not_verified', activeLoadedIdentity: 'unknown', dualHdmi: 'unknown'};
    const start = clock.now(), elapsed = () => Math.max(0, clock.now() - start);
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
        if (!cleanup && signal?.aborted) throw fault('cancelled');
        if (!cleanup && (stop || elapsed() >= contract.workMs)) throw fault(stop || 'work_deadline');
        if (lost && !cleanup) throw fault('connection_lost');
    }
    function operation(invoke, cleanup = false) {
        check(cleanup);
        return new Promise((resolve, reject) => {
            let settled = false;
            const deadline = Math.min(elapsed() + contract.operationMs, cleanup ? contract.totalMs : contract.workMs);
            const finish = (error, value) => {
                if (settled) return;
                settled = true; clock.clearTimeout(timer); if (pending === fail) pending = null;
                if (!error) {
                    try { check(cleanup); if (elapsed() >= deadline) throw fault('operation_timeout'); }
                    catch (e) { error = e; }
                }
                if (error?.code === 'operation_timeout') { stop ||= 'operation_timeout'; destroy(); }
                error ? reject(error) : resolve(value);
            };
            const fail = error => finish(error); fail.cleanup = cleanup;
            const timer = clock.setTimeout(() => finish(fault('operation_timeout')), deadline - elapsed());
            pending = fail;
            try { invoke(finish); } catch (e) { finish(e); }
        });
    }
    const call = (method, ...args) => operation(cb => sftp[method](...args, cb));
    const stat = async name => metadata(await call('lstat', name));
    async function parentSnapshot() {
        const result = [];
        for (const name of parents) {
            const attrs = await stat(name);
            if (attrs.type !== 'directory') throw fault('metadata');
            result.push({path: name, metadata: attrs});
        }
        return result;
    }
    async function resolveSeed() {
        let name = seed.path;
        const seen = new Set();
        for (;;) {
            if (seen.has(name)) throw fault('link_bound');
            seen.add(name);
            let attrs;
            try { attrs = await stat(name); } catch (e) {
                if (name === seed.path && !row.chain.length && e.code === 2) { row.status = 'absent'; return false; }
                throw e;
            }
            if (attrs.type !== 'link') {
                if (attrs.type !== 'file' || attrs.size < 1 || attrs.size > seed.cap) throw fault('file_bound');
                row.finalPath = name; row.metadata = attrs; return true;
            }
            if (row.chain.length >= contract.links || attrs.size < 1 || attrs.size > 512) throw fault('link_bound');
            const text = await call('readlink', name), target = linkTarget(text);
            if (Buffer.byteLength(text, 'utf8') !== attrs.size) throw fault('changed');
            row.chain.push({path: name, metadata: attrs, text, target}); name = target;
        }
    }
    async function recheck() {
        for (const link of row.chain) {
            if (!same(await stat(link.path), link.metadata) || await call('readlink', link.path) !== link.text) throw fault('changed');
        }
        if (!same(await stat(row.finalPath), row.metadata)) throw fault('changed');
    }
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
        sftp = await operation(cb => { report.sftpAttempts++; client.sftp(cb); });
        sftp.on('error', () => { if (!sealed && !ended) { abort('connection_lost'); destroy(); } });
        sftp.once('close', () => {
            if (sealed) return;
            report.subsystemClosed = true; closed(); if (!ended) { lost = true; abort('connection_lost'); destroy(); }
        });
        report.parentsBefore = await parentSnapshot(); row.status = 'started';
        if (await resolveSeed()) {
            await recheck();
            if (!same(await parentSnapshot(), report.parentsBefore)) throw fault('changed');
            report.opens++; row.handleClose = 'unknown'; report.handlesClosed = false;
            handle = await call('open', row.finalPath, 'r');
            row.openedMetadata = metadata(await call('fstat', handle));
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
                report.readBytes += n;
                if (offset + n > row.metadata.size) throw fault('growth');
                if (n === 0) { if (offset !== row.metadata.size) throw fault('short_file'); break; }
                if (report.savedBytes + n > contract.totalBytes) throw fault('read_bound');
                check();
                try { output.write(buffer.subarray(0, n)); } catch { throw fault('local_io'); }
                check(); report.savedBytes += n; offset += n;
            }
            row.afterMetadata = metadata(await call('fstat', handle));
            if (!same(row.afterMetadata, row.metadata)) throw fault('changed');
            await recheck();
            row.status = 'read';
        }
        report.parentsAfter = await parentSnapshot();
        if (!same(report.parentsAfter, report.parentsBefore)) throw fault('changed');
    } catch (e) { stop ||= category(e); row.status = 'partial'; row.reason = stop; }
    finally {
        // No further content/metadata, including after a late callback. Never retry CLOSE.
        ended = true; clock.clearTimeout(workTimer);
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
            if (row.status === 'read') report.status = 'retrieved';
            else if (row.status === 'absent') report.status = 'absent';
        }
        if (stop) { row.status = 'partial'; row.reason ||= stop; }
        sealed = true;
        // Store a sealed copy; late events cannot amend the receipt.
        const snapshot = JSON.parse(JSON.stringify(report));
        try { sink.complete(snapshot); }
        catch { snapshot.status = 'partial'; snapshot.stopReason = 'local_io'; }
        return snapshot;
    }
}
module.exports = {collect, contract, seed, parents, linkTarget};
