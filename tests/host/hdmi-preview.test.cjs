const assert = require('node:assert/strict');
const fs = require('node:fs');
const {test} = require('node:test');
const vm = require('node:vm');

const script = fs.readFileSync('apps/phase2-hdmi-preview/preview.js', 'utf8');

function setup() {
    let now = 0;
    let pending;
    let source;
    let rejectPlay;
    const calls = [];
    const video = new EventTarget();
    Object.assign(video, {
        appendChild(node) { source = node; },
        removeChild(node) { assert.equal(node, source); source = undefined; calls.push('detach'); },
        load() { calls.push(source ? 'load source' : 'reset'); },
        play() { calls.push('play'); return {then(resolve, reject) { rejectPlay = reject; }}; },
        pause() { calls.push('pause'); }
    });
    const action = Object.assign(new EventTarget(), {focus() {}});
    const status = {};
    const document = Object.assign(new EventTarget(), {
        getElementById(id) { return {action, status, preview: video}[id]; },
        createElement() { return new EventTarget(); }
    });
    const window = Object.assign(new EventTarget(), {close() { calls.push('close'); }});
    vm.runInNewContext(script, {
        document, window, performance: {now: () => now},
        setTimeout(callback, ms) { pending = {at: now + ms, callback}; return pending; },
        clearTimeout(timer) { if (timer === pending) pending = undefined; }
    });
    return {
        click() { action.dispatchEvent(new Event('click')); },
        playing() { video.dispatchEvent(new Event('playing')); },
        hide() { document.hidden = true; document.dispatchEvent(new Event('visibilitychange')); },
        reject() { rejectPlay(); },
        advance(ms, runTimer = true) {
            now += ms;
            if (runTimer && pending && now >= pending.at) pending.callback();
        },
        get source() { return source; }, calls, status
    };
}

test('opens only HDMI 4 after opt-in and unloads it after the observation window', () => {
    const app = setup();
    assert.deepEqual(app.calls, []);
    app.click();
    assert.equal(app.source.type, 'service/webos-external');
    assert.equal(app.source.src, 'ext://hdmi:4');
    app.advance(2900);
    app.playing();
    app.advance(7999);
    assert.deepEqual(app.calls, ['load source', 'play']);
    app.advance(1);
    assert.deepEqual(app.calls, ['load source', 'play', 'pause', 'detach', 'reset']);
    assert.equal(app.status.textContent, 'Observation ended.');
});

test('refuses a playing event that arrives after the strict startup deadline', () => {
    const app = setup();
    app.click();
    app.advance(3000, false);
    app.playing();
    app.reject();
    assert.deepEqual(app.calls, ['load source', 'play', 'pause', 'detach', 'reset']);
    assert.match(app.status.textContent, /No playing event/);
});

test('unloads once on visibility loss and exits when clicked again', () => {
    const app = setup();
    app.click();
    app.hide();
    app.playing();
    app.reject();
    app.click();
    assert.deepEqual(app.calls, ['load source', 'play', 'pause', 'detach', 'reset', 'close']);
    assert.equal(app.status.textContent, 'Preview stopped.');
});
