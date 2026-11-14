// Live CLI is opt-in only. Import/--plan performs no device import or connection.
const fs = require('node:fs'), path = require('node:path');
const {local} = require('./verify-hdmi-picture-admission.cjs');
const {run} = require('./hdmi-picture-controller.cjs');
const {hash} = require('./hdmi-picture-io.cjs');
async function main(args, config = {}) {
    const references = (config.local || local)();
    if (args.length === 1 && args[0] === '--plan') {
        console.log('Local ' + references.pkg.appVersion + ' pins pass. Plan: at most two 30-second connections, one SAM attempt, collection at dispatch +27 seconds. No device access.');
        return;
    }
    if (args.length !== 4 || args[0] !== (config.flag || '--allow-one-picture') || args[1] !== (config.readyFlag || '--owner-hdmi4-ready') ||
        args[2] !== '--owner-independent-timer-ready') throw Error('scope');
    const directory = path.resolve(args[3]); fs.mkdirSync(directory, {mode: 0o700});
    const fd = fs.openSync(path.join(directory, 'capture.json'), 'wx', 0o600);
    const events = fs.openSync(path.join(directory, 'stages.jsonl'), 'wx', 0o600);
    const controller = new AbortController(); const stop = () => controller.abort();
    process.on('SIGINT', stop); process.on('SIGTERM', stop);
    try {
        const result = await run({...config.runOptions, references, signal: controller.signal,
            connect: (...a) => require('./phase1-device.cjs').connect(...a),
            persist: value => {
                const bytes = Buffer.from(JSON.stringify(value, null, 2) + '\n');
                fs.writeSync(fd, bytes, 0, bytes.length, 0); fs.ftruncateSync(fd, bytes.length); fs.fsyncSync(fd);
            },
            emit: value => {
                fs.writeSync(events, JSON.stringify(value) + '\n'); fs.fsyncSync(events);
                if (value.stage === 'submission.sam.command' && value.outcome === 'started')
                    console.log('ONE_SUBMISSION_INTENT: use your independent 27-second timer now; this is not acknowledgment.');
            },
            savePrivate: (name, value) => {
                const privateFd = fs.openSync(path.join(directory, name), 'wx', 0o600);
                try { fs.writeFileSync(privateFd, JSON.stringify(value, null, 2) + '\n'); fs.fsyncSync(privateFd); }
                finally { fs.closeSync(privateFd); }
            },
            ownerCue: () => console.log(config.ownerCue || 'OWNER_READY: moving HDMI 4, remote access and independent timer required; one fresh submission follows.')});
        result.packageSha256 = references.pkg.packageSha256;
        result.controllerSha256 = hash(fs.readFileSync(require.resolve('./hdmi-picture-controller.cjs')));
        const bytes = Buffer.from(JSON.stringify(result, null, 2) + '\n');
        fs.writeSync(fd, bytes, 0, bytes.length, 0); fs.ftruncateSync(fd, bytes.length); fs.fsyncSync(fd);
        console.log(JSON.stringify({status: result.status, attempts: result.attempts, collection: result.collection,
            aliasComparison: result.aliasComparison, actualExit: result.actualExit, hardwareRelease: result.hardwareRelease}));
        if (result.status !== 'collected') process.exitCode = 1;
    } finally { process.removeListener('SIGINT', stop); process.removeListener('SIGTERM', stop); fs.closeSync(fd); fs.closeSync(events); }
}
if (require.main === module) main(process.argv.slice(2)).catch(() => {
    console.error('Physical controller stopped; inspect saved stages. No automatic retry.'); process.exitCode = 1;
});
module.exports = {main};
