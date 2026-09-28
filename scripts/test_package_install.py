"""Exercise the actual release launcher after extraction into a Chinese/spaced path."""
from pathlib import Path
import json,os,subprocess,sys,zipfile
root=Path(__file__).resolve().parents[1]
version=json.loads((root/'addon/manifest.json').read_text(encoding='utf-8'))['version']
windows=sys.platform=='win32';platform='Windows-x64' if windows else 'macOS-arm64'
archive=root/'dist'/f'Paper-Voice-{version}-{platform}.zip'
dest=root/'.build'/('交付安装验证 '+version);dest.mkdir(exist_ok=True)
if windows:
 with zipfile.ZipFile(archive) as z:z.extractall(dest)
else:subprocess.run(['/usr/bin/ditto','-x','-k',str(archive),str(dest)],check=True)
profile=dest/'测试用户';profile.mkdir(exist_ok=True)
launch=dest/'Paper Voice'/('安装语音包.cmd' if windows else '安装语音包.command')
env={**os.environ,('APPDATA' if windows else 'HOME'):str(profile)}
command=['cmd','/d','/c',str(launch)] if windows else ['/bin/zsh',str(launch)]
result=subprocess.run(command,input='\n',text=True,capture_output=True,encoding='utf-8',env=env,timeout=120)
print(result.stdout,result.stderr);assert result.returncode==0
installed=profile/('Zotero/Zotero/paper-voice-engine' if windows else 'Library/Application Support/Zotero/paper-voice-engine')
assert (installed/('python/python.exe' if windows else 'python/bin/python3')).exists()
(root/'test-results/clean-package-install.json').write_text(json.dumps({'passed':True,'archive':archive.name,'launcher':launch.name,'chineseAndSpacePath':True,'isolatedUserPath':True,'installExitCode':result.returncode},indent=2),encoding='utf-8')
