import base64, json, os, pathlib, subprocess, time, wave, io, math, array, sys, argparse
root=pathlib.Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser();parser.add_argument('--engine',type=pathlib.Path);args=parser.parse_args()
engine=args.engine or root/'dist/Paper Voice/engine'
python=engine/('python/python.exe' if sys.platform=='win32' else 'python/bin/python3')
environment={'HOME':str(root/'test-results'),'PATH':os.environ.get('SystemRoot','C:\\Windows')+'\\System32' if sys.platform=='win32' else '/usr/bin:/bin','LANG':'en_US.UTF-8','PYTHONPATH':'/bad/path','DYLD_LIBRARY_PATH':'/bad/path'}
for name in ['SystemRoot','WINDIR','APPDATA','LOCALAPPDATA','TEMP','TMP','USERPROFILE']:
 if name in os.environ:environment[name]=os.environ[name]
out=root/'test-results'; out.mkdir(exist_ok=True)
start=time.monotonic()
p=subprocess.Popen([str(python),'-E','-s','-B','-X','utf8',str(engine/'worker.py')],stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=open(out/'engine-stderr.log','w'),text=True,env=environment,encoding='utf-8')
try:
 ready=json.loads(p.stdout.readline()); assert ready['ready']; cold=round(time.monotonic()-start,3)
 results=[]
 for n,voice in enumerate(ready['voices']):
  p.stdin.write(json.dumps({'id':n,'text':'The human retina transforms light into signals that allow us to see the world.','voice':voice,'rate':1})+'\n');p.stdin.flush()
  result=json.loads(p.stdout.readline());assert result['ok'],result
  data=base64.b64decode(result.pop('audio'));(out/(voice+'.wav')).write_bytes(data)
  with wave.open(io.BytesIO(data)) as w:
   assert w.getframerate()==24000 and w.getnframes()>24000
   values=array.array('h',w.readframes(w.getnframes()));rms=math.sqrt(sum(v*v for v in values)/len(values)); assert rms>100
  result.update(voice=voice,bytes=len(data),rms=round(rms,1));results.append(result);print(json.dumps(result),flush=True)
 for req in [{'text':'hello','voice':'invalid','rate':1}, {'text':'hello','voice':'af_heart','rate':3}, {'text':'','voice':'af_heart','rate':1}]:
  p.stdin.write(json.dumps(req)+'\n');p.stdin.flush();assert not json.loads(p.stdout.readline())['ok']
 (out/'engine-test.json').write_text(json.dumps({'coldStartSeconds':cold,'voices':results,'invalidRequestsRejected':3},indent=2))
finally:
 p.stdin.close();p.wait(timeout=15)
