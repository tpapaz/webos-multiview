// Fixed root-diagnostic read. Importing this module never connects or executes.
const crypto = require('node:crypto');
const {TextDecoder} = require('node:util');
const COMMAND = 'exec /usr/bin/luna-send -n 1 -w 2000 ' +
    "'luna://com.webos.service.iwc/listPublishedWindows' '{\"subscribe\":false}'";
const PREFIX = '/usr/share/luna-service2/';
const PINS = [
    ['/usr/bin/luna-send', 17864, 'b9b25626a9d7295cfcaca45052555952dd9113707a45893b4b35c27497d9c2af', 0o700],
    [PREFIX + 'roles.d/com.webos.lunasend.role.json', 198, 'e0489f583726ef458f38692fc325de79d5b2cc073335c060c128f403b2d41e24'],
    [PREFIX + 'client-permissions.d/luna-service2.perm.json', 114, '89216942a6282d18a9ac54bfb2ac3df69b4e92ffad4641e993ae3357dc1ad555'],
    [PREFIX + 'groups.d/all.groups.json', 16298, 'a862c30388dddea94d03c87c1ed2e05bbd104a575bc3b3ba1d5fbbe07725f7d9'],
    [PREFIX + 'groups.d/luna-service2.groups.json', 379, '63c1bb60eaccbfe713a5b1c6631e6503961f231730e6487363e3c5c0ff5025ff'],
    [PREFIX + 'api-permissions.d/luna-service2.api.json', 193, '6bd211c7a7adc09828d9edbdbfaee800811dfbaa3530f4617f218edd46e8087b'],
    [PREFIX + 'manifests.d/luna-service2.manifest.json', 873, '5ac7122335778a2f0a310401a3e2d13c269aeccd71821e85897fe248439509f1'],
    [PREFIX + 'manifests.d/luna-service2-security-conf.manifest.json', 1284, 'e51883af9a62b45da8cb59c5f0624a3f53abd1a8468ecd281eb558f259a67f1b']
].map(([path, bytes, sha256, mode]) => Object.freeze({path, bytes, sha256, mode}));
Object.freeze(PINS);
const hash = data => crypto.createHash('sha256').update(data).digest('hex');

function parseReply(bytes) {
    if (!bytes.length || bytes.length > 32768) throw Error();
    const value = JSON.parse(new TextDecoder('utf-8', {fatal: true}).decode(bytes));
    if (!value || Array.isArray(value) || typeof value !== 'object' || typeof value.returnValue !== 'boolean' ||
        ('subscribed' in value && value.subscribed !== false)) throw Error();
    if (!value.returnValue) return {status: 'service_rejected', publicationCount: null, hdmiCandidateCount: null};
    if (!Array.isArray(value.publishedWindows) || value.publishedWindows.length > 64) throw Error();
    const ids = new Set();
    let hdmi = 0;
    const string = v => typeof v === 'string' && v.length > 0 && Buffer.byteLength(v) <= 256 && !v.includes('\0');
    const integer = (v, min) => Number.isInteger(v) && v >= min && v <= 2147483647;
    for (const item of value.publishedWindows) {
        if (!item || !integer(item.publishId, 0) || ids.has(item.publishId) ||
            !string(item.appId) || !string(item.windowId) || !integer(item.width, 1) || !integer(item.height, 1)) throw Error();
        ids.add(item.publishId);
        if (/^com\.webos\.app\.hdmi[1-4]$/.test(item.appId)) ++hdmi;
    }
    return {status: 'read_admission_passed', publicationCount: ids.size, hdmiCandidateCount: hdmi};
}

// Deliberately receives a connection factory, never a command/URI/identity.
function collect(connect, {signal, timers = globalThis, now = Date.now} = {}) {
    return new Promise(resolve => {
        const start = now(), controller = new AbortController();
        let client, channel, done = false, reason = null, executionRequested = false;
        let exitSeen = false, closeSeen = false, exitCode = null, exitSignal = false;
        let stdout = [], size = 0, stderrSeen = false, verified = [];
        const pendingTimers = new Set();
        const later = (fn, ms) => { const id = timers.setTimeout(fn, ms); pendingTimers.add(id); return id; };
        const finish = status => {
            if (done) return;
            done = true;
            for (const id of pendingTimers) timers.clearTimeout(id);
            signal?.removeEventListener('abort', cancel);
            controller.abort();
            client?.destroy();
            let parsed = {publicationCount: null, hdmiCandidateCount: null};
            if (!status) {
                if (!exitSeen || !closeSeen || exitSignal || exitCode !== 0) status = 'utility_exit_failed';
                else if (stderrSeen) status = 'utility_stderr';
                else {
                    try { parsed = parseReply(Buffer.concat(stdout)); status = parsed.status; }
                    catch { status = 'invalid_reply'; }
                }
            }
            stdout = [];
            resolve({schemaVersion: 1, context: 'owner-operated root diagnostic', status,
                executionRequested, utilityExitConfirmed: exitSeen && closeSeen,
                cleanupConfirmed: !executionRequested || (exitSeen && closeSeen),
                utilityExitCode: exitCode, utilitySignaled: exitSignal,
                publicationCount: status === 'read_admission_passed' ? parsed.publicationCount : null,
                hdmiCandidateCount: status === 'read_admission_passed' ? parsed.hdmiCandidateCount : null,
                elapsedMs: Math.max(0, now() - start), verifiedBindings: verified.slice(),
                appAdmission: 'not established by this diagnostic', baseline: 'unknown',
                appliedGeometry: 'unknown', simultaneousHdmi: 'unknown'});
        };
        const terminate = name => {
            try { channel?.signal(name, () => {}); } catch { /* Exit evidence is still required. */ }
        };
        const stop = status => {
            if (done || reason) return;
            reason = status;
            controller.abort();
            if (!executionRequested) { finish(reason); return; }
            terminate('TERM');
            later(() => { if (!done) terminate('KILL'); }, 500);
            later(() => finish(reason), 1000);
        };
        const cancel = () => stop('cancelled');
        later(() => stop('deadline'), 6500); // Reserve teardown time inside 8 seconds.
        later(() => finish(reason || 'deadline'), 8000);
        signal?.addEventListener('abort', cancel, {once: true});
        if (signal?.aborted) { cancel(); return; }
        const active = () => { if (done || reason) throw Error(); };
        const rpc = (obj, method, ...args) => new Promise((res, rej) => {
            active();
            obj[method](...args, (error, value) => error ? rej(Error()) : res(value));
        });
        (async () => {
            client = await connect(controller.signal);
            if (done || reason) { client.destroy(); return; }
            client.on('error', () => stop('transport_failed'));
            client.on('close', () => { if (!done) finish(reason || 'transport_closed'); });
            const sftp = await rpc(client, 'sftp');
            for (const pin of PINS) {
                const stat = await rpc(sftp, 'lstat', pin.path);
                if (!stat.isFile() || stat.size !== pin.bytes || (pin.mode !== undefined &&
                    (stat.mode & 0o7777) !== pin.mode)) throw Error();
                const handle = await rpc(sftp, 'open', pin.path, 'r');
                const data = Buffer.alloc(pin.bytes + 1);
                let offset = 0;
                try {
                    while (offset < data.length) {
                        active();
                        const n = await new Promise((res, rej) => sftp.read(handle, data, offset,
                            data.length - offset, offset, (e, count) => e ? rej(Error()) : res(count)));
                        if (!Number.isInteger(n) || n < 0 || n > data.length - offset) throw Error();
                        if (!n) break;
                        offset += n;
                    }
                } finally { if (!done && !reason) await rpc(sftp, 'close', handle); }
                active();
                if (offset !== pin.bytes || hash(data.subarray(0, offset)) !== pin.sha256) throw Error();
                verified.push({path: pin.path, sha256: pin.sha256});
            }
            sftp.end();
            active();
            executionRequested = true;
            client.exec(COMMAND, {pty: false}, (error, stream) => {
                if (error) { finish(reason || 'exec_failed'); return; }
                channel = stream;
                if (done) { terminate('KILL'); stream.destroy(); return; }
                stream.on('error', () => stop('transport_failed'));
                stream.on('data', data => {
                    if (done || reason) return;
                    const bytes = Buffer.from(data);
                    size += bytes.length;
                    if (size > 32768) { stdout = []; stop('oversized_reply'); return; }
                    stdout.push(bytes);
                });
                stream.stderr.on('data', () => { stderrSeen = true; stop('utility_stderr'); });
                stream.on('exit', (code, sig) => {
                    exitSeen = true;
                    exitCode = Number.isInteger(code) && code >= 0 && code <= 255 ? code : null;
                    exitSignal = Boolean(sig);
                });
                stream.on('close', () => { closeSeen = true; finish(reason); });
                if (reason) terminate('TERM');
            });
        })().catch(() => { if (!done) stop(executionRequested ? 'transport_failed' : 'preflight_failed'); });
    });
}
module.exports = {COMMAND, PINS, parseReply, collect};
