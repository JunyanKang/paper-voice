"""Build a user-facing installer ZIP; developer material stays in the repository."""
from pathlib import Path
import argparse,hashlib,json,os,stat,zipfile
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'dist'
parser=argparse.ArgumentParser();parser.add_argument('--platform',choices=['macOS-arm64','Windows-x64'],default='macOS-arm64');args=parser.parse_args()
windows=args.platform=='Windows-x64';bundle=OUT/('Paper Voice Windows' if windows else 'Paper Voice');engine=bundle/'engine'
version=json.loads((ROOT/'addon/manifest.json').read_text(encoding="utf-8"))['version'];xpi=OUT/'Paper Voice'/f'paper-voice-{version}.xpi'
manifest=json.loads((engine/'runtime-manifest.json').read_text(encoding="utf-8"));packages={x.lower().replace('_','-') for x in manifest['packages']}
archive=OUT/f'Paper-Voice-{version}-{args.platform}.zip';prefix='Paper Voice/'
launcher='安装语音包.cmd' if windows else '安装语音包.command'
if windows:
 launch='@echo off\r\nchcp 65001 >nul\r\n"%~dp0资源\\engine\\python\\python.exe" -E -s -B -X utf8 "%~dp0资源\\install_engine.py"\r\necho.\r\npause\r\n'
else:
 launch='#!/bin/zsh\nset -e\nPACKAGE_DIR="${0:A:h}/资源"\n/usr/bin/env -i HOME="$HOME" PATH=/usr/bin:/bin:/usr/sbin:/sbin LANG=en_US.UTF-8 "$PACKAGE_DIR/engine/python/bin/python3" -E -s -B -X utf8 "$PACKAGE_DIR/install_engine.py"\nprint "\\n按回车关闭窗口。"\nread -r\n'
start=f'''Paper Voice · 论文听读 {version}

1. 完整解压，双击「{launcher}」。
2. 打开 Zotero → 工具 → 插件 → 从文件安装，选择同目录的 .xpi 文件。
3. 打开英文 PDF，鼠标拖选文字即可朗读。点击右下角精灵设置声音、模式与翻译。

声音免费离线运行；开启翻译才联网。请保留「资源」文件夹与安装脚本的相对位置。
{('需要 Windows x64。若提示缺少 DLL，请运行 资源/VC_redist.x64.exe 安装微软免费运行库，再重试。' if windows else '适用于 Apple Silicon Mac（M 系列）、macOS 14+。')}

使用说明、隐私与反馈：https://github.com/JunyanKang/paper-voice
'''
def write_text(z,name,text,executable=False):
 info=zipfile.ZipInfo(prefix+name);info.create_system=3;info.external_attr=(stat.S_IFREG|(0o755 if executable else 0o644))<<16
 z.writestr(info,text.encode('utf-8'),compress_type=zipfile.ZIP_DEFLATED)
def write_file(z,p,name):
 if p.is_symlink():
  info=zipfile.ZipInfo(prefix+name);info.create_system=3;info.external_attr=(stat.S_IFLNK|0o777)<<16;z.writestr(info,os.readlink(p))
 else:z.write(p,prefix+name)
with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED,compresslevel=6) as z:
 write_text(z,launcher,launch,True);write_text(z,'开始使用.txt',start)
 write_file(z,xpi,xpi.name);write_file(z,ROOT/'scripts/install_engine.py','资源/install_engine.py');write_file(z,ROOT/'LICENSE','资源/许可证/Paper Voice.txt')
 for p in sorted(engine.rglob('*')):
  if not p.is_file() and not p.is_symlink():continue
  if any(x in ['.DS_Store','__pycache__'] for x in p.parts) or p.suffix=='.pyc':continue
  write_file(z,p,'资源/engine/'+str(p.relative_to(engine)).replace('\\','/'))
 licenses=bundle/'第三方许可'
 for p in sorted(licenses.rglob('*')):
  if not p.is_file():continue
  rel=p.relative_to(licenses)
  if '许可证' in rel.parts:
   index=rel.parts.index('许可证')+1
   if len(rel.parts)>index and rel.parts[index].lower().replace('_','-') not in packages:continue
  if rel.name=='dependencies.json':
   values=[x for x in json.loads(p.read_text(encoding="utf-8")) if x['name'].lower().replace('_','-') in packages]
   write_text(z,'资源/许可证/第三方/'+str(rel).replace('\\','/'),json.dumps(values,ensure_ascii=False,indent=2));continue
  write_file(z,p,'资源/许可证/第三方/'+str(rel).replace('\\','/'))
 if windows:write_file(z,bundle/'VC_redist.x64.exe','资源/VC_redist.x64.exe')
with zipfile.ZipFile(archive) as z:
 assert z.testzip() is None
 info=z.getinfo(prefix+launcher);assert info.flag_bits&0x800 and info.external_attr>>16&0o111
 top={n[len(prefix):].split('/')[0] for n in z.namelist()};assert top=={launcher,'开始使用.txt',xpi.name,'资源'},top
 assert not any('harness.js' in n or 'test-profile/' in n for n in z.namelist())
checks=OUT/'checksums';checks.mkdir(exist_ok=True)
(checks/(archive.name+'.sha256')).write_text(hashlib.sha256(archive.read_bytes()).hexdigest()+'  '+archive.name+'\n', encoding="utf-8")
print(archive,round(archive.stat().st_size/1024**2,1),'MiB; four top-level items, UTF-8 and executable permissions verified')
