// Read-only IO for the physical controller. No remote write/signal/repair methods.
const crypto = require('node:crypto');
const path = require('node:path');
const {id, filename, validateReport} = require('./hdmi-picture-report.cjs');
const {project} = require('./entry-exit-evidence.cjs');
const base = '/media/developer/apps/usr/palm/applications/' + id;
const hash = b => crypto.createHash('sha256').update(b).digest('hex');
const attrs = s => ({type: s.isFile() ? 'file' : s.isDirectory() ? 'directory' : 'other',
    mode: s.mode & 0o7777, uid: s.uid, gid: s.gid, size: s.size, mtime: s.mtime});
const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const fault = code => Object.assign(Error(), {code});
const category = e => ({2: 'absent', 3: 'unreadable', 4: 'remote_file_failure',
    CHANGED: 'changed_file', BOUND: 'bound', DEADLINE: 'deadline', CANCELLED: 'cancelled'}[e?.code] || 'operation_failed');
function commandFor(p) {
    const fields = ['acquireHdmi4', 'launchBootId', 'launchStartByBoottimeMs', 'launchStartByRealtimeMs'];
    if (!p || !equal(Object.keys(p).sort(), fields.sort()) || p.acquireHdmi4 !== true ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(p.launchBootId) ||
        !fields.filter(k => k.startsWith('launchStart')).every(k => Number.isSafeInteger(p[k]) && p[k] > 0)) throw fault('BOUND');
    return "/usr/bin/luna-send -n 1 -w 2000 'luna://com.webos.applicationManager/launch' '" +
        JSON.stringify({id, subscribe: false, params: p}) + "'";
}
async function openIo(client, stage, check, {reportFilename = filename('picture'), classifyReport} = {}) {
    const aliases = ['/tmp/' + id + '/' + reportFilename, '/var/palm/jail/' + id + '/tmp/' + id + '/' + reportFilename];
    const sftp = await stage('io.sftp', () => new Promise((resolve, reject) => client.sftp((e, s) => e ? reject(e) : resolve(s))));
    const call = (label, method, ...args) => stage(label + '.' + method, () => new Promise((resolve, reject) =>
        sftp[method](...args, (e, value) => e ? reject(e) : resolve(value))));
    async function range(label, handle, position, length) {
        const b = Buffer.alloc(length); let count = 0;
        while (count < length) {
            const n = await stage(label + '.read', () => new Promise((resolve, reject) =>
                sftp.read(handle, b, count, Math.min(32768, length - count), position + count,
                    (e, n) => e ? reject(e) : resolve(n))));
            if (!n) break;
            count += n;
        }
        return b.subarray(0, count);
    }
    async function read(name, cap, label, proc = false) {
        const before = attrs(await call(label, 'lstat', name));
        if (before.type !== 'file' || before.size > cap || (proc && before.size !== 0)) throw fault('BOUND');
        const h = await call(label, 'open', name, 'r');
        try {
            if (!equal(attrs(await call(label, 'fstat', h)), before)) throw fault('CHANGED');
            const bytes = await range(label, h, 0, proc ? cap : before.size);
            const after = attrs(await call(label, 'fstat', h));
            if (after.type !== 'file' || (!proc && (!equal(after, before) || bytes.length !== before.size))) throw fault('CHANGED');
            return {bytes, metadata: before, sha256: hash(bytes)};
        } finally { if (check(false)) await call(label, 'close', h); }
    }
    async function processState() {
        let uncertain = false;
        const list = (await call('own-process', 'readdir', '/proc')).filter(e => /^\d+$/.test(e.filename));
        if (list.length > 1024) return 'unknown';
        for (const p of list) {
            try {
                const exe = await call('own-process', 'readlink', '/proc/' + p.filename + '/exe');
                if ([base, '/var/palm/jail/' + id + base].some(prefix =>
                    [prefix + '/multiview-hdmi-window', prefix + '/multiview-hdmi-window (deleted)'].includes(exe))) return 'present';
            } catch (e) { if (e.code !== 2) { if (![3, 4].includes(e.code)) throw e; uncertain = true; } }
        }
        return uncertain ? 'unknown' : 'absent';
    }
    async function reports(target) {
        for (const [i, name] of aliases.entries()) {
            const label = 'report.' + (i ? 'jail' : 'host');
            const f = {state: 'unreadable', parent: {state: 'unreadable'}}; target.push(f);
            try {
                f.parent.metadata = attrs(await call(label + '.parent', 'lstat', path.posix.dirname(name)));
                f.parent.state = f.parent.metadata.type === 'directory' ? 'present' : 'invalid';
            } catch (e) { if (![2, 3, 4].includes(e.code)) throw e; f.parent.state = category(e); }
            if (f.parent.state === 'invalid') { f.reason = 'parent_not_directory'; continue; }
            try {
                f.metadata = attrs(await call(label, 'lstat', name));
                if (f.metadata.type !== 'file' || f.metadata.size > 2048) { f.state = 'invalid'; f.reason = 'type_or_size'; continue; }
                const file = await read(name, 2048, label);
                if (!equal(file.metadata, f.metadata)) throw fault('CHANGED');
                f.sha256 = file.sha256;
                if (classifyReport) Object.assign(f, classifyReport(file.bytes));
                else if (!file.bytes.length) f.state = 'empty';
                else {
                    try { f.report = validateReport(file.bytes, 'picture'); f.state = 'valid'; }
                    catch {
                        let completeJson = false;
                        try { JSON.parse(file.bytes.toString('utf8')); completeJson = true; } catch { /* No raw text retained. */ }
                        f.state = !completeJson && file.bytes.at(-1) !== 10 ? 'partial' : 'invalid';
                        f.reason = 'json_or_schema';
                    }
                }
            } catch (e) {
                f.state = e.code === 2 && !f.metadata ? 'absent' : 'unreadable'; f.reason = category(e);
                if (![2, 3, 4, 'BOUND', 'CHANGED'].includes(e.code)) throw e;
            }
        }
    }
    async function logCursor() {
        try { return {state: 'available', metadata: attrs(await call('log.cursor', 'lstat', '/var/log/messages'))}; }
        catch (e) { if (![2, 3, 4].includes(e.code)) throw e; return {state: 'unknown', reason: category(e)}; }
    }
    async function logDelta(cursor) {
        const unknown = reason => ({state: 'unknown', reason, actualExit: 'unknown'});
        if (cursor?.state !== 'available') return unknown('cursor_unavailable');
        const before = cursor.metadata;
        if (before.type !== 'file') return unknown('cursor_not_regular');
        let h;
        try {
            const after = attrs(await call('log.delta', 'lstat', '/var/log/messages'));
            if (after.type !== 'file') return unknown('not_regular');
            if (after.size < before.size) return unknown('truncated_or_rotated');
            if (after.size - before.size > 65536) return unknown('size_cap');
            if (after.uid !== before.uid || after.gid !== before.gid || after.mode !== before.mode) return unknown('metadata_changed');
            h = await call('log.delta', 'open', '/var/log/messages', 'r');
            if (!equal(attrs(await call('log.delta', 'fstat', h)), after)) return unknown('changed_during_open');
            const bytes = await range('log.delta', h, before.size, after.size - before.size);
            if (bytes.length !== after.size - before.size) return unknown('short_read');
            // Reopening a pathname cannot prove file continuity across connections.
            return {state: 'projected', bytes: bytes.length, sha256: hash(bytes), projection: project(bytes),
                sourceContinuity: 'unverified_after_reconnect', actualExit: 'unknown'};
        } catch (e) { if (![2, 3, 4].includes(e.code)) throw e; return unknown(category(e)); }
        finally { if (h !== undefined && check(false)) await call('log.delta', 'close', h); }
    }
    async function exec(command, {timeoutMs, stdoutCap, stderrCap, onDispatch}) {
        return stage(command === 'date +%s' ? 'clock.command' : 'sam.command', () => new Promise((resolve, reject) => {
            let stream, done = false, bytes = 0, stderrBytes = 0, chunks = [];
            const finish = (e, value) => { if (done) return; done = true; clearTimeout(timer); client.removeListener('close', lost); e ? reject(e) : resolve(value); };
            const lost = () => finish(fault('DEADLINE'));
            const timer = setTimeout(() => { stream?.destroy(); finish(fault('DEADLINE')); }, timeoutMs);
            client.once('close', lost);
            let remoteCommand;
            try { remoteCommand = typeof command === 'function' ? command() : command; check(); onDispatch?.(); }
            catch (e) { finish(e); return; }
            client.exec(remoteCommand, (e, s) => {
                if (e) { finish(e); return; } stream = s;
                s.on('data', b => { bytes += b.length; if (bytes > stdoutCap) { s.destroy(); finish(fault('BOUND')); } else chunks.push(b); });
                s.stderr.on('data', b => { stderrBytes += b.length; if (stderrBytes > stderrCap) { s.destroy(); finish(fault('BOUND')); } });
                s.on('error', () => finish(fault('DEADLINE')));
                s.on('close', (code, signal) => finish(null, {code, signal: signal ? 'present' : null, signalPresent: Boolean(signal), stderrBytes,
                    stdout: Buffer.concat(chunks).toString('utf8')}));
            });
        }));
    }
    return {read, processState, reports, logCursor, logDelta, exec};
}
module.exports = {openIo, commandFor, hash, category, fault, base};
