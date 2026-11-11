const {setTimeout: delay} = require('node:timers/promises');
const {createInterface} = require('node:readline/promises');
const {connect} = require('./phase1-device.cjs');
const {startResourceLog} = require('./phase1-resource-log.cjs');
const {nativeBuild, openNativeApp, saveReport} = require('./phase1-native-ssh.cjs');
const {parseTrace, advancingBaseline, stageEvidence} = require('./phase1-mixed-evidence.cjs');

async function run() {
    const args = process.argv.slice(2);
    const loadOnly = args.includes('--load-only');
    const alias = args.filter(arg => arg !== '--load-only');
    if (alias.length > 1 || alias.some(arg => arg.startsWith('--'))) throw new Error('Usage: runner [profile] [--load-only]');
    const build = nativeBuild('mixed');
    const reportName = `c1-phase1-mixed-${loadOnly ? 'load-only-' : ''}${build.version}`;
    const client = await connect(alias[0]);
    let app, controlled = false, cancelled = false, exited = false, rows = [], offset = 0;
    const stages = [];
    let collector;
    const cancel = () => { cancelled = true; };
    process.on('SIGINT', cancel);
    process.on('SIGTERM', cancel);
    const details = {device: {model: 'LG OLED C1', firmware: '03.53.45', sdk: '6.5.3', source: 'owner supplied'},
        stages, visibleOverlap: {status: 'unknown', source: 'owner observation pending'},
        experiment: loadOnly ? 'NDL Load-only, no SetArea or feeding' : 'NDL mixed staged playback',
        audioFocus: 'unknown', simultaneousHdmi: 'unknown', processExitConfirmed: false};
    const read = async () => { rows = parseTrace(await app.trace()).slice(offset); return rows; };
    const wait = async (predicate, timeout = 7000) => {
        const deadline = Date.now() + timeout;
        while (Date.now() < deadline) {
            if (cancelled) throw new Error('Test cancelled');
            await read();
            const result = predicate(rows);
            if (result) return result;
            if (rows.some(row => row.event === 'run_end')) throw new Error('Run ended before the requested measurement');
            await delay(250);
        }
        throw new Error('Timed out waiting for the mixed test stage');
    };
    try {
        app = await openNativeApp(client, build);
        const before = parseTrace(await app.trace());
        if (before[0]?.event !== 'ready' || before.findLastIndex(r => r.event === 'run_start') > before.findLastIndex(r => r.event === 'run_end'))
            throw new Error('Open the mixed test app and leave it at the menu');
        offset = before.length;
        if (loadOnly) {
            collector = await startResourceLog(client, build.id);
            await delay(500);
            if (collector.report.collectionError || collector.report.ended) throw new Error('Resource log collector unavailable');
            details.resourceLog = collector.report;
            details.runSignalClientElapsedMs = collector.elapsedMs();
        }
        controlled = true;
        await app.signal('USR1');
        await wait(advancingBaseline, 10000);
        console.log('SMP A callbacks and timestamps advance. Watch the left clock.');
        const names = loadOnly ? ['Init', 'foreground', 'Load'] : ['Init', 'foreground', 'Load', 'SetArea', 'feeding'];
        for (const [index, name] of names.entries()) {
            await app.signal('USR1');
            const measurement = await wait(r => stageEvidence(r, index + 1));
            stages.push({...measurement, name});
            console.log(`${name}: A callbacks +${measurement.aCallbacks}, A PTS +${measurement.aPtsAdvanceMs} ms, B packets +${measurement.acceptedPackets}`);
        }
        console.log(loadOnly ? 'Holding B loaded without SetArea or feeding; watch A.' : 'Watch both clocks now; holding B for another four seconds.');
        const feedAck = rows.find(r => r.event === 'step_end' && r.status === (loadOnly ? 3 : 5));
        await wait(r => r.find(row => row.event === 'sample' && row.status === (loadOnly ? 3 : 5) && row.ms >= feedAck.ms + 6500));
        await app.signal('USR2');
        const recovery = await wait(r => stageEvidence(r, 6));
        stages.push({...recovery, name: 'B released'});
        console.log(`B released: A callbacks +${recovery.aCallbacks}, A PTS +${recovery.aPtsAdvanceMs} ms`);
        const end = await wait(r => r.find(row => row.event === 'run_end'));
        if (loadOnly && rows.some(r => r.packets > 0 || ['area_begin', 'area', 'feed_begin', 'feed'].includes(r.event)))
            throw new Error('Load-only acceptance failed: SetArea or feeding observed');
        const cleanup = rows.filter(r => ['unload', 'quit', 'a_closed'].includes(r.event));
        if (end.status !== 0 || cleanup.length !== 3 || cleanup.some(r => r.status !== 0)) throw new Error('Mixed run or cleanup failed; inspect report');
        const counters = rows.findLast(r => r.event === 'ndl_events');
        console.log(`NDL accepted ${end.packets} packets; Load complete ${counters.loads}, Playing ${counters.playing}, frame callbacks ${end.bFrames}.`);
    } catch (error) {
        details.controllerError = error.message;
        process.exitCode = 1;
        console.error(error.message);
    } finally {
        if (controlled) {
            // Request normal cleanup while telemetry remains readable at the menu.
            try {
                if (!rows.some(r => r.event === 'run_end')) {
                    await app.signal('USR2');
                    const deadline = Date.now() + 4500;
                    do { await read(); if (rows.some(r => r.event === 'run_end')) break; await delay(250); } while (Date.now() < deadline);
                }
            } catch { /* Keep the most recent complete snapshot. */ }
            try { await app.stop(); exited = true; }
            catch { process.exitCode = 1; console.error('App exit unconfirmed. Close the app with Back.'); }
            details.processExitConfirmed = exited;
            saveReport(reportName, build, rows, details);
        }
        if (collector) {
            await delay(250);
            details.resourceLog = await collector.stop();
            if (controlled) saveReport(reportName, build, rows, details);
        }
        client.end();
        process.removeListener('SIGINT', cancel);
        process.removeListener('SIGTERM', cancel);
    }
    if (!loadOnly && controlled && exited && !cancelled && process.stdin.isTTY) {
        const prompt = createInterface({input: process.stdin, output: process.stdout});
        try {
            const answer = (await prompt.question('Did BOTH on-screen clocks advance together? [yes/no/unknown]: ')).trim().toLowerCase();
            details.visibleOverlap = {status: answer === 'yes' ? 'verified' : 'unknown',
                observed: answer === 'yes' ? true : answer === 'no' ? false : null,
                source: 'owner observation', recordedAt: new Date().toISOString()};
            saveReport(reportName, build, rows, details);
        } finally { prompt.close(); }
    }
}
run().catch(error => { console.error(error.message); process.exitCode = 1; });
