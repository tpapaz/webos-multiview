const assert=require('node:assert/strict');
const {assess,parseTrace,options}=require('../../scripts/phase1-endurance-evidence.cjs');
assert.deepEqual(options(['profile','--smoke']),{mode:'smoke',alias:'profile'});
assert.equal(options(['--veto']).mode,'veto');
for(const args of [[],['--minutes','30'],['--repeat'],['--smoke','--veto'],['--smoke','--smoke'],['--veto','a','b']])assert.throws(()=>options(args));
const row=(ms,event,status,a=0,b=0,aMs=0,bMs=0)=>({ms,event,status,a,b,aMs,bMs});
const rows=[row(0,'probe_start',0),row(1,'veto_bus',0),row(2,'veto_attach',0),row(3,'veto_disconnect_watch',0),
    row(4,'veto_register',0),row(5,'veto_registered',0),row(6,'veto_wait_start',3),row(10,'veto_wait_end',0),row(11,'run_start',8),row(100,'overlap_start',8)];
for(let sec=0;sec<=8;sec++)rows.push(row(100+sec*1000,'sample',2,sec*5+5,sec*5+5,sec*1000+100,sec*1000+100));
rows.push(row(8100,'b_unload',0),row(8101,'released',3),row(9100,'sample',3,50,45,9100,8100),row(10100,'sample',3,55,45,10100,8100),
    row(11200,'a_unload',0),row(11201,'veto_end',0),row(11202,'veto_unsubscribe_send',0),row(11203,'veto_unsubscribe',0),row(11204,'veto_cancel',0),row(11205,'veto_handle_close',0),row(11206,'run_end',0));
assert(assess(rows,'smoke').passed);
assert(!assess(rows,'veto').passed); // Smoke cannot certify a request/veto.
const veto=rows.map(r=>r.event==='veto_wait_start'?{...r,status:60}:r);
veto.splice(7,0,row(7,'veto_request',1),row(8,'veto_decision',0),row(8,'veto_reply_send',0),row(9,'veto_reply',0));
assert(assess(veto,'veto').passed);
assert.equal(assess(veto,'veto').appliedVeto,'unknown until attributable service evidence and visual observation');
const missing=['veto_bus','veto_attach','veto_disconnect_watch','veto_register','veto_registered','veto_cancel','veto_handle_close','a_unload','b_unload','veto_end'];
for(const event of missing)assert(!assess(rows.filter(r=>r.event!==event),'smoke').passed,event);
for(const event of ['veto_registered','veto_cancel','veto_handle_close','veto_reply','veto_request'])
    assert(!assess(veto.map(r=>r.event===event?{...r,status:2}:r),'veto').passed,event);
assert(!assess(rows.map(r=>r.event==='veto_end'?{...r,ms:8000}:r),'smoke').passed);
assert(!assess(rows.map(r=>r.event==='run_end'?{...r,ms:90000}:r),'smoke').passed);
assert(!assess(rows.filter(r=>r.event!=='sample'||r.status!==3),'smoke').passed);
assert(!assess(rows.map(r=>r.event==='sample'&&r.status===3?{...r,aMs:9100}:r),'smoke').passed);
assert(!assess(rows.map(r=>r.event==='sample'&&r.ms===4100?{...r,bMs:3100}:r),'smoke').passed);
assert(!assess(rows.filter(r=>r.event!=='sample'||r.ms<2100||r.ms>5100),'smoke').passed);
assert(assess(rows.map(r=>r.event==='veto_unsubscribe'?{...r,status:1}:r),'smoke').passed); // Busy unsubscribe still requires successful cancel + unregister.
const noRequest=rows.slice(0,7).map(r=>r.event==='veto_wait_start'?{...r,status:60}:r);
noRequest.push(row(60007,'veto_wait_end',7),row(60008,'b_unload',0),row(60009,'a_unload',0),row(60010,'veto_end',0),row(60011,'veto_cancel',0),row(60012,'veto_handle_close',0),row(60013,'run_end',7));
assert.equal(assess(noRequest,'veto').outcome,'inconclusive_no_request');
assert(!assess(noRequest,'veto').passed);
for(const [code,cause] of [[1,'back'],[2,'exit_key'],[3,'escape'],[4,'sdl_quit'],[5,'window_close'],[6,'focus_lost'],[7,'hidden'],[8,'minimized'],[9,'sigterm'],[10,'sigint'],[11,'deadline']]) {
    const exited=assess([...rows,row(11207,'exit_event',code)],'smoke');
    assert(!exited.passed);assert.equal(exited.exitEvents[0].cause,cause);
}
assert.throws(()=>parseTrace('1000,exit_event,99,0,0,0,0'));
const {installedBuildMatches}=require('../../scripts/phase1-native-ssh.cjs');
const expected={id:'io.github.tpapaz.multiview.endurance',version:'0.1.3',executable:'multiview-endurance'};
const installed={id:expected.id,version:expected.version,main:expected.executable};
assert(installedBuildMatches(installed,expected));
assert(!installedBuildMatches({...installed,screenSaverProperties:{preferredType:2}},expected));
assert(!installedBuildMatches({...installed,version:'0.1.2'},expected));
assert.equal(parseTrace('61000,sample,2,300,300,61000,61000')[0].aMs,61000);
assert.throws(()=>parseTrace('0,unknown,0,0,0,0,0'));
const api=parseTrace('0,veto_api_error,1,0,0,0,0\n1,veto_api_negative,123,0,0,0,0');
assert.equal(assess(api,'smoke').apiErrors[0].reason,'permission_or_privilege');
assert.equal(assess(api,'smoke').apiCodes[0].value,-123);
assert.equal(assess(parseTrace('0,veto_api_positive,1000001,0,0,0,0'),'smoke').apiCodes[0].value,null);
assert.throws(()=>parseTrace('0,veto_api_error,7,0,0,0,0'));
assert.throws(()=>parseTrace('0,veto_api_negative,1000002,0,0,0,0'));
const service=parseTrace('0,veto_service_error,3,0,0,0,0\n1,veto_service_negative,9,0,0,0,0');
assert.equal(assess(service,'smoke').serviceErrors[0].reason,'invalid_argument');
assert.equal(assess(service,'smoke').serviceCodes[0].value,-9);
console.log('Short veto request, lifetime, cleanup, cancellation and identity acceptance gates passed');
const cpu=require('../../scripts/phase1-cpu-evidence.cjs');
const baseline=cpu.counters('1000 700\n4\n100 8\n4096');
const busy=cpu.counters('1800 1300\n4\n125 8\n8192');
assert.deepEqual(cpu.interval(baseline,busy),{systemBusyPct:25,appOneCorePct:12.5,cores:4,appRssKiB:8192,appThreads:8});
assert.throws(()=>cpu.counters('100 200 4 0 8 1'));
assert.throws(()=>cpu.counters('raw process text'));
assert.throws(()=>cpu.interval(baseline,{...busy,appTicks:99}));
assert.throws(()=>cpu.interval(baseline,baseline));
console.log('CPU counter redaction, normalization and invalid-interval checks passed');
const thermal=require('../../scripts/phase1-thermal-evidence.cjs');
assert.equal(thermal.parseTemperatures('/sys/class/thermal/thermal_zone0/temp 55000').samples[0].celsius,55);
assert.equal(thermal.parseTemperatures('').status,'unknown');
assert.throws(()=>thermal.parseTemperatures('/arbitrary/path 55000'));
assert.throws(()=>thermal.parseTemperatures('/sys/class/thermal/thermal_zone0/temp 9999999'));
console.log('Temperature path allowlist, units and unavailable-sensor checks passed');
