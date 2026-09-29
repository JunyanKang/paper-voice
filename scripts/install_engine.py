"""Install the bundled runtime atomically, keeping an existing version as a backup."""
from pathlib import Path
import argparse,datetime,os,platform,shutil,subprocess,sys
parser=argparse.ArgumentParser();parser.add_argument('--lang',choices=['zh','en'],default='zh');args=parser.parse_args()
def tr(zh,en):return en if args.lang=='en' else zh
source=Path(__file__).resolve().parent/'engine'
windows=platform.system()=='Windows'
if windows:
    if platform.machine().lower() not in ('amd64','x86_64'):
        raise SystemExit(tr('此 Windows 语音包适用于 64 位 Intel/AMD 电脑。','This voice pack requires an Intel/AMD x64 Windows computer.'))
    destination=Path(os.environ['APPDATA'])/'Zotero/Zotero/paper-voice-engine'
    relative_python=Path('python/python.exe')
elif platform.system()=='Darwin' and platform.machine()=='arm64':
    if int(platform.mac_ver()[0].split('.')[0])<14:
        raise SystemExit(tr('此语音包需要 macOS 14 或更新版本。','This voice pack requires macOS 14 or later.'))
    destination=Path.home()/'Library/Application Support/Zotero/paper-voice-engine'
    relative_python=Path('python/bin/python3')
else:
    raise SystemExit(tr('请使用与你的操作系统和芯片匹配的语音包。','Please download the voice pack that matches your operating system and processor.'))
if not (source/relative_python).is_file() or not (source/'models/kokoro-v1.0.onnx').is_file():
    raise SystemExit(tr('语音包不完整，请重新完整解压安装包。','Voice resources are incomplete. Extract the entire installation package again.'))
print(tr('正在安装离线声音，无需联网下载，也不需要管理员密码。','Setting up offline voices. No extra download or administrator password is required.'),flush=True)
stamp=datetime.datetime.now().strftime('%Y%m%d-%H%M%S-%f')
staging=destination.with_name(destination.name+'.install-'+stamp)
staging.parent.mkdir(parents=True,exist_ok=True)
shutil.copytree(source,staging,symlinks=True)
probe=subprocess.run([str(staging/relative_python),'-E','-s','-B','-X','utf8','-c','import kokoro_onnx, onnxruntime, soundfile, espeakng_loader'],capture_output=True,text=True,encoding='utf-8')
if probe.returncode:
    hint=tr('请先运行 Resources/VC_redist.x64.exe 安装微软运行库，再重试。','Run Resources/VC_redist.x64.exe to install the Microsoft runtime, then try again.') if windows else ''
    shutil.rmtree(staging)
    raise SystemExit(tr('检查失败，原安装未更改。','Validation failed. Your existing installation is unchanged.')+hint+'\n'+probe.stderr)
backup=None
if destination.exists():
    backup=destination.with_name(destination.name+'.backup-'+stamp)
    destination.rename(backup)
try:
    staging.rename(destination)
except OSError:
    if backup:backup.rename(destination)
    raise
if backup:print(tr('旧版本已保留为：','Previous version saved at: ')+str(backup))
print(tr('安装完成：','Installed at: ')+str(destination))
print(tr('声音已就绪。请在 Zotero 插件管理器中添加下载包里的 .xpi 文件。','Voices are ready. Add the included .xpi file through the Zotero plugin manager.'))
