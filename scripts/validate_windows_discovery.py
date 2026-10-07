"""Exercise the compiled installer's path parser without touching the registry."""
from pathlib import Path
import json, os, subprocess, sys, tempfile
if sys.platform != 'win32':
    print('Windows discovery fixtures run on Windows.'); sys.exit(0)
root = Path(__file__).resolve().parents[1]
version = json.loads((root/'package.json').read_text())['version']
exe = root/'dist'/f'Paper-Voice-{version}-Windows.exe'
with tempfile.TemporaryDirectory(prefix='voice-paths-') as tmp:
    base = Path(tmp)
    fixtures = [
        [r'D:\Research Tools\Zotero\zotero.exe', False, r'D:\Research Tools\Zotero\zotero.exe'],
        ['"D:\\研究, 软件\\Zotero\\zotero.exe",0', True, r'D:\研究, 软件\Zotero\zotero.exe'],
        [r'D:\Research, Tools\Zotero\zotero.exe,-12', True, r'D:\Research, Tools\Zotero\zotero.exe'],
        ['  "%PV_DISCOVERY_ROOT%\\Zotero\\zotero.exe"  ', False, r'D:\测试 folder\Zotero\zotero.exe'],
        ['"D:\\Zotero"', False, r'D:\Zotero'],
        [r'D:\a,b\zotero.exe', True, r'D:\a,b\zotero.exe'],
        ['', False, ''],
        [None, True, ''],
    ]
    (base/'cases.json').write_text(json.dumps(fixtures), encoding='utf-8')
    script = base/'check.ps1'
    script.write_text('''$ErrorActionPreference = 'Stop'
$assembly = [Reflection.Assembly]::LoadFrom($env:PV_INSTALLER)
$method = $assembly.GetType('ZoteroInstall').GetMethod('ApplicationPath', [Reflection.BindingFlags]'NonPublic,Static')
$cases = Get-Content -Raw -Encoding UTF8 $env:PV_CASES | ConvertFrom-Json
foreach ($case in $cases) {
  $actual = $method.Invoke($null, @($case[0], [bool]$case[1]))
  if ($actual -cne $case[2]) { throw "Path parse mismatch: $actual vs $($case[2])" }
}
Write-Output "Passed $($cases.Count) custom path fixtures"
''', encoding='utf-8-sig')
    subprocess.run(['powershell','-NoProfile','-File',str(script)],check=True,env={**os.environ,'PV_INSTALLER':str(exe),'PV_CASES':str(base/'cases.json'),'PV_DISCOVERY_ROOT':r'D:\测试 folder'})
    report={'passed':True,'version':version,'cases':len(fixtures)}
    (root/'.build/online-installers/zotero-path-tests.json').write_text(json.dumps(report,indent=2))
