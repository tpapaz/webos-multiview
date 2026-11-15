const {id,version,launchBinding,payload}=require('../../scripts/physical-candidate-contract.cjs');
const {hash,base}=require('../../scripts/hdmi-picture-io.cjs');
const boot='00000000-0000-0000-0000-000000000001';
const authority={acquireHdmi4:true,launchBootId:boot,launchStartByBoottimeMs:103000,launchStartByRealtimeMs:1700000003000};
function trace(mode='lifecycle_validation',gate=null){
    const rows=[{schemaVersion:2,appId:id,appVersion:version,mode,gateEvidenceSha256:gate,launchBindingSha256:launchBinding(payload(authority,mode,gate))}];
    const stages=mode==='physical_picture'?[0,1,2,3,4,5,6,7]:[0,1,7];
    for(const n of stages)rows.push([n,0,n*10,100+n*10],[n,1,n*10+1,101+n*10,1]);
    rows.push([92,0],mode==='physical_picture'?[90,5,1,1,1,1,1,1,1,0,0]:[90,5,1,0,0,0,0,0,1,0,0]);
    return Buffer.from(rows.map(JSON.stringify).join('\n')+'\n');
}
const marker=Buffer.from(JSON.stringify({schemaVersion:1,kind:'own_parent_termination',state:'observed',exitStatus:'unknown',hardwareRelease:'unknown'})+'\n');
function witnessFor(mode='lifecycle_validation',gate=null){return Buffer.concat([Buffer.from(JSON.stringify([2,version,mode==='physical_picture'?1:0,launchBinding(payload(authority,mode,gate))])+'\n'),marker]);}
const witness=witnessFor();
function metadata(bytes){return {state:'valid',sha256:hash(bytes),metadata:{type:'file',mode:0o600,uid:5000,gid:5000,size:bytes.length},parent:{state:'present',metadata:{type:'directory',mode:0o700,uid:5000,gid:5000}}};}
function gateBundle(){
    const references={recordSha256:'c'.repeat(64),packageRecordSha256:'d'.repeat(64),pkg:{archiveVerified:true,appVersion:version,packageSha256:'b'.repeat(64),binarySha256:'e'.repeat(64),manifestSha256:'f'.repeat(64)}};
    const report=trace(),stages=[{stage:'submission.sam.command',outcome:'started',elapsedMs:10}];
    const c={appId:id,appVersion:version,mode:'lifecycle_validation',reportSchemaVersion:2,candidateRecordSha256:references.recordSha256,packageRecordSha256:references.packageRecordSha256,packageSha256:references.pkg.packageSha256,
        status:'collected',collection:'completed',attempts:1,acknowledgment:'accepted',utilityExitCode:0,utilitySignalPresent:false,stderrBytes:0,
        dispatchMs:10,collectionStartedMs:27011,connections:[{name:'submission',startedMs:0,elapsedMs:11,closed:true},{name:'collection',startedMs:27011,elapsedMs:20,closed:true}],
        preflight:{readiness:true,queries:[],permissionScope:'own_generated_registration_only',processBefore:'absent',processAfter:'absent',reports:['host_report','jail_report','host_witness','jail_witness'].map(alias=>({alias,state:'absent'})),bindings:{executable:{sha256:references.pkg.binarySha256},appinfo:{sha256:references.pkg.manifestSha256}}},
        installedAfter:{executable:{sha256:references.pkg.binarySha256,hashMatches:true,metadata:{type:'file',mode:0o755,uid:1000,gid:1000}},appinfo:{sha256:references.pkg.manifestSha256,hashMatches:true,metadata:{type:'file',mode:0o644,uid:1000,gid:1000}}},
        reports:[metadata(report),metadata(report)],terminationReports:[metadata(witness),metadata(witness)],aliasComparison:'identical_bytes',processAfter:'absent',stages};
    for(const key of ['executable','appinfo'])Object.assign(c.preflight.bindings[key],c.installedAfter[key].metadata);
    const bundle={'capture.json':Buffer.from(JSON.stringify(c)),'stages.jsonl':Buffer.from(stages.map(JSON.stringify).join('\n')+'\n'),
        'launch.json':Buffer.from(JSON.stringify({verifyLifecycle:true,launchBootId:boot,launchStartByBoottimeMs:103000,launchStartByRealtimeMs:1700000003000})),
        'report-host.jsonl':report,'report-jail.jsonl':report,'witness-host.json':witness,'witness-jail.json':witness};
    bundle['owner-restoration.json']=Buffer.from(JSON.stringify({schemaVersion:1,appVersion:version,mode:'lifecycle_validation',captureSha256:hash(bundle['capture.json']),ownerConfirmed:true,picture:true,sound:true,remote:true}));
    return {bundle,references,c};
}
function role(side){
    const connector=side==='pub'?'com.webos.pipe.avmuteclient.*':'com.webos.avconnector.*';
    const names=['com.webos.media.client.*','com.webos.rm.client.*','com.webos.pipeline.*',connector,
        'com.webos.vt.*','com.webos.chromium.media.*',id,''];
    const outbound=[['com.webos.media'],['com.webos.media'],['com.webos.pipelinectrl.*'],side==='pub'?
        ['com.webos.service.avmutemanager']:['com.webos.service.videooutput','com.webos.service.audio','com.webos.service.utp.extinputs'],['*'],['*'],['*']];
    const inbound=[['com.webos.media'],['com.webos.media'],['com.webos.pipelinectrl.*'],[],['*'],[],[]];
    return {role:{exeName:base+'/multiview-hdmi-window',type:'regular',allowedNames:names},
        permissions:names.slice(0,7).map((service,i)=>({service,outbound:outbound[i],inbound:inbound[i]}))};
}

module.exports={trace,witness,witnessFor,marker,boot,authority,metadata,gateBundle,role};


