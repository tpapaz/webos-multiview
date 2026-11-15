// Exclusive current physical candidate. Historical runners/decoders stay frozen.
const id='io.github.tpapaz.multiview.hdmiwindow',version='0.1.12',schemaVersion=2;
const modes=['lifecycle_validation','physical_picture'];
const digest=s=>typeof s==='string'&&/^[0-9a-f]{64}$/.test(s);
function filenames(mode){
    if(!modes.includes(mode))throw Error('candidate mode');
    const stem=mode==='physical_picture'?'picture':'lifecycle';
    return {report:stem+'-'+version+'.jsonl',witness:'termination-'+stem+'-'+version+'.json'};
}
function payload(authority,mode,gate){
    filenames(mode);
    // Reuse the exact original authority validator before changing its action.
    require('./hdmi-picture-io.cjs').commandFor(authority);
    const result={...authority};
    if(mode==='lifecycle_validation'){delete result.acquireHdmi4;result.verifyLifecycle=true;if(gate!==undefined&&gate!==null)throw Error('unexpected lifecycle gate');}
    else{if(!digest(gate))throw Error('termination gate');result.terminationGateEvidenceSha256=gate;}
    return result;
}
function validatePayload(p){
    const mode=p?.verifyLifecycle===true?'lifecycle_validation':p?.acquireHdmi4===true?'physical_picture':null;
    if(!mode||Object.hasOwn(p,'verifyLifecycle')&&Object.hasOwn(p,'acquireHdmi4'))throw Error('candidate action');
    const original={...p};delete original.verifyLifecycle;delete original.terminationGateEvidenceSha256;original.acquireHdmi4=true;
    require('./hdmi-picture-io.cjs').commandFor(original);
    if(mode==='lifecycle_validation'&&Object.hasOwn(p,'terminationGateEvidenceSha256'))throw Error('unexpected lifecycle gate');
    if(mode==='physical_picture'&&!digest(p.terminationGateEvidenceSha256))throw Error('termination gate');
    return mode;
}
function commandFor(p){validatePayload(p);return "/usr/bin/luna-send -n 1 -w 2000 'luna://com.webos.applicationManager/launch' '"+JSON.stringify({id,subscribe:false,params:p})+"'";}
function launchBinding(p){const mode=validatePayload(p);return require('./hdmi-picture-io.cjs').hash(Buffer.from(JSON.stringify({mode,boot:p.launchBootId,boottime:p.launchStartByBoottimeMs,realtime:p.launchStartByRealtimeMs,gate:mode==='physical_picture'?p.terminationGateEvidenceSha256:null})));}
module.exports={id,version,schemaVersion,modes,digest,filenames,payload,validatePayload,commandFor,launchBinding};
