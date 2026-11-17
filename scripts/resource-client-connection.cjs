// Used only after an explicit live scope and private local capture have been established.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const trustFile = 'build/phase-2/hdmi-host-key-tofu-20261115-001/inventory.json';
const trustSha256 = '0aa1cb6b8ee6a0a347ecec48eb35641a7a30db08f0e49172613c03bd720909b1';
const root = path.resolve(__dirname, '..');
const digest = value => crypto.createHash('sha256').update(value).digest('hex');
function savedReceipt() {
    const bytes = fs.readFileSync(path.join(root, trustFile));
    if (digest(bytes) !== trustSha256) throw Error('Saved trust receipt changed');
    return JSON.parse(bytes);
}
function savedConnection({alias, loadReceipt = savedReceipt, loadProfiles, createClient, readKey} = {}) {
    const receipt = loadReceipt();
    if (receipt?.kind !== 'ssh_host_key_first_use' || receipt.status !== 'tofu_recorded' || receipt.trustMode !== 'tofu' ||
        receipt.ownerTargetConfirmed !== true || receipt.connectionClosed !== true || receipt.authenticationBlocked !== true ||
        receipt.unexpectedAuthentication !== false || receipt.stopReason !== null ||
        !/^[0-9a-f]{64}$/.test(receipt.key?.sha256 || '') || !/^[0-9a-f]{64}$/.test(receipt.endpointBindingSha256 || ''))
        throw Error('Saved TOFU scope refused');
    const {existingProfile, pinnedConnection} = require('./hdmi-element-connection.cjs');
    const profile = existingProfile(alias, loadProfiles);
    if (!require('node:net').isIP(profile.host) || !Number.isInteger(profile.port) || profile.port < 1 || profile.port > 65535 ||
        digest(JSON.stringify({alias, host: profile.host, port: profile.port})) !== receipt.endpointBindingSha256)
        throw Error('Existing endpoint binding changed');
    // Reuse the checked profile snapshot, avoiding a second profile read or selection race.
    return pinnedConnection({alias, hostKeySha256: receipt.key.sha256, loadProfiles: () => [profile], createClient, readKey});
}
module.exports = {savedConnection, trustFile, trustSha256};
