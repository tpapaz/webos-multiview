param([string]$LinuxNode = '/home/tasos/.cache/webos-multiview/node-v22.17.0-linux-x64/bin/node')
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$linuxRoot = wsl -d Ubuntu --exec wslpath -a $root
if ($LASTEXITCODE -ne 0 -or !$linuxRoot) { throw 'Cannot resolve repository in existing WSL Ubuntu' }
$stamp = [DateTime]::UtcNow.ToString('yyyyMMddTHHmmssfffZ')
$report = "$linuxRoot/build/phase-2/iwc-process-harness/local-$stamp.json"
wsl -d Ubuntu --exec python3 "$linuxRoot/tests/host/iwc_process_harness_test.py" --node $LinuxNode --output $report
if ($LASTEXITCODE -ne 0) { throw 'Local fake-process acceptance failed; inspect the preserved report' }
Write-Output "Local fake-process report: build/phase-2/iwc-process-harness/local-$stamp.json. No TV access."
