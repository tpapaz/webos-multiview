(function () {
    'use strict';

    var clips = {a: document.getElementById('clip-a'), b: document.getElementById('clip-b')};
    var status = document.getElementById('status');
    var clock = {a: document.getElementById('time-a'), b: document.getElementById('time-b')};
    var buttons = Array.prototype.slice.call(document.querySelectorAll('nav button'));
    var active = null;
    var result = null;
    var startupMs = 8000;
    var observationMs = 3000;

    function frames(video) {
        if (typeof video.webkitDecodedFrameCount === 'number') return video.webkitDecodedFrameCount;
        if (typeof video.getVideoPlaybackQuality === 'function') return video.getVideoPlaybackQuality().totalVideoFrames;
        return null;
    }

    function snapshot(key) {
        var video = clips[key];
        var time = Math.round(video.currentTime * 1000);
        clock[key].textContent = (time / 1000).toFixed(2) + ' s';
        return {timeMs: time, frames: frames(video), paused: video.paused,
            readyState: video.readyState, ended: video.ended, error: video.error ? video.error.code : 0};
    }

    function finish(outcome) {
        if (!active) return;
        var run = active;
        active = null;
        clearInterval(run.timer);
        result = {mode: run.mode, outcome: outcome, bRequestedMs: run.requested.b ? run.requested.b - run.started : null,
            jointIntervals: run.jointIntervals, jointProgressMs: run.jointProgressMs, samples: run.samples};
        ['a', 'b'].forEach(function (key) {
            clips[key].pause();
            clips[key].removeAttribute('src');
            clips[key].load();
        });
        status.textContent = 'Result: ' + outcome.replace(/_/g, ' ') + '.';
    }

    function request(run, key, now) {
        run.requested[key] = now;
        var clip = clips[key];
        clip.muted = true;
        clip.src = 'clip-' + key + '.mp4';
        var play;
        try { play = clip.play(); }
        catch (error) { finish('play_rejected'); return; }
        if (play && typeof play.catch === 'function') {
            play.catch(function () { if (active === run) finish('play_rejected'); });
        }
    }

    function sample(run) {
        if (active !== run) return;
        var now = Date.now();
        var row = {elapsedMs: now - run.started, a: snapshot('a'), b: snapshot('b')};
        var previous = run.samples[run.samples.length - 1];
        run.samples.push(row);
        var first = run.mode === 'b' ? 'b' : 'a';
        var last = run.mode === 'both' ? 'b' : first;
        if (row[first].error || (run.requested[last] && row[last].error)) { finish('media_error'); return; }

        if (run.firstPlaying === null && row[first].timeMs > 0 && !row[first].paused) run.firstPlaying = now;
        if (run.firstPlaying === null && now - run.started >= startupMs) { finish('first_clip_timeout'); return; }
        if (run.mode === 'both' && !run.requested.b && run.firstPlaying !== null && now - run.firstPlaying >= 2000) {
            request(run, 'b', now);
        }
        if (!run.requested[last]) return;
        if (run.observation === null && row[last].timeMs > 0 && !row[last].paused) run.observation = row;
        if (run.observation === null) {
            if (now - run.requested[last] >= startupMs) finish('second_clip_timeout');
            return;
        }
        if (run.mode === 'both' && previous && previous.elapsedMs >= run.observation.elapsedMs &&
            !row.a.paused && !row.b.paused && row.a.timeMs - previous.a.timeMs >= 50 &&
            row.b.timeMs - previous.b.timeMs >= 50) {
            run.jointIntervals++;
            run.jointProgressMs += Math.min(row.a.timeMs - previous.a.timeMs, row.b.timeMs - previous.b.timeMs,
                row.elapsedMs - previous.elapsedMs);
        }
        if (row.elapsedMs - run.observation.elapsedMs >= observationMs) {
            var advancing = row[last].timeMs - run.observation[last].timeMs >= 1500;
            if (run.mode === 'both') advancing = advancing && run.jointIntervals >= 2 && run.jointProgressMs >= 1500 &&
                row.a.timeMs - run.observation.a.timeMs >= 1500;
            finish(advancing ? (run.mode === 'both' ? 'both_clocks_advanced' : 'clip_clock_advanced') : 'clock_stalled');
        }
    }

    function start(mode) {
        if (active || (mode !== 'a' && mode !== 'b' && mode !== 'both')) return false;
        result = null;
        var now = Date.now();
        var run = {mode: mode, started: now, firstPlaying: null, observation: null,
            requested: {}, jointIntervals: 0, jointProgressMs: 0, samples: []};
        active = run;
        status.textContent = 'Running ' + (mode === 'both' ? 'A, then B' : 'clip ' + mode.toUpperCase()) + '…';
        run.timer = setInterval(function () { sample(run); }, 250);
        request(run, mode === 'b' ? 'b' : 'a', now);
        return true;
    }

    function stop() { finish('cancelled'); }
    function close() { stop(); window.close(); }

    document.getElementById('run-a').onclick = function () { start('a'); };
    document.getElementById('run-b').onclick = function () { start('b'); };
    document.getElementById('run-both').onclick = function () { start('both'); };
    document.getElementById('stop').onclick = stop;
    document.getElementById('close').onclick = close;
    document.addEventListener('keydown', function (event) {
        if (event.keyCode === 461 || event.keyCode === 27) { event.preventDefault(); close(); return; }
        if (event.keyCode === 37 || event.keyCode === 39) {
            event.preventDefault();
            var index = buttons.indexOf(document.activeElement);
            buttons[(index + buttons.length + (event.keyCode === 37 ? -1 : 1)) % buttons.length].focus();
        }
    });
    window.addEventListener('pagehide', stop);
    document.addEventListener('visibilitychange', function () { if (document.hidden) stop(); });
    buttons[0].focus();
    window.multiviewBrowserProbe = {id: 'io.github.tpapaz.multiview.browser', version: '0.1.0',
        start: start, stop: stop, result: function () { return result; }};
}());
