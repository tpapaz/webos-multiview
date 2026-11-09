(function (root) {
    'use strict';
    var names = ['smpPlayback', 'ndlPlayback', 'multiNativeSurfaces',
        'activeHdmiCapture', 'simultaneousHdmiInputs', 'hdmiAndTunerCoexistence',
        'appSurfaceComposition', 'audioFocusSwitching'];
    var uri = 'luna://com.webos.service.tv.systemproperty/getSystemInfo';
    function emptyReport() {
        var capabilities = {};
        names.forEach(function (name) { capabilities[name] = {status: 'unknown', evidence: null}; });
        return {schemaVersion: 1, probeVersion: '0.1.0', mode: 'passive',
            origin: 'web-metadata', redactionApplied: true,
            device: {modelFamily: 'unknown', webosVersion: 'unknown',
                firmwareVersion: 'unknown', boardFamily: 'unknown'},
            capabilities: capabilities, tests: [], observations: []};
    }
    function version(value) {
        return typeof value === 'string' && /^\d{1,3}(\.\d{1,3}){1,3}$/.test(value) ? value : 'unknown';
    }
    function sanitize(raw) {
        var report = emptyReport();
        if (raw && raw.returnValue === true) {
            // Export family only, never the complete model/region/serial or arbitrary fields.
            if (typeof raw.modelName === 'string' && /^OLED\d{2}C1[A-Z0-9.]*$/.test(raw.modelName) && raw.modelName.length < 40) {
                report.device.modelFamily = 'LG C1';
            }
            report.device.webosVersion = version(raw.sdkVersion);
            report.device.firmwareVersion = version(raw.firmwareVersion);
        }
        return report;
    }
    function collect(transport, done, timers) {
        timers = timers || {
            set: function (fn, ms) { return setTimeout(fn, ms); },
            clear: function (id) { clearTimeout(id); }
        };
        var request = null;
        var finished = false;
        var timeout = null;
        function finish(result, data) {
            if (finished) return;
            finished = true;
            timers.clear(timeout);
            if (request) { try { request.cancel(); } catch (ignored) {} }
            var report = sanitize(data);
            report.observations.push({method: 'luna-getSystemInfo', backend: uri,
                result: result, limitations: 'Metadata only; no media or HDMI test. Missing fields remain unknown.'});
            done(report);
        }
        timeout = timers.set(function () { finish('timeout'); }, 3000);
        try {
            request = transport(uri, {keys: ['modelName', 'sdkVersion', 'firmwareVersion'], subscribe: false}, function (raw) {
                if (typeof raw !== 'string' || raw.length > 8192) { finish('invalid_response'); return; }
                try {
                    var data = JSON.parse(raw);
                    finish(data && data.returnValue === true ? 'ok' : 'unavailable', data);
                } catch (ignored) { finish('invalid_response'); }
            });
            // A mock or bridge may complete synchronously before returning its handle.
            if (finished && request) { try { request.cancel(); } catch (ignored) {} }
        } catch (ignored) { finish('unavailable'); }
        return function () { finish('cancelled'); };
    }
    function bridgeTransport(uriValue, parameters, callback) {
        var bridge = new root.PalmServiceBridge();
        bridge.onservicecallback = callback;
        try { bridge.call(uriValue, JSON.stringify(parameters)); }
        catch (error) { bridge.onservicecallback = function () {}; bridge.cancel(); throw error; }
        return {cancel: function () { bridge.onservicecallback = function () {}; bridge.cancel(); }};
    }
    var api = {emptyReport: emptyReport, sanitize: sanitize, collect: collect, bridgeTransport: bridgeTransport};
    if (typeof module !== 'undefined') module.exports = api;
    else root.MultiViewProbe = api;
}(this));
