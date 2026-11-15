const {version,modes,digest}=require('./physical-candidate-contract.cjs');
const {classifyTermination}=require('./hdmi-termination-evidence.cjs');
function classifyWitness(bytes,mode,binding,correlation={}){
    const unknown=state=>({state,exitStatus:'unknown',signal:'unknown',alarmFired:'unknown',hardwareRelease:'unknown',basis:'unproven'});
    if(!Buffer.isBuffer(bytes)||bytes.length>256||!modes.includes(mode)||!digest(binding))return unknown('invalid');
    if(!bytes.length)return unknown('empty');
    const lines=bytes.toString('utf8').split('\n');if(lines.length<2)return unknown('partial');
    let header;try{header=JSON.parse(lines[0]);}catch{return unknown('invalid');}
    if(JSON.stringify(header)!==JSON.stringify([2,version,mode==='physical_picture'?1:0,binding]))return unknown('invalid');
    if(lines.length<3)return unknown('partial');
    return classifyTermination(Buffer.from(lines.slice(1).join('\n')),correlation);
}
module.exports={classifyWitness};
