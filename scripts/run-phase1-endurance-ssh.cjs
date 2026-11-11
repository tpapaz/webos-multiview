const fs=require('node:fs');
const path=require('node:path');
const {setTimeout:delay}=require('node:timers/promises');
const {connect}=require('./phase1-device.cjs');
const {nativeBuild,openNativeApp,saveReport}=require('./phase1-native-ssh.cjs');
const {startResourceLog}=require('./phase1-resource-log.cjs');
const {parseTrace,assess,options}=require('./phase1-endurance-evidence.cjs');
const cpuEvidence=require('./phase1-cpu-evidence.cjs');
const {readTemperatures}=require('./phase1-thermal-evidence.cjs');

async function main() {
    const {mode,alias}=options(process.argv.slice(2)),build=nativeBuild('endurance');
    const reportName=`c1-phase1-veto-${mode==='veto'?'request':mode}-${build.version}`;
    let prerequisite;
    if(mode==='veto') {
        const name=`c1-phase1-veto-smoke-${build.version}.json`;
        let prior;try{prior=JSON.parse(fs.readFileSync(path.join(__dirname,'../build/reports',name)));}catch{throw new Error('Complete this build’s short --smoke first');}
        if(prior.binarySha256!==build.hash||!prior.telemetryPassed||!prior.processExitConfirmed||!(prior.ownerObservation?.spotChecksPassed||prior.ownerObservation?.bothClocksAdvancedTogether))
            throw new Error('Smoke prerequisite needs this ELF, clean exit and owner-observed clocks');
        prerequisite={report:name,binarySha256:prior.binarySha256,scope:'same-build short smoke; no endurance prerequisite'};
    }
    let cancelled=null;
    const cancelInt=()=>{cancelled='SIGINT';},cancelTerm=()=>{cancelled='SIGTERM';};
    process.on('SIGINT',cancelInt);process.on('SIGTERM',cancelTerm);
    const client=await connect(alias);
    const result={processExitConfirmed:false,rows:[],logs:[],cpu:{schemaVersion:1,sampling:'menu baseline then approximately six-second intervals; read-only /proc',
        systemBusy:'all CPUs; idle and iowait excluded',appCpu:'one core = 100%; native process only',samples:[],temperatures:[],unavailableSamples:0}};
    const details={device:{model:'LG OLED C1',firmware:'03.53.45',sdk:'6.5.3',source:'owner supplied'},
        experiment:'short app-owned native screensaver veto probe',mode,nativeHardCapSeconds:90,idleWaitCapSeconds:mode==='veto'?60:3,
        requestedOverlapSeconds:8,requiredARecoverySeconds:3,prerequisite,cycles:[result],telemetryPassed:false,processExitConfirmed:false,
        screensaver:{policy:'normal app policy; no extended Type 2 metadata',transport:'public app-owned LS2',caller:'ordinary LSCall/LSCallOneReply; no asserted application ID',appliedVeto:'unknown; requires attributed service NACK and owner observation'},
        ownerObservation:{status:'unknown'},resourceOwnership:{status:'unknown',reason:'projected logs need attribution'},audioFocus:'unknown',simultaneousHdmi:'unknown'};
    const save=()=>saveReport(reportName,build,[],details);
    let app,controlled=false,collector,cpuBefore,cpuAt=0;
    const sampleCpu=async phase=>{
        try {
            const after=cpuEvidence.counters(await app.cpuCounters()),now=Date.now();
            if(cpuBefore)result.cpu.samples.push({phase,hostUtc:new Date(now).toISOString(),intervalMs:now-cpuAt,...cpuEvidence.interval(cpuBefore,after)});
            cpuBefore=after;cpuAt=now;
        }catch{result.cpu.unavailableSamples++;cpuBefore=null;cpuAt=Date.now();}
        try{result.cpu.temperatures.push({phase,...await readTemperatures(client)});}
        catch{result.cpu.temperatureReadErrors=(result.cpu.temperatureReadErrors||0)+1;}
    };
    try {
        app=await openNativeApp(client,build);
        const before=parseTrace(await app.trace());
        if(before[0]?.event!=='ready'||before.some(r=>r.event==='probe_start'))throw new Error('Open a fresh veto probe menu first');
        await sampleCpu('menu');await delay(2000);await sampleCpu('menu');
        collector=await startResourceLog(client,build.id,100);
        await delay(300);if(collector.report.ended||collector.report.collectionError)throw new Error('Resource/idle collector unavailable');
        if(cancelled)throw new Error('Test cancelled');
        result.startedAt=new Date().toISOString();result.signalClientElapsedMs=collector.elapsedMs();
        controlled=true;await app.signal(mode==='smoke'?'USR1':'HUP');
        const until=Date.now()+100000;
        while(Date.now()<until) {
            if(cancelled)throw new Error('Test cancelled');
            result.rows=parseTrace(await app.trace()).slice(before.length);
            if(result.rows.some(r=>r.event==='run_end'))break;
            if(Date.now()-cpuAt>=5000)await sampleCpu(result.rows.some(r=>r.event==='released')?'recovery':result.rows.some(r=>r.event==='overlap_start')?'overlap':result.rows.some(r=>r.event==='run_start')?'startup':'idle_wait');
            await delay(500);
        }
        result.telemetry=assess(result.rows,mode);
        details.outcome=result.telemetry.outcome;
        details.telemetryPassed=result.telemetry.passed;
        if(result.telemetry.outcome==='inconclusive_no_request')console.log('No real request arrived within 60 seconds; recorded inconclusive. No longer test is scheduled.');
        else if(!result.telemetry.passed) {
            const reason=result.telemetry.apiErrors.at(-1)||result.telemetry.serviceErrors.at(-1);
            const code=(result.telemetry.apiErrors.length?result.telemetry.apiCodes:result.telemetry.serviceCodes).at(-1)?.value;
            throw new Error(result.telemetry.exitEvents.length?
                `Native exit: ${result.telemetry.exitEvents.map(e=>e.cause).join(', ')}`:
                `Native registration, playback or cleanup checks failed${reason?`; ${reason.reason}, code ${code??'unknown'}`:''}; inspect the numeric trace`);
        }
        else console.log('Short native checks passed. Service attribution and visible clocks remain separate evidence.');
    }catch(error){details.controllerError=error.message;process.exitCode=1;console.error(error.message);}
    finally {
        if(controlled) {
            try{await app.stop();result.processExitConfirmed=true;}catch{result.exitError='App exit unconfirmed; use Back';process.exitCode=1;}
        }
        if(collector) {
            result.logs.push({window:'bounded_probe',...await collector.stop()});
            result.serviceNackObserved=collector.report.entries.some(r=>r.attribution==='app-id-match'&&r.actor==='tvpower'&&r.categories.includes('screensaver_nack'));
        }
        try{result.cpu.temperatures.push({phase:'post_exit',...await readTemperatures(client)});}catch{result.cpu.temperatureReadErrors=(result.cpu.temperatureReadErrors||0)+1;}
        result.finishedAt=new Date().toISOString();details.processExitConfirmed=result.processExitConfirmed;
        details.controllerCancellation=cancelled||undefined;save();client.end();
        process.removeListener('SIGINT',cancelInt);process.removeListener('SIGTERM',cancelTerm);
    }
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
