import base64
import json
import os
import re
import struct
import subprocess
import sys
from native_abi_versions import table, version_providers, missing_imports

binary = sys.argv[1]
firmware = json.load(sys.stdin)

def readelf(file, pass_fds=()):
    return subprocess.check_output(['readelf', '-W', '-h', '-l', '-d', '-V', '--dyn-syms', file], text=True, pass_fds=pass_fds)

out = readelf(binary)
assert 'Machine:                           ARM' in out and 'ELF32' in out and 'soft-float ABI' in out
assert not re.search(r'\((?:RPATH|RUNPATH)\)', out)
interpreter = re.search(r'Requesting program interpreter: ([^]]+)', out)[1]
needed = re.findall(r'Shared library: \[([^]]+)\]', out)
assert interpreter in firmware, f'missing interpreter {interpreter}'
exports = {}
for filename, encoded in firmware.items():
    data = base64.b64decode(encoded, validate=True)
    assert data[:6] == b'\x7fELF\x01\x01' and struct.unpack_from('<H', data, 18)[0] == 40, filename
    assert not (struct.unpack_from('<I', data, 36)[0] & 0x400), filename
    fd = os.memfd_create('firmware-elf', os.MFD_CLOEXEC)
    try:
        assert os.write(fd, data) == len(data)
        entries = readelf(f'/proc/self/fd/{fd}', (fd,))
    finally:
        os.close(fd)
    soname = re.search(r'Library soname: \[([^]]+)\]', entries)
    if filename != interpreter:
        assert soname and soname[1] == os.path.basename(filename), filename
    exports[os.path.basename(filename)] = {symbol for _, _, index, symbol, _ in table(entries) if index != 'UND'}
    print('Checked firmware ARM ELF:', filename)
assert set(needed) <= exports.keys(), f'missing dependencies: {set(needed) - exports.keys()}'
providers = version_providers(out)
required = {(symbol, version_index) for binding, _, index, symbol, version_index in table(out)
            if binding == 'GLOBAL' and index == 'UND'}
missing = missing_imports(required, providers, exports, needed)
if missing:
    print('Missing required imports:', ', '.join(missing))
    sys.exit(1)
print(f'PASS: {len(required)} required dynamic imports, {len(needed)} DT_NEEDED libraries, interpreter {interpreter}; versioned imports matched their exact providers')
