// Composes the frozen one-shot controller; no device/profile import on load.
const assert=require('node:assert/strict');
const {run}=require('./hdmi-picture-controller.cjs');
const {openIo,hash,fault}=require('./hdmi-picture-io.cjs');
const {id,version,filenames,payload,commandFor,launchBinding}=require('./physical-candidate-contract.cjs');
const {verifyConnection}=require('./physical-candidate-preflight.cjs');
const {classify}=require('./physical-candidate-report.cjs');
const {classifyWitness}=require('./physical-candidate-witness.cjs');
const {owned,publicGate}=require('./physical-candidate-gate.cjs');
function cappedWitnessClient(client,filename){
    const aliases=['/tmp/'+id+'/'+filename,'/var/palm/jail/'+id+'/tmp/'+id+'/'+filename];
    return {sftp:cb=>client.sftp((error,sftp)=>cb(error,error?sftp:new Proxy(sftp,{get(target,key){
        if(key==='lstat')return (name,done)=>target.lstat(name,(e,a)=>done(!e&&aliases.includes(name)&&a.size>256?fault('BOUND'):e,a));
        const value=target[key];return typeof value==='function'?value.bind(target):value;
    }})))};
}
async function runCandidate(options){
    const {references,mode=references.mode,gate={ready:false,state:'not_required_lifecycle'},saveRaw=()=>{},
        ioFactory=openIo,verify=verifyConnection,...rest}=options;
    const names=filenames(mode);assert.equal(references.pkg.appVersion,version);assert.equal(references.pkg.archiveVerified,true);
    if(mode==='physical_picture')assert.equal(gate.ready,true,'independent termination/restoration gate closed');
    assert.equal(references.mode,mode);
    let actualPayload=null,terminationReports=[];
    const savePrivate=(name,value)=>{
        if(name==='launch.json'){
            if(mode==='physical_picture'&&value.launchBootId!==gate.bootId)throw fault('BOUND');
            actualPayload=payload(value,mode,mode==='physical_picture'?gate.digest:null);rest.savePrivate(name,actualPayload);
        }else rest.savePrivate(name,value);
    };
    const open=async(client,stage,check)=>{
        const rawApp=new Map(),rawWitness=new Map();
        const io=await ioFactory(client,stage,check,{reportFilename:names.report,classifyReport:bytes=>{
            rawApp.set(hash(bytes),Buffer.from(bytes));const result=classify(bytes);
            if(result.mode&&result.mode!==mode||mode==='physical_picture'&&result.mode&&result.gateEvidenceSha256!==gate.digest)result.state='invalid';
            if(result.mode&&result.launchBindingSha256!==launchBinding(actualPayload))result.state='invalid';
            return result;
        }});
        return {...io,
            exec:(command,limits)=>io.exec(typeof command==='function'?()=>{command();assert(actualPayload);return commandFor(actualPayload);}:command,limits),
            reports:async target=>{
                await io.reports(target);
                const witness=await ioFactory(cappedWitnessClient(client,names.witness),stage,check,{reportFilename:names.witness,classifyReport:bytes=>{
                    if(bytes.length<=256)rawWitness.set(hash(bytes),Buffer.from(bytes));return classifyWitness(bytes,mode,launchBinding(actualPayload));
                }});
                terminationReports=[];await witness.reports(terminationReports);
                for(let n=0;n<2;++n){
                    const a=target[n],w=terminationReports[n],app=a?.sha256&&rawApp.get(a.sha256),term=w?.sha256&&rawWitness.get(w.sha256);
                    const alias=n?'jail':'host';if(app)saveRaw('report-'+alias+'.jsonl',app);
                    if(term){
                        const metadata=app&&owned(a,app)&&owned(w,term)&&a.metadata.uid===w.metadata.uid&&a.metadata.gid===w.metadata.gid;
                        Object.assign(w,classifyWitness(term,mode,launchBinding(actualPayload),{freshSlot:true,exactArtifact:true,ownedMetadata:!!metadata}));
                        saveRaw('witness-'+alias+'.json',term);
                    }
                }
            }
        };
    };
    const persist=r=>{
        r.reportSchemaVersion=2;r.candidateRecordSha256=references.recordSha256;r.packageRecordSha256=references.packageRecordSha256;r.packageSha256=references.pkg.packageSha256;
        r.terminationReports=terminationReports;
        r.terminationGate=mode==='physical_picture'?publicGate(gate):{ready:false,state:'not_required_for_lifecycle_validation'};
        if(mode==='lifecycle_validation')r.livePicture='not_applicable_lifecycle_validation';
        r.processTermination=terminationReports.length===2&&terminationReports.every(x=>x.state==='observed_terminated')&&terminationReports[0].sha256===terminationReports[1].sha256?
            'independently_observed':'unknown';
        r.actualExit='unknown';r.hardwareRelease='unknown';rest.persist(r);
    };
    return run({...rest,references,mode,appVersion:version,open,verify,savePrivate,persist});
}
module.exports={runCandidate,cappedWitnessClient};
