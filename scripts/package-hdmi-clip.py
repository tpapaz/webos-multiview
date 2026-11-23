"""Package and verify the bounded HDMI 4 + silent clip probe locally."""
import hashlib
import io
import json
from pathlib import Path
import subprocess
import tarfile
import tempfile

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / 'build/phase-2/hdmi-clip-0.1.13'
SOURCE = ROOT / 'native/phase2-hdmi-clip'
FIXTURE = ROOT / 'build/phase-1/package-sinks'
APP = 'io.github.tpapaz.multiview.hdmiwindow'
VERSION = '0.1.13'
MAIN = 'multiview-hdmi-clip'
PACKAGE = ROOT / 'dist' / f'{APP}_{VERSION}_arm.ipk'
CONTROL = ROOT / 'dist' / f'{APP}_0.1.12_arm.ipk'
NODE = Path('/home/tasos/.cache/webos-multiview/node-v22.17.0-linux-x64/bin/node')


def sha(data):
    return hashlib.sha256(data).hexdigest()


def check(condition, message):
    if not condition:
        raise ValueError(message)


def contents(archive, name, expected):
    compressed = subprocess.check_output(['ar', 'p', str(archive), name])
    with tarfile.open(fileobj=io.BytesIO(compressed), mode='r:gz') as files:
        seen = set()
        for entry in files:
            path = Path(entry.name)
            check(not path.is_absolute() and '..' not in path.parts, 'Unexpected archive path')
            key = str(path)
            if entry.isdir():
                check(key == '.' or any(path in Path(p).parents for p in expected), 'Unexpected directory')
                continue
            check(entry.isfile() and key in expected and key not in seen, 'Unexpected archive file')
            data, mode = expected[key]
            check(entry.size == len(data) and entry.mode == mode, 'Unexpected file size or mode')
            check(files.extractfile(entry).read() == data, 'Unexpected file content')
            seen.add(key)
        check(seen == set(expected), 'Missing archive file')


def verify_archive(archive, staged):
    check(archive.is_file() and archive.stat().st_size <= 1048576, 'Unexpected package size')
    members = subprocess.check_output(['ar', 't', str(archive)], text=True).splitlines()
    check(members == ['debian-binary', 'control.tar.gz', 'data.tar.gz'], 'Unexpected package members')
    check(subprocess.check_output(['ar', 'p', str(archive), 'debian-binary']) == b'2.0\n',
          'Invalid Debian archive version')
    control_archive = subprocess.check_output(['ar', 'p', str(archive), 'control.tar.gz'])
    with tarfile.open(fileobj=io.BytesIO(control_archive), mode='r:gz') as files:
        entries = files.getmembers()
        check(len(entries) == 1 and entries[0].name == 'control' and entries[0].isfile() and
              entries[0].size <= 4096, 'Unexpected control archive')
        fields = dict(line.split(': ', 1) for line in files.extractfile(entries[0]).read().decode().splitlines())
        check((fields['Package'], fields['Version'], fields['Architecture']) ==
              (APP, VERSION, 'arm'), 'Wrong package identity')
    app_root = f'usr/palm/applications/{APP}'
    generated = f'usr/palm/packages/{APP}/packageinfo.json'
    expected = {f'{app_root}/{name}': entry for name, entry in staged.items()}
    with tarfile.open(fileobj=io.BytesIO(subprocess.check_output(
            ['ar', 'p', str(archive), 'data.tar.gz'])), mode='r:gz') as files:
        entry = files.getmember(generated)
        check(entry.isfile() and entry.size <= 4096, 'Unexpected package metadata')
        metadata = files.extractfile(entry).read()
        check(json.loads(metadata) == {'id': APP, 'version': VERSION, 'app': APP}, 'Wrong package metadata')
    expected[generated] = (metadata, 0o666)
    contents(archive, 'data.tar.gz', expected)
    return archive.read_bytes()


def record_bindings(staged, package_sha):
    record = OUTPUT / 'installed-bindings.json'
    actual = {'packageSha256': package_sha, 'files': {name: sha(data) for name, (data, _) in staged.items()}}
    if record.exists():
        check(json.loads(record.read_bytes()) == actual, 'Installed binding record differs')
    else:
        with record.open('x') as stream:
            json.dump(actual, stream, indent=2)
            stream.write('\n')


def main():
    receipt = OUTPUT / 'package-validation.json'
    check(PACKAGE.exists() == receipt.exists(), 'Incomplete package or receipt slot')
    manifest_bytes = (SOURCE / 'appinfo.json').read_bytes()
    manifest = json.loads(manifest_bytes)
    check((manifest['id'], manifest['version'], manifest['main'], manifest['type'], manifest['requiredACG']) ==
          (APP, VERSION, MAIN, 'native', []), 'Unexpected manifest')
    binary = (OUTPUT / 'arm' / MAIN).read_bytes()
    abi_bytes = (OUTPUT / 'direct-abi.json').read_bytes()
    abi = json.loads(abi_bytes)
    check(abi['status'] == 'passed_direct_executable_abi' and abi['binarySha256'] == sha(binary),
          'Missing direct ABI validation for this binary')
    control = sha(CONTROL.read_bytes())
    check(control == 'cb7ec17381a23526299545300f5437c3d1fbeb12e45f1466adc05a71ec829e4f',
          'Single-input control differs from the retained receipt')
    media = (FIXTURE / 'clip-b.h264').read_bytes()
    index = (FIXTURE / 'clip-b.frames').read_bytes()
    check(sha(media) == 'aefafa4fd29d635aaddb885d88c9a03d02e3539673feef2683e102f2c8e5ca34' and
          sha(index) == 'b21d2df96ed6949aee02857cbb7af96b2490070eee982a132f6575364aa5cdd3',
          'Unexpected silent clip fixture')
    sizes = [int(value) for value in index.split()]
    check(len(sizes) >= 240 and all(0 < n <= 256 * 1024 for n in sizes) and sum(sizes) == len(media),
          'Invalid clip packet index')
    staged = {
        'appinfo.json': (manifest_bytes, 0o644),
        MAIN: (binary, 0o755),
        'icon.png': ((ROOT / 'apps/probe-ui/icon.png').read_bytes(), 0o644),
        'clip-b.h264': (media, 0o644),
        'clip-b.frames': (index, 0o644),
    }
    if PACKAGE.exists():
        package_sha = sha(verify_archive(PACKAGE, staged))
        check(json.loads(receipt.read_bytes())['packageSha256'] == package_sha, 'Package receipt differs')
        record_bindings(staged, package_sha)
        print(f'Verified existing package {package_sha}')
        return
    cli = ROOT / 'node_modules/@webos-tools/cli'
    check(json.loads((cli / 'package.json').read_bytes())['version'] == '3.2.6', 'Unexpected packager')

    with tempfile.TemporaryDirectory(prefix='multiview-hdmi-clip-') as directory:
        stage = Path(directory) / 'app'
        stage.mkdir()
        for name, (data, mode) in staged.items():
            file = stage / name
            file.write_bytes(data)
            file.chmod(mode)
        command = [str(NODE), '--require', str(ROOT / 'scripts/offline-package-guard.cjs'),
                   str(cli / 'bin/ares-package.js'), str(stage), '--no-minify', '-o', directory]
        result = subprocess.run(command, cwd=ROOT, text=True, stdout=subprocess.PIPE,
                                stderr=subprocess.STDOUT, check=False)
        (OUTPUT / 'packaging.log').write_text(result.stdout)
        check(result.returncode == 0 and 'OFFLINE_PACKAGE_NETWORK_ATTEMPTS:0' in result.stdout,
              'Offline packaging failed, see packaging.log')
        package_bytes = verify_archive(Path(directory) / PACKAGE.name, staged)

    check(sha(CONTROL.read_bytes()) == control, 'Single-input control changed')
    with PACKAGE.open('xb') as stream:
        stream.write(package_bytes)
    result = {
        'status': 'packaged_checked_local_only',
        'package': str(PACKAGE.relative_to(ROOT)),
        'packageSha256': sha(package_bytes),
        'packageBytes': len(package_bytes),
        'binarySha256': sha(binary),
        'directAbiSha256': sha(abi_bytes),
        'clipPackets': len(sizes),
        'offlineNetworkAttempts': 0,
        'tvConnections': 0,
    }
    with receipt.open('x') as stream:
        json.dump(result, stream, indent=2)
        stream.write('\n')
    record_bindings(staged, result['packageSha256'])
    print(json.dumps(result))


if __name__ == '__main__':
    main()
