"""Build and smoke-test a Windows x64 portable runtime on a Windows runner."""
from pathlib import Path
import hashlib,json,os,platform,shutil,subprocess,sys,urllib.request,zipfile
ROOT=Path(__file__).resolve().parents[1]
assert sys.platform=='win32' and platform.machine().lower() in ('amd64','x86_64')
BUNDLE=ROOT/'dist/Paper Voice Windows';ENGINE=BUNDLE/'engine';PYTHON=ENGINE/'python'
CACHE=ROOT/'.build/downloads';CACHE.mkdir(parents=True,exist_ok=True);PYTHON.mkdir(parents=True,exist_ok=True)
def download(url,name,expected=None):
 p=CACHE/name
 if not p.exists():
  print('Downloading',name,flush=True)
  urllib.request.urlretrieve(url,p)
 digest=hashlib.sha256(p.read_bytes()).hexdigest()
 if expected:assert digest==expected,(name,digest)
 return p,digest
python_archive,python_hash=download('https://www.python.org/ftp/python/3.12.10/python-3.12.10-embed-amd64.zip','python-3.12.10-embed-amd64.zip')
with zipfile.ZipFile(python_archive) as z:z.extractall(PYTHON)
(PYTHON/'python312._pth').write_text('python312.zip\n.\nLib/site-packages\nimport site\n')
requirements=['kokoro-onnx==0.6.1','onnxruntime==1.22.1','numpy==2.5.3','soundfile==0.13.1','espeakng-loader==0.2.4','phonemizer==3.4.0']
subprocess.run([sys.executable,'-m','pip','install','--disable-pip-version-check','--only-binary=:all:','--target',str(PYTHON/'Lib/site-packages'),*requirements],check=True)
# Reuse the already published, hashed model and license archive; no Mac executable is copied.
reference,_=download('https://github.com/JunyanKang/paper-voice/releases/download/v1.0.0/Paper-Voice-1.0.0-macOS-arm64.zip','reference-1.0.0.zip','f89222bf572450b2985585884553f10482b85a931a246d4e5ba6d3ce677a7b17')
with zipfile.ZipFile(reference) as z:
 for info in z.infolist():
  if info.is_dir():continue
  if info.filename.startswith(('Paper Voice/engine/models/','Paper Voice/第三方许可/')):
   relative=Path(info.filename).relative_to('Paper Voice');target=BUNDLE/relative
   target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(z.read(info))
models={name:hashlib.sha256((ENGINE/'models'/name).read_bytes()).hexdigest() for name in ['kokoro-v1.0.onnx','voices-v1.0.bin']}
assert models['kokoro-v1.0.onnx']=='beb0d1848dee9a49da392cc3df26958d46cfa35d321edf434f52949153f0df3a'
assert models['voices-v1.0.bin']=='bca610b8308e8d99f32e6fe4197e7ec01679264efed0cac9140fe9c29f1fbf7d'
vc,vc_hash=download('https://aka.ms/vs/17/release/vc_redist.x64.exe','VC_redist.x64.exe')
shutil.copy2(vc,BUNDLE/'VC_redist.x64.exe')
for source,target in [('engine/worker.py','engine/worker.py'),('scripts/install_engine.py','install_engine.py'),('scripts/install_engine.cmd','安装免费语音包.cmd')]:shutil.copy2(ROOT/source,BUNDLE/target)
python=PYTHON/'python.exe'
packages=json.loads(subprocess.check_output([str(python),'-E','-s','-B','-X','utf8','-c','import importlib.metadata,json; print(json.dumps({p.metadata["Name"]:p.version for p in importlib.metadata.distributions()}))'],text=True,encoding='utf-8'))
(ENGINE/'runtime-manifest.json').write_text(json.dumps({'platform':'Windows x64','python':{'version':'3.12.10','archiveSHA256':python_hash,'source':'python.org'},'packages':packages,'models':models,'vcRedistributable':{'source':'https://aka.ms/vs/17/release/vc_redist.x64.exe','sha256':vc_hash},'speechNetworkRequired':False},indent=2))
subprocess.run([sys.executable,str(ROOT/'scripts/test_engine.py'),'--engine',str(ENGINE)],check=True)
subprocess.run([str(python),'-E','-s','-B','-X','utf8',str(BUNDLE/'install_engine.py')],check=True)
print('Windows runtime generated six voices and installed successfully',flush=True)
