"""Stage versioned downloads for Pages, keeping Release limited to two installers."""
from pathlib import Path
import json,hashlib,shutil
r=Path(__file__).resolve().parents[1];v=json.loads((r/'package.json').read_text())['version'];out=r/'.build/download-site';dest=out/('v'+v);dest.mkdir(parents=True,exist_ok=True)
p=r/'dist/Paper Voice'/f'paper-voice-{v}.xpi';entry=json.loads((r/'dist/Paper Voice/updates.json').read_text())['addons']['paper-voice@local.research']['updates'][0]
assert entry['version']==v and entry['update_hash']=='sha512:'+hashlib.sha512(p.read_bytes()).hexdigest()
shutil.copyfile(p,dest/p.name);shutil.copyfile(r/'dist/Paper Voice/updates.json',out/'updates.json');(out/'.nojekyll').touch()
assert sum(p.stat().st_size for p in out.rglob('*') if p.is_file())<950*1024**2
print('Download distribution staged; no runtime files in the installers')
