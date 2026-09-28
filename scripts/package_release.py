"""Package a prepared portable engine with UTF-8 filenames and Unix permissions."""
from pathlib import Path
import hashlib,json,os,shutil,stat,zipfile
root=Path(__file__).resolve().parents[1];out=root/'dist';bundle=out/'Paper Voice'
version=json.loads((root/'addon/manifest.json').read_text())['version']
for name in ['README.md','PRIVACY.md','LICENSE','CHANGELOG.md','测试报告.md']:
 shutil.copy2(root/name,bundle/name)
shutil.copy2(root/'scripts/install_engine.py',bundle/'install_engine.py')
shutil.copy2(root/'scripts/install_engine.command',bundle/'安装免费语音包.command')
(bundle/'安装免费语音包.command').chmod(0o755)
archive=out/f'Paper-Voice-{version}-macOS-arm64.zip'
with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED,compresslevel=6) as z:
 for p in sorted(bundle.rglob('*')):
  if any(x in ['.DS_Store','__pycache__'] for x in p.parts) or p.suffix=='.pyc':continue
  name=str(p.relative_to(out))
  if p.is_symlink():
   info=zipfile.ZipInfo(name);info.create_system=3;info.external_attr=(stat.S_IFLNK|0o777)<<16
   z.writestr(info,os.readlink(p))
  elif p.is_file():z.write(p,name)
with zipfile.ZipFile(archive) as z:
 assert z.testzip() is None
 command=z.getinfo('Paper Voice/安装免费语音包.command')
 assert command.flag_bits&0x800 and command.external_attr>>16&0o111
 assert 'Paper Voice/engine/python/bin/python3' in z.namelist()
 assert not any('harness.js' in n or 'test-profile/' in n for n in z.namelist())
shutil.copy2(bundle/'测试报告.md',out/'TEST-REPORT.md')
files=[archive,bundle/f'paper-voice-{version}.xpi',bundle/'updates.json',out/'TEST-REPORT.md']
(out/'SHA256SUMS').write_text(''.join(hashlib.sha256(p.read_bytes()).hexdigest()+'  '+p.name+'\n' for p in files))
print(archive,round(archive.stat().st_size/1024**2,1),'MiB; archive, UTF-8 and executable permissions verified')
