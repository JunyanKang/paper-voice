from pathlib import Path
import zipfile,json
root=Path(__file__).resolve().parents[1]
(root/'addon/panel-style.js').write_text('var PaperVoiceStyle = '+json.dumps((root/'addon/panel.css').read_text(encoding="utf-8"),ensure_ascii=False)+';\n', encoding="utf-8")
out=root/'dist/Paper Voice';out.mkdir(parents=True,exist_ok=True)
version=json.loads((root/'addon/manifest.json').read_text(encoding="utf-8"))['version']
with zipfile.ZipFile(out/f'paper-voice-{version}.xpi','w',zipfile.ZIP_DEFLATED) as z:
 for path in sorted((root/'addon').rglob('*')):
  if path.is_file(): z.write(path,path.relative_to(root/'addon'))
print(out/f'paper-voice-{version}.xpi')
