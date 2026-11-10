const {setTimeout: delay} = require('node:timers/promises');
const {connect} = require('./phase1-device.cjs');
const {nativeBuild, openNativeApp, saveReport} = require('./phase1-native-ssh.cjs');

async function readTrace(app) {
    const trace = await app.trace();
    return trace.split('\n').filter(Boolean).map(line => {
        if (!/^\d+,(ready|run_start|init|foreground|load|area|sample|pipeline_error|feed_end|unload|quit|run_end),-?\d+,\d+,\d+,\d+,\d+$/.test(line))
            throw new Error('Unexpected NDL telemetry format');
        const [ms, event, status, packets, frames, loads, playing] = line.split(',');
        return {ms: +ms, event, status: +status, packets: +packets, frames: +frames, loads: +loads, playing: +playing};
    });
}

async function run() {
    const build = nativeBuild('ndl');
    const client = await connect(process.argv[2]);
    try {
        const app = await openNativeApp(client, build);
        const before = await readTrace(app);
        if (before[0]?.event !== 'ready') throw new Error('Wait for the NDL test menu to load');
        if (before.findLastIndex(row => row.event === 'run_start') > before.findLastIndex(row => row.event === 'run_end'))
            throw new Error('Wait for the current run to return to the menu');

        let rows = [];
        await app.signal('USR1');
        try {
            const deadline = Date.now() + 34000;
            while (Date.now() < deadline) {
                rows = (await readTrace(app)).slice(before.length);
                const end = rows.find(row => row.event === 'run_end');
                if (end) {
                    const feed = rows.find(row => row.event === 'feed_end');
                    const startup = rows.filter(row => ['init', 'foreground', 'load', 'area'].includes(row.event));
                    const cleanup = rows.filter(row => row.event === 'unload' || row.event === 'quit');
                    console.log(startup.map(row => `${row.event}=${row.status}`).join(', '));
                    console.log(`Run result ${end.status}. Accepted packets ${feed.packets}, frame callbacks ${end.frames}, Load complete ${end.loads}, Playing ${end.playing}.`);
                    if (cleanup.length) console.log(cleanup.map(row => `${row.event}=${row.status}`).join(', '));
                    if (feed.packets > 0) console.log('Confirm on the TV whether the clip and its clock were visible.');
                    if (end.status !== 0 || cleanup.some(row => row.status !== 0)) process.exitCode = 1;
                    return;
                }
                await delay(250);
            }
            throw new Error('NDL playback did not report completion');
        } finally {
            try {
                await app.stop();
            } catch {
                process.exitCode = 1;
                console.error('App exit could not be confirmed. Use Back if the menu is still open.');
            }
            saveReport(`c1-phase1-ndl-${build.version}`, build, rows);
        }
    } finally {
        client.end();
    }
}

run().catch(error => { console.error(error.message); process.exitCode = 1; });
