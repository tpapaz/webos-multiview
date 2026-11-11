const fs=require('node:fs');
const path=require('node:path');
const {setTimeout:delay}=require('node:timers/promises');
const {connect}=require('./phase1-device.cjs');
const {nativeBuild,openNativeApp,launchEnduranceApp,saveReport}=require('./phase1-native-ssh.cjs');
const {startResourceLog}=require('./phase1-resource-log.cjs');
const {parseTrace,assess,options}=require('./phase1-endurance-evidence.cjs');
const cpuEvidence=require('./phase1-cpu-evidence.cjs');
const {readTemperatures}=require('./phase1-thermal-evidence.cjs');

async function main() {
    const {repeat,minutes,cycles,alias}=options(process.argv.slice(2));
    const build=nativeBuild('endurance'),seconds=repeat?8:minutes*60;
    const reportName=`c1-phase1-endurance-${repeat?'repeat-'+cycles:'minutes-'+minutes}-${build.version}`;
    const reportDir=path.join(__dirname,'../build/reports');
    let prerequisite;
    if(!repeat) {
        // Lifecycle-fix diagnostic: smoke this exact binary before the five-minute retry.
        const name=minutes===5?`repeat-1`:`minutes-5`;
        let prior;try{prior=JSON.parse(fs.readFileSync(path.join(reportDir,`c1-phase1-endurance-${name}-${build.version}.json`)));}catch{throw new Error(`Complete ${name} on this build first`);}
        if(prior.binarySha256!==build.hash||!prior.telemetryPassed||!prior.processExitConfirmed||!(prior.ownerObservation?.spotChecksPassed||prior.ownerObservation?.bothClocksAdvancedTogether))
            throw new Error('Prerequisite report needs this ELF, successful exits and owner visual checks');
        prerequisite={report:`c1-phase1-endurance-${name}-${build.version}.json`,binarySha256:prior.binarySha256,scope:minutes===5?'same-build smoke for diagnostic lifecycle retry; repeatability not inferred':'same-build five-minute pass'};
    }
    let cancelled=null;
    const cancelInt=()=>{cancelled='SIGINT';},cancelTerm=()=>{cancelled='SIGTERM';};
    process.on('SIGINT',cancelInt);process.on('SIGTERM',cancelTerm);
    const client=await connect(alias);
    const details={device:{model:'LG OLED C1',firmware:'03.53.45',sdk:'6.5.3',source:'owner supplied'},
        experiment:repeat?'bounded app start/exit repetitions':'bounded continuous dual playback',
        requestedCycles:cycles,requestedOverlapSeconds:seconds,prerequisite,cycles:[],telemetryPassed:false,processExitConfirmed:false,
        screensaver:{preferredType:2,sdlInhibit:'requested only during bounded playback',effectiveOnC1:'unknown until TV test'},
        ownerObservation:{status:'unknown'},resourceOwnership:{status:'unknown',reason:repeat?'bounded cycle categories require A/B attribution':'only startup/final windows collected; requires attribution'},
        audioFocus:'unknown',simultaneousHdmi:'unknown'};
    const identities=new Set();
    const save=()=>saveReport(reportName,build,[],details);
    try {
        for(let index=0;index<cycles;index++) {
            if(cancelled)throw new Error('Test cancelled');
            let app,controlled=false,rows=[],collector,finalStarted=false;
            const result={cycle:index+1,processExitConfirmed:false,logs:[]};
            let cpuBefore,cpuAt=0;
            if(!repeat)result.cpu={schemaVersion:1,sampling:'menu baseline, then approximately six-second intervals; read-only /proc',
                systemBusy:'all CPUs, idle and iowait excluded',appCpu:'one core = 100%; app process only, excludes media daemons and hardware engines',samples:[],unavailableSamples:0};
            const sampleCpu=async phase=>{
                if(repeat)return;
                try {
                    const after=cpuEvidence.counters(await app.cpuCounters()),now=Date.now();
                    if(cpuBefore)result.cpu.samples.push({phase,hostUtc:new Date(now).toISOString(),intervalMs:now-cpuAt,...cpuEvidence.interval(cpuBefore,after)});
                    cpuBefore=after;cpuAt=now;
                }catch{result.cpu.unavailableSamples++;cpuBefore=null;cpuAt=Date.now();}
                try{result.cpu.temperatures??=[];result.cpu.temperatures.push({phase,...await readTemperatures(client)});}
                catch{result.cpu.temperatureReadErrors=(result.cpu.temperatureReadErrors||0)+1;}
            };
            details.cycles.push(result);
            try {
                if(index) {
                    await launchEnduranceApp(client,build);
                    const until=Date.now()+12000;
                    do {try{app=await openNativeApp(client,build);break;}catch{await delay(500);}}while(Date.now()<until&&!cancelled);
                    if(!app)throw new Error('Reopened endurance app did not become ready');
                } else app=await openNativeApp(client,build);
                if(identities.has(app.identityToken))throw new Error('App process was reused instead of recreated');
                identities.add(app.identityToken);result.distinctProcess=true;
                const before=parseTrace(await app.trace());
                if(before[0]?.event!=='ready'||before.some(r=>r.event==='run_start'))throw new Error('Open a fresh endurance menu before this test');
                if(!repeat){await sampleCpu('menu');await delay(2000);await sampleCpu('menu');}
                collector=await startResourceLog(client,build.id);
                await delay(500);if(collector.report.ended||collector.report.collectionError)throw new Error('Resource collector unavailable');
                const start=Date.now(),offset=before.length;
                result.startedAt=new Date().toISOString();result.signalClientElapsedMs=collector.elapsedMs();
                controlled=true;await app.signal(repeat?'USR1':minutes===5?'USR2':'HUP');
                let lastNotice=0;
                while(Date.now()-start<(seconds+45)*1000) {
                    if(cancelled)throw new Error('Test cancelled');
                    rows=parseTrace(await app.trace()).slice(offset);result.rows=rows;
                    if(!repeat&&Date.now()-cpuAt>=5000) {
                        const phase=rows.some(r=>r.event==='released')?'recovery':rows.some(r=>r.event==='overlap_start')?'overlap':'startup';
                        await sampleCpu(phase);
                    }
                    if(rows.some(r=>r.event==='run_end'))break;
                    if(rows.some(r=>r.event==='progress_error'))throw new Error('Native progress watchdog stopped the run');
                    const overlap=rows.find(r=>r.event==='overlap_start'),latest=rows.findLast(r=>r.event==='sample');
                    const elapsed=overlap&&latest?(latest.ms-overlap.ms)/1000:0;
                    if(!repeat&&collector&&!finalStarted&&elapsed>=35) {
                        result.logs.push({window:'startup',...(await collector.stop())});collector=null;
                    }
                    if(!repeat&&!collector&&!finalStarted&&elapsed>=seconds-25) {
                        collector=await startResourceLog(client,build.id);finalStarted=true;
                    }
                    if(elapsed>=lastNotice+60) {lastNotice=Math.floor(elapsed/60)*60;console.log(`Dual playback ${lastNotice}s; A PTS ${latest.aMs}ms, B PTS ${latest.bMs}ms`);save();}
                    await delay(repeat?500:2000);
                }
                if(!rows.some(r=>r.event==='run_end'))throw new Error('Endurance run deadline exceeded');
                result.telemetry=assess(rows,seconds);
                if(!result.telemetry.passed)throw new Error(result.telemetry.exitEvents.length?
                    `Native exit: ${result.telemetry.exitEvents.map(e=>e.cause).join(', ')}`:'Duration, continuity, loop, screensaver request or cleanup acceptance failed');
            } catch(error) {result.error=error.message;throw error;}
            finally {
                if(controlled) {
                    try {
                        // On cancellation/error, normal TERM cleanup may exit before run_end can be read.
                        await app.stop();result.processExitConfirmed=true;
                    } catch {result.exitError='App exit unconfirmed; use Back';process.exitCode=1;}
                } else if(app&&index) {
                    try{await app.stop();result.processExitConfirmed=true;}catch{result.exitError='App exit unconfirmed';}
                }
                if(collector){await delay(250);result.logs.push({window:finalStarted?'final':repeat?'cycle':'startup',...(await collector.stop())});}
                result.rows=rows;result.finishedAt=new Date().toISOString();save();
            }
            if(!result.processExitConfirmed)throw new Error('Stopped repetitions because app exit was not confirmed');
            console.log(`Cycle ${index+1}/${cycles}: telemetry passed; app exit confirmed.`);
            if(index+1<cycles)await delay(1000);
        }
        details.telemetryPassed=details.cycles.length===cycles&&details.cycles.every(c=>c.telemetry?.passed&&c.distinctProcess);
        details.processExitConfirmed=details.cycles.every(c=>c.processExitConfirmed);
        console.log('Completed. Confirm visible clocks separately; telemetry does not verify audio or HDMI.');
    } catch(error){details.controllerError=error.message;console.error(error.message);process.exitCode=1;}
    finally{details.controllerCancellation=cancelled||undefined;details.processExitConfirmed=details.cycles.length>0&&details.cycles.every(c=>c.processExitConfirmed);save();client.end();process.removeListener('SIGINT',cancelInt);process.removeListener('SIGTERM',cancelTerm);}
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
