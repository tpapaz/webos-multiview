const assert=require('node:assert/strict'),Module=require('node:module');
const {EventEmitter}=require('node:events');
const {runCandidate}=require('../../scripts/physical-candidate-runner.cjs');
const {id,version,filenames,validatePayload}=require('../../scripts/physical-candidate-contract.cjs');
const {hash,base}=require('../../scripts/hdmi-picture-io.cjs');
const {trace,witnessFor,boot,role}=require('./physical-candidate-fixture.cjs');
const {evaluate}=require('../../scripts/physical-candidate-gate.cjs');
const {group,methods}=require('../../scripts/hdmi-utp-coverage.cjs');
async function trial(options={}){
    const mode=options.mode||'lifecycle_validation',names=filenames(mode),files=new Map(),commands=[],connections=[],reads=[],events=[],saved={},raws={};let time=0,dispatched=false;
    const aliases=name=>['/tmp/'+id+'/'+name,'/var/palm/jail/'+id+'/tmp/'+id+'/'+name];const appAliases=aliases(names.report),witnessAliases=aliases(names.witness);
    const put=(p,v)=>files.set(p,Buffer.isBuffer(v)?v:Buffer.from(JSON.stringify(v)));
    const executable=base+'/multiview-hdmi-window',appinfo=base+'/appinfo.json';
    put(executable,Buffer.from('synthetic 0.1.12 ELF'));put(appinfo,{id,version});put('/usr/bin/luna-send',Buffer.from('synthetic utility'));
    for(const side of ['pub','prv'])put('/var/palm/ls2-dev/roles/'+side+'/'+id+'.json',role(side));
    put('/var/luna-service2-dev/client-permissions.d/'+id+'.app.json',{[id]:['public']});
    put('/var/luna-service2-dev/manifests.d/'+id+'.json',{id,version:options.oldVersion?'0.1.11':version,roleFilesPrv:['/var/palm/ls2-dev/roles/prv/'+id+'.json'],roleFilesPub:['/var/palm/ls2-dev/roles/pub/'+id+'.json'],clientPermissionFiles:['/var/luna-service2-dev/client-permissions.d/'+id+'.app.json']});
    put('/proc/sys/kernel/random/boot_id',Buffer.from(boot+'\n'));put('/proc/uptime',Buffer.from('100.00 1.00\n'));
    const baseline={app:{returnValue:true,client:['public'],api:{'/*':['all']}},utp:{returnValue:true,client:['tv'],api:{'/*':['all'],...Object.fromEntries([...methods,'pause'].map(m=>['/'+m,['private']]))}}};
    const overlay=JSON.parse(JSON.stringify(baseline));overlay.app.client.push(group);for(const m of methods)overlay.utp.api['/'+m].push(group);
    const references={recordSha256:'c'.repeat(64),packageRecordSha256:'d'.repeat(64),mode,baseline,pkg:{appId:id,appVersion:version,mode:'physical_candidate',packageSha256:'b'.repeat(64),reportSchemaVersion:2,contextDispatchCorrection:true,independentTerminationWitness:true,archiveVerified:!options.unarchived,binarySha256:options.badHash?'0'.repeat(64):hash(files.get(executable)),manifestSha256:hash(files.get(appinfo))},utility:{tvPath:'/usr/bin/luna-send',sha256:hash(files.get('/usr/bin/luna-send'))}};
    const gate=options.gate;
    if(options.occupied)put(witnessAliases[0],Buffer.from('occupied'));
    const stat=name=>{const report=[...appAliases,...witnessAliases].includes(name);return {mode:0o100000|(name===executable?0o755:report?0o600:0o644),uid:report?5000:1000,gid:report?5000:1000,size:name.startsWith('/proc/')?0:files.get(name).length,mtime:1,isFile:()=>true,isDirectory:()=>false};};
    const denied=()=>Object.assign(Error('PRIVATE_SENTINEL'),{code:2});
    const sftp={lstat(name,cb){if(options.hangCollection&&dispatched&&name===witnessAliases[1])return;if(files.has(name))return cb(null,stat(name));
        if([...appAliases,...witnessAliases].some(p=>p.slice(0,p.lastIndexOf('/'))===name))return cb(null,{mode:0o40700,uid:5000,gid:5000,size:4096,mtime:1,isFile:()=>false,isDirectory:()=>true});cb(denied());},
        open(name,flags,cb){assert.equal(flags,'r');cb(null,name);},fstat(name,cb){cb(null,stat(name));},close(name,cb){cb(null);},
        read(name,b,offset,length,position,cb){reads.push(name);if(witnessAliases.includes(name))assert(length<=256);const bytes=files.get(name).subarray(position,position+length);bytes.copy(b,offset);cb(null,bytes.length);},
        readdir(name,cb){assert.equal(name,'/proc');cb(null,[]);}};
    const adapter={exists:async p=>files.has(p),checkAppAbsent:async()=>{if(options.present)throw Error('PRIVATE_SENTINEL');},readPath:async p=>{assert(files.has(p));const bytes=files.get(p);return {bytes,sha256:hash(bytes),attrs:{type:'file',mode:p===executable?0o755:0o644,uid:p.startsWith(base)?1000:0,gid:p.startsWith(base)?1000:0,size:bytes.length,mtime:1}};}};
    const previous=Module._load;Module._load=function(name,parent,...rest){if(name.endsWith('phase1-device.cjs'))throw Error('Synthetic tests must never import a device profile');if(name.endsWith('hdmi-correction-0.1.3/transport.cjs'))return {base,sha:hash,openAdapter:async()=>adapter};return previous.call(this,name,parent,...rest);};
    try{
        let capture;const r=await runCandidate({mode,gate,references,connectionCapMs:options.hangCollection?15:30000,
            now:()=>time,sleep:async ms=>{assert(connections[0].closed);if(options.foregroundWait)await new Promise(r=>setTimeout(r,80));time+=ms;},
            connect:async()=>{if(connections.length){assert(connections[0].closed);assert(time>=27000);}const c=new EventEmitter();c.closed=false;c.destroy=()=>{c.closed=true;c.emit('close');};c.sftp=cb=>cb(null,sftp);
                c.exec=(command,cb)=>{commands.push(command);const stream=new EventEmitter();stream.stderr=new EventEmitter();stream.destroy=()=>{};cb(null,stream);
                    if(command==='date +%s')return queueMicrotask(()=>{if(options.stale)time+=2000;stream.emit('data',Buffer.from('1700000000\n'));stream.emit('close',0,null);});
                    if(command.includes('queryServicePermissions')){assert.equal(mode,'physical_picture');const reply=command.includes('"service":"'+id+'"')?overlay.app:overlay.utp;return queueMicrotask(()=>{stream.emit('data',Buffer.from(JSON.stringify(reply)));stream.emit('close',0,null);});}
                    assert(command.includes('com.webos.applicationManager/launch'));const p=JSON.parse(command.match(/'([^']+)'$/)[1]).params;assert.equal(validatePayload(p),mode);
                    assert.equal(Object.hasOwn(p,'acquireHdmi4'),mode==='physical_picture');dispatched=true;
                    let app=trace(mode,p.terminationGateEvidenceSha256||null);if(options.partial)app=app.subarray(0,app.length-8);
                    for(const a of appAliases)put(a,app);for(const w of witnessAliases)put(w,options.oversizedWitness?Buffer.alloc(257):witnessFor(mode,p.terminationGateEvidenceSha256||null));
                    if(options.conflict)put(appAliases[1],Buffer.from(app.toString().replace('0.1.12','0.1.11')));
                    queueMicrotask(()=>{stream.emit('data',Buffer.from('{"returnValue":true}'));stream.emit('close',0,null);});
                };connections.push(c);return c;},persist:r=>{capture=r;},emit:e=>{events.push(e);if(options.foregroundWait&&e.stage==='submission.sam.command'&&e.outcome==='started')console.log('ONE_SUBMISSION_INTENT');},savePrivate:(n,v)=>{saved[n]=v;},saveRaw:(n,b)=>{assert(!raws[n]);raws[n]=Buffer.from(b);},ownerCue:()=>{}});
        assert.equal(capture,r);assert(!JSON.stringify(r).includes('PRIVATE_SENTINEL'));
        return {r,references,saved,raws,commands,connections,events,reads,witnessAliases};
    }finally{Module._load=previous;}
}
function bundleFrom(t){const bytes=Buffer.from(JSON.stringify(t.r));return {...t.raws,'capture.json':bytes,'launch.json':Buffer.from(JSON.stringify(t.saved['launch.json'])),'stages.jsonl':Buffer.from(t.events.map(JSON.stringify).join('\n')+'\n'),
    'owner-restoration.json':Buffer.from(JSON.stringify({schemaVersion:1,appVersion:version,mode:'lifecycle_validation',captureSha256:hash(bytes),ownerConfirmed:true,picture:true,sound:true,remote:true}))};}
async function acceptance(){
    const t=await trial();assert.equal(t.r.status,'collected');assert.equal(t.r.attempts,1);assert.equal(t.r.processTermination,'independently_observed');assert.equal(t.r.actualExit,'unknown');assert.equal(t.r.hardwareRelease,'unknown');assert.equal(t.r.livePicture,'not_applicable_lifecycle_validation');assert.equal(t.commands.length,2);assert.equal(Object.keys(t.raws).length,4);assert(t.r.connections.every(c=>c.closed&&c.elapsedMs<30000));assert(t.r.terminationReports.every(r=>r.state==='observed_terminated'));assert(t.r.reports.every(r=>r.state==='valid'));
    const gate=evaluate(bundleFrom(t),t.references);assert(gate.ready);
    const picture=await trial({mode:'physical_picture',gate});assert.equal(picture.r.attempts,1);assert.equal(picture.r.status,'collected');assert.equal(picture.r.preflight.queries.length,2);assert.equal(picture.r.reports[0].gateEvidenceSha256,gate.digest);assert.equal(picture.commands.filter(c=>c.includes('applicationManager/launch')).length,1);
    for(const option of [{oldVersion:true},{occupied:true},{present:true},{badHash:true},{stale:true}]){const x=await trial(option);assert.equal(x.r.attempts,0);assert.equal(x.connections.length,1);assert(x.connections[0].closed);}
    const mismatch=await trial({mode:'physical_picture',gate:{...gate,bootId:'00000000-0000-0000-0000-000000000002'}});assert.equal(mismatch.r.attempts,0);assert.equal(mismatch.connections.length,1);
    const partial=await trial({partial:true});assert.equal(partial.r.reports[0].state,'partial');assert.throws(()=>evaluate(bundleFrom(partial),partial.references));
    const conflict=await trial({conflict:true});assert.equal(conflict.r.aliasComparison,'conflicting');assert.throws(()=>evaluate(bundleFrom(conflict),conflict.references));
    const large=await trial({oversizedWitness:true});assert.equal(large.r.processTermination,'unknown');assert(!large.reads.some(p=>large.witnessAliases.includes(p)));assert(!Object.keys(large.raws).some(n=>n.startsWith('witness-')));
    const hanging=await trial({hangCollection:true});assert.equal(hanging.r.status,'incomplete');assert.equal(hanging.r.attempts,1);assert(hanging.r.connections.every(c=>c.closed));
    let connections=0;for(const options of [{unarchived:true},{mode:'physical_picture',gate:{ready:false}}])await assert.rejects(()=>runCandidate({references:{pkg:{appVersion:version,archiveVerified:!options.unarchived},mode:options.mode||'lifecycle_validation'},mode:options.mode||'lifecycle_validation',gate:options.gate,connect:async()=>{connections++;}}));assert.equal(connections,0);
    console.log('0.1.12 runner: real shared controller/preflight/IO, lifecycle zero queries, positive witnessed gate, exact boot/launch binding, fresh four aliases, raw bounded evidence, two caps/+27s, no retry passed');
}
if(require.main===module)acceptance().catch(e=>{console.error(e);process.exitCode=1;});
module.exports={trial,bundleFrom,acceptance};


