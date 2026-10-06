"""Native installer acceptance checks in disposable folders, never the user's profile."""
from pathlib import Path
import hashlib,json,os,shutil,subprocess,sys,tempfile
r=Path(__file__).resolve().parents[1];base=r/'.build/online-installers';config=json.loads((base/'installer.json').read_text());runtime=config['runtime'];windows=sys.platform=='win32';exe=r/'dist'/f"Paper-Voice-{config['version']}-Windows.exe" if windows else base/'Paper Voice Installer.app/Contents/MacOS/Paper Voice Installer';checks=[]
with tempfile.TemporaryDirectory(prefix='voice-安装 test-') as scratch:
 temp=Path(scratch);assets=temp/'assets';assets.mkdir();cache=temp/'cache';dest=temp/'声音位置/paper-voice-engine';pointer=temp/'settings/paper-voice-location.json'
 for source in [r/'dist/Paper Voice'/config['plugin']['name'],*(r/'.build/download-site/voices'/runtime['id']).glob('*')]:
  try:os.link(source,assets/source.name)
  except OSError:shutil.copyfile(source,assets/source.name)
 def run(*extra,ok=True,package=assets):
  args=[str(exe),'--quiet','--destination',str(dest),'--pointer',str(pointer),'--download-dir',str(cache),'--result',str(temp/'result.txt'),'--plugin-dir',str(temp/'下载/Paper Voice')]
  if package:args+=['--package-dir',str(package)]
  p=subprocess.run(args+list(extra),capture_output=True,text=True,timeout=480)
  detail=(temp/'result.txt').read_text(errors='replace') if (temp/'result.txt').exists() else p.stderr
  assert (p.returncode==0)==ok,(p.returncode,detail,p.stdout)
 run('--plugin-only');exported=temp/'下载/Paper Voice'/config['plugin']['name'];assert hashlib.sha256(exported.read_bytes()).hexdigest()==config['plugin']['sha256'];stamp=exported.stat().st_mtime_ns;run('--plugin-only');assert exported.stat().st_mtime_ns==stamp;exported.write_bytes(b'broken');run('--plugin-only');assert hashlib.sha256(exported.read_bytes()).hexdigest()==config['plugin']['sha256'];checks.append('visible plugin export is verified, reused and repaired');assert (cache/config['plugin']['name']).exists() and not pointer.exists();checks.append('plugin-only does not alter voices or path')
 run('--cancel-test',ok=False);assert not dest.exists() and not pointer.exists();checks.append('cancel never activates partial voices')
 run();assert json.loads(pointer.read_text())['root']==str(dest.resolve());checks.append('install to Chinese and space path and publish discovery pointer')
 python=dest/('python/python.exe' if windows else 'python/bin/python3');worker=dest/'worker.py'
 proc=subprocess.Popen([str(python),'-E','-s','-B','-X','utf8',str(worker)],stdin=subprocess.PIPE,stdout=subprocess.PIPE,text=True,encoding='utf-8')
 try:
  assert json.loads(proc.stdout.readline())['ready']
  import base64,wave,io
  for voice,text in [('af_heart','Reading begins with a clear voice.'),('zm_yunxi','让论文读给你听。'),('jm_kumo','論文を読みます。'),('ff_siwis','La lecture commence ici.')]:
   proc.stdin.write(json.dumps({'text':text,'voice':voice,'rate':1})+'\n');proc.stdin.flush();result=json.loads(proc.stdout.readline());assert result['ok'],result
   with wave.open(io.BytesIO(base64.b64decode(result['audio']))) as audio:assert audio.getnframes()>1000
  checks.append('installed runtime synthesizes four languages')
 finally:proc.stdin.close();proc.wait(timeout=30)
 stamp=worker.stat().st_mtime_ns
 run();assert worker.stat().st_mtime_ns==stamp;checks.append('verified installed voices reused without replacement')
 oldPointer=pointer.read_bytes();worker.write_bytes(b'broken');empty=temp/'missing-assets';empty.mkdir();shutil.copyfile(assets/config['plugin']['name'],empty/config['plugin']['name'])
 # Remove verified cached chunks so recovery must fetch; failure cannot replace the old runtime.
 for f in cache.glob('*.0*'):f.unlink()
 run(ok=False,package=empty);assert worker.read_bytes()==b'broken' and pointer.read_bytes()==oldPointer;checks.append('download failure leaves previous runtime and discovery unchanged')
 corrupt=temp/'corrupt-assets';corrupt.mkdir();shutil.copyfile(assets/config['plugin']['name'],corrupt/config['plugin']['name']);part=runtime['packages'][1]['parts'][0];(corrupt/part['name']).write_bytes(b'corrupt');run(ok=False,package=corrupt);assert worker.read_bytes()==b'broken' and pointer.read_bytes()==oldPointer;checks.append('corrupt download rejected without activation')
 run();assert hashlib.sha256(worker.read_bytes()).hexdigest()==next(f['sha256'] for f in runtime['files'] if f['name']=='worker.py');checks.append('damaged voices repaired')
 assert not list(dest.parent.glob('.paper-voice-setup-*')) and not list(dest.parent.glob('*.install-*'));checks.append('staging directories cleaned')
 subprocess.run([sys.executable,str(r/'scripts/capture_installer_ui.py')],check=True)
 checks.append('native UI glyph coverage and ten visual states captured')
 report={'version':config['version'],'platform':sys.platform,'checks':checks,'passed':True};(base/'test-report.json').write_text(json.dumps(report,indent=2));print(json.dumps(report,indent=2))
