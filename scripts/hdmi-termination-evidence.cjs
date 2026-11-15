// Independent witness evidence is separate from app exit intent and hardware release.
const expected={schemaVersion:1,kind:'own_parent_termination',state:'observed',exitStatus:'unknown',hardwareRelease:'unknown'};
function classifyTermination(bytes,correlation={}){
    const result=state=>({state,exitStatus:'unknown',signal:'unknown',alarmFired:'unknown',hardwareRelease:'unknown',
        basis:state==='observed_terminated'?'parent_death_signal_reparent_and_proc_absence':'unproven'});
    if(!Buffer.isBuffer(bytes)||bytes.length>256)return result('invalid');
    if(!bytes.length)return result('empty');
    if(bytes.at(-1)!==10)return result('partial');
    let record;try{record=JSON.parse(bytes.toString('utf8'));}catch{return result('invalid');}
    if(JSON.stringify(record)!==JSON.stringify(expected))return result('invalid');
    return result(correlation.freshSlot===true&&correlation.exactArtifact===true&&correlation.ownedMetadata===true?
        'observed_terminated':'uncorrelated');
}
module.exports={classifyTermination};
