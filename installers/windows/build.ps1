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
