"""Inspect, never extract/execute, an IPK built from this checkout."""
import hashlib
import io
import json
import pathlib
import subprocess
import sys
import tarfile

ROOT = pathlib.Path(__file__).resolve().parents[1]
APP = 'io.github.tpapaz.multiview.probe'
FILES = {'appinfo.json', 'icon.png', 'index.html', 'probe.js', 'style.css', 'ui.js'}

def require(condition, message):
    if not condition:
        raise ValueError(message)

for filename in sys.argv[1:]:
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
                    require(not entry.mode & 0o111, 'Unexpected executable file')
                    regular.add(entry.name)
                    data = archive.extractfile(entry).read()
                    if member == 'data.tar.gz' and p.name in FILES:
                        require(data == (ROOT / 'apps/probe-ui' / p.name).read_bytes(), 'App content mismatch')
                    if member == 'data.tar.gz' and p.name == 'appinfo.json':
                        manifest = json.loads(data)
                        require(manifest['id'] == APP and manifest['type'] == 'web', 'Unexpected app')
            expected = {'control'} if member == 'control.tar.gz' else {
                'usr/palm/applications/' + APP + '/' + name for name in FILES
            } | {'usr/palm/packages/' + APP + '/packageinfo.json'}
            require(regular == expected, 'Unexpected or missing package files/scripts')
    print('IPK structure/content verified; SHA256 ' + hashlib.sha256(package.read_bytes()).hexdigest())
