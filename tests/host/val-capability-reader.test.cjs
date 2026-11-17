// Fixed VAL capability evidence scope and operational acceptance. All SSH/SFTP below is synthetic.
const assert = require('node:assert/strict'), {EventEmitter} = require('node:events');
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), Module = require('node:module');
const {spawnSync} = require('node:child_process'), originalLoad = Module._load, originalRead = fs.readFileSync;
let cases = 0, forbiddenImports = 0, credentialReads = 0, stage = 'start';
const watchdog = setTimeout(() => { throw Error('Acceptance stalled: ' + stage); }, 20000);
Module._load = function(name, ...args) {
    if (/ssh2|resource-client-connection|hdmi-element-connection|phase1-device|^(node:)?net$/.test(name)) { forbiddenImports++; throw Error('Real transport forbidden'); }
    return originalLoad.call(this, name, ...args);
};
fs.readFileSync = function(file, ...args) {
    if (/novacom-devices|[\\/]\.ssh[\\/]/.test(String(file))) { credentialReads++; throw Error('Credential read forbidden'); }
    return originalRead.call(this, file, ...args);
};
const reader = require('../../scripts/collect-val-capability.cjs'), {collect, seed, parents, contract, interpret} = reader;
const meta = (type, size = 0) => ({mode: ({file: 0o100000, directory: 0o040000, link: 0o120000, other: 0o020000}[type]) | 0o444, uid: 1, gid: 1, size, mtime: 10});
const error = code => Object.assign(Error('PRIVATE_VENDOR_TEXT'), {code});
class Clock {
    time = 0; next = 0; timers = new Map(); now = () => this.time;
    setTimeout = (fn, ms) => { const id = ++this.next; this.timers.set(id, {at: this.time + ms, fn}); return id; };
    clearTimeout = id => this.timers.delete(id);
    tick(ms) {
        const end = this.time + ms;
        for (;;) {
            const first = [...this.timers].filter(([, t]) => t.at <= end).sort((a, b) => a[1].at - b[1].at)[0];
            if (!first) break; this.timers.delete(first[0]); this.time = first[1].at; first[1].fn();
        }
        this.time = end;
    }
}
function fixture({data = Buffer.from('{"planes":["SUB0","MAIN","MAIN"]}'), size = data.length, hooks = {}, closeConnection = true, closeSubsystem = true} = {}) {
    const clock = new Clock(), files = new Map(parents.map(p => [p, {attrs: meta('directory')}]));
    files.set(seed.path, {attrs: meta('file', size), size, data});
    const log = [], counts = {}, client = new EventEmitter(), sftp = new EventEmitter();
    let started = 0, destroyed = 0, verified = true, endpoint = true, completed, retained = 0;
    function dispatch(method, args, cb, body) {
        counts[method] = (counts[method] || 0) + 1; const entry = {method, args, index: counts[method], at: clock.now()}; log.push(entry);
        if (hooks[method]?.({entry, files, cb, clock, client, sftp}) !== true) body();
    }
    sftp.lstat = (name, cb) => dispatch('lstat', [name], cb, () => files.has(name) ? cb(null, {...files.get(name).attrs}) : cb(error(2)));
    sftp.readlink = (name, cb) => dispatch('readlink', [name], cb, () => cb(null, files.get(name).link));
    sftp.open = (name, flags, cb) => dispatch('open', [name, flags], cb, () => { assert.equal(flags, 'r'); cb(null, {path: name}); });
    sftp.fstat = (h, cb) => dispatch('fstat', [h.path], cb, () => cb(null, {...files.get(h.path).attrs}));
    sftp.read = (h, b, offset, length, position, cb) => dispatch('read', [h.path, length, position], cb, () => {
        assert(length > 0 && length <= contract.chunkBytes); const f = files.get(h.path), n = Math.max(0, Math.min(length, f.size - position));
        b.fill(0, offset, offset + n); if (position < f.data.length) f.data.copy(b, offset, position, Math.min(position + n, f.data.length)); cb(null, n);
    });
    sftp.close = (h, cb) => dispatch('close', [h.path], cb, () => cb(null));
    for (const name of ['readlink', 'exec', 'readdir', 'stat', 'realpath', 'write', 'unlink', 'chmod', 'rename', 'setstat', 'fsetstat']) sftp[name] = client[name] = () => { throw Error('Forbidden operation ' + name); };
    sftp.end = () => { log.push({method: 'sftp.end', at: clock.now()}); if (closeSubsystem) sftp.emit('close'); };
    client.sftp = cb => dispatch('sftp', [], cb, () => cb(null, sftp));
    client.end = () => { log.push({method: 'client.end', at: clock.now()}); if (closeConnection) client.emit('close'); };
    client.destroy = () => { destroyed++; log.push({method: 'client.destroy', at: clock.now()}); if (closeConnection) client.emit('close'); };
    const sink = {begin(name) { assert.equal(name, seed.name); let bytes = 0; const digest = crypto.createHash('sha256');
        return {write(b) { hooks.write?.(); retained += b.length; bytes += b.length; digest.update(b); },
            finish() { hooks.finish?.(); return {bytes, sha256: digest.digest('hex'), localFile: name}; }};
    }, complete(r) { hooks.complete?.(); assert.equal(completed, undefined); completed = r; }};
    const factory = () => { hooks.factory?.({clock}); return {client, hostKeyVerified: () => verified, endpointBindingVerified: () => endpoint, start() {
        started++; assert.equal(started, 1); dispatch('connect', [], () => {}, () => client.emit('ready'));
    }}; };
    return {run: signal => collect({allowOneRead: true, connectionFactory: factory, sink, signal, clock}),
        factory, clock, files, log, counts, client, sftp, sink, unverify() { verified = false; }, unbind() { endpoint = false; },
        get starts() { return started; }, get destroyed() { return destroyed; }, get retained() { return retained; }, get completed() { return completed; }};
}
const drain = async () => { for (let i = 0; i < 1000; i++) await Promise.resolve(); };
async function outcome(f, reason) {
    const r = await f.run(); cases++; assert.equal(r.status, 'partial'); assert.equal(r.stopReason, reason);
    assert(!JSON.stringify(r).includes('PRIVATE_VENDOR_TEXT')); assert(f.starts <= 1); assert((f.counts.open || 0) <= 1);
    assert.equal(r.rawCapture, 'incomplete'); assert.equal(r.interpretation.status, 'not_attempted'); return r;
}
(async () => {
    stage = 'raw capture and independent interpretation'; let f = fixture(), r = await f.run(); cases++;
    assert.equal(r.status, 'retrieved'); assert.equal(r.rawCapture, 'complete'); assert.equal(r.interpretation.status, 'mapped');
    assert.equal(r.interpretation.MAIN, 0); assert.equal(r.interpretation.SUB0, 1); assert.deepEqual(r.interpretation.originalPlanes, ['SUB0','MAIN','MAIN']);
    assert.equal(r.file.readCalls, 2); assert.equal(r.metadataCalls, 15); assert.equal(f.counts.lstat, 13); assert.equal(f.counts.fstat, 2);
    assert(r.handlesClosed && r.subsystemClosed && r.connectionClosed && r.hostKeyMatched && r.endpointBindingMatched);
    assert.equal(r.connectionAttempts, 1); assert.equal(r.sftpAttempts, 1); assert.equal(r.opens, 1); assert.equal(f.counts.close, 1);
    assert.equal(f.clock.timers.size, 0); assert.equal(r.activeLoadedConfiguration, 'unknown'); assert.equal(r.dualHdmi, 'unknown');
    assert(f.log.filter(x=>x.method==='lstat').every(x=>[...parents,seed.path].includes(x.args[0])));
    assert.deepEqual(f.log.filter(x=>x.method==='open').map(x=>x.args),[[seed.path,'r']]);
    const invalids=[['{}','default_candidate'],['{"planes":[]}', 'mapped'],['null','invalid_root'],['[]','invalid_root'],['true','invalid_root'],
        ['{','invalid_json'],['{"planes":null}','planes_not_array'],['{"planes":"MAIN"}','planes_not_array'],
        ['{"planes":[1]}','unsupported_plane_name'],['{"planes":[""]}','unsupported_plane_name'],['{"planes":["é"]}','unsupported_plane_name'],
        ['{"planes":["M\\u0000AIN"]}','unsupported_plane_name'],['{"planes":[],"planes":["MAIN"]}','ambiguous_keys'],
        ['{"planes":[],"pla\\u006ees":["MAIN"]}','ambiguous_keys'],['{"nested":{"x":0,"x":1},"planes":[]}','ambiguous_keys']];
    for(const [text,status]of invalids){f=fixture({data:Buffer.from(text)});r=await f.run();cases++;assert.equal(r.status,'retrieved');assert.equal(r.rawCapture,'complete');assert.equal(r.interpretation.status,status);assert.equal(r.file.sha256,crypto.createHash('sha256').update(text).digest('hex'));}
    assert.deepEqual(interpret(Buffer.from('{}')).sortedUniqueNames,['MAIN']); assert.deepEqual(interpret(Buffer.from('{"planes":[]}')).candidateSinks,[]);cases++;
    r=interpret(Buffer.from('{"planes":["SUB0","MAIN","AUX"]}'));assert.equal(r.MAIN,1);assert.equal(r.SUB0,null);assert.equal(r.extraOrdinals,1);assert.deepEqual(r.sortedUniqueNames,['AUX','MAIN','SUB0']);cases++;
    for(const data of [Buffer.from([0xc3,0x28]),Buffer.from([0xff])]){f=fixture({data});r=await f.run();cases++;assert.equal(r.interpretation.status,'invalid_utf8');assert.equal(r.rawCapture,'complete');}
    f=fixture({data:Buffer.from('\ufeff{}')});r=await f.run();cases++;assert.equal(r.interpretation.status,'invalid_json');
    // Nested values, escaped quotes and braces within strings cannot confuse key detection.
    for(const text of ['{"a":[{"x":1},{"x":2}],"planes":["MAIN"]}','{"x":"} , \\\" planes : [", "planes":["MAIN"]}']){assert.equal(interpret(Buffer.from(text)).status,'mapped');cases++;}
    stage='exact byte/read/path/metadata limits';
    const padded=Buffer.from('{}'+' '.repeat(seed.cap-2));f=fixture({data:padded});r=await f.run();cases++;assert.equal(r.status,'retrieved');assert.equal(r.savedBytes,65536);assert.equal(r.readBytes,65536);assert.equal(r.file.readCalls,2);
    for(const size of [0,65537]){f=fixture({size});await outcome(f,'file_bound');assert(!f.counts.open);}
    for(const type of ['link','other','directory']){f=fixture();f.files.get(seed.path).attrs=meta(type,20);await outcome(f,'file_bound');assert(!f.counts.open);}
    for(const parent of parents){f=fixture();f.files.get(parent).attrs=meta('link');await outcome(f,'metadata');assert(!f.counts.open);}
    f=fixture();f.files.delete(seed.path);r=await f.run();cases++;assert.equal(r.status,'absent');assert(!f.counts.open);assert(r.connectionClosed);assert.equal(r.interpretation.status,'not_attempted');
    for(const code of [2,3,4]){f=fixture({hooks:{lstat({cb}){cb(error(code));return true;}}});await outcome(f,code===3?'permission_denied':'operation_failed');}
    for(const field of ['mode','uid','gid','size','mtime']){f=fixture({hooks:{fstat({entry,files,cb}){const a=files.get(entry.args[0]).attrs;cb(null,{...a,[field]:a[field]+1});return true;}}});await outcome(f,'changed');assert(!f.counts.read);assert.equal(f.counts.close,1);}
    f=fixture();f.files.get(seed.path).attrs.mtime=NaN;await outcome(f,'metadata');
    for(const index of [5,8,9,10]){f=fixture({hooks:{lstat({entry,files}){if(entry.index===index)files.get(entry.args[0]).attrs.mtime++;}}});await outcome(f,'changed');}
    f=fixture({hooks:{read({files}){files.get(seed.path).attrs.mtime++;}}});await outcome(f,'changed');
    for(const parent of parents){f=fixture({hooks:{read({files}){files.get(parent).attrs.mtime++;}}});await outcome(f,'changed');}
    f=fixture({hooks:{read({cb}){cb(null,0);return true;}}});await outcome(f,'short_file');
    for(const n of [-1,NaN,65537,1.5]){f=fixture({hooks:{read({cb}){cb(null,n);return true;}}});await outcome(f,'read_bound');}
    f=fixture();f.files.get(seed.path).size++;r=await outcome(f,'growth');assert.equal(r.savedBytes,0);
    f=fixture({data:padded});f.files.get(seed.path).size++;r=await outcome(f,'growth');assert.equal(r.readBytes,65537);assert.equal(r.savedBytes,65536);assert.equal(r.file.readCalls,2);
    f=fixture({hooks:{read({entry,cb}){if(entry.index===1){cb(null,1);return true;}}}});await outcome(f,'read_bound');assert.equal(f.counts.read,2);
    f=fixture();f.unverify();await outcome(f,'host_key_unverified');assert(!f.counts.sftp);
    f=fixture();f.unbind();await outcome(f,'endpoint_binding_unverified');assert(!f.counts.sftp);
    stage='deadlines, cancellation and closure';
    for(const method of ['connect','sftp','lstat','open','read','close']){
        let late;f=fixture({hooks:{[method]({cb}){late=cb;return true;}}});const p=f.run();await drain();f.clock.tick(3000);await drain();r=await p;cases++;
        assert.equal(r.status,'partial');assert(['operation_timeout','handle_close_unconfirmed'].includes(r.stopReason));assert(f.destroyed<=1);assert(f.starts<=1);
        const receipt=JSON.stringify(r),before=f.log.length;late?.(null,method==='open'?{path:seed.path}:0);await drain();assert.equal(JSON.stringify(r),receipt);assert.equal(f.log.length,before);
    }
    f=fixture({hooks:{factory({clock}){clock.tick(27000);}}});await outcome(f,'work_deadline');assert.equal(f.starts,0);
    f=fixture({hooks:{factory({clock}){clock.tick(30000);}}});r=await outcome(f,'work_deadline');assert.equal(f.starts,0);assert.equal(r.elapsedMs,30000);assert.equal(r.transportForced,true);
    f=fixture({hooks:{read({clock}){clock.tick(27000);}}});await outcome(f,'operation_timeout');
    f=fixture({hooks:{lstat({clock}){clock.tick(2000);},fstat({clock}){clock.tick(2000);}}});await outcome(f,'work_deadline');
    const controller=new AbortController();controller.abort();f=fixture();await collect({allowOneRead:true,connectionFactory:f.factory,sink:f.sink,signal:controller.signal,clock:f.clock});cases++;assert.equal(f.starts,0);
    f=fixture({hooks:{read(){controller2.abort();}}});const controller2=new AbortController();r=await f.run(controller2.signal);cases++;assert.equal(r.stopReason,'cancelled');assert.equal(r.rawCapture,'incomplete');
    for(const opt of [{closeConnection:false},{closeSubsystem:false}]){f=fixture(opt);const p=f.run();await drain();f.clock.tick(3000);await drain();r=await p;cases++;assert.equal(r.stopReason,'closure_unconfirmed');assert.equal(r.rawCapture,'incomplete');}
    // File close and transport end share one3s cleanup budget, not3s each.
    f=fixture({closeConnection:false,hooks:{close({clock,cb}){clock.tick(2000);cb(null);return true;}}});let p=f.run();await drain();f.clock.tick(1000);await drain();r=await p;cases++;assert.equal(r.elapsedMs,3000);assert.equal(r.stopReason,'closure_unconfirmed');
    for(const action of ['write','finish','complete']){f=fixture({hooks:{[action](){throw error('SECRET');}}});r=await f.run();cases++;assert.equal(r.status,'partial');assert.equal(r.stopReason,'local_io');assert(!JSON.stringify(r).includes('PRIVATE_VENDOR_TEXT'));}
    stage='offline CLI and private capture';
    await assert.rejects(collect({allowOneRead:false,connectionFactory:()=>{throw Error('must not start')},sink:f.sink}));cases++;
    const oldLog=console.log;let plan;console.log=x=>{plan=JSON.parse(x)};try{await reader.main(['--plan']);}finally{console.log=oldLog;}assert.equal(plan.dispatch,false);assert.equal(plan.TVConnections,0);assert.equal(plan.contract.readCalls,2);cases++;
    for(const args of [[],['--unknown'],['--allow-one-val-capability-evidence-read','--device','fixture','bad-slot']]){await assert.rejects(reader.main(args));cases++;}
    let output;for(let i=1;i<1000;i++){const candidate=path.resolve('build/phase-2/hdmi-val-capability-acceptance-capture-'+String(i).padStart(3,'0'));if(!fs.existsSync(candidate)){output=candidate;break;}}assert(output);
    const capture=reader.reserveCapture(output);assert.throws(()=>capture.begin('val-starfish.elf'));const writer=capture.begin(seed.name);assert.throws(()=>capture.complete({}));writer.write(Buffer.from('{}'));const retained=writer.finish();capture.complete({synthetic:true,...retained});assert.throws(()=>capture.begin(seed.name));assert.throws(()=>capture.complete({}));assert.throws(()=>reader.reserveCapture(output));cases++;
    assert.equal(fs.readFileSync(path.join(output,seed.name),'utf8'),'{}');assert.equal(retained.bytes,2);
    const occupied=output.replace('acceptance-capture-','evidence-00000000-');reader.reserveCapture(occupied);
    await assert.rejects(reader.main(['--allow-one-val-capability-evidence-read','--device','fixture',occupied]));cases++;
    await assert.rejects(reader.main(['--allow-one-val-capability-evidence-read','--device','fixture',path.resolve('build/phase-2/hdmi-val-capability-evidence-00000000-001','subdir')]));cases++;
    if(process.platform==='win32'){
        const script='$ErrorActionPreference="Stop"; $sid=[System.Security.Principal.WindowsIdentity]::GetCurrent().User; foreach($p in @($env:MULTIVIEW_CAP_TEST_OUTPUT,(Join-Path $env:MULTIVIEW_CAP_TEST_OUTPUT "device-cap.json"),(Join-Path $env:MULTIVIEW_CAP_TEST_OUTPUT "inventory.json"))){$a=Get-Acl -LiteralPath $p;$r=@($a.GetAccessRules($true,$true,[System.Security.Principal.SecurityIdentifier]));if($a.GetOwner([System.Security.Principal.SecurityIdentifier]) -ne $sid -or $r.Count -ne 1 -or $r[0].IdentityReference -ne $sid -or $r[0].AccessControlType -ne "Allow"){throw "ACL"}}';
        assert.equal(spawnSync('pwsh.exe',['-NoProfile','-NonInteractive','-Command',script],{env:{...process.env,MULTIVIEW_CAP_TEST_OUTPUT:output},timeout:5000,windowsHide:true,stdio:'ignore'}).status,0);cases++;
    }
    assert.equal(forbiddenImports,0);assert.equal(credentialReads,0);Module._load=originalLoad;fs.readFileSync=originalRead;clearTimeout(watchdog);
    console.log(JSON.stringify({status:'passed',acceptanceCases:cases,TVConnections:0,credentialReads,forbiddenImports,syntheticCapture:output}));
})().catch(e=>{clearTimeout(watchdog);Module._load=originalLoad;fs.readFileSync=originalRead;console.error(e);process.exitCode=1;});
