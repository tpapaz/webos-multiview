// Foreground owner-scoped CLI. Plan/refusal paths never import the TV adapter.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {local}=require('./physical-candidate-local.cjs');
const {load,publicGate}=require('./physical-candidate-gate.cjs');
const {runCandidate}=require('./physical-candidate-runner.cjs');
const {hash}=require('./hdmi-picture-io.cjs');
const {version}=require('./physical-candidate-contract.cjs');
function recordRestoration(directory,confirmed){
    assert.equal(confirmed,true,'explicit post-run owner confirmation required');
    const file=path.join(directory,'capture.json'),bytes=fs.readFileSync(file),c=JSON.parse(bytes);
    assert.equal(c.appVersion,version);assert.equal(c.mode,'lifecycle_validation');assert.equal(c.status,'collected');
    const receipt={schemaVersion:1,appVersion:version,mode:c.mode,captureSha256:hash(bytes),ownerConfirmed:true,picture:true,sound:true,remote:true};
    fs.writeFileSync(path.join(directory,'owner-restoration.json'),JSON.stringify(receipt,null,2)+'\n',{flag:'wx',mode:0o600});
}
async function main(args){
    if(args.length===3&&args[0]==='--record-owner-restoration'&&args[2]==='--owner-picture-sound-remote-restored'){
        recordRestoration(path.resolve(args[1]),true);console.log('Recorded explicit owner restoration confirmation; no device access.');return;
    }
    if((args.length===1||args.length===3)&&args[0]==='--plan'){
        if(args.length===3)assert.equal(args[1],'--gate-evidence');
        const refs=local(),gate=args.length===3?load(path.resolve(args[2]),refs):{ready:false,state:'closed_no_prior_witnessed_lifecycle'};
        console.log(JSON.stringify({appVersion:version,reportSchemaVersion:2,built:true,packaged:refs.pkg.archiveVerified,
            acquisitionGate:publicGate(gate),bounds:'one SAM attempt; two connections <=30s; scheduled collection at dispatch+27s',TVConnections:0}));return;
    }
    const lifecycle=args[0]==='--allow-one-lifecycle-0.1.12-run',picture=args[0]==='--allow-one-picture-0.1.12-run';
    assert(lifecycle||picture);assert.equal(args.length,lifecycle?4:6);
    assert.equal(args[1],lifecycle?'--owner-lifecycle-0.1.12-ready':'--owner-physical-0.1.12-ready');assert.equal(args[2],'--owner-independent-timer-ready');
    if(picture)assert.equal(args[4],'--gate-evidence');
    const mode=lifecycle?'lifecycle_validation':'physical_picture',references=local(mode);
    assert.equal(references.pkg.archiveVerified,true,'candidate has not been packaged/archive-validated');
    const gate=picture?load(path.resolve(args[5]),references):undefined;if(picture)assert.equal(gate.ready,true,'independent termination/restoration gate closed');
    const directory=path.resolve(args[3]);fs.mkdirSync(directory,{mode:0o700});
    const fd=fs.openSync(path.join(directory,'capture.json'),'wx',0o600),events=fs.openSync(path.join(directory,'stages.jsonl'),'wx',0o600);
    const stop=new AbortController(),cancel=()=>stop.abort();process.on('SIGINT',cancel);process.on('SIGTERM',cancel);
    const persist=r=>{const b=Buffer.from(JSON.stringify(r,null,2)+'\n');fs.writeSync(fd,b,0,b.length,0);fs.ftruncateSync(fd,b.length);fs.fsyncSync(fd);};
    const saveRaw=(name,bytes)=>{assert(/^(report-(host|jail)\.jsonl|witness-(host|jail)\.json)$/.test(name));assert(bytes.length<=(name.startsWith('witness')?256:2048));const f=fs.openSync(path.join(directory,name),'wx',0o600);try{fs.writeFileSync(f,bytes);fs.fsyncSync(f);}finally{fs.closeSync(f);}};
    const savePrivate=(name,value)=>{assert(/^(launch|reply-[01])\.json$/.test(name));const f=fs.openSync(path.join(directory,name),'wx',0o600);try{fs.writeFileSync(f,JSON.stringify(value,null,2)+'\n');fs.fsyncSync(f);}finally{fs.closeSync(f);}};
    try{
        const result=await runCandidate({references,mode,gate,signal:stop.signal,
            connect:(...a)=>require('./phase1-device.cjs').connect(...a),persist,saveRaw,savePrivate,
            ownerCue:()=>console.log('OWNER_READY: '+mode+'; remote and independent timer required; one fresh submission follows.'),
            emit:e=>{fs.writeSync(events,JSON.stringify(e)+'\n');fs.fsyncSync(events);if(e.stage==='submission.sam.command'&&e.outcome==='started')console.log('ONE_SUBMISSION_INTENT: start independent 27-second timer now; not acknowledgment.');}});
        persist(result);console.log(JSON.stringify({status:result.status,attempts:result.attempts,collection:result.collection,processTermination:result.processTermination,hardwareRelease:'unknown'}));
        if(result.status!=='collected')process.exitCode=1;
    }finally{process.removeListener('SIGINT',cancel);process.removeListener('SIGTERM',cancel);fs.closeSync(fd);fs.closeSync(events);}
}
if(require.main===module)main(process.argv.slice(2)).catch(()=>{console.error('0.1.12 candidate stopped: scope, local artifact or termination gate failed. No automatic retry.');process.exitCode=1;});
module.exports={main,recordRestoration};
