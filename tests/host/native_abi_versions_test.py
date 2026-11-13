"""A shared GLIBC version label must not substitute a different provider."""
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / 'scripts'))
from native_abi_versions import table, version_providers, missing_imports

text = '''
   49: 00000000 0 FUNC GLOBAL DEFAULT UND clock_gettime@GLIBC_2.4 (9)
   50: 00000000 0 FUNC GLOBAL DEFAULT UND read@GLIBC_2.4 (2)
  000000: Version: 1 File: librt.so.1 Cnt: 1
  0x0010: Name: GLIBC_2.4 Flags: none Version: 9
  0x0020: Version: 1 File: libc.so.6 Cnt: 1
  0x0030: Name: GLIBC_2.4 Flags: none Version: 2
'''
providers = version_providers(text)
assert providers == {'9': ('GLIBC_2.4', 'librt.so.1'), '2': ('GLIBC_2.4', 'libc.so.6')}
required = {(symbol, version) for binding, _, index, symbol, version in table(text)
            if binding == 'GLOBAL' and index == 'UND'}
exports = {'librt.so.1': {'clock_gettime@@GLIBC_2.4'}, 'libc.so.6': {'read@@GLIBC_2.4'}}
assert missing_imports(required, providers, exports, list(exports)) == []
wrong = {'librt.so.1': set(), 'libc.so.6': {'read@@GLIBC_2.4', 'clock_gettime@@GLIBC_2.4'}}
assert missing_imports(required, providers, wrong, list(wrong)) == ['clock_gettime@GLIBC_2.4 in librt.so.1']
assert missing_imports({('clock_gettime@GLIBC_2.4', None)}, providers, exports, list(exports))
assert missing_imports(required, providers, {'librt.so.1': {'clock_gettime@@GLIBC_2.17'},
                                          'libc.so.6': exports['libc.so.6']}, list(exports))
print('Exact ABI version-index/provider acceptance checks passed')
