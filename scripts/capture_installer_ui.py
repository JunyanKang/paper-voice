"""Capture actual native controls in each state and validate registered font coverage."""
from pathlib import Path
import subprocess,sys,json
r=Path(__file__).resolve().parents[1];base=r/'.build/online-installers';config=json.loads((base/'installer.json').read_text());win=sys.platform=='win32'
exe=r/'dist'/f"Paper-Voice-{config['version']}-Windows.exe" if win else base/'Paper Voice Installer.app/Contents/MacOS/Paper Voice Installer'
for language in ['zh','en']:
 for state in ['idle','progress','complete','error','path']:
  stem=base/f'installer-{sys.platform}-{language}-{state}'
  args=[str(exe),'--lang',language,'--screenshot',str(stem.with_suffix('.png')),'--visual-report',str(stem.with_suffix('.json')),'--preview-state',state]
  if state=='path':args+=['--preview-path',r'C:\科研資料\龘字资料库\声音\paper-voice-engine' if win else '/Volumes/科研資料/龘字资料库/声音/paper-voice-engine']
  subprocess.run(args,check=True,timeout=40)
  report=json.loads(stem.with_suffix('.json').read_text(encoding='utf-8'))
  assert all(f['covered'] for f in report['fonts']),report['fonts']
  assert report['width']==640 and report['height']==510,report
  assert report['labels'] and all(l.get('covered',True) for l in report['labels']),report
  assert all(0<=l['frame'][0] and l['frame'][0]+l['frame'][2]<=641 and 0<=l['frame'][1] and l['frame'][1]+l['frame'][3]<=511 for l in report['labels']),report
  if language=='en' and state in ['idle','path']:assert any('Reading & translation' in l['text'] for l in report['labels'])
print('PASS: 10 native screenshots; bundled fonts and Chinese path glyphs verified')
