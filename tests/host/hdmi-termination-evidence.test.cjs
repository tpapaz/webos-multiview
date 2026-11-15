const assert=require('node:assert/strict');
const {classifyTermination}=require('../../scripts/hdmi-termination-evidence.cjs');
const bytes=Buffer.from(JSON.stringify({schemaVersion:1,kind:'own_parent_termination',state:'observed',exitStatus:'unknown',hardwareRelease:'unknown'})+'\n');
const proof={freshSlot:true,exactArtifact:true,ownedMetadata:true};
assert.equal(classifyTermination(bytes,proof).state,'observed_terminated');
for(const key of Object.keys(proof))assert.equal(classifyTermination(bytes,{...proof,[key]:false}).state,'uncorrelated');
assert.equal(classifyTermination(Buffer.alloc(0),proof).state,'empty');
for(let n=1;n<bytes.length;++n)assert.notEqual(classifyTermination(bytes.subarray(0,n),proof).state,'observed_terminated');
for(const extra of [{exitStatus:0},{hardwareRelease:'verified'},{parentPid:42},{state:'intent'}]){
 const obj={...JSON.parse(bytes),...extra};assert.equal(classifyTermination(Buffer.from(JSON.stringify(obj)+'\n'),proof).state,'invalid');
}
for(const source of [undefined,'text',Buffer.alloc(257)])assert.equal(classifyTermination(source,proof).state,'invalid');
const result=classifyTermination(bytes,proof);assert.equal(result.exitStatus,'unknown');assert.equal(result.signal,'unknown');assert.equal(result.alarmFired,'unknown');assert.equal(result.hardwareRelease,'unknown');
console.log('Independent termination evidence: fresh/exact/owned correlation, partial prefixes, privacy and exit-status/release uncertainty passed');
