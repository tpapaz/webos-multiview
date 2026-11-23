const assert = require('node:assert/strict');
const {EventEmitter} = require('node:events');
const test = require('node:test');
const {runClip} = require('../../scripts/run-hdmi-clip.cjs');
const {id, version, executable, lifecycle, picture, names, request, restoreReceipt, gate} =
    require('../../scripts/hdmi-clip-contract.cjs');
const {base, hash} = require('../../scripts/hdmi-picture-io.cjs');
const {group, methods} = require('../../scripts/hdmi-utp-coverage.cjs');
const {boot, role} = require('./physical-candidate-fixture.cjs');

const encode = value => Buffer.from(JSON.stringify(value) + '\n');
const alias = name => ['/tmp/' + id + '/' + name, '/var/palm/jail/' + id + '/tmp/' + id + '/' + name];

async function simulate({mode = lifecycle, prior, fail} = {}) {
    const wireNames = names(mode);
    const reports = alias(wireNames.report), witnesses = alias(wireNames.witness);
    const executablePath = base + '/' + executable;
    const manifestPath = base + '/appinfo.json';
    const utility = '/usr/bin/luna-send';
    const files = new Map(), commands = [], connections = [], privateRecords = {};
    const put = (filename, bytes) => files.set(filename, Buffer.isBuffer(bytes) ? bytes : encode(bytes));
    put(executablePath, Buffer.from('synthetic ELF'));
    put(manifestPath, {id, version});
    put(utility, Buffer.from('synthetic utility'));
    put(base + '/clip-b.h264', Buffer.from('media'));
    put(base + '/clip-b.frames', Buffer.from('index'));
    const digest = filename => hash(files.get(filename));
    for (const side of ['pub', 'prv']) {
        const generated = role(side);
        generated.role.exeName = executablePath;
        put('/var/palm/ls2-dev/roles/' + side + '/' + id + '.json', generated);
    }
    put('/var/luna-service2-dev/client-permissions.d/' + id + '.app.json', {[id]: ['public']});
    put('/var/luna-service2-dev/manifests.d/' + id + '.json', {id, version,
        roleFilesPrv: ['/var/palm/ls2-dev/roles/prv/' + id + '.json'],
        roleFilesPub: ['/var/palm/ls2-dev/roles/pub/' + id + '.json'],
        clientPermissionFiles: ['/var/luna-service2-dev/client-permissions.d/' + id + '.app.json']});
    put('/proc/sys/kernel/random/boot_id', Buffer.from(boot + '\n'));
    put('/proc/uptime', Buffer.from('100.00 1.00\n'));
    const baseline = {app: {returnValue: true, client: ['public'], api: {'/*': ['all']}},
        utp: {returnValue: true, client: ['tv'], api: {'/*': ['all'],
            ...Object.fromEntries(methods.map(method => ['/' + method, ['private']]))}}};
    const overlay = structuredClone(baseline);
    overlay.app.client.push(group);
    for (const method of methods) overlay.utp.api['/' + method].push(group);
    const references = {mode, baseline, packageRecordSha256: 'c'.repeat(64),
        pkg: {status: 'packaged_checked_local_only', packageSha256: 'b'.repeat(64),
            binarySha256: digest(executablePath), manifestSha256: digest(manifestPath),
            clipHashes: {'clip-b.frames': digest(base + '/clip-b.frames'), 'clip-b.h264': digest(base + '/clip-b.h264')}},
        utility: {tvPath: utility, sha256: digest(utility)}};
    if (fail === 'incorrect-clip') put(base + '/clip-b.h264', Buffer.from('wrong'));
    if (fail === 'occupied') put(witnesses[0], Buffer.from('occupied'));
    const absent = () => Object.assign(new Error('no file'), {code: 2});
    const stat = filename => {
        const output = [...reports, ...witnesses].includes(filename);
        const uid = filename.startsWith(base) || output ? 1000 : 0;
        return {mode: 0o100000 | (filename === executablePath ? 0o755 : output ? 0o600 : 0o644),
            uid, gid: uid, size: filename.startsWith('/proc/') ? 0 : files.get(filename).length,
            mtime: 1, isFile: () => true, isDirectory: () => false};
    };
    const sftp = {
        lstat(filename, callback) {
            if (files.has(filename)) return callback(null, stat(filename));
            if (reports.some(file => file.slice(0, file.lastIndexOf('/')) === filename))
                return callback(null, {mode: 0o40700, uid: 1000, gid: 1000,
                    size: 0, mtime: 1, isFile: () => false, isDirectory: () => true});
            callback(absent());
        },
        open(filename, mode, callback) { assert.equal(mode, 'r'); callback(null, filename); },
        close(_handle, callback) { callback(null); },
        fstat(filename, callback) { callback(null, stat(filename)); },
        read(filename, buffer, offset, length, position, callback) {
            if (witnesses.includes(filename)) assert(length <= 256);
            const bytes = files.get(filename).subarray(position, position + length);
            bytes.copy(buffer, offset);
            callback(null, bytes.length);
        },
        readdir(filename, callback) {
            assert.equal(filename, '/proc');
            callback(null, fail === 'already-running' ? [{filename: '43'}] : []);
        },
        readlink(filename, callback) {
            assert.equal(filename, '/proc/43/exe');
            callback(null, executablePath);
        }
    };
    let time = 0, dispatches = 0, submissionCues = 0;
    const result = await runClip({references, lifecycleGate: prior, now: () => time,
        sleep: async duration => { assert(connections[0].closed); time += duration; },
        persist() {}, emit() {}, ownerCue() {}, submissionCue: () => { submissionCues++; },
        savePrivate: (name, value) => { privateRecords[name] = value; },
        connect: async () => {
            const client = new EventEmitter();
            client.sftp = callback => callback(null, sftp);
            client.destroy = () => { client.closed = true; client.emit('close'); };
            client.exec = (command, callback) => {
                commands.push(command);
                const stream = new EventEmitter();
                stream.stderr = new EventEmitter();
                callback(null, stream);
                const reply = bytes => queueMicrotask(() => {
                    stream.emit('data', bytes);
                    stream.emit('close', 0, null);
                });
                if (command === 'date +%s') return reply(Buffer.from('1700000000\n'));
                if (command.includes('queryServicePermissions')) {
                    assert.equal(submissionCues, 0);
                    const coverage = fail === 'missing-admission' ? baseline : overlay;
                    return reply(encode(command.includes(id) ? coverage.app : coverage.utp));
                }
                assert(command.includes('com.webos.applicationManager/launch'));
                const wire = JSON.parse(command.match(/'([^']+)'$/)[1]).params;
                assert.deepEqual(wire, privateRecords['launch.json']);
                assert.equal(wire.acquireHdmi4WithClip, mode === picture ? true : undefined);
                assert.equal(wire.terminationGateEvidenceSha256, prior?.digest);
                assert.equal(wire.verifyLifecycle, mode === lifecycle ? true : undefined);
                dispatches++;
                const active = mode === picture;
                const authority = {acquireHdmi4: true, launchBootId: wire.launchBootId,
                    launchStartByBoottimeMs: wire.launchStartByBoottimeMs,
                    launchStartByRealtimeMs: wire.launchStartByRealtimeMs};
                const binding = request(authority, mode, prior?.digest).binding;
                const capture = encode({schemaVersion: 1, appVersion: version,
                    mode: active ? 'hdmi4_clip' : 'lifecycle', launchBindingSha256: binding,
                    status: 'candidate_interval_completed', exitIntent: 0, opened: active, selected: active,
                    stopAcknowledged: active, closeAcknowledged: active, acquisitionUncertain: active,
                    localCleanup: true, clipFrame: active, clipAdvanced: active, clipCloseCompleted: active,
                    workerReady: true, workerReaped: true, continuityWindow: active,
                    picture: 'unknown', hardwareRelease: 'unknown', restoration: 'unknown'});
                const witness = Buffer.concat([encode([1, version, active ? 1 : 0, binding]),
                    encode({schemaVersion: 1, kind: 'own_parent_termination', state: 'observed',
                        exitStatus: 'unknown', hardwareRelease: 'unknown'})]);
                for (const report of reports) put(report, capture);
                for (const name of witnesses) put(name, fail === 'oversized-witness' ? Buffer.alloc(257) : witness);
                return reply(encode({returnValue: true}));
            };
            connections.push(client);
            return client;
        }});
    assert(connections.every(client => client.closed));
    assert.equal(dispatches, result.attempts);
    assert.equal(submissionCues, dispatches);
    return {result, privateRecords, references, commands};
}

function evidence({result, privateRecords, references}) {
    const capture = encode(result);
    return gate(capture, encode(privateRecords['launch.json']), encode(restoreReceipt(capture)), references);
}

test('witnessed 0.1.13 lifecycle gates a same-boot picture attempt', async () => {
    const startup = await simulate();
    assert.equal(startup.result.status, 'collected');
    assert.equal(startup.result.preflight.queries.length, 0);
    const prior = evidence(startup);
    const playback = await simulate({mode: picture, prior});
    assert.equal(playback.result.status, 'collected');
    assert.equal(playback.result.reports[0].report.continuityWindow, true);
    assert.equal(playback.result.preflight.queries.length, 2);
    assert.equal(playback.result.hardwareRelease, 'unknown');
    const newBoot = await simulate({mode: picture, prior: {...prior, bootId: 'wrong boot'}});
    assert.equal(newBoot.result.attempts, 0);
    const noGrant = await simulate({mode: picture, prior, fail: 'missing-admission'});
    assert.equal(noGrant.result.attempts, 0);
    assert.equal(noGrant.result.preflight.queries.length, 2);
    assert.equal(noGrant.result.preflight.coverage.coverageAccepted, false);
});

test('wrong installed clip, occupied evidence or live app prevents dispatch', async () => {
    for (const fail of ['incorrect-clip', 'occupied', 'already-running']) {
        const fixture = await simulate({fail});
        assert.equal(fixture.result.attempts, 0);
    }
    const unproven = await simulate({fail: 'oversized-witness'});
    assert.equal(unproven.result.processTermination, 'unknown');
    assert.throws(() => evidence(unproven));
});
