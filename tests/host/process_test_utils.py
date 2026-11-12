"""Owned Linux fixture identity and reaping helpers; no device transport."""
import json
import os
from pathlib import Path


def read_jsonl(file):
    if not file.exists():
        return []
    data = file.read_bytes()
    if len(data) > 128 * 1024:
        raise AssertionError('Local fixture log exceeded bound')
    return [json.loads(line) for line in data.splitlines()]


def same_process(row):
    try:
        stat = Path('/proc', str(row['pid']), 'stat').read_text()
    except FileNotFoundError:
        return False
    fields = stat[stat.rindex(')') + 2:].split()
    return fields[19] == row['start']


def kill_owned(row, sig):
    if same_process(row):
        try:
            os.kill(row['pid'], sig)
        except ProcessLookupError:
            pass


def reap_adopted():
    while True:
        try:
            if os.waitpid(-1, os.WNOHANG)[0] == 0:
                break
        except ChildProcessError:
            break
