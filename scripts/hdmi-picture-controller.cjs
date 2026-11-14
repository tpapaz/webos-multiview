// Two connections, one attempted submission, one monotonic origin. No retries.
const {prepare, fresh} = require('./tv-launch-authority.cjs');
const {verifyConnection} = require('./verify-hdmi-picture-admission.cjs');
const {openIo, commandFor, category, fault} = require('./hdmi-picture-io.cjs');
const {id, version} = require('./hdmi-picture-report.cjs');
async function run({connect, references, persist, savePrivate, emit, ownerCue, signal,
    now = () => performance.now(), sleep = ms => new Promise(r => setTimeout(r, ms)),
    verify = verifyConnection, open = openIo, connectionCapMs = 30000, appVersion = version, mode = 'physical_picture'}) {
    if (!Number.isFinite(connectionCapMs) || connectionCapMs <= 0 || connectionCapMs > 30000) throw fault('BOUND');
    const origin = now(); let dispatchedAt, last = origin;
    const r = {schemaVersion: 1, appId: id, appVersion, mode,
        status: 'preparing', connections: [], attempts: 0, acknowledgment: 'not_submitted',
        reports: [], collection: 'not_started', actualExit: 'unknown', hardwareRelease: 'unknown',
        livePicture: mode === 'setup_only' ? 'not_applicable_setup_only' : 'owner_observation_required', cancellationRequested: false, stages: []};
    const event = (stage, outcome) => {
        const e = {stage, outcome, elapsedMs: Math.round(now() - origin)};
        r.stages.push(e); emit(e); persist(r);
    };
    const cancelled = () => { r.cancellationRequested = true; persist(r); };
    signal?.addEventListener('abort', cancelled, {once: true});
    function monotonic() { const value = now(); if (!Number.isFinite(value) || value < last) throw fault('DEADLINE'); last = value; return value; }
    async function session(name, work) {
        const entry = {name, startedMs: monotonic() - origin, closed: false}; r.connections.push(entry);
        const control = new AbortController(); let client, stopped = false, timer, closed = false;
        const check = (throwOnFailure = true) => {
            const valid = !stopped && !control.signal.aborted && monotonic() - origin - entry.startedMs < connectionCapMs;
            if (!valid && throwOnFailure) throw fault('DEADLINE'); return valid;
        };
        async function stage(label, fn) {
            check(); event(name + '.' + label, 'started');
            try { const value = await fn(); check(); event(name + '.' + label, 'ok'); return value; }
            catch (e) { if (!stopped) event(name + '.' + label, category(e)); throw e; }
        }
        const deadline = new Promise((_, reject) => {
            timer = setTimeout(() => { stopped = true; control.abort(); client?.destroy();
                event(name + '.connection', 'deadline'); reject(fault('DEADLINE')); }, connectionCapMs);
        });
        let cancelSession;
        const cancellation = new Promise((_, reject) => {
            cancelSession = () => { control.abort(); client?.destroy(); reject(fault('CANCELLED')); };
            if (name === 'submission') signal?.addEventListener('abort', cancelSession, {once: true});
        });
        try {
            await Promise.race([(async () => {
                await stage('connect', async () => {
                    const candidate = await connect(undefined, {signal: control.signal});
                    if (!check(false)) { candidate.destroy(); throw fault('DEADLINE'); }
                    client = candidate; client.once('close', () => { closed = true; });
                });
                check(); await work(client, stage, check); check();
            })(), deadline, cancellation]);
        } finally {
            signal?.removeEventListener('abort', cancelSession);
            clearTimeout(timer); stopped = true; control.abort(); client?.destroy();
            const remaining = connectionCapMs - (monotonic() - origin - entry.startedMs);
            if (client && !closed && remaining > 0) await new Promise(resolve => {
                const end = setTimeout(resolve, Math.min(200, remaining));
                client.once('close', () => { clearTimeout(end); resolve(); });
            });
            entry.closed = closed; entry.elapsedMs = Math.round(monotonic() - origin - entry.startedMs); persist(r);
            if (client && !closed) throw fault('DEADLINE');
        }
    }
    try {
        if (signal?.aborted) { cancelled(); throw fault('CANCELLED'); }
        await session('submission', async (client, stage, check) => {
            r.preflight = {bindings: {}, reports: [], queries: []};
            await stage('preflight', () => verify(client, check, r.preflight, stage, savePrivate, references));
            if (!r.preflight.readiness || signal?.aborted) throw fault(signal?.aborted ? 'CANCELLED' : 'BOUND');
            const io = await open(client, stage, check);
            r.logCursor = await io.logCursor();
            await stage('owner.cue', async () => { await ownerCue(); });
            const started = monotonic();
            const authority = await stage('authority', () => prepare({now: monotonic,
                read: async (name, cap) => (await io.read(name, cap, 'authority.sample', true)).bytes.toString('ascii'),
                exec: (command, limits) => io.exec(command, limits)}));
            const reply = await io.exec(() => authority.dispatch(payload => {
                savePrivate('launch.json', payload); return commandFor(payload);
            }), {timeoutMs: 3000, stdoutCap: 4096, stderrCap: 1024,
                onDispatch: () => {
                    if (signal?.aborted) throw fault('CANCELLED');
                    if (!fresh(started, monotonic()) || r.attempts !== 0) throw fault('DEADLINE');
                    dispatchedAt = monotonic(); r.attempts = 1; r.dispatchMs = dispatchedAt - origin;
                    // No fsync/await between this boundary and the single client.exec call.
                }});
            r.utilityExitCode = Number.isInteger(reply.code) ? reply.code : 'unknown';
            r.utilitySignalPresent = reply.signalPresent; r.stderrBytes = reply.stderrBytes;
            try { r.acknowledgment = reply.code === 0 && !reply.signalPresent && reply.stderrBytes === 0 &&
                JSON.parse(reply.stdout).returnValue === true ? 'accepted' : 'unknown'; }
            catch { r.acknowledgment = 'unknown'; }
            persist(r);
        });
    } catch (e) {
        r.submissionFailure = category(e); if (r.attempts) r.acknowledgment = 'unknown';
        event('submission', category(e));
    }
    try {
        if (r.attempts === 1) {
            r.status = 'waiting_for_owner_deadline'; persist(r);
            // Cancellation after attempted dispatch stops progression, not observation.
            while (monotonic() < dispatchedAt + 27000) await sleep(dispatchedAt + 27000 - monotonic());
            if (r.connections.some(c => !c.closed)) throw fault('DEADLINE');
            await session('collection', async (client, stage, check) => {
                r.collectionStartedMs = monotonic() - origin;
                const io = await open(client, stage, check);
                await io.reports(r.reports);
                r.processAfter = await io.processState();
                r.log = await io.logDelta(r.logCursor);
                // Bind current installed contents without gating already-recovered reports.
                r.installedAfter = {};
                for (const [key, name, cap, expected] of [['executable', 'multiview-hdmi-window', 1048576, references.pkg.binarySha256],
                    ['appinfo', 'appinfo.json', 4096, references.pkg.manifestSha256]]) {
                    try { const f = await io.read('/media/developer/apps/usr/palm/applications/' + id + '/' + name, cap, 'binding.' + key);
                        r.installedAfter[key] = {sha256: f.sha256, metadata: f.metadata, hashMatches: f.sha256 === expected}; }
                    catch (e) { r.installedAfter[key] = {state: 'unreadable', reason: category(e)}; check(); }
                }
                const [a, b] = r.reports;
                r.aliasComparison = a?.sha256 && b?.sha256 ? a.sha256 === b.sha256 ? 'identical_bytes' : 'conflicting' : 'not_comparable';
                r.collection = 'completed';
            });
            r.status = r.collection === 'completed' ? 'collected' : 'incomplete';
        } else r.status = 'stopped_without_dispatch';
    } catch (e) { r.status = 'incomplete'; r.collectionFailure = category(e); event('collection', category(e)); }
    finally { signal?.removeEventListener('abort', cancelled); persist(r); }
    return r;
}
module.exports = {run};
