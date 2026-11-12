# Normal cycle

Expected sequence: 40 s approved plan, 10 s approved communication, 10 s approved awareness. Each secondary item must be currently approved and scoped to the device; otherwise the plan remains visible for that slot.

No network fetch replaces an active plan mid-frame. Candidate assets are verified and activated atomically. A timer drift or missing asset cannot create a blank screen.

Software state/priority regressions are inherited from DISPLAY-06/07. A one-hour real screen cycle and transition observation remain **NOT_VERIFIED**.
