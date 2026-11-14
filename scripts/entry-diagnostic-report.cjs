// Fixed, sanitized 0.1.6 trace validator. Never loads a device/profile module.
const fs = require('node:fs');
const id = 'io.github.tpapaz.multiview.hdmiwindow';
const version = '0.1.6';
const filename = 'entry-' + version + '.jsonl';
const keys = (value, fields) => value && typeof value === 'object' && !Array.isArray(value) &&
    Object.keys(value).length === fields.length && fields.every(k => Object.hasOwn(value, k));
function classify(bytes) {
    if (!Buffer.isBuffer(bytes) || bytes.length > 2048) return {state: 'invalid', reason: 'size'};
    if (!bytes.length) return {state: 'empty'};
    const events = [];
    const invalid = () => ({state: 'invalid', events, reason: 'schema_or_sequence'});
    const text = bytes.toString('utf8');
    const lines = text.split('\n');
    const tail = lines.pop(); // Keep validated complete markers before a torn final line.
    for (const line of lines) {
        let e;
        try { e = JSON.parse(line); } catch { return invalid(); }
        const i = events.length;
        if (i === 0) {
            if (!keys(e, ['schemaVersion', 'appId', 'diagnosticVersion', 'event', 'reservation']) ||
                e.schemaVersion !== 1 || e.appId !== id || e.diagnosticVersion !== version ||
                e.event !== 'main_entered' || e.reservation !== 'reserved') return invalid();
        } else if (i === 1) {
            if (!keys(e, ['event', 'outcome']) || e.event !== 'parser' ||
                !['picture_accepted', 'inert_or_invalid', 'non_picture_mode'].includes(e.outcome)) return invalid();
        } else if (i === 2 && events[1].outcome === 'picture_accepted') {
            if (!keys(e, ['event', 'bootRead', 'bootMatch', 'boottime', 'realtime', 'allowed']) ||
                e.event !== 'guard' || !['available', 'unavailable'].includes(e.bootRead) ||
                !['match', 'mismatch', 'unknown'].includes(e.bootMatch) ||
                !['within', 'expired', 'future', 'unavailable'].includes(e.boottime) ||
                !['within', 'expired', 'future', 'unavailable'].includes(e.realtime) ||
                (e.bootRead === 'unavailable') !== (e.bootMatch === 'unknown') ||
                e.allowed !== (e.bootMatch === 'match' && e.boottime === 'within' && e.realtime === 'within')) return invalid();
        } else if ((i === 2 && events[1].outcome !== 'picture_accepted') ||
            (i === 3 && events[1].outcome === 'picture_accepted')) {
            const code = i === 3 && events[2].allowed ? 0 : 64;
            if (!keys(e, ['event', 'code']) || e.event !== 'exit_intent' || e.code !== code) return invalid();
        } else return invalid();
        events.push(e); // Only validated fixed fields are retained, including on a later failure.
    }
    if (tail || !events.length) return invalid();
    return {state: events.at(-1).event === 'exit_intent' ? 'valid' : 'partial', events,
        observedExit: 'unknown', original014Cause: 'unknown'};
}
if (require.main === module) {
    try {
        if (process.argv.length !== 4 || process.argv[2] !== '--check') throw Error();
        const stat = fs.lstatSync(process.argv[3]);
        if (!stat.isFile() || stat.size > 2048) throw Error();
        const result = classify(fs.readFileSync(process.argv[3]));
        console.log(JSON.stringify(result));
        if (result.state !== 'valid') process.exitCode = 1;
    } catch { console.error('Local diagnostic trace check failed; no device access.'); process.exitCode = 1; }
}
module.exports = {id, version, filename, classify};
