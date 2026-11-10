$ErrorActionPreference = 'Stop'

$ffmpeg = Get-Command ffmpeg -CommandType Application | Select-Object -First 1 -ExpandProperty Source
$output = Join-Path (Split-Path -Parent $PSScriptRoot) 'build/phase-1/media'
New-Item -ItemType Directory -Force -Path $output | Out-Null

$clips = @(
    @{ Name = 'clip-a'; Duration = 30; Tone = 440; Filter = 'format=yuv420p' }
    @{ Name = 'clip-b'; Duration = 15; Tone = 660; Filter = 'negate,format=yuv420p' }
)

foreach ($clip in $clips) {
    $file = Join-Path $output $clip.Name
    & $ffmpeg -hide_banner -loglevel error -nostdin -y `
        -f lavfi -i 'testsrc=size=640x360:rate=30:decimals=2' `
        -f lavfi -i "sine=frequency=$($clip.Tone):sample_rate=48000" `
        -t $clip.Duration -vf $clip.Filter -af 'volume=0.2' `
        -c:v libx264 -profile:v baseline -level:v 3.0 -g 30 `
        -c:a aac -ac 2 -movflags '+faststart' "$file.mp4"
    if ($LASTEXITCODE -ne 0) { throw "Failed to encode $($clip.Name)" }

    & $ffmpeg -hide_banner -loglevel error -nostdin -y -i "$file.mp4" `
        -map '0:v:0' -c:v copy -bsf:v h264_mp4toannexb "$file.h264" `
        -map '0:a:0' -c:a copy -f adts "$file.aac"
    if ($LASTEXITCODE -ne 0) { throw "Failed to extract streams for $($clip.Name)" }
}

Write-Output "Generated Phase 1 clips in $output"
