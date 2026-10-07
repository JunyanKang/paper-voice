"""Read-only local documentation link audit and GitHub-style preview renderer.
Requires markdown2. Generated previews and reports stay under .build/.
"""
from pathlib import Path
from urllib.parse import unquote
import re, json, markdown2, hashlib
root=Path(__file__).resolve().parents[1]
out=root/'.build/docs-preview';out.mkdir(parents=True,exist_ok=True)
names=['README.md','README.en.md','PRIVACY.md','PRIVACY.en.md']+[str(p.relative_to(root)) for p in sorted((root/'docs').glob('*.md'))]
css='''body{margin:0;color:#1f2328;background:#f6f8fa;font:16px/1.6 -apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif}article{max-width:830px;margin:24px auto;padding:32px;background:white;border:1px solid #d1d9e0;border-radius:6px}h1{font-size:32px}h2{font-size:24px;border-bottom:1px solid #d1d9e0;padding-bottom:.3em;margin-top:32px}h3{font-size:20px;margin-top:24px}img{max-width:100%;height:auto}a{color:#0969da;text-decoration:none}table{border-collapse:collapse;margin-top:16px;margin-bottom:16px;max-width:100%}td,th{padding:6px 13px;border:1px solid #d1d9e0}tr:nth-child(2n){background:#f6f8fa}code{background:#eff1f3;padding:2px 4px;border-radius:4px;overflow-wrap:anywhere}pre{overflow:auto;background:#eff1f3;padding:16px}li{margin:4px 0}sub{font-size:13px;color:#57606a}hr{border:0;border-top:1px solid #d1d9e0;margin:28px 0}@media(max-width:700px){article{margin:0;padding:20px;border:0}h1{font-size:28px}h2{font-size:22px}table{font-size:13px}td,th{padding:6px 8px}}'''
def slug(s):return re.sub(r'[^\w\-\s]','',re.sub(r'<[^>]+>','',s).lower()).replace(' ','-')
checks=[]
for name in names:
 p=root/name;s=p.read_text()
 for pair in re.findall(r'\]\(([^)]+)\)|(?:href|src)="([^"]+)"',s):
  ref=next(x for x in pair if x)
  if ref.startswith(('http:','https:','mailto:')):continue
  file,_,anchor=unquote(ref).partition('#');target=(p.parent/file).resolve() if file else p
  assert target.exists(),(name,ref,'missing file')
  if anchor:
   text=target.read_text();headings=[slug(x) for x in re.findall(r'^#+ (.+)$',text,re.M)]
   assert anchor in headings or f'id="{anchor}"' in text,(name,ref,'missing anchor')
  checks.append({'source':name,'target':ref})
 body=str(markdown2.markdown(s,extras=['tables','header-ids','fenced-code-blocks']))
 def rewrite(m):
  attr,ref=m.groups()
  if ref.startswith(('http:','https:','mailto:','#')):return m[0]
  file,sep,anchor=ref.partition('#');target=(p.parent/file).resolve();relative=target.relative_to(root)
  url='/.build/docs-preview/'+str(relative.with_suffix('.html')) if attr=='href' and str(relative) in names else '/'+str(relative)
  if attr=='src':url+='?v='+hashlib.sha256(target.read_bytes()).hexdigest()[:12]
  return f'{attr}="{url}{sep}{anchor}"'
 body=re.sub(r'(href|src)="([^"]+)"',rewrite,body)
 dest=out/Path(name).with_suffix('.html');dest.parent.mkdir(parents=True,exist_ok=True)
 dest.write_text('<!doctype html><html lang="'+('en' if '.en.' in name else 'zh')+'"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Paper Voice · '+name+'</title><style>'+css+'</style><article>'+body+'</article></html>')
(out/'audit.json').write_text(json.dumps({'documents':len(names),'localLinks':len(checks),'checks':checks},ensure_ascii=False,indent=2))
print(f'PASS: {len(names)} documents; {len(checks)} local links and assets')
