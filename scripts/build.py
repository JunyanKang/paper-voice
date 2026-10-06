from pathlib import Path
import zipfile,json
root=Path(__file__).resolve().parents[1]
(root/'addon/panel-style.js').write_text('var PaperVoiceStyle = '+json.dumps((root/'addon/panel.css').read_text(encoding="utf-8"),ensure_ascii=False)+';\n', encoding="utf-8")
out=root/'dist/Paper Voice';out.mkdir(parents=True,exist_ok=True)
version=json.loads((root/'addon/manifest.json').read_text(encoding="utf-8"))['version']
with zipfile.ZipFile(out/f'paper-voice-{version}.xpi','w',zipfile.ZIP_DEFLATED) as z:
 for path in sorted((root/'addon').rglob('*')):
  if path.is_file():
   info=zipfile.ZipInfo(path.relative_to(root/'addon').as_posix(),date_time=(2026,1,1,0,0,0));info.compress_type=zipfile.ZIP_DEFLATED;info.create_system=3;info.external_attr=0o100644<<16
   data=path.read_bytes()
   if path.suffix.lower() in {'.js','.json','.css','.svg','.txt','.html','.xhtml','.ftl'}:data=data.replace(b'\r\n',b'\n')
   z.writestr(info,data)
print(out/f'paper-voice-{version}.xpi')
