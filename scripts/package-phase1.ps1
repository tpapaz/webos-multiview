param([string]$LinuxNode = 'node')

$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$build = Join-Path $root 'build/phase-1'
$binary = Join-Path $build 'arm/multiview-phase1'
$source = Join-Path $root 'native/phase1'
$stage = Join-Path $build 'package'
$dist = Join-Path $root 'dist'
$packageFiles = @('appinfo.json', 'icon.png', 'guide.bmp', 'multiview-phase1',
    'clip-a.h264', 'clip-a.frames', 'clip-b.h264', 'clip-b.frames')

if (!(Test-Path -LiteralPath $binary)) { throw 'Build the ARM binary in build/phase-1/arm first' }
New-Item -ItemType Directory -Force -Path $stage, $dist | Out-Null
if (Get-ChildItem -LiteralPath $stage -Force | Where-Object { $_.Name -notin $packageFiles -or $_.PSIsContainer }) {
    throw "Unexpected files in $stage"
}
Copy-Item -LiteralPath $binary, (Join-Path $source 'appinfo.json'), (Join-Path $root 'apps/probe-ui/icon.png') -Destination $stage

foreach ($clip in 'clip-a', 'clip-b') {
    $stream = Get-Item -LiteralPath (Join-Path $build "media/$clip.h264")
    $json = ffprobe -v error -show_packets -select_streams v:0 -show_entries packet=pos,size -of json $stream.FullName
    if ($LASTEXITCODE -ne 0) { throw "Could not index $clip" }
    $position = 0
    $sizes = foreach ($packet in ($json | ConvertFrom-Json).packets) {
        if ([long]$packet.pos -ne $position -or [int]$packet.size -le 0 -or [int]$packet.size -gt 256KB) {
            throw "Invalid H.264 access unit in $clip"
        }
        $position += [int]$packet.size
        $packet.size
    }
    if (!$sizes -or $position -ne $stream.Length) { throw "Incomplete index for $clip" }
    Copy-Item -LiteralPath $stream.FullName -Destination $stage
    Set-Content -LiteralPath (Join-Path $stage "$clip.frames") -Value $sizes -Encoding ascii
}

Add-Type -AssemblyName System.Drawing
$bitmap = [System.Drawing.Bitmap]::new(960, 540, [System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
$canvas = [System.Drawing.Graphics]::FromImage($bitmap)
$heading = [System.Drawing.Font]::new('Segoe UI', 36, [System.Drawing.FontStyle]::Bold)
$body = [System.Drawing.Font]::new('Segoe UI', 23)
try {
    $canvas.Clear([System.Drawing.Color]::FromArgb(17, 24, 39))
    $canvas.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
    $white = [System.Drawing.Brushes]::White
    $canvas.DrawString('MultiView Phase 1', $heading, $white, 54, 46)
    $canvas.DrawString("Two local clips / Video only`n`nLEFT     Play clip A alone`nRIGHT   Play clip B alone`nOK        Play both with a staggered start`nUP        Move and resize B during dual playback`nBACK    Close and release the sessions", $body, $white, 54, 133)
    $bitmap.Save((Join-Path $stage 'guide.bmp'), [System.Drawing.Imaging.ImageFormat]::Bmp)
} finally {
    $body.Dispose()
    $heading.Dispose()
    $canvas.Dispose()
    $bitmap.Dispose()
}

# Stage on Linux so the native executable keeps its executable bit in the IPK.
$linuxRoot = wsl -d Ubuntu --exec wslpath -a $root
if ($LASTEXITCODE -ne 0 -or !$linuxRoot) { throw 'Could not resolve the repo path in Ubuntu' }
$packageInLinux = @'
set -eu
cd "$1"
stage=$(mktemp -d -t multiview-phase1.XXXXXXXX)
trap 'rm -rf -- "$stage"' EXIT
install -m 755 build/phase-1/package/multiview-phase1 "$stage/"
for file in appinfo.json icon.png guide.bmp clip-a.h264 clip-a.frames clip-b.h264 clip-b.frames; do
    install -m 644 "build/phase-1/package/$file" "$stage/"
done
APPDATA="$PWD/build/cli-data" "$2" node_modules/@webos-tools/cli/bin/ares-package.js "$stage" --no-minify -o dist
'@
wsl -d Ubuntu --exec sh -c $packageInLinux sh $linuxRoot $LinuxNode
if ($LASTEXITCODE -ne 0) { throw 'Native IPK packaging failed' }
