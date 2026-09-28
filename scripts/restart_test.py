from pathlib import Path
import subprocess,os,signal,time
root=Path(__file__).resolve().parents[1]
for line in subprocess.check_output(['ps','-axo','pid,command'],text=True).splitlines():
 if line.strip().split(maxsplit=1)[-1] in ['/Applications/Zotero.app/Contents/MacOS/zotero -no-remote -profile '+str(root/'test-profile')+' -ZoteroDebugText', str(root/'.build/Paper Voice QA.app/Contents/MacOS/zotero')+' -no-remote -profile '+str(root/'test-profile')+' -ZoteroDebugText']:
  pid=int(line.strip().split()[0]);os.kill(pid,signal.SIGTERM)
  for _ in range(30):
   try:os.kill(pid,0)
   except ProcessLookupError:break
   time.sleep(.1)
subprocess.run(['python3',str(root/'scripts/build_test_plugin.py')],check=True)
for name in ['startup-error.txt','zotero-integration.json']:
 p=root/'test-results'/name
 if p.exists():p.unlink()
proc=subprocess.Popen([str(root/'.build/Paper Voice QA.app/Contents/MacOS/zotero'),'-no-remote','-profile',str(root/'test-profile'),'-ZoteroDebugText'],stdout=open(root/'test-results/zotero-process.log','w'),stderr=subprocess.STDOUT,start_new_session=True)
print('Test Zotero PID',proc.pid)
