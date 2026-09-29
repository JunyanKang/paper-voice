param([Parameter(Mandatory=$true)][string]$Root)
$ErrorActionPreference = 'Stop'
$out = Join-Path $Root '.build/installers'
New-Item -ItemType Directory -Force -Path $out | Out-Null
Add-Type -AssemblyName System.Drawing
$image = [System.Drawing.Image]::FromFile((Join-Path $Root 'addon/assets/mascot.png'))
$bitmap = New-Object System.Drawing.Bitmap($image, (New-Object System.Drawing.Size(256,256)))
$icon = [System.Drawing.Icon]::FromHandle($bitmap.GetHicon())
$stream = [System.IO.File]::Create((Join-Path $out 'PaperVoice.ico'))
$icon.Save($stream);$stream.Dispose();$image.Dispose();$bitmap.Dispose()
$csc = Join-Path $env:WINDIR 'Microsoft.NET/Framework64/v4.0.30319/csc.exe'
& $csc /nologo /target:winexe /platform:x64 /optimize+ /reference:System.Windows.Forms.dll /reference:System.Drawing.dll /reference:System.Core.dll "/win32icon:$out/PaperVoice.ico" "/win32manifest:$Root/installers/windows/app.manifest" "/resource:$Root/addon/assets/mascot.png,mascot.png" "/out:$out/Paper Voice Setup.exe" "$Root/installers/windows/Installer.cs"
if ($LASTEXITCODE -ne 0) {throw 'Installer compilation failed'}
