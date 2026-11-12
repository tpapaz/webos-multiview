// Acceptance fixtures: no network, no TV, no filesystem writes.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '../..');
const id = 'io.github.tpapaz.multiview.admission';
const base = '/media/developer/apps/usr/palm/applications/' + id;
const reportPath = '/var/palm/jail/' + id + '/tmp/' + id + '/report-0.1.2.json';
const hostReportPath = '/tmp/' + id + '/report-0.1.2.json';
const source = fs.readFileSync(path.join(root, 'scripts/capture-admission.cjs'), 'utf8');
const files = new Map();
const remote = new Map([
    [base + '/multiview-admission', fs.readFileSync(path.join(root, 'build/phase-2/admission-arm/multiview-admission'))],
    [base + '/appinfo.json', fs.readFileSync(path.join(root, 'native/phase2-admission/appinfo.json'))]
]);
for (const side of ['pub', 'prv']) remote.set('/var/palm/ls2-dev/roles/' + side + '/' + id + '.json',
    Buffer.from(JSON.stringify({role: {exeName: base + '/multiview-admission', type: 'regular', allowedNames: [id]},
        permissions: [{service: id, inbound: [], outbound: ['*']}]})));
remote.set('/var/luna-service2-dev/client-permissions.d/' + id + '.app.json', Buffer.from(JSON.stringify({[id]: ['public']})));
const missing = Object.assign(new Error('fixture missing'), {code: 2});
const sftp = {
    lstat(name, cb) { const data = remote.get(name); cb(data ? null : missing, data && {
        isFile: () => true, size: data.length, mode: name.endsWith('multiview-admission') ? 493 : [reportPath, hostReportPath].includes(name) ? 384 : 420}); },
    readFile(name, cb) { cb(remote.has(name) ? null : missing, remote.get(name)); },
    readdir(name, cb) { assert.equal(name, '/proc'); cb(null, []); }
};
const client = {sftp: cb => cb(null, sftp), end() {}, destroy() {}};
async function run(mode) {
    const messages = [];
    const fakeProcess = {argv: ['node', 'collector', mode, 'fixture-capture'], exitCode: 0};
    const context = {Buffer, process: fakeProcess, __dirname: path.join(root, 'scripts'), setTimeout, clearTimeout,
        console: {log: s => messages.push(s), error: s => messages.push(s)}, require(name) {
            if (name === './phase1-device.cjs') return {connect: async () => client};
            if (name === 'node:fs') return {mkdirSync() {}, readFileSync(name) {
                return files.has(name) ? files.get(name) : fs.readFileSync(name);
            }, writeFileSync(name, data, options) {
                assert.equal(options.flag, 'wx'); if (files.has(name)) throw Error('exists'); files.set(name, data);
            }};
            return require(name);
        }};
    const completion = source.replace('main().catch(', 'globalThis.finished = main().catch(');
    vm.runInNewContext(completion, context);
    await context.finished;
    return {code: fakeProcess.exitCode, messages};
}
(async () => {
    assert.equal((await run('--prepare')).code, 0);
    const report = {schemaVersion: 1, appVersion: '0.1.2', appId: id, status: 'denied', registered: true,
        identityMatched: true, cleanupConfirmed: true, calls: 1, listPolicyAllowed: 0, resetPolicyAllowed: -1,
        listAdmitted: false, publicationCount: 0, hdmiCandidateCount: 0, elapsedMs: 10,
        executionContext: 'unverified', baseline: 'unknown', appliedGeometry: 'unknown'};
    remote.set(reportPath, Buffer.from(JSON.stringify({...report, leakedRawResponse: 'sensitive-fixture'})));
    const invalid = await run('--collect');
    assert.equal(invalid.code, 1);
    assert(!invalid.messages.join('').includes('sensitive-fixture'));
    remote.set(reportPath, Buffer.from(''));
    assert.equal((await run('--collect')).code, 1);
    remote.set(reportPath, Buffer.from(JSON.stringify({...report, status: 'invalid_launch_arguments',
        registered: false, identityMatched: false, calls: 0, listPolicyAllowed: -1})));
    assert.equal((await run('--collect')).code, 0);
    files.delete(path.resolve('fixture-capture/capture.json'));
    remote.set(reportPath, Buffer.from(JSON.stringify(report)));
    remote.set(hostReportPath, Buffer.from(JSON.stringify({...report, calls: 2})));
    assert.equal((await run('--collect')).code, 1); // Conflicting evidence must not be selected.
    remote.set(hostReportPath, remote.get(reportPath));
    assert.equal((await run('--collect')).code, 0);
    const capture = JSON.parse(files.get(path.resolve('fixture-capture/capture.json')));
    assert.deepEqual(Array.from(capture.reportLocations), ['app jail tmp', 'host tmp']);
    assert.equal((await run('--prepare')).code, 1); // Existing evidence must block another run.
    console.log('Capture fixtures passed: fresh preflight, denial evidence, redaction, partial report and stale-report refusal');
})().catch(e => { console.error(e); process.exitCode = 1; });
