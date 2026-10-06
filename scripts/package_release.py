"""Legacy ZIP packaging, retained for reproducing pre-1.4 releases only."""
from pathlib import Path
import argparse,hashlib,json,os,shutil,stat,subprocess,zipfile
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'dist'
parser=argparse.ArgumentParser();parser.add_argument('--platform',choices=['macOS-arm64','Windows-x64'],default='macOS-arm64');args=parser.parse_args()
windows=args.platform=='Windows-x64';bundle=OUT/('Paper Voice Windows' if windows else 'Paper Voice');engine=bundle/'engine'
version=json.loads((ROOT/'addon/manifest.json').read_text(encoding='utf-8'))['version'];xpi=OUT/'Paper Voice'/f'paper-voice-{version}.xpi'
if tuple(map(int, json.loads((ROOT/'package.json').read_text())['version'].split('.'))) >= (1,4,0):
 raise SystemExit('Use scripts/build_installer.py for DMG/EXE; voice downloads are published separately.')
manifest=json.loads((engine/'runtime-manifest.json').read_text(encoding='utf-8'));packages={x.lower().replace('_','-') for x in manifest['packages']}
archive=OUT/f'Paper-Voice-{version}-{args.platform}.zip'
stage=ROOT/'.build/distribution'/args.platform/'Paper Voice'
if stage.exists():shutil.rmtree(stage)
stage.mkdir(parents=True)
if windows:
 launcher=stage/'Paper Voice Setup.exe';shutil.copy2(ROOT/'.build/installers/Paper Voice Setup.exe',launcher)
 resources=stage/'Resources'
else:
 launcher=stage/'Paper Voice Installer.app';shutil.copytree(ROOT/'.build/installers/Paper Voice Installer.app',launcher,symlinks=True)
 resources=launcher/'Contents/Resources'
resources.mkdir(parents=True,exist_ok=True)
def ignore(path,names):return [n for n in names if n in ['.DS_Store','__pycache__','tests','test'] or n.endswith('.pyc')]
shutil.copytree(engine,resources/'engine',symlinks=True,ignore=ignore,dirs_exist_ok=True)
shutil.copy2(ROOT/'scripts/install_engine.py',resources/'install_engine.py')
shutil.copy2(ROOT/'LICENSE',resources/'Paper Voice License.txt')
shutil.copy2(xpi,stage/xpi.name)
licenses=bundle/'第三方许可'
for p in sorted(licenses.rglob('*')):
 if not p.is_file():continue
 rel=p.relative_to(licenses)
 if '许可证' in rel.parts:
  index=rel.parts.index('许可证')+1
  if len(rel.parts)>index and rel.parts[index].lower().replace('_','-') not in packages:continue
 target=resources/'Licenses'/rel;target.parent.mkdir(parents=True,exist_ok=True)
 if rel.name=='dependencies.json':
  values=[x for x in json.loads(p.read_text(encoding='utf-8')) if x['name'].lower().replace('_','-') in packages]
  target.write_text(json.dumps(values,ensure_ascii=False,indent=2),encoding='utf-8')
 else:shutil.copy2(p,target)
if windows:shutil.copy2(bundle/'VC_redist.x64.exe',resources/'VC_redist.x64.exe')
else:subprocess.run(['codesign','--force','--sign','-',str(launcher)],check=True)
platform_label='Windows x64' if windows else 'Apple Silicon · macOS 14+'
start=f'''<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>开始使用 · Paper Voice</title>
<style>body{{margin:0;background:#faf8f2;color:#133f46;font-family:system-ui,-apple-system,"Microsoft YaHei",sans-serif;line-height:1.8}}main{{max-width:680px;margin:10vh auto;padding:32px}}small{{letter-spacing:.15em}}h1{{font-size:42px;line-height:1.3}}h2{{font-size:20px;margin-top:32px}}p{{color:#526467}}a{{color:#155f6b}}footer{{margin-top:48px;font-size:13px}}</style>
<main><small>PAPER VOICE / {platform_label}</small><h1>让论文，读给你听。</h1><p>欢迎使用 Paper Voice {version}。只需两步，为 Zotero 开启自然听读。</p>
<h2>01　准备声音</h2><p>完整解压后打开 <b>{launcher.name}</b>，点击「安装声音」。{'请保留同目录的 Resources 文件夹。' if windows else '声音资源已包含在安装助手中。'}</p>
<h2>02　添加插件</h2><p>打开 Zotero → 工具 → 插件 → 齿轮 → 从文件安装，选择 <b>{xpi.name}</b>。</p>
<h2>开始你的第一段听读</h2><p>打开 PDF，插件会自动识别原文语言，划选文字即可朗读。点击右下角书页精灵，可切换声音、模式和译文。</p>
<footer><a href="https://github.com/JunyanKang/paper-voice/blob/main/docs/INSTALL.md">安装帮助与系统安全提示</a> · <a href="https://github.com/JunyanKang/paper-voice">使用指南</a><p>1.2.5 及更早版本需安装新版声音包；已安装 1.2.6 及以后完整包，只更新插件即可。声音离线运行，翻译和更新需要联网。</p></footer></main></html>'''
(stage/'开始使用.html').write_text(start,encoding='utf-8')
with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED,compresslevel=6) as z:
 for p in sorted(stage.rglob('*')):
  name='Paper Voice/'+p.relative_to(stage).as_posix()
  if p.is_symlink():
   info=zipfile.ZipInfo(name);info.create_system=3;info.external_attr=(stat.S_IFLNK|0o777)<<16;z.writestr(info,os.readlink(p))
  elif p.is_file():z.write(p,name)
with zipfile.ZipFile(archive) as z:
 assert z.testzip() is None
 top={n.split('/')[1] for n in z.namelist()};expected={launcher.name,'开始使用.html',xpi.name}|({'Resources'} if windows else set());assert top==expected,top
 assert not any(n.endswith(('harness.js','.command','.cmd')) or '/test-profile/' in n for n in z.namelist())
 # Dependencies may contain their upstream tests/licenses; project QA is never copied.
 assert not any(n.startswith(('Paper Voice/tests/','Paper Voice/docs/','Paper Voice/测试报告')) for n in z.namelist())
checks=OUT/'checksums';checks.mkdir(exist_ok=True)
(checks/(archive.name+'.sha256')).write_text(hashlib.sha256(archive.read_bytes()).hexdigest()+'  '+archive.name+'\n',encoding='utf-8')
print(archive,round(archive.stat().st_size/1024**2,1),'MiB; native installer and distribution structure verified')
