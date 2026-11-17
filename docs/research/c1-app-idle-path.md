# C1 app idle research

Version 0.1.1 reached 30 minutes of overlap between two local clips on C1
firmware 03.53.45. The owner saw both clocks advance at spot checks. Focus
was lost shortly after the secondary clip closed, interrupting the recovery
check. The logs showed an idle request already pending before that clip
closed. Effective screensaver inhibition and complete recovery were never
established. [Recorded endurance trial](../device-tests/archive/lg-c1-phase-1.md#endurance-011-30-minute-run--overlap-reached-recovery-interrupted)

Idle work is closed for the current scope.
[Scope decision](../decisions/0003-close-idle-work-resume-hdmi.md)
