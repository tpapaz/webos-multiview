// Project only known categories/resources. Never persist raw vendor messages or identifiers.
const resources = ['VDEC', 'ADEC', 'VDEC_BUS', 'G1_H264', 'G1_MSVC', 'HEVCP1_VP9',
    'HEVCP1_HEVC', 'MAIN_SCALER', 'SUB_SCALER', 'GP_SCALER', 'SECONDARY_SCALER',
    'OVERLAY_VIDEO', 'VTG', 'DM', 'VBM_HANDLE', 'SVP_CPB', 'SVP_RB'];
function projectLine(line, appId) {
    if (line.length > 16384 || !/starfish|umediaserver|\bums\b|av[-_ ]?proxy|NDL|ResourceManager|\bsmp\b|tvpower|screenmanager|screensaver|eplmanager|airplay/i.test(line)) return null;
    const categories = [];
    for (const [name, pattern] of [
        ['policy', /policy/i], ['acquire', /acquir/i], ['release', /releas/i],
        ['disconnect', /disconnect/i], ['connect', /\bconnect(?:ed|ion)?\b/i],
        ['display', /display|scaler|overlay|videosink|video.sink/i],
        ['load', /\b(?:load|unload)(?:ed|ing)?\b/i],
        ['error', /\berror\b|\bfail(?:ed|ure)?\b|\breject(?:ed)?\b/i],
        ['screensaver_request', /requestScreenSaver|registerScreenSaverRequest/i],
        ['screensaver_nack', /set NACK/], ['screensaver_ack', /set ACK/],
        ['screensaver_launch', /screensaver.*(?:launch|foreground|visible)/i]
    ]) if (pattern.test(line)) categories.push(name);
    const found = resources.filter(name => new RegExp('(?<![A-Za-z0-9_])' + name + '(?![A-Za-z0-9_])').test(line));
    if (!categories.length && !found.length) return null;
    const projected={categories, resources: found, attribution: line.includes(appId) ? 'app-id-match' : 'unattributed-system-event'};
    if(categories.some(name=>name.startsWith('screensaver_'))) {
        // Match the C1 syslog component, never a service URI in another actor's payload.
        const component=line.match(/^\S+\s+\[[^\]]+\]\s+\S+\s+(\S+)\s+\[\]/)?.[1];
        projected.actor=({tvpower:'tvpower',tvpowerd:'tvpower',airplay:'airplay',screenmanager:'screenmanager',eplmanager:'eplmanager'})[component]||'unknown';
    }
    return projected;
}
async function startResourceLog(client, appId, seconds = 50) {
    if(!Number.isInteger(seconds)||seconds<1||seconds>100)throw new Error('Invalid bounded log duration');
    const started = Date.now();
    const report = {source: '/var/log/messages', schemaVersion: 1, redactionApplied: true,
        timing: 'host receipt elapsed milliseconds; buffered syslog delivery may lag native events',
        attribution: 'app-id-match or uncorrelated system event; no A/B identity inferred',
        linesExamined: 0, truncated: false, ended: false, entries: []};
    let channel, pending = '', bytes = 0, stopping = false, timer, setupResolve;
    const setup = new Promise(resolve => { setupResolve = resolve; });
    const closed = new Promise(resolve => {
        const finish = () => { setupResolve(); clearTimeout(timer); report.ended = true; resolve(); };
        timer = setTimeout(() => { report.collectionError = 'collector deadline'; channel?.close(); finish(); }, (seconds+5)*1000);
        client.exec(`timeout -t ${seconds} tail -n 0 -F /var/log/messages`, (error, stream) => {
            if (error) { report.collectionError = 'collector unavailable'; finish(); return; }
            channel = stream;
            setupResolve();
            stream.stderr.on('data', () => { if (!stopping) report.collectionError = 'collector stderr present'; });
            stream.on('data', chunk => {
                bytes += chunk.length;
                if (bytes > 4 * 1024 * 1024) { report.truncated = true; stream.close(); return; }
                pending += chunk.toString();
                const lines = pending.split('\n'); pending = lines.pop();
                if (pending.length > 16384) { pending = ''; report.truncated = true; }
                for (const line of lines) {
                    ++report.linesExamined;
                    const projected = projectLine(line, appId);
                    if (projected && report.entries.length < 2000) report.entries.push({clientElapsedMs: Date.now() - started, ...projected});
                    else if (projected) report.truncated = true;
                }
            });
            stream.on('error', () => { report.collectionError = 'collector stream error'; finish(); });
            stream.on('close', code => {
                if (!stopping && code !== 0) report.collectionError = 'collector ended unexpectedly';
                finish();
            });
        });
    });
    await setup;
    return {report, elapsedMs: () => Date.now() - started,
        stop: async () => {
            stopping = true;
            if (channel && !report.ended) { channel.signal('TERM', () => {}); channel.close(); }
            await Promise.race([closed, new Promise(resolve => setTimeout(resolve, 1500))]);
            if (!report.ended) {
                report.collectionError = 'collector closure unconfirmed; remote bounded timeout applies';
                clearTimeout(timer); channel?.destroy();
            }
            return report;
        }};
}
module.exports = {projectLine, startResourceLog};

