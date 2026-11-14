const assert = require('node:assert/strict'), Module = require('node:module');
const {EventEmitter} = require('node:events');
const {run} = require('../../scripts/hdmi-picture-controller.cjs');
const {configuration, verify, open, reportFilename} = require('../../scripts/setup-diagnostic-runner.cjs');
const {hash, base} = require('../../scripts/hdmi-picture-io.cjs');
const id='io.github.tpapaz.multiview.hdmiwindow';
const alias='/tmp/'+id+'/'+reportFilename, jail='/var/palm/jail/'+id+alias;
function role(side) {
    const connector=side==='pub'?'com.webos.pipe.avmuteclient.*':'com.webos.avconnector.*';
    const names=['com.webos.media.client.*','com.webos.rm.client.*','com.webos.pipeline.*',connector,
        'com.webos.vt.*','com.webos.chromium.media.*',id,''];
    const outbound=[['com.webos.media'],['com.webos.media'],['com.webos.pipelinectrl.*'],
        side==='pub'?['com.webos.service.avmutemanager']:['com.webos.service.videooutput','com.webos.service.audio','com.webos.service.utp.extinputs'],['*'],['*'],['*']];
    const inbound=[['com.webos.media'],['com.webos.media'],['com.webos.pipelinectrl.*'],[],['*'],[],[]];
    return {role:{exeName:base+'/multiview-hdmi-window',type:'regular',allowedNames:names},
        permissions:names.slice(0,7).map((service,i)=>({service,outbound:outbound[i],inbound:inbound[i]}))};
}
async function trial({partial=false, conflict=false, wrongVersion=false, occupied=false, badBinding=false}={}) {
    const files=new Map(), commands=[], connections=[];let time=0;
    const put=(p,v)=>files.set(p,Buffer.isBuffer(v)?v:Buffer.from(JSON.stringify(v)));
    put(base+'/multiview-hdmi-window',Buffer.from('synthetic ELF'));put(base+'/appinfo.json',Buffer.from('synthetic appinfo'));
    put('/usr/bin/luna-send',Buffer.from('synthetic utility'));
    for(const side of ['pub','prv'])put('/var/palm/ls2-dev/roles/'+side+'/'+id+'.json',role(side));
    put('/var/luna-service2-dev/client-permissions.d/'+id+'.app.json',{[id]:['public']});
    put('/var/luna-service2-dev/manifests.d/'+id+'.json',{id,version:'0.1.8',
        roleFilesPrv:['/var/palm/ls2-dev/roles/prv/'+id+'.json'],roleFilesPub:['/var/palm/ls2-dev/roles/pub/'+id+'.json'],
        clientPermissionFiles:['/var/luna-service2-dev/client-permissions.d/'+id+'.app.json']});
    put('/proc/sys/kernel/random/boot_id',Buffer.from('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee\n'));
    put('/proc/uptime',Buffer.from('100.00 1.00\n'));
    const references={pkg:{appId:id,appVersion:'0.1.8',setupOnlyNoUtpCalls:true,
        binarySha256:hash(files.get(base+'/multiview-hdmi-window')),manifestSha256:hash(files.get(base+'/appinfo.json'))},
        utility:{tvPath:'/usr/bin/luna-send',sha256:hash(files.get('/usr/bin/luna-send'))}};
    const header={schemaVersion:1,appId:id,appVersion:wrongVersion?'0.1.7':'0.1.8',mode:'setup_only'};
    const rows=[];for(let i=0;i<10;i++)rows.push([i,0],[i,1]);
    rows.push([90,3840,2160,3840,2160,-1,-1,0],[10,0],[10,2],[99,0,1],[100,1]);
    const trace=Buffer.from([header,...(partial?[[0,0]]:rows)].map(JSON.stringify).join('\n')+'\n');
    if(occupied)put(alias,trace);
    const stat=name=>({mode:0o100000|(badBinding?0o777:name.endsWith('multiview-hdmi-window')?0o755:0o644),uid:1000,gid:1000,
        size:name.startsWith('/proc/')?0:files.get(name).length,mtime:1,isFile:()=>true,isDirectory:()=>false});
    const absent=()=>Object.assign(Error('PRIVATE_SECRET'),{code:2});
    const sftp={lstat(name,cb){
        if(files.has(name))return cb(null,stat(name));
        if([alias,jail].some(p=>p.slice(0,p.lastIndexOf('/'))===name))return cb(null,{mode:0o40700,uid:5480,gid:5000,size:0,mtime:1,isFile:()=>false,isDirectory:()=>true});
        cb(absent());
    },open(name,flags,cb){assert.equal(flags,'r');cb(null,name);},fstat(name,cb){cb(null,stat(name));},close(name,cb){cb(null);},
    read(name,b,offset,length,position,cb){assert(length<=([alias,jail].includes(name)?2048:32768));const data=files.get(name).subarray(position,position+length);data.copy(b,offset);cb(null,data.length);},
    readdir(name,cb){assert.equal(name,'/proc');cb(null,[]);}};
    const adapter={
        exists:async p=>files.has(p),checkAppAbsent:async()=>true,
        readPath:async p=>{assert(files.has(p));const bytes=files.get(p),s=stat(p);
            return {bytes,sha256:hash(bytes),attrs:{type:'file',mode:s.mode&0o7777,uid:p.startsWith(base)?1000:0,gid:p.startsWith(base)?1000:0,size:bytes.length,mtime:1}};}
    };
    const original=Module._load;
    Module._load=function(name,parent,...args){if(name.endsWith('hdmi-correction-0.1.3/transport.cjs'))return {base,openAdapter:async()=>adapter};return original.call(this,name,parent,...args);};
    try {
        const r=await run({...configuration.runOptions,references,
            now:()=>time,sleep:async ms=>{assert(connections[0].closed);time+=ms;},
            connect:async()=>{const c=new EventEmitter();c.closed=false;c.destroy=()=>{c.closed=true;c.emit('close');};c.sftp=cb=>cb(null,sftp);
                c.exec=(command,cb)=>{commands.push(command);const stream=new EventEmitter();stream.stderr=new EventEmitter();stream.destroy=()=>{};cb(null,stream);
                    if(command==='date +%s')queueMicrotask(()=>{stream.emit('data',Buffer.from('1700000000\n'));stream.emit('close',0,null);});
                    else {assert(command.includes('com.webos.applicationManager/launch'));assert(!command.includes('queryServicePermissions'));
                        put(alias,trace);put(jail,conflict?Buffer.alloc(0):trace);
                        queueMicrotask(()=>{stream.emit('data',Buffer.from('{"returnValue":true}'));stream.emit('close',0,null);});}
                };connections.push(c);return c;},
            verify,open,persist:()=>{},emit:()=>{},savePrivate:()=>{},ownerCue:()=>{}});
        assert(!commands.some(c=>c.includes('queryServicePermissions')));
        assert(!JSON.stringify(r).includes('PRIVATE_SECRET'));
        assert.equal(r.appVersion,'0.1.8');assert.equal(r.mode,'setup_only');
        return {r,commands};
    } finally {Module._load=original;}
}
(async()=>{
    let {r,commands}=await trial();assert.equal(r.status,'collected');assert.equal(commands.length,2);
    assert.equal(r.preflight.permissionScope,'own_generated_registration_only');
    assert.equal(r.reports[0].state,'valid');assert.equal(r.reports[0].failedStage,'dimensions_match_1920x1080');
    assert.equal(r.reports[0].dimensions[0].windowWidth,3840);assert.equal(r.aliasComparison,'identical_bytes');
    assert(r.collectionStartedMs>=r.dispatchMs+27000);assert.equal(r.actualExit,'unknown');
    r=(await trial({partial:true})).r;assert.equal(r.reports[0].state,'partial');assert.equal(r.reports[0].pendingStage,'lease_recheck');
    r=(await trial({wrongVersion:true})).r;assert.equal(r.reports[0].state,'invalid');
    r=(await trial({conflict:true})).r;assert.equal(r.aliasComparison,'conflicting');
    for(const options of [{occupied:true},{badBinding:true}]){const t=await trial(options);assert.equal(t.r.attempts,0);assert.equal(t.commands.length,0);}
    await assert.rejects(verify(null,null,null,null,null,{pkg:{appVersion:'0.1.7',setupOnlyNoUtpCalls:true}}));
    console.log('Dedicated 0.1.8 runner: actual shared preflight/controller/collector, schema isolation, dimensions, partial/conflicting evidence and zero UTP queries passed; no TV access');
})().catch(e=>{console.error(e);process.exitCode=1;});
