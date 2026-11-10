const fs = require('node:fs');
const path = require('node:path');
const {createRequire} = require('node:module');
const {Client} = createRequire(require.resolve('@webos-tools/cli/package.json'))('ssh2');

function connect(alias) {
    const profiles = JSON.parse(fs.readFileSync(path.join(process.env.APPDATA, '.webos/ose/novacom-devices.json')));
    const candidates = profiles.filter(profile => profile.username === 'root' && profile.privateKey?.openSsh &&
        (!alias || profile.name === alias));
    if (candidates.length !== 1) throw new Error('Select one existing root device profile by its local alias');
    const profile = candidates[0];
    const client = new Client();
    return new Promise((resolve, reject) => {
        client.once('ready', () => resolve(client));
        client.on('error', () => reject(new Error('TV SSH connection failed')));
        client.connect({host: profile.host, port: profile.port, username: profile.username,
            privateKey: fs.readFileSync(path.join(process.env.USERPROFILE, '.ssh', profile.privateKey.openSsh)),
            passphrase: profile.passphrase, readyTimeout: 10000});
    });
}

module.exports = {connect};
