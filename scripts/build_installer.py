"""Build a small native download assistant; no voice runtime or XPI is embedded."""
from pathlib import Path
import hashlib,json,os,plistlib,shutil,struct,subprocess,sys,time
ROOT=Path(__file__).resolve().parents[1];version=json.loads((ROOT/'package.json').read_text())['version'];out=ROOT/'.build/online-installers';out.mkdir(parents=True,exist_ok=True)
platform='macOS-arm64' if sys.platform=='darwin' else 'Windows-x64'
xpi=ROOT/'dist/Paper Voice'/f'paper-voice-{version}.xpi'
config={'version':version,'plugin':{'name':xpi.name,'url':f'https://kanglab.cool/paper-voice/v{version}/{xpi.name}','bytes':xpi.stat().st_size,'sha256':hashlib.sha256(xpi.read_bytes()).hexdigest()},'runtime':json.loads((ROOT/'installers'/f'runtime-{platform}.json').read_text())}
(out/'installer.json').write_text(json.dumps(config,ensure_ascii=False,separators=(',',':'))+'\n')
if sys.platform=='darwin':
 app=out/'Paper Voice Installer.app';resources=app/'Contents/Resources';binary=app/'Contents/MacOS/Paper Voice Installer';resources.mkdir(parents=True,exist_ok=True);binary.parent.mkdir(parents=True,exist_ok=True)
 native_source=out/'Installer.swift';native_source.write_text((ROOT/'installers/macos/ZoteroInstall.swift').read_text()+'\n'+(ROOT/'installers/macos/Installer.swift').read_text())
 subprocess.run(['xcrun','swiftc','-O','-module-cache-path',str(out/'swift-cache'),'-target','arm64-apple-macos14.0','-framework','Cocoa',str(native_source),'-o',str(binary)],check=True)
 iconset=out/'PaperVoice.iconset';iconset.mkdir(exist_ok=True)
 for size in [16,32,128,256,512]:
  for factor in [1,2]:subprocess.run(['sips','-z',str(size*factor),str(size*factor),str(ROOT/'addon/assets/mascot.png'),'--out',str(iconset/f'icon_{size}x{size}{"@2x" if factor==2 else ""}.png')],check=True,stdout=subprocess.DEVNULL)
 chunks=b''
 for kind,name in [('icp4','icon_16x16.png'),('icp5','icon_32x32.png'),('icp6','icon_32x32@2x.png'),('ic07','icon_128x128.png'),('ic08','icon_256x256.png'),('ic09','icon_512x512.png'),('ic10','icon_512x512@2x.png')]:
  b=(iconset/name).read_bytes();chunks+=kind.encode()+struct.pack('>I',len(b)+8)+b
 (resources/'PaperVoice.icns').write_bytes(b'icns'+struct.pack('>I',len(chunks)+8)+chunks)
 for obsolete in resources.glob('VoiceSans-*.ttf'):obsolete.unlink()
 for source in [out/'installer.json',ROOT/'addon/assets/mascot.png',ROOT/'installers/commit_runtime.py',ROOT/'LICENSE',*sorted((ROOT/'installers/assets').glob('*'))]:shutil.copyfile(source,resources/source.name)
 background=resources/'DMGBackground.tiff';renderer=out/'render-dmg-background'
 subprocess.run(['xcrun','swiftc','-O','-module-cache-path',str(out/'swift-cache'),'-framework','Cocoa',str(ROOT/'installers/macos/DMGBackground.swift'),'-o',str(renderer)],check=True)
 subprocess.run([str(renderer),str(out)],check=True)
 subprocess.run(['tiffutil','-cathidpicheck',str(out/'dmg-background.png'),str(out/'dmg-background@2x.png'),'-out',str(background)],check=True)
 (resources/'DMGBackground.png').unlink(missing_ok=True)
 info={'CFBundleIdentifier':'io.github.junyankang.paper-voice.installer','CFBundleName':'Paper Voice Installer','CFBundleDisplayName':'Paper Voice 安装助手','CFBundleExecutable':binary.name,'CFBundleVersion':version,'CFBundleShortVersionString':version,'CFBundlePackageType':'APPL','CFBundleIconFile':'PaperVoice','LSMinimumSystemVersion':'14.0','NSHighResolutionCapable':True};(app/'Contents/Info.plist').write_bytes(plistlib.dumps(info));subprocess.run(['codesign','--force','--sign','-',str(app)],check=True)
 import dmgbuild
 from ds_store import DSStore
 from mac_alias import Alias
 mounted={}
 def configure_background(event):
  if event.get('command')=='hdiutil::attach' and event['type']=='command::finished':
   mounted['path']=next(Path(e['mount-point']) for e in event['output']['system-entities'] if e.get('mount-point'))
  if event.get('operation')=='dsstore::create' and event['type']=='operation::finished':
   mount=mounted['path']
   # Keep artwork inside the signed app, so even Show Hidden Files adds no
   # loose image icon to the installation window.
   with DSStore.open(str(mount/'.DS_Store'),'r+') as store:
    view=store['.']['icvp'];view['backgroundType']=2
    view['backgroundImageAlias']=Alias.for_file(str(mount/app.name/'Contents/Resources/DMGBackground.tiff')).to_bytes()
    store['.']['icvp']=view
   subprocess.run(['codesign','--verify','--deep','--strict',str(mount/app.name)],check=True)
 target=ROOT/'dist'/f'Paper-Voice-{version}-macOS.dmg'
 dmgbuild.build_dmg(str(target),'Paper Voice',settings={
  'files':[str(app)],'background':'#edf4f8','format':'UDZO',
  'window_rect':((140,40),(760,700)),'icon_locations':{app.name:(380,150)},
  'icon_size':88,'text_size':13,'show_toolbar':False,'show_status_bar':False,
  'show_pathbar':False,'show_sidebar':False,'show_tab_view':False,'default_view':'icon-view',
  'include_icon_view_settings':True,'include_list_view_settings':False},callback=configure_background)
 for attempt in range(3):
  verified=subprocess.run(['hdiutil','verify',str(target)],capture_output=True,text=True)
  if verified.returncode==0:break
  if 'Resource temporarily unavailable' not in verified.stderr or attempt==2:raise RuntimeError(verified.stderr)
  time.sleep(2)
 print(verified.stdout)
elif sys.platform=='win32':
 subprocess.run(['powershell','-NoProfile','-ExecutionPolicy','Bypass','-File',str(ROOT/'installers/windows/build.ps1'),'-Root',str(ROOT)],check=True)
 csc=Path(os.environ['WINDIR'])/'Microsoft.NET/Framework64/v4.0.30319/csc.exe';target=ROOT/'dist'/f'Paper-Voice-{version}-Windows.exe';target.parent.mkdir(exist_ok=True)
 subprocess.run([str(csc),'/nologo','/target:winexe','/platform:x64','/optimize+','/codepage:65001',*[f'/reference:{lib}.dll' for lib in ['System.Windows.Forms','System.Drawing','System.Core','System.Net.Http','System.Web.Extensions','System.IO.Compression','System.IO.Compression.FileSystem']],f'/win32icon:{ROOT / ".build/installers/PaperVoice.ico"}',f'/win32manifest:{ROOT / "installers/windows/app.manifest"}',f'/resource:{ROOT / "addon/assets/mascot.png"},mascot.png',f'/resource:{out / "installer.json"},installer.json',f'/resource:{ROOT / "installers/commit_runtime.py"},commit_runtime.py',*[f'/resource:{source},{source.name}' for source in sorted((ROOT/'installers/assets').glob('*'))],f'/out:{target}',str(ROOT/'installers/windows/Installer.cs'),str(ROOT/'installers/windows/ZoteroInstall.cs')],check=True)
else:raise SystemExit('Build on macOS or Windows')
assert target.stat().st_size<20*1024*1024
print(target)
