import base64, json, os, pathlib, subprocess, time, wave, io, math, array
root=pathlib.Path(__file__).resolve().parents[1]
engine=root/'dist/Paper Voice/engine'
out=root/'test-results'; out.mkdir(exist_ok=True)
start=time.monotonic()
p=subprocess.Popen([str(engine/'python/bin/python3'),'-E','-s','-B',str(engine/'worker.py')],stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=open(out/'engine-stderr.log','w'),text=True,env={'HOME':str(out),'PATH':'/usr/bin:/bin','LANG':'en_US.UTF-8','PYTHONPATH':'/bad/path','DYLD_LIBRARY_PATH':'/bad/path'})
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
