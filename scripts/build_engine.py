"""Build a self-contained arm64 runtime from a verified local portable Python distribution."""
import json
from pathlib import Path
import shutil
import subprocess
import sys
ROOT=Path(__file__).resolve().parents[1]
if len(sys.argv)!=2:
    raise SystemExit('Usage: python3 scripts/build_engine.py PORTABLE_SOURCE_DIR (runtime/python and models/tts required)')
SOURCE=Path(sys.argv[1]).expanduser().resolve()
DEST=ROOT/'dist/Paper Voice/engine'
DEST.mkdir(parents=True,exist_ok=True)
exclude={'torch','torchgen','functorch','whisper','llvmlite','numba','sympy','mpmath','tiktoken','networkx','fsspec','jinja2','markupsafe','pip','setuptools','_distutils_hack','pkg_resources','triton'}
def ignore(path,names):
    return [n for n in names if n in {'__pycache__','distutils-precedence.pth'} or n.endswith('.pyc') or (Path(path).name=='site-packages' and any(n.lower()==x or n.lower().startswith(x+'-') or n.lower().startswith(x+'_') for x in exclude))]
if not (DEST/'python').exists():
    shutil.copytree(SOURCE/'runtime/python',DEST/'python',symlinks=True,ignore=ignore)
shutil.copy2(ROOT/'engine/worker.py',DEST/'worker.py')
(DEST/'models').mkdir(exist_ok=True)
for name in ['kokoro-v1.0.onnx','voices-v1.0.bin']:
    if not (DEST/'models'/name).exists(): shutil.copy2(SOURCE/'models/tts'/name,DEST/'models'/name)
licenses=SOURCE/'licenses'
print('source license dirs:',[str(p) for p in SOURCE.iterdir() if 'license' in p.name])
if licenses.exists(): shutil.copytree(licenses,DEST/'licenses',dirs_exist_ok=True)
print(DEST)
