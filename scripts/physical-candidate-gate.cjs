// Read-only host evidence gate. No device/profile import and no boolean bypass.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {hash}=require('./hdmi-picture-io.cjs');
const {id,version,validatePayload,launchBinding}=require('./physical-candidate-contract.cjs');
const {classify}=require('./physical-candidate-report.cjs');
const {classifyWitness}=require('./physical-candidate-witness.cjs');
const names=['capture.json','launch.json','stages.jsonl','report-host.jsonl','report-jail.jsonl','witness-host.json','witness-jail.json','owner-restoration.json'];
function owned(report,bytes){
    const m=report?.metadata,p=report?.parent?.metadata;
    return report?.parent?.state==='present'&&m?.type==='file'&&m.mode===0o600&&m.size===bytes.length&&p?.type==='directory'&&p.mode===0o700&&m.uid===p.uid&&m.gid===p.gid;
}
function evaluate(bundle,references){
    assert.equal(references.pkg.archiveVerified,true);assert.equal(references.pkg.appVersion,version);
    const c=JSON.parse(bundle['capture.json']),launch=JSON.parse(bundle['launch.json']),owner=JSON.parse(bundle['owner-restoration.json']);
    assert.equal(c.appId,id);assert.equal(c.appVersion,version);assert.equal(c.mode,'lifecycle_validation');
    assert.equal(c.reportSchemaVersion,2);assert.equal(c.status,'collected');assert.equal(c.collection,'completed');
    assert.equal(c.candidateRecordSha256,references.recordSha256);assert.equal(c.attempts,1);assert.equal(c.acknowledgment,'accepted');
    assert.equal(c.packageRecordSha256,references.packageRecordSha256);assert(/^[0-9a-f]{64}$/.test(references.packageRecordSha256));
    assert.equal(c.packageSha256,references.pkg.packageSha256);assert(/^[0-9a-f]{64}$/.test(references.pkg.packageSha256));
    assert.equal(c.utilityExitCode,0);assert.equal(c.utilitySignalPresent,false);assert.equal(c.stderrBytes,0);
    assert.equal(c.connections.length,2);for(const entry of c.connections){assert(entry.closed);assert(Number.isFinite(entry.elapsedMs)&&entry.elapsedMs>=0&&entry.elapsedMs<30000);}
    assert.deepEqual(c.connections.map(x=>x.name),['submission','collection']);
    assert(c.connections[0].startedMs+c.connections[0].elapsedMs<c.connections[1].startedMs);
    assert(c.connections[1].startedMs-c.dispatchMs>=27000);assert(c.collectionStartedMs>=c.connections[1].startedMs);
    assert.deepEqual(bundle['stages.jsonl'].toString().trim().split('\n').map(JSON.parse),c.stages);
    assert.equal(validatePayload(launch),'lifecycle_validation');
    assert.equal(c.preflight.readiness,true);assert.deepEqual(c.preflight.queries,[]);
    assert.equal(c.preflight.permissionScope,'own_generated_registration_only');
    assert.equal(c.preflight.processBefore,'absent');assert.equal(c.preflight.processAfter,'absent');
    assert.deepEqual(c.preflight.reports.map(r=>[r.alias,r.state]).sort(),['host_report','jail_report','host_witness','jail_witness'].map(alias=>[alias,'absent']).sort());
    for(const [key,expected]of [['executable',references.pkg.binarySha256],['appinfo',references.pkg.manifestSha256]]){
        assert.equal(c.preflight.bindings[key].sha256,expected);assert.equal(c.installedAfter[key].sha256,expected);assert.equal(c.installedAfter[key].hashMatches,true);
        for(const metadata of [c.preflight.bindings[key],c.installedAfter[key].metadata]){assert.equal(metadata.type,'file');assert.equal(metadata.mode,key==='executable'?0o755:0o644);assert.equal(metadata.uid,1000);assert.equal(metadata.gid,1000);}
    }
    assert.equal(c.reports.length,2);assert.equal(c.terminationReports.length,2);assert.equal(c.aliasComparison,'identical_bytes');
    const report=bundle['report-host.jsonl'],witness=bundle['witness-host.json'];
    assert(report.equals(bundle['report-jail.jsonl']));assert(witness.equals(bundle['witness-jail.json']));
    const decoded=classify(report);assert.equal(decoded.state,'valid');assert.equal(decoded.mode,'lifecycle_validation');
    assert.equal(decoded.launchBindingSha256,launchBinding(launch));
    assert.equal(decoded.status,'lifecycle_completed');assert.equal(decoded.setupReady,true);assert.equal(decoded.localCleanup,true);
    assert.equal(decoded.ownerRetained,false);assert.equal(decoded.exitIntent,0);assert.equal(decoded.witnessArmed,true);
    assert(decoded.events.every(e=>e.issueAgeMs>=0&&e.issueAgeMs<22000&&e.monotonicMs>=0));
    assert(decoded.events.filter(e=>e.stage==='setup_and_window_id').every(e=>e.issueAgeMs<17000));
    assert(decoded.events.every(e=>!['open','select','observe','stop','close'].includes(e.stage)));
    for(let n=0;n<2;n++){
        const a=c.reports[n],b=c.terminationReports[n];assert(owned(a,report)&&owned(b,witness));
        assert.equal(a.metadata.uid,b.metadata.uid);assert.equal(a.metadata.gid,b.metadata.gid);
        assert.equal(a.sha256,hash(report));assert.equal(b.sha256,hash(witness));
        assert.equal(classifyWitness(witness,'lifecycle_validation',launchBinding(launch),{freshSlot:true,exactArtifact:true,ownedMetadata:true}).state,'observed_terminated');
    }
    assert.equal(c.processAfter,'absent');
    assert.deepEqual(owner,{schemaVersion:1,appVersion:version,mode:'lifecycle_validation',captureSha256:hash(bundle['capture.json']),ownerConfirmed:true,picture:true,sound:true,remote:true});
    const receipt={schemaVersion:1,kind:'physical_candidate_termination_gate',appVersion:version,
        candidateRecordSha256:references.recordSha256,packageRecordSha256:references.packageRecordSha256,packageSha256:references.pkg.packageSha256,binarySha256:references.pkg.binarySha256,manifestSha256:references.pkg.manifestSha256,
        captureSha256:hash(bundle['capture.json']),launchSha256:hash(bundle['launch.json']),stagesSha256:hash(bundle['stages.jsonl']),
        traceSha256:hash(report),witnessSha256:hash(witness),ownerRestorationSha256:hash(bundle['owner-restoration.json']),sameBootRequired:true};
    return {ready:true,state:'verified_prior_lifecycle',digest:hash(Buffer.from(JSON.stringify(receipt))),receipt,bootId:launch.launchBootId};
}
function load(directory,references){
    try{
        const bundle={};for(const name of names){const file=path.join(directory,name),stat=fs.lstatSync(file),cap=name.startsWith('witness-')?256:name.startsWith('report-')?2048:name==='launch.json'?4096:name==='owner-restoration.json'?1024:131072;assert(stat.isFile()&&!stat.isSymbolicLink()&&stat.size<=cap);bundle[name]=fs.readFileSync(file);}
        return evaluate(bundle,references);
    }catch{return {ready:false,state:'closed_missing_or_invalid_lifecycle_evidence'};}
}
function publicGate(g){return {ready:g.ready,state:g.state,...(g.ready?{evidenceSha256:g.digest}:{}),hardwareRelease:'unknown',exitStatus:'unknown'};}
module.exports={evaluate,load,publicGate,owned,names};
