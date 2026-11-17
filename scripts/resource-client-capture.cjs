// Reuse the verified owner-only directory/inventory mechanism without widening its three-file allowlist.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const {seed} = require('./resource-client-collector.cjs');
function reserveCapture(directory) {
    const privateCapture = require('./hdmi-element-capture.cjs').reserveCapture(directory);
    let started = false;
    return {
        begin(name) {
            if (started || name !== seed.name) throw Error('Resource capture scope refused');
            const fd = fs.openSync(path.join(directory, seed.name), 'wx', 0o600);
            started = true;
            let bytes = 0, done = false;
            const digest = crypto.createHash('sha256');
            return {
                write(buffer) {
                    if (done || !Buffer.isBuffer(buffer) || bytes + buffer.length > seed.cap) throw Error('Capture bound');
                    for (let offset = 0; offset < buffer.length;) {
                        const n = fs.writeSync(fd, buffer, offset, buffer.length - offset);
                        if (n < 1) throw Error('Local write stopped');
                        digest.update(buffer.subarray(offset, offset + n)); offset += n; bytes += n;
                    }
                },
                finish() {
                    if (done) throw Error('Capture already closed');
                    done = true;
                    try { fs.fsyncSync(fd); return {bytes, sha256: digest.digest('hex'), localFile: seed.name}; }
                    finally { fs.closeSync(fd); }
                }
            };
        },
        complete: privateCapture.complete
    };
}
module.exports = {reserveCapture};
