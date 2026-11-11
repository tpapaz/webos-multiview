const fs = require('node:fs');
const path = require('node:path');
const {setTimeout: delay} = require('node:timers/promises');
const {connect} = require('./phase1-device.cjs');
const {nativeBuild, openNativeApp, saveReport} = require('./phase1-native-ssh.cjs');
const {startResourceLog} = require('./phase1-resource-log.cjs');
const {parseTrace, advancing, measurement, requireAProgress} = require('./phase1-sinks-evidence.cjs');

async function run() {
    const args = process.argv.slice(2);
    const solo = args.includes('--solo-b'), staged = args.includes('--staged');
    const loadOnly = args.includes('--load-only');
    const confirmed = args.includes('--confirm-solo-b-visible');
    const known = ['--solo-b','--staged','--load-only','--confirm-solo-b-visible'];
    const alias = args.filter(a => !known.includes(a));
    if (solo === staged || loadOnly && solo || alias.length > 1 || alias.some(a=>a.startsWith('--')))
        throw new Error('Use --solo-b OR --staged [--load-only] --confirm-solo-b-visible, plus optional SSH profile');
    const build = nativeBuild('sinks');
    const controlPath = path.join(__dirname, '../build/reports', `c1-phase1-sinks-solo-b-${build.version}.json`);
    if (!solo) {
        let control;
        try { control = JSON.parse(fs.readFileSync(controlPath)); } catch { throw new Error('Run the B-only control first'); }
        if (!confirmed || control.binarySha256 !== build.hash || !control.telemetryPassed || !control.processExitConfirmed)
            throw new Error('This ELF needs a passing B-only control and --confirm-solo-b-visible after owner observation');
    }
    const client = await connect(alias[0]);
    const reportName = `c1-phase1-sinks-${solo ? 'solo-b' : loadOnly ? 'load-only' : 'stages'}-${build.version}`;
    let app, collector, controlled = false, cancelled = false, offset = 0, rows = [];
    const details = {experiment: solo ? 'B only sub_video' : loadOnly ? 'A main_video plus B sub_video Load-only' : 'staged SMP main/sub',
        device:{model:'LG OLED C1',firmware:'03.53.45',sdk:'6.5.3',source:'owner supplied'},
        sinks:{a:'main_video',b:'sub_video'},stages:[],telemetryPassed:false,processExitConfirmed:false,
        ownerObservation:{status:'unknown'},resourceOwnership:{status:'unknown',reason:'retained log attribution and visible observation required'},
        simultaneousHdmi:'unknown',audioFocus:'unknown'};
    if (!solo) details.soloBVisuallyConfirmedByOwner = true;
    const cancel = () => { cancelled = true; };
    process.on('SIGINT',cancel); process.on('SIGTERM',cancel);
    const read = async () => { rows = parseTrace(await app.trace()).slice(offset); return rows; };
    const wait = async (predicate, timeout = 10000) => {
        const deadline = Date.now() + timeout;
        while (Date.now() < deadline) {
            if (cancelled) throw new Error('Test cancelled');
            await read();
            const result = predicate(rows);
            if (result) return result;
            if (rows.some(r => r.event === 'run_end')) throw new Error('Run ended before the requested measurement');
            await delay(250);
        }
        throw new Error('Sink test measurement timed out');
    };
    try {
        app = await openNativeApp(client,build);
        const before = parseTrace(await app.trace());
        if (before[0]?.event !== 'ready' || before.findLastIndex(r=>['solo_start','run_start'].includes(r.event)) > before.findLastIndex(r=>r.event==='run_end'))
            throw new Error('Leave Main + Sub Test at its menu');
        offset = before.length;
        collector = await startResourceLog(client,build.id);
        await delay(500);
        if (collector.report.ended || collector.report.collectionError) throw new Error('Resource collector unavailable');
        details.runSignalClientElapsedMs = collector.elapsedMs();
        controlled = true;
        await app.signal(solo ? 'USR2' : 'USR1');
        if (solo) {
            await wait(r=>advancing(r,'b',6),12000);
            console.log('B callbacks and PTS advance. Watch its right-hand clock.');
        } else {
            await wait(r=>advancing(r,'a',0));
            console.log('A main_video baseline advances.');
            const names = ['B window','B constructor','B foreground','B sub_video Load','B Feed','B Play','B smaller geometry'];
            for (let index=0;index < (loadOnly ? 4 : names.length);index++) {
                await app.signal('USR1');
                const m = await wait(r=>measurement(r,index+1,index===3 ? 3000 : 2000));
                details.stages.push({...m,name:names[index]});
                console.log(`${names[index]}: A callbacks +${m.a}, PTS +${m.aPtsMs} ms; B callbacks +${m.b}, PTS +${m.bPtsMs} ms`);
                requireAProgress(m);
                if (index >= 5 && (m.b <= 0 || m.bPtsMs <= 0)) throw new Error('B did not advance after Play');
            }
            console.log('Releasing B; watch A continuity.');
            await app.signal('USR2');
            const recovery = await wait(r=>measurement(r,8));
            details.stages.push({...recovery,name:'B released'});
            requireAProgress(recovery);
        }
        const end = await wait(r=>r.find(x=>x.event==='run_end'),12000);
        const cleanup = rows.filter(r=>['b_unload','a_unload'].includes(r.event));
        if (end.status !== 0 || cleanup.length !== 2 || cleanup.some(r=>r.status!==0))
            throw new Error('Native run or cleanup failed; inspect report');
        if (loadOnly && rows.some(r=>r.event==='step_end'&&r.status>=5&&r.status<=7 || r.event==='packets'&&r.b>0))
            throw new Error('Load-only run unexpectedly fed or played B');
        details.telemetryPassed = true;
        console.log('Diagnostic completed. Visible playback and resource ownership still require observation.');
    } catch (error) { details.controllerError=error.message; console.error(error.message); process.exitCode=1; }
    finally {
        if (controlled) {
            try {
                if (!rows.some(r=>r.event==='run_end')) {
                    await app.signal('USR2');
                    const until=Date.now()+4500;
                    do { await read(); if(rows.some(r=>r.event==='run_end')) break; await delay(250); } while(Date.now()<until);
                }
            } catch { /* Preserve last complete trace. */ }
            try { await app.stop(); details.processExitConfirmed=true; }
            catch { console.error('App exit unconfirmed. Close with Back.'); process.exitCode=1; }
        }
        if (collector) { await delay(250); details.resourceLog=await collector.stop(); }
        if (controlled) saveReport(reportName,build,rows,details);
        client.end(); process.removeListener('SIGINT',cancel); process.removeListener('SIGTERM',cancel);
    }
}
run().catch(error=>{console.error(error.message);process.exitCode=1;});
