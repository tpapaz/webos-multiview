#pragma once
#include "diagnostic.h"
#include <SDL.h>
#include <SDL_webOS.h>
#include <starfish-media-pipeline/StarfishMediaAPIs.h>
#include <atomic>
#include <fstream>
#include <memory>
#include <string>
#include <vector>

namespace phase1 {
using namespace std::chrono_literals;
constexpr int width = 640, height = 360, fps = 30;
enum class VideoSink { automatic, main, sub };

enum class State { running, done, failed };

class Session {
public:
    Session(char label, const char* applicationId) : label_(label), appId(applicationId) {}
    ~Session() { close(); }

    bool close() {
        bool clean = true;
        if (loadAttempted_) {
            const bool accepted = player_->Unload();
            std::fprintf(stderr, "[%c] unload accepted=%d frames=%u\n", label_, accepted, frames());
            clean = accepted;
            loadAttempted_ = false;
        }
        player_.reset();
        if (window_[0]) {
            SDL_webOSDestroyExportedWindow(window_);
            window_[0] = '\0';
        }
        positioned_ = false;
        return clean;
    }

    bool reserveWindow(const char* otherWindow = nullptr) {
        if (window_[0]) return true;
        const auto* id = SDL_webOSCreateExportedWindow(SDL_WEBOS_EXPORED_WINDOW_TYPE_VIDEO);
        if (!id || !*id) return fail("window allocation failed");
        if (otherWindow && std::strcmp(id, otherWindow) == 0)
            return fail("window identifier already owned by the other session");
        if (std::strlen(id) >= sizeof(window_) || std::strpbrk(id, "\"\\\r\n\t")) {
            SDL_webOSDestroyExportedWindow(id);
            return fail("invalid window identifier");
        }
        std::strcpy(window_, id);
        return true;
    }

    bool createPlayer() {
        player_.reset(new StarfishMediaAPIs(nullptr));
        return true;
    }

    bool foreground() {
        return player_->notifyForeground() || fail("foreground rejected");
    }

    bool load(const char* root, bool softwareVideo = false, VideoSink sink = VideoSink::automatic) {
        const char clip = label_ == 'A' ? 'a' : 'b';
        char path[4096];
        if (std::strlen(root) + sizeof("clip-x.frames") > sizeof(path)) return fail("asset path too long");
        std::snprintf(path, sizeof(path), "%sclip-%c.h264", root, clip);
        media_.open(path, std::ios::binary);
        std::snprintf(path, sizeof(path), "%sclip-%c.frames", root, clip);
        index_.open(path);
        if (!media_ || !index_) return fail("fixture open failed");

        char load[1200];
        const int size = std::snprintf(load, sizeof(load),
              R"json({"args":[{"mediaTransportType":"BUFFERSTREAM","option":{"appId":"%s","windowId":"%s",)json"
              R"json(%s%s"queryPosition":false,"externalStreamingInfo":{"contents":{"codec":{"video":"H264"},)json"
              R"json("esInfo":{"pauseAtDecodeTime":false,"ptsToDecode":0,"seperatedPTS":true,"videoFpsValue":30,"videoFpsScale":1},)json"
              R"json("format":"RAW","provider":"Chrome"},"bufferingCtrInfo":{"srcBufferLevelVideo":{"minimum":1024,"maximum":8388608}}},)json"
              R"json("adaptiveStreaming":{"audioOnly":false,"maxWidth":640,"maxHeight":360,"maxFrameRate":30}}}]})json",
              appId, window_, sink == VideoSink::main ? R"json("avSink":{"videoSink":{"type":"main_video"}},)json" :
                  sink == VideoSink::sub ? R"json("avSink":{"videoSink":{"type":"sub_video"}},)json" : "",
              softwareVideo ? R"json("useSoftwareVideoDecoder":true,)json" : "");
        if (size < 0 || static_cast<size_t>(size) >= sizeof(load)) return fail("Load payload overflow");
        loadAttempted_ = true;
        if (!player_->Load(load, onEvent, this)) return fail("Load rejected");
        std::fprintf(stderr, "[%c] Load accepted\n", label_);
        return true;
    }

    void enableFeed() {
        feeding_ = true;
        feedClock_ = lastAccepted_ = Clock::now();
    }

    bool requestPlay() {
        if (!automaticPlay_) playClock_ = Clock::now();
        automaticPlay_ = true;
        return player_->Play() || fail("Play rejected");
    }

    bool start(const char* root, SDL_Rect destination, bool softwareVideo = false, VideoSink sink = VideoSink::automatic) {
        if (!reserveWindow() || !createPlayer() || !foreground() || !load(root, softwareVideo, sink) ||
            !(positioned_ || move(destination))) return false;
        enableFeed();
        return true;
    }

    bool move(SDL_Rect destination) {
        SDL_Rect source{0, 0, width, height};
        if (!SDL_webOSSetExportedWindow(window_, &source, &destination))
            return fail("window geometry rejected");
        positioned_ = true;
        std::fprintf(stderr, "[%c] geometry %d,%d %dx%d\n", label_, destination.x,
                     destination.y, destination.w, destination.h);
        return true;
    }

    const char* windowId() const { return window_; }
    void loopFixture() { looping_ = true; }
    unsigned loops() const { return loops_; }
    unsigned packets() const { return static_cast<unsigned>(fed_); }
    unsigned frames() const { return frames_.load(); }
    unsigned positionMs() const { return positionMs_.load(); }

    State advance(Clock::time_point now) {
        if (error_.load()) return stopped("pipeline error");
        if (!loadAttempted_) return State::running;
        if (ended_.load()) return frames() ? State::done : stopped("EOS before a rendered frame");
        if (automaticPlay_ && frames() == 0 && now - playClock_ > 8s) return stopped("first-frame timeout");

        if (loaded_.exchange(false)) {
            if (automaticPlay_ && !requestPlay()) return State::failed;
            std::fprintf(stderr, "[%c] Load completed\n", label_);
        }

        if (!feeding_) return State::running;
        if (looping_ && now - lastAccepted_ > 8s) return stopped("feed acceptance timeout");
        const auto pts = std::chrono::nanoseconds(1000000000LL * fed_ / fps);
        if (eosSent_ || now - feedClock_ < pts) return State::running;
        if (packet_.empty()) {
            size_t size;
            if (!(index_ >> size)) {
                if (!index_.eof() || media_.peek() != std::char_traits<char>::eof() || fed_ == loopStartFed_)
                    return stopped("fixture index mismatch");
                if (looping_) {
                    media_.clear(); index_.clear();
                    media_.seekg(0); index_.seekg(0);
                    if (!media_ || !index_) return stopped("fixture rewind failed");
                    loopStartFed_ = fed_; ++loops_;
                    return State::running;
                }
                if (!player_->pushEOS()) return stopped("EOS rejected");
                eosSent_ = true;
                return State::running;
            }
            if (!size || size > 256 * 1024) return stopped("fixture packet size invalid");
            packet_.resize(size);
            if (!media_.read(packet_.data(), size)) return stopped("fixture packet truncated");
        }

        char json[160];
        std::snprintf(json, sizeof(json),
                      R"({"bufferAddr":"%p","bufferSize":%zu,"pts":%lld,"esData":1})",
                      static_cast<void*>(packet_.data()), packet_.size(),
                      static_cast<long long>(pts.count()));
        const auto reply = player_->Feed(json);
        if (reply.find("BufferFull") != std::string::npos || reply.find("Pending") != std::string::npos)
            return State::running;
        if (reply.find("Ok") == std::string::npos) return stopped("Feed rejected");
        packet_.clear();
        lastAccepted_ = now;
        if (++fed_ == 1 && !manualPlay_ && !requestPlay()) return State::failed;
        return State::running;
    }

    void useManualPlay() { manualPlay_ = true; }

private:
    static void onEvent(int type, int64_t value, const char*, void* context) {
        auto& session = *static_cast<Session*>(context);
        switch (type) {
            case PF_EVENT_TYPE_STR_STATE_UPDATE__LOADCOMPLETED: session.loaded_ = true; break;
            case PF_EVENT_TYPE_FRAMEREADY:
                if (value >= 0 && value <= 3600000000000LL) session.positionMs_ = static_cast<unsigned>(value / 1000000);
                ++session.frames_;
                break;
            case PF_EVENT_TYPE_STR_STATE_UPDATE__ENDOFSTREAM: session.ended_ = true; break;
            case PF_EVENT_TYPE_INT_ERROR:
            case PF_EVENT_TYPE_STR_ERROR: session.error_ = true; break;
        }
    }

    bool fail(const char* reason) const {
        std::fprintf(stderr, "[%c] %s\n", label_, reason);
        return false;
    }

    State stopped(const char* reason) const {
        fail(reason);
        return State::failed;
    }

    const char label_;
    const char* appId;
    std::ifstream media_, index_;
    std::vector<char> packet_;
    char window_[256]{};
    std::unique_ptr<StarfishMediaAPIs> player_;
    std::atomic<bool> loaded_{false}, error_{false}, ended_{false};
    std::atomic<unsigned> frames_{0}, positionMs_{0};
    Clock::time_point feedClock_, playClock_, lastAccepted_;
    int fed_ = 0, loopStartFed_ = 0;
    unsigned loops_ = 0;
    bool looping_ = false;
    bool positioned_ = false, loadAttempted_ = false, eosSent_ = false;
    bool feeding_ = false, automaticPlay_ = false, manualPlay_ = false;
};

}  // namespace phase1
