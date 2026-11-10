(function () {
    'use strict';
    var api = window.MultiViewProbe;
    var run = document.getElementById('run');
    var cancel = document.getElementById('cancel');
    var reportView = document.getElementById('report');
    var stop = null;
    var alive = true;
    function show(report) { document.getElementById('report').textContent = JSON.stringify(report, null, 2); }
    function cleanup() { alive = false; if (stop) stop(); stop = null; }
    function close() { cleanup(); window.close(); }
    show(api.emptyReport());
    run.onclick = function () {
        if (stop) return;
        run.disabled = true; cancel.disabled = false;
        document.getElementById('status').textContent = 'Reading metadata (3 second timeout)…';
        var completed = false;
        var handle = api.collect(api.bridgeTransport, function (report) {
            completed = true; stop = null;
            if (!alive) return;
            show(report); run.disabled = false; cancel.disabled = true;
            document.getElementById('status').textContent = 'Metadata query: ' + report.observations[0].result + '. HDMI capabilities remain unknown.';
        });
        if (!completed) stop = handle;
    };
    cancel.onclick = function () { if (stop) stop(); };
    document.getElementById('export').onclick = function () {
        try {
            var url = URL.createObjectURL(new Blob([document.getElementById('report').textContent], {type: 'application/json'}));
            var link = document.createElement('a'); link.href = url; link.download = 'multiview.report.json';
            document.body.appendChild(link); link.click(); document.body.removeChild(link);
            setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
        } catch (ignored) { document.getElementById('status').textContent = 'Download unavailable; use Web Inspector export instructions.'; }
    };
    document.getElementById('close').onclick = close;
    document.addEventListener('keydown', function (event) {
        if (event.keyCode === 461 || event.keyCode === 27) { event.preventDefault(); close(); return; }
        if (event.keyCode >= 37 && event.keyCode <= 40) {
            event.preventDefault();
            if (document.activeElement === reportView) {
                if (event.keyCode === 38 || event.keyCode === 40) {
                    reportView.scrollTop += event.keyCode === 38 ? -120 : 120;
                } else { run.focus(); }
                return;
            }
            if (event.keyCode === 40) { reportView.focus(); return; }
            var buttons = Array.prototype.filter.call(document.querySelectorAll('button'), function (button) { return !button.disabled; });
            var index = buttons.indexOf(document.activeElement);
            var step = event.keyCode === 37 || event.keyCode === 38 ? -1 : 1;
            buttons[(index + step + buttons.length) % buttons.length].focus();
        }
    });
    document.addEventListener('visibilitychange', function () { if (document.hidden && stop) stop(); });
    window.addEventListener('pagehide', cleanup);
    run.focus();
}());
