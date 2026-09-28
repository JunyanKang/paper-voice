"""Install the bundled runtime atomically, keeping an existing version as a backup."""
from pathlib import Path
import datetime,json,platform,shutil,subprocess,sys
source=Path(__file__).resolve().parent/'engine'
destination=Path.home()/'Library/Application Support/Zotero/paper-voice-engine'
if platform.system()!='Darwin' or platform.machine()!='arm64':
    raise SystemExit('此语音包适用于 Apple Silicon Mac（M1/M2/M3/M4 等）。')
if int(platform.mac_ver()[0].split('.')[0])<14:
    raise SystemExit('此语音包需要 macOS 14 或更新版本。')
if not (source/'python/bin/python3').is_file() or not (source/'models/kokoro-v1.0.onnx').is_file():
    raise SystemExit('语音包不完整，请先解压完整交付包，并保留 engine 文件夹。')
print('正在安装免费离线语音包，不需要联网，也不需要管理员密码。',flush=True)
stamp=datetime.datetime.now().strftime('%Y%m%d-%H%M%S')
staging=destination.with_name(destination.name+'.install-'+stamp)
staging.parent.mkdir(parents=True,exist_ok=True)
shutil.copytree(source,staging,symlinks=True)
probe=subprocess.run([str(staging/'python/bin/python3'),'-E','-s','-B','-c','import kokoro_onnx, onnxruntime, soundfile, espeakng_loader; print("语音运行环境正常")'],capture_output=True,text=True)
if probe.returncode:raise SystemExit('检查失败，原安装未更改：'+probe.stderr)
if destination.exists():
    backup=destination.with_name(destination.name+'.backup-'+stamp)
    destination.rename(backup)
    print('旧版本已保留为：'+str(backup))
staging.rename(destination)
print('安装完成：'+str(destination))
print('在 Zotero 中安装同一文件夹的 paper-voice-1.0.0.xpi，打开 PDF 后点击「听读」即可。')
