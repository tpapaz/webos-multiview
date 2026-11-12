"""Linux-only local process acceptance. No SSH, TV, Luna binary or device payload."""
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

ROOT = Path(__file__).resolve().parents[2]
FIXTURE = ROOT / 'tests/fixtures/iwc-fake-process.cjs'
CASES = ['normal', 'actor_loss', 'host_loss', 'host_loss_before_action', 'status_loss', 'action_hang', 'partial_reply',
         'revalidate_hang', 'reset_hang', 'cleanup_hang', 'delayed_exit', 'supervisor_loss', 'supervisor_hang']


def run_case(node, case):
    with tempfile.TemporaryDirectory(prefix='iwc-local-process-') as temp:
        directory = Path(temp)
        launcher = subprocess.Popen([node, str(FIXTURE), 'launcher', case, temp],
                                    stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL,
                                    stderr=subprocess.DEVNULL)
        injection = False
        observed_report = None
        events = []
        kill_hung_at = None
        try:
            deadline = time.monotonic() + 12
            while time.monotonic() < deadline:
                events = read_jsonl(directory / 'events.jsonl')
                rows = read_jsonl(directory / 'owned.jsonl')
                kinds = [event['kind'] for event in events]
                trigger = 'ready' if case == 'host_loss_before_action' else 'action_ack'
                if not injection and trigger in kinds:
                    supervisor = next(row for row in rows if row['role'] == 'supervisor')
                    assert supervisor['session'] == supervisor['pid'], 'Supervisor not in its own session'
                    if case == 'actor_loss':
                        kill_owned(next(row for row in rows if row['role'] == 'actor'), signal.SIGKILL)
                    elif case in ['host_loss', 'host_loss_before_action']:
                        launcher.kill()  # Actual launcher death closes the fake SSH control pipe.
                        launcher.wait(timeout=1)
                    elif case == 'status_loss':
                        launcher.send_signal(signal.SIGUSR1)  # Break only supervisor's status-output pipe.
                        time.sleep(0.08)
                        kill_owned(supervisor, signal.SIGTERM)  # Owner cancellation after output loss.
                    elif case == 'supervisor_loss':
                        kill_owned(supervisor, signal.SIGKILL)
                    elif case == 'supervisor_hang':
                        kill_owned(supervisor, signal.SIGSTOP)
                        kill_hung_at = time.monotonic() + 8.6  # Beyond supervisor's own 8.5-second watchdog.
                    injection = True
                if kill_hung_at is not None and time.monotonic() >= kill_hung_at:
                    assert not (directory / 'report.json').exists(), 'Stalled supervisor invented completion'
                    kill_owned(supervisor, signal.SIGKILL)
                    kill_hung_at = None
                report_file = directory / 'report.json'
                if report_file.exists():
                    try:
                        observed_report = json.loads(report_file.read_bytes())
                        break
                    except json.JSONDecodeError:
                        pass  # A synchronous file write can still be observed partway through by another process.
                if case in ['supervisor_loss', 'supervisor_hang'] and injection and launcher.poll() is not None:
                    break
                time.sleep(0.02)
            if case in ['supervisor_loss', 'supervisor_hang']:
                assert injection and observed_report is None, 'Dead supervisor must not claim completion'
                assert not any(e['kind'] == 'start_reset' for e in events)
                result = {'scenario': case, 'outcome': 'supervisor_failure_inconclusive', 'supervisorReportAvailable': False}
            else:
                assert observed_report is not None, 'No bounded local supervisor report'
                r = observed_report
                assert r['mode'] == 'local_fake_processes' and not r['deviceTested']
                assert r['ownedChildrenExited'], 'Supervisor did not confirm all owned child exits'
                assert r['peakWorkers'] == (0 if case == 'host_loss_before_action' else 1), 'Unexpected worker count'
                assert r['elapsedMs'] < 9500, 'Fixture exceeded its local hard cap'
                assert r['hardwareRestoration'] == 'unknown'
                assert r['model']['outcome'] != 'simulated_acceptance_passed', 'No owner observations were supplied'
                assert 'SYNTHETIC-PRIVATE-WINDOW' not in json.dumps(r)
                kinds = [e['kind'] for e in read_jsonl(directory / 'events.jsonl')]
                if case in ['normal', 'actor_loss', 'host_loss', 'status_loss', 'cleanup_hang', 'delayed_exit']:
                    assert r['model']['resetAcknowledged'] and r['model']['cleanupConfirmed']
                    assert kinds.count('start_action') == kinds.count('start_reset') == 1
                    assert kinds.index('reaped_action') < kinds.index('start_revalidate')
                    assert kinds.index('reaped_revalidate') < kinds.index('start_reset')
                if case == 'actor_loss':
                    assert injection and kinds.index('actor_exit') < kinds.index('start_revalidate')
                if case in ['host_loss', 'host_loss_before_action']:
                    assert injection and r['hostLost'], 'Launcher death not observed independently'
                if case == 'host_loss_before_action':
                    assert not r['model']['actionAttempted'] and not r['model']['resetAttempted']
                    assert r['model']['outcome'] == 'no_action'
                if case == 'status_loss':
                    assert injection and r['statusLost'], 'Status-output loss not exercised'
                if case in ['action_hang', 'revalidate_hang', 'reset_hang', 'cleanup_hang']:
                    assert r['escalations'] >= 1, 'TERM-resistant fixture did not require KILL'
                if case in ['action_hang', 'partial_reply', 'revalidate_hang']:
                    assert not r['model']['resetAttempted'], 'Uncertain action/target caused blind reset'
                if case == 'reset_hang':
                    assert r['model']['resetAttempted'] and not r['model']['resetAcknowledged']
                    assert kinds.count('start_reset') == 1
                if case == 'delayed_exit':
                    elapsed = next(e['elapsedMs'] for e in events if e['kind'] == 'reaped_action') - next(
                        e['elapsedMs'] for e in events if e['kind'] == 'start_action')
                    assert elapsed >= 280, 'Reply accepted without waiting for delayed worker exit'
                supervisor = next(row for row in rows if row['role'] == 'supervisor')
                assert supervisor['session'] == supervisor['pid']
                if case in ['host_loss', 'host_loss_before_action']:
                    # Launcher is already reaped; the subreaper now owns supervisor.
                    end = time.monotonic() + 2
                    while time.monotonic() < end:
                        pid, status = os.waitpid(supervisor['pid'], os.WNOHANG)
                        if pid:
                            assert os.WIFEXITED(status) and os.WEXITSTATUS(status) == 0
                            break
                        time.sleep(0.01)
                    else:
                        raise AssertionError('Detached supervisor did not exit normally')
                else:
                    assert launcher.wait(timeout=2) == 0, 'Supervisor/launcher did not finish normally'
                assert not same_process(supervisor), 'Supervisor remains after reported completion'
                result = {'scenario': case, 'outcome': r['model']['outcome'],
                          'ownedChildrenExited': True, 'peakWorkers': r['peakWorkers'],
                          'termRequests': r['terminations'], 'killRequests': r['escalations'],
                          'hostLossObserved': r['hostLost'], 'statusLossObserved': r['statusLost'],
                          'supervisorNormalExitConfirmed': True, 'elapsedMs': r['elapsedMs']}
        finally:
            # This process is a subreaper solely for its local fixture descendants.
            # Never scan or signal unrelated process names/groups.
            if launcher.poll() is None:
                launcher.kill()
            launcher.wait(timeout=2)
            rows = read_jsonl(directory / 'owned.jsonl')
            for row in rows:
                kill_owned(row, signal.SIGKILL)
            end = time.monotonic() + 2
            while time.monotonic() < end:
                reap_adopted()
                if not any(same_process(row) for row in rows):
                    break
                time.sleep(0.02)
            assert not any(same_process(row) for row in rows), 'Fixture descendants remain after controller cleanup'
        result['controllerCleanupConfirmed'] = True
        return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--node', required=True, help='Existing local Linux Node executable')
    parser.add_argument('--output', required=True, type=Path, help='New local summary JSON; never overwritten')
    args = parser.parse_args()
    if sys.platform != 'linux':
        parser.error('Run in the existing WSL Linux environment; Windows is not a Linux lifecycle test')
    if not Path(args.node).is_absolute() or not Path(args.node).is_file():
        parser.error('Supply the existing absolute Linux Node executable')
    args.output.parent.mkdir(parents=True, exist_ok=True)
    # PR_SET_CHILD_SUBREAPER affects this test controller only; orphan fixtures
    # become waitable here, avoiding dependence on WSL init's reaping behavior.
    if ctypes.CDLL(None, use_errno=True).prctl(36, 1, 0, 0, 0) != 0:
        raise RuntimeError('Cannot establish local fixture reaping')
    with args.output.open('x', encoding='utf-8') as output:
        results = []
        try:
            for case in CASES:
                results.append(run_case(args.node, case))
                print('PASS: local ' + case, flush=True)
        except Exception:
            json.dump({'mode': 'local_linux_fake_processes', 'deviceTested': False,
                       'status': 'failed', 'completedScenarios': results}, output, indent=2)
            raise
        json.dump({'schemaVersion': 1, 'mode': 'local_linux_fake_processes', 'deviceTested': False,
                   'status': 'passed', 'downstreamOrdering': 'not tested',
                   'hardwareRestoration': 'unknown', 'scenarios': results}, output, indent=2)
        output.write('\n')


if __name__ == '__main__':
    main()
