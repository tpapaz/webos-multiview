const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const api = require('../../apps/probe-ui/probe.js');
function harness() {
    let onTimeout, callback, calls = 0, cancelled = 0, report;
    const timers = {set(fn, ms) { assert.equal(ms, 3000); onTimeout = fn; return 1; }, clear() {}};
    const stop = api.collect((uri, params, done) => {
        ++calls;
        assert.equal(uri, 'luna://com.webos.service.tv.systemproperty/getSystemInfo');
        assert.deepEqual(params, {keys: ['modelName', 'sdkVersion', 'firmwareVersion'], subscribe: false});
        callback = done;
        return {cancel() { ++cancelled; }};
    }, value => { report = value; }, timers);
    return {stop, timeout() { onTimeout(); }, reply(value) { callback(value); },
        get report() { return report; }, get cancelled() { return cancelled; }, get calls() { return calls; }};
}
const metadata = require('../fixtures/metadata.json');
test('allowlist redaction and unknown concurrency even with successful metadata', () => {
    const h = harness();
    h.reply(JSON.stringify({...metadata, serialNumber: 'PRIVATE-SERIAL', ip: '192.0.2.123', token: 'PRIVATE-TOKEN', boardType: 'PRIVATE-BOARD'}));
    assert.equal(h.report.device.modelFamily, 'LG C1');
    assert.equal(h.report.device.firmwareVersion, '03.40.87');
    assert.equal(h.report.device.boardFamily, 'unknown');
    assert.ok(!JSON.stringify(h.report).includes('PRIVATE'));
    assert.ok(!JSON.stringify(h.report).includes('192.0.2.123'));
    for (const cap of Object.values(h.report.capabilities)) assert.deepEqual(cap, {status: 'unknown', evidence: null});
    assert.equal(h.calls, 1); assert.equal(h.cancelled, 1);
});
test('timeout and cancellation settle once and discard late callbacks', () => {
    for (const action of ['timeout', 'stop']) {
        const h = harness(); h[action](); const before = JSON.stringify(h.report);
        h.reply(JSON.stringify(metadata)); h.stop();
        assert.equal(JSON.stringify(h.report), before); assert.equal(h.cancelled, 1);
        assert.equal(h.report.device.modelFamily, 'unknown');
    }
});
test('malformed, oversized, null and denied responses never echo untrusted data', () => {
    for (const raw of ['SECRET', 'x'.repeat(8193), 'null', '[]', '{"returnValue":false,"errorText":"SECRET"}']) {
        const h = harness(); h.reply(raw);
        assert.equal(h.report.device.modelFamily, 'unknown');
        assert.ok(!JSON.stringify(h.report).includes('SECRET'));
    }
});
test('missing bridge and synchronous completion are handled', () => {
    let r;
    api.collect(() => { throw Error('PRIVATE'); }, value => { r = value; });
    assert.equal(r.observations[0].result, 'unavailable');
    let cancelled = 0;
    api.collect((u, p, done) => { done(JSON.stringify(metadata)); return {cancel() { cancelled++; }}; }, value => { r = value; });
    assert.equal(r.device.modelFamily, 'LG C1'); assert.equal(cancelled, 1);
});
test('browser-style timers are never invoked with the timer adapter as receiver', () => {
    const context = {
        setTimeout() { assert.ok(!this || !Object.hasOwn(this, 'set')); return 1; },
        clearTimeout() { assert.ok(!this || !Object.hasOwn(this, 'clear')); }
    };
    vm.runInNewContext(fs.readFileSync('apps/probe-ui/probe.js', 'utf8'), context);
    let report;
    context.MultiViewProbe.collect((uri, params, done) => {
        done(JSON.stringify(metadata)); return {cancel() {}};
    }, value => { report = value; });
    assert.equal(report.observations[0].result, 'ok');
});
test('reject arbitrary metadata values and keep reports independent', () => {
    const r = api.sanitize({returnValue: true, modelName: 'PRIVATE', sdkVersion: '<script>', firmwareVersion: '1.2\nPRIVATE'});
    assert.deepEqual(r.device, api.emptyReport().device);
    r.capabilities.simultaneousHdmiInputs.status = 'verified';
    assert.equal(api.emptyReport().capabilities.simultaneousHdmiInputs.status, 'unknown');
});
test('write synthetic reports for independent schema validation', () => {
    fs.mkdirSync('build/reports', {recursive: true});
    fs.writeFileSync('build/reports/web.report.json', JSON.stringify(api.sanitize(metadata)));
    const h = harness(); h.timeout();
    fs.writeFileSync('build/reports/timeout.report.json', JSON.stringify(h.report));
});
