"""Probe and atomically promote a verified runtime. Invoked by the native installer."""
from pathlib import Path
import argparse,json,os,shutil,subprocess,sys,uuid
p=argparse.ArgumentParser();p.add_argument('--source',type=Path,required=True);p.add_argument('--destination',type=Path,required=True);p.add_argument('--pointer',type=Path,required=True);p.add_argument('--runtime-id',required=True);p.add_argument('--reuse',action='store_true');a=p.parse_args()
source=a.source.resolve();dest=a.destination.resolve();pointer=a.pointer.resolve()
if dest.name!='paper-voice-engine' or not dest.parent.is_dir():raise SystemExit('Invalid voice directory')
# Only explicit installer arguments choose destinations; user environment is not rewritten.
lock=dest.parent/'.paper-voice-install.lock';handle=lock.open('a+b')
try:
 if sys.platform=='win32':
  import msvcrt
  handle.seek(0);handle.write(b'0');handle.flush();handle.seek(0);msvcrt.locking(handle.fileno(),msvcrt.LK_NBLCK,1)
 else:
  import fcntl
  fcntl.flock(handle,fcntl.LOCK_EX|fcntl.LOCK_NB)
except OSError:raise SystemExit('Another installer is running')
python=source/('python/python.exe' if sys.platform=='win32' else 'python/bin/python3')
env=dict(os.environ,HF_HUB_OFFLINE='1',PYTHONNOUSERSITE='1')
probe=subprocess.run([str(python),'-E','-s','-B','-X','utf8','-c','import kokoro_onnx,onnxruntime,soundfile,espeakng_loader; from misaki.zh import ZHG2P; from misaki.cutlet import Cutlet; assert ZHG2P()("你好")[0]; assert Cutlet()("こんにちは")[0]'],capture_output=True,text=True,encoding='utf-8',timeout=180,env=env)
if probe.returncode:raise SystemExit('Voice check failed. Existing installation unchanged.\n'+probe.stderr[-1800:])
backup=dest.with_name(dest.name+'.previous-'+uuid.uuid4().hex)
candidate=dest.with_name(dest.name+'.install-'+uuid.uuid4().hex)
moved=False
try:
 if not a.reuse:
  shutil.copytree(source,candidate,symlinks=True)
  if dest.exists():dest.rename(backup)
  try:candidate.rename(dest);moved=True
  except BaseException:
   if backup.exists():backup.rename(dest)
   raise
 pointer.parent.mkdir(parents=True,exist_ok=True)
 tmp=pointer.with_name(pointer.name+'.'+uuid.uuid4().hex+'.tmp')
 try:
  tmp.write_text(json.dumps({'schema':1,'root':str(dest),'runtime':a.runtime_id})+'\n',encoding='utf-8');os.replace(tmp,pointer)
 finally:tmp.unlink(missing_ok=True)
except BaseException:
 if moved:
  shutil.rmtree(dest)
  if backup.exists():backup.rename(dest)
 raise
finally:
 if candidate.exists():shutil.rmtree(candidate,ignore_errors=True)
if backup.exists():shutil.rmtree(backup,ignore_errors=True)
print('Voices ready',flush=True)
