"""Build/test/package locally with the existing WSL SDK. No device operations."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile

root = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--sdk', default='/home/tasos/.cache/webos-multiview/202608/arm-webos-linux-gnueabi_sdk-buildroot')
parser.add_argument('--linux-node', default='/home/tasos/.cache/webos-multiview/node-v22.17.0-linux-x64/bin/node')
args = parser.parse_args()
sdk = Path(args.sdk)
source = root / 'native/phase2-hdmi-window'
manifest = json.loads((source / 'appinfo.json').read_bytes())
assert manifest['id'] == 'io.github.tpapaz.multiview.hdmiwindow'
assert manifest['version'] == '0.1.3' and manifest['main'] == 'multiview-hdmi-window'
assert manifest['type'] == 'native' and manifest['requiredACG'] == []
assert set(manifest) == {'id', 'version', 'vendor', 'type', 'main', 'title', 'icon', 'transparent', 'requiredACG'}
version = manifest['version']
output = root / ('build/phase-2/hdmi-window-' + version)
arm = root / ('build/phase-2/hdmi-window-arm-' + version)
host = root / ('build/phase-2/hdmi-window-host-' + version)
package = root / 'dist' / (manifest['id'] + '_' + version + '_arm.ipk')
assert not any(p.exists() for p in [output, arm, host, package]), 'Preserve prior artifacts; use a fresh version/build'
output.mkdir(parents=True)

def run(*command, **kwargs):
    subprocess.run([str(arg) for arg in command], cwd=root, check=True, **kwargs)

def digest(file):
    return hashlib.sha256(file.read_bytes()).hexdigest()

run(args.linux_node, root / 'scripts/check-hdmi-utp-policy.cjs')
run(args.linux_node, root / 'tests/host/hdmi-window-report.test.cjs')
run(args.linux_node, root / 'tests/host/hdmi-window-launch.test.cjs')
run(sys.executable, root / 'tests/host/native_abi_versions_test.py')
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
# A real Linux stage preserves 0755/0644. Retain it; no cleanup/deletion command.
stage = Path(tempfile.mkdtemp(prefix='multiview-hdmi-window-0.1.3-'))
for origin in [binary, source / 'appinfo.json', root / 'apps/probe-ui/icon.png']:
    target = stage / origin.name
    shutil.copyfile(origin, target)
    target.chmod(0o755 if origin == binary else 0o644)
(root / 'dist').mkdir(exist_ok=True)
env = {**os.environ, 'APPDATA': str(root / 'build/cli-data')}
run(args.linux_node, root / 'node_modules/@webos-tools/cli/bin/ares-package.js', stage,
    '--no-minify', '-o', root / 'dist', env=env)
assert package.is_file(), 'Expected native ARM IPK was not produced'
run(sys.executable, root / 'scripts/verify-ipk.py', '--hdmi-window', package)
policy = source / 'policy'
files = [source / n for n in ['main.cpp', 'session.cpp', 'session.h', 'capture.h', 'launch-clock.h', 'CMakeLists.txt', 'appinfo.json']]
payloads = sorted(policy.glob('*.json'))
report = {'schemaVersion': 1, 'status': 'packaged_checked_local_only',
          'appId': manifest['id'], 'appVersion': version,
          'package': str(package.relative_to(root)), 'packageSha256': digest(package),
          'packageBytes': package.stat().st_size,
          'binary': str(binary.relative_to(root)), 'binarySha256': digest(binary),
          'binaryBytes': binary.stat().st_size, 'manifestSha256': digest(source / 'appinfo.json'),
          'sources': [{'file': str(p.relative_to(root)), 'sha256': digest(p)} for p in files],
          'policyPayloads': [{'file': str(p.relative_to(root)), 'sha256': digest(p)} for p in payloads],
          'retainedLinuxStage': str(stage), 'archiveVerified': True, 'hostAcceptancePassed': True,
          'directAbiPassed': True, 'policiesBundled': False, 'vendorLibrariesBundled': False,
          'installed': False, 'permissionDeployed': False, 'simulatorTested': False, 'tvTested': False}
with (output / 'package-validation.json').open('x') as stream:
    json.dump(report, stream, indent=2)
    stream.write('\n')
print(json.dumps({key: report[key] for key in ['package', 'packageSha256', 'binarySha256', 'status']}))
