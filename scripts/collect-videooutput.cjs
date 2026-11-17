// --plan/default/refusal are offline. Explicit collection scope uses standing read-only permission.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const {collect, contract, seeds, parents} = require('./videooutput-collector.cjs');
const root = path.resolve(__dirname, '..');
const requestFile = 'build/phase-2/hdmi-av-output-bridge-offline-20261117-001/next-evidence-request.json';
const requestSha256 = 'bb81bab3925d0229f3590e6844410fbbc1e80b142d89e931df355c7500412900';
function localBindings() {
    const bytes = fs.readFileSync(path.join(root, requestFile));
    if (crypto.createHash('sha256').update(bytes).digest('hex') !== requestSha256) throw Error('Prepared request changed');
    const r = JSON.parse(bytes);
    if (JSON.stringify(r.paths.map(p => ({path: p.path, cap: p.maxBytes}))) !== JSON.stringify(seeds.map(s => ({path: s.path, cap: s.cap}))) ||
        r.bounds.totalMs !== contract.totalMs || r.bounds.workCutoffMs !== contract.workMs || r.bounds.operationMs !== contract.operationMs ||
        r.bounds.chunkBytes !== contract.chunkBytes || r.bounds.maxTotalBytes !== contract.totalBytes || r.bounds.maxSymlinks !== contract.links ||
        r.bounds.maxFiles !== contract.opens || r.bounds.connections !== 1 || r.bounds.retries !== 0 || r.bounds.maxSimultaneousFileHandles !== 1 ||
        r.bounds.connectMs !== 3000 || r.bounds.closureMs !== 3000) throw Error('Request scope changed');
    return {requestSha256, workingControl: require('./collect-resource-client.cjs').localBindings()};
}
async function main(args) {
    if (args.length === 1 && args[0] === '--plan') {
        console.log(JSON.stringify({mode: 'offline_plan', ...localBindings(), seeds, parents, contract,
            descriptorBeforeExecutable: true, dispatch: false, TVConnections: 0})); return;
    }
    if (args.length !== 4 || args[0] !== '--allow-one-videooutput-evidence-read' || args[1] !== '--device' || !args[2]) throw Error('Scope refused');
    const directory = path.resolve(args[3]);
    if (path.dirname(directory) !== path.join(root, 'build', 'phase-2') ||
        !/^hdmi-videooutput-evidence-\d{8}-\d{3}$/.test(path.basename(directory)) || fs.existsSync(directory)) throw Error('Fresh fixed local slot required');
    const bindings = localBindings(), capture = require('./videooutput-capture.cjs').reserveCapture(directory);
    const sink = {...capture, complete: report => capture.complete({...report, bindings, trustMode: 'tofu', independentlyVerified: false})};
    const stop = new AbortController(), cancel = () => stop.abort();
    process.on('SIGINT', cancel); process.on('SIGTERM', cancel);
    try {
        const result = await collect({allowOneRead: true, sink, signal: stop.signal,
            connectionFactory: () => require('./resource-client-connection.cjs').savedConnection({alias: args[2]})});
        console.log(JSON.stringify({status: result.status, stopReason: result.stopReason,
            filesRead: result.files.filter(r => r.status === 'read').length, savedBytes: result.savedBytes,
            handlesClosed: result.handlesClosed, subsystemClosed: result.subsystemClosed,
            connectionClosed: result.connectionClosed, elapsedMs: result.elapsedMs}));
        if (result.status !== 'retrieved') process.exitCode = 1;
    } finally { process.removeListener('SIGINT', cancel); process.removeListener('SIGTERM', cancel); }
}
if (require.main === module) main(process.argv.slice(2)).catch(() => {
    console.error('Videooutput evidence collector refused or stopped; no retry. Review the private local outcome.'); process.exitCode = 1;
});
module.exports = {main, localBindings, requestFile, requestSha256};
