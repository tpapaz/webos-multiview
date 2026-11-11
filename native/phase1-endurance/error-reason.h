#pragma once
#include <cctype>
#include <cstdint>
#include <cstring>

namespace endurance {
// Export a closed reason class, never vendor text containing identifiers.
inline int errorReason(const char* message) {
    if (!message) return 0;
    char text[256];
    unsigned i=0;
    for (; i<sizeof(text)-1 && message[i]; ++i)
        text[i]=static_cast<char>(std::tolower(static_cast<unsigned char>(message[i])));
    text[i]='\0';
    if (std::strstr(text,"privileg") || std::strstr(text,"permission") || std::strstr(text,"denied") ||
        std::strstr(text,"not allowed")) return 1;
    if (std::strstr(text,"not exist") || std::strstr(text,"not found") || std::strstr(text,"unavailable")) return 2;
    if (std::strstr(text,"invalid") || std::strstr(text,"parameter") || std::strstr(text,"argument")) return 3;
    if (std::strstr(text,"disconnect") || std::strstr(text,"closed")) return 4;
    if (std::strstr(text,"timeout") || std::strstr(text,"timed out")) return 5;
    return 6;
}
inline int errorMagnitude(int code) {
    const auto value=static_cast<std::int64_t>(code);
    const auto magnitude=value<0?-value:value;
    return magnitude<=1000000?static_cast<int>(magnitude):1000001;
}
}
