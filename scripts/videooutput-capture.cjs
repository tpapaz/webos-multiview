// Reuse the existing owner-private directory/receipt mechanism without changing its allowlist.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const {seeds, contract} = require('./videooutput-collector.cjs');
function reserveCapture(directory) {
    const privateCapture = require('./hdmi-element-capture.cjs').reserveCapture(directory);
    let next = 0, active = false, total = 0;
    return {
        begin(name) {
            const seed = seeds[next];
            if (active || !seed || name !== seed.name) throw Error('Videooutput capture scope refused');
            const fd = fs.openSync(path.join(directory, name), 'wx', 0o600);
            active = true; next++;
            let bytes = 0, done = false;
            const digest = crypto.createHash('sha256');
            return {
                write(buffer) {
                    if (done || !Buffer.isBuffer(buffer) || bytes + buffer.length > seed.cap || total + buffer.length > contract.totalBytes) throw Error('Capture bound');
                    for (let offset = 0; offset < buffer.length;) {
                        const n = fs.writeSync(fd, buffer, offset, buffer.length - offset);
                        if (n < 1) throw Error('Local write stopped');
                        digest.update(buffer.subarray(offset, offset + n)); offset += n; bytes += n; total += n;
                    }
                },
                finish() {
                    if (done) throw Error('Capture already closed');
                    done = true;
                    try { fs.fsyncSync(fd); return {bytes, sha256: digest.digest('hex'), localFile: name}; }
                    finally { try { fs.closeSync(fd); } finally { active = false; } }
                }
            };
        },
        complete(report) { if (active) throw Error('Capture still open'); privateCapture.complete(report); }
    };
}
module.exports = {reserveCapture};
