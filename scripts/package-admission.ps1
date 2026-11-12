param([string]$LinuxNode = '/home/tasos/.cache/webos-multiview/node-v22.17.0-linux-x64/bin/node')
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$source = Join-Path $root 'native/phase2-admission'
$manifest = Get-Content -LiteralPath (Join-Path $source 'appinfo.json') -Raw | ConvertFrom-Json
if ($manifest.id -ne 'io.github.tpapaz.multiview.admission' -or $manifest.main -ne 'multiview-admission' -or
    $manifest.version -notmatch '^\d+\.\d+\.\d+$' -or $manifest.type -ne 'native') {
    throw 'Unexpected admission manifest'
}
$filename = "$($manifest.id)_$($manifest.version)_arm.ipk"
if (Test-Path -LiteralPath (Join-Path $root "dist/$filename")) {
    throw 'Package already exists; preserve it and explicitly archive it before rebuilding'
}
$linuxRoot = wsl -d Ubuntu --exec wslpath -a $root
if ($LASTEXITCODE -ne 0 -or !$linuxRoot) { throw 'Cannot resolve repository in WSL' }
wsl -d Ubuntu --exec python3 "$linuxRoot/scripts/verify-admission-abi.py"
if ($LASTEXITCODE -ne 0) { throw 'Offline ABI gate failed; no package produced' }
$pack = @'
set -eu
cd "$1"
stage=$(mktemp -d -t multiview-admission.XXXXXXXX)
trap 'rm -rf -- "$stage"' EXIT
install -m 755 build/phase-2/admission-arm/multiview-admission "$stage/"
install -m 644 native/phase2-admission/appinfo.json apps/probe-ui/icon.png "$stage/"
mkdir -p dist
APPDATA="$PWD/build/cli-data" "$2" node_modules/@webos-tools/cli/bin/ares-package.js "$stage" --no-minify -o dist
'@
wsl -d Ubuntu --exec sh -c ($pack.Replace("`r", "")) sh $linuxRoot $LinuxNode
if ($LASTEXITCODE -ne 0) { throw 'Admission packaging failed' }
wsl -d Ubuntu --exec python3 "$linuxRoot/scripts/verify-ipk.py" --admission "$linuxRoot/dist/$filename"
if ($LASTEXITCODE -ne 0) { throw 'Package exists but archive validation failed; do not install it' }
$report = @{
    schemaVersion = 1
    package = "dist/$filename"
    packageSha256 = (Get-FileHash -LiteralPath (Join-Path $root "dist/$filename") -Algorithm SHA256).Hash.ToLowerInvariant()
    binarySha256 = (Get-FileHash -LiteralPath (Join-Path $root 'build/phase-2/admission-arm/multiview-admission') -Algorithm SHA256).Hash.ToLowerInvariant()
    archiveVerified = $true
    installed = $false
    tvTested = $false
}
$report | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $root 'build/phase-2/admission-arm/package-validation.json')
Write-Output "Packaged and inspected locally: dist/$filename. Not installed or TV-tested."
