"""Create Zotero updater metadata for the exact built XPI, without publishing."""
from pathlib import Path
import hashlib,json,zipfile
root=Path(__file__).resolve().parents[1]
m=json.loads((root/'addon/manifest.json').read_text(encoding="utf-8"))
version=m['version'];settings=m['applications']['zotero'];out=root/'dist/Paper Voice'
xpi=out/f'paper-voice-{version}.xpi'
with zipfile.ZipFile(xpi) as z:
 assert 'harness.js' not in z.namelist()
 assert json.loads(z.read('manifest.json'))==m
 assert all(not n.startswith(('tests/','test-profile/')) for n in z.namelist())
entry={'version':version,'update_link':f'https://github.com/JunyanKang/paper-voice/releases/download/v{version}/{xpi.name}','update_hash':'sha512:'+hashlib.sha512(xpi.read_bytes()).hexdigest(),'applications':{'zotero':{k:settings[k] for k in ['strict_min_version','strict_max_version']}}}
(out/'updates.json').write_text(json.dumps({'addons':{settings['id']:{'updates':[entry]}}},indent=2)+'\n', encoding="utf-8")
print('Validated XPI and generated updates.json for',version)
