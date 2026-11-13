"""Exact ELF version-index binding; version names can occur in several DSOs."""
import re


def table(text):
    for line in text.splitlines():
        match = re.match(r'^\s*\d+:\s+[0-9a-f]+\s+\d+\s+\S+\s+(GLOBAL|WEAK)\s+'
                         r'(DEFAULT|PROTECTED)\s+(\S+)\s+(\S+)(?:\s+\((\d+)\))?', line)
        if match:
            yield match.groups()


def version_providers(text):
    providers = {}
    for provider, block in re.findall(r'File: (\S+)\s+Cnt: \d+\n((?:[^\n]*Name: [^\n]+\n)+)', text):
        for version, index in re.findall(r'Name: (\S+)[^\n]*Version: (\d+)', block):
            assert index not in providers, 'Duplicate version index'
            providers[index] = (version, provider)
    return providers


def missing_imports(required, providers, exports, needed):
    unversioned = {sym.split('@@', 1)[0] for library in needed for sym in exports[library]
                   if '@' not in sym or '@@' in sym}
    missing = []
    for symbol, index in sorted(required):
        name, sep, version = symbol.partition('@')
        if sep:
            bound_version, provider = providers.get(index, (None, None))
            if bound_version != version or provider not in needed or not {
                    symbol, f'{name}@@{version}'} & exports.get(provider, set()):
                missing.append(f'{symbol} in {provider or "unknown provider"}')
        elif name not in unversioned:
            missing.append(name)
    return missing
