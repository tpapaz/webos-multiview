// Linux host-only process experiment. ALWAYS spawns our fake fixture, never a TV tool.
const fs = require('node:fs');
const path = require('node:path');
const {spawn} = require('node:child_process');
const {createModel} = require('./iwc-recovery-model.cjs');
const {evidence, SCENARIOS} = require('../tests/fixtures/iwc-synthetic-evidence.cjs');

function main(args = process.argv.slice(2)) {
    const [mode, scenario, directory, ...extra] = args;
    if (process.platform !== 'linux' || mode !== '--local-supervisor' || !SCENARIOS.includes(scenario) || !directory || extra.length) return 64;
    const st = fs.lstatSync(directory);
    if (!st.isDirectory() || st.uid !== process.getuid() || (st.mode & 0o777) !== 0o700) return 64;
    const fixture = path.resolve(__dirname, '../tests/fixtures/iwc-fake-process.cjs');
    const model = createModel(), start = process.hrtime.bigint();
    const now = () => Number((process.hrtime.bigint() - start) / 1000000n);
    const input = evidence(now()), children = new Set(), timers = new Set();
    let actor, worker = null, closing = false, finished = false, tick, hard;
    let statusLost = false, hostLost = false, terminations = 0, escalations = 0, peakWorkers = 0, workerCount = 0;
    const later = (fn, ms) => { const timer = setTimeout(fn, ms); timers.add(timer); return timer; };
    const event = kind => {
        fs.appendFileSync(path.join(directory, 'events.jsonl'), JSON.stringify({kind, elapsedMs: now()}) + '\n', {mode: 0o600});
        if (!statusLost) {
            try { process.stdout.write(kind + '\n'); } catch { statusLost = true; }
        }
    };
    const record = (pid, role) => {
        const stat = fs.readFileSync(`/proc/${pid}/stat`, 'utf8');
        const fields = stat.slice(stat.lastIndexOf(')') + 2).trim().split(/\s+/);
        fs.appendFileSync(path.join(directory, 'owned.jsonl'), JSON.stringify({pid, role, start: fields[19], session: Number(fields[3])}) + '\n', {mode: 0o600});
    };
    record(process.pid, 'supervisor');
    process.stdout.on('error', () => { statusLost = true; });
    const signal = (row, name) => {
        if (row.closed) return;
        if (name === 'SIGTERM') ++terminations; else ++escalations;
        row.child.kill(name); // Only a retained owned ChildProcess; never a PID/name scan.
    };
    const stop = row => {
        signal(row, 'SIGTERM');
        later(() => signal(row, 'SIGKILL'), 200);
    };
    const finish = () => {
        if (finished) return;
        finished = true;
        clearInterval(tick); clearTimeout(hard);
        for (const timer of timers) clearTimeout(timer);
        const report = {schemaVersion: 1, mode: 'local_fake_processes', deviceTested: false,
            model: model.report(), ownedChildrenExited: [...children].every(c => c.closed && c.exitSeen),
            peakWorkers, terminations, escalations, hostLost, statusLost, elapsedMs: now(),
            downstreamOrdering: 'not tested', hardwareRestoration: 'unknown'};
        fs.writeFileSync(path.join(directory, 'report.json'), JSON.stringify(report, null, 2) + '\n', {flag: 'wx', mode: 0o600});
        process.exit(report.ownedChildrenExited ? 0 : 1);
    };
    const cleanupComplete = () => {
        if (!closing || ![...children].every(c => c.closed)) return;
        if (model.report().state === 'closing') {
            dispatch({type: 'writer_closed', token: closing, clean: [...children].every(c => c.exitSeen)});
        }
        finish();
    };
    const spawnFake = (role, operation) => {
        const argv = [fixture, role, scenario, directory];
        if (operation) argv.push(operation);
        const child = spawn(process.execPath, argv, {stdio: role === 'actor' ? ['ignore', 'ignore', 'ignore', 'ipc'] : ['ignore', 'pipe', 'pipe']});
        const row = {child, closed: false, exitSeen: false, code: null, signal: null, output: [], bytes: 0, invalid: false};
        children.add(row);
        child.on('spawn', () => record(child.pid, role));
        child.on('exit', (code, sig) => { row.exitSeen = true; row.code = code; row.signal = sig; });
        child.on('error', () => { row.invalid = true; });
        return row;
    };
    const beginCleanup = token => {
        if (closing) return;
        closing = token || -1;
        event('cleanup_begin');
        for (const row of children) if (!row.closed) stop(row);
        cleanupComplete();
    };
    const startWorker = intent => {
        if (worker && !worker.closed) throw Error('overlapping fake workers');
        const op = intent.kind.slice('simulate_'.length);
        const row = spawnFake('worker', op); worker = row;
        ++workerCount; peakWorkers = Math.max(peakWorkers, workerCount);
        event('start_' + op);
        row.child.stdout.on('data', bytes => {
            row.bytes += bytes.length;
            if (row.bytes > 1024) { row.output = []; row.invalid = true; stop(row); }
            else row.output.push(bytes);
        });
        row.child.stderr.on('data', () => { row.invalid = true; stop(row); });
        row.child.on('close', () => {
            row.closed = true; --workerCount; event('reaped_' + op);
            let accepted = false;
            try {
                const parsed = JSON.parse(Buffer.concat(row.output).toString('utf8'));
                accepted = !row.invalid && row.exitSeen && row.code === 0 && !row.signal &&
                    Object.keys(parsed).length === 1 && parsed.accepted === true;
            } catch { /* Partial or invalid fake reply cannot advance. */ }
            row.output = [];
            if (!closing) {
                const reply = {type: 'reply', token: intent.token, accepted};
                if (op === 'revalidate') Object.assign(reply, {target: input.discovery.target, viewEpoch: 1,
                    observedAtMs: now(), publicationCount: 1, hdmiCandidateCount: 1, logicalFullViewMatched: true});
                dispatch(reply);
                if (op === 'action' && model.report().actionAcknowledged) {
                    event('action_ack');
                    if (actor.child.connected) actor.child.send('action_ack', () => {});
                }
            }
            cleanupComplete();
        });
    };
    function dispatch(message) {
        if (finished) return;
        const result = model.step(message, now());
        for (const intent of result.intents) {
            if (intent.kind === 'simulate_close') beginCleanup(intent.token);
            else startWorker(intent);
        }
        if (result.report.state === 'failed') beginCleanup(null);
    }
    process.stdin.on('end', () => { hostLost = true; event('host_lost'); dispatch({type: 'host_lost'}); });
    process.stdin.on('error', () => { hostLost = true; dispatch({type: 'host_lost'}); });
    process.stdin.resume();
    process.on('SIGTERM', () => dispatch({type: 'cancel'}));
    dispatch({type: 'arm', evidence: input});
    actor = spawnFake('actor');
    actor.child.on('message', message => {
        if (message === 'act' || message === 'cancel') dispatch({type: message});
    });
    actor.child.on('close', () => { actor.closed = true; event('actor_exit'); dispatch({type: 'actor_died'}); cleanupComplete(); });
    actor.child.on('spawn', () => {
        fs.writeFileSync(path.join(directory, 'ready'), 'local fake supervisor ready\n', {flag: 'wx', mode: 0o600});
        actor.child.send('ready', () => {});
        event('ready');
    });
    tick = setInterval(() => dispatch({type: 'tick'}), 10);
    hard = setTimeout(() => { beginCleanup(null); for (const row of children) signal(row, 'SIGKILL'); later(finish, 300); }, 8500);
    return null;
}
if (require.main === module) {
    try { const code = main(); if (code !== null) process.exitCode = code; }
    catch { console.error('Local fake supervisor failed'); process.exitCode = 1; }
}
module.exports = {main};
