import zipfile,pathlib,json
root=pathlib.Path(__file__).resolve().parents[1]
with zipfile.ZipFile(root/'test-profile/extensions/paper-voice@local.research.xpi','w',zipfile.ZIP_DEFLATED) as z:
 for p in (root/'addon').rglob('*'):
  if not p.is_file():continue
  data=p.read_bytes()
  if p.name=='bootstrap.js':data+=('\nvar originalStartup = startup; startup = async function(data, reason) { try { await originalStartup(data,reason); Services.scriptloader.loadSubScript(data.rootURI + "harness.js", PaperVoiceScope); } catch(e) { await IOUtils.writeUTF8('+json.dumps(str(root/'test-results/startup-error.txt'))+', String(e)+"\\n"+e.stack); } };\n').encode()
  z.writestr(str(p.relative_to(root/'addon')),data)
 z.writestr('harness.js',(root/'tests/harness.js').read_text().replace('__PAPER_VOICE_TEST_ROOT__',json.dumps(str(root))))
