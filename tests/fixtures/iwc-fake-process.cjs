// Fixed local processes only. No device commands, URI arguments or networking.
const fs = require('node:fs');
const path = require('node:path');
const {spawn} = require('node:child_process');
const {SCENARIOS} = require('./iwc-synthetic-evidence.cjs');
const [role, scenario, directory, operation] = process.argv.slice(2);
if (process.platform !== 'linux' || !SCENARIOS.includes(scenario) || !['launcher', 'actor', 'worker'].includes(role)) process.exit(64);
const stat = fs.lstatSync(directory);
if (!stat.isDirectory() || stat.uid !== process.getuid() || (stat.mode & 0o777) !== 0o700) process.exit(64);
if (role === 'launcher') {
    const child = spawn(process.execPath, [path.resolve(__dirname, '../../scripts/iwc-local-process-harness.cjs'),
        '--local-supervisor', scenario, directory], {detached: true, stdio: ['pipe', 'pipe', 'ignore']});
    child.stdout.resume();
    child.stdin.on('error', () => {});
    process.on('SIGUSR1', () => child.stdout.destroy()); // Lose status pipe without killing supervisor.
    child.on('close', code => process.exit(code ?? 1));
} else if (role === 'actor') {
    const hold = setInterval(() => {}, 1000);
    process.on('disconnect', () => {}); // Supervisor must own explicit cleanup.
    if (scenario === 'cleanup_hang') process.on('SIGTERM', () => {});
    process.on('message', message => {
        if (message === 'ready' && scenario !== 'host_loss_before_action') process.send('act');
        if (message === 'action_ack') {
            if (!['actor_loss', 'host_loss', 'status_loss', 'supervisor_loss', 'supervisor_hang'].includes(scenario)) {
                setTimeout(() => process.connected && process.send('cancel'), 120);
            }
        }
    });
} else {
    if (!['action', 'revalidate', 'reset'].includes(operation)) process.exit(64);
    const hangs = (scenario === 'action_hang' && operation === 'action') ||
        (scenario === 'revalidate_hang' && operation === 'revalidate') ||
        (scenario === 'reset_hang' && operation === 'reset');
    if (hangs) {
        process.on('SIGTERM', () => {});
        setInterval(() => {}, 1000);
    } else if (scenario === 'partial_reply' && operation === 'action') {
        process.stdout.write('{"accepted":');
    } else {
        process.stdout.write('{"accepted":true}\n');
        if (scenario === 'delayed_exit' && operation === 'action') setTimeout(() => {}, 300);
    }
}
