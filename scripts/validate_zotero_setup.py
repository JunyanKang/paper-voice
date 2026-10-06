"""Exercise native profile discovery and atomic plugin placement in disposable folders."""
from pathlib import Path
import json,subprocess,sys,tempfile,hashlib,os
r=Path(__file__).resolve().parents[1];base=r/'.build/online-installers';config=json.loads((base/'installer.json').read_text());win=sys.platform=='win32'
exe=r/'dist'/f"Paper-Voice-{config['version']}-Windows.exe" if win else base/'Paper Voice Installer.app/Contents/MacOS/Paper Voice Installer'
xpi=r/'dist/Paper Voice'/config['plugin']['name'];version=config['version'];addon='paper-voice@local.research';checks=[]
with tempfile.TemporaryDirectory(prefix='voice-profiles-') as temp:
 t=Path(temp);home=t/'配置测试';home.mkdir();profile=home/'Profiles/中文 空格';profile.mkdir(parents=True);prefs=profile/'prefs.js';prefs.write_text('user_pref("example.keep", true);\n');(profile/'zotero.sqlite').write_bytes(b'untouched library sentinel');before=prefs.read_bytes()
 def call(action,ok=True,source=xpi):
  result=t/'result.json';result.unlink(missing_ok=True)
  args=[str(exe),'--zotero-action',action,'--profile-base',str(home),'--profile',str(profile),'--xpi',str(source),'--backup-dir',str(t/'backups'),'--result',str(result)]
  p=subprocess.run(args,capture_output=True,timeout=30)
  value=result.read_text(encoding='utf-8-sig') if result.exists() else str(p.stderr)
  assert (p.returncode==0)==ok,(action,p.returncode,value)
  return json.loads(value) if ok else value
 assert call('discover')['profiles']==[]
 absolute=t/'External profile';absolute.mkdir();(absolute/'times.json').write_text('{}')
 (home/'profiles.ini').write_text('\ufeff[General]\nStartWithLastProfile=1\n[Profile0]\nName=研究\nIsRelative=1\nPath=Profiles/中文 空格\n[Profile1]\nName=Separate\nIsRelative=0\nPath='+str(absolute)+'\n[Profile2]\nName=Duplicate\nIsRelative=1\nPath=Profiles/中文 空格\n[Profile3]\nName=Missing\nIsRelative=1\nPath=missing\n',encoding='utf-8')
 discovered=call('discover')['profiles'];assert len(discovered)==2,discovered;assert discovered[0]['name']=='研究';checks.append('BOM, relative/absolute, Chinese/spaced, duplicate and missing profiles')
 (home/'profiles.ini').write_text('[Profile0]\nName=研究\nIsRelative=1\nPath=Profiles/中文 空格\n');assert len(call('discover')['profiles'])==1;checks.append('zero, one and multiple profile choices')
 broken=t/'bad.xpi';broken.write_bytes(b'bad');call('stage',ok=False,source=broken);assert not (profile/'extensions').exists();checks.append('tampered package rejected before placement')
 lock=profile/('parent.lock' if win else '.parentlock')
 with lock.open('w+b') as held:
  if not win:
   import fcntl;fcntl.lockf(held,fcntl.LOCK_EX|fcntl.LOCK_NB)
  call('stage',ok=False);assert not (profile/'extensions').exists()
 checks.append('held native profile lock prevents writes')
 assert call('stage')['state']=='pending';target=profile/'extensions'/f'{addon}.xpi';assert target.read_bytes()==xpi.read_bytes();assert call('status')['state']=='pending';stamp=target.stat().st_mtime_ns;call('stage');assert stamp==target.stat().st_mtime_ns;checks.append('verified atomic placement; identical package reused without rewriting')
 unrelated=profile/'extensions/other-plugin.xpi';unrelated.write_bytes(b'keep')
 def metadata(**kw):
  (profile/'extensions.json').write_text(json.dumps({'addons':[dict(id=addon,version=version,active=False,userDisabled=False,appDisabled=False,**kw)]}))
 for active,disabled,incompatible,expected in [(False,False,False,'pending'),(False,True,False,'disabled'),(False,False,True,'incompatible'),(True,False,False,'installed')]:
  (profile/'extensions.json').write_text(json.dumps({'addons':[dict(id=addon,version=version,active=active,userDisabled=disabled,appDisabled=incompatible)]}));assert call('status')['state']==expected
 checks.append('pending, disabled, incompatible and active distinguished by exact-version metadata')
 target.write_bytes(b'old package');(profile/'addonStartup.json.lz4').write_bytes(b'generated cache');(profile/'extensions.json').write_text(json.dumps({'addons':[dict(id=addon,version='99.0.0')]}));call('stage',ok=False);assert target.read_bytes()==b'old package'
 (profile/'extensions.json').write_text(json.dumps({'addons':[dict(id=addon,version='1.0.0',userDisabled=True)]}));db=(profile/'extensions.json').read_bytes();call('stage');assert next((t/'backups').glob('*.xpi')).read_bytes()==b'old package';assert (profile/'extensions.json').read_bytes()==db;assert not (profile/'addonStartup.json.lz4').exists();assert next((t/'backups').glob('*-addonStartup.json.lz4')).read_bytes()==b'generated cache'
 assert prefs.read_bytes()==before and unrelated.read_bytes()==b'keep' and (profile/'zotero.sqlite').read_bytes()==b'untouched library sentinel';checks.append('newer version protected; replacement backed up; metadata/preferences/library/other plugins unchanged')
 if not win:
  target.unlink();target.symlink_to(xpi);call('stage',ok=False);target.unlink();checks.append('symlink target rejected')
 report={'passed':True,'platform':sys.platform,'version':version,'checks':checks};(base/'zotero-setup-tests.json').write_text(json.dumps(report,indent=2));print(json.dumps(report,indent=2))
