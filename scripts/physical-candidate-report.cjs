const {id,version,modes,digest}=require('./physical-candidate-contract.cjs');
const stages=['witness_start','setup_and_window_id','open','select','observe','stop','close','local_cleanup'];
const statusNames=['opt_in_required','setup_failed','open_failed','select_failed','cancelled','candidate_interval_completed','cleanup_failed'];
const bounded=n=>Number.isInteger(n)&&n>=-2&&n<=25001;
function classify(bytes){
    const events=[],outcomes=new Map();let header=null,pending=null,last=-1,persistence=null,summary=null;
    const result=state=>({state,mode:header?.mode||null,gateEvidenceSha256:header?.gateEvidenceSha256??null,launchBindingSha256:header?.launchBindingSha256??null,events,
        pendingStage:pending===null?null:stages[pending],setupReady:summary?!!summary[2]:null,
        status:summary?(header.mode==='lifecycle_validation'&&summary[1]===5?'lifecycle_completed':statusNames[summary[1]]):null,
        opened:summary?!!summary[3]:null,selected:summary?!!summary[4]:null,stopAcknowledged:summary?!!summary[5]:null,
        closeAcknowledged:summary?!!summary[6]:null,acquisitionUncertain:summary?!!summary[7]:null,
        localCleanup:summary?!!summary[8]:null,ownerRetained:summary?!!summary[9]:null,exitIntent:summary?summary[10]:null,
        witnessArmed:outcomes.has(0)?outcomes.get(0)===1:null,persistenceMs:persistence,
        actualExit:'unknown',hardwareRelease:'unknown',alarmFired:'unknown',livePicture:'unknown',dualHdmi:'unknown'});
    if(!Buffer.isBuffer(bytes)||bytes.length>2048)return result('invalid');if(!bytes.length)return result('empty');
    const lines=bytes.toString('utf8').split('\n'),tail=lines.pop();if(!lines.length)return result('partial');
    try{header=JSON.parse(lines.shift());}catch{return result('invalid');}
    if(!header||!modes.includes(header.mode)||!digest(header.launchBindingSha256)||(header.mode==='lifecycle_validation'?header.gateEvidenceSha256!==null:!digest(header.gateEvidenceSha256))||
        JSON.stringify(header)!==JSON.stringify({schemaVersion:2,appId:id,appVersion:version,mode:header.mode,gateEvidenceSha256:header.gateEvidenceSha256,launchBindingSha256:header.launchBindingSha256}))return result('invalid');
    const enter=s=>{
        if(summary||persistence!==null||pending!==null||s<=last)return false;
        if(s===0)return last===-1;
        if(outcomes.get(0)!==1)return false;
        if(s===1)return last===0;
        if(s===7)return outcomes.has(1)&&(last<5||last===6);
        if(header.mode!=='physical_picture'||outcomes.get(1)!==1)return false;
        if(s===2)return last===1;if(s===3)return last===2&&outcomes.get(2)===1;
        if(s===4)return last===3&&outcomes.get(3)===1;
        if(s===5)return last>=2&&last<=4&&outcomes.get(2)===1;
        return s===6&&last===5;
    };
    for(const line of lines){
        let row;try{row=JSON.parse(line);}catch{return result('invalid');}
        if(summary||!Array.isArray(row)||!row.every(Number.isInteger))return result('invalid');
        const [stage,outcome]=row;
        if(stage===92){if(row.length!==2||pending!==null||persistence!==null||!bounded(outcome)||outcome===-2)return result('invalid');persistence=outcome;continue;}
        if(stage===90){
            if(row.length!==11||pending!==null||persistence===null||row[1]<1||row[1]>6||!row.slice(2,10).every(x=>x===0||x===1))return result('invalid');
            const [,status,ready,opened,selected,stop,close,uncertain,clean,owner,intent]=row;
            if(ready!==(outcomes.get(1)===1?1:0)||(!outcomes.has(7)&&!(last===0&&outcomes.get(0)===2))||
                outcomes.has(7)&&clean!==(outcomes.get(7)===1?1:0)||owner&&clean||intent!==(owner?75:status===5&&clean?0:1))return result('invalid');
            if(selected&&!opened||opened&&!uncertain||(stop||close)&&!uncertain||stop&&outcomes.get(5)!==1||close&&outcomes.get(6)!==1)return result('invalid');
            if(opened&&outcomes.get(2)!==1||selected&&outcomes.get(3)!==1)return result('invalid');
            if(header.mode==='lifecycle_validation'){
                if([opened,selected,stop,close,uncertain].some(Boolean)||![1,5,6].includes(status))return result('invalid');
                if(status===5&&(!ready||!clean||owner)||status===1&&ready||status===6&&clean)return result('invalid');
            }else{
                if(uncertain!==(outcomes.has(2)&&outcomes.get(2)!==2?1:0))return result('invalid');
                if(status===1&&(ready||opened||selected||uncertain||stop||close)||status===2&&(!outcomes.has(2)||opened||selected)||
                    status===3&&(!opened||selected||!outcomes.has(3))||status===4&&!ready)return result('invalid');
                if([5,6].includes(status)&&(!opened||!selected||outcomes.get(4)!==1))return result('invalid');
                if(status===5&&(!stop||!close||!clean)||status===6&&stop&&close&&clean)return result('invalid');
                if(opened&&(!outcomes.has(5)||!outcomes.has(6))||uncertain&&(!outcomes.has(2)||outcomes.get(2)===2))return result('invalid');
            }
            summary=row;continue;
        }
        if(stage<0||stage>7||persistence!==null||![0,1,2,3].includes(outcome)||
            row.length!==(outcome===0?4:5)||!row.slice(2).every(bounded)||outcome===3&&![2,3,5,6].includes(stage))return result('invalid');
        if(outcome===0){if(!enter(stage))return result('invalid');pending=stage;}
        else{if(pending!==stage)return result('invalid');pending=null;last=stage;outcomes.set(stage,outcome);}
        events.push({stage:stages[stage],outcome:outcome===0?'entered':[2,3,5,6].includes(stage)?['','reply_returned','not_sent','uncertain'][outcome]:outcome===1?'returned_success':'returned_failure',
            monotonicMs:row[2],issueAgeMs:row[3],...(outcome===0?{}:{callMs:row[4]})});
    }
    return result(summary&&!tail?'valid':'partial');
}
module.exports={classify,stages,statusNames};
