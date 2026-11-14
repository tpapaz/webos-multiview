// Exact C1 generated-role shape, reviewed against the saved admission-app roles.
// These existing media entries are never used as alternate caller identities.
const {isDeepStrictEqual} = require('node:util');
const {id, version} = require('./hdmi-window-report.cjs');
function validateGeneratedManifest(manifest) {
    const expected = {id, version,
        roleFilesPrv: ['/var/palm/ls2-dev/roles/prv/' + id + '.json'],
        roleFilesPub: ['/var/palm/ls2-dev/roles/pub/' + id + '.json'],
        clientPermissionFiles: ['/var/luna-service2-dev/client-permissions.d/' + id + '.app.json']};
    if (!isDeepStrictEqual(manifest, expected)) throw Error('generated manifest mismatch');
}
function validateGeneratedRole(role, side) {
    if (!['pub', 'prv'].includes(side)) throw Error('unknown role side');
    const connector = side === 'pub' ? 'com.webos.pipe.avmuteclient.*' : 'com.webos.avconnector.*';
    const names = ['com.webos.media.client.*', 'com.webos.rm.client.*', 'com.webos.pipeline.*',
        connector, 'com.webos.vt.*', 'com.webos.chromium.media.*', id, ''];
    const permission = (service, outbound, inbound) => ({service, outbound, inbound});
    const expected = {
        role: {exeName: '/media/developer/apps/usr/palm/applications/' + id + '/multiview-hdmi-window',
            type: 'regular', allowedNames: names},
        permissions: [
            permission(names[0], ['com.webos.media'], ['com.webos.media']),
            permission(names[1], ['com.webos.media'], ['com.webos.media']),
            permission(names[2], ['com.webos.pipelinectrl.*'], ['com.webos.pipelinectrl.*']),
            permission(connector, side === 'pub' ? ['com.webos.service.avmutemanager'] :
                ['com.webos.service.videooutput', 'com.webos.service.audio', 'com.webos.service.utp.extinputs'], []),
            permission(names[4], ['*'], ['*']),
            permission(names[5], ['*'], []),
            permission(id, ['*'], [])
        ]
    };
    if (!isDeepStrictEqual(role, expected)) throw Error('generated role mismatch');
}
module.exports = {validateGeneratedRole, validateGeneratedManifest};
