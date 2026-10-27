# DX-02 — Scoring and recommendations QA

Date: 2026-10-27

Branch: `feature/coro-diagnostic-express-v1`

Baseline: `80f5c4f00ddeab6c24022cdf56490293caa8456f`

Scope: business engine and bilingual recommendation catalogue only

Verdict: **DX-02 IMPLEMENTED_AND_VALIDATED_LOCALLY — AWAITING_EXPLICIT_APPROVAL**

## 1. Architecture

DX-02 is implemented as a pure TypeScript layer under `lib/diagnostic/`. It has no React, browser-storage, backend, database, analytics, PDF, generative-AI or network dependency.

- `config.ts` owns the versioned scoring policy, thresholds, coverage threshold and business tie-break order.
- `engine.ts` validates a complete eight-dimension response set and produces a deterministic evaluation.
- `modules.ts` owns the bilingual CORO capability and availability registry, including only verified public destinations.
- `recommendations.ts` owns the 40 bilingual dimension/answer variants.
- `types.ts` defines the closed input, output, recommendation and availability contracts.

The engine version and questionnaire version are both `1.0`. Unsupported versions and malformed inputs fail closed with typed validation errors.

## 2. Methodology

### Scoring

Only A, B and C are evaluable:

| Answer | Points | Interpretation |
|---|---:|---|
| A | 3 | Demonstrated strength |
| B | 2 | Partial capability; improvement priority after C |
| C | 0 | Capability to reinforce; first improvement priority |
| D | — | Unknown information; separate verification priority |
| E | — | Not applicable; excluded from corrective priorities |

`score = round(points earned / maximum points for evaluable dimensions × 100)`.

Coverage is calculated independently as `round(evaluable dimensions / 8 × 100)`. A definitive level is returned only at coverage of at least 75% (six dimensions). With a zero denominator, score and level are both `null`.

Versioned levels:

- 0–34: Preparation to reinforce.
- 35–59: Partial preparation.
- 60–79: Structured preparation.
- 80–100: Advanced preparation.

The result carries explicit limitations for insufficient coverage, unknown information, declared non-applicability and critical dimensions declared non-applicable. The Diagnostic Express score is explicitly distinct from the official CORO Index.

### Prioritization

- Improvement priorities: all C answers, then all B answers.
- Verification priorities: D answers only, in a separate list.
- Strengths: A answers only.
- E answers: excluded from corrective priorities.
- Tie-break order within the same answer status: `D5 → D4 → D2 → D3 → D7 → D6 → D8 → D1`.

No unknown answer is treated as a failure, and a partial answer is never described as a complete absence of capability.

## 3. Recommendation matrix

The catalogue contains exactly 40 variants: eight dimensions × five answers. Every variant contains, in FR-CA and EN-CA and in this order:

1. an observation strictly derived from the selected answer;
2. an operational issue;
3. an independent good practice;
4. a concrete action;
5. relevant CORO capabilities;
6. their current availability and a verified public destination when one exists.

| Dimension | Subject | CORO capability associations |
|---|---|---|
| D1 | Facility knowledge | Buildings and Client Portal; CORO Knowledge; CORO AI |
| D2 | Document compliance | CORO Documents; CORO Knowledge |
| D3 | People readiness | CORO Ops (planned); Exercises, lessons learned and corrective actions |
| D4 | Operational coordination | CORO Incident; CORO Knowledge; CORO Ops (planned) |
| D5 | Protection of people | CORO Sentinelle; CORO Incident |
| D6 | Exercises and validation | Exercises, lessons learned and corrective actions; CORO Incident |
| D7 | Operational traceability | CORO Incident; CORO Documents |
| D8 | Continuous improvement | Exercises, lessons learned and corrective actions; Audits and findings (not presented as a sold CORO Audit module) |

Availability labels are limited to `Available`, `Available under conditions`, `In development` and `Planned`. CORO Ops, CORO Network and audit-related references have no invented public route and are not represented as commercially available modules. Exercise/REX/corrective-action capability is qualified through the published Resilience route rather than an invented Exercises page.

## 4. Files added or modified in DX-02

Added:

- `lib/diagnostic/engine.ts`
- `lib/diagnostic/modules.ts`
- `lib/diagnostic/recommendations.ts`
- `tests/diagnostic-engine.test.ts`
- `tests/diagnostic-recommendations.test.ts`
- `docs/diagnostic/DX-02-SCORING-AND-RECOMMENDATIONS-QA.md`

Modified:

- `lib/diagnostic/config.ts`
- `lib/diagnostic/types.ts`

DX-01 page, storage and route files remain present in the same uncommitted branch work. No backend or product-service file was changed by DX-02.

## 5. Tests executed

| Control | Result |
|---|---|
| DX-02 scoring and recommendation tests | PASS — 19/19 |
| Complete website test suite | PASS — 674/674, 0 failed, 0 skipped |
| TypeScript (`npm run typecheck`) | PASS |
| Targeted ESLint (`lib/diagnostic` and DX-02 tests) | PASS |
| Production build (`npm run build`) | PASS; `/diagnostic` compiled as a dynamic route |
| `git diff --check` | PASS |

Test coverage includes:

- eight A answers = 100%;
- eight B answers = rounded 67%;
- eight C answers = 0%;
- 19/24 = 79%;
- exactly 75% coverage and insufficient coverage;
- all unknown and all non-applicable;
- zero denominator;
- critical non-applicability limitations;
- C-before-B priority ordering and the approved tie-break order;
- malformed input, missing dimensions, invalid dimensions, invalid answers and unsupported versions;
- strengths;
- exactly 40 bilingual recommendation variants;
- module associations, availability truth and public-destination validity;
- deterministic output and input non-mutation.

## 6. Visual evidence

DX-02 does not alter the rendered questionnaire and is deliberately not wired to a result screen in this lot. No new browser capture was manufactured for a non-visual change. The responsive and bilingual DX-01 evidence remains valid because its UI files were not changed by DX-02. Result presentation and its visual acceptance belong to the next explicitly authorized lot.

## 7. Anomalies and corrections

One test found that response-set cardinality was checked before invalid dimension/answer details. Validation remained fail-closed, but its diagnostic code was less precise. The validator now checks key/value validity first and then requires exactly eight dimensions. The affected test and the full suite pass after correction.

No open DX-02 defect was observed.

## 8. Reserves

- The engine is not yet connected to the questionnaire UI; this is intentionally outside DX-02.
- No final result page, PDF, enriched commercial conversion or analytics was added.
- Availability status must still be rechecked immediately before any future public publication.
- This local validation is not authorization to merge or deploy.

## 9. Verdict

**DX-02 IMPLEMENTED_AND_VALIDATED_LOCALLY — AWAITING_EXPLICIT_APPROVAL.**

The scoring and recommendation engine meets the approved deterministic, privacy, coverage, prioritization, bilingual and product-truth rules. DX-03 has not been started. No commit, merge or deployment was performed.
