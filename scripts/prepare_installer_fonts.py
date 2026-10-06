"""Regenerate process-private Voice Sans from the pinned OFL Noto Sans SC source."""
import argparse,hashlib,io,zlib
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
p=argparse.ArgumentParser();p.add_argument('--source',type=Path,required=True);a=p.parse_args()
assert hashlib.sha256(a.source.read_bytes()).hexdigest()=='a3041811a78c361b1de50f953c805e0244951c21c5bd412f7232ef0d899af0da'
out=Path(__file__).resolve().parents[1]/'installers/assets'
for weight,style in [(400,'Regular'),(600,'SemiBold')]:
 f=instantiateVariableFont(TTFont(a.source),{'wght':weight},inplace=True)
 # Static faces must not retain variable-axis style names: GDI appends them
 # to the family while CoreText does not, causing name-based substitution.
 if 'STAT' in f:del f['STAT']
 f['name'].names=[n for n in f['name'].names if n.nameID<256 and n.nameID!=25]
 # Separate families avoid GDI/CoreText resolving both faces to the same weight.
 family='Voice Sans' if weight==400 else 'Voice Sans Semibold'
 for record in f['name'].names:
  if record.nameID in [1,2,3,4,6,16,17]:
   value={1:family,2:'Regular',3:'VoiceSans-'+style,4:family,6:'VoiceSans-'+style,16:family,17:'Regular'}[record.nameID];record.string=value.encode(record.getEncoding())
 f['OS/2'].fsSelection=(f['OS/2'].fsSelection & ~((1<<5)|(1<<0))) | (1<<6);f['head'].macStyle=0
 data=io.BytesIO();f.save(data);compress=zlib.compressobj(9,zlib.DEFLATED,-15)
 target=out/('VoiceSans-'+style+'.ttf.deflate');target.write_bytes(compress.compress(data.getvalue())+compress.flush());print(target.name,target.stat().st_size,len(f.getBestCmap()),'codepoints')
