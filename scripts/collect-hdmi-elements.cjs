// --plan and all refusal paths stay offline. Live flags require a separate owner grant.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const {collect, contract, seeds} = require('./hdmi-element-collector.cjs');
const root = path.resolve(__dirname, '..');
const request = 'build/phase-2/hdmi-element-plugin-request-20261115-001/request.json';
const requestSha256 = '73e676ac871a743c64387ba88d5f470eaff46448b00da94592c7c4f9c32a35f0';
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex');
function localBindings() {
    if (hash(request) !== requestSha256) throw Error('Prepared request changed');
    const r = JSON.parse(fs.readFileSync(path.join(root, request)));
    const c = JSON.parse(fs.readFileSync(path.join(root, 'build/phase-2/physical-candidate-0.1.12/candidate-validation.json')));
    if (c.sourcePins.length !== 43 || c.sourcePins.some(p => hash(p.file) !== p.sha256) ||
        hash(c.binary) !== r.workingControl.ELFSha256 ||
        hash('dist/io.github.tpapaz.multiview.hdmiwindow_0.1.12_arm.ipk') !== r.workingControl.IPKSha256) throw Error('Working control changed');
    return {requestSha256, sourcePins: 43, workingControlUnchanged: true};
}
async function main(args) {
    if (args.length === 1 && args[0] === '--plan') {
        const bindings = localBindings();
        console.log(JSON.stringify({mode: 'offline_plan', ...bindings, paths: seeds.map(s => s.path),
            bounds: contract, collectionAuthorized: false, verifiedHostKeyRequired: true, TVConnections: 0}));
        return;
    }
    if (args.length !== 7 || args[0] !== '--allow-one-element-evidence-read' ||
        args[1] !== '--owner-read-only-evidence-ready' || args[2] !== '--verified-host-key-sha256' ||
        !/^[0-9a-f]{64}$/.test(args[3]) || args[4] !== '--device' || !args[5]) throw Error('Scope refused');
    const directory = path.resolve(args[6]);
    if (path.dirname(directory) !== path.join(root, 'build', 'phase-2') ||
        !/^hdmi-element-plugin-evidence-\d{8}-\d{3}$/.test(path.basename(directory)) || fs.existsSync(directory)) throw Error('Fresh fixed local slot required');
    const bindings = localBindings();
    const {reserveCapture} = require('./hdmi-element-capture.cjs');
    const capture = reserveCapture(directory);
    const sink = {...capture, complete: report => capture.complete({...report, bindings})};
    const stop = new AbortController(), cancel = () => stop.abort();
    process.on('SIGINT', cancel); process.on('SIGTERM', cancel);
    try {
        const result = await collect({allowOneRead: true, sink, signal: stop.signal,
            connectionFactory: () => require('./hdmi-element-connection.cjs').pinnedConnection({alias: args[5], hostKeySha256: args[3]})});
        // No alias/key/profile, raw paths from failed links, vendor text or exception details.
        console.log(JSON.stringify({status: result.status, stopReason: result.stopReason,
            filesRead: result.files.filter(r => r.status === 'read').length,
            connectionClosed: result.connectionClosed, subsystemClosed: result.subsystemClosed,
            handlesClosed: result.handlesClosed, elapsedMs: result.elapsedMs}));
        if (result.status !== 'retrieved') process.exitCode = 1;
    } finally { process.removeListener('SIGINT', cancel); process.removeListener('SIGTERM', cancel); }
    return bindings;
}
if (require.main === module) main(process.argv.slice(2)).catch(() => {
    console.error('Element evidence collector refused or stopped; no retry. Review the private local outcome.'); process.exitCode = 1;
});
module.exports = {main, localBindings};
