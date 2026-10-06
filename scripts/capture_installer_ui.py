"""Capture actual native controls in each state and validate registered font coverage."""
from pathlib import Path
import subprocess,sys,json
r=Path(__file__).resolve().parents[1];base=r/'.build/online-installers';config=json.loads((base/'installer.json').read_text());win=sys.platform=='win32'
exe=r/'dist'/f"Paper-Voice-{config['version']}-Windows.exe" if win else base/'Paper Voice Installer.app/Contents/MacOS/Paper Voice Installer'
for language in ['zh','en']:
 for state in ['idle','progress','complete','installed','running','multiple','missing','error','path']:
  stem=base/f'installer-{sys.platform}-{language}-{state}'
  args=[str(exe),'--lang',language,'--screenshot',str(stem.with_suffix('.png')),'--visual-report',str(stem.with_suffix('.json')),'--preview-state',state,'--result',str(stem.with_suffix('.error.txt'))]
  if state in ['complete','installed','running','multiple','missing']:args+=['--preview-language-roundtrip']
  if state=='path':args+=['--preview-path',r'C:\科研资料\论文听读\声音\paper-voice-engine' if win else '/Volumes/科研资料/论文听读/声音/paper-voice-engine']
  result=subprocess.run(args,timeout=40)
  if result.returncode:
   error=stem.with_suffix('.error.txt');raise RuntimeError(error.read_text(encoding='utf-8-sig') if error.exists() else f'Installer exited {result.returncode}')
  report=json.loads(stem.with_suffix('.json').read_text(encoding='utf-8'))
  assert all(f['covered'] for f in report['fonts']),report['fonts']
  assert report['width']==640 and report['height']==510,report
  assert report['labels'] and all(l.get('covered',True) for l in report['labels']),report
  assert all(0<=l['frame'][0] and l['frame'][0]+l['frame'][2]<=641 and 0<=l['frame'][1] and l['frame'][1]+l['frame'][3]<=511 for l in report['labels']),report
  if state in ['complete','installed','running','multiple','missing']:assert sum(l['text']==('✓ 已就绪' if language=='zh' else '✓ Ready') for l in report['labels'])>=2,report
  if language=='en' and state in ['idle','path']:assert any('Detect Zotero' in l['text'] for l in report['labels'])
print('PASS: 18 native screenshots; bundled fonts and Chinese path glyphs verified')
