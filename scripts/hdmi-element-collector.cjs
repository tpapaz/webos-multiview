// Fixed three-path SFTP collector. Transport is injected; no profile/network imports.
const {performance} = require('node:perf_hooks');
const contract = Object.freeze({workMs: 27000, totalMs: 30000, operationMs: 3000,
    chunkBytes: 65536, readCalls: 2049, totalBytes: 67174400, links: 2});
const seeds = Object.freeze([
    Object.freeze({path: '/etc/extinput/elementList.json', name: 'elementList.json', cap: 65536}),
    Object.freeze({path: '/usr/lib/element/libelement-video-hdmi.so', name: 'video-hdmi.elf', cap: 33554432, stem: 'libelement-video-hdmi.so'}),
    Object.freeze({path: '/usr/lib/element/libelement-video-sink.so', name: 'video-sink.elf', cap: 33554432, stem: 'libelement-video-sink.so'})
]);
const parents = Object.freeze(['/etc', '/etc/extinput', '/usr', '/usr/lib', '/usr/lib/element']);
const fault = code => Object.assign(new Error(code), {code});
const knownErrors = new Set(['cancelled', 'work_deadline', 'total_deadline', 'operation_timeout', 'connection_lost',
    'metadata', 'changed', 'file_bound', 'link_bound', 'read_bound', 'short_file', 'growth', 'local_io', 'host_key_unverified']);
const category = e => knownErrors.has(e?.code) ? e.code : e?.code === 3 ? 'permission_denied' : 'operation_failed';
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
function metadata(a) {
    if (!a || !['mode', 'uid', 'gid', 'size', 'mtime'].every(k => Number.isSafeInteger(a[k]) && a[k] >= 0)) throw fault('metadata');
    const type = a.mode & 0o170000;
    return {type: type === 0o100000 ? 'file' : type === 0o040000 ? 'directory' : type === 0o120000 ? 'link' : 'other',
        mode: a.mode, uid: a.uid, gid: a.gid, size: a.size, mtime: a.mtime};
}
function linkTarget(text, stem) {
    if (typeof text !== 'string' || !/^[\x20-\x7e]{1,512}$/.test(text)) throw fault('link_bound');
    const prefix = '/usr/lib/element/';
    const name = text.startsWith(prefix) ? text.slice(prefix.length) : text;
    const escaped = stem.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (name.length > 128 || !new RegExp('^' + escaped + '(?:\\.[0-9]+){0,3}$').test(name)) throw fault('link_bound');
    return prefix + name;
}
const realClock = {now: () => performance.now(), setTimeout, clearTimeout};
async function collect({allowOneRead, connectionFactory, sink, signal, clock = realClock}) {
    if (allowOneRead !== true || typeof connectionFactory !== 'function') throw fault('scope');
    const report = {schemaVersion: 1, kind: 'hdmi_element_read_only_collection', status: 'partial',
        files: [], parentsBefore: [], parentsAfter: [], connectionAttempts: 0, sftpAttempts: 0, opens: 0, readBytes: 0, savedBytes: 0,
        stopReason: null, handlesClosed: true, subsystemClosed: false, connectionClosed: false,
        transportForced: false, elapsedMs: 0, snapshotAtomic: false, activePluginIdentity: 'unknown', dualHdmi: 'unknown'};
    let client, sftp, pending, ended = false, sealed = false, lost = false, stop = null, destroyed = false;
    const handles = new Map(), start = clock.now();
    const elapsed = () => Math.max(0, clock.now() - start);
    const destroy = () => {
        if (!client || destroyed) return;
        destroyed = true; report.transportForced = true;
        try { client.destroy(); } catch { /* Closure stays unconfirmed. */ }
    };
    const abort = code => { stop ||= code; if (!(code === 'work_deadline' && pending?.cleanup)) pending?.(fault(code)); };
    const cancelled = () => { abort('cancelled'); destroy(); };
    const workTimer = clock.setTimeout(() => abort('work_deadline'), contract.workMs);
    const totalTimer = clock.setTimeout(() => { abort('total_deadline'); destroy(); }, contract.totalMs);
    signal?.addEventListener('abort', cancelled, {once: true});
    function check(cleanup = false) {
        if (elapsed() >= contract.totalMs) throw fault('total_deadline');
        if (!cleanup && signal?.aborted) throw fault('cancelled');
        if (!cleanup && (stop || elapsed() >= contract.workMs)) throw fault(stop || 'work_deadline');
        if (lost && !(cleanup && ended)) throw fault('connection_lost');
    }
    function operation(invoke, cleanup = false) {
        check(cleanup);
        return new Promise((resolve, reject) => {
            let settled = false;
            const finish = (error, value) => {
                if (settled) return;
                settled = true; clock.clearTimeout(timer); if (pending === fail) pending = null;
                if (!error) { try { check(cleanup); } catch (e) { error = e; } }
                error ? reject(error) : resolve(value);
            };
            const fail = error => finish(error);
            fail.cleanup = cleanup;
            const timer = clock.setTimeout(() => {
                finish(fault('operation_timeout')); stop ||= 'operation_timeout'; destroy();
            }, Math.min(contract.operationMs, (cleanup ? contract.totalMs : contract.workMs) - elapsed()));
            pending = fail;
            try { invoke(finish); } catch (e) { finish(e); }
        });
    }
    const call = (method, ...args) => operation(cb => sftp[method](...args, cb));
    const stat = async name => metadata(await call('lstat', name));
    const parentSnapshot = async () => {
        const list = [];
        for (const name of parents) {
            const attrs = await stat(name);
            if (attrs.type !== 'directory') throw fault('metadata');
            list.push({path: name, metadata: attrs});
        }
        return list;
    };
    async function resolveSeed(seed) {
        let name = seed.path;
        const chain = [], seen = new Set();
        for (;;) {
            if (seen.has(name)) throw fault('link_bound');
            seen.add(name);
            let attrs;
            try { attrs = await stat(name); } catch (e) {
                if (name === seed.path && chain.length === 0 && e.code === 2) return null;
                throw e;
            }
            if (attrs.type !== 'link') {
                if (attrs.type !== 'file' || attrs.size < 1 || attrs.size > seed.cap) throw fault('file_bound');
                return {chain, path: name, metadata: attrs};
            }
            if (!seed.stem || chain.length >= contract.links || attrs.size < 1 || attrs.size > 512) throw fault('link_bound');
            const text = await call('readlink', name), target = linkTarget(text, seed.stem);
            if (Buffer.byteLength(text, 'utf8') !== attrs.size) throw fault('changed');
            chain.push({path: name, metadata: attrs, text, target}); name = target;
        }
    }
    async function recheck(binding) {
        for (const link of binding.chain) {
            if (!same(await stat(link.path), link.metadata) || await call('readlink', link.path) !== link.text) throw fault('changed');
        }
        if (!same(await stat(binding.path), binding.metadata)) throw fault('changed');
    }
    async function readSeed(seed) {
        const row = {path: seed.path, status: 'started', bytes: 0, sha256: null, readCalls: 0, startMs: elapsed()};
        report.files.push(row);
        let file, handle;
        try {
            const binding = await resolveSeed(seed);
            if (!binding) { row.status = 'absent'; return; }
            Object.assign(row, {chain: binding.chain, finalPath: binding.path, metadata: binding.metadata});
            await recheck(binding);
            if (!same(await parentSnapshot(), report.parentsBefore)) throw fault('changed');
            if (report.opens >= 3) throw fault('read_bound');
            report.opens++;
            row.handleClose = 'unknown';
            handle = await call('open', binding.path, 'r'); handles.set(handle, row);
            row.openedMetadata = metadata(await call('fstat', handle));
            if (!same(row.openedMetadata, binding.metadata)) throw fault('changed');
            await recheck(binding);
            file = sink.begin(seed.name);
            const buffer = Buffer.alloc(contract.chunkBytes);
            for (let offset = 0;;) {
                if (row.readCalls >= contract.readCalls) throw fault('read_bound');
                const length = Math.min(buffer.length, binding.metadata.size - offset + 1);
                row.readCalls++;
                const n = await operation(cb => sftp.read(handle, buffer, 0, length, offset, cb));
                if (!Number.isInteger(n) || n < 0 || n > length) throw fault('read_bound');
                report.readBytes += n;
                if (offset + n > binding.metadata.size) throw fault('growth');
                if (n === 0) { if (offset !== binding.metadata.size) throw fault('short_file'); break; }
                if (report.savedBytes + n > contract.totalBytes) throw fault('read_bound');
                check();
                try { file.write(buffer.subarray(0, n)); } catch { throw fault('local_io'); }
                check();
                report.savedBytes += n; offset += n;
            }
            row.afterMetadata = metadata(await call('fstat', handle));
            if (!same(row.afterMetadata, binding.metadata)) throw fault('changed');
            await recheck(binding);
            if (!same(await parentSnapshot(), report.parentsBefore)) throw fault('changed');
            row.status = 'read';
        } catch (e) { row.status = 'partial'; row.reason = category(e); stop ||= row.reason; throw e; }
        finally {
            if (file) {
                try { Object.assign(row, file.finish()); }
                catch { row.status = 'partial'; row.bytes = null; row.sha256 = null; row.localFile = seed.name; throw fault('local_io'); }
            }
            if (handle !== undefined) {
                try {
                    await operation(cb => sftp.close(handle, cb), true);
                    handles.delete(handle); row.handleClose = 'confirmed';
                } catch { row.handleClose = 'unconfirmed'; report.handlesClosed = false; stop ||= 'handle_close_unconfirmed'; }
            }
            row.endMs = elapsed();
        }
        if (stop) throw fault(stop);
    }
    try {
        // The factory must return an unconnected owned client so cleanup is installed before start.
        check();
        const connection = connectionFactory(); client = connection.client;
        client.on('error', () => { if (!ended) { abort('connection_lost'); destroy(); } });
        client.on('close', () => { if (sealed) return; report.connectionClosed = true; lost = true; if (!ended) abort('connection_lost'); });
        await operation(cb => {
            client.once('ready', () => cb(null));
            report.connectionAttempts++;
            connection.start();
        });
        if (connection.hostKeyVerified?.() !== true) throw fault('host_key_unverified');
        sftp = await operation(cb => { report.sftpAttempts++; client.sftp(cb); });
        sftp.on('error', () => { if (!ended) { abort('connection_lost'); destroy(); } });
        sftp.once('close', () => { if (sealed) return; report.subsystemClosed = true; if (!ended) abort('connection_lost'); });
        report.parentsBefore = await parentSnapshot();
        for (const seed of seeds) await readSeed(seed);
        report.parentsAfter = await parentSnapshot();
        if (!same(report.parentsBefore, report.parentsAfter)) throw fault('changed');
    } catch (e) { stop ||= category(e); }
    finally {
        // No content or metadata dispatch below this boundary, even if a callback arrives late.
        ended = true; clock.clearTimeout(workTimer);
        for (const [handle, row] of handles) {
            // A CLOSE that already failed/expired is never retried.
            if (row.handleClose === 'unconfirmed') continue;
            try { await operation(cb => sftp.close(handle, cb), true); row.handleClose = 'confirmed'; }
            catch { row.handleClose = 'unconfirmed'; report.handlesClosed = false; }
        }
        if (client && !report.connectionClosed) {
            try {
                await operation(cb => {
                    client.once('close', () => cb(null));
                    sftp?.end(); client.end();
                }, true);
            } catch { stop ||= 'closure_unconfirmed'; destroy(); }
        }
        clock.clearTimeout(totalTimer); signal?.removeEventListener('abort', cancelled);
        if (sftp && !report.subsystemClosed) stop ||= 'closure_unconfirmed';
        report.handlesClosed &&= report.files.every(r => r.handleClose === undefined || r.handleClose === 'confirmed');
        report.savedBytes = report.files.some(row => row.bytes === null) ? null : report.files.reduce((sum, row) => sum + row.bytes, 0);
        report.elapsedMs = elapsed(); report.stopReason = stop;
        if (!stop && report.files.length === 3 && report.files.every(r => r.status === 'read') &&
            report.handlesClosed && report.subsystemClosed && report.connectionClosed && report.elapsedMs < contract.totalMs) report.status = 'retrieved';
        sealed = true;
        sink.complete(report);
    }
    return report;
}
module.exports = {collect, contract, seeds, parents, metadata, linkTarget};
