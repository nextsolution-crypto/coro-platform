# Emergency

Priority is fixed: `EMERGENCY_REAL > EMERGENCY_EXERCISE > PERMANENT_PLAN > NORMAL_CYCLE`. Emergency shows only the applicable approved plan, suppresses advertising/awareness and never auto-clears.

Emergency state is durably journaled before acknowledgement, survives process restart/offline operation and can only exit through a governed command. Replayed, foreign, stale or unauthorized clear commands are rejected.

All DISPLAY-08 emergency tests are synthetic. No alarm, evacuation command, external notification or real Building Bridge event is permitted.
