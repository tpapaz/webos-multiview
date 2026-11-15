# Shared HDMI session and clock core

session.cpp, session.h and launch-clock.h are current production dependencies of
[the0.1.12 app](../phase2-hdmi-candidate-0.1.12/README.md) and
[adapter](../phase2-hdmi-dispatch/README.md). The directory retains its as-built
name/source bytes because the working artifact pins them; it is not a second
app candidate. Old app entry/manifest/patch/build wrappers were removed.

The core owns strict launch/progression/cleanup authority, fixed HDMI4 requests,
owned returned-ID stop/close and conservative acquisition uncertainty. Its actual
business rules are covered by tests/host/hdmi_window_test.cpp in the adapter host
CMake project. Build the deployed app from phase2-hdmi-candidate-0.1.12.
