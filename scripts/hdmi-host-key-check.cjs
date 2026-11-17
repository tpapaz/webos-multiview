// First-use public host-key observation only. No authentication, sessions or file access.
const crypto = require('node:crypto');
const {performance} = require('node:perf_hooks');
const bounds = Object.freeze({handshakeMs: 3000, closureMs: 2000, totalMs: 5000, maxKeyBytes: 16384});
const realClock = {now: () => performance.now(), setTimeout, clearTimeout};
function keyIdentity(key) {
    if (!Buffer.isBuffer(key) || key.length < 8 || key.length > bounds.maxKeyBytes) throw Error('Key bound');
    const n = key.readUInt32BE(0);
    if (n < 1 || n > 64 || n + 4 >= key.length) throw Error('Key format');
    const algorithm = key.subarray(4, n + 4).toString('ascii');
    if (!/^(ssh-(rsa|ed25519)|ecdsa-sha2-nistp(256|384|521))$/.test(algorithm) ||
        !key.subarray(4, n + 4).equals(Buffer.from(algorithm))) throw Error('Key algorithm');
    return {algorithm, blobBytes: key.length, sha256: crypto.createHash('sha256').update(key).digest('hex')};
}
function checkConnection({alias, hostVerifier, authHandler, loadProfiles, createClient} = {}) {
    const {existingProfile, newClient} = require('./hdmi-element-connection.cjs');
    const p = existingProfile(alias, loadProfiles);
    // Existing literal address only: no DNS, scanning, address/port overrides or key reads.
    if (!require('node:net').isIP(p.host) || !Number.isInteger(p.port) || p.port < 1 || p.port > 65535) throw Error('Endpoint refused');
    const endpointBindingSha256 = crypto.createHash('sha256').update(JSON.stringify({alias, host: p.host, port: p.port})).digest('hex');
    const client = createClient ? createClient() : newClient();
    let started = false;
    return {client, endpointBindingSha256, start() {
        if (started) throw Error('Second connection refused');
        started = true;
        client.connect({host: p.host, port: p.port, username: 'host-key-check', readyTimeout: bounds.handshakeMs,
            hostVerifier, authHandler, tryKeyboard: false, agentForward: false});
    }};
}
async function observeHostKey({allowOneCheck, connectionFactory, sink, signal, clock = realClock} = {}) {
    if (allowOneCheck !== true || typeof connectionFactory !== 'function') throw Error('Scope refused');
    const start = clock.now();
    const report = {schemaVersion: 1, kind: 'ssh_host_key_first_use', status: 'partial', trustMode: 'tofu',
        independentlyVerified: false, possessionVerified: false, key: null, keyObservedMs: null, endpointBindingSha256: null,
        connectionAttempts: 0, connectionClosed: false, authenticationBlocked: true, unexpectedAuthentication: false,
        transportForced: false, stopReason: null, elapsedMs: 0};
    let client, sealed = false, destroyed = false, closeTimer, resolve;
    const done = new Promise(r => { resolve = r; });
    const elapsed = () => Math.max(0, clock.now() - start);
    const destroy = () => {
        if (!client || destroyed) return;
        destroyed = true; report.transportForced = true;
        try { client.destroy(); } catch { /* Closure remains unconfirmed. */ }
    };
    const finish = () => {
        if (sealed) return;
        sealed = true;
        clock.clearTimeout(handshakeTimer); clock.clearTimeout(totalTimer); clock.clearTimeout(closeTimer);
        signal?.removeEventListener('abort', cancel);
        report.elapsedMs = elapsed();
        // Delayed event-loop callbacks do not turn an elapsed deadline into success.
        if (report.elapsedMs >= bounds.totalMs) report.stopReason ||= 'total_deadline';
        else if (report.key && report.elapsedMs - report.keyObservedMs >= bounds.closureMs) report.stopReason ||= 'closure_timeout';
        else if (!report.key && report.elapsedMs >= bounds.handshakeMs) report.stopReason ||= 'handshake_timeout';
        if (report.key && !report.stopReason && report.connectionClosed) report.status = 'tofu_recorded';
        else report.stopReason ||= report.connectionClosed ? 'no_key' : 'closure_unconfirmed';
        // Copy before handing to storage; late events cannot alter a sealed receipt.
        const snapshot = JSON.parse(JSON.stringify(report));
        try { sink.complete(snapshot); resolve(snapshot); }
        catch { resolve({...snapshot, status: 'partial', stopReason: 'local_io'}); }
    };
    const stop = reason => { if (sealed) return; report.stopReason ||= reason; destroy(); };
    const cancel = () => stop('cancelled');
    const handshakeTimer = clock.setTimeout(() => stop('handshake_timeout'), bounds.handshakeMs);
    const totalTimer = clock.setTimeout(() => { stop('total_deadline'); finish(); }, bounds.totalMs);
    signal?.addEventListener('abort', cancel, {once: true});
    const hostVerifier = key => {
        if (sealed || report.stopReason) return false;
        if (elapsed() >= bounds.handshakeMs) { stop('handshake_timeout'); return false; }
        if (report.key) { stop('multiple_keys'); return false; }
        try { report.key = keyIdentity(key); report.keyObservedMs = elapsed(); }
        catch { stop('invalid_key'); return false; }
        clock.clearTimeout(handshakeTimer);
        closeTimer = clock.setTimeout(() => { stop('closure_timeout'); finish(); }, Math.min(bounds.closureMs, bounds.totalMs - elapsed()));
        // Always reject: do not complete KEX or reach ssh-userauth, even with no credentials.
        return false;
    };
    const authHandler = () => { if (!sealed) { report.unexpectedAuthentication = true; stop('unexpected_authentication'); } return false; };
    try {
        if (signal?.aborted) { report.stopReason = 'cancelled'; finish(); return done; }
        const connection = connectionFactory({hostVerifier, authHandler});
        client = connection.client;
        if (elapsed() >= bounds.handshakeMs || signal?.aborted) {
            report.stopReason = signal?.aborted ? 'cancelled' : 'handshake_timeout'; destroy(); finish(); return done;
        }
        report.endpointBindingSha256 = connection.endpointBindingSha256 || null;
        client.on('error', error => {
            if (sealed) return;
            if (!(report.key && error?.level === 'handshake' && error.message === 'Host denied (verification failed)')) stop('connection_failed');
        });
        client.once('ready', authHandler);
        client.once('close', () => { if (!sealed) { report.connectionClosed = true; finish(); } });
        report.connectionAttempts++;
        connection.start();
    } catch { stop('connection_failed'); if (!client) finish(); }
    return done;
}
module.exports = {bounds, keyIdentity, checkConnection, observeHostKey};
