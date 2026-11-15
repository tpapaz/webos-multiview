# Physical HDMI adapter and termination witness

Production components used by [0.1.12](../phase2-hdmi-candidate-0.1.12/README.md):

- adapter.h: own named LS2 registration,1920x1080 SDL/exported window, fixed
  centered960x540 destination, context worker, bounded focus/events and cleanup.
- replies.h: four stable callback slots, synchronized copied replies and
  cancellation/late-reply ownership rules.
- termination.h: bounded own-parent death/reparent/proc-absence witness;
  observed termination is separate from numerical exit status/hardware release.
- capture.h: exclusive restricted report slots and bounded durable writes.

The old review ELF entry/ARM target was retired. This directory's CMake project
runs current host acceptance for session rules, concurrent callback mailbox,
adapter lifecycle/retained owner and real parent-death witness. Production ARM
entry is the current candidate CMake project. [Build/check commands](../../docs/build.md).

The current app has one verified moving physical HDMI-4 picture with audible
sound, acknowledged cleanup, independent termination and owner restoration on
C1/03.53.45. [Actual result](../../docs/device-tests/c1-journal.md#0112-physical-hdmi-4--moving-picture-and-sound).
No general hardware-release, audio-control or dual-HDMI claim follows from it.
