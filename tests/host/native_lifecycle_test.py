"""Local real-process acceptance of the C lifecycle helper; never run ARM/TV code."""
import argparse
import ctypes
import json
import os
from pathlib import Path
import signal
import subprocess
import sys
import tempfile
import time
from process_test_utils import read_jsonl, same_process, kill_owned, reap_adopted


def run_case(binary, case, kill_launcher=False, close_control=False):
    with tempfile.TemporaryDirectory(prefix='native-lifecycle-') as directory:
        root = Path(directory)
        process = subprocess.Popen([str(binary), '--case', case, '--directory', directory],
                                   stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        injected = False
        report = None
        try:
            deadline = time.monotonic() + 10
            while time.monotonic() < deadline:
                rows = read_jsonl(root / 'owned.jsonl')
                if kill_launcher and not injected and any(r['role'] == 'worker' for r in rows):
                    process.kill(); process.wait(timeout=1); injected = True
                if close_control and not injected and any(r['role'] == 'worker' for r in rows):
                    process.stdin.close(); injected = True
                file = root / 'report.json'
                if file.exists() and file.stat().st_size:
                    try:
                        report = json.loads(file.read_text())
                        break
                    except json.JSONDecodeError:
                        pass
                time.sleep(0.01)
            assert report is not None, 'Missing bounded native report'
            rows = read_jsonl(root / 'owned.jsonl')
            supervisor = next(r for r in rows if r['role'] == 'supervisor')
            assert supervisor['session'] == supervisor['pid']
            assert report['separateSession'] and report['cleanupConfirmed'] and report['actorReaped']
            assert report['mode'] == 'native_lifecycle_fake_workers' and report['iwcCalls'] == 0
            assert report['elapsedMs'] < 8000 and report['hardwareRestoration'] == 'not_tested'
            assert 'pid' not in report and 'windowId' not in report
            if case in ['normal', 'cleanup_hang', 'delayed_exit']:
                assert report['status'] == 'lifecycle_control_passed' and report['fakeReplyValidated']
                assert report['workerReaped']
                expected = 0
            elif case == 'control_loss' and not (kill_launcher or close_control):
                assert report['status'] == 'control_loss_not_observed' and not report['hostControlLost']
                expected = 1
            elif case == 'control_loss' or case == 'actor_loss':
                assert report['status'] == 'cancelled_cleanly'
                assert report['hostControlLost'] if kill_launcher or close_control else report['actorReaped']
                if close_control:
                    assert injected and report['workerStarted'] and report['workerReaped']
                    assert not report['fakeReplyValidated']
                if case == 'actor_loss':
                    assert report['actorLossObserved']
                expected = 0
            else:
                assert report['status'] in ['fake_work_timeout', 'invalid_fake_reply']
                assert not report['fakeReplyValidated']
                expected = 1
            if case in ['worker_hang', 'cleanup_hang']:
                assert report['killRequests'] >= 1
            if case == 'delayed_exit':
                assert report['workerExitObservedMs'] - report['replyObservedMs'] >= 250
            if kill_launcher:
                assert injected
                end = time.monotonic() + 2
                while time.monotonic() < end:
                    pid, status = os.waitpid(supervisor['pid'], os.WNOHANG)
                    if pid:
                        assert os.WIFEXITED(status) and os.WEXITSTATUS(status) == expected
                        break
                    time.sleep(0.01)
                else:
                    raise AssertionError('Supervisor failed to exit after launcher death')
            else:
                assert process.wait(timeout=2) == expected
                assert json.loads(process.stdout.read()) == {'ready': True}
                assert process.stderr.read() == b''
            assert not same_process(supervisor)
            label = 'control_loss_eof' if close_control else 'control_loss_not_injected' if case == 'control_loss' and not kill_launcher else case
            return {'case': label,
                    'status': report['status'], 'cleanupConfirmed': True,
                    'supervisorNormalExitConfirmed': True, 'hostLossObserved': report['hostControlLost'],
                    'killRequests': report['killRequests'], 'elapsedMs': report['elapsedMs']}
        finally:
            if process.poll() is None:
                process.kill()
            process.wait(timeout=2)
            rows = read_jsonl(root / 'owned.jsonl')
            for row in rows:
                kill_owned(row, signal.SIGKILL)
            end = time.monotonic() + 2
            while time.monotonic() < end:
                reap_adopted()
                if not any(same_process(row) for row in rows):
                    break
                time.sleep(0.01)
            assert not any(same_process(row) for row in rows), 'Native fixture descendants remain'
            for stream in [process.stdin, process.stdout, process.stderr]:
                stream.close()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--binary', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    if sys.platform != 'linux':
        parser.error('Use the existing WSL Linux environment')
    binary = args.binary.resolve()
    if not binary.is_file() or ctypes.CDLL(None).prctl(36, 1, 0, 0, 0) != 0:
        raise RuntimeError('Local fixture prerequisites unavailable')
    args.output.parent.mkdir(parents=True, exist_ok=True)
    with args.output.open('x') as output:
        results = []
        try:
            for case in ['normal', 'actor_loss', 'worker_hang', 'partial_reply', 'delayed_exit', 'cleanup_hang', 'control_loss']:
                results.append(run_case(binary, case, case == 'control_loss'))
                print('PASS: native local ' + case, flush=True)
            results.append(run_case(binary, 'control_loss'))
            print('PASS: native local control_loss_not_injected refuses false pass', flush=True)
            results.append(run_case(binary, 'control_loss', close_control=True))
            print('PASS: native local control_loss_eof after worker metadata; launcher/supervisor exit confirmed', flush=True)
            # Core preflight gates: no children/overwrite on bad args, unsafe directory or stale report.
            with tempfile.TemporaryDirectory(prefix='native-reject-') as temp:
                directory = Path(temp)
                args0 = [str(binary), '--case', 'normal', '--directory', temp]
                assert subprocess.run([str(binary), '--case', 'unknown', '--directory', temp], capture_output=True).returncode == 64
                assert subprocess.run(args0 + ['extra-command'], capture_output=True).returncode == 64
                os.chmod(directory, 0o777)
                assert subprocess.run(args0, capture_output=True).returncode == 73
                os.chmod(directory, 0o700)
                (directory / 'report.json').write_text('preserve-me')
                assert subprocess.run(args0, capture_output=True).returncode == 73
                assert (directory / 'report.json').read_text() == 'preserve-me'
                assert not (directory / 'owned.jsonl').exists()
            with tempfile.TemporaryDirectory(prefix='native-link-') as temp:
                root = Path(temp)
                (root / 'report.json').symlink_to('/dev/null')
                assert subprocess.run([str(binary), '--case', 'normal', '--directory', temp], capture_output=True).returncode == 73
                assert (root / 'report.json').is_symlink() and not (root / 'owned.jsonl').exists()
        except Exception:
            json.dump({'status': 'failed', 'mode': 'native_host_tests', 'scenarios': results}, output, indent=2)
            raise
        json.dump({'status': 'passed', 'mode': 'native_host_tests', 'deviceTested': False,
                   'binary': binary.name, 'scenarios': results, 'rejectionGatesPassed': True}, output, indent=2)
        output.write('\n')


if __name__ == '__main__':
    main()
