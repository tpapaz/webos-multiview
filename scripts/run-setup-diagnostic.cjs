const {main} = require('./run-hdmi-picture.cjs');
const {configuration} = require('./setup-diagnostic-runner.cjs');
if (require.main === module) main(process.argv.slice(2), configuration).catch(() => {
    console.error('Setup-only controller stopped; inspect saved stages. No automatic retry.'); process.exitCode = 1;
});
