"""Acceptance for exact physical archive content/scope. All fixture archives stay in memory."""
import copy
import gzip
import importlib.util
import io
import json
import os
from pathlib import Path
import tarfile

ROOT=Path(__file__).resolve().parents[2]
spec=importlib.util.spec_from_file_location('physical_archive',ROOT/'scripts/package-physical-candidate.py')
p=importlib.util.module_from_spec(spec)
spec.loader.exec_module(p)
manifest={'id':p.APP,'version':p.VERSION,'type':'native','main':'multiview-hdmi-window','requiredACG':[]}
expected={'appinfo.json':json.dumps(manifest).encode(),'icon.png':b'fixture icon','multiview-hdmi-window':b'fixture ELF'}
base='usr/palm/applications/'+p.APP+'/'
meta='usr/palm/packages/'+p.APP+'/packageinfo.json'
control=('Package: '+p.APP+'\nVersion: '+p.VERSION+'\nSection: misc\nPriority: optional\nArchitecture: arm\nInstalled-Size: 200\nMaintainer: N/A <nobody@example.com>\nDescription: This is a webOS application.\nwebOS-Package-Format-Version: 2\nwebOS-Packager-Version: x.y.x\n').encode()
data=[(base+name,body,0o755 if name=='multiview-hdmi-window' else 0o644,'file') for name,body in expected.items()]
data.append((meta,json.dumps({'id':p.APP,'version':p.VERSION,'app':p.APP}).encode(),0o666,'file'))

def tar(entries,uid=None):
    b=io.BytesIO()
    with tarfile.open(fileobj=b,mode='w:gz') as t:
        for name,body,mode,kind in entries:
            entry=tarfile.TarInfo(name);entry.mode=mode;entry.uid=os.getuid() if uid is None else uid;entry.gid=os.getgid()
            if kind=='link':entry.type=tarfile.SYMTYPE;entry.linkname='forbidden-target'
            elif kind=='directory':entry.type=tarfile.DIRTYPE
            elif kind=='device':entry.type=tarfile.CHRTYPE
            else:entry.size=len(body)
            t.addfile(entry,io.BytesIO(body) if kind=='file' else None)
    return b.getvalue()

def members(entries=None,body=None):
    return {'debian-binary':b'2.0\n','control.tar.gz':tar([('control',control if body is None else body,0o666,'file')]),'data.tar.gz':tar(data if entries is None else entries)}

def inspect(m):return p.inspect_members(m,expected,manifest,os.getuid(),os.getgid())
assert len(inspect(members())['regularFiles'])==5
cases=[]
bad=members();bad['signature']=b'extra';cases.append(bad)
bad=members();bad['debian-binary']=b'1.0\n';cases.append(bad)
for changed in [control.replace(b'Architecture: arm',b'Architecture: all'),control.replace(p.VERSION.encode(),b'0.1.11'),control+b'Depends: foreign.service\n',control+b'Version: 0.1.12\n']:
    cases.append(members(body=changed))
for index in range(3):
    rows=copy.deepcopy(data);name,body,mode,kind=rows[index];rows[index]=(name,body[::-1],mode,kind);cases.append(members(rows))
    rows=copy.deepcopy(data);name,body,mode,kind=rows[index];rows[index]=(name,body,0o777,kind);cases.append(members(rows))
for path in ['../outside','/absolute','usr\\wrong','usr/palm/applications/'+p.APP+'/libvendor.so','usr/palm/services/foreign/services.json']:
    cases.append(members(data+[(path,b'not allowed',0o644,'file')]))
for kind in ['link','device']:
    rows=copy.deepcopy(data);name,body,mode,_=rows[0];rows[0]=(name,body,mode,kind);cases.append(members(rows))
cases.append(members(data+[data[0]]))
cases.append(members(data[:-1]))
rows=copy.deepcopy(data);rows[-1]=(meta,json.dumps({'id':p.APP,'version':'0.1.11','app':p.APP}).encode(),0o666,'file');cases.append(members(rows))
bad=members();bad['control.tar.gz']=tar([('control',control,0o666,'file'),('postinst',b'forbidden',0o755,'file')]);cases.append(bad)
bad=members();bad['data.tar.gz']=tar(data,uid=os.getuid()+1);cases.append(bad)
bad=members();bad['data.tar.gz']=gzip.compress(b'x'*(sum(map(len,expected.values()))+65537));cases.append(bad)
for index,bad in enumerate(cases):
    try:inspect(bad)
    except (ValueError,tarfile.TarError,EOFError):pass
    else:raise AssertionError('Archive acceptance failed case '+str(index))
print(str(len(cases))+' malformed in-memory archive cases refused; valid exact ARM files/metadata/modes accepted; no package or TV actions')
