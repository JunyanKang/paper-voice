"""Exercise the native HTTPS downloader against the deployed release files."""
from pathlib import Path
import hashlib, json, subprocess, sys, tempfile
r=Path(__file__).resolve().parents[1];base=r/'.build/online-installers';config=json.loads((base/'installer.json').read_text());windows=sys.platform=='win32'
exe=r/'dist'/f"Paper-Voice-{config['version']}-Windows.exe" if windows else base/'Paper Voice Installer.app/Contents/MacOS/Paper Voice Installer'
with tempfile.TemporaryDirectory(prefix='voice-public-') as folder:
 t=Path(folder);dest=t/'voices/paper-voice-engine';pointer=t/'settings/location.json';result=t/'result.txt'
 process=subprocess.run([str(exe),'--quiet','--destination',str(dest),'--pointer',str(pointer),'--download-dir',str(t/'cache'),'--result',str(result)],capture_output=True,text=True,timeout=1200)
 assert process.returncode==0, result.read_text(errors='replace') if result.exists() else process.stderr
 assert json.loads(pointer.read_text())['root']==str(dest.resolve())
 xpi=t/'cache'/config['plugin']['name'];assert hashlib.sha256(xpi.read_bytes()).hexdigest()==config['plugin']['sha256']
 assert (dest/'worker.py').exists()
 print('Public HTTPS download, hash verification and full voice setup passed on',sys.platform)
