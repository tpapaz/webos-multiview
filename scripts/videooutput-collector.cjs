// Fixed two-path SFTP evidence scope. No transport/profile imports or vendor execution.
const {performance} = require('node:perf_hooks');
const {metadata} = require('./hdmi-element-collector.cjs');
const contract = Object.freeze({workMs: 27000, totalMs: 30000, operationMs: 3000,
    chunkBytes: 65536, readCalls: 2049, totalBytes: 33554432, links: 0, opens: 2});
const seeds = Object.freeze([
    Object.freeze({path: '/usr/share/luna-service2/services.d/com.webos.service.videooutput.service', name: 'videooutput.service', cap: 65536}),
    Object.freeze({path: '/usr/sbin/videooutputd', name: 'videooutput.elf', cap: 33554432})
]);
const parents = Object.freeze(['/', '/usr', '/usr/share', '/usr/share/luna-service2', '/usr/share/luna-service2/services.d', '/usr/sbin']);
const fault = code => Object.assign(Error(code), {code});
const known = new Set(['cancelled', 'work_deadline', 'total_deadline', 'operation_timeout', 'connection_lost',
    'metadata', 'changed', 'file_bound', 'link_bound', 'read_bound', 'short_file', 'growth', 'local_io',
    'host_key_unverified', 'handle_close_unconfirmed', 'closure_unconfirmed', 'descriptor', 'exec_binding', 'elf_header']);
const category = e => known.has(e?.code) ? e.code : e?.code === 2 ? 'absent' : e?.code === 3 ? 'permission_denied' : 'operation_failed';
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
function descriptorBinding(bytes) {
    // Deliberately accept a small inert INI grammar, never a shell command or expansion.
    if (!Buffer.isBuffer(bytes) || !bytes.length || bytes.length > seeds[0].cap ||
        /[^\x09\x0a\x0d\x20-\x7e]/.test(bytes.toString('latin1'))) throw fault('descriptor');
    const lines = bytes.toString('ascii').split(/\r?\n/), fields = new Map();
    if (lines.length > 512) throw fault('descriptor');
    let section = false;
    for (const raw of lines) {
        const line = raw.trim();
        if (!line || line.startsWith('#') || line.startsWith(';')) continue;
        if (line === '[D-BUS Service]' && !section) { section = true; continue; }
        const m = /^([A-Za-z][A-Za-z0-9_-]*)[ \t]*=[ \t]*(.*)$/.exec(line);
        if (!section || !m || fields.has(m[1])) throw fault('descriptor');
        fields.set(m[1], m[2]);
    }
    const names = (fields.get('Name') || '').split(';');
    if (names[names.length - 1] === '') names.pop();
    if (!names.length || new Set(names).size !== names.length ||
        names.some(n => !/^com\.webos\.service\.videooutput(?:\.[A-Za-z0-9_-]+)*$/.test(n)) ||
        !names.includes('com.webos.service.videooutput')) throw fault('descriptor');
    if (!/^\/usr\/sbin\/videooutputd(?:[ \t]+[-A-Za-z0-9_./:=]+)*$/.test(fields.get('Exec') || '')) throw fault('exec_binding');
    return {service: 'com.webos.service.videooutput', executable: seeds[1].path, directExec: true};
}
function elfIdentity(bytes) {
    if (bytes.length < 52 || bytes.subarray(0, 4).toString('hex') !== '7f454c46' ||
        ![1, 2].includes(bytes[4]) || ![1, 2].includes(bytes[5]) || bytes[6] !== 1) throw fault('elf_header');
    const size = bytes[4] === 1 ? 52 : 64, little = bytes[5] === 1;
    if (bytes.length < size) throw fault('elf_header');
    const u16 = p => little ? bytes.readUInt16LE(p) : bytes.readUInt16BE(p);
    const u32 = p => little ? bytes.readUInt32LE(p) : bytes.readUInt32BE(p);
    if (![2, 3].includes(u16(16)) || u32(20) !== 1 || u16(size === 52 ? 40 : 52) !== size) throw fault('elf_header');
    return {classBits: bytes[4] === 1 ? 32 : 64, endian: little ? 'little' : 'big', machine: u16(18), type: u16(16)};
}
const realClock = {now: () => performance.now(), setTimeout, clearTimeout};
async function collect({allowOneRead, connectionFactory, sink, signal, clock = realClock} = {}) {
    if (allowOneRead !== true || typeof connectionFactory !== 'function' ||
        typeof sink?.begin !== 'function' || typeof sink?.complete !== 'function') throw fault('scope');
    const report = {schemaVersion: 1, kind: 'videooutput_read_only_collection', status: 'partial',
        files: seeds.map(s => ({path: s.path, status: 'not_started', bytes: 0, sha256: null, readCalls: 0})),
        parentsBefore: [], parentsAfter: [], connectionAttempts: 0, sftpAttempts: 0, opens: 0, readCalls: 0,
        readBytes: 0, savedBytes: 0, handlesClosed: true, subsystemClosed: false, connectionClosed: false,
        transportForced: false, elapsedMs: 0, stopReason: null, snapshotAtomic: false, activeLoadedIdentity: 'unknown', dualHdmi: 'unknown'};
    const start = clock.now(), elapsed = () => Math.max(0, clock.now() - start);
    let client, sftp, pending, closureNotify, stop, ended = false, sealed = false, lost = false, destroyed = false;
    const destroy = () => { if (!client || destroyed) return; destroyed = true; report.transportForced = true; try { client.destroy(); } catch { /* Keep closure unconfirmed. */ } };
    const abort = code => { stop ||= code; if (!(code === 'work_deadline' && pending?.cleanup)) pending?.(fault(code)); };
    const cancel = () => { abort('cancelled'); destroy(); };
    // Timers also cover lazy profile, key and client construction.
    const workTimer = clock.setTimeout(() => abort('work_deadline'), contract.workMs);
    const totalTimer = clock.setTimeout(() => { abort('total_deadline'); destroy(); }, contract.totalMs);
    signal?.addEventListener('abort', cancel, {once: true});
    function check(cleanup = false) {
        if (elapsed() >= contract.totalMs) throw fault('total_deadline');
        if (!cleanup && signal?.aborted) throw fault('cancelled');
        if (!cleanup && (stop || elapsed() >= contract.workMs)) throw fault(stop || 'work_deadline');
        if (!cleanup && lost) throw fault('connection_lost');
    }
    function operation(invoke, cleanup = false) {
        check(cleanup);
        return new Promise((resolve, reject) => {
            let settled = false;
            const deadline = Math.min(elapsed() + contract.operationMs, cleanup ? contract.totalMs : contract.workMs);
            const finish = (error, value) => {
                if (settled) return;
                settled = true; clock.clearTimeout(timer); if (pending === fail) pending = null;
                if (!error) { try { check(cleanup); if (elapsed() >= deadline) throw fault('operation_timeout'); } catch (e) { error = e; } }
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
    async function pathMetadata(name, type) {
        const a = metadata(await call('lstat', name));
        if (a.type === 'link') throw fault('link_bound');
        if (a.type !== type) throw fault('metadata');
        if (!same(a, metadata(await call('stat', name)))) throw fault('changed');
        return a;
    }
    async function parentSnapshot() {
        const rows = [];
        for (const name of parents) rows.push({path: name, metadata: await pathMetadata(name, 'directory')});
        return rows;
    }
    async function recheckParents() { if (!same(await parentSnapshot(), report.parentsBefore)) throw fault('changed'); }
    async function readFile(index) {
        const seed = seeds[index], row = report.files[index];
        let handle, output, content, readError;
        row.status = 'started';
        try {
            await recheckParents();
            row.metadata = await pathMetadata(seed.path, 'file');
            if (row.metadata.size < 1 || row.metadata.size > seed.cap || report.savedBytes + row.metadata.size > contract.totalBytes) throw fault('file_bound');
            await recheckParents();
            if (!same(await pathMetadata(seed.path, 'file'), row.metadata)) throw fault('changed');
            if (report.opens >= contract.opens) throw fault('file_bound');
            report.opens++; row.handleClose = 'unknown'; report.handlesClosed = false;
            handle = await call('open', seed.path, 'r');
            row.openedMetadata = metadata(await call('fstat', handle));
            if (!same(row.openedMetadata, row.metadata)) throw fault('changed');
            if (!same(await pathMetadata(seed.path, 'file'), row.metadata)) throw fault('changed');
            try { output = sink.begin(seed.name); } catch { throw fault('local_io'); }
            const buffer = Buffer.alloc(contract.chunkBytes), header = Buffer.alloc(index === 0 ? row.metadata.size : Math.min(64, row.metadata.size));
            for (let offset = 0;;) {
                if (report.readCalls >= contract.readCalls) throw fault('read_bound');
                const length = Math.min(buffer.length, row.metadata.size - offset + 1);
                row.readCalls++; report.readCalls++;
                const n = await operation(cb => sftp.read(handle, buffer, 0, length, offset, cb));
                if (!Number.isInteger(n) || n < 0 || n > length) throw fault('read_bound');
                report.readBytes += n;
                if (offset + n > row.metadata.size) throw fault('growth');
                if (!n) { if (offset !== row.metadata.size) throw fault('short_file'); break; }
                if (report.savedBytes + n > contract.totalBytes) throw fault('read_bound');
                check();
                if (offset < header.length) buffer.copy(header, offset, 0, Math.min(n, header.length - offset));
                try { output.write(buffer.subarray(0, n)); } catch { throw fault('local_io'); }
                check(); report.savedBytes += n; offset += n;
            }
            row.afterMetadata = metadata(await call('fstat', handle));
            if (!same(row.afterMetadata, row.metadata) || !same(await pathMetadata(seed.path, 'file'), row.metadata)) throw fault('changed');
            await recheckParents(); content = header;
        } catch (e) { readError = e; }
        finally {
            if (output) {
                try { Object.assign(row, output.finish()); } catch { row.bytes = null; row.localFile = seed.name; readError ||= fault('local_io'); }
            }
            if (handle !== undefined) {
                try {
                    if (lost) throw fault('connection_lost');
                    await operation(cb => sftp.close(handle, cb), true); row.handleClose = 'confirmed';
                } catch { readError ||= fault('handle_close_unconfirmed'); }
            }
            report.handlesClosed = report.files.every(r => !r.handleClose || r.handleClose === 'confirmed');
        }
        if (readError) { row.status = 'partial'; row.reason = category(readError); throw readError; }
        try { check(); } catch (e) { row.status = 'partial'; row.reason = category(e); throw e; }
        row.status = 'read'; return content;
    }
    const closed = () => { if (report.connectionClosed && (!sftp || report.subsystemClosed)) closureNotify?.(null); };
    try {
        check(); const connection = connectionFactory(); client = connection.client;
        client.on('error', () => { if (!sealed && !ended) { abort('connection_lost'); destroy(); } });
        client.on('close', () => { if (sealed) return; report.connectionClosed = true; lost = true; closed(); if (!ended) abort('connection_lost'); });
        check(); await operation(cb => { client.once('ready', () => cb(null)); report.connectionAttempts++; connection.start(); });
        if (connection.hostKeyVerified?.() !== true) throw fault('host_key_unverified');
        sftp = await operation(cb => { report.sftpAttempts++; client.sftp(cb); });
        sftp.on('error', () => { if (!sealed && !ended) { abort('connection_lost'); destroy(); } });
        sftp.once('close', () => { if (sealed) return; report.subsystemClosed = true; closed(); if (!ended) { lost = true; abort('connection_lost'); destroy(); } });
        report.parentsBefore = await parentSnapshot();
        const descriptor = await readFile(0);
        check(); report.descriptorBinding = descriptorBinding(descriptor);
        const header = await readFile(1);
        check(); report.elfIdentity = elfIdentity(header);
        // Recheck both paths after all reads, including the descriptor that authorized the second open.
        for (const row of report.files) if (!same(await pathMetadata(row.path, 'file'), row.metadata)) throw fault('changed');
        report.parentsAfter = await parentSnapshot();
        if (!same(report.parentsAfter, report.parentsBefore)) throw fault('changed');
    } catch (e) { stop ||= category(e); }
    finally {
        ended = true; clock.clearTimeout(workTimer);
        if (client && !(report.connectionClosed && (!sftp || report.subsystemClosed))) {
            try {
                await operation(cb => { closureNotify = cb; if (sftp && !report.subsystemClosed) sftp.end(); if (!report.connectionClosed) client.end(); closed(); }, true);
            } catch { stop ||= 'closure_unconfirmed'; destroy(); }
        }
        clock.clearTimeout(totalTimer); signal?.removeEventListener('abort', cancel);
        if (elapsed() >= contract.totalMs) { stop ||= 'total_deadline'; destroy(); }
        if (!report.connectionClosed || (sftp && !report.subsystemClosed)) stop ||= 'closure_unconfirmed';
        report.savedBytes = report.files.some(r => r.bytes === null) ? null : report.files.reduce((n, r) => n + r.bytes, 0);
        report.elapsedMs = elapsed(); report.stopReason = stop || null;
        if (!stop && report.files.every(r => r.status === 'read') && report.handlesClosed && report.subsystemClosed && report.connectionClosed) report.status = 'retrieved';
        sealed = true;
        const snapshot = JSON.parse(JSON.stringify(report));
        try { sink.complete(snapshot); } catch { snapshot.status = 'partial'; snapshot.stopReason = 'local_io'; }
        return snapshot;
    }
}
module.exports = {collect, contract, seeds, parents, descriptorBinding, elfIdentity};
