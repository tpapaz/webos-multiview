#pragma once
#include <string>
namespace multiview {
enum class Presence { present, not_found, unavailable };
// No read, load, invoke or mutation operation is exposed to the inventory core.
struct FileInventory {
    virtual ~FileInventory() {}
    virtual Presence inspect(const char* path) const = 0;
};
struct PosixInventory : FileInventory {
    Presence inspect(const char* path) const override;
};
std::string report(const FileInventory& files);
}
