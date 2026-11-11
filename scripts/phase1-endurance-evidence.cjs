const exitCauses={1:'back',2:'exit_key',3:'escape',4:'sdl_quit',5:'window_close',6:'focus_lost',7:'hidden',8:'minimized',9:'sigterm',10:'sigint',11:'deadline'};
const events=new Set(['ready','screensaver_policy','exit_event','app_exit','probe_start','run_start','b_start','overlap_start','sample','packets','loops','released','progress_error','b_unload_begin','b_unload','a_unload','run_end',
    'veto_bus','veto_attach','veto_disconnect_watch','veto_register','veto_registered','veto_request','veto_decision','veto_reply_send','veto_reply','veto_wait_start','veto_wait_end','veto_end','veto_unsubscribe_send','veto_unsubscribe','veto_unsubscribe_cancel','veto_reply_cancel','veto_cancel','veto_handle_close','veto_disconnect',
    'veto_api_error','veto_api_negative','veto_api_positive','veto_service_error','veto_service_negative','veto_service_positive']);
function parseTrace(text) {
    return text.split('\n').filter(Boolean).map(line=>{
        if(!/^\d+,[a-z_]+,\d+,\d+,\d+,\d+,\d+$/.test(line))throw new Error('Unexpected veto probe telemetry');
        const [ms,event,status,a,b,aMs,bMs]=line.split(',');
        if(!events.has(event))throw new Error('Unknown veto probe event');
        if(['exit_event','app_exit'].includes(event)&&!exitCauses[status])throw new Error('Unknown exit cause');
        if(['veto_api_error','veto_service_error'].includes(event)&&+status>6||['veto_api_negative','veto_api_positive','veto_service_negative','veto_service_positive'].includes(event)&&+status>1000001)throw new Error('Invalid redacted API error');
        return {ms:+ms,event,status:+status,a:+a,b:+b,aMs:+aMs,bMs:+bMs};
    });
}
function assess(rows,mode) {
    const first=event=>rows.find(r=>r.event===event),index=event=>rows.findIndex(r=>r.event===event);
    const start=first('overlap_start'),released=first('released'),end=first('run_end');
    const samples=rows.filter(r=>r.event==='sample'&&r.status===2);
    const gaps=samples.slice(1).filter((r,i)=>r.ms-samples[i].ms>2500||r.a<=samples[i].a||r.b<=samples[i].b||r.aMs<=samples[i].aMs||r.bMs<=samples[i].bMs);
    const recovery=rows.filter(r=>r.event==='sample'&&r.status===3);
    const aRecovered=!!(released&&first('a_unload')?.ms-released.ms>=3000&&recovery.length>=2&&recovery.at(-1).a>recovery[0].a&&recovery.at(-1).aMs>recovery[0].aMs);
    const required=['veto_bus','veto_attach','veto_disconnect_watch','veto_register','veto_registered','veto_cancel','veto_handle_close'];
    const registration=first('veto_registered')?.status===0;
    const vetoFailures=rows.filter(r=>(required.includes(r.event)||['veto_reply_send','veto_reply','veto_decision','veto_disconnect'].includes(r.event))&&r.status!==0||r.event==='veto_request'&&r.status!==1);
    const cleanup=!!(first('a_unload')?.status===0&&first('b_unload')?.status===0&&first('veto_cancel')?.status===0&&first('veto_handle_close')?.status===0&&
        index('veto_end')>index('a_unload')&&index('veto_cancel')>index('veto_end')&&index('veto_handle_close')>index('veto_cancel')&&index('run_end')>index('veto_handle_close'));
    const holdThroughRecovery=!!(registration&&first('run_start')&&index('veto_registered')<index('run_start')&&index('veto_end')>index('a_unload')&&index('a_unload')>index('released'));
    const requests=rows.filter(r=>r.event==='veto_request'&&r.status===1),replies=rows.filter(r=>r.event==='veto_reply'&&r.status===0);
    const requestBeforePlayback=!!(replies[0]&&first('run_start')&&replies[0].ms<=first('run_start').ms&&index('veto_reply')<index('run_start'));
    const exits=rows.filter(r=>r.event==='exit_event').map(r=>({ms:r.ms,cause:exitCauses[r.status]}));
    const wait=first('veto_wait_start'),probe=first('probe_start');
    const ordered=rows.every((r,i)=>!i||r.ms>=rows[i-1].ms);
    const waitEnd=first('veto_wait_end');
    const bounded=!!(ordered&&probe&&end&&end.ms-probe.ms<90000&&wait?.status===(mode==='veto'?60:3)&&waitEnd&&waitEnd.ms-wait.ms<=wait.status*1000+100);
    const passed=!!(bounded&&start&&released&&end.status===0&&released.ms-start.ms>=8000&&samples.length>=7&&gaps.length===0&&
        aRecovered&&holdThroughRecovery&&cleanup&&!vetoFailures.length&&!exits.length&&!rows.some(r=>r.event==='progress_error')&&
        required.every(event=>first(event)?.status===0)&&(mode==='smoke'||requests.length>=1&&replies.length>=1&&requestBeforePlayback));
    const inconclusive=mode==='veto'&&bounded&&end?.status===7&&registration&&cleanup&&!vetoFailures.length&&!exits.length&&requests.length===0;
    const reasons=['no_detail','permission_or_privilege','service_unavailable','invalid_argument','disconnected','timeout','other'];
    const apiErrors=rows.filter(r=>r.event==='veto_api_error').map(r=>({ms:r.ms,reason:reasons[r.status]}));
    const apiCodes=rows.filter(r=>['veto_api_negative','veto_api_positive'].includes(r.event)).map(r=>({ms:r.ms,value:r.status===1000001?null:(r.event==='veto_api_negative'?-r.status:r.status),capped:r.status===1000001}));
    const serviceErrors=rows.filter(r=>r.event==='veto_service_error').map(r=>({ms:r.ms,reason:reasons[r.status]}));
    const serviceCodes=rows.filter(r=>['veto_service_negative','veto_service_positive'].includes(r.event)).map(r=>({ms:r.ms,value:r.status===1000001?null:(r.event==='veto_service_negative'?-r.status:r.status),capped:r.status===1000001}));
    return {passed,outcome:passed?'native_checks_passed':inconclusive?'inconclusive_no_request':'failed',mode,apiErrors,apiCodes,serviceErrors,serviceCodes,measuredOverlapMs:start&&released?released.ms-start.ms:null,
        dualSamples:samples.length,badSampleIntervals:gaps.length,aRecovered,registration,holdThroughRecovery,cleanup,bounded,
        requests:requests.length,successfulReplies:replies.length,requestBeforePlayback,appliedVeto:'unknown until attributable service evidence and visual observation',exitEvents:exits,result:end?.status??null};
}
function options(args) {
    const flags=args.filter(a=>a.startsWith('--')),alias=args.filter(a=>!a.startsWith('--'));
    if(flags.length!==1||!['--smoke','--veto'].includes(flags[0])||alias.length>1)
        throw new Error('Use --smoke OR --veto, plus optional SSH profile; both are capped at 90 seconds');
    return {mode:flags[0].slice(2),alias:alias[0]};
}
module.exports={parseTrace,assess,options};
