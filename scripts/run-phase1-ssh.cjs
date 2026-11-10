// Only controls this build of the Phase 1 app. Reads existing local CLI credentials.
const {connect} = require('./phase1-device.cjs');
const {nativeBuild, openNativeApp, saveReport} = require('./phase1-native-ssh.cjs');

const build = nativeBuild('smp');
let app;
let lastRows = [];
let controlled = false;
let expectedRunCount = 0;

async function readTrace() {
    const text = await app.trace();
    const rows = [];
    for (const line of text.split('\n').filter(Boolean)) {
        if (!/^\d+,(ready|run_start|step_begin|step_end|sample|run_end),\d+,\d+,\d+,\d+,\d+$/.test(line))
            throw new Error('Unexpected app telemetry format');
        const [ms, event, stage, a, b, aMs, bMs] = line.split(',');
        rows.push({ms: +ms, event, stage: +stage, a: +a, b: +b, aMs: +aMs, bMs: +bMs});
    }
    lastRows = rows;
    return rows;
}

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function waitFor(predicate, timeoutMs = 9000) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
        const rows = await readTrace();
        if (rows.filter(row => row.event === 'run_start').length < expectedRunCount) {
            await delay(250);
            continue;
        }
        const runStart = rows.findLastIndex(row => row.event === 'run_start');
        const run = rows.slice(runStart);
        const result = predicate(run);
        if (result) return result;
        if (run.some(row => row.event === 'run_end')) throw new Error('The test run ended before the requested stage');
        await delay(250);
    }
    throw new Error('The test did not acknowledge the requested stage');
}

async function run() {
    const client = await connect(process.argv[2]);
    try {
        app = await openNativeApp(client, build);
        const before = await readTrace();
        if (before.findLastIndex(row => row.event === 'run_start') > before.findLastIndex(row => row.event === 'run_end'))
            throw new Error('Wait for the current run to return to the menu');
        expectedRunCount = before.filter(row => row.event === 'run_start').length + 1;
        await app.signal('USR1');
        controlled = true;
        await waitFor(rows => rows.find(row => row.event === 'sample' && row.stage === 0 && row.a > 0));
        const stages = ['empty window', 'constructor', 'foreground', 'Load', 'Feed without Play', 'Play'];
        for (let stage = 1; stage <= stages.length; stage++) {
            await app.signal('USR1');
            const ack = await waitFor(rows => rows.find(row => row.event === 'step_end' && row.stage === stage));
            const sample = await waitFor(rows => rows.find(row => row.event === 'sample' &&
                row.stage === stage && row.ms >= ack.ms + 2000));
            console.log(`${stages[stage - 1]}: A callbacks +${sample.a - ack.a}, B callbacks +${sample.b - ack.b}`);
        }
        await app.signal('USR2');
        const released = await waitFor(rows => rows.find(row => row.event === 'step_end' && row.stage === 7));
        const recovery = await waitFor(rows => rows.find(row => row.event === 'sample' &&
            row.stage === 7 && row.ms >= released.ms + 2000));
        console.log(`B released: A callbacks +${recovery.a - released.a}`);
    } finally {
        try {
            if (controlled) {
                try { await readTrace(); }
                catch { /* Preserve the last complete telemetry snapshot. */ }
                try { await app.stop(); }
                catch { console.error('App exit could not be confirmed. Close the test app with Back.'); }
                saveReport('c1-phase1-stages-' + build.version, build, lastRows);
            }
        } finally {
            client.end();
        }
    }
}

run().catch(error => { console.error(error.message); process.exitCode = 1; });
