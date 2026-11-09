#include "inventory.h"
#include <iostream>
int main(int argc, char**) {
    if (argc != 1) {
        std::cerr << "Usage: multiview-probe (no arguments)\n";
        return 2;
    }
    multiview::PosixInventory files;
    std::cout << multiview::report(files) << '\n';
    return std::cout.good() ? 0 : 1;
}
