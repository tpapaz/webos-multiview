#pragma once

// Link-time substitute for the three SDK calls used by the native probe.
class StarfishMediaAPIs {
public:
    explicit StarfishMediaAPIs(const char*);
    ~StarfishMediaAPIs();
    const char* getMediaID();
    StarfishMediaAPIs(const StarfishMediaAPIs&) = delete;
};
