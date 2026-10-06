"""Catch missing installer glyphs before a platform build is published."""
from pathlib import Path
from fontTools.ttLib import TTFont
import io,json,zlib
root=Path(__file__).resolve().parents[1]
text=''.join(p.read_text(encoding='utf-8') for p in [root/'installers/macos/Installer.swift',root/'installers/windows/Installer.cs',root/'installers/assets/appearance.json',root/'installers/macos/ZoteroInstall.swift',root/'installers/windows/ZoteroInstall.cs'])
required={ord(c) for c in text if ord(c)>127 and not c.isspace()}
for style in ['Regular','SemiBold']:
 path=root/'installers/assets'/f'VoiceSans-{style}.ttf.deflate'
 font=TTFont(io.BytesIO(zlib.decompress(path.read_bytes(),-15)));cmap=font.getBestCmap()
 assert 'STAT' not in font and 'fvar' not in font, 'Static font still has variable style metadata'
 assert len(cmap)>30000, 'Chinese path coverage unexpectedly reduced'
 assert not (missing:=required-set(cmap)), f'{style} missing glyphs: '+''.join(map(chr,sorted(missing)))
 print(style,len(cmap),'codepoints; all installer copy and Chinese probe covered')
