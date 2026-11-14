"""Build/test/package the inert diagnostic locally in the existing WSL SDK. No TV calls."""
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys
import tempfile

root = Path(__file__).resolve().parents[1]
sdk = Path('/home/tasos/.cache/webos-multiview/202608/arm-webos-linux-gnueabi_sdk-buildroot')
node = Path('/home/tasos/.cache/webos-multiview/node-v22.17.0-linux-x64/bin/node')
source = root / 'native/phase2-entry-diagnostic-0.1.6'
manifest = json.loads((source / 'appinfo.json').read_bytes())
original = json.loads((root / 'build/phase-2/hdmi-window-0.1.4/package-validation.json').read_bytes())
version = manifest['version']
assert manifest['id'] == original['appId'] and version == '0.1.6'
assert manifest['main'] == 'multiview-hdmi-window' and manifest['type'] == 'native' and manifest['requiredACG'] == []
assert set(manifest) == {'id', 'version', 'vendor', 'type', 'main', 'title', 'icon', 'transparent', 'requiredACG'}
output = root / ('build/phase-2/entry-diagnostic-' + version)
arm = root / ('build/phase-2/entry-diagnostic-arm-' + version)
host = root / ('build/phase-2/entry-diagnostic-host-' + version)
package = root / 'dist' / (manifest['id'] + '_' + version + '_arm.ipk')
assert not any(p.exists() for p in [output, arm, host, package]), 'Preserve prior outputs; do not overwrite/retry packaging'

def digest(file):
    return hashlib.sha256(file.read_bytes()).hexdigest()

def check_originals():
    assert digest(root / original['package']) == original['packageSha256']
    for pin in original['sources'] + original['policyPayloads']:
        assert digest(root / pin['file']) == pin['sha256']
    previous = json.loads((root / 'build/phase-2/entry-diagnostic-0.1.5/package-validation.json').read_bytes())
    assert digest(root / previous['package']) == previous['packageSha256']
    for pin in previous['sources']:
        assert digest(root / pin['file']) == pin['sha256']
    saved = json.loads((root / 'build/phase-2/hdmi-picture-failure-review-20261114-001/saved-evidence.json').read_bytes())
    for pin in saved['evidencePins']:
        assert digest(root / pin['file']) == pin['sha256']

def run(*command, **kwargs):
    subprocess.run([str(c) for c in command], cwd=root, check=True, **kwargs)

check_originals()
output.mkdir(parents=True)
shutil.copytree(sdk / 'arm-webos-linux-gnueabi/sysroot/usr/include/json-c', host / 'include/json-c')
run('cmake', '-S', source, '-B', host, '-G', 'Ninja', '-DCMAKE_BUILD_TYPE=Debug',
    '-DJSON_C_INCLUDE_DIR=' + str(host / 'include'))
run('cmake', '--build', host)
run('ctest', '--test-dir', host, '--output-on-failure')
run('cmake', '-S', source, '-B', arm, '-G', 'Ninja', '-DCMAKE_BUILD_TYPE=Release',
    '-DCMAKE_TOOLCHAIN_FILE=' + str(sdk / 'share/buildroot/toolchainfile.cmake'),
    '-DLUNA_LIBRARY=' + str(root / 'build/phase-1/firmware-inspection/native-idle/libluna-service2.so.3'),
    '-DCLOCK_LIBRARY=' + str(root / 'build/phase-2/admission-runtime-20261111/librt.so.1'),
    '-DJSON_C_LIBRARY=' + str(root / 'build/phase-1/firmware-inspection/native-idle/libjson-c.so.4'))
run('cmake', '--build', arm)
binary = arm / manifest['main']
run(sys.executable, root / 'scripts/verify-hdmi-window-abi.py', binary, output)
needed = lambda file: sorted(re.findall(r'\(NEEDED\).*\[(.*?)\]', subprocess.check_output(['readelf', '-d', file], text=True)))
assert needed(binary) == needed(root / original['binary']), 'Direct DSO mismatch: review before packaging'
symbols = subprocess.check_output(['nm', '-C', binary], text=True)
for forbidden in ['SDL_', 'LSCall', 'LSRegister', 'LSGmain', 'g_main_', 'hdmi::run(', 'hdmi::checkPolicy(', 'hdmi::request(']:
    assert forbidden not in symbols, 'Unexpected acquisition/bus/graphics function: ' + forbidden
for forbidden in ['system', 'popen', 'execve', 'fork', 'dlopen']:
    assert not re.search(r'\bU ' + forbidden + r'(?:@|$)', symbols, re.M)
assert b'luna://' not in binary.read_bytes(), 'Unused service request strings were not removed'

stage = Path(tempfile.mkdtemp(prefix='multiview-entry-diagnostic-' + version + '-'))
for origin in [binary, source / 'appinfo.json', root / 'apps/probe-ui/icon.png']:
    target = stage / origin.name
    shutil.copyfile(origin, target)
    target.chmod(0o755 if origin == binary else 0o644)
run(node, root / 'node_modules/@webos-tools/cli/bin/ares-package.js', stage, '--no-minify', '-o', root / 'dist',
    env={**os.environ, 'APPDATA': str(root / 'build/cli-data')})
run(sys.executable, root / 'scripts/verify-ipk.py', '--entry-diagnostic', package)
check_originals()
sources = [root / 'native/phase2-entry-diagnostic/diagnostic.h', *source.glob('*.cpp'), *source.glob('*.h'), source / 'CMakeLists.txt', source / 'appinfo.json',
    root / 'native/phase2-hdmi-window/session.cpp', root / 'native/phase2-hdmi-window/session.h',
    root / 'native/phase2-hdmi-window/launch-clock.h', root / 'tests/host/entry_diagnostic_test.cpp']
record = {'schemaVersion': 1, 'status': 'packaged_checked_local_only', 'appId': manifest['id'],
    'appVersion': version, 'mode': 'inert_entry_diagnostic',
    'package': str(package.relative_to(root)), 'packageSha256': digest(package), 'packageBytes': package.stat().st_size,
    'binary': str(binary.relative_to(root)), 'binarySha256': digest(binary), 'binaryBytes': binary.stat().st_size,
    'manifestSha256': digest(source / 'appinfo.json'),
    'sources': [{'file': str(p.relative_to(root)), 'sha256': digest(p)} for p in sources],
    'directLibraries': needed(binary), 'noClientGraphicsBusOrAcquisitionCalls': True,
    'originalPinsUnchanged': True, 'archiveVerified': True, 'hostAcceptancePassed': True, 'directAbiPassed': True,
    'retainedLinuxStage': str(stage), 'nativeAlarmSeconds': 5, 'reportCapBytes': 2048,
    'installed': False, 'tvTested': False, 'simulatorTested': False,
    'limits': ['Not the original binary; success does not explain the 0.1.4 failure',
        'Same direct DSOs; dynamic constructors and full runtime closure are not host-verified',
        'Missing report does not distinguish loader failure from reservation/write failure',
        'Exit intent is not observed termination; separate own-app exit evidence required']}
with (output / 'package-validation.json').open('x') as stream:
    json.dump(record, stream, indent=2)
    stream.write('\n')
print(json.dumps({key: record[key] for key in ['package', 'packageSha256', 'binarySha256', 'status']}))
