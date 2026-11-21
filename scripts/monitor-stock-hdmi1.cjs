// One read-only C1 monitor. Only main() loads a device profile or reserves a local slot.
const fs = require('node:fs');
const path = require('node:path');
const {isUtf8} = require('node:buffer');
const {decodeStock, stockMaxBytes, stockLineBytes, maxLines} = require('./hdmi-receiver-decoder.cjs');

const windowSeconds = 46;
const deadlineMs = 54000;
class MonitorError extends Error {}

function monitorCommand() {
    const awk = fs.readFileSync(path.join(__dirname, 'stock-hdmi1-monitor.awk'), 'utf8').replace(/\r\n/g, '\n');
    // A POSIX pipeline returns the last command's status. Carry the bounded
    // producer's own exit and monotonic clock samples on the separate stderr channel.
    return [
        '{',
        'read -r before rest < /proc/uptime || exit 1',
        'timeout -t ' + windowSeconds + ' ls-monitor --filter=com.webos --json',
        'rc=$?',
        'read -r after rest < /proc/uptime || exit 1',
        'printf "STOCK_MONITOR_EXIT %d %s %s\\n" "$rc" "$before" "$after" >&2',
        "} | awk '" + awk.replaceAll("'", "'\\''") + "'"
    ].join('\n');
}

function verifyProducer(stderr) {
    const proof = /^STOCK_MONITOR_EXIT 0 (\d+\.\d{2}) (\d+\.\d{2})\n$/.exec(stderr);
    if (!proof) throw new MonitorError('monitor_exit_unverified');
    const elapsedCs = Math.round(Number(proof[2]) * 100) - Math.round(Number(proof[1]) * 100);
    if (!Number.isSafeInteger(elapsedCs) || elapsedCs < windowSeconds * 100 || elapsedCs > deadlineMs / 10)
        throw new MonitorError('monitor_window_unverified');
}

async function capture({connection, signal, onReady = () => {}, save}) {
    const command = monitorCommand();
    const {client} = connection;
    const stdout = Buffer.alloc(stockMaxBytes);
    let used = 0, lineStart = 0, lines = 0;
    let stderr = '', stderrBytes = 0;
    let stream, finished = false, closing = false;
    const deadline = performance.now() + deadlineMs;

    await new Promise((resolve, reject) => {
        const timer = setTimeout(() => fail('deadline'), deadlineMs);
        const cancel = () => fail('cancelled');
        function finish() {
            finished = true;
            clearTimeout(timer);
            signal?.removeEventListener('abort', cancel);
        }
        function fail(reason) {
            if (finished) return;
            finish();
            stream?.destroy();
            client.destroy();
            reject(new MonitorError(reason));
        }
        function data(chunk) {
            if (finished) return;
            if (used + chunk.length > stdout.length) return fail('size_limit');
            let scan = used;
            used += chunk.copy(stdout, used);
            const received = stdout.subarray(0, used);
            let end;
            while ((end = received.indexOf(10, scan)) !== -1) {
                if (end - lineStart > stockLineBytes) return fail('stock_line_capped');
                const line = received.subarray(lineStart, end);
                lines++;
                if (lines > maxLines + 2) return fail('line_limit');
                if (line.equals(Buffer.from('FOCUSED_LINE_CAPPED'))) return fail('stock_line_capped');
                if (lines === 1) {
                    if (!line.equals(Buffer.from('FOCUSED_STREAM_READY'))) return fail('incomplete_stock_stream');
                    onReady();
                }
                lineStart = scan = end + 1;
            }
            if (used - lineStart > stockLineBytes) fail('stock_line_capped');
        }
        client.on('error', () => fail('ssh_error'));
        client.once('close', () => {
            if (finished) return;
            if (!closing) return fail('transport_closed_early');
            if (performance.now() >= deadline) return fail('deadline');
            finish();
            resolve();
        });
        function attachChannel(error, channel) {
            if (finished) { channel?.destroy(); return; }
            if (error || !channel) return fail('monitor_exec_failed');
            stream = channel;
            let stdoutEnded = false, stderrEnded = false, channelClosed = false;
            function endTransport() {
                if (finished || closing || !channelClosed || !stdoutEnded || !stderrEnded) return;
                closing = true;
                client.end();
            }
            channel.on('data', data);
            channel.on('error', () => fail('channel_error'));
            channel.stderr.on('error', () => fail('channel_error'));
            channel.stderr.on('data', chunk => {
                if (finished) return;
                stderrBytes += chunk.length;
                if (stderrBytes > 4096) return fail('stderr_bound');
                stderr += chunk.toString('latin1');
            });
            channel.once('end', () => { stdoutEnded = true; endTransport(); });
            channel.stderr.once('end', () => { stderrEnded = true; endTransport(); });
            channel.once('close', (code, exitSignal) => {
                if (code !== 0 || exitSignal) return fail('filter_exit_unverified');
                channelClosed = true;
                endTransport();
            });
        }
        client.once('ready', () => {
            if (finished) return;
            if (!connection.hostKeyVerified()) return fail('host_key_unverified');
            try { client.exec(command, attachChannel); } catch { fail('monitor_exec_failed'); }
        });
        if (signal?.aborted) return cancel();
        signal?.addEventListener('abort', cancel, {once: true});
        try { connection.start(); } catch { fail('ssh_start_failed'); }
    });

    verifyProducer(stderr);
    const received = stdout.subarray(0, used);
    if (!isUtf8(received)) throw new MonitorError('invalid_filtered_stream');
    const report = decodeStock(received.toString('utf8'));
    if (report.reason && report.reason !== 'no_media_completion') throw new MonitorError('invalid_filtered_stream');
    if (signal?.aborted) throw new MonitorError('cancelled');
    if (performance.now() >= deadline) throw new MonitorError('deadline');
    const receipt = {scope: 'stock_hdmi1_receiver', monitorExit: 0, filterExit: 0, transportClosed: true, report};
    await save(receipt);
    return receipt;
}

async function main(args) {
    if (args.length !== 3 || args[0] !== '--capture-stock-hdmi1' || args[1] !== '--device' || !args[2]) {
        console.error('Usage: node scripts/monitor-stock-hdmi1.cjs --capture-stock-hdmi1 --device <existing-alias>');
        process.exitCode = 1;
        return;
    }
    const name = 'c1-stock-hdmi1-grant-' + new Date().toISOString().replace(/[:-]/g, '');
    const directory = path.resolve(__dirname, '../build/phase-2', name);
    const {savedConnection} = require('./resource-client-connection.cjs');
    const connection = savedConnection({alias: args[2]});
    const sink = require('./hdmi-element-capture.cjs').reserveCapture(directory);
    const stop = new AbortController();
    const cancel = () => stop.abort();
    process.once('SIGINT', cancel);
    process.once('SIGTERM', cancel);
    try {
        const receipt = await capture({connection, signal: stop.signal, save: sink.complete,
            onReady: () => console.log('MONITOR_READY')});
        console.log(JSON.stringify({status: receipt.report.status, receipt: name + '/inventory.json'}));
        if (receipt.report.status !== 'observed') process.exitCode = 1;
    } finally {
        process.removeListener('SIGINT', cancel);
        process.removeListener('SIGTERM', cancel);
    }
}

if (require.main === module) main(process.argv.slice(2)).catch(error => {
    console.error(error instanceof MonitorError ? error.message : 'Stock HDMI monitor setup or local save failed.');
    process.exitCode = 1;
});
module.exports = {capture};
