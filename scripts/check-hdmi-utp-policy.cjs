// Offline authorization-scope acceptance check, not a C1 policy loader/admission test.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '..');
const directory = path.join(root, 'native/phase2-hdmi-window/policy');
const appId = 'io.github.tpapaz.multiview.hdmiwindow';
const group = appId + '.utp';
const service = 'com.webos.service.utp.extinputs';
const files = ['manifest', 'api', 'client', 'groups'];
assert.deepEqual([...fs.readdirSync(directory)].filter(name => name.endsWith('.json')).sort(),
    files.map(kind => `hdmiwindow-utp.${kind}.json`).sort(), 'Only the four scoped JSON artifacts');
const policy = Object.fromEntries(files.map(kind => [kind,
    JSON.parse(fs.readFileSync(path.join(directory, `hdmiwindow-utp.${kind}.json`), 'utf8'))]));
const sameMembers = (actual, expected, message) => {
    assert.ok(Array.isArray(actual), message);
    assert.equal(new Set(actual).size, actual.length, message + ': duplicates');
    assert.deepEqual([...actual].sort(), [...expected].sort(), message);
};
const sameKeys = (actual, expected, message) => {
    assert.ok(actual && typeof actual === 'object' && !Array.isArray(actual), message);
    sameMembers(Object.keys(actual), expected, message);
};

// The grant adds exactly these four methods to one app. Existing public access
// belongs to the generated app policy; this overlay must neither replace it nor
// add the broad private/all groups, wildcard targets, helpers or bus administration.
sameKeys(policy.api, [group], 'Only the repository-owned UTP group may expose methods');
sameMembers(policy.api[group], ['open', 'switchExternalInput', 'stop', 'close'].map(method =>
    service + '/' + method), 'Only four exact additional UTP methods');
sameKeys(policy.client, [appId], 'Only the candidate identity may receive the grant');
sameMembers(policy.client[appId], [group], 'No inherited/broad group grants');
sameKeys(policy.groups, [group], 'Only our group metadata');
sameKeys(policy.groups[group], ['description', 'public'], 'No extra trust/security metadata');
assert.equal(policy.groups[group].public, false, 'Do not expose this as a public entitlement');
assert.ok(typeof policy.groups[group].description === 'string' && policy.groups[group].description.length > 0);

sameKeys(policy.manifest, ['id', 'version', 'apiPermissionFiles', 'clientPermissionFiles', 'groupsFiles'],
    'No duplicate/replacement role, service, generated app manifest or extra files');
assert.equal(policy.manifest.id, appId + '.utp-policy', 'Use a separate manifest ID');
assert.equal(policy.manifest.version, '0.1.0');
const references = {apiPermissionFiles: 'api', clientPermissionFiles: 'client', groupsFiles: 'groups'};
for (const [key, kind] of Object.entries(references)) {
    sameMembers(policy.manifest[key], [`/var/luna-service2/multiview-hdmi-window/hdmiwindow-utp.${kind}.json`],
        'Only owned overlay payload paths');
}
const app = JSON.parse(fs.readFileSync(path.join(root, 'native/phase2-hdmi-window/appinfo.json'), 'utf8'));
assert.equal(app.id, appId);
assert.equal(app.main, 'multiview-hdmi-window');
sameMembers(app.requiredACG, [], 'Root overlay must not turn into broad app metadata grants');
console.log('PASS: one app identity; four exact additional UTP methods; no broad grants, role/service replacement or inbound endpoint');
console.log('Scope checked locally only; C1 policy parsing, activation/removal and admission remain untested');
