# Evidence summary — 2026-10-28

- PR: `#124`
- Base candidate: `4f4fd3e517014e14bb01af49887c8d9a61d6e12b`
- Browser-tested product HEAD: `0fdf007087ad3a7567d9afbecd5f36b51427ed9e`
- PostgreSQL: 16, disposable localhost-only containers
- Migration head: `20261113010000_document_review_integrity` (migration 160)
- Browser runtime: real backend and frontend, local provider fake, deny-by-default network
- Browser acceptance: 12/12 Chrome configurations passed
- Integrated workflow: PMU, PSI and PCA passed
- External providers: none
- Production access or mutation: none

## Browser evidence

The authenticated campaign completed generation, editing, saving, submission,
independent review, decision and read-only reopening for PMU, PSI and PCA.
It also demonstrated:

- submitted version and content hash identification;
- coherent `canEdit` and `canApprove` capabilities;
- denial of self-approval, archived projects, inactive projects and actors
  outside the project scope without business side effects;
- stale-review rejection after a document change;
- idempotent repeated decisions;
- fail-closed behaviour during a controlled HTTP 503 and successful retry;
- persistence after refresh;
- keyboard focus and 200% zoom without horizontal overflow;
- all four viewports across Classic, Glass Light and Glass Dark.

Sanitized machine-readable evidence and the 12 screenshots are preserved at:

`D:\CORO-QA\runs\pr124-cors\document-review-final-head\`

## Outbox evidence

The approval decision and its outbox event are created transactionally. The QA
worker claimed the event, sent it to the simulated provider, recorded the first
controlled failure, then retried successfully. One durable event exists for the
decision and replay does not create a second event. The delivery contract is
at-least-once; provider-side exactly-once delivery is not claimed.

## Upgrade evidence

The upgrade test started from the actual parent of migration 160 with exactly
159 migrations applied and pre-existing synthetic document, version, audit and
validated decision data. Migration 160 preserved content, status, version,
lock version and audit history and did not create retrospective review requests
or outbox events.

Evidence:

- `D:\CORO-QA\runs\pr124-upgrade\seed-159.json`
- `D:\CORO-QA\runs\pr124-upgrade\verify-160.json`

## Remaining limit

A real screen reader was not accepted as verified evidence: Windows Narrator is
installed, but this automated environment cannot validate the spoken output
with a human listener. Keyboard, focus, semantic roles and the browser
accessibility tree were exercised; real screen-reader acceptance remains
`NOT_VERIFIED` and does not invalidate the other browser results.
