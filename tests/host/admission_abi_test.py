"""Regression: the same version name can identify different ELF providers."""
import importlib.util
import pathlib
from unittest.mock import patch

root = pathlib.Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location('admission_abi', root / 'scripts/verify-admission-abi.py')
abi = importlib.util.module_from_spec(spec)
spec.loader.exec_module(abi)

fixture = '''Class: ELF32
Machine:                           ARM
  1: 00000000 0 FUNC GLOBAL DEFAULT UND malloc@GLIBC_2.4 (3)
  2: 00000000 0 FUNC GLOBAL DEFAULT UND cos@GLIBC_2.4 (4)
Version needs section '.gnu.version_r' contains 2 entries:
  0x0000: Version: 1 File: libc.so.6 Cnt: 1
  0x0010: Name: GLIBC_2.4 Flags: none Version: 3
  0x0020: Version: 1 File: libm.so.6 Cnt: 1
  0x0030: Name: GLIBC_2.4 Flags: none Version: 4
'''
with patch.object(abi.subprocess, 'check_output', return_value=fixture):
    result = abi.inspect(pathlib.Path('fixture.elf'))
resolved = {symbol: result['versions'][index][0]
            for _, _, _, symbol, index in result['symbols']}
assert resolved == {'malloc@GLIBC_2.4': 'libc.so.6', 'cos@GLIBC_2.4': 'libm.so.6'}
print('PASS: repeated ELF version names retain their distinct indexed providers')
