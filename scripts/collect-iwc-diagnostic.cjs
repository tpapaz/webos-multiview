const fs = require('node:fs');
const path = require('node:path');
const {collect} = require('./iwc-diagnostic.cjs');

async function main(args = process.argv.slice(2)) {
    if (args.length === 1 && args[0] === '--help') {
        console.log('Fixed IWC root diagnostic collector. --run-readonly <new-local-report.json> makes one TV listing call; omit it for no connection.');
        return 0;
    }
    if (args.length !== 2 || args[0] !== '--run-readonly' || !args[1]) {
        console.log('Usage (only after owner authorization): node scripts/collect-iwc-diagnostic.cjs --run-readonly <new-local-report.json>');
        return 64;
    }
    // Reserve the local output before connecting. Never overwrite prior evidence.
    const output = path.resolve(args[1]);
    fs.mkdirSync(path.dirname(output), {recursive: true});
    const fd = fs.openSync(output, 'wx', 0o600);
    const abort = new AbortController();
    const cancel = () => abort.abort();
    process.once('SIGINT', cancel);
    process.once('SIGTERM', cancel);
    try {
        const {connect} = require('./phase1-device.cjs');
        const report = await collect(signal => connect(undefined, {signal}), {signal: abort.signal});
        fs.writeFileSync(fd, JSON.stringify(report, null, 2) + '\n');
        console.log('Saved root diagnostic report: ' + report.status);
        return report.status === 'read_admission_passed' ? 0 : 1;
    } finally {
        process.removeListener('SIGINT', cancel);
        process.removeListener('SIGTERM', cancel);
        fs.closeSync(fd);
    }
}
if (require.main === module) main().then(code => { process.exitCode = code; }).catch(() => {
    console.error('Fixed IWC collector failed; inspect the local report if present.');
    process.exitCode = 1;
});
module.exports = {main};
