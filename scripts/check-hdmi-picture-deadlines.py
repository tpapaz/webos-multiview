"""Host-only bridge: actual TV-derived JS producer -> current native parser/predicate."""
import json
from pathlib import Path
import subprocess

root = Path(__file__).resolve().parents[1]
out = root / 'build/phase-2/hdmi-window-0.1.7/deadline-bridge-validated'
out.mkdir()
source = out / 'bridge.cpp'
source.write_text('''#include "session.h"
#include <iostream>
#include <string>
int main(int argc, char** argv) {
    if (argc != 4) return 2;
    std::string text; std::getline(std::cin, text);
    const char* args[] = {"synthetic", text.c_str()};
    const auto p = hdmi::parseLaunch(2, args);
    const bool allowed = hdmi::launchAllowed(p, "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
        std::stoll(argv[1]), std::stoll(argv[2]));
    return allowed == (std::string(argv[3]) == "true") ? 0 : 1;
}
''')
cache = (root / 'build/phase-2/hdmi-window-host-0.1.7/CMakeCache.txt').read_text()
library = next(line.split('=', 1)[1] for line in cache.splitlines() if line.startswith('JSON_C_LIBRARY:FILEPATH='))
subprocess.run(['c++', '-std=c++14', '-Wall', '-Wextra', '-Werror',
    '-I' + str(root / 'native/phase2-hdmi-picture'),
    '-I' + str(root / 'build/phase-2/hdmi-window-host-0.1.7/include'), str(source),
    str(root / 'native/phase2-hdmi-picture/session.cpp'), library, '-o', str(out / 'bridge')], check=True)
node = '/home/tasos/.cache/webos-multiview/node-v22.17.0-linux-x64/bin/node'
js = '''const {payload}=require('./scripts/tv-launch-authority.cjs');
const boot='aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee\\n';
console.log(JSON.stringify(payload({bootBefore:boot,bootAfter:boot,
uptime:'100.00 10.00\\n',realtime:'1700000000\\n'},100,200)));'''
payload = subprocess.check_output([node, '-e', js], cwd=root)
cases = [(100100, 1700000000999, True), (102999, 1700000002999, True),
    (103000, 1700000001000, False), (100100, 1700000003000, False),
    (99999, 1700000001000, False), (100100, 1699999999999, False),
    (-1, 1700000001000, False), (100100, -1, False),
    (100100, 1700000600000, False)]
for up, real, expected in cases:
    subprocess.run([str(out / 'bridge'), str(up), str(real), str(expected).lower()], input=payload, check=True)
result = {'status': 'passed', 'cases': len(cases), 'actualCurrentNativeParserAndPredicate': True,
    'actualTvDomainProducer': True, 'TVConnections': 0, 'limits': 'Synthetic clocks; no TV loader/graphics/HDMI proof'}
with (out / 'result.json').open('x') as stream:
    json.dump(result, stream, indent=2)
print(json.dumps(result))
