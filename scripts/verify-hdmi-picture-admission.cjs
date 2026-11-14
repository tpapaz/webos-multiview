// Fixed read-only 0.1.7 verification. No launch, clock sample or mutation API.
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const transport = () => require('../build/phase-2/hdmi-correction-0.1.3/transport.cjs');
const {id, version, filename} = require('./hdmi-picture-report.cjs');
const {validateGeneratedRole} = require('./hdmi-window-installed-role.cjs');
const {loadSnapshot} = require('./check-hdmi-utp-coverage.cjs');
const {evaluatePhase, validateReply, service} = require('./hdmi-utp-coverage.cjs');
const root = path.resolve(__dirname, '..');
function local() {
    const t = transport();
    const pkg = t.readJSON(path.join(root, 'build/phase-2/hdmi-window-' + version + '/package-validation.json'));
    assert.equal(pkg.appId, id); assert.equal(pkg.appVersion, version); assert.equal(pkg.archiveVerified, true);
    assert.equal(t.sha(fs.readFileSync(path.join(root, pkg.package))), pkg.packageSha256);
    for (const pin of [...pkg.sources, ...pkg.policyPayloads]) assert.equal(t.sha(fs.readFileSync(path.join(root, pin.file))), pin.sha256);
    const frozen = t.readJSON(path.join(root, 'build/phase-2/hdmi-correction-0.1.3/prepared-plan.json'));
    assert.equal(t.sha(fs.readFileSync(path.join(root, 'build/phase-2/hdmi-correction-0.1.3/transport.cjs'))),
        frozen.helperPins.find(p => p.file === 'transport.cjs').sha256);
    const baseline = loadSnapshot(path.join(root, 'build/phase-2/utp-activation-0.1.4-20261114-001/baseline'));
    const utility = t.readJSON(path.join(root, 'build/phase-2/hdmi-admin-caller-20261112-001/admin-caller-findings.json')).sourceFiles.find(p => p.tvPath === '/usr/bin/luna-send');
    assert.equal(t.sha(fs.readFileSync(path.join(root, utility.saved))), utility.sha256);
    return {pkg, baseline, utility};
}
async function verifyConnection(client, check, result, stage, save, {pkg, baseline, utility, reportFilename = filename('picture'), requireUtpCoverage = true}) {
    if (!requireUtpCoverage) { assert.equal(pkg.appVersion, '0.1.8'); assert.equal(pkg.setupOnlyNoUtpCalls, true); }
    const t = transport();
        const a = await stage('sftp', () => t.openAdapter(client, check, () => { throw Error('mutation forbidden'); }));
        a.rename = a.fchmod = async () => { throw Error('mutation forbidden'); };
        async function binding(key, remote, cap, expectedHash, mode, uid, gid, validate) {
            await stage('binding.' + key, async () => {
                const file = await a.readPath(remote, cap);
                result.bindings[key] = {sha256: file.sha256, ...file.attrs};
                assert.equal(file.attrs.mode, mode); assert.equal(file.attrs.uid, uid); assert.equal(file.attrs.gid, gid);
                if (expectedHash) assert.equal(file.sha256, expectedHash);
                if (validate) validate(JSON.parse(file.bytes));
            });
        }
        for (const [alias, remote] of [['host', '/tmp/' + id + '/' + reportFilename],
            ['jail', '/var/palm/jail/' + id + '/tmp/' + id + '/' + reportFilename]]) {
            await stage('report.' + alias, async () => {
                const present = await a.exists(remote); result.reports.push({alias, state: present ? 'present' : 'absent'});
                assert.equal(present, false);
            });
        }
        await binding('executable', t.base + '/multiview-hdmi-window', 1048576, pkg.binarySha256, 0o755, 1000, 1000);
        await binding('appinfo', t.base + '/appinfo.json', 4096, pkg.manifestSha256, 0o644, 1000, 1000);
        await stage('process.before', async () => { await a.checkAppAbsent(); result.processBefore = 'absent'; });
        for (const side of ['pub', 'prv']) await binding(side, '/var/palm/ls2-dev/roles/' + side + '/' + id + '.json',
            16384, null, 0o644, 0, 0, role => validateGeneratedRole(role, side));
        await binding('client', '/var/luna-service2-dev/client-permissions.d/' + id + '.app.json', 4096, null, 0o644, 0, 0,
            value => assert.deepEqual(value, {[id]: ['public']}));
        await binding('manifest', '/var/luna-service2-dev/manifests.d/' + id + '.json', 4096, null, 0o644, 0, 0,
            value => assert.deepEqual(value, {id, version: pkg.appVersion,
                roleFilesPrv: ['/var/palm/ls2-dev/roles/prv/' + id + '.json'],
                roleFilesPub: ['/var/palm/ls2-dev/roles/pub/' + id + '.json'],
                clientPermissionFiles: ['/var/luna-service2-dev/client-permissions.d/' + id + '.app.json']}));
        await stage('utility.binding', async () => {
            const file = await a.readPath(utility.tvPath, 1048576); assert.equal(file.sha256, utility.sha256);
            result.utilitySha256 = file.sha256;
        });
        if (requireUtpCoverage) {
        const replies = [];
        for (const [index, subject] of [id, service].entries()) await stage('permissions.' + index, async () => {
            const q = {subject, attempts: 1}; result.queries.push(q);
            let chunks = [], size = 0, stderr = 0;
            await new Promise((resolve, reject) => {
                let done = false, stream;
                const finish = e => { if (done) return; done = true; clearTimeout(limit); client.removeListener('close', lost); e ? reject(e) : resolve(); };
                const lost = () => finish(Error('transport'));
                const limit = setTimeout(() => { stream?.destroy(); finish(Error('query timeout')); }, 3000);
                client.once('close', lost);
                client.exec("/usr/bin/luna-send -n 1 -w 2000 'luna://com.webos.service.bus/queryServicePermissions' '" + JSON.stringify({service: subject}) + "'", (e, s) => {
                    if (e) { finish(e); return; } stream = s;
                    s.on('data', b => { size += b.length; if (size > 65536) { s.destroy(); finish(Error('bound')); } else chunks.push(b); });
                    s.stderr.on('data', b => { stderr += b.length; if (stderr > 1024) { s.destroy(); finish(Error('bound')); } });
                    s.on('error', () => finish(Error('transport')));
                    s.on('close', (code, signal) => { q.exitCode = Number.isInteger(code) ? code : 'unknown';
                        q.signalPresent = Boolean(signal); q.stderrBytes = stderr;
                        finish(code === 0 && !signal && stderr === 0 ? undefined : Error('query failed')); });
                });
            });
            const bytes = Buffer.concat(chunks); q.bytes = size; q.sha256 = t.sha(bytes);
            const reply = validateReply(JSON.parse(bytes)); save('reply-' + index + '.json', reply); replies.push(reply);
        });
        await stage('coverage.exact', async () => {
            result.coverage = evaluatePhase('overlay', {app: replies[0], utp: replies[1]}, baseline);
            assert.equal(result.coverage.coverageAccepted, true);
        });
        } else result.permissionScope = 'own_generated_registration_only';
        await stage('process.after', async () => { await a.checkAppAbsent(); result.processAfter = 'absent'; });
        result.readiness = true; result.status = 'completed';
}
async function collect(destination) {
    const t = transport();
    const {pkg, baseline, utility} = local();
    const dir = path.resolve(destination); fs.mkdirSync(dir, {mode: 0o700});
    const fd = fs.openSync(path.join(dir, 'stages.jsonl'), 'wx', 0o600);
    const save = (name, value) => fs.writeFileSync(path.join(dir, name), JSON.stringify(value, null, 2) + '\n', {flag: 'wx', mode: 0o600});
    const result = {schemaVersion: 1, appId: id, appVersion: version, startedAt: new Date().toISOString(),
        status: 'incomplete', bindings: {}, reports: [], processBefore: 'unknown', processAfter: 'unknown',
        queries: [], readiness: false, appLaunches: 0, UTPCalls: 0, TVMutations: 0, stages: []};
    const controller = new AbortController(), start = performance.now();
    let client, closed = false, stopped = false, active = 'local', timer;
    const check = () => { if (stopped || controller.signal.aborted || performance.now() - start >= 30000) throw Error('deadline'); };
    function record(stage, outcome) {
        const e = {stage, outcome, elapsedMs: Math.round(performance.now() - start)};
        result.stages.push(e); fs.writeSync(fd, JSON.stringify(e) + '\n'); fs.fsyncSync(fd);
    }
    async function stage(name, fn) {
        check(); active = name; record(name, 'started');
        try { const value = await fn(); check(); record(name, 'ok'); return value; }
        catch (e) { if (!stopped) record(name, e.code === 'ERR_ASSERTION' ? 'binding_or_scope_mismatch' :
            e.code === 2 ? 'absent' : e.code === 3 ? 'unreadable' : 'operation_failed'); throw e; }
    }
    const work = async () => {
        client = await stage('connection', () => require('./phase1-device.cjs').connect(undefined, {signal: controller.signal}));
        client.once('close', () => { closed = true; });
        await verifyConnection(client, check, result, stage, save, {pkg, baseline, utility});
    };
    try {
        await Promise.race([work(), new Promise((_, reject) => { timer = setTimeout(() => {
            record(active, 'deadline'); stopped = true; controller.abort(); client?.destroy(); reject(Error('deadline'));
        }, 30000); })]);
    } catch { result.failureStage = active; }
    finally {
        clearTimeout(timer); stopped = true; controller.abort(); client?.destroy();
        if (client && !closed && performance.now() - start < 29750) await new Promise(resolve => {
            const end = setTimeout(resolve, 200); client.once('close', () => { clearTimeout(end); resolve(); });
        });
        result.transportClosed = closed; result.elapsedMs = Math.round(performance.now() - start);
        result.packageSha256 = pkg.packageSha256; result.collectorSha256 = t.sha(fs.readFileSync(__filename));
        save('verification.json', result); fs.closeSync(fd);
    }
    console.log(JSON.stringify({status: result.status, readiness: result.readiness, failureStage: result.failureStage,
        elapsedMs: result.elapsedMs, transportClosed: result.transportClosed, coverage: result.coverage}));
    if (!result.readiness) process.exitCode = 1;
}
if (require.main === module) {
    if (process.argv.length === 3 && process.argv[2] === '--plan') { local(); console.log('Local bindings/baseline pass; zero TV access.'); }
    else if (process.argv.length === 4 && process.argv[2] === '--allow-tv-read') collect(process.argv[3]).catch(() => {
        console.error('Admission local setup/save failed; no retry.'); process.exitCode = 1;
    });
    else { console.error('Explicit read scope required.'); process.exitCode = 1; }
}

module.exports = {local, collect, verifyConnection};
