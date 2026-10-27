# DX-03B — Portrait de résilience CORO

Date: 2026-10-27
Branch: `feature/coro-diagnostic-express-v1`
Base commit: `80f5c4f00ddeab6c24022cdf56490293caa8456f`
Scope: local implementation and QA only; no merge, deployment or PDF.

## Verdict

**DX-03B: PASS LOCAL — READY FOR EXPLICIT VALIDATION.**

The dynamic, bilingual resilience portrait is integrated into the DX-03 result. It consumes the canonical DX-02 responses and does not recalculate the global score.

## Architecture

- `lib/diagnostic/portrait.ts`: deterministic, DOM-independent SVG geometry.
- `app/diagnostic/ResiliencePortrait.tsx`: bilingual semantic presentation, SVG, legend and structured alternative.
- `app/diagnostic/ResiliencePortrait.module.css`: responsive CORO V2 presentation.
- `DiagnosticExperience.tsx`: result integration and approved section order.
- No chart library, generative AI, network transmission, server storage or browser-dependent geometry.

The geometry is suitable for a later PDF renderer because it uses a fixed viewBox, pure coordinates and serializable points. No PDF work is included.

## Visualization rules

| Answer | Portrait treatment |
| --- | --- |
| A | Numeric point at 3/3 |
| B | Numeric point at 2/3 |
| C | Numeric point at 0/3, at the centre |
| D | Unknown marker (diamond), no numeric value |
| E | Not-applicable marker (cross), no numeric value |

- A closed preparation polygon is created only when all eight dimensions are evaluable.
- With at least three evaluable dimensions and one or more D/E answers, only real numeric points and contiguous open segments are drawn.
- No D/E answer is projected to the centre or treated as zero.
- Below three evaluable dimensions, the SVG is replaced by an explicit coverage note and the structured eight-dimension representation.
- The global score and level remain the exclusive output of DX-02.

## Result order

1. Overall result, level and coverage.
2. Portrait de résilience CORO.
3. Strengths.
4. Improvement priorities.
5. Verification priorities.
6. Detailed recommendations.
7. Improvement plan.
8. Relevant CORO modules.
9. Optional visual conclusion and methodological limits.

The recommendations remain before the optional visual conclusion and are not hidden behind decorative content.

## Accessibility

- SVG has `role="img"`, a localized accessible title and description.
- The chart uses dimension identifiers independently of colour.
- D and E use different shapes as well as text labels.
- The legend is textual and bilingual.
- A semantic table always exposes all eight dimensions, answers and interpretations.
- On mobile, the table becomes structured rows without horizontal scrolling.
- The alternative state remains understandable without SVG.

## Automated tests

The DX-03B tests cover:

- Eight A, eight B and eight C responses.
- Mixed A/B/C/D/E responses.
- Unknown and not-applicable responses never mapped to zero.
- Closed polygon eligibility.
- Coverage below three evaluable dimensions.
- All unknown and all not-applicable responses.
- Determinism and input immutability.
- Bilingual content, accessibility structure and section order.

| Check | Result |
| --- | --- |
| DX-03B focused tests | PASS — 7/7 |
| Full suite | PASS — 699/699 |
| TypeScript | PASS |
| Targeted ESLint | PASS |
| Next.js production build | PASS |
| `git diff --check` | PASS before final report |

The initial parallel test invocation encountered a Windows `spawn EPERM` before running the affected test processes. The focused tests passed in-process, and the complete suite subsequently passed 699/699 with the required execution permission. The simultaneous build/typecheck attempt also caused a transient `.next/types` race; the sequential typecheck passed after the build.

The build retained the existing fail-soft sitemap behaviour because the restricted environment could not reach the blog API. This does not affect the Diagnostic route.

## Chrome QA

Environment:

- Dedicated local production build: `http://127.0.0.1:3416`
- Dedicated Chrome/CDP profile
- Synthetic local answers only
- No external provider or production access

### Responsive matrix

| Viewport | SVG width | Structured representation width | Overflow | Status |
| ---: | ---: | ---: | --- | --- |
| 320 | 254 px | 286 px | No | PASS |
| 375 | 309 px | 341 px | No | PASS |
| 390 | 324 px | 356 px | No | PASS |
| 768 | 392.9 px | 703 px | No | PASS |
| 1024 | 602.5 px | 959 px | No | PASS |
| 1440 | 608 px | 1150 px | No | PASS |
| 1920 | 608 px | 1150 px | No | PASS |

Every full numeric scenario rendered eight points, eight structured rows and one closed surface.

### Special browser scenarios

- Mixed `A/D/C/E/B/D/A/E`: SVG present, no closed surface, four numeric points, two D markers, two E markers, eight structured rows — PASS.
- Insufficient `A/B/D/D/E/E/D/E`: SVG absent, explicit alternative note, eight structured rows — PASS.
- All D: SVG absent, score remains `—`, eight structured rows — PASS.
- Console errors: 0.
- Failed requests: 0.

### Captures

1. [Portrait FR desktop](evidence/dx03b/01-portrait-fr-desktop.png)
2. [Portrait EN desktop](evidence/dx03b/02-portrait-en-desktop.png)
3. [Portrait FR mobile](evidence/dx03b/03-portrait-fr-mobile.png)
4. [Portrait EN mobile](evidence/dx03b/04-portrait-en-mobile.png)

Machine-readable evidence: [dx03b-browser-results.json](evidence/dx03b/dx03b-browser-results.json).

## Files added or modified for DX-03B

- `lib/diagnostic/portrait.ts`
- `app/diagnostic/ResiliencePortrait.tsx`
- `app/diagnostic/ResiliencePortrait.module.css`
- `app/diagnostic/DiagnosticExperience.tsx`
- `tests/diagnostic-portrait.test.ts`
- `tests/diagnostic.test.ts`
- `scripts/dx03b-browser-qa.mjs`
- `docs/diagnostic/DX-03B-RESILIENCE-PORTRAIT-QA.md`
- `docs/diagnostic/evidence/dx03b/*`

## Anomalies and reservations

- No product defect remains open in the DX-03B scope.
- Evidence is local and does not authorize publication.
- The portrait is an indicative representation of declared answers, not the official CORO Index or a field audit.
- PDF rendering is intentionally not implemented or validated.
- No merge, deployment, DX-05 or unrelated work was started.

## Stop point

DX-03B awaits explicit validation before any subsequent phase.
