const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {hash}=require('./hdmi-picture-io.cjs');
const {id,version,modes}=require('./physical-candidate-contract.cjs');
const root=path.resolve(__dirname,'..');
function bindPackage(build,recordSha256,archive,bytes){
    assert.equal(archive.status,'packaged_checked_local_only');assert.equal(archive.archiveVerified,true);
    assert.equal(archive.appId,id);assert.equal(archive.appVersion,version);assert.equal(archive.reportSchemaVersion,2);
    assert.equal(archive.candidateRecordSha256,recordSha256);assert.equal(archive.binarySha256,build.binarySha256);assert.equal(archive.manifestSha256,build.manifestSha256);
    assert.equal(archive.package,'dist/'+id+'_'+version+'_arm.ipk');assert.equal(hash(bytes),archive.packageSha256);
    return {...build,archiveVerified:true,package:archive.package,packageSha256:archive.packageSha256};
}
function local(mode='lifecycle_validation'){
    assert(modes.includes(mode));const directory=path.join(root,'build/phase-2/physical-candidate-'+version);
    const bytes=fs.readFileSync(path.join(directory,'candidate-validation.json'));let pkg=JSON.parse(bytes);
    const recordSha256=hash(bytes),v=JSON.parse(fs.readFileSync(path.join(directory,'local-validation.json')));
    assert.equal(v.candidateRecordSha256,recordSha256);assert.equal(pkg.appId,id);assert.equal(pkg.appVersion,version);
    assert.equal(pkg.mode,'physical_candidate');assert.equal(pkg.reportSchemaVersion,2);assert.equal(pkg.hostAcceptancePassed,true);assert.equal(pkg.directAbiPassed,true);
    assert.equal(pkg.contextDispatchCorrection,true);assert.equal(pkg.independentTerminationWitness,true);assert.equal(pkg.terminationGateRequired,true);
    assert.equal(pkg.nativeAlarmSeconds,22);assert.equal(pkg.reportCapBytes,2048);assert.equal(pkg.witnessCapBytes,256);
    assert.equal(hash(fs.readFileSync(path.join(root,pkg.binary))),pkg.binarySha256);
    for(const p of pkg.sourcePins)assert.equal(hash(fs.readFileSync(path.join(root,p.file))),p.sha256);
    assert.equal(hash(fs.readFileSync(path.join(root,'native/phase2-hdmi-candidate-'+version+'/appinfo.json'))),pkg.manifestSha256);
    assert.equal(pkg.archiveVerified,false); // Immutable build-time fact.
    const packageRecord=path.join(directory,'package-validation.json');let packageRecordSha256=null;
    if(fs.existsSync(packageRecord)){
        const receipt=fs.readFileSync(packageRecord),archive=JSON.parse(receipt);
        pkg=bindPackage(pkg,recordSha256,archive,fs.readFileSync(path.join(root,'dist/'+id+'_'+version+'_arm.ipk')));
        packageRecordSha256=hash(receipt);
    }
    const utility=JSON.parse(fs.readFileSync(path.join(root,'build/phase-2/hdmi-admin-caller-20261112-001/admin-caller-findings.json'))).sourceFiles.find(p=>p.tvPath==='/usr/bin/luna-send');
    assert.equal(hash(fs.readFileSync(path.join(root,utility.saved))),utility.sha256);
    const baseline=mode==='physical_picture'?require('./check-hdmi-utp-coverage.cjs').loadSnapshot(path.join(root,'build/phase-2/utp-activation-0.1.4-20261114-001/baseline')):undefined;
    return {pkg,recordSha256,packageRecordSha256,mode,utility,baseline};
}
module.exports={local,bindPackage};
