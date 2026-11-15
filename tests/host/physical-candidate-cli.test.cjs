const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process');
const {local,bindPackage}=require('../../scripts/physical-candidate-local.cjs');
const {recordRestoration}=require('../../scripts/run-physical-candidate.cjs');
const {gateBundle}=require('./physical-candidate-fixture.cjs');
const root=path.resolve(__dirname,'../..'),preload=path.join(root,'build/phase-2/setup-dispatch-0.1.11-preparation-20261115-001/no-device-import.cjs');
const destination=path.join(root,'build/phase-2/physical-candidate-0.1.12-preparation-20261115-001/must-not-connect');
const cases=[['--plan'],[],['--allow-one-picture','--owner-hdmi4-ready','--owner-independent-timer-ready',destination],
 ['--allow-one-setup-0.1.11-run','--owner-setup-0.1.11-ready','--owner-independent-timer-ready',destination],
 ['--allow-one-lifecycle-0.1.12-run','--owner-lifecycle-0.1.12-ready'],
 ['--allow-one-lifecycle-0.1.12-run','--owner-lifecycle-0.1.12-ready','--owner-independent-timer-ready',destination],
 ['--allow-one-picture-0.1.12-run','--owner-physical-0.1.12-ready','--owner-independent-timer-ready',destination,'--gate-evidence',destination],
 ['--plan','--gate-evidence',destination]];
for(const [n,args]of cases.entries()){
 const child=spawnSync(process.execPath,['--require',preload,path.join(root,'scripts/run-physical-candidate.cjs'),...args],{cwd:root,encoding:'utf8'});
 assert.equal(child.status,[0,7].includes(n)?0:1);assert(child.stdout.includes('FORBIDDEN_IMPORTS:0'));assert(!child.stdout.includes('ONE_SUBMISSION_INTENT'));assert(!fs.existsSync(destination));
 if(n===0){assert(child.stdout.includes('"packaged":false'));assert(child.stdout.includes('"ready":false'));}
}
const reference=local(),original=fs.readFileSync;
const bytes=Buffer.from('synthetic archive bytes'),packageRecord={status:'packaged_checked_local_only',archiveVerified:true,appId:reference.pkg.appId,appVersion:'0.1.12',reportSchemaVersion:2,candidateRecordSha256:reference.recordSha256,binarySha256:reference.pkg.binarySha256,manifestSha256:reference.pkg.manifestSha256,package:'dist/'+reference.pkg.appId+'_0.1.12_arm.ipk',packageSha256:require('../../scripts/hdmi-picture-io.cjs').hash(bytes)};
assert.equal(bindPackage(reference.pkg,reference.recordSha256,packageRecord,bytes).archiveVerified,true);assert.equal(reference.pkg.archiveVerified,false);
for(const change of [{candidateRecordSha256:'wrong'},{binarySha256:'wrong'},{manifestSha256:'wrong'},{appVersion:'0.1.11'},{archiveVerified:false},{packageSha256:'wrong'}])assert.throws(()=>bindPackage(reference.pkg,reference.recordSha256,{...packageRecord,...change},bytes));
for(const name of [reference.pkg.binary,'native/phase2-hdmi-candidate-0.1.12/appinfo.json','scripts/physical-candidate-gate.cjs','scripts/physical-candidate-runner.cjs','scripts/physical-candidate-witness.cjs','native/phase2-context-dispatch/dispatcher.h']){
 fs.readFileSync=function(file,...args){return path.resolve(file)===path.resolve(root,name)?Buffer.from('synthetic changed source'):original.call(this,file,...args);};
 try{assert.throws(local);}finally{fs.readFileSync=original;}
}
const ownerDir=fs.mkdtempSync(path.join(root,'build/phase-2/physical-candidate-0.1.12-preparation-20261115-001/owner-confirmation-'));
fs.writeFileSync(path.join(ownerDir,'capture.json'),gateBundle().bundle['capture.json']);assert.throws(()=>recordRestoration(ownerDir,false));recordRestoration(ownerDir,true);
const receipt=JSON.parse(fs.readFileSync(path.join(ownerDir,'owner-restoration.json')));assert.equal(receipt.appVersion,'0.1.12');assert.equal(receipt.ownerConfirmed,true);assert.equal(receipt.captureSha256,require('../../scripts/hdmi-picture-io.cjs').hash(fs.readFileSync(path.join(ownerDir,'capture.json'))));
console.log('Eight CLI scope/plan cases and six pin-tamper refusals passed with zero device imports; separate post-run owner confirmation stays capture-bound');
