(function () {
    'use strict';

    var video = document.getElementById('preview');
    var action = document.getElementById('action');
    var status = document.getElementById('status');
    var startupMs = 3000;
    var observationMs = 8000;
    var phase = 'idle';
    var source;
    var timer;
    var startupDeadline;

    function finish(message) {
        if (phase !== 'starting' && phase !== 'observing') return;
        phase = 'finished';
        clearTimeout(timer);
        try {
            try {
                video.pause();
            } finally {
                video.removeChild(source);
                video.load();
            }
        } catch (error) {
            message = 'Preview cleanup failed. Close the app.';
        }
        action.textContent = 'Close app';
        status.textContent = message;
    }

    function startupTimeout() { finish('No playing event within 3 seconds.'); }
    function mediaError() { finish('The browser reported a media error.'); }
    function playRejected() { finish('The browser rejected playback.'); }
    function cancel() { finish('Preview stopped.'); }

    video.addEventListener('playing', function () {
        if (phase !== 'starting') return;
        if (performance.now() >= startupDeadline) {
            startupTimeout();
            return;
        }
        phase = 'observing';
        clearTimeout(timer);
        status.textContent = 'Playing event received. Check for moving picture and sound.';
        timer = setTimeout(function () { finish('Observation ended.'); }, observationMs);
    });
    video.addEventListener('error', mediaError);

    function start() {
        if (document.hidden) return;
        phase = 'starting';
        startupDeadline = performance.now() + startupMs;
        action.textContent = 'Stop preview';
        status.textContent = 'Opening HDMI 4…';
        source = document.createElement('source');
        source.type = 'service/webos-external';
        source.src = 'ext://hdmi:4';
        source.addEventListener('error', mediaError);
        video.appendChild(source);
        timer = setTimeout(startupTimeout, startupMs);
        try {
            video.load();
            if (phase !== 'starting') return;
            if (performance.now() >= startupDeadline) {
                startupTimeout();
                return;
            }
            var played = video.play();
            if (played && typeof played.then === 'function') played.then(null, playRejected);
        } catch (error) {
            playRejected();
        }
    }

    function close() {
        cancel();
        window.close();
    }

    action.addEventListener('click', function () {
        if (phase === 'idle') start();
        else if (phase === 'finished') close();
        else cancel();
    });
    document.addEventListener('keydown', function (event) {
        if (event.keyCode === 461 || event.keyCode === 27) {
            event.preventDefault();
            close();
        }
    });
    document.addEventListener('visibilitychange', function () { if (document.hidden) cancel(); });
    window.addEventListener('pagehide', cancel);
    action.focus();
}());
