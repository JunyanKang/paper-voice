"""Exercise the plugin inside official Windows Zotero with an isolated test library."""
from pathlib import Path
import json,os,subprocess,sys,time,urllib.request
ROOT=Path(__file__).resolve().parents[1];BUILD=ROOT/'.build';PROFILE=ROOT/'test-profile';RESULTS=ROOT/'test-results'
(PROFILE/'extensions').mkdir(parents=True,exist_ok=True);RESULTS.mkdir(exist_ok=True)
setup=BUILD/'Zotero-Windows-setup.exe'
url='https://download.zotero.org/client/beta/10.0.3-beta.2%2B80bc5565e/Zotero-10.0.3-beta.2%2B80bc5565e_x64_setup.exe'
print('Downloading official Windows Zotero',flush=True);urllib.request.urlretrieve(url,setup)
app=BUILD/'Zotero';subprocess.run([str(setup),'/S','/D='+str(app)],check=True,timeout=180)
prefs={'extensions.zotero.dataDir':str(ROOT/'test-library'),'extensions.zotero.useDataDir':True,'extensions.zotero.firstRun2':False,'extensions.zotero.firstRunGuidance':False,'extensions.autoDisableScopes':0,'extensions.paperVoice.enginePath':'','app.update.auto':False}
(PROFILE/'prefs.js').write_text(''.join('user_pref('+json.dumps(k)+','+json.dumps(v)+');\n' for k,v in prefs.items()), encoding="utf-8")
subprocess.run([sys.executable,str(ROOT/'scripts/build_test_plugin.py')],check=True)
log=open(RESULTS/'windows-zotero.log','w',encoding='utf-8')
proc=subprocess.Popen([str(app/'zotero.exe'),'-wait-for-browser','-no-remote','-profile',str(PROFILE),'-ZoteroDebugText'],stdout=log,stderr=subprocess.STDOUT)
def wait_json(name,timeout):
 path=RESULTS/name;deadline=time.monotonic()+timeout
 while time.monotonic()<deadline:
  if path.exists():
   try:return json.loads(path.read_text(encoding='utf-8'))
   except (ValueError,PermissionError):pass
  if proc.poll() not in (None,0):raise RuntimeError('Zotero exited: '+str(proc.returncode))
  time.sleep(1)
 raise TimeoutError(name)
try:
 first=wait_json('zotero-integration.json',240);print(json.dumps(first),flush=True);assert first['passed'],first
 command="const results=[];for(const file of ['extended-integration.js','document-integration.js','quick-controls-integration.js','citation-highlight-integration.js']){const code=await IOUtils.readUTF8(PaperVoice.testRoot+'/tests/'+file);results.push(await new Function('Zotero','PaperVoice','IOUtils','Services','ChromeUtils','return (async()=>{'+code+'})()')(Zotero,PaperVoice,IOUtils,Services,ChromeUtils));}return results;"
 (RESULTS/'test-command.js').write_text(command,encoding='utf-8')
 result=wait_json('test-command-result.json',480);print(json.dumps(result),flush=True);assert result['ok'],result
 assert all(x['passed'] for x in result['value'])
 (RESULTS/'windows-native-passed.json').write_text(json.dumps({'passed':True,'version':first['version'],'platform':sys.platform,'checks':first['checks'],'suites':result['value']},indent=2), encoding="utf-8")
finally:
 proc.terminate()
 try:proc.wait(timeout=20)
 except subprocess.TimeoutExpired:proc.kill()
 log.close()
 print((RESULTS/'windows-zotero.log').read_text(encoding='utf-8',errors='replace')[-12000:])
