"""Package the pinned physical 0.1.12 ELF once, inspect it, and write a separate receipt. Offline only."""
import gzip
import hashlib
import io
import json
import os
from pathlib import Path, PurePosixPath
import shutil
import subprocess
import sys
import tarfile
import tempfile

ROOT = Path(__file__).resolve().parents[1]
APP = 'io.github.tpapaz.multiview.hdmiwindow'
VERSION = '0.1.12'
OUTPUT = ROOT / 'build/phase-2/physical-candidate-0.1.12'
PREP = ROOT / 'build/phase-2/physical-candidate-0.1.12-packaging-20261115-001'
PACKAGE = ROOT / 'dist' / (APP + '_' + VERSION + '_arm.ipk')
NODE = Path('/home/tasos/.cache/webos-multiview/node-v22.17.0-linux-x64/bin/node')
SHA = lambda data: hashlib.sha256(data).hexdigest()

def require(ok, label):
    if not ok:
        raise ValueError(label)

def inspect_members(members, expected, manifest, uid, gid):
    require(list(members) == ['debian-binary','control.tar.gz','data.tar.gz'], 'Unexpected ar member list/order')
    require(members['debian-binary'] == b'2.0\n', 'Invalid Debian format')
    appbase = 'usr/palm/applications/' + APP + '/'
    generated = 'usr/palm/packages/' + APP + '/packageinfo.json'
    expected_data = {appbase + name: data for name,data in expected.items()}
    require(set(expected) == {'appinfo.json','icon.png','multiview-hdmi-window'}, 'Unexpected stage file set')
    require(json.loads(expected['appinfo.json']) == manifest, 'Manifest reference mismatch')
    require(manifest['id'] == APP and manifest['version'] == VERSION and manifest['type'] == 'native' and manifest['main'] == 'multiview-hdmi-window' and manifest['requiredACG'] == [], 'Candidate manifest mismatch')
    allpaths = set(expected_data) | {generated}
    directories = {'.'}
    for filename in allpaths:
        directories.update(str(p) for p in PurePosixPath(filename).parents if str(p) != '.')
    rows = []
    for member in ['control.tar.gz','data.tar.gz']:
        raw = members[member]
        require(len(raw) <= 2097152, 'Compressed member too large')
        limit = 20480 if member == 'control.tar.gz' else sum(map(len,expected.values())) + 65536
        with gzip.GzipFile(fileobj=io.BytesIO(raw)) as compressed:
            unpacked = compressed.read(limit + 1)
        require(len(unpacked) <= limit, 'Uncompressed member too large')
        seen, regular = set(), set()
        with tarfile.open(fileobj=io.BytesIO(unpacked),mode='r:') as archive:
            for count, entry in enumerate(archive,1):
                require(count <= 32, 'Too many archive entries')
                p = PurePosixPath(entry.name)
                require(not p.is_absolute() and '..' not in p.parts and '\\' not in entry.name and '\0' not in entry.name, 'Unsafe archive path')
                name = str(p)
                require(name not in seen, 'Duplicate archive entry')
                seen.add(name)
                require(entry.isfile() or entry.isdir(), 'Link/device/archive special entry forbidden')
                require(entry.uid == uid and entry.gid == gid, 'Unexpected archive ownership')
                if entry.isdir():
                    require(member == 'data.tar.gz' and name in directories and entry.mode == 0o777 and entry.size == 0, 'Unexpected directory/mode')
                    continue
                regular.add(name)
                if member == 'control.tar.gz':
                    require(name == 'control' and entry.mode == 0o666 and entry.size <= 4096, 'Unexpected control file/script/mode')
                elif name in expected_data:
                    require(entry.mode == (0o755 if p.name == 'multiview-hdmi-window' else 0o644), 'Unexpected application file mode')
                    require(entry.size == len(expected_data[name]), 'Unexpected application file size')
                else:
                    require(name == generated and entry.mode == 0o666 and entry.size <= 4096, 'Unexpected package file/script/mode')
                stream = archive.extractfile(entry)
                require(stream is not None, 'Unreadable archive entry')
                data = stream.read(entry.size + 1)
                require(len(data) == entry.size, 'Archive entry size mismatch')
                if member == 'data.tar.gz':
                    if name in expected_data:
                        require(data == expected_data[name], 'Application content mismatch')
                    else:
                        require(json.loads(data) == {'id':APP,'version':VERSION,'app':APP}, 'Generated package metadata mismatch')
                else:
                    fields = {}
                    for line in data.decode('utf8').splitlines():
                        key, separator, value = line.partition(': ')
                        require(separator and key not in fields, 'Invalid/duplicate control field')
                        fields[key] = value
                    fixed = {'Package':APP,'Version':VERSION,'Section':'misc','Priority':'optional','Architecture':'arm',
                             'Maintainer':'N/A <nobody@example.com>','Description':'This is a webOS application.',
                             'webOS-Package-Format-Version':'2','webOS-Packager-Version':'x.y.x'}
                    require(set(fields) == set(fixed) | {'Installed-Size'} and all(fields[k] == v for k,v in fixed.items()), 'Unexpected control identity/architecture/dependency field')
                    require(fields['Installed-Size'].isdigit() and 0 < int(fields['Installed-Size']) <= 2097152, 'Invalid installed size')
                rows.append({'member':member,'path':name,'bytes':len(data),'mode':entry.mode,'sha256':SHA(data)})
        require(regular == ({'control'} if member == 'control.tar.gz' else allpaths), 'Unexpected/missing regular files')
    return {'status':'passed_exact_archive','regularFiles':rows,'noScriptsLinksDevices':True,'noVendorLibrariesOrPolicies':True}

def inspect_ipk(package, expected, manifest):
    require(package.stat().st_size <= 2097152, 'Package too large')
    names = subprocess.check_output(['ar','t',str(package)],text=True).splitlines()
    require(names == ['debian-binary','control.tar.gz','data.tar.gz'], 'Unexpected ar members')
    members = {name:subprocess.check_output(['ar','p',str(package),name]) for name in names}
    return inspect_members(members,expected,manifest,os.getuid(),os.getgid())

def main():
    receipt = OUTPUT / 'package-validation.json'
    require(not PACKAGE.exists() and not receipt.exists() and not (PREP / 'packaging-attempt.json').exists(), 'Occupied package/receipt/attempt slot: preserve evidence; no repackaging')
    build_bytes = (OUTPUT / 'candidate-validation.json').read_bytes()
    build = json.loads(build_bytes)
    local = json.loads((OUTPUT / 'local-validation.json').read_bytes())
    require(SHA(build_bytes) == local['candidateRecordSha256'], 'Build record binding mismatch')
    require(build['appId'] == APP and build['appVersion'] == VERSION and build['reportSchemaVersion'] == 2 and build['mode'] == 'physical_candidate', 'Wrong candidate')
    require(build['archiveVerified'] is False and build['hostAcceptancePassed'] and build['directAbiPassed'] and build['witnessNamespaceCoherenceGuard'], 'Build acceptance incomplete')
    require(build['terminationGateRequired'] and build['nativeAlarmSeconds'] == 22 and build['reportCapBytes'] == 2048 and build['witnessCapBytes'] == 256, 'Guard/report contract mismatch')
    pins = json.loads((PREP / 'preservation-pins.json').read_text())
    old_ipks = json.loads((PREP / 'ipk-pins.json').read_text())
    def preserve():
        for pin in pins + old_ipks:
            require(SHA((ROOT / pin['file']).read_bytes()) == pin['sha256'], 'Preservation pin mismatch')
        for pin in build['sourcePins']:
            require(SHA((ROOT / pin['file']).read_bytes()) == pin['sha256'], 'Candidate source pin mismatch')
    preserve()
    binary = ROOT / build['binary']
    require(SHA(binary.read_bytes()) == build['binarySha256'], 'ELF mismatch')
    source = ROOT / 'native/phase2-hdmi-candidate-0.1.12'
    manifest = json.loads((source / 'appinfo.json').read_bytes())
    require(SHA((source / 'appinfo.json').read_bytes()) == build['manifestSha256'], 'Manifest mismatch')
    expected = {'multiview-hdmi-window':binary.read_bytes(),'appinfo.json':(source / 'appinfo.json').read_bytes(),'icon.png':(ROOT / 'apps/probe-ui/icon.png').read_bytes()}
    cli = ROOT / 'node_modules/@webos-tools/cli'
    require(json.loads((cli / 'package.json').read_bytes())['version'] == '3.2.6', 'Use pinned packaging CLI')
    # All acceptance/preservation gates precede the sole packaging invocation.
    test = subprocess.run([sys.executable,str(ROOT / 'tests/host/physical_candidate_archive_test.py')],cwd=ROOT,text=True,capture_output=True)
    (PREP / 'archive-test.log').write_text(test.stdout + test.stderr)
    require(test.returncode == 0, 'Archive inspector acceptance failed; inspect retained local log')
    stage = Path(tempfile.mkdtemp(prefix='multiview-physical-0.1.12-'))
    for name,data in expected.items():
        file = stage / name
        file.write_bytes(data)
        file.chmod(0o755 if name == 'multiview-hdmi-window' else 0o644)
        require(file.read_bytes() == data, 'Linux stage content mismatch')
    attempt = {'scope':'one physical 0.1.12 package, offline only','candidateRecordSha256':SHA(build_bytes),'retainedLinuxStage':str(stage),'TVConnections':0,'acquisitionGate':'closed'}
    with (PREP / 'packaging-attempt.json').open('x') as stream:
        json.dump(attempt,stream,indent=2);stream.write('\n')
    guard = ROOT / 'scripts/offline-package-guard.cjs'
    command = [str(NODE),'--require',str(guard),str(cli / 'bin/ares-package.js'),str(stage),'--no-minify','-o',str(ROOT / 'dist')]
    result = subprocess.run(command,cwd=ROOT,text=True,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,
                            env={**os.environ,'APPDATA':str(ROOT / 'build/cli-data'),'npm_config_offline':'true','npm_config_update_notifier':'false'})
    (PREP / 'packaging.log').write_text(result.stdout)
    require(result.returncode == 0 and 'OFFLINE_PACKAGE_NETWORK_ATTEMPTS:0' in result.stdout, 'Offline packaging failed; preserve log/outputs and do not retry')
    require(PACKAGE.is_file(), 'Expected package absent; no retry')
    inspection = inspect_ipk(PACKAGE,expected,manifest)
    with (PREP / 'archive-inspection.json').open('x') as stream:
        json.dump(inspection,stream,indent=2);stream.write('\n')
    preserve()
    after = {str(p.relative_to(ROOT)):SHA(p.read_bytes()) for p in (ROOT / 'dist').glob('*.ipk')}
    require(set(after) - {p['file'] for p in old_ipks} == {str(PACKAGE.relative_to(ROOT))}, 'Expected exactly one new IPK')
    tools = [Path(__file__),guard,ROOT / 'tests/host/physical_candidate_archive_test.py',ROOT / 'tests/host/physical-candidate-packaged.test.cjs',cli / 'package.json',cli / 'lib/package.js',cli / 'bin/ares-package.js',ROOT / 'package-lock.json']
    report = {'schemaVersion':1,'status':'packaged_checked_local_only','appId':APP,'appVersion':VERSION,'mode':'physical_candidate','reportSchemaVersion':2,
              'candidateRecordSha256':SHA(build_bytes),'binarySha256':build['binarySha256'],'manifestSha256':build['manifestSha256'],
              'package':str(PACKAGE.relative_to(ROOT)),'packageSha256':SHA(PACKAGE.read_bytes()),'packageBytes':PACKAGE.stat().st_size,
              'archiveVerified':True,'archiveInspectionSha256':SHA((PREP / 'archive-inspection.json').read_bytes()),
              'packagingTools':[{'file':str(p.relative_to(ROOT)),'sha256':SHA(p.read_bytes())} for p in tools],
              'retainedLinuxStage':str(stage),'packagesCreated':1,'existingIpksPreserved':len(old_ipks),'preservationPinsChecked':len(pins),
              'offlineNetworkAttempts':0,'policiesBundled':False,'vendorLibrariesBundled':False,'scriptsOrServicesBundled':False,
              'installed':False,'tvTested':False,'simulatorTested':False,'acquisitionGate':'closed_no_real_0.1.12_witnessed_lifecycle_restoration',
              'limits':['Archive/content/mode verification only; no TV runtime proof','Immutable build/native acceptance reused unchanged','Independent termination/restoration still required before acquisition']}
    with receipt.open('x') as stream:
        json.dump(report,stream,indent=2);stream.write('\n')
    print(json.dumps({key:report[key] for key in ['status','package','packageBytes','packageSha256','candidateRecordSha256','offlineNetworkAttempts','acquisitionGate']}))

if __name__ == '__main__':
    main()
