// TV-domain deadlines; host monotonic freshness is separate. No device import.
const clockCommand = 'date +%s'; // Fixed read-only command; never accepts arguments.
function fresh(start, now) {
    return Number.isFinite(start) && start >= 0 && Number.isFinite(now) &&
        now >= start && now - start < 2000;
}
function payload(sample, start, now) {
    if (!fresh(start, now)) throw Error('sample freshness');
    const {bootBefore, uptime, realtime, bootAfter} = sample;
    if (typeof bootBefore !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\n$/.test(bootBefore) ||
        bootBefore !== bootAfter) throw Error('boot binding');
    const up = typeof uptime === 'string' && /^([0-9]{1,13})\.([0-9]{2}) [0-9]{1,15}\.[0-9]{2}\n$/.exec(uptime);
    if (!up || typeof realtime !== 'string' || !/^[0-9]{1,13}\n$/.test(realtime)) throw Error('clock format');
    const bootMs = Number(up[1]) * 1000 + Number(up[2]) * 10;
    const realMs = Number(realtime.trim()) * 1000;
    if (![bootMs, realMs].every(n => Number.isSafeInteger(n) && n >= 0 && Number.isSafeInteger(n + 3000))) throw Error('clock range');
    return {acquireHdmi4: true, launchBootId: bootBefore.trim(),
        launchStartByBoottimeMs: bootMs + 3000, launchStartByRealtimeMs: realMs + 3000};
}
async function prepare({read, exec, now}) {
    const start = now();
    // One connection supplied by caller, with its own cancellation/30-second cap.
    // Bracket both clock samples with boot identity; no refresh or retries.
    const bootBefore = await read('/proc/sys/kernel/random/boot_id', 38);
    const uptime = await read('/proc/uptime', 64);
    const reply = await exec(clockCommand, {timeoutMs: 1000, stdoutCap: 32, stderrCap: 128});
    if (reply.code !== 0 || reply.signal || reply.stderrBytes !== 0) throw Error('clock command failed');
    const bootAfter = await read('/proc/sys/kernel/random/boot_id', 38);
    const authority = payload({bootBefore, uptime, realtime: reply.stdout, bootAfter}, start, now());
    let consumed = false;
    return {
        // Dispatch callback must synchronously submit; claim is consumed even if it throws.
        dispatch(submit) {
            if (consumed) throw Error('authority consumed');
            consumed = true;
            if (!fresh(start, now())) throw Error('dispatch expired');
            return submit(authority);
        }
    };
}
module.exports = {clockCommand, fresh, payload, prepare};
