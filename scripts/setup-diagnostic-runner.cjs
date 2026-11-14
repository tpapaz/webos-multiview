// Explicit 0.1.8 contract over the shared one-shot controller; no TV imports.
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const {hash, openIo} = require('./hdmi-picture-io.cjs');
const {verifyConnection} = require('./verify-hdmi-picture-admission.cjs');
const {classify} = require('./setup-diagnostic-report.cjs');
const id = 'io.github.tpapaz.multiview.hdmiwindow', version = '0.1.8', reportFilename = 'setup-0.1.8.jsonl';
const root = path.resolve(__dirname, '..');
function local() {
    const directory = path.join(root, 'build/phase-2/entry-diagnostic-' + version);
    const bytes = fs.readFileSync(path.join(directory, 'package-validation.json'));
    const validation = JSON.parse(fs.readFileSync(path.join(directory, 'local-validation.json')));
    assert.equal(hash(bytes), validation.packageRecordSha256);
    const pkg = JSON.parse(bytes);
    assert.equal(pkg.appId, id); assert.equal(pkg.appVersion, version);
    assert.equal(pkg.mode, 'setup_only_diagnostic'); assert.equal(pkg.setupOnlyNoUtpCalls, true);
    assert.equal(pkg.archiveVerified, true); assert.equal(pkg.nativeAlarmSeconds, 22);
    assert.equal(hash(fs.readFileSync(path.join(root, pkg.package))), pkg.packageSha256);
    assert.equal(hash(fs.readFileSync(path.join(root, pkg.binary))), pkg.binarySha256);
    for (const pin of pkg.sources) assert.equal(hash(fs.readFileSync(path.join(root, pin.file))), pin.sha256);
    const frozen = JSON.parse(fs.readFileSync(path.join(root, 'build/phase-2/hdmi-correction-0.1.3/prepared-plan.json')));
    assert.equal(hash(fs.readFileSync(path.join(root, 'build/phase-2/hdmi-correction-0.1.3/transport.cjs'))),
        frozen.helperPins.find(p => p.file === 'transport.cjs').sha256);
    const pins = JSON.parse(fs.readFileSync(path.join(root, 'build/phase-2/hdmi-admin-caller-20261112-001/admin-caller-findings.json'))).sourceFiles;
    const utility = pins.find(p => p.tvPath === '/usr/bin/luna-send');
    assert.equal(hash(fs.readFileSync(path.join(root, utility.saved))), utility.sha256);
    return {pkg, utility, reportFilename, requireUtpCoverage: false};
}
async function verify(client, check, result, stage, save, references) {
    assert.equal(references.pkg.appVersion, version); assert.equal(references.pkg.setupOnlyNoUtpCalls, true);
    return verifyConnection(client, check, result, stage, save,
        {...references, reportFilename, requireUtpCoverage: false});
}
const open = (client, stage, check) => openIo(client, stage, check, {reportFilename, classifyReport: classify});
const configuration = {local, flag: '--allow-one-setup-run', readyFlag: '--owner-setup-ready',
    ownerCue: 'OWNER_READY: setup-only diagnostic may replace the visible picture briefly; remote and independent 27-second timer required.',
    runOptions: {verify, open, appVersion: version, mode: 'setup_only'}};
module.exports = {local, verify, open, configuration, reportFilename};
