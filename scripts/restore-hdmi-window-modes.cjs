// Fixed, separately authorized two-file correction. Default is local-only plan.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const {performance} = require('node:perf_hooks');
const {createHash} = require('node:crypto');
const {id, version} = require('./hdmi-window-report.cjs');
const {modeTargets, restoreModes} = require('./hdmi-window-modes.cjs');
const {loadSnapshot} = require('./check-hdmi-utp-coverage.cjs');
const {evaluatePhase} = require('./hdmi-utp-coverage.cjs');
const {validateGeneratedManifest} = require('./hdmi-window-installed-role.cjs');
const root = path.resolve(__dirname, '..');
const localDir = path.join(root, 'build/phase-2/hdmi-window-' + version);
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const json = file => JSON.parse(fs.readFileSync(file));
function plan() {
    const pkg = json(path.join(localDir, 'package-validation.json'));
    assert.equal(hash(fs.readFileSync(path.join(root, pkg.package))), pkg.packageSha256);
    assert.equal(pkg.status, 'packaged_checked_local_only');
    assert.equal(pkg.archiveVerified, true);
    assert.equal(pkg.hostAcceptancePassed, true); assert.equal(pkg.directAbiPassed, true);
    assert.equal(hash(fs.readFileSync(path.join(root, pkg.binary))), pkg.binarySha256);
    assert.equal(hash(fs.readFileSync(path.join(root, 'native/phase2-hdmi-window/appinfo.json'))), pkg.manifestSha256);
    for (const pin of [...pkg.sources, ...pkg.policyPayloads])
        assert.equal(hash(fs.readFileSync(path.join(root, pin.file))), pin.sha256);
    return {pkg, summary: {scope: '0.1.4 exact installed-content mode correction only',
        TVConnections: 0, executionAuthorized: false, targets: modeTargets(pkg),
        prerequisites: ['fresh exact deny maps', 'app absent', 'core/generated/payload pins',
            'scanned manifest absent; original held manifest intact', 'quiet installation'],
        maxFchmod: 2, hostCapMs: 30000, bootChangeRequired: false,
        omitted: ['rename', 'policy changes', 'app launch', 'HDMI', 'power', 'delete', 'directory chmod', 'chown']}};
}
async function run() {
    const {pkg} = plan();
    const frozen = path.join(root, 'build/phase-2/hdmi-correction-0.1.3');
    const priorPlan = json(path.join(frozen, 'prepared-plan.json'));
    // Reuse the preserved, tested transport only; never run its superseded stages.
    for (const name of ['transport.cjs', 'manifest.cjs']) {
        const pin = priorPlan.helperPins.find(p => p.file === name);
        assert.equal(hash(fs.readFileSync(path.join(frozen, name))), pin.sha256);
    }
    const t = require(path.join(frozen, 'transport.cjs'));
    const m = require(path.join(frozen, 'manifest.cjs'));
    const baseline = loadSnapshot(path.join(root, 'build/phase-2/utp-admission-transaction-20261114-001/baseline'));
    const expected = json(path.join(root, 'build/phase-2/utp-policy-inspection-20261114-001/inspection.json')).installedBinding;
    const dir = path.join(root, 'build/reports/hdmi-modes-' + version);
    fs.mkdirSync(dir); // Exclusive single-attempt slot; never overwrite/retry.
    const fd = fs.openSync(path.join(dir, 'record.json'), 'wx', 0o600);
    const record = {schemaVersion: 1, status: 'running', startedAt: new Date().toISOString(),
        packageSha256: pkg.packageSha256, appLaunches: 0, UTPCalls: 0, policyMutations: 0,
        powerActions: 0, TVDeletes: 0, installedLaunchModeGateAccepted: false};
    const checkpoint = () => {
        const bytes = Buffer.from(JSON.stringify(record, null, 2) + '\n');
        fs.writeSync(fd, bytes, 0, bytes.length, 0); fs.ftruncateSync(fd, bytes.length); fs.fsyncSync(fd);
    };
    let client, capture;
    const ctrl = new AbortController(), wall = Date.now(), mono = performance.now();
    const timer = setTimeout(() => { ctrl.abort(); client?.destroy(); }, 30000);
    const check = () => {
        if (ctrl.signal.aborted || Date.now() < wall || Date.now() - wall >= 30000 || performance.now() - mono >= 30000)
            throw Error('deadline');
    };
    try {
        checkpoint();
        client = await require('./phase1-device.cjs').connect(undefined, {signal: ctrl.signal}); check();
        const a = await t.openAdapter(client, check, checkpoint);
        a.rename = async () => { throw Error('rename forbidden'); };
        const boot = await a.readBoot(); // Consistency observation, not unique restart proof.
        await t.corePins(a);
        async function held() {
            assert.equal(await a.exists(m.source), false);
            const file = await a.readPath(m.destination);
            assert.equal(file.sha256, m.expected); assert.equal(file.bytes.length, 393);
            assert.equal(file.attrs.mode, 0o644); assert.equal(file.attrs.uid, 0); assert.equal(file.attrs.gid, 0);
        }
        await held(); await a.checkAppAbsent();
        const paths = {pub: '/var/palm/ls2-dev/roles/pub/' + id + '.json',
            prv: '/var/palm/ls2-dev/roles/prv/' + id + '.json',
            client: '/var/luna-service2-dev/client-permissions.d/' + id + '.app.json',
            manifest: '/var/luna-service2-dev/manifests.d/' + id + '.json'};
        for (const [key, name] of Object.entries(paths)) {
            const file = await a.readPath(name);
            if (key === 'manifest') validateGeneratedManifest(JSON.parse(file.bytes));
            else assert.equal(file.sha256, expected[key]);
            assert.equal(file.attrs.mode, 0o644); assert.equal(file.attrs.uid, 0); assert.equal(file.attrs.gid, 0);
        }
        for (const pin of pkg.policyPayloads.filter(p => !p.file.endsWith('.manifest.json'))) {
            const file = await a.readPath('/var/luna-service2/multiview-hdmi-window/' + path.basename(pin.file));
            assert.equal(file.sha256, pin.sha256); assert.equal(file.attrs.mode, 0o644);
            assert.equal(file.attrs.uid, 0); assert.equal(file.attrs.gid, 0);
        }
        capture = await t.queryPair(client, a, path.join(dir, 'permissions'), check);
        // Evaluate captured replies before any mode dispatch; final transport/
        // capture acceptance is checked again after connection closure.
        const current = {app: json(path.join(dir, 'permissions/reply-0.json')),
            utp: json(path.join(dir, 'permissions/reply-1.json'))};
        record.denyCoverage = evaluatePhase('removed', current, baseline);
        assert.equal(record.denyCoverage.coverageAccepted, true);
        await held(); await a.checkAppAbsent(); assert.equal(await a.readBoot(), boot);
        await restoreModes(a, record, pkg);
        assert.equal(record.modeCorrectionAccepted, true);
        await held(); assert.equal(await a.readBoot(), boot);
        record.status = 'complete';
    } catch {
        record.status = 'stopped'; record.failureCategory = 'binding_transport_or_mode_gate'; process.exitCode = 1;
    } finally {
        clearTimeout(timer); ctrl.abort();
        if (client) {
            const closed = new Promise(resolve => {
                if (client._sock?.destroyed) { resolve(); return; }
                client.once('close', resolve); setTimeout(resolve, 1000);
            });
            client.destroy(); await closed; record.connectionClosed = client._sock?.destroyed === true;
        }
        try {
            const pending = path.join(dir, 'permissions/capture-pending.json');
            if (fs.existsSync(pending)) {
                const data = capture || json(pending); data.connectionClosed = record.connectionClosed === true;
                fs.writeFileSync(path.join(dir, 'permissions/capture.json'), JSON.stringify(data, null, 2) + '\n', {flag: 'wx', mode: 0o600});
            }
            assert.equal(record.connectionClosed, true);
            if (record.status === 'complete') {
                assert.equal(evaluatePhase('removed', loadSnapshot(path.join(dir, 'permissions')), baseline).coverageAccepted, true);
                record.installedLaunchModeGateAccepted = true;
            }
        } catch { record.status = 'stopped'; record.failureCategory = 'final_capture_gate'; process.exitCode = 1; }
        record.finishedAt = new Date().toISOString(); checkpoint(); fs.closeSync(fd);
    }
    console.log(JSON.stringify(record, null, 2));
}
if (require.main === module) {
    const args = process.argv.slice(2);
    if (!args.length || args.length === 1 && args[0] === '--plan') {
        try { console.log(JSON.stringify(plan().summary, null, 2)); }
        catch { console.error('Local package binding failed; no device access.'); process.exitCode = 1; }
    } else if (args.length === 2 && args[0] === '--restore-modes' && args[1] === '--allow-tv-correction') {
        run().catch(() => { console.error('Scoped correction stopped; no retry.'); process.exitCode = 1; });
    } else { console.error('Use --plan; execution needs separate owner scope.'); process.exitCode = 1; }
}
