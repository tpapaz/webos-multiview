const fs = require('node:fs');
const net = require('node:net');
const path = require('node:path');
const {connect} = require('./phase1-device.cjs');

const root = path.resolve(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'apps/phase1-browser/appinfo.json')));
const appUrl = `file:///media/developer/apps/usr/palm/applications/${manifest.id}/index.html`;
const probe = 'window.multiviewBrowserProbe';
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));

async function run() {
    const ssh = await connect(process.argv[2]);
    const sockets = new Set();
    let websocket;
    let verified = false;
    let started = false;
    let sequence = 0;
    const pending = new Map();
    const runs = [];

    // Only forward the TV's existing Web Inspector to an ephemeral loopback port.
    const tunnel = net.createServer(socket => {
        sockets.add(socket);
        socket.on('close', () => sockets.delete(socket));
        socket.on('error', () => socket.destroy());
        ssh.forwardOut('127.0.0.1', 0, '127.0.0.1', 9998, (error, stream) => {
            if (error || socket.destroyed) { stream?.destroy(); socket.destroy(); return; }
            stream.on('error', () => socket.destroy());
            socket.on('close', () => stream.destroy());
            stream.on('close', () => socket.destroy());
            socket.pipe(stream).pipe(socket);
        });
    });

    function evaluate(expression) {
        return new Promise((resolve, reject) => {
            if (websocket?.readyState !== WebSocket.OPEN) { reject(new Error('Inspector disconnected')); return; }
            const id = ++sequence;
            const timer = setTimeout(() => {
                pending.delete(id);
                reject(new Error('Inspector evaluation timed out'));
            }, 4000);
            pending.set(id, reply => {
                clearTimeout(timer);
                if (reply.error || reply.result.exceptionDetails) reject(new Error('App evaluation failed'));
                else resolve(reply.result.result.value);
            });
            websocket.send(JSON.stringify({id, method: 'Runtime.evaluate',
                params: {expression, returnByValue: true, userGesture: true}}));
        });
    }

    try {
        await new Promise((resolve, reject) => {
            tunnel.once('error', () => reject(new Error('Could not open the loopback SSH tunnel')));
            tunnel.listen(0, '127.0.0.1', resolve);
        });
        const port = tunnel.address().port;
        const response = await fetch(`http://127.0.0.1:${port}/json/list`, {signal: AbortSignal.timeout(4000)});
        if (!response.ok) throw new Error('TV Web Inspector is unavailable');
        const targets = (await response.json()).filter(page => page.type === 'page' && page.url === appUrl);
        if (targets.length !== 1) throw new Error('Open one copy of MultiView Browser Playback Test on the TV');
        const socketUrl = new URL(targets[0].webSocketDebuggerUrl);
        if (socketUrl.protocol !== 'ws:' || !/^\/devtools\/page\/[a-z0-9-]+$/i.test(socketUrl.pathname))
            throw new Error('Unexpected inspector WebSocket target');
        websocket = new WebSocket(`ws://127.0.0.1:${port}${socketUrl.pathname}`);
        await new Promise((resolve, reject) => {
            const timer = setTimeout(() => reject(new Error('Inspector socket timed out')), 4000);
            websocket.onopen = () => { clearTimeout(timer); resolve(); };
            websocket.onerror = () => { clearTimeout(timer); reject(new Error('Inspector socket failed')); };
        });
        websocket.onmessage = message => {
            const reply = JSON.parse(message.data);
            const receive = pending.get(reply.id);
            if (receive) { pending.delete(reply.id); receive(reply); }
        };
        verified = await evaluate(`${probe} && ${probe}.id === ${JSON.stringify(manifest.id)} && ` +
            `${probe}.version === ${JSON.stringify(manifest.version)}`);
        if (!verified) throw new Error('Inspector page does not match the browser test package');

        for (const mode of ['a', 'b', 'both']) {
            if (mode === 'both' && runs.some(result => result.outcome !== 'clip_clock_advanced')) break;
            started = await evaluate(`${probe}.start(${JSON.stringify(mode)})`);
            if (!started) {
                const state = await evaluate(`({visibility:document.visibilityState, ` +
                    `status:document.getElementById('status').textContent, ` +
                    `a:document.getElementById('clip-a').currentTime, b:document.getElementById('clip-b').currentTime})`);
                throw new Error(`Browser test busy (${state.visibility}, ${state.status} A=${state.a}s B=${state.b}s)`);
            }
            const deadline = Date.now() + 23000;
            let result;
            while (Date.now() < deadline && !result) {
                await pause(500);
                result = await evaluate(`${probe}.result()`);
            }
            if (!result) throw new Error('Browser test did not return a result');
            if (result.mode !== mode || !Array.isArray(result.samples)) throw new Error('Unexpected browser test result');
            started = false;
            runs.push(result);
            console.log(`${mode}: ${result.outcome}`);
            await pause(500);
        }
        if (runs.length === 2) console.log('Dual playback skipped after a failed single-clip baseline');
    } finally {
        if (verified && started) {
            try { await evaluate(`${probe}.stop()`); }
            catch { console.error('Inspector lost access. The app’s own playback timeout remains active.'); }
        }
        websocket?.close();
        for (const socket of sockets) socket.destroy();
        tunnel.close();
        ssh.end();
        if (runs.length) {
            const report = path.join(root, `build/reports/c1-phase1-browser-${manifest.version}.json`);
            fs.mkdirSync(path.dirname(report), {recursive: true});
            fs.writeFileSync(report, JSON.stringify({appVersion: manifest.version, runs}, null, 2) + '\n');
        }
    }
}

run().catch(error => { console.error(error.message); process.exitCode = 1; });
