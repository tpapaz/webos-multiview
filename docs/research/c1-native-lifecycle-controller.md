# C1 native lifecycle controls

The normal lifecycle control observed the test helper exit and clean stage
removal on the C1. The separate control-channel-loss trial observed the
helper react to EOF, cancel cleanly and exit. The test controller reaped its
children, removed the stage, and found no survivors. The owner reported
normal picture and sound afterward.
[Normal lifecycle record](../device-tests/archive/c1-lifecycle-normal-001.md) · [Control-loss record](../device-tests/archive/c1-lifecycle-control-loss-001.md)

These controls establish test-helper lifecycle behavior for their recorded
runs. Resource release after dual HDMI acquisition remains **unknown**.
[Current status](../../STATUS.md)
