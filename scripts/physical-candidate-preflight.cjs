// Current 0.1.12 bindings; historical version-bound verifier remains immutable.
const assert=require('node:assert/strict');
const {id,version,filenames,modes}=require('./physical-candidate-contract.cjs');
const {validateGeneratedRole}=require('./hdmi-window-installed-role.cjs');
const {evaluatePhase,validateReply,service}=require('./hdmi-utp-coverage.cjs');
const transport=()=>require('../build/phase-2/hdmi-correction-0.1.3/transport.cjs');
async function verifyConnection(client,check,result,stage,save,{pkg,baseline,utility,mode}){
    assert.equal(pkg.appVersion,version);assert.equal(pkg.reportSchemaVersion,2);assert.equal(pkg.mode,'physical_candidate');
    assert.equal(pkg.contextDispatchCorrection,true);assert.equal(pkg.independentTerminationWitness,true);assert(modes.includes(mode));
    const names=filenames(mode),requireUtpCoverage=mode==='physical_picture';
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
        for (const [alias, remote] of [['host_report', '/tmp/' + id + '/' + names.report],
            ['jail_report', '/var/palm/jail/' + id + '/tmp/' + id + '/' + names.report],
            ['host_witness', '/tmp/' + id + '/' + names.witness],
            ['jail_witness', '/var/palm/jail/' + id + '/tmp/' + id + '/' + names.witness]]) {
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
module.exports={verifyConnection};
