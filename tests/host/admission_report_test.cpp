#include "../../native/phase2-admission/report-file.h"
#include <cassert>
#include <cstdlib>
#include <string>
int main() {
    char root[] = "/tmp/admission-report-test-XXXXXX";
    assert(mkdtemp(root));
    const std::string dir = std::string(root) + "/capture";
    const std::string file = dir + "/report-0.1.2.json";
    { ReportFile report(dir.c_str()); assert(report.ready());
      assert(report.finish("{}\n", 3)); }
    { ReportFile duplicate(dir.c_str()); assert(!duplicate.ready()); }
    assert(unlink(file.c_str()) == 0);
    assert(symlink("/dev/null", file.c_str()) == 0);
    { ReportFile linkedFile(dir.c_str()); assert(!linkedFile.ready()); }
    assert(unlink(file.c_str()) == 0);
    assert(chmod(dir.c_str(), 0777) == 0);
    { ReportFile publicDir(dir.c_str()); assert(!publicDir.ready()); }
    assert(rmdir(dir.c_str()) == 0);
    assert(symlink(root, dir.c_str()) == 0);
    { ReportFile linkedDir(dir.c_str()); assert(!linkedDir.ready()); }
    assert(unlink(dir.c_str()) == 0);
    assert(rmdir(root) == 0);
}
