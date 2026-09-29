"""Install the bundled runtime atomically, keeping an existing version as a backup."""
from pathlib import Path
import datetime,json,os,platform,shutil,subprocess,sys
source=Path(__file__).resolve().parent/'engine'
windows=platform.system()=='Windows'
if windows:
    if platform.machine().lower() not in ('amd64','x86_64'):
        raise SystemExit('此 Windows 语音包适用于 64 位 Intel/AMD 电脑。')
    destination=Path(os.environ['APPDATA'])/'Zotero/Zotero/paper-voice-engine'
    relative_python=Path('python/python.exe')
elif platform.system()=='Darwin' and platform.machine()=='arm64':
    if int(platform.mac_ver()[0].split('.')[0])<14:
        raise SystemExit('此语音包需要 macOS 14 或更新版本。')
    destination=Path.home()/'Library/Application Support/Zotero/paper-voice-engine'
    relative_python=Path('python/bin/python3')
else:
    raise SystemExit('请使用与你的操作系统和芯片匹配的语音包。')
if not (source/relative_python).is_file() or not (source/'models/kokoro-v1.0.onnx').is_file():
    raise SystemExit('语音包不完整或平台不匹配，请解压完整安装包并保留 engine 文件夹。')
print('正在安装离线声音，无需联网下载，也不需要管理员密码。',flush=True)
stamp=datetime.datetime.now().strftime('%Y%m%d-%H%M%S')
staging=destination.with_name(destination.name+'.install-'+stamp)
staging.parent.mkdir(parents=True,exist_ok=True)
shutil.copytree(source,staging,symlinks=True)
probe=subprocess.run([str(staging/relative_python),'-E','-s','-B','-X','utf8','-c','import kokoro_onnx, onnxruntime, soundfile, espeakng_loader; print("语音运行环境正常")'],capture_output=True,text=True,encoding='utf-8')
if probe.returncode:
    hint='请先运行同目录的 VC_redist.x64.exe 安装微软免费运行库，再重试。' if windows else ''
    raise SystemExit('检查失败，原安装未更改。'+hint+'\n'+probe.stderr)
if destination.exists():
    backup=destination.with_name(destination.name+'.backup-'+stamp)
    destination.rename(backup)
    print('旧版本已保留为：'+str(backup))
staging.rename(destination)
print('安装完成：'+str(destination))
print('声音已就绪。请在 Zotero 插件管理器中添加下载包里的 .xpi 文件。')
