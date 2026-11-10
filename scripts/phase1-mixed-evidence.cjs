const events = new Set(['ready', 'run_start', 'init_begin', 'init', 'foreground_begin', 'foreground',
    'load_begin', 'load', 'area_begin', 'area', 'feed_begin', 'feed', 'step_end', 'sample',
    'release_begin', 'unload_begin', 'unload', 'quit_begin', 'quit', 'a_closed', 'run_end',
    'feed_status', 'feed_complete', 'ndl_events']);
function parseTrace(text) {
    return text.split('\n').filter(Boolean).map(line => {
        if (!/^\d+,[a-z_]+,-?\d+,\d+,\d+,\d+,\d+$/.test(line)) throw new Error('Unexpected mixed telemetry');
        const [ms, event, status, a, b, c, d] = line.split(',');
        if (!events.has(event)) throw new Error('Unknown mixed event');
        if (event === 'ndl_events') return {ms: +ms, event, stage: +status, loads: +a, playing: +b, error: +c, events: +d};
        return {ms: +ms, event, status: +status, aFrames: +a, aMs: +b, packets: +c, bFrames: +d};
    });
}
function advancingBaseline(rows) {
    const samples = rows.filter(row => row.event === 'sample' && row.status === 0);
    return samples.some((last, index) => samples.slice(0, index).some(first =>
        first.aFrames > 0 && last.ms - first.ms >= 1000 && last.aFrames > first.aFrames && last.aMs > first.aMs));
}
function stageEvidence(rows, stage) {
    const start = rows.find(row => row.event === 'step_end' && row.status === stage);
    const end = start && rows.find(row => row.event === 'sample' && row.status === stage && row.ms >= start.ms + 2000);
    if (!end) return null;
    return {stage, startMs: start.ms, endMs: end.ms, aCallbacks: end.aFrames - start.aFrames,
        aPtsAdvanceMs: end.aMs - start.aMs, acceptedPackets: end.packets - start.packets,
        bCallbacks: end.bFrames - start.bFrames};
}
module.exports = {parseTrace, advancingBaseline, stageEvidence};
