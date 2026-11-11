const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const {setTimeout: delay} = require('node:timers/promises');

const root = path.resolve(__dirname, '..');
const targets = {
    endurance: ['phase1-endurance', 'endurance', 'multiview-endurance'],
    sinks: ['phase1-sinks', 'sinks', 'multiview-sinks'],
    smp: ['phase1', 'arm', 'multiview-phase1'],
    ndl: ['phase1-ndl', 'ndl', 'multiview-ndl'],
    mixed: ['phase1-mixed', 'mixed', 'multiview-mixed']
};

function nativeBuild(target) {
    const [source, directory, executable] = targets[target];
    const manifest = JSON.parse(fs.readFileSync(path.join(root, 'native', source, 'appinfo.json')));
    const binary = fs.readFileSync(path.join(root, 'build/phase-1', directory, executable));
    return {id: manifest.id, version: manifest.version, title: manifest.title, executable,
        hash: crypto.createHash('sha256').update(binary).digest('hex')};
}

function command(client, text) {
    return new Promise((resolve, reject) => {
        let channel;
        const timer = setTimeout(() => {
            reject(new Error('App-scoped SSH command timed out'));
            channel?.destroy();
        }, 5000);
        client.exec(text, (error, stream) => {
            if (error) {
                clearTimeout(timer);
                reject(new Error('App-scoped SSH command unavailable'));
                return;
            }
            channel = stream;
            let output = '';
            stream.on('data', data => {
                output += data;
                if (output.length > 512 * 1024) {
                    reject(new Error('App telemetry exceeded its read limit'));
                    stream.destroy();
                }
            });
            stream.on('error', () => {
                clearTimeout(timer);
                reject(new Error('App-scoped SSH stream failed'));
            });
            stream.stderr.resume();
            stream.on('close', code => {
                clearTimeout(timer);
                if (code === 0) resolve(output.trim());
                else reject(new Error('App identity, signal, or telemetry check failed'));
            });
        });
    });
}

async function openNativeApp(client, build) {
    const {id, executable, version, title, hash} = build;
    if (!/^io\.github\.tpapaz\.multiview\.(phase1|ndl|mixed|sinks|endurance)$/.test(id))
        throw new Error('Unknown diagnostic app ID');
    const install = `/media/developer/apps/usr/palm/applications/${id}`;
    const jail = `/var/palm/jail/${id}`;
    const app = `${jail}${install}/${executable}`;
    const remote = text => command(client, text);
    let manifest;
    try {
        manifest = JSON.parse(await remote(`cat '${install}/appinfo.json'`));
    } catch {
        throw new Error(`Install and open ${title} ${version} first`);
    }
    if (manifest.id !== id || manifest.version !== version || manifest.main !== executable)
        throw new Error(`Install and open ${title} ${version} first`);

    const ids = (await remote(`for file in /proc/[0-9]*/exe; do ` +
        `if test "$(readlink "$file" 2>/dev/null)" = '${app}'; then echo "$file"; fi; done`))
        .split('\n').filter(Boolean);
    if (ids.length !== 1 || !/^\/proc\/\d+\/exe$/.test(ids[0]))
        throw new Error(`Open ${title} on the TV`);
    const pid = ids[0].split('/')[2];
    const started = await remote(`awk '{print $22}' /proc/${pid}/stat`);
    if (!/^\d+$/.test(started)) throw new Error('App process identity unavailable');
    const identity = `test "$(readlink /proc/${pid}/exe)" = '${app}' && ` +
        `test "$(awk '{print $22}' /proc/${pid}/stat)" = '${started}'`;
    const hashCheck = `test "$(sha256sum /proc/${pid}/exe | cut -d' ' -f1)" = '${hash}'`;
    await remote(`${identity} && ${hashCheck}`);

    const tracePath = `${jail}/tmp/multiview-phase1-??????" (deleted)"`;
    const fds = (await remote(`${identity} && for file in /proc/${pid}/fd/[0-9]*; do ` +
        `case "$(readlink "$file" 2>/dev/null)" in ${tracePath}) echo "$file";; esac; done`))
        .split('\n').filter(Boolean);
    if (fds.length !== 1 || !new RegExp(`^/proc/${pid}/fd/\\d+$`).test(fds[0]))
        throw new Error('App telemetry descriptor unavailable');
    const [descriptor] = fds;
    const signal = name => {
        const allowed = id.endsWith('.endurance') ? ['USR1', 'USR2', 'HUP', 'TERM'] : id.endsWith('.ndl') ? ['USR1', 'TERM'] : ['USR1', 'USR2', 'TERM'];
        if (!allowed.includes(name)) throw new Error('Unsupported app control');
        return remote(`${identity} && ${hashCheck} && kill -${name} ${pid}`);
    };
    return {
        identityToken: crypto.createHash('sha256').update(`${pid}:${started}:${hash}`).digest('hex'),
        trace: () => remote(`${identity} && case "$(readlink ${descriptor})" in ` +
            `${tracePath}) cat ${descriptor};; *) exit 1;; esac`),
        signal,
        stop: async () => {
            await signal('TERM');
            const deadline = Date.now() + 3500;
            do {
                if (!await remote(`if ${identity}; then echo running; fi`)) return;
                await delay(250);
            } while (Date.now() < deadline);
            throw new Error('The test app is still running');
        }
    };
}

// Fixed app-only launch for explicitly requested repeatability runs.
async function launchEnduranceApp(client, build) {
    if (build.id !== 'io.github.tpapaz.multiview.endurance' || build.executable !== 'multiview-endurance' || !/^[a-f0-9]{64}$/.test(build.hash))
        throw new Error('Unknown repeatability app');
    const install = `/media/developer/apps/usr/palm/applications/${build.id}`;
    const manifest = JSON.parse(await command(client, `cat '${install}/appinfo.json'`));
    if (manifest.id !== build.id || manifest.version !== build.version || manifest.main !== build.executable)
        throw new Error('Installed repeatability build mismatch');
    await command(client, `test "$(sha256sum '${install}/${build.executable}' | cut -d' ' -f1)" = '${build.hash}'`);
    const payload = '{"id":"io.github.tpapaz.multiview.endurance"}';
    const reply = JSON.parse(await command(client, `luna-send -n 1 luna://com.webos.applicationManager/launch '${payload}'`));
    if (reply.returnValue !== true) throw new Error('Repeatability app launch rejected');
}

function saveReport(name, build, rows, details = {}) {
    const report = path.join(root, 'build/reports', name + '.json');
    fs.mkdirSync(path.dirname(report), {recursive: true});
    fs.writeFileSync(report, JSON.stringify({schemaVersion: 1, appId: build.id, appVersion: build.version, binarySha256: build.hash, rows, ...details}, null, 2) + '\n');
}

module.exports = {nativeBuild, openNativeApp, saveReport, command, launchEnduranceApp};
