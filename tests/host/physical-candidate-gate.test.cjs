const assert=require('node:assert/strict');
const {gateBundle,trace}=require('./physical-candidate-fixture.cjs');
const {evaluate,publicGate}=require('../../scripts/physical-candidate-gate.cjs');
const {hash}=require('../../scripts/hdmi-picture-io.cjs');
let f=gateBundle();const gate=evaluate(f.bundle,f.references);assert(gate.ready);assert.equal(gate.digest.length,64);assert(!JSON.stringify(publicGate(gate)).includes(gate.bootId));
const mutations=[c=>c.appVersion='0.1.11',c=>c.candidateRecordSha256='changed',c=>c.status='collected_late',c=>c.mode='physical_picture',
    c=>c.acknowledgment='unknown',c=>c.attempts=2,c=>c.utilitySignalPresent=true,c=>c.connections[0].closed=false,c=>c.connections[1].elapsedMs=30000,
    c=>c.connections[1].name='submission',c=>c.connections[1].startedMs=c.dispatchMs+26999,c=>c.preflight.queries.push({query:'unexpected'}),
    c=>c.preflight.reports.pop(),c=>c.preflight.reports[0].state='present',c=>c.preflight.processBefore='unknown',c=>c.installedAfter.executable.hashMatches=false,
    c=>c.preflight.bindings.appinfo.sha256='wrong',c=>c.processAfter='present',c=>c.reports[0].metadata.mode=0o644,c=>c.terminationReports[1].metadata.uid=17];
for(const mutate of mutations){f=gateBundle();mutate(f.c);f.bundle['capture.json']=Buffer.from(JSON.stringify(f.c));
    const owner=JSON.parse(f.bundle['owner-restoration.json']);owner.captureSha256=hash(f.bundle['capture.json']);f.bundle['owner-restoration.json']=Buffer.from(JSON.stringify(owner));assert.throws(()=>evaluate(f.bundle,f.references));}
for(const key of Object.keys(f.bundle)){f=gateBundle();delete f.bundle[key];assert.throws(()=>evaluate(f.bundle,f.references));}
for(const field of ['picture','sound','remote','ownerConfirmed']){f=gateBundle();const owner=JSON.parse(f.bundle['owner-restoration.json']);owner[field]=false;f.bundle['owner-restoration.json']=Buffer.from(JSON.stringify(owner));assert.throws(()=>evaluate(f.bundle,f.references));}
for(const key of ['report-host.jsonl','report-jail.jsonl','witness-host.json','witness-jail.json','launch.json','stages.jsonl']){f=gateBundle();f.bundle[key]=Buffer.from('partial');assert.throws(()=>evaluate(f.bundle,f.references));}
f=gateBundle();f.references.pkg.archiveVerified=false;assert.throws(()=>evaluate(f.bundle,f.references));
f=gateBundle();const bad=trace().toString().replace('[7,1,71,171,1]','[7,1,71,25001,1]');f.bundle['report-host.jsonl']=f.bundle['report-jail.jsonl']=Buffer.from(bad);for(const report of f.c.reports){report.sha256=hash(Buffer.from(bad));report.metadata.size=Buffer.byteLength(bad);}f.bundle['capture.json']=Buffer.from(JSON.stringify(f.c));assert.throws(()=>evaluate(f.bundle,f.references));
console.log('Acquisition gate: exact artifact/boot authority, complete raw aliases, witness, scheduled bounds and separate owner restoration; missing/stale/partial/conflicting evidence fails closed');
