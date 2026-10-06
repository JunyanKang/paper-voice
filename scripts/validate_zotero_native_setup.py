"""Confirm first-install detection by an official Zotero, with default addon security."""
from pathlib import Path
import json,subprocess,sys,tempfile,os,time,urllib.request,plistlib,shutil
r=Path(__file__).resolve().parents[1];base=r/'.build/online-installers';config=json.loads((base/'installer.json').read_text());win=sys.platform=='win32';version=config['version'];id='paper-voice@local.research';checks=[]
installer=r/'dist'/f'Paper-Voice-{version}-Windows.exe' if win else base/'Paper Voice Installer.app/Contents/MacOS/Paper Voice Installer';xpi=r/'dist/Paper Voice'/config['plugin']['name'];host=r/'.build/zotero-setup-host';host.mkdir(exist_ok=True)
release='10.0.3-beta.2%2B80bc5565e';prefix=f'https://download.zotero.org/client/beta/{release}/Zotero-{release}'
if win:
 setup=host/'setup.exe';urllib.request.urlretrieve(prefix+'_x64_setup.exe',setup);app=host/'Zotero';subprocess.run([str(setup),'/S','/D='+str(app)],check=True,timeout=180);binary=app/'zotero.exe'
else:
 custom=os.environ.get('PAPER_VOICE_QA_APP')
 if custom:app=Path(custom)
 else:
  disk=host/'Zotero.dmg';urllib.request.urlretrieve(prefix+'.dmg',disk);attached=plistlib.loads(subprocess.check_output(['hdiutil','attach','-readonly','-nobrowse','-plist',str(disk)]));mount=Path(next(e['mount-point'] for e in attached['system-entities'] if e.get('mount-point')))
  app=host/'Zotero.app'
  try:subprocess.run(['ditto',str(next(mount.glob('*.app'))),str(app)],check=True)
  finally:subprocess.run(['hdiutil','detach',str(mount)],check=True)
 binary=app/'Contents/MacOS/zotero'
with tempfile.TemporaryDirectory(prefix='voice-native-') as temp:
 t=Path(temp);profile=t/'测试 profile';profile.mkdir();library=t/'library';library.mkdir();prefs={'extensions.zotero.dataDir':str(library),'extensions.zotero.useDataDir':True,'extensions.zotero.firstRun2':False,'extensions.zotero.firstRunGuidance':False,'extensions.zotero.automaticScraperUpdates':False,'app.update.auto':False,'browser.shell.checkDefaultBrowser':False}
 # No autoDisableScopes override and no pre-written addon database.
 (profile/'prefs.js').write_text(''.join('user_pref('+json.dumps(k)+', '+json.dumps(v)+');\n' for k,v in prefs.items()),encoding='utf-8')
 (t/'profiles.ini').write_text('[Profile0]\nName=QA\nIsRelative=1\nPath=测试 profile\n',encoding='utf-8')
 def call(operation,ok=True):
  result=t/'result.json';args=[str(installer),'--zotero-action',operation,'--profile-base',str(t),'--profile',str(profile),'--xpi',str(xpi),'--backup-dir',str(t/'backup'),'--result',str(result)]
  p=subprocess.run(args,capture_output=True,timeout=40);assert (p.returncode==0)==ok,(p.returncode,result.read_text(errors='replace'));return json.loads(result.read_text(encoding='utf-8-sig')) if ok else None
 assert call('stage')['state']=='pending'
 log=open(base/'zotero-native.log','w',encoding='utf-8');proc=subprocess.Popen([str(binary),'-no-remote','-profile',str(profile),'-ZoteroDebugText'],stdout=log,stderr=subprocess.STDOUT)
 try:
  deadline=time.monotonic()+180;metadata=None
  while time.monotonic()<deadline:
   try:metadata=next(a for a in json.loads((profile/'extensions.json').read_text())['addons'] if a['id']==id)
   except (OSError,ValueError,StopIteration):pass
   if metadata and metadata.get('version')==version:break
   time.sleep(1)
  assert metadata and metadata['version']==version,metadata
  assert metadata.get('userDisabled') is True and metadata.get('active') is False,metadata
  assert call('status')['state']=='disabled';checks.append('official Zotero discovers XPI; default security requires first activation')
  call('stage',False);checks.append('running Zotero native profile lock blocks replacement')
  detection=call('discover');assert detection['profiles'][0]['name']=='QA';assert detection['applications'],detection;checks.append('official application detected and identity/version validated')
 finally:
  proc.terminate()
  try:proc.wait(timeout=30)
  except subprocess.TimeoutExpired:proc.kill();proc.wait(timeout=10)
  log.close()
 report={'passed':True,'version':version,'platform':sys.platform,'checks':checks,'metadata':{k:metadata.get(k) for k in ['version','active','userDisabled','appDisabled','foreignInstall']}}
 (base/'zotero-native-setup.json').write_text(json.dumps(report,indent=2));print(json.dumps(report,indent=2))
