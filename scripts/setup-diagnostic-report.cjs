// Closed numeric wire vocabulary; export human-readable stages, never raw errors/IDs.
const stages = ['lease_recheck','setenv_egl','setenv_runtime','back_hint','exit_hint','SDL_Init',
    'SDL_GetCurrentDisplayMode','SDL_CreateWindow','SDL_CreateRenderer','SDL_GetWindowSize','dimensions_match_1920x1080',
    'SDL_SetRenderDrawBlendMode','SDL_SetRenderDrawColor_black','SDL_RenderClear','SDL_SetRenderDrawColor_transparent',
    'SDL_RenderFillRect','SDL_RenderPresent','SDL_webOSCreateExportedWindow','export_id_length',
    'SDL_webOSSetExportedWindow','focus_wait','g_main_context_new','LSRegisterPubPriv','LSHandleGetName_match',
    'LSGmainContextAttach','LSSetDisconnectHandler','window_id_validation','LSUnregister','g_main_context_unref',
    'SDL_webOSDestroyExportedWindow','SDL_DestroyRenderer','SDL_DestroyWindow','SDL_Quit'];
const optional = [1,2,3,4,6];
const cancel = ['none','quit','back_exit_key','focus_lost','hidden','minimized','window_close','signal','disconnect','lease'];
function classify(bytes) {
    const events = [], dimensions = [];
    const result = state => ({state, events, dimensions, failedStage: events.find(e => e.outcome === 'failed')?.stage || null,
        pendingStage: pending === null ? null : stages[pending], actualExit: 'unknown', hardwareRelease: 'unknown'});
    let pending = null, next = 0, last = -1, setupFailed = false, cleanupFailed = false, summary = null, terminal = false;
    if (!Buffer.isBuffer(bytes) || bytes.length > 2048) return result('invalid');
    if (!bytes.length) return result('empty');
    const lines = bytes.toString('utf8').split('\n'), tail = lines.pop();
    let header;
    try { header = JSON.parse(lines.shift()); } catch { return result('invalid'); }
    if (!header || JSON.stringify(header) !== JSON.stringify({schemaVersion:1,appId:'io.github.tpapaz.multiview.hdmiwindow',appVersion:'0.1.8',mode:'setup_only'})) return result('invalid');
    for (const line of lines) {
        let row; try { row = JSON.parse(line); } catch { return result('invalid'); }
        if (terminal || !Array.isArray(row) || !row.every(Number.isInteger)) return result('invalid');
        const [s,o] = row;
        if (s === 90) {
            if (row.length !== 8 || pending !== null || ![6,9,20].includes(last) ||
                !row.slice(1,5).every(n => n >= -2147483648 && n <= 2147483647) ||
                !row.slice(5,7).every(n => [-1,0,1].includes(n)) || o === undefined || row[7]<0 || row[7]>9) return result('invalid');
            dimensions.push({displayWidth:row[1],displayHeight:row[2],windowWidth:row[3],windowHeight:row[4],
                requestedWidth:1920,requestedHeight:1080,focusBefore:row[5],focusAfter:row[6],cancelReason:cancel[row[7]]});
        } else if (s === 99) {
            if (row.length !== 3 || pending !== null || summary || (!setupFailed && next!==27) || ![0,1].includes(o) || ![0,1].includes(row[2]) ||
                o !== (!setupFailed && next===27 ? 1:0) || row[2] !== (cleanupFailed?0:1)) return result('invalid');
            summary = row;
        } else if (s === 100) {
            if (row.length !== 2 || !summary || o !== (summary[1]&&summary[2]?0:1)) return result('invalid');
            terminal=true; events.push({stage:'exit_intent',code:o});
        } else {
            if (row.length !== 2 || s<0 || s>=stages.length || summary || ![0,1,2,3].includes(o)) return result('invalid');
            if (o===0) {
                if (pending!==null || (s<27 && (setupFailed || s!==next)) || (s>=27 && s<=last)) return result('invalid');
                pending=s;
            } else {
                if (pending!==s || (o===3 && !optional.includes(s)) || (o===2 && optional.includes(s))) return result('invalid');
                if (s<27) { next=s+1; if(o===2) setupFailed=true; }
                else if(o===2) cleanupFailed=true;
                pending=null;last=s;
            }
            events.push({stage:stages[s],outcome:['entered','returned_success','failed','observation_failed'][o]});
        }
    }
    return result(terminal && !tail ? 'valid' : 'partial');
}
module.exports = {classify, stages};
