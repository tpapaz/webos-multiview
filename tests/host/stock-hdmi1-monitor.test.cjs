const test = require('node:test');
const assert = require('node:assert/strict');
const {EventEmitter} = require('node:events');
const {execFileSync, spawnSync} = require('node:child_process');
const path = require('node:path');
const {capture} = require('../../scripts/monitor-stock-hdmi1.cjs');

const media = 'com.webos.media';
const id = 'private-registration';
const registration = {type: 'call', method: 'registerPipeline', transport: 'TX', destination: media,
    senderUniqueName: ':client', destinationUniqueName: ':server', token: 2, payload: {}};
const registered = {type: 'return', transport: 'RX', sender: media, senderUniqueName: ':server',
    destinationUniqueName: ':client', replyToken: 2, payload: {connectionId: id}};
const grant = {connectionId: id, state: true, resources: [{resource: 'VHDMIRX', index: 2}]};
const completion = {type: 'call', transport: 'TX', method: 'acquireComplete', sender: media,
    senderUniqueName: ':server', destinationUniqueName: ':client', token: 9, payload: grant};
const duplicate = {...registration, method: 'acquireComplete', token: 10, payload: grant};
const rows = [registration, registered, completion, duplicate].map(m => JSON.stringify(m)).join('\n') + '\n';
const stream = 'FOCUSED_STREAM_READY\n' + rows + 'FOCUSED_STREAM_END\n';
const proof = 'STOCK_MONITOR_EXIT 0 100.05 146.05\n';

function attempt() {
    const client = new EventEmitter();
    const channel = new EventEmitter();
    channel.stderr = new EventEmitter();
    const log = {receipts: []};
    client.exec = (command, callback) => { log.command = command; callback(null, channel); };
    client.end = () => { log.endRequested = true; };
    client.destroy = () => { log.destroyed = true; };
    channel.destroy = () => {};
    const stop = new AbortController();
    const done = capture({connection: {client, start: () => client.emit('ready'), hostKeyVerified: () => true},
        signal: stop.signal, onReady: () => { log.ready = true; }, save: receipt => log.receipts.push(receipt)});
    return {client, channel, done, log, stop};
}

function finishChannel(a, marker = proof, code = 0, signal) {
    a.channel.stderr.emit('data', Buffer.from(marker));
    a.channel.stderr.emit('end');
    a.channel.emit('end');
    a.channel.emit('close', code, signal);
}

test('only publishes the decoded connection grant after both output streams, filter exit and SSH close', async () => {
    const a = attempt();
    a.channel.emit('data', Buffer.from(stream.slice(0, 8)));
    assert.equal(a.log.ready, undefined);
    a.channel.emit('data', Buffer.from(stream.slice(8)));
    assert.equal(a.log.ready, true);
    a.channel.emit('end');
    a.channel.emit('close', 0);
    assert.equal(a.log.endRequested, undefined);
    a.channel.stderr.emit('data', Buffer.from(proof.slice(0, 10)));
    a.channel.stderr.emit('data', Buffer.from(proof.slice(10)));
    a.channel.stderr.emit('end');
    assert.equal(a.log.endRequested, true);
    await new Promise(resolve => setImmediate(resolve));
    assert.deepEqual(a.log.receipts, []);
    a.client.emit('close');
    const receipt = await a.done;
    assert.deepEqual(a.log.receipts, [{scope: 'stock_hdmi1_receiver', monitorExit: 0, filterExit: 0,
        transportClosed: true, report: {status: 'observed', events: [{kind: 'media_receiver_assigned',
            operation: 'acquireComplete', registrationReplyLine: 2, callLine: 3, receiverIndex: 2, port: null}]}}]);
    assert.deepEqual(receipt, a.log.receipts[0]);
});

test('a plausible grant and AWK end marker cannot hide a failed producer or incomplete capture', async () => {
    for (const [input, marker, code, signal, reason] of [
        [stream, '', 0, null, 'monitor_exit_unverified'],
        [stream, proof.replace('EXIT 0', 'EXIT 1'), 0, null, 'monitor_exit_unverified'],
        [stream, proof + 'private diagnostic\n', 0, null, 'monitor_exit_unverified'],
        [stream, proof.replace('146.05', '101.05'), 0, null, 'monitor_window_unverified'],
        [stream, proof, 2, null, 'filter_exit_unverified'],
        [stream, proof, null, 'SIGTERM', 'filter_exit_unverified'],
        [stream, proof, null, null, 'filter_exit_unverified'],
        [stream.trimEnd(), proof, 0, null, 'invalid_filtered_stream'],
        [stream.replace('FOCUSED_STREAM_END', 'FOCUSED_LINE_CAPPED\nFOCUSED_STREAM_END'), proof, 0, null, 'stock_line_capped'],
        [stream + 'x'.repeat(32769), proof, 0, null, 'stock_line_capped'],
        [stream + 'x'.repeat(3 * 1024 * 1024), proof, 0, null, 'size_limit']
    ]) {
        const a = attempt();
        a.channel.emit('data', Buffer.from(input));
        finishChannel(a, marker, code, signal);
        a.client.emit('close');
        await assert.rejects(a.done, {message: reason});
        assert.deepEqual(a.log.receipts, []);
    }
});

test('a complete window without a server callback saves a redacted unknown finding', async () => {
    const a = attempt();
    const noGrant = stream.replace(JSON.stringify(completion) + '\n', '');
    a.channel.emit('data', Buffer.from(noGrant));
    finishChannel(a);
    a.client.emit('close');
    await a.done;
    assert.deepEqual(a.log.receipts.map(r => r.report), [{status: 'unknown', reason: 'no_media_completion', events: []}]);
});

test('transport loss, cancellation and a missing transport close forbid saving even after a grant', async t => {
    t.mock.timers.enable({apis: ['setTimeout']});
    for (const reason of ['transport_closed_early','cancelled','deadline','ssh_error']) {
        const a = attempt();
        a.channel.emit('data', Buffer.from(stream));
        if (reason !== 'transport_closed_early') finishChannel(a);
        if (reason === 'cancelled') a.stop.abort();
        if (reason === 'deadline') t.mock.timers.tick(54000);
        if (reason === 'ssh_error') a.client.emit('error', Error('private detail'));
        a.client.emit('close');
        await assert.rejects(a.done, {message: reason});
        assert.deepEqual(a.log.receipts, []);
    }
});

test('the actual pipeline reports a masked upstream failure separately from successful AWK output', async () => {
    const a = attempt();
    const bash = process.platform === 'win32'
        ? path.resolve(execFileSync('git', ['--exec-path'], {encoding: 'utf8'}).trim(), '../../../bin/bash.exe')
        : 'bash';
    // Replace the producer locally. No SSH or ls-monitor is started.
    const fixture = 'timeout() { test "$*" = "-t 46 ls-monitor --filter=com.webos --json" || return 98; cat; return 17; }\n';
    const run = spawnSync(bash, ['--noprofile', '--norc', '-c', fixture + a.log.command], {
        input: rows, encoding: 'utf8', timeout: 5000
    });
    a.channel.emit('data', Buffer.from(run.stdout || ''));
    finishChannel(a, run.stderr || '', run.status);
    a.client.emit('close');
    await assert.rejects(a.done);
    assert.deepEqual(a.log.receipts, []);
    assert.equal(run.status, 0);
    assert.equal(run.stdout.replaceAll('\r\n', '\n'), stream);
    assert.match(run.stderr, /^STOCK_MONITOR_EXIT 17 /);
});
