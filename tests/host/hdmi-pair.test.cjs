const assert = require('node:assert/strict');
const fs = require('node:fs');
const {test} = require('node:test');
const vm = require('node:vm');

const code = fs.readFileSync('apps/phase2-hdmi-pair/pair.js', 'utf8');

function probe(context, saved = new Map()) {
    context.mock.timers.enable({apis: ['setTimeout', 'Date']});
    const events = [];
    const action = Object.assign(new EventTarget(), {focus() {}});
    const status = {};
    const trace = {};
    const elements = {action, status, trace};
    for (const name of ['first', 'second']) {
        elements[name] = Object.assign(new EventTarget(), {
            appendChild(source) { this.source = source; },
            removeChild(source) {
                assert.equal(source, this.source);
                this.source = null;
                events.push(`${name} removed`);
            },
            load() {}, pause() {},
            play() { events.push(this.source.src); }
        });
    }
    const document = Object.assign(new EventTarget(), {
        getElementById: id => elements[id],
        createElement: () => new EventTarget()
    });
    const window = Object.assign(new EventTarget(), {
        close() { events.push('closed'); },
        localStorage: {getItem: key => saved.get(key), setItem: (key, value) => saved.set(key, value)}
    });
    vm.runInNewContext(code, {document, window, performance: {now: Date.now}, Date, setTimeout, clearTimeout,
        console: {info() {}}});
    return {
        events, status, trace, saved,
        press() { action.dispatchEvent(new Event('click')); },
        arm(age = 0, traceHdmi1 = false) {
            document.dispatchEvent(new CustomEvent('webOSRelaunch', {
                detail: {armHdmiPair: true, issuedAtMs: Date.now() - age, traceHdmi1}
            }));
        },
        playing(key) { elements[key].dispatchEvent(new Event('playing')); },
        hide() { document.hidden = true; document.dispatchEvent(new Event('visibilitychange')); }
    };
}

test('connector trace plays only HDMI 1 and releases it after eight seconds', context => {
    const app = probe(context);
    app.press();
    app.arm(0, true);
    app.playing('second');
    context.mock.timers.tick(7999);
    assert.deepEqual(app.events, ['ext://hdmi:1']);
    context.mock.timers.tick(1);
    assert.deepEqual(app.events, ['ext://hdmi:1', 'second removed']);
});

test('requires separate HDMI 1 opt-in and keeps HDMI 4 open for two seconds after HDMI 1 closes', context => {
    const app = probe(context);
    app.press();
    app.arm();
    app.playing('first');
    context.mock.timers.tick(28000);
    assert.deepEqual(app.events, ['ext://hdmi:4']);
    assert.match(app.status.textContent, /ends in 1 s/);
    app.press();
    app.playing('second');
    context.mock.timers.tick(5000);
    assert.deepEqual(app.events, ['ext://hdmi:4', 'ext://hdmi:1', 'second removed']);
    context.mock.timers.tick(1999);
    assert.equal(app.events.at(-1), 'second removed');
    context.mock.timers.tick(1);
    assert.equal(app.events.at(-1), 'first removed');
});

test('refuses HDMI 1 when the observation will not fit and unloads HDMI 4', context => {
    const app = probe(context);
    app.press();
    app.arm();
    app.playing('first');
    context.mock.timers.tick(29000);
    assert.match(app.trace.textContent, /start-window-expired-1/);
    app.press();
    assert.deepEqual(app.events, ['ext://hdmi:4', 'first removed', 'closed']);
});

test('hiding with both inputs open unloads each once and cancels overlap', context => {
    const app = probe(context);
    app.press();
    app.arm();
    app.playing('first');
    app.press();
    app.playing('second');
    app.hide();
    context.mock.timers.tick(16000);
    assert.deepEqual(app.events, ['ext://hdmi:4', 'ext://hdmi:1', 'second removed', 'first removed']);
});

test('allows the owner to wait before OK and logs a media timeout after a fresh arm', context => {
    const app = probe(context);
    context.mock.timers.tick(40000);
    app.arm();
    assert.deepEqual(app.events, []);
    app.press();
    assert.deepEqual(app.events, []);
    app.arm();
    context.mock.timers.tick(2999);
    assert.deepEqual(app.events, ['ext://hdmi:4']);
    context.mock.timers.tick(1);
    assert.deepEqual(app.events, ['ext://hdmi:4', 'first removed']);
    assert.match(app.trace.textContent, /owner-ready@40000.*armed@40000.*load-4@40000.*play-4@40000.*startup-timeout-4@43000.*unloaded-4@43000/);
    assert.equal(app.saved.get('hdmi-pair-0.1.3-last-trial'), app.trace.textContent);
});

test('rejects a stale arm before opening any source', context => {
    const key = 'hdmi-pair-0.1.3-last-trial';
    const saved = new Map([[key, 'previous completed trial']]);
    const app = probe(context, saved);
    app.press();
    app.arm(3000);
    app.arm();
    assert.deepEqual(app.events, []);
    assert.equal(app.status.textContent, 'Trial launch expired.');
    assert.equal(app.trace.textContent, 'previous completed trial');
    assert.equal(saved.get(key), app.trace.textContent);
});
