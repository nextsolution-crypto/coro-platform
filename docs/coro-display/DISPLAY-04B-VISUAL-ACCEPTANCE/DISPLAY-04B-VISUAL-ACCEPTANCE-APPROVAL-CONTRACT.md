# DISPLAY-04B-VISUAL-ACCEPTANCE — Approval contract

## Single authority

The existing DISPLAY-03 `POST .../:id/approve` action remains authoritative. `ApproveDisplayPlanDto` adds mandatory evidence:

- source version and SHA-256;
- variant version and SHA-256;
- profile: `SOURCE_NATIVE`, `ORIGINAL_17X11`, `SCREEN_16X9`, or `SCREEN_16X10`; governed target dimensions are checked for the three prepared screen profiles;
- governed display location;
- optional observations and reservations;
- existing request ID, reason, and optimistic-lock version.

The action already requires `DISPLAY_PLAN_APPROVE`, an independently reviewed publication, a generated variant, separation between author/reviewer/approver, current ProjectFile authority, and optimistic locking.

## Recorded proof

On explicit approval, the append-only `DisplayPlanPublicationEvent.metadata.visualAcceptance` snapshot records `APPROVED` plus all supplied version/hash/profile/location evidence and observations. Actor and date already come from the event and publication approval fields.

Any source, render version/hash, or location mismatch is rejected. Re-rendering or reassignment therefore requires a new explicit approval. `REVIEW` represents pending review; rejection returns the publication to `DRAFT`; later suspension/revocation remain governed DISPLAY-03 actions.

No approval was recorded for the Groupe Vision pilot. Its manifest status is `PENDING_REVIEW`.
