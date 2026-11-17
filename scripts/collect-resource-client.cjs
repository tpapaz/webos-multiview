// Default/refusal/--plan are offline. Live flags require a separate, fresh owner grant.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const {collect, contract, seed, parents} = require('./resource-client-collector.cjs');
const root = path.resolve(__dirname, '..');
const requestFile = 'build/phase-2/hdmi-resource-client-request-20261116-001/request.json';
const requestSha256 = 'a1208fbc2aac3a26eca6930099217f5ad409d9bd8e7f30979ca055d0fedfb8d0';
function localBindings() {
    const hash = file => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex');
    if (hash(requestFile) !== requestSha256) throw Error('Prepared request changed');
    const request = JSON.parse(fs.readFileSync(path.join(root, requestFile)));
    if (JSON.stringify(request.seed) !== JSON.stringify(seed) || JSON.stringify(request.parents) !== JSON.stringify(parents) ||
        JSON.stringify(request.contract) !== JSON.stringify(contract) || hash(request.trust.inventory) !== request.trust.inventorySha256 ||
        hash(request.nameEvidence.file) !== request.nameEvidence.sha256) throw Error('Request binding changed');
    const workingControl = require('./collect-hdmi-elements.cjs').localBindings();
    return {requestSha256, workingControl, trustReceiptUnchanged: true};
}
async function main(args) {
    if (args.length === 1 && args[0] === '--plan') {
        console.log(JSON.stringify({mode: 'offline_plan', ...localBindings(), seed, parents, contract,
            location: 'candidate_not_verified', collectionAuthorized: false, TVConnections: 0}));
        return;
    }
    if (args.length !== 5 || args[0] !== '--allow-one-resource-client-evidence-read' ||
        args[1] !== '--owner-read-only-evidence-ready' || args[2] !== '--device' || !args[3]) throw Error('Scope refused');
    const directory = path.resolve(args[4]);
    if (path.dirname(directory) !== path.join(root, 'build', 'phase-2') ||
        !/^hdmi-resource-client-evidence-\d{8}-\d{3}$/.test(path.basename(directory)) || fs.existsSync(directory))
        throw Error('Fresh fixed local slot required');
    const bindings = localBindings();
    const capture = require('./resource-client-capture.cjs').reserveCapture(directory);
    const sink = {...capture, complete: report => capture.complete({...report, bindings, trustMode: 'tofu', independentlyVerified: false})};
    const stop = new AbortController(), cancel = () => stop.abort();
    process.on('SIGINT', cancel); process.on('SIGTERM', cancel);
    try {
        const result = await collect({allowOneRead: true, sink, signal: stop.signal,
            connectionFactory: () => require('./resource-client-connection.cjs').savedConnection({alias: args[3]})});
        console.log(JSON.stringify({status: result.status, stopReason: result.stopReason,
            fileRead: result.file.status === 'read', savedBytes: result.savedBytes, handlesClosed: result.handlesClosed,
            subsystemClosed: result.subsystemClosed, connectionClosed: result.connectionClosed, elapsedMs: result.elapsedMs}));
        if (!['retrieved', 'absent'].includes(result.status)) process.exitCode = 1;
    } finally { process.removeListener('SIGINT', cancel); process.removeListener('SIGTERM', cancel); }
}
if (require.main === module) main(process.argv.slice(2)).catch(() => {
    console.error('Resource-client evidence collector refused or stopped; no retry. Review the private local outcome.'); process.exitCode = 1;
});
module.exports = {main, localBindings, requestFile, requestSha256};
