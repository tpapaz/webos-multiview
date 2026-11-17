// Lazy transport for separately authorized work. No profile reads on import.
function existingProfile(alias, loadProfiles) {
    if (typeof alias !== 'string' || !alias.length) throw Error('Explicit existing alias required');
    const fs = require('node:fs'), path = require('node:path');
    const profiles = loadProfiles ? loadProfiles() : JSON.parse(fs.readFileSync(path.join(process.env.APPDATA, '.webos/ose/novacom-devices.json')));
    const matching = profiles.filter(p => p.name === alias && p.username === 'root' && typeof p.privateKey?.openSsh === 'string');
    if (matching.length !== 1) throw Error('Existing profile selection refused');
    return matching[0];
}
const newClient = () => new (require('node:module').createRequire(require.resolve('@webos-tools/cli/package.json'))('ssh2').Client)();
function pinnedConnection({alias, hostKeySha256, loadProfiles, createClient, readKey} = {}) {
    if (typeof alias !== 'string' || !alias.length || !/^[0-9a-f]{64}$/.test(hostKeySha256 || ''))
        throw Error('An explicit existing alias and owner-trusted host-key SHA256 are required');
    const fs = require('node:fs'), path = require('node:path');
    const p = existingProfile(alias, loadProfiles);
    const getKey = readKey || (name => {
        const base = path.resolve(process.env.USERPROFILE, '.ssh'), file = path.resolve(base, name);
        if (!file.startsWith(base + path.sep)) throw Error('Key path refused');
        return fs.readFileSync(file);
    });
    const key = getKey(p.privateKey.openSsh);
    const client = createClient ? createClient() : newClient();
    let started = false, verified = false;
    return {client, hostKeyVerified: () => verified, start() {
        if (started) throw Error('Second connection refused');
        started = true;
        client.connect({host: p.host, port: p.port, username: p.username, privateKey: key,
            passphrase: p.passphrase, readyTimeout: 3000, hostHash: 'sha256',
            hostVerifier: value => { verified = value === hostKeySha256; return verified; }});
    }};
}
module.exports = {pinnedConnection, existingProfile, newClient};
