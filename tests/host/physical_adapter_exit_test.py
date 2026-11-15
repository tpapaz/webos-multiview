import subprocess
import sys
for mode in ['pending', 'cancel', 'unregister', 'clock']:
    run = subprocess.run([sys.argv[1], mode], timeout=6)
    assert run.returncode == 75, (mode, run.returncode)
print('Actual adapter: pending callback / cancel failure / unregister failure observed host exit75, retained callback owner')

