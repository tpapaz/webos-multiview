#include "inventory.h"
#include <iostream>
#include <stdexcept>
#include <string>
struct Fake : multiview::FileInventory {
    mutable unsigned calls = 0;
    multiview::Presence value;
    explicit Fake(multiview::Presence p) : value(p) {}
    multiview::Presence inspect(const char* path) const override {
        if (std::string(path).find("/usr/lib/lib") != 0) throw std::runtime_error("unexpected path");
        ++calls;
        return value;
    }
};
int main() {
    for (auto presence : {multiview::Presence::present, multiview::Presence::not_found,
                          multiview::Presence::unavailable}) {
        Fake fake(presence);
        const std::string result = multiview::report(fake);
        if (fake.calls != 7 || result.find("\"status\":\"verified\"") != std::string::npos ||
            result.find("\"simultaneousHdmiInputs\":{\"status\":\"unknown\"") == std::string::npos)
            return 1;
        const char* expected = presence == multiview::Presence::present ? "present" :
            presence == multiview::Presence::not_found ? "not_found_in_scope" : "unavailable";
        if (result.find(std::string("\"result\":\"") + expected + "\"") == std::string::npos) return 1;
    }
    std::cout << "All inventory states preserve unknown capabilities\n";
}
