const events=new Set(['ready','run_start','b_start','overlap_start','sample','packets','loops','released','progress_error','b_unload_begin','b_unload','a_unload','run_end']);
function parseTrace(text) {
    return text.split('\n').filter(Boolean).map(line=>{
        if(!/^\d+,[a-z_]+,\d+,\d+,\d+,\d+,\d+$/.test(line)) throw new Error('Unexpected endurance telemetry');
        const [ms,event,status,a,b,aMs,bMs]=line.split(',');
        if(!events.has(event)) throw new Error('Unknown endurance event');
        return {ms:+ms,event,status:+status,a:+a,b:+b,aMs:+aMs,bMs:+bMs};
    });
}
function assess(rows,seconds) {
    const start=rows.find(r=>r.event==='overlap_start');
    const released=rows.find(r=>r.event==='released');
    const end=rows.find(r=>r.event==='run_end');
    const samples=rows.filter(r=>r.event==='sample'&&r.status===2);
    const cleanup=rows.filter(r=>['a_unload','b_unload'].includes(r.event));
    const gaps=samples.slice(1).filter((r,i)=>r.ms-samples[i].ms>2500||r.a<=samples[i].a||r.b<=samples[i].b||r.aMs<=samples[i].aMs||r.bMs<=samples[i].bMs);
    const loops=rows.findLast(r=>r.event==='loops');
    const recovery=rows.filter(r=>r.event==='sample'&&r.status===3);
    const aRecovered=recovery.length>=2&&recovery.at(-1).a>recovery[0].a&&recovery.at(-1).aMs>recovery[0].aMs;
    const passed=!!(start&&released&&end&&end.status===0&&cleanup.length===2&&cleanup.every(r=>r.status===0)&&
        released.ms-start.ms>=seconds*1000&&samples.length>=Math.floor(seconds*0.9)&&gaps.length===0&&
        aRecovered&&!rows.some(r=>r.event==='progress_error')&&(seconds<300||(loops?.a>=1&&loops?.b>=1)));
    return {passed,requestedOverlapSeconds:seconds,measuredOverlapMs:start&&released?released.ms-start.ms:null,
        dualSamples:samples.length,badSampleIntervals:gaps.length,loopsA:loops?.a||0,loopsB:loops?.b||0,
        aRecovered,result:end?.status??null};
}
function options(args) {
    const repeat=args.includes('--repeat'),minutesAt=args.indexOf('--minutes'),cyclesAt=args.indexOf('--cycles');
    const minutes=minutesAt>=0?Number(args[minutesAt+1]):0;
    const cycles=repeat?(cyclesAt>=0?Number(args[cyclesAt+1]):20):1;
    const consumed=new Set(['--repeat','--minutes','--cycles']);
    const alias=args.filter((a,i)=>!consumed.has(a)&&!(minutesAt>=0&&i===minutesAt+1)&&!(cyclesAt>=0&&i===cyclesAt+1));
    if(repeat===(minutesAt>=0)||(!repeat&&cyclesAt>=0)||!Number.isInteger(cycles)||cycles<1||cycles>20||(!repeat&&![5,30].includes(minutes))||alias.length>1||alias.some(a=>a.startsWith('--')))
        throw new Error('Use --repeat [--cycles 1..20] OR --minutes 5|30, plus optional SSH profile');
    return {repeat,minutes,cycles,alias:alias[0]};
}
module.exports={parseTrace,assess,options};
