// Offline plan and one-attempt foreground runner for 0.1.13.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {run} = require('./hdmi-picture-controller.cjs');
const {base, hash, openIo} = require('./hdmi-picture-io.cjs');
const {validateGeneratedRole} = require('./hdmi-window-installed-role.cjs');
const {evaluatePhase, validateReply, service} = require('./hdmi-utp-coverage.cjs');
const {owned} = require('./physical-candidate-gate.cjs');
const {cappedWitnessClient} = require('./physical-candidate-runner.cjs');
const {local: controlLocal} = require('./physical-candidate-local.cjs');
const contract = require('./hdmi-clip-contract.cjs');
const {id, version, executable, lifecycle, picture, names} = contract;
const root = path.resolve(__dirname, '..');
const localDirectory = path.join(root, 'build/phase-2/hdmi-clip-' + version);
const legacyExe = base + '/multiview-hdmi-window';
const clipExe = base + '/' + executable;
// Host captures include per-operation timing for the bounded /proc scans.
const captureCap = 2 * 1024 * 1024;

function local(mode) {
    const control = controlLocal(mode);
    const read = relative => fs.readFileSync(path.join(localDirectory, relative));
    const bytes = read('package-validation.json');
    const pkg = JSON.parse(bytes);
    const abi = read('direct-abi.json');
    const packagePath = 'dist/' + id + '_' + version + '_arm.ipk';
    assert.equal(pkg.status, 'packaged_checked_local_only');
    assert.equal(pkg.package, packagePath);
    assert.equal(pkg.offlineNetworkAttempts, 0);
    assert.equal(pkg.tvConnections, 0);
    assert.equal(pkg.packageSha256, hash(fs.readFileSync(path.join(root, packagePath))));
    assert.equal(pkg.directAbiSha256, hash(abi));
    assert.equal(pkg.binarySha256, hash(read('arm/' + executable)));
    assert.equal(pkg.binarySha256, JSON.parse(abi).binarySha256);
    const bindings = JSON.parse(read('installed-bindings.json'));
    assert.equal(bindings.packageSha256, pkg.packageSha256);
    pkg.manifestSha256 = bindings.files['appinfo.json'];
    assert.equal(pkg.manifestSha256, hash(fs.readFileSync(path.join(root, 'native/phase2-hdmi-clip/appinfo.json'))));
    pkg.clipHashes = bindings.files;
    return {mode, pkg, packageRecordSha256: hash(bytes), utility: control.utility, baseline: control.baseline};
}

// The frozen shared controller probes the original executable basename.
// Adapt only those two fixed path checks for the independently versioned app.
function processClient(client) {
    return {sftp: callback => client.sftp((error, sftp) => callback(error, error ? sftp : new Proxy(sftp, {
        get(target, key) {
            if (key === 'readlink') return (filename, done) => target.readlink(filename, (err, destination) => {
                if (!err && [clipExe, '/var/palm/jail/' + id + clipExe].some(candidate =>
                    destination === candidate || destination === candidate + ' (deleted)'))
                    destination = destination.replace(executable, 'multiview-hdmi-window');
                done(err, destination);
            });
            const value = target[key];
            return typeof value === 'function' ? value.bind(target) : value;
        }
    })))};
}

async function verify(client, check, result, stage, save, references) {
    const {mode, pkg, utility, baseline} = references;
    const files = names(mode);
    const io = await openIo(client, stage, check, {reportFilename: files.report});
    const aliasSet = async filename => {
        const read = await openIo(filename === files.witness ? cappedWitnessClient(client, filename) : client,
            stage, check, {reportFilename: filename});
        const reports = [];
        await read.reports(reports);
        assert.deepEqual(reports.map(entry => entry.state), ['absent', 'absent']);
        result.reports.push(...reports.map(entry => entry.state));
    };
    await aliasSet(files.report);
    await aliasSet(files.witness);
    const bind = async (key, filename, cap, sha, mode, uid, parse) => {
        const file = await io.read(filename, cap, 'binding.' + key);
        assert.equal(file.metadata.mode, mode);
        assert.equal(file.metadata.uid, uid);
        assert.equal(file.metadata.gid, uid);
        if (sha) assert.equal(file.sha256, sha);
        if (parse) parse(JSON.parse(file.bytes));
        result.bindings[key] = {sha256: file.sha256, ...file.metadata};
    };
    await bind('executable', clipExe, 1048576, pkg.binarySha256, 0o755, 1000);
    await bind('appinfo', base + '/appinfo.json', 4096, pkg.manifestSha256, 0o644, 1000);
    for (const [name, cap] of [['clip-b.h264', 524288], ['clip-b.frames', 16384]]) {
        assert(/^[0-9a-f]{64}$/.test(pkg.clipHashes[name]));
        await bind(name, base + '/' + name, cap, pkg.clipHashes[name], 0o644, 1000);
    }
    for (const side of ['pub', 'prv']) {
        await bind(side, '/var/palm/ls2-dev/roles/' + side + '/' + id + '.json', 16384, null, 0o644, 0, role => {
            assert.equal(role.role.exeName, clipExe);
            validateGeneratedRole({...role, role: {...role.role, exeName: legacyExe}}, side);
        });
    }
    await bind('client', '/var/luna-service2-dev/client-permissions.d/' + id + '.app.json',
        4096, null, 0o644, 0, value => assert.deepEqual(value, {[id]: ['public']}));
    await bind('manifest', '/var/luna-service2-dev/manifests.d/' + id + '.json',
        4096, null, 0o644, 0, value => assert.deepEqual(value, {id, version,
            roleFilesPrv: ['/var/palm/ls2-dev/roles/prv/' + id + '.json'],
            roleFilesPub: ['/var/palm/ls2-dev/roles/pub/' + id + '.json'],
            clientPermissionFiles: ['/var/luna-service2-dev/client-permissions.d/' + id + '.app.json']}));
    const utilityFile = await io.read(utility.tvPath, 1048576, 'utility.binding');
    assert.equal(utilityFile.sha256, utility.sha256);
    const stateIo = await openIo(processClient(client), stage, check);
    assert.equal(await stateIo.processState(), 'absent');
    if (mode === picture) {
        const replies = [];
        for (const subject of [id, service]) {
            const command = "/usr/bin/luna-send -n 1 -w 2000 'luna://com.webos.service.bus/queryServicePermissions' '" +
                JSON.stringify({service: subject}) + "'";
            const reply = await io.exec(command, {timeoutMs: 3000, stdoutCap: 65536, stderrCap: 1024});
            assert(reply.code === 0 && !reply.signalPresent && reply.stderrBytes === 0);
            const value = validateReply(JSON.parse(reply.stdout));
            result.queries.push({subject});
            save('reply-' + replies.length + '.json', value);
            replies.push(value);
        }
        result.coverage = evaluatePhase('overlay', {app: replies[0], utp: replies[1]}, baseline);
        assert.equal(result.coverage.coverageAccepted, true);
        assert.equal(await stateIo.processState(), 'absent');
    }
    result.readiness = true;
}

async function runClip(options) {
    const {references, lifecycleGate, savePrivate, persist, submissionCue = () => {}, ...rest} = options;
    const {mode} = references;
    assert.equal(references.pkg.status, 'packaged_checked_local_only');
    if (mode === picture) assert(/^[0-9a-f]{64}$/.test(lifecycleGate?.digest));
    const files = names(mode);
    let launch, terminationReports = [];
    const save = (file, value) => {
        if (file !== 'launch.json') return savePrivate(file, value);
        if (mode === picture) assert.equal(value.launchBootId, lifecycleGate.bootId);
        launch = contract.request(value, mode, lifecycleGate?.digest);
        savePrivate(file, launch.wire);
    };
    const open = async (client, stage, check) => {
        const traces = new Map(), witnesses = new Map();
        const io = await openIo(client, stage, check, {reportFilename: files.report, classifyReport: bytes => {
            traces.set(hash(bytes), bytes);
            return contract.report(bytes, mode, launch?.binding);
        }});
        const state = await openIo(processClient(client), stage, check);
        return {...io,
            read: (filename, ...params) => io.read(filename === legacyExe ? clipExe : filename, ...params),
            processState: state.processState,
            exec: (command, limits) => {
                if (typeof command !== 'function') return io.exec(command, limits);
                return io.exec(() => {
                    command();
                    return launch.command;
                }, {...limits, onDispatch: () => {
                    limits.onDispatch();
                    submissionCue();
                }});
            },
            reports: async target => {
                await io.reports(target);
                const witness = await openIo(cappedWitnessClient(client, files.witness), stage, check, {reportFilename: files.witness, classifyReport: bytes => {
                    if (bytes.length <= 256) witnesses.set(hash(bytes), bytes);
                    return contract.witness(bytes, mode, launch?.binding);
                }});
                terminationReports = [];
                await witness.reports(terminationReports);
                for (const [index, entry] of terminationReports.entries()) {
                    const trace = target[index];
                    const traceBytes = traces.get(trace?.sha256);
                    const witnessBytes = witnesses.get(entry.sha256);
                    if (!traceBytes || !witnessBytes) continue;
                    Object.assign(entry, contract.witness(witnessBytes, mode, launch.binding, {
                        freshSlot: true, exactArtifact: true,
                        ownedMetadata: trace.state === 'valid' && owned(trace, traceBytes) && owned(entry, witnessBytes) &&
                            trace.metadata.uid === entry.metadata.uid && trace.metadata.gid === entry.metadata.gid
                    }));
                }
            }
        };
    };
    return run({...rest, references, mode, appVersion: version, verify, open, savePrivate: save,
        persist: result => {
            result.packageSha256 = references.pkg.packageSha256;
            result.packageRecordSha256 = references.packageRecordSha256;
            result.terminationReports = terminationReports;
            if (mode === lifecycle) result.livePicture = 'not_applicable_lifecycle_validation';
            result.processTermination = terminationReports.length === 2 &&
                terminationReports.every(entry => entry.state === 'observed_terminated') &&
                terminationReports[0].sha256 === terminationReports[1].sha256 ? 'independently_observed' : 'unknown';
            persist(result);
        }});
}

function read(directory, file, cap) {
    const target = path.join(directory, file);
    const stat = fs.lstatSync(target);
    assert(stat.isFile() && stat.size <= cap);
    return fs.readFileSync(target);
}

async function main(args) {
    if (args.length === 1 && args[0] === '--plan') {
        const {pkg} = local(lifecycle);
        console.log(JSON.stringify({appVersion: version, packageSha256: pkg.packageSha256,
            next: 'owner_scoped_lifecycle', tvConnections: 0}));
        return;
    }
    if (args.length === 3 && args[0] === '--record-restoration' && args[2] === '--picture-sound-remote-restored') {
        const directory = path.resolve(args[1]);
        const capture = read(directory, 'capture.json', captureCap);
        const parsed = JSON.parse(capture);
        assert(parsed.appVersion === version && parsed.mode === lifecycle && parsed.status === 'collected');
        fs.writeFileSync(path.join(directory, 'owner-restoration.json'),
            JSON.stringify(contract.restoreReceipt(capture)) + '\n', {flag: 'wx', mode: 0o600});
        return;
    }
    const mode = args[0] === '--allow-one-lifecycle' ? lifecycle : args[0] === '--allow-one-hdmi4-clip' ? picture : null;
    assert(mode && args.length === (mode === lifecycle ? 4 : 6));
    assert.equal(args[1], '--owner-ready');
    assert.equal(args[2], '--owner-independent-timer-ready');
    const references = local(mode);
    let lifecycleGate;
    if (mode === picture) {
        assert.equal(args[4], '--lifecycle-evidence');
        const prior = path.resolve(args[5]);
        lifecycleGate = contract.gate(read(prior, 'capture.json', captureCap), read(prior, 'launch.json', 4096),
            read(prior, 'owner-restoration.json', 1024), references);
    }
    const directory = path.resolve(args[3]);
    const parent = path.join(root, 'build');
    assert(path.relative(parent, directory) && !path.relative(parent, directory).startsWith('..') &&
        !path.isAbsolute(path.relative(parent, directory)));
    fs.mkdirSync(directory, {mode: 0o700});
    const handle = fs.openSync(path.join(directory, 'capture.json'), 'wx', 0o600);
    const cancel = new AbortController();
    const stop = () => cancel.abort();
    process.on('SIGINT', stop);
    process.on('SIGTERM', stop);
    try {
        const result = await runClip({references, lifecycleGate, signal: cancel.signal,
            connect: (...params) => require('./phase1-device.cjs').connect(...params),
            persist: result => {
                const bytes = Buffer.from(JSON.stringify(result, null, 2) + '\n');
                fs.writeSync(handle, bytes, 0, bytes.length, 0);
                fs.ftruncateSync(handle, bytes.length);
                fs.fsyncSync(handle);
            },
            savePrivate: (file, value) => fs.writeFileSync(path.join(directory, file),
                JSON.stringify(value) + '\n', {flag: 'wx', mode: 0o600}),
            ownerCue: () => console.log('OWNER_READY: keep the remote and independent timer in hand.'),
            emit() {},
            submissionCue: () => console.log('ONE_SUBMISSION_INTENT: start the 27-second timer now.')
        });
        console.log(JSON.stringify({status: result.status, attempts: result.attempts,
            processTermination: result.processTermination, hardwareRelease: result.hardwareRelease}));
        if (result.status !== 'collected') process.exitCode = 1;
    } finally {
        fs.closeSync(handle);
        process.removeListener('SIGINT', stop);
        process.removeListener('SIGTERM', stop);
    }
}

module.exports = {main, runClip};
if (require.main === module) main(process.argv.slice(2)).catch(() => {
    console.error('HDMI + clip probe stopped at the scope, package or lifecycle gate.');
    process.exitCode = 1;
});
