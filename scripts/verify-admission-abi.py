"""Offline C1 admission/lifecycle ELF check. Never executes target binaries."""
import argparse
import hashlib
import json
import pathlib
import re
import subprocess

ROOT = pathlib.Path(__file__).resolve().parents[1]
BUILD = ROOT / 'build/phase-2/admission-arm'
RUNTIME = ROOT / 'build/phase-2/admission-runtime-20261111'
BINARY = BUILD / 'multiview-admission'


def require(condition, message):
    if not condition:
        raise ValueError(message)


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def inspect(path):
    text = subprocess.check_output(
        ['readelf', '-W', '-h', '-l', '-d', '-V', '--dyn-syms', str(path)], text=True)
    require('ELF32' in text and 'Machine:                           ARM' in text,
            'Not ARM32: ' + path.name)
    require('hard-float ABI' not in text, 'Hard-float ABI: ' + path.name)
    symbols = []
    for line in text.splitlines():
        match = re.match(r'^\s*\d+:\s+[0-9a-f]+\s+\d+\s+\S+\s+(GLOBAL|WEAK)\s+'
                         r'(DEFAULT|PROTECTED)\s+(\S+)\s+(\S+)(?:\s+\((\d+)\))?', line)
        if match:
            symbols.append(match.groups())
    versions = {}
    for provider, block in re.findall(r'File: (\S+)\s+Cnt: \d+\n((?:[^\n]*Name: [^\n]+\n)+)', text):
        for version, index in re.findall(r'Name: (\S+).*?Version: (\d+)', block):
            versions[index] = (provider, version)
    return {
        'text': text, 'symbols': symbols, 'versions': versions,
        'needed': re.findall(r'Shared library: \[([^]]+)\]', text),
        'exports': {name for _, _, index, name, _ in symbols if index != 'UND'},
        'definedVersions': set(re.findall(r'Name: (\S+)', text.partition('Version definition section')[2]
                                          .split('Version needs section')[0])),
    }


def main(lifecycle=False):
    build = ROOT / 'build/phase-2/lifecycle-arm' if lifecycle else BUILD
    binary = build / 'multiview-lifecycle' if lifecycle else BINARY
    app_name = binary.name
    old = json.loads((ROOT / 'build/phase-1/abi-endurance-0.1.3.json').read_text())['firmwareLibrarySha256']
    files = {}
    evidence = {}
    for inventory in ['inventory.json', 'transitive-inventory.json']:
        for row in json.loads((RUNTIME / inventory).read_text())['rows']:
            path = RUNTIME / row['localFile']
            require(path.parent == RUNTIME and path.name not in files, 'Invalid/duplicate runtime file')
            require(path.stat().st_size == row['bytes'] and sha(path) == row['sha256'], 'Runtime hash mismatch')
            if path.name in old:
                require(sha(path) == old[path.name], 'Runtime differs from prior C1: ' + path.name)
            files[path.name] = path
            evidence[path.name] = {'sha256': sha(path), 'sourcePath': row['path']}
    for name in ([] if lifecycle else ['libluna-service2.so.3', 'libjson-c.so.4']):
        path = ROOT / 'build/phase-1/firmware-inspection/native-idle' / name
        require(sha(path) == old[name], 'Saved link library changed: ' + name)
        files[name] = path
        evidence[name] = {'sha256': sha(path), 'sourcePath': '/usr/lib/' + name}
    app = inspect(binary)
    require('soft-float ABI' in app['text'], 'Missing application soft-float ABI')
    require(not re.search(r'\((?:RPATH|RUNPATH)\)', app['text']), 'Unexpected application library search path')
    interpreter = re.search(r'Requesting program interpreter: ([^]]+)', app['text'])
    require(interpreter and interpreter[1] == '/lib/ld-linux.so.3', 'Unexpected interpreter')
    expected = {'libluna-service2.so.3', 'libjson-c.so.4', 'libglib-2.0.so.0',
                'libstdc++.so.6', 'libm.so.6', 'libgcc_s.so.1', 'libc.so.6'}
    if lifecycle:
        expected = {'libc.so.6', 'librt.so.1'}
        forbidden = re.compile(r'^(?:LS|wl_|SDL_|egl|SMP|NDL|socket$|connect$|exec|system$|popen$|dlopen$|ioctl$)')
        require(not any(forbidden.match(symbol.split('@')[0]) for _, _, index, symbol, _ in app['symbols']
                        if index == 'UND'), 'Unexpected device/network/command import')
    require(set(app['needed']) == expected, 'Unexpected application dependencies')
    objects = {app_name: app}
    pending = list(app['needed']) + ['ld-linux.so.3']
    while pending:
        name = pending.pop()
        if name in objects:
            continue
        require(name in files, 'Missing runtime dependency: ' + name)
        data = inspect(files[name])
        require('Library soname: [' + name + ']' in data['text'], 'SONAME mismatch: ' + name)
        objects[name] = data
        pending.extend(data['needed'])
    exports = {name: obj['exports'] for name, obj in objects.items()}
    defaults = {symbol.split('@@', 1)[0] for symbols in exports.values()
                for symbol in symbols if '@' not in symbol or '@@' in symbol}
    checked = {}
    cross_provider = []
    for name, obj in objects.items():
        for provider, version in obj['versions'].values():
            require(provider in objects and version in objects[provider]['definedVersions'],
                    name + ': missing required version node ' + version + ' in ' + provider)
        # The executable's versioned copy-relocation symbols need providers too.
        imports = {(symbol, version_index) for binding, _, index, symbol, version_index in obj['symbols']
                   if binding == 'GLOBAL' and (index == 'UND' or
                       (name == app_name and '@' in symbol))}
        for symbol, version_index in sorted(imports):
            base, sep, version = symbol.partition('@')
            if sep:
                provider, needed_version = obj['versions'].get(version_index, (None, None))
                require(needed_version == version, name + ': unmapped version index for ' + symbol)
                # Verneed validates the named object's version nodes; symbol lookup
                # searches the loaded scope for the exact symbol/version. In C1,
                # __tls_get_addr is supplied by ld-linux, not libc. See glibc-2.28
                # elf/dl-lookup.c check_match/do_lookup_x; no source is copied here.
                matches = sorted(candidate for candidate, symbols in exports.items()
                                 if candidate != name and {symbol, base + '@@' + version} & symbols)
                require(matches, name + ': missing versioned symbol ' + symbol)
                if provider not in matches:
                    cross_provider.append({'object': name, 'symbol': symbol,
                                           'versionNodeProvider': provider, 'exporters': matches})
            else:
                require(symbol in defaults, name + ': missing symbol ' + symbol)
        checked[name] = len(imports)
    report = {
        'schemaVersion': 1, 'status': 'passed_static_abi', 'binarySha256': sha(binary),
        'profile': 'lifecycle' if lifecycle else 'admission',
        'deviceReference': {'model': 'LG C1', 'firmware': '03.53.45', 'sdk': '6.5.3'},
        'interpreter': interpreter[1], 'directDependencies': app['needed'],
        'runtimeFiles': {name: evidence[name] for name in objects if name != app_name},
        'requiredSymbolsChecked': checked, 'tvExecuted': False,
        'crossProviderVersionMatches': cross_provider,
        'limits': ['Static ELF dependency closure and required symbol/version checks only',
                   'Optional weak imports and runtime dlopen paths are not behavioral validation',
                   ('No proof of C1 loader execution, process lifecycle or independence' if lifecycle else
                    'No proof of loader execution, caller admission or geometry behavior')],
    }
    (build / 'abi-validation.json').write_text(json.dumps(report, indent=2) + '\n')
    print('PASS: application + %d runtime files; %d required symbols/version references; no target execution' %
          (len(objects) - 1, sum(checked.values())))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--lifecycle', action='store_true', help='verify the fixed fake-worker lifecycle helper')
    main(parser.parse_args().lifecycle)
