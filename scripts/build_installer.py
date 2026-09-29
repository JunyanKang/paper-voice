"""Build a native, non-elevated graphical voice installer for the host platform."""
from pathlib import Path
import json,os,plistlib,shutil,subprocess,sys
ROOT=Path(__file__).resolve().parents[1]
version=json.loads((ROOT/'addon/manifest.json').read_text())['version']
if sys.platform=='darwin':
 app=ROOT/'.build/installers/Paper Voice Installer.app';contents=app/'Contents'
 resources=contents/'Resources';binary=contents/'MacOS/Paper Voice Installer'
 binary.parent.mkdir(parents=True,exist_ok=True);resources.mkdir(parents=True,exist_ok=True)
 subprocess.run(['xcrun','swiftc','-O','-target','arm64-apple-macos14.0','-framework','Cocoa',str(ROOT/'installers/macos/Installer.swift'),'-o',str(binary)],check=True)
 iconset=ROOT/'.build/installers/PaperVoice.iconset';iconset.mkdir(exist_ok=True)
 for size in [16,32,128,256,512]:
  for factor in [1,2]:
   subprocess.run(['sips','-z',str(size*factor),str(size*factor),str(ROOT/'addon/assets/mascot.png'),'--out',str(iconset/f'icon_{size}x{size}{"@2x" if factor==2 else ""}.png')],check=True,stdout=subprocess.DEVNULL)
 subprocess.run(['iconutil','-c','icns',str(iconset),'-o',str(resources/'PaperVoice.icns')],check=True)
 shutil.copy2(ROOT/'addon/assets/mascot.png',resources/'mascot.png')
 info={'CFBundleIdentifier':'io.github.junyankang.paper-voice.installer','CFBundleName':'Paper Voice Installer','CFBundleDisplayName':'Paper Voice 安装助手','CFBundleExecutable':binary.name,'CFBundleVersion':version,'CFBundleShortVersionString':version,'CFBundlePackageType':'APPL','CFBundleIconFile':'PaperVoice','LSMinimumSystemVersion':'14.0','NSHighResolutionCapable':True}
 (contents/'Info.plist').write_bytes(plistlib.dumps(info))
 # Sign the app shell. Packaging adds the runtime, then seals the complete bundle.
 subprocess.run(['codesign','--force','--sign','-',str(app)],check=True)
 print(app)
elif sys.platform=='win32':
 out=ROOT/'.build/installers';out.mkdir(parents=True,exist_ok=True)
 subprocess.run(['powershell','-NoProfile','-ExecutionPolicy','Bypass','-File',str(ROOT/'installers/windows/build.ps1'),'-Root',str(ROOT)],check=True)
 csc=Path(os.environ['WINDIR'])/'Microsoft.NET/Framework64/v4.0.30319/csc.exe'
 subprocess.run([str(csc),'/nologo','/target:winexe','/platform:x64','/optimize+','/codepage:65001','/reference:System.Windows.Forms.dll','/reference:System.Drawing.dll','/reference:System.Core.dll',f'/win32icon:{out / "PaperVoice.ico"}',f'/win32manifest:{ROOT / "installers/windows/app.manifest"}',f'/resource:{ROOT / "addon/assets/mascot.png"},mascot.png',f'/out:{out / "Paper Voice Setup.exe"}',str(ROOT/'installers/windows/Installer.cs')],check=True)
 print(out/'Paper Voice Setup.exe')
else:raise SystemExit('Build installers on macOS arm64 or Windows x64.')
