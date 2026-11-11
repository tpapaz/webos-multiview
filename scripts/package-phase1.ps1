param([string]$LinuxNode = 'node', [ValidateSet('smp', 'ndl', 'mixed', 'sinks', 'endurance')][string]$Target = 'smp')

$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$build = Join-Path $root 'build/phase-1'
$nativeDir = 'phase1'
$binaryDir = 'arm'
$executable = 'multiview-phase1'
$stageName = 'package'
$clips = @('clip-a', 'clip-b')
if ($Target -eq 'ndl') {
    $nativeDir = 'phase1-ndl'
    $binaryDir = 'ndl'
    $executable = 'multiview-ndl'
    $stageName = 'package-ndl'
    $clips = @('clip-b')
}
if ($Target -eq 'mixed') {
    $nativeDir = 'phase1-mixed'
    $binaryDir = 'mixed'
    $executable = 'multiview-mixed'
    $stageName = 'package-mixed'
}
if ($Target -eq 'sinks') {
    $nativeDir = 'phase1-sinks'
    $binaryDir = 'sinks'
    $executable = 'multiview-sinks'
    $stageName = 'package-sinks'
}
if ($Target -eq 'endurance') {
    $nativeDir = 'phase1-endurance'
    $binaryDir = 'endurance'
    $executable = 'multiview-endurance'
    $stageName = 'package-endurance'
}
$binary = Join-Path $build "$binaryDir/$executable"
$source = Join-Path $root "native/$nativeDir"
$stage = Join-Path $build $stageName
$dist = Join-Path $root 'dist'
$assetFiles = @('appinfo.json', 'icon.png', 'guide.bmp')
foreach ($clip in $clips) { $assetFiles += @("$clip.h264", "$clip.frames") }
$packageFiles = $assetFiles + $executable

if (!(Test-Path -LiteralPath $binary)) { throw "Build the ARM binary in build/phase-1/$binaryDir first" }
New-Item -ItemType Directory -Force -Path $stage, $dist | Out-Null
if (Get-ChildItem -LiteralPath $stage -Force | Where-Object { $_.Name -notin $packageFiles -or $_.PSIsContainer }) {
    throw "Unexpected files in $stage"
}
Copy-Item -LiteralPath $binary, (Join-Path $source 'appinfo.json'), (Join-Path $root 'apps/probe-ui/icon.png') -Destination $stage

foreach ($clip in $clips) {
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
$bitmap = [System.Drawing.Bitmap]::new(960, 572, [System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
$canvas = [System.Drawing.Graphics]::FromImage($bitmap)
$heading = [System.Drawing.Font]::new('Segoe UI', 36, [System.Drawing.FontStyle]::Bold)
$body = [System.Drawing.Font]::new('Segoe UI', 23)
$small = [System.Drawing.Font]::new('Segoe UI', 17)
try {
    $canvas.Clear([System.Drawing.Color]::FromArgb(17, 24, 39))
    $canvas.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
    $white = [System.Drawing.Brushes]::White
    if ($Target -eq 'ndl') {
        $canvas.DrawString('Phase 1 / NDL DirectMedia v2', $heading, $white, 54, 46)
        $canvas.DrawString("OK       Play the single local clip`nBACK  Close", $body, $white, 54, 116)
    } elseif ($Target -eq 'endurance') {
        $canvas.DrawString('Phase 1 / Main + Sub Endurance', $heading, $white, 54, 46)
        $canvas.DrawString("LEFT     Short dual-playback cycle`nRIGHT   Five-minute dual playback`nOK         Thirty-minute dual playback`nBACK     Cancel, clean up and close", $body, $white, 54, 116)
        $canvas.DrawString('SSH runner checks cycles and closes/reopens this app.', $small, $white, 54, 320)
        $canvas.DrawString('Clip clocks wrap every 30 s / 15 s; PTS stays monotonic.', $small, $white, 54, 365)
        $canvas.DrawString('Use the one-cycle smoke test before repeated/long tests.', $small, $white, 54, 410)
    } elseif ($Target -eq 'sinks') {
        $canvas.DrawString('Phase 1 / Main + Sub SMP', $heading, $white, 54, 46)
        $canvas.DrawString("LEFT     B-only sub_video control`nOK         Start A main_video on the left`nRIGHT   Step B: window / construct / foreground`n               Load / Feed / Play / smaller geometry`nDOWN   Release B; observe A recovery`nBACK     Cancel and close", $body, $white, 54, 116)
        $canvas.DrawString('SSH runner: solo B first, then staged main + sub.', $small, $white, 54, 408)
    } elseif ($Target -eq 'mixed') {
        $canvas.DrawString('Phase 1 / SMP A + NDL B', $heading, $white, 54, 46)
        $canvas.DrawString("OK         Start SMP A on the left`nRIGHT   Step NDL B: Init / foreground / Load`n               SetArea / Feed on the right`nDOWN   Release B; observe A for 3 seconds`nBACK     Cancel and close", $body, $white, 54, 116)
        $canvas.DrawString('Watch both clocks. Packet acceptance does not prove visibility.', $small, $white, 54, 360)
        $canvas.DrawString('SSH runner stages the test. Leave this menu open.', $small, $white, 54, 408)
    } else {
        $canvas.DrawString('Phase 1 / Software decoding for B', $heading, $white, 54, 46)
        $canvas.DrawString("OK                  Start A and the staged B test`nRIGHT x1       Empty B window`nRIGHT x2       Construct B's player`nRIGHT x3       Notify B foreground`nRIGHT x4       Load B`nRIGHT x5       Feed B     /     RIGHT x6   Play B`nDOWN            Release B     /     BACK   Close", $body, $white, 54, 116)
        $canvas.DrawString('Last staged run / Frame callbacks', $small, $white, 54, 408)
        $canvas.DrawString('Empty B ready (0/1):', $small, $white, 54, 442)
        $canvas.DrawString('A with empty B:', $small, $white, 510, 442)
        $canvas.DrawString('A after B''s first frame:', $small, $white, 54, 476)
        $canvas.DrawString('B callbacks:', $small, $white, 510, 476)
        for ($digit = 0; $digit -le 9; $digit++) {
            $canvas.DrawString([string]$digit, $small, $white, [single]($digit * 20), [single]540)
        }
    }
    $bitmap.Save((Join-Path $stage 'guide.bmp'), [System.Drawing.Imaging.ImageFormat]::Bmp)
} finally {
    $small.Dispose()
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
node="$2"
source="build/phase-1/$3"
executable="$4"
shift 4
stage=$(mktemp -d -t multiview-phase1.XXXXXXXX)
trap 'rm -rf -- "$stage"' EXIT
install -m 755 "$source/$executable" "$stage/"
for file do
    install -m 644 "$source/$file" "$stage/"
done
APPDATA="$PWD/build/cli-data" "$node" node_modules/@webos-tools/cli/bin/ares-package.js "$stage" --no-minify -o dist
'@
wsl -d Ubuntu --exec sh -c ($packageInLinux.Replace("`r", "")) sh $linuxRoot $LinuxNode $stageName $executable @assetFiles
if ($LASTEXITCODE -ne 0) { throw 'Native IPK packaging failed' }
