"""Create immutable, shared voice downloads from the validated 1.3.10 runtimes."""
from pathlib import Path
import argparse, hashlib, json, stat, zipfile
ROOT=Path(__file__).resolve().parents[1]
BASE='https://junyankang.github.io/paper-voice/'
RUNTIME='2026.10.06'
p=argparse.ArgumentParser();p.add_argument('--platform',choices=['macOS-arm64','Windows-x64','all'],default='all');a=p.parse_args()
out=ROOT/'.build/download-site';parts=out/'voices'/RUNTIME;parts.mkdir(parents=True,exist_ok=True)
def digest(b):return hashlib.sha256(b).hexdigest()
def record(path):return {'name':path.name,'url':BASE+path.relative_to(out).as_posix(),'bytes':path.stat().st_size,'sha256':digest(path.read_bytes())}
def package(name,entries):
 path=ROOT/'.build'/name
 with zipfile.ZipFile(path,'w',zipfile.ZIP_DEFLATED,compresslevel=6) as z:
  for info,data in sorted(entries,key=lambda item:item[0].filename):
   if name=='voices-shared.zip':
    info=zipfile.ZipInfo(info.filename,(2026,10,6,0,0,0));info.create_system=3;info.external_attr=(stat.S_IFREG|0o644)<<16;info.compress_type=zipfile.ZIP_DEFLATED
   z.writestr(info,data)
 chunks=[]
 with path.open('rb') as stream:
  for i in range(100):
   b=stream.read(32*1024*1024)
   if not b:break
   f=parts/(name+f'.{i:03d}');f.write_bytes(b);chunks.append(record(f))
 return {'name':name,'bytes':path.stat().st_size,'sha256':digest(path.read_bytes()),'parts':chunks}
platforms=['macOS-arm64','Windows-x64'] if a.platform=='all' else [a.platform]
for platform in platforms:
 archive=ROOT/'dist'/f'Paper-Voice-1.3.10-{platform}.zip'
 prefix='Paper Voice/'+('Resources/' if platform=='Windows-x64' else 'Paper Voice Installer.app/Contents/Resources/')
 common=[];specific=[];inventory=[]
 with zipfile.ZipFile(archive) as source:
  for info in source.infolist():
   if not info.filename.startswith(prefix):continue
   name=info.filename[len(prefix):]
   if not name.startswith(('engine/','Licenses/')) and name not in ['VC_redist.x64.exe','Paper Voice License.txt']:continue
   data=source.read(info);info.filename=name;info.date_time=(2026,10,6,0,0,0)
   if name.startswith('engine/'):
    symlink=stat.S_ISLNK(info.external_attr>>16)
    inventory.append({'name':name[7:],'bytes':len(data),'sha256':digest(data),**({'link':data.decode()} if symlink else {})})
   (common if name.startswith('engine/models/') else specific).append((info,data))
 shared=package('voices-shared.zip',common)
 runtime=package('runtime-'+platform+'.zip',specific)
 row={'schema':1,'id':RUNTIME,'platform':platform,'packages':[shared,runtime],'files':inventory}
 (ROOT/'installers'/('runtime-'+platform+'.json')).write_text(json.dumps(row,ensure_ascii=False,separators=(',',':'))+'\n')
 print(platform,'download MB',round(sum(p['bytes'] for p in row['packages'])/1e6),flush=True)
(out/'.nojekyll').touch()
