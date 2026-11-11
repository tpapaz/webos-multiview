const events = new Set(['ready','solo_start','run_start','sample','packets','step_begin','step_end','step_error','b_unload_begin','b_unload','a_unload','run_end']);
function parseTrace(text) {
    return text.split('\n').filter(Boolean).map(line => {
        if (!/^\d+,[a-z_]+,\d+,\d+,\d+,\d+,\d+$/.test(line)) throw new Error('Unexpected sink telemetry');
        const [ms,event,status,a,b,aMs,bMs] = line.split(',');
        if (!events.has(event)) throw new Error('Unknown sink event');
        return {ms:+ms,event,status:+status,a:+a,b:+b,aMs:+aMs,bMs:+bMs};
    });
}
function advancing(rows, label, stage, duration = 1000) {
    const samples = rows.filter(r => r.event === 'sample' && r.status === stage);
    return samples.some((end, i) => samples.slice(0,i).some(start => start[label] > 0 &&
        end.ms - start.ms >= duration && end[label] > start[label] && end[label+'Ms'] > start[label+'Ms']));
}
function measurement(rows, stage, duration = 2000) {
    const start = rows.find(r => r.event === 'step_end' && r.status === stage);
    const end = start && rows.find(r => r.event === 'sample' && r.status === stage && r.ms >= start.ms + duration);
    return end ? {stage,startMs:start.ms,endMs:end.ms,a:end.a-start.a,b:end.b-start.b,
        aPtsMs:end.aMs-start.aMs,bPtsMs:end.bMs-start.bMs} : null;
}
function requireAProgress(m) {
    if (!m || m.a <= 0 || m.aPtsMs <= 0) throw new Error('A stopped advancing; release B before further stages');
}
module.exports = {parseTrace, advancing, measurement, requireAProgress};
