const assert=require('node:assert/strict');
const {trace}=require('./physical-candidate-fixture.cjs');
const {classify}=require('../../scripts/physical-candidate-report.cjs');
const {payload,validatePayload}=require('../../scripts/physical-candidate-contract.cjs');
const {launchBinding}=require('../../scripts/physical-candidate-contract.cjs');
const {witness,marker}=require('./physical-candidate-fixture.cjs');
const {classifyWitness}=require('../../scripts/physical-candidate-witness.cjs');
const authority={acquireHdmi4:true,launchBootId:'00000000-0000-0000-0000-000000000001',launchStartByBoottimeMs:103000,launchStartByRealtimeMs:1700000003000};
for(const mode of ['lifecycle_validation','physical_picture']){
    const bytes=trace(mode,mode==='physical_picture'?'a'.repeat(64):null);assert.equal(classify(bytes).state,'valid');
    for(let n=0;n<bytes.length;++n){const r=classify(bytes.subarray(0,n));assert(['empty','partial'].includes(r.state),n+': '+r.state);assert.equal(r.setupReady,null);assert.equal(r.localCleanup,null);}
    for(const [before,after]of [['0.1.12','0.1.11'],['"schemaVersion":2','"schemaVersion":1'],['[92,0]','[92,0]\n[92,0]'],['[1,1,11','[1,2,11']])assert.equal(classify(Buffer.from(bytes.toString().replace(before,after))).state,'invalid');
    assert.equal(classify(bytes).actualExit,'unknown');assert.equal(classify(bytes).hardwareRelease,'unknown');
}
const life=payload(authority,'lifecycle_validation',null);assert.equal(validatePayload(life),'lifecycle_validation');assert(!Object.hasOwn(life,'acquireHdmi4'));
assert.equal(validatePayload(payload(authority,'physical_picture','a'.repeat(64))),'physical_picture');
for(const bad of [authority,{...life,acquireHdmi4:true},{...life,terminationGateEvidenceSha256:'a'.repeat(64)},{...authority,terminationGateEvidenceSha256:'A'.repeat(64)}])assert.throws(()=>validatePayload(bad));
const lifeBytes=trace();const illegal=lifeBytes.toString().replace('[7,0,70,170]','[2,0,70,170]');assert.equal(classify(Buffer.from(illegal)).state,'invalid');
assert.equal(classify(Buffer.alloc(2049)).state,'invalid');
const correlation={freshSlot:true,exactArtifact:true,ownedMetadata:true},binding=launchBinding(life);
assert.equal(classifyWitness(witness,'lifecycle_validation',binding,correlation).state,'observed_terminated');
for(let n=0;n<witness.length;++n)assert.notEqual(classifyWitness(witness.subarray(0,n),'lifecycle_validation',binding,correlation).state,'observed_terminated');
for(const bad of [marker,Buffer.from(witness.toString().replace('0.1.12','0.1.11')),Buffer.alloc(257)])assert.notEqual(classifyWitness(bad,'lifecycle_validation',binding,correlation).state,'observed_terminated');
assert.equal(classifyWitness(witness,'physical_picture',binding,correlation).state,'invalid');
assert.equal(classifyWitness(witness,'lifecycle_validation','0'.repeat(64),correlation).state,'invalid');
assert.equal(classifyWitness(witness,'lifecycle_validation',binding,{...correlation,freshSlot:false}).state,'uncorrelated');
console.log('0.1.12 exclusive schema/action, ordered stages, partial uncertainty, no-UTP lifecycle and explicit digest requirements passed');
