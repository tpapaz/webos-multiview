"""Inspect, never extract/execute, an IPK built from this checkout."""
import argparse
import hashlib
import io
import json
import pathlib
import subprocess
import tarfile

ROOT = pathlib.Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--mixed', action='store_true', help='verify the Phase 1 SMP + NDL package')
parser.add_argument('--ndl', action='store_true', help='verify the Phase 1 NDL test package')
parser.add_argument('packages', nargs='+')
args = parser.parse_args()

if args.ndl or args.mixed:
    target = 'mixed' if args.mixed else 'ndl'
    source = ROOT / ('native/phase1-' + target)
    stage = ROOT / ('build/phase-1/package-' + target)
    executable = 'multiview-' + target
    files = {name: stage / name for name in ['guide.bmp', 'clip-b.h264', 'clip-b.frames']}
    if args.mixed:
        files.update({name: stage / name for name in ['clip-a.h264', 'clip-a.frames']})
    files.update({
        'appinfo.json': source / 'appinfo.json',
        'icon.png': ROOT / 'apps/probe-ui/icon.png',
        executable: ROOT / 'build/phase-1' / target / executable,
    })
else:
    source = ROOT / 'apps/probe-ui'
    executable = None
    files = {name: source / name for name in ['appinfo.json', 'icon.png', 'index.html', 'probe.js', 'style.css', 'ui.js']}

manifest = json.loads((source / 'appinfo.json').read_bytes())
app = manifest['id']
architecture = 'arm' if args.ndl or args.mixed else 'all'

def require(condition, message):
    if not condition:
        raise ValueError(message)

for filename in args.packages:
    package = pathlib.Path(filename)
    members = subprocess.check_output(['ar', 't', str(package)], text=True).splitlines()
    require(members == ['debian-binary', 'control.tar.gz', 'data.tar.gz'], 'Unexpected IPK members')
    require(subprocess.check_output(['ar', 'p', str(package), 'debian-binary']) == b'2.0\n', 'Invalid Debian format')
    for member in ['control.tar.gz', 'data.tar.gz']:
        raw = subprocess.check_output(['ar', 'p', str(package), member])
        with tarfile.open(fileobj=io.BytesIO(raw), mode='r:gz') as archive:
            regular = set()
            for entry in archive:
                p = pathlib.PurePosixPath(entry.name)
                require(not p.is_absolute() and '..' not in p.parts, 'Unsafe archive path')
                require(entry.isfile() or entry.isdir(), 'Unexpected link/device')
                if entry.isfile():
                    if p.name == executable and member == 'data.tar.gz':
                        require(entry.mode == 0o755, 'Invalid executable mode')
                    else:
                        require(not entry.mode & 0o111, 'Unexpected executable file')
                    require(entry.name not in regular, 'Duplicate archive member')
                    regular.add(entry.name)
                    data = archive.extractfile(entry).read()
                    if member == 'data.tar.gz' and p.name in files:
                        require(data == files[p.name].read_bytes(), 'App content mismatch: ' + p.name)
                    if member == 'control.tar.gz' and entry.name == 'control':
                        fields = data.decode().splitlines()
                        require(f'Package: {app}' in fields and f"Version: {manifest['version']}" in fields
                                and f'Architecture: {architecture}' in fields, 'Unexpected package metadata')
            expected = {'control'} if member == 'control.tar.gz' else {
                'usr/palm/applications/' + app + '/' + name for name in files
            } | {'usr/palm/packages/' + app + '/packageinfo.json'}
            require(regular == expected, 'Unexpected or missing package files/scripts')
    print('IPK structure/content verified; SHA256 ' + hashlib.sha256(package.read_bytes()).hexdigest())
