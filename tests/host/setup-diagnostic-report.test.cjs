const assert = require('node:assert/strict');
const {classify, stages} = require('../../scripts/setup-diagnostic-report.cjs');
const header={schemaVersion:1,appId:'io.github.tpapaz.multiview.hdmiwindow',appVersion:'0.1.8',mode:'setup_only'};
const bytes=rows=>Buffer.from([header,...rows].map(JSON.stringify).join('\n')+'\n');
const prefix=[];for(let i=0;i<27;i++)prefix.push([i,0],[i,1]);
let r=classify(bytes([...prefix,[99,1,1],[100,0]]));assert.equal(r.state,'valid');assert.equal(r.actualExit,'unknown');
for(let n=0;n<27;n++){
 if([1,2,3,4,6].includes(n))continue;
 const rows=prefix.slice(0,n*2).concat([[n,0],[n,2],[99,0,1],[100,1]]);
 r=classify(bytes(rows));assert.equal(r.state,'valid');assert.equal(r.failedStage,stages[n]);
}
r=classify(bytes(prefix.slice(0,20).concat([[90,3840,2160,3840,2160,0,0,4],[10,0],[10,2],[99,0,1],[100,1]])));
assert.equal(r.state,'valid');assert.equal(r.dimensions[0].windowWidth,3840);assert.equal(r.failedStage,'dimensions_match_1920x1080');
r=classify(bytes(prefix.slice(0,40).concat([[20,0],[20,2],[90,1920,1080,1920,1080,0,0,4],[99,0,1],[100,1]])));
assert.equal(r.failedStage,'focus_wait');assert.equal(r.dimensions[0].cancelReason,'hidden');
r=classify(bytes([[0,0]]));assert.equal(r.state,'partial');assert.equal(r.pendingStage,'lease_recheck');
assert.equal(classify(bytes([[0,0],[0,1],[1,0],[1,3],[2,0]])).state,'partial');
for(const rows of [[[34,0]],[[0,1]],[[0,0],[0,3]],[[99,1,1],[100,0]],[[0,0],['PRIVATE','secret']]]){
 const invalid=classify(bytes(rows));assert.equal(invalid.state,'invalid');assert(!JSON.stringify(invalid).includes('secret'));
}
assert.equal(classify(Buffer.alloc(2049)).state,'invalid');assert.equal(classify(Buffer.alloc(0)).state,'empty');
console.log('Setup trace stage/sequence, dimensions, partial progress, privacy and exit-intent acceptance passed; no TV access');
