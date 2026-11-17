// Local exclusive private capture, never a TV operation.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const {spawnSync} = require('node:child_process');
function reserveCapture(directory) {
    fs.mkdirSync(directory, {mode: 0o700});
    if (process.platform === 'win32') {
        // Static PowerShell and a literal environment path; no path interpolation into code.
        const command = '$ErrorActionPreference="Stop"; $p=$env:MULTIVIEW_CAPTURE_DIRECTORY; ' +
            '$sid=[System.Security.Principal.WindowsIdentity]::GetCurrent().User; ' +
            '$acl=New-Object System.Security.AccessControl.DirectorySecurity; ' +
            '$acl.SetOwner($sid); $acl.SetAccessRuleProtection($true,$false); ' +
            '$rule=New-Object System.Security.AccessControl.FileSystemAccessRule($sid,"FullControl","ContainerInherit,ObjectInherit","None","Allow"); ' +
            '$acl.AddAccessRule($rule); Set-Acl -LiteralPath $p -AclObject $acl; ' +
            '$actual=Get-Acl -LiteralPath $p; if(-not $actual.AreAccessRulesProtected){throw "ACL"}; ' +
            '$rules=@($actual.GetAccessRules($true,$true,[System.Security.Principal.SecurityIdentifier])); ' +
            'if($rules.Count -ne 1 -or $rules[0].IdentityReference -ne $sid -or $rules[0].AccessControlType -ne "Allow" -or ' +
            '($rules[0].FileSystemRights -band [System.Security.AccessControl.FileSystemRights]::FullControl) -ne [System.Security.AccessControl.FileSystemRights]::FullControl){throw "ACL"}';
        const r = spawnSync('pwsh.exe', ['-NoProfile', '-NonInteractive', '-Command', command], {
            env: {...process.env, MULTIVIEW_CAPTURE_DIRECTORY: path.resolve(directory)}, timeout: 5000, windowsHide: true, stdio: 'ignore'});
        if (r.status !== 0 || r.error) throw Error('Private capture ACL could not be established; no connection');
    } else {
        fs.chmodSync(directory, 0o700);
        if ((fs.statSync(directory).mode & 0o777) !== 0o700) throw Error('Private capture mode unavailable');
    }
    return {
        begin(name) {
            if (!['elementList.json', 'video-hdmi.elf', 'video-sink.elf'].includes(name)) throw Error('Capture filename refused');
            const fd = fs.openSync(path.join(directory, name), 'wx', 0o600);
            let bytes = 0, done = false;
            const digest = crypto.createHash('sha256');
            return {
                write(buffer) {
                    if (done) throw Error('Closed local output');
                    for (let offset = 0; offset < buffer.length;) {
                        const n = fs.writeSync(fd, buffer, offset, buffer.length - offset);
                        if (n < 1) throw Error('Local write stopped');
                        digest.update(buffer.subarray(offset, offset + n)); bytes += n; offset += n;
                    }
                },
                finish() {
                    if (done) throw Error('Local output already closed');
                    done = true;
                    try { fs.fsyncSync(fd); return {bytes, sha256: digest.digest('hex'), localFile: name}; }
                    finally { fs.closeSync(fd); }
                }
            };
        },
        complete(report) {
            const fd = fs.openSync(path.join(directory, 'inventory.json'), 'wx', 0o600);
            try { fs.writeFileSync(fd, JSON.stringify(report, null, 2) + '\n'); fs.fsyncSync(fd); }
            finally { fs.closeSync(fd); }
        }
    };
}
module.exports = {reserveCapture};
