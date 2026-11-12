const fs = require('node:fs');
const path = require('node:path');
const {PIN, runNormal, runControlLoss} = require('./lifecycle-controller.cjs');
async function main(args = process.argv.slice(2)) {
    if (args.length === 1 && args[0] === '--help') {
        console.log('Fixed native lifecycle controller. Live flags: --stage-run-normal or --stage-run-control-loss <new-local-report.json>. No connection for help/import.');
        return 0;
    }
    const runner = args[0] === '--stage-run-normal' ? runNormal : args[0] === '--stage-run-control-loss' ? runControlLoss : null;
    if (args.length !== 2 || !runner) {
        console.log('Usage only after owner authorization: node scripts/run-native-lifecycle.cjs <--stage-run-normal|--stage-run-control-loss> <new-local-report.json>');
        return 64;
    }
    const root = path.resolve(__dirname, '..'), output = path.resolve(args[1]);
    const bytes = fs.readFileSync(path.join(root, 'build/phase-2/lifecycle-arm/multiview-lifecycle'));
    const abi = JSON.parse(fs.readFileSync(path.join(root, 'build/phase-2/lifecycle-arm/abi-validation.json')));
    if (abi.profile !== 'lifecycle' || abi.status !== 'passed_static_abi' || abi.binarySha256 !== PIN.sha256) throw Error();
    fs.mkdirSync(path.dirname(output), {recursive: true});
    fs.closeSync(fs.openSync(output, 'wx', 0o600));
    const abort = new AbortController();
    const cancel = () => abort.abort();
    process.once('SIGINT', cancel); process.once('SIGTERM', cancel);
    const saveReport = report => {
        // Preserve the earlier durable capture if the final status update fails.
        const pending = output + '.pending';
        const file = fs.openSync(pending, 'wx', 0o600);
        try {
            fs.writeFileSync(file, JSON.stringify(report, null, 2) + '\n');
            fs.fsyncSync(file);
        } finally { fs.closeSync(file); }
        fs.renameSync(pending, output);
    };
    try {
        const {connect} = require('./phase1-device.cjs');
        const report = await runner(signal => connect(undefined, {signal}), bytes, {signal: abort.signal, saveReport});
        saveReport(report);
        console.log('Saved native lifecycle report: ' + report.status);
        return ['normal_control_passed', 'control_loss_passed'].includes(report.status) ? 0 : 1;
    } finally {
        process.removeListener('SIGINT', cancel); process.removeListener('SIGTERM', cancel);
    }
}
if (require.main === module) main().then(code => { process.exitCode = code; }).catch(() => {
    console.error('Native lifecycle controller failed; preserve any local report for review.'); process.exitCode = 1;
});
module.exports = {main};
