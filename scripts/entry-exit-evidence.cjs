// Project only fixed own-app launcher facts; never retain raw log text/IDs/argv.
const {id} = require('./physical-candidate-contract.cjs');
const knownKeys = ['acquireHdmi4', 'launchBootId', 'launchStartByBoottimeMs',
    'launchStartByRealtimeMs', '@system_native_app', 'nid'];
function project(bytes) {
    const rows = [];
    let overflow = false;
    for (const text of bytes.toString('utf8').split('\n')) {
        let row;
        if (text.includes(' SAM APP_CLOSED ')) {
            try {
                const o = JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1));
                if (o.app_id !== id || !Number.isInteger(o.exit_status) || o.exit_status < 0 || o.exit_status > 65535) continue;
                row = {event: 'APP_CLOSED', waitStatus: o.exit_status};
            } catch { continue; }
        } else if (text.includes('app launch exec(') &&
            text.includes('/applications/' + id + '/multiview-hdmi-window')) {
            row = {event: 'EXEC', parameterShape: 'unparsed'};
            const m = /multiview-hdmi-window\s+(\{.*\})\)/.exec(text);
            if (m) {
                try {
                    const p = JSON.parse(m[1]);
                    if (p && typeof p === 'object' && !Array.isArray(p)) {
                        row.parameterShape = 'json_object';
                        row.knownKeys = knownKeys.filter(k => Object.hasOwn(p, k));
                        row.unknownKeysPresent = Object.keys(p).some(k => !knownKeys.includes(k));
                        row.pictureOptIn = p.acquireHdmi4 === true ? 'true' : p.acquireHdmi4 === false ? 'false' :
                            Object.hasOwn(p, 'acquireHdmi4') ? 'wrong_type' : 'missing';
                    }
                } catch { /* Fixed unparsed outcome only. */ }
            }
        }
        if (row) { if (rows.length === 8) { overflow = true; break; } rows.push(row); }
    }
    const paired = !overflow && rows.length === 2 && rows[0].event === 'EXEC' && rows[1].event === 'APP_CLOSED';
    let termination = {state: 'unknown'};
    if (paired) {
        const status = rows[1].waitStatus, signal = status & 127;
        termination = signal === 0 ? {state: 'normal_exit', code: (status >> 8) & 255} :
            signal < 127 ? {state: 'signalled', signal, coreDumpFlag: Boolean(status & 128)} : {state: 'unknown'};
    }
    return {rows, overflow, correlation: paired ? 'single_own_exec_close_after_cursor' : 'unknown', termination};
}
module.exports = {project};
