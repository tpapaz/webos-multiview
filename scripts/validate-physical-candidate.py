"""Build and validate the exclusive 0.1.12 physical contract OFFLINE. No IPK or TV actions."""
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import sys

root = Path(__file__).resolve().parents[1]
source = root / 'native/phase2-hdmi-candidate-0.1.12'
preparation = root / 'build/phase-2/physical-candidate-0.1.12-preparation-20261115-001'
review = root / 'build/offline-hdmi-dispatch-review-20261115-003'
sdk = Path('/home/tasos/.cache/webos-multiview/202608/arm-webos-linux-gnueabi_sdk-buildroot')
node = Path('/home/tasos/.cache/webos-multiview/node-v22.17.0-linux-x64/bin/node')
runtime = root / 'build/phase-2/admission-runtime-20261111'
output = root / 'build/phase-2/physical-candidate-0.1.12'
host = root / 'build/phase-2/physical-candidate-host-0.1.12'
asan = root / 'build/phase-2/physical-candidate-sanitized-0.1.12'
arm = root / 'build/phase-2/physical-candidate-arm-0.1.12'
assert not any(p.exists() for p in [output,host,asan,arm]), 'Preserve occupied candidate outputs; use fresh version/slots'
sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
pins = json.loads((preparation / 'preservation-pins.json').read_text())
ipks = json.loads((preparation / 'ipk-pins.json').read_text())
prior = json.loads((review / 'validation.json').read_text())
assert prior['status'] == 'passed_offline_physical_adapter_review' and prior['ASAN_UBSAN'] == 'passed'

def preserve():
    for p in pins + ipks:
        assert sha(root / p['file'].replace('\\','/')) == p['sha256'], 'Preserved input mismatch: ' + p['file']
    assert len(list((root / 'dist').glob('*.ipk'))) == len(ipks)

preserve()
manifest = json.loads((source / 'appinfo.json').read_text())
assert manifest['id'] == 'io.github.tpapaz.multiview.hdmiwindow' and manifest['version'] == '0.1.12'
assert manifest['main'] == 'multiview-hdmi-window' and manifest['requiredACG'] == [] and manifest['type'] == 'native'
output.mkdir()

def run(*cmd):
    r = subprocess.run([str(v) for v in cmd],cwd=root,text=True,stdout=subprocess.PIPE,stderr=subprocess.STDOUT)
    with (output / 'validation.log').open('a') as stream:
        stream.write(r.stdout)
    print(r.stdout.strip(),flush=True)
    assert r.returncode == 0, 'Candidate check failed; inspect retained validation.log'
    return r.stdout

# The actual original dispatcher/adapter/core acceptance is reused by exact pins.
# Only the new entry/trace/launch binding and witness prefix need new native tests.
options = ['-G','Ninja','-DCMAKE_BUILD_TYPE=Debug','-DJSON_C_INCLUDE_DIR=' + str(root / 'build/phase-2/entry-diagnostic-host-0.1.11/include')]
maximum = 0
for directory, extra in [(host,[]),(asan,['-DCMAKE_CXX_FLAGS=-fsanitize=address,undefined -fno-omit-frame-pointer','-DCMAKE_EXE_LINKER_FLAGS=-fsanitize=address,undefined'])]:
    run('cmake','-S',source,'-B',directory,*options,*extra)
    run('cmake','--build',directory)
    run('ctest','--test-dir',directory,'--output-on-failure')
    bridge = r'''
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {classify}=require('./scripts/physical-candidate-report.cjs');
const {classifyWitness}=require('./scripts/physical-candidate-witness.cjs');
const {payload,launchBinding}=require('./scripts/physical-candidate-contract.cjs');
const {authority}=require('./tests/host/physical-candidate-fixture.cjs');
const directory=process.argv[1];let max=0,count=0,witnesses=0;
for(const file of fs.readdirSync(directory+'/trace-fixtures')){
 const b=fs.readFileSync(directory+'/trace-fixtures/'+file),r=classify(b);assert.equal(r.state,'valid',file);assert(b.length<=2048);
 assert.equal(r.launchBindingSha256,launchBinding(payload(authority,r.mode,r.gateEvidenceSha256)));assert.equal(r.hardwareRelease,'unknown');assert.equal(r.actualExit,'unknown');count++;max=Math.max(max,b.length);
 if(file==='slow-persistence.jsonl'){assert(r.persistenceMs>100);assert.equal(r.events.find(e=>e.stage==='open'&&e.outcome==='reply_returned').callMs,7);}
}
assert.equal(count,16);
for(const name of fs.readdirSync(directory).filter(n=>n.startsWith('bound-witness-'))){
 for(const [mode,file]of [['lifecycle_validation','termination-lifecycle-0.1.12.json'],['physical_picture','termination-picture-0.1.12.json']]){
  const b=fs.readFileSync(path.join(directory,name,file));assert(b.length<=256);
  const binding=launchBinding(payload(authority,mode,mode==='physical_picture'?'a'.repeat(64):null));
  assert.equal(classifyWitness(b,mode,binding,{freshSlot:true,exactArtifact:true,ownedMetadata:true}).state,'observed_terminated');witnesses++;
 }
}
assert.equal(witnesses,2);console.log(JSON.stringify({traceFixtures:count,maximumTraceBytes:max,actualBoundWitnesses:witnesses}));
'''
    run(node,'-e',bridge,directory)
    maximum = max(maximum,max(p.stat().st_size for p in (directory / 'trace-fixtures').glob('*.jsonl')))
for test in ['physical-candidate-report','physical-candidate-gate','physical-candidate-runner','physical-candidate-foreground']:
    run(node,root / ('tests/host/'+test+'.test.cjs'))
run('cmake','-S',source,'-B',arm,'-G','Ninja','-DCMAKE_BUILD_TYPE=Release',
    '-DCMAKE_TOOLCHAIN_FILE=' + str(sdk / 'share/buildroot/toolchainfile.cmake'),
    '-DLUNA_LIBRARY=' + str(root / 'build/phase-1/firmware-inspection/native-idle/libluna-service2.so.3'),
    '-DJSON_C_LIBRARY=' + str(root / 'build/phase-1/firmware-inspection/native-idle/libjson-c.so.4'),
    '-DCLOCK_LIBRARY=' + str(runtime / 'librt.so.1'),'-DPTHREAD_LIBRARY=' + str(runtime / 'libpthread.so.0'))
run('cmake','--build',arm)
binary = arm / 'multiview-hdmi-window'
run(sys.executable,root / 'scripts/verify-hdmi-window-abi.py',binary,output)
symbols = subprocess.check_output(['nm','-C',binary],text=True)
for name in ['system','popen','execve','kill','pthread_join','pthread_cancel','pthread_detach']:
    assert not re.search(r'\bU '+name+r'(?:@|$)',symbols,re.M)
assert 'LSCallOneReply' in symbols and 'g_compute_checksum_for_string' in symbols and 'prctl' in symbols
preserve()
source_files = [p for p in source.iterdir() if p.suffix in ['.cpp','.h'] or p.name in ['CMakeLists.txt','appinfo.json']]
source_files += [root / p for p in ['native/phase2-hdmi-dispatch/adapter.h','native/phase2-hdmi-dispatch/replies.h','native/phase2-hdmi-dispatch/termination.h','native/phase2-hdmi-dispatch/capture.h',
 'native/phase2-context-dispatch/dispatcher.h','native/phase2-hdmi-picture/session.cpp','native/phase2-hdmi-picture/session.h','native/phase2-hdmi-picture/launch-clock.h',
 'scripts/physical-candidate-contract.cjs','scripts/physical-candidate-report.cjs','scripts/physical-candidate-witness.cjs','scripts/physical-candidate-gate.cjs','scripts/physical-candidate-local.cjs',
 'scripts/physical-candidate-preflight.cjs','scripts/physical-candidate-runner.cjs','scripts/run-physical-candidate.cjs','scripts/validate-physical-candidate.py',
 'scripts/hdmi-picture-controller.cjs','scripts/hdmi-picture-io.cjs','scripts/hdmi-picture-report.cjs','scripts/hdmi-termination-evidence.cjs','scripts/tv-launch-authority.cjs','scripts/phase1-device.cjs',
 'scripts/hdmi-window-installed-role.cjs','scripts/hdmi-utp-coverage.cjs','scripts/check-hdmi-utp-coverage.cjs','build/phase-2/hdmi-correction-0.1.3/transport.cjs',
 'tests/host/physical_candidate_test.cpp','tests/host/physical_candidate_witness_test.cpp','tests/host/physical-candidate-fixture.cjs','tests/host/physical-candidate-report.test.cjs',
 'tests/host/physical-candidate-gate.test.cjs','tests/host/physical-candidate-runner.test.cjs','tests/host/physical-candidate-foreground-child.cjs','tests/host/physical-candidate-foreground.test.cjs',
 'tests/host/physical-candidate-cli.test.cjs','tests/host/physical-candidate-headers/glib.h','tests/host/context-dispatch-headers/glib.h','apps/probe-ui/icon.png']]
record={'status':'built_checked_not_packaged','appId':manifest['id'],'appVersion':'0.1.12','mode':'physical_candidate','reportSchemaVersion':2,
 'binary':str(binary.relative_to(root)),'binarySha256':sha(binary),'binaryBytes':binary.stat().st_size,'manifestSha256':sha(source / 'appinfo.json'),
 'package':None,'packageSha256':None,'archiveVerified':False,'hostAcceptancePassed':True,'directAbiPassed':True,
 'contextDispatchCorrection':True,'independentTerminationWitness':True,'terminationGateRequired':True,
 'nativeAlarmSeconds':22,'reportCapBytes':2048,'witnessCapBytes':256,'strictGuardsUnchanged':True,'ownerRetentionExitIntent':75,
 'sourcePins':[{'file':str(p.relative_to(root)),'sha256':sha(p)} for p in source_files],
 'reviewValidationSha256':sha(review / 'validation.json'),'installed':False,'tvTested':False,'simulatorTested':False}
with (output / 'candidate-validation.json').open('x') as stream:
    json.dump(record,stream,indent=2);stream.write('\n')
v={'status':'passed_local_only','candidateRecordSha256':sha(output / 'candidate-validation.json'),'nativeCTests':2,'ASAN_UBSAN':'passed',
 'traceFixturesPerBuild':16,'maximumTraceBytes':maximum,'actualBoundWitnessesPerBuild':2,'preservedPins':len(pins),'existingIpksPreserved':len(ipks),
 'ThreadSanitizer':'unchanged adapter source-bound host runtime limitation reused','packagesCreated':0,'TVConnections':0,'TVLaunches':0,
 'acquisitionGate':'closed; no real 0.1.12 witnessed lifecycle/restoration evidence','packaged':False,'installed':False,'tvTested':False,
 'limits':['Prior 0.1.11 actual termination remains unknown','Retail witness survival/reaping unverified','No numerical exit-status/hardware-release claim']}
with (output / 'local-validation.json').open('x') as stream:
    json.dump(v,stream,indent=2);stream.write('\n')
# Plan and refusal/tamper paths require the completed local record; no adapter import.
run(node,root / 'tests/host/physical-candidate-cli.test.cjs')
preserve()
print(json.dumps({k:v[k] for k in ['status','traceFixturesPerBuild','maximumTraceBytes','actualBoundWitnessesPerBuild','preservedPins','existingIpksPreserved','packagesCreated','TVConnections']}))
