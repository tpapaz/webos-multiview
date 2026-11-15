// Packaged-state acceptance only: never exercise a live lifecycle invocation.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process');
const {local}=require('../../scripts/physical-candidate-local.cjs');
const {hash}=require('../../scripts/hdmi-picture-io.cjs');
const root=path.resolve(__dirname,'../..'),slot='build/phase-2/physical-candidate-0.1.12-packaging-20261115-001/';
const references=local();assert.equal(references.pkg.appVersion,'0.1.12');assert.equal(references.pkg.archiveVerified,true);
const folder=path.join(root,'build/phase-2/physical-candidate-0.1.12'),buildBytes=fs.readFileSync(path.join(folder,'candidate-validation.json'));
assert.equal(JSON.parse(buildBytes).archiveVerified,false);assert.equal(hash(buildBytes),references.recordSha256);
const receiptPath=path.join(folder,'package-validation.json'),receiptBytes=fs.readFileSync(receiptPath),receipt=JSON.parse(receiptBytes);
assert.equal(receipt.candidateRecordSha256,references.recordSha256);assert.equal(receipt.packageSha256,hash(fs.readFileSync(path.join(root,receipt.package))));
assert.equal(references.packageRecordSha256,hash(receiptBytes));assert.equal(receipt.packagesCreated,1);assert.equal(receipt.offlineNetworkAttempts,0);
const untouched=JSON.parse(fs.readFileSync(path.join(root,slot,'preservation-pins.json')));for(const p of untouched)assert.equal(hash(fs.readFileSync(path.join(root,p.file))),p.sha256);
const destination=path.join(root,slot,'must-not-connect'),preload=path.join(root,'build/phase-2/setup-dispatch-0.1.11-preparation-20261115-001/no-device-import.cjs');
const cases=[['--plan'],['--plan','--gate-evidence',destination],
 ['--plan','--gate-evidence',path.join(root,'build/reports/setup-0.1.11-20261115-001')],
 ['--allow-one-picture-0.1.12-run','--owner-physical-0.1.12-ready','--owner-independent-timer-ready',destination,'--gate-evidence',destination],
 ['--allow-one-lifecycle-0.1.12-run','--owner-lifecycle-0.1.12-ready'],
 ['--allow-one-picture','--owner-hdmi4-ready','--owner-independent-timer-ready',destination]];
for(const [n,args]of cases.entries()){
 const r=spawnSync(process.execPath,['--require',preload,path.join(root,'scripts/run-physical-candidate.cjs'),...args],{cwd:root,encoding:'utf8'});
 assert.equal(r.status,n<3?0:1);assert(r.stdout.includes('FORBIDDEN_IMPORTS:0'));assert(!r.stdout.includes('ONE_SUBMISSION_INTENT'));assert(!fs.existsSync(destination));
 if(n<3){const line=r.stdout.split(/\r?\n/).find(x=>x.startsWith('{'));const result=JSON.parse(line);assert.equal(result.packaged,true);assert.equal(result.acquisitionGate.ready,false);assert.equal(result.TVConnections,0);}
}
const read=fs.readFileSync;let refusals=0;
for(const change of [{candidateRecordSha256:'wrong'},{binarySha256:'wrong'},{manifestSha256:'wrong'},{appVersion:'0.1.11'},{reportSchemaVersion:1},{archiveVerified:false},{packageSha256:'wrong'}]){
 fs.readFileSync=function(file,...args){return path.resolve(file)===receiptPath?Buffer.from(JSON.stringify({...receipt,...change})):read.call(this,file,...args);};
 try{assert.throws(local);refusals++;}finally{fs.readFileSync=read;}
}
fs.readFileSync=function(file,...args){return path.resolve(file)===path.resolve(root,receipt.package)?Buffer.from('synthetic tampered archive'):read.call(this,file,...args);};
try{assert.throws(local);refusals++;}finally{fs.readFileSync=read;}
const result={status:'passed_packaged_local_bindings_gate_closed',appVersion:'0.1.12',archiveVerified:true,gateReady:false,
 cliCases:cases.length,tamperRefusals:refusals,deviceImports:0,TVConnections:0,TVLaunches:0,liveLifecycleInvoked:false,immutableBuildRecordPreserved:true};
fs.writeFileSync(path.join(root,slot,'packaged-runner-validation.json'),JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(result));
