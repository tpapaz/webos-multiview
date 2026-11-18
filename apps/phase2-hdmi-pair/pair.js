(function () {
    'use strict';

    var first = {port: 4, video: document.getElementById('first')};
    var second = {port: 1, video: document.getElementById('second')};
    var action = document.getElementById('action');
    var status = document.getElementById('status');
    var trace = document.getElementById('trace');
    var startMs = 3000;
    var overlapMs = 5000;
    var firstOnlyMs = 2000;
    var secondStartMs = 29000;
    var secondRunMs = startMs + overlapMs + firstOnlyMs;
    var trialMs = secondStartMs + secondRunMs;
    var traceKey = 'hdmi-pair-0.1.3-last-trial';
    var events = [];
    var openedAt = performance.now();
    var deadline;
    var phase = 'idle';
    var startupDeadline;
    var phaseTimer;
    var overallTimer;

    try { trace.textContent = window.localStorage.getItem(traceKey) || ''; }
    catch (error) { trace.textContent = 'Saved log unavailable.'; }

    function record(event) {
        if (events.length >= 24) return;
        events.push(event + '@' + Math.round(performance.now() - openedAt));
        var line = events.join(' · ');
        // Keep the last actual trial visible through idle opens and stale relaunches.
        if (deadline !== undefined) {
            trace.textContent = line;
            try { window.localStorage.setItem(traceKey, line); }
            catch (error) { /* The on-screen trace remains available. */ }
        }
        console.info('HDMI_PAIR_TRACE ' + event + ' ' + Math.round(performance.now() - openedAt));
    }

    function unload(input) {
        var source = input.source;
        if (!source) return true;
        input.source = null;
        try {
            try { input.video.pause(); }
            finally {
                input.video.removeChild(source);
                input.video.load();
            }
            record('unloaded-' + input.port);
            return true;
        } catch (error) {
            record('unload-error-' + input.port);
            return false;
        }
    }

    function finish(message, reason) {
        if (phase === 'finished') return;
        var started = phase !== 'idle';
        phase = 'finished';
        clearTimeout(overallTimer);
        clearTimeout(phaseTimer);
        if (started) record(reason);
        var secondClosed = unload(second);
        var firstClosed = unload(first);
        status.textContent = secondClosed && firstClosed ? message : 'Preview cleanup failed. Close the app.';
        action.textContent = 'Close app';
    }

    function open(input, starting) {
        phase = starting;
        startupDeadline = performance.now() + startMs;
        action.textContent = 'Stop preview';
        status.textContent = 'Opening HDMI ' + input.port + '…';
        var source = document.createElement('source');
        input.source = source;
        source.type = 'service/webos-external';
        source.src = 'ext://hdmi:' + input.port;
        input.video.muted = true;
        function failed(reason) {
            if (input.source === source) finish('HDMI ' + input.port + ' reported a playback error.', reason + '-' + input.port);
        }
        source.addEventListener('error', function () { failed('source-error'); });
        input.video.appendChild(source);
        function timeout() { finish('HDMI ' + input.port + ' startup timed out.', 'startup-timeout-' + input.port); }
        phaseTimer = setTimeout(timeout, startMs);
        try {
            record('load-' + input.port);
            input.video.load();
            if (phase !== starting) return;
            if (performance.now() >= startupDeadline) { timeout(); return; }
            record('play-' + input.port);
            var play = input.video.play();
            if (play && typeof play.then === 'function') play.then(null, function () { failed('play-rejected'); });
        } catch (error) { failed('media-call-error'); }
    }

    function secondStartExpired() { finish('HDMI 1 start window expired.', 'start-window-expired-1'); }

    function showSecondStart() {
        if (phase !== 'first-ready') return;
        var remaining = deadline - performance.now() - secondRunMs;
        if (remaining <= 0) { secondStartExpired(); return; }
        status.textContent = 'Press OK when HDMI 4 is moving. HDMI 1 start ends in ' + Math.ceil(remaining / 1000) + ' s.';
        phaseTimer = setTimeout(showSecondStart, Math.min(remaining, 1000));
    }

    first.video.addEventListener('playing', function () {
        if (phase !== 'starting-first') return;
        if (performance.now() >= startupDeadline) { finish('HDMI 4 startup timed out.', 'startup-timeout-4'); return; }
        clearTimeout(phaseTimer);
        record('playing-4');
        phase = 'first-ready';
        action.textContent = 'Start HDMI 1';
        showSecondStart();
    });
    second.video.addEventListener('playing', function () {
        if (phase === 'starting-trace') {
            if (performance.now() >= startupDeadline) { finish('HDMI 1 startup timed out.', 'startup-timeout-1'); return; }
            clearTimeout(phaseTimer);
            record('playing-1');
            phase = 'tracing';
            status.textContent = 'Watching HDMI 1 for eight seconds. Back closes the probe.';
            phaseTimer = setTimeout(function () { finish('Trace ended.', 'observation-ended'); }, 8000);
            return;
        }
        if (phase !== 'starting-second') return;
        var now = performance.now();
        if (now >= startupDeadline || now + overlapMs + firstOnlyMs >= deadline) {
            finish('HDMI 1 started too late for the observation.', 'late-playing-1');
            return;
        }
        clearTimeout(phaseTimer);
        record('playing-1');
        phase = 'observing';
        status.textContent = 'Watch both windows. Press Back if either feed stops moving.';
        phaseTimer = setTimeout(function () {
            phase = 'first-after-close';
            if (!unload(second)) { finish('HDMI 1 cleanup failed.', 'second-cleanup-failed'); return; }
            status.textContent = 'HDMI 1 closed. Check that HDMI 4 keeps moving.';
            phaseTimer = setTimeout(function () { finish('Observation ended.', 'observation-ended'); }, firstOnlyMs);
        }, overlapMs);
    });
    [first, second].forEach(function (input) {
        input.video.addEventListener('loadeddata', function () {
            if (input.source && !input.loaded) { input.loaded = true; record('loadeddata-' + input.port); }
        });
        input.video.addEventListener('error', function () {
            if (input.source) finish('HDMI ' + input.port + ' reported a media error.', 'media-error-' + input.port);
        });
    });

    document.addEventListener('webOSRelaunch', function (event) {
        var params = event.detail;
        if (phase !== 'ready' || !params || params.armHdmiPair !== true || document.hidden) return;
        var issuedAt = params.issuedAtMs;
        var age = Date.now() - issuedAt;
        if (typeof issuedAt !== 'number' || !isFinite(age) || age < 0 || age >= 3000) {
            finish('Trial launch expired.', 'arm-expired');
            return;
        }
        deadline = performance.now() + trialMs - age;
        record('armed');
        overallTimer = setTimeout(function () { finish('Trial time expired.', 'overall-timeout'); }, trialMs - age);
        if (params.traceHdmi1 === true) open(second, 'starting-trace');
        else open(first, 'starting-first');
    });

    function close() { finish('Preview stopped.', 'back'); window.close(); }
    action.addEventListener('click', function () {
        if (phase === 'finished') { close(); return; }
        if (document.hidden) return;
        if (phase === 'idle') {
            phase = 'ready';
            record('owner-ready');
            action.textContent = 'Waiting for launch';
            status.textContent = 'Ready. Wait for the launch cue.';
            return;
        }
        if (phase === 'ready') return;
        var remaining = deadline - performance.now();
        if (phase === 'first-ready') {
            record('owner-start-1');
            if (remaining <= secondRunMs) { secondStartExpired(); return; }
            clearTimeout(phaseTimer);
            open(second, 'starting-second');
        } else finish('Preview stopped.', 'owner-stop');
    });
    document.addEventListener('keydown', function (event) {
        if (event.keyCode === 461 || event.keyCode === 27) { event.preventDefault(); close(); }
        if (event.repeat && (event.keyCode === 13 || event.keyCode === 32)) event.preventDefault();
    });
    document.addEventListener('visibilitychange', function () { if (document.hidden) finish('Preview stopped.', 'hidden'); });
    window.addEventListener('pagehide', function () { finish('Preview stopped.', 'pagehide'); });
    action.focus();
}());
