"""Stage verified downloads; retain older XPI URLs used by existing installers."""
from pathlib import Path
import argparse, hashlib, json, shutil, urllib.request, urllib.error
r=Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser();parser.add_argument('--preserve-published',action='store_true');args=parser.parse_args()
v=json.loads((r/'package.json').read_text())['version'];out=r/'.build/download-site';dest=out/('v'+v);dest.mkdir(parents=True,exist_ok=True)
base='https://junyankang.github.io/paper-voice/'
catalog={}
if args.preserve_published:
 try:
  with urllib.request.urlopen(base+'catalog.json',timeout=60) as response: catalog=json.load(response)
 except urllib.error.HTTPError as error:
  if error.code!=404:raise
 for version,entry in catalog.items():
  if version==v:continue
  import re
  assert re.fullmatch(r'\d+\.\d+\.\d+',version), 'Invalid version'
  target=out/f'v{version}'/f'paper-voice-{version}.xpi';target.parent.mkdir(parents=True,exist_ok=True)
  with urllib.request.urlopen(base+target.relative_to(out).as_posix(),timeout=120) as response: content=response.read(20*1024**2)
  assert len(content)==entry['bytes'] and hashlib.sha256(content).hexdigest()==entry['sha256'], 'Archived XPI verification failed'
  target.write_bytes(content)
p=r/'dist/Paper Voice'/f'paper-voice-{v}.xpi';entry=json.loads((r/'dist/Paper Voice/updates.json').read_text())['addons']['paper-voice@local.research']['updates'][0]
assert entry['version']==v and entry['update_hash']=='sha512:'+hashlib.sha512(p.read_bytes()).hexdigest()
shutil.copyfile(p,dest/p.name);shutil.copyfile(r/'dist/Paper Voice/updates.json',out/'updates.json');(out/'.nojekyll').touch()
catalog[v]={'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()};(out/'catalog.json').write_text(json.dumps(catalog,indent=2)+'\n')
assert sum(p.stat().st_size for p in out.rglob('*') if p.is_file())<950*1024**2
print('Verified download distribution staged; installers contain no voice runtime')
