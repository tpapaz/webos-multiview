"""Check one local HDMI candidate against retained C1 direct ABI providers."""
import base64
import hashlib
import json
from pathlib import Path
import subprocess
import sys

root = Path(__file__).resolve().parents[1]
binary, output = map(Path, sys.argv[1:])
runtime = root / 'build/phase-2/admission-runtime-20261111'
old = json.loads((root / 'build/phase-1/abi-endurance-0.1.3.json').read_text())['firmwareLibrarySha256']
files = {}
for inventory in ['inventory.json', 'transitive-inventory.json']:
    for row in json.loads((runtime / inventory).read_text())['rows']:
        file = runtime / row['localFile']
        assert file.stat().st_size == row['bytes']
        assert hashlib.sha256(file.read_bytes()).hexdigest() == row['sha256']
        files[row['path']] = file
for name in ['libluna-service2.so.3', 'libjson-c.so.4']:
    files['/usr/lib/' + name] = root / 'build/phase-1/firmware-inspection/native-idle' / name
files['/usr/lib/libSDL2-2.0.so.0'] = root / 'build/phase-1/firmware-inspection/libSDL2-2.0.so.0'
for file in files.values():
    if file.name in old:
        assert hashlib.sha256(file.read_bytes()).hexdigest() == old[file.name]
checked = subprocess.run([sys.executable, str(root / 'scripts/verify-native-abi.py'), str(binary)],
    input=json.dumps({name: base64.b64encode(file.read_bytes()).decode() for name, file in files.items()}),
    text=True, capture_output=True)
assert checked.returncode == 0, checked.stdout + checked.stderr
report = {'schemaVersion': 1, 'status': 'passed_direct_executable_abi',
          'binarySha256': hashlib.sha256(binary.read_bytes()).hexdigest(),
          'binaryBytes': binary.stat().st_size,
          'deviceReference': {'model': 'LG C1', 'firmware': '03.53.45', 'sdk': '6.5.3'},
          'runtimeSha256': {name: hashlib.sha256(file.read_bytes()).hexdigest() for name, file in files.items()},
          'report': checked.stdout, 'tvExecuted': False,
          'limits': ['Direct executable providers/imports only; no full graphics closure or dlopen check',
                     'No loader execution, effective admission, picture or restoration proof']}
with (output / 'direct-abi.json').open('x') as stream:
    json.dump(report, stream, indent=2)
    stream.write('\n')
print(checked.stdout.strip())
