// Preparation/plan are offline; live flags describe separately authorized TOFU work.
const fs = require('node:fs'), path = require('node:path');
const {bounds, observeHostKey} = require('./hdmi-host-key-check.cjs');
const {localBindings} = require('./collect-hdmi-elements.cjs');
const root = path.resolve(__dirname, '..');
async function main(args) {
    if (args.length === 1 && args[0] === '--plan') {
        console.log(JSON.stringify({mode: 'offline_plan', ...localBindings(), bounds, trustMode: 'tofu',
            independentlyVerified: false, authentication: false, remoteFileReads: 0, TVConnections: 0, connectionAuthorized: false}));
        return;
    }
    if (args.length !== 5 || args[0] !== '--allow-one-tofu-host-key-check' || args[1] !== '--owner-target-confirmed' ||
        args[2] !== '--device' || !args[3]) throw Error('Scope refused');
    const directory = path.resolve(args[4]);
    if (path.dirname(directory) !== path.join(root, 'build', 'phase-2') ||
        !/^hdmi-host-key-tofu-\d{8}-\d{3}$/.test(path.basename(directory)) || fs.existsSync(directory)) throw Error('Fresh fixed local slot required');
    const bindings = localBindings();
    // Establish and verify private local access before loading any real endpoint.
    const capture = require('./hdmi-element-capture.cjs').reserveCapture(directory);
    const sink = {complete: report => capture.complete({...report, bindings, ownerTargetConfirmed: true})};
    const stop = new AbortController(), cancel = () => stop.abort();
    process.on('SIGINT', cancel); process.on('SIGTERM', cancel);
    try {
        const result = await observeHostKey({allowOneCheck: true, sink, signal: stop.signal,
            connectionFactory: callbacks => require('./hdmi-host-key-check.cjs').checkConnection({alias: args[3], ...callbacks})});
        console.log(JSON.stringify({status: result.status, stopReason: result.stopReason, trustMode: result.trustMode,
            independentlyVerified: false, connectionClosed: result.connectionClosed, elapsedMs: result.elapsedMs}));
        if (result.status !== 'tofu_recorded') process.exitCode = 1;
    } finally { process.removeListener('SIGINT', cancel); process.removeListener('SIGTERM', cancel); }
}
if (require.main === module) main(process.argv.slice(2)).catch(() => {
    console.error('Host-key check refused or stopped; no retry. Review the private local outcome.'); process.exitCode = 1;
});
module.exports = {main};
