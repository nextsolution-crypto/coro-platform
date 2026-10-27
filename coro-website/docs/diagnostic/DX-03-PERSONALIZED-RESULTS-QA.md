# DX-03 — Personalized results QA

Date: 2026-10-27

Branch: `feature/coro-diagnostic-express-v1`

Baseline: `80f5c4f00ddeab6c24022cdf56490293caa8456f`

Verdict: **DX-03 IMPLEMENTED_AND_VALIDATED_LOCALLY — AWAITING_EXPLICIT_APPROVAL**

## 1. Architecture

DX-03 connects the DX-01 questionnaire to the approved DX-02 engine without reproducing business rules in React.

- `lib/diagnostic/results.ts` builds a deterministic presentation model from the engine output and recommendation catalogue.
- `DiagnosticExperience.tsx` renders that model and owns only interaction state.
- The result contains the indicative score, coverage, definitive or provisional state, level, summary, eight dimensions, up to three strengths, up to three correction priorities, separate verification priorities, detailed recommendations, a personalized 0–30/30–60/60–90-day plan, relevant CORO capabilities, product availability and methodological limits.
- The result language can be switched locally between FR-CA and EN-CA without a route reload, URL data or additional persistence.
- Completion and restart remove the questionnaire state from `sessionStorage`; the in-memory result remains readable until restart or page exit.

No backend, database, analytics, PDF, CORO AI integration, result history or multi-site comparison was added.

## 2. Files added or modified in DX-03

Added:

- `lib/diagnostic/results.ts`
- `tests/diagnostic-results.test.ts`
- `docs/diagnostic/DX-03-PERSONALIZED-RESULTS-QA.md`

Modified:

- `app/diagnostic/DiagnosticExperience.tsx`
- `app/diagnostic/diagnostic.module.css`
- `tests/diagnostic.test.ts`

DX-01 and DX-02 files remain part of the same uncommitted feature branch. Other worktrees were not modified.

## 3. Result rules implemented

- A level is displayed only when coverage is at least 75%.
- Below 75%, the page states that the result is provisional and displays no level.
- A partial score, when calculable, is labelled as partial.
- At most three strengths are selected exclusively from A answers.
- At most three improvement priorities follow C, then B, then the approved business tie-break order.
- D answers appear only under verification priorities.
- E answers never become failures or corrective priorities.
- A specific warning is displayed when a critical dimension is declared not applicable.
- The plan uses the selected correction priorities, followed by verification priorities when needed. When no correction exists, it uses maintenance actions derived from declared strengths rather than inventing a generic weakness.
- Good practice appears before action and before the contextual CORO capability section.
- Every module, status and link comes from the DX-02 registry.
- The page explicitly states that this score is not the official CORO Index.

## 4. Scenarios tested

| Scenario | Input | Expected and observed result | Status |
|---|---|---|---|
| A | Eight A | 100%, advanced, three displayed strengths, no invented correction | PASS |
| B | 19/24 | 79%, structured, D8 first, then B priorities | PASS |
| C | Eight C | 0%, reinforce, no strength, C priorities in business order | PASS |
| D | Six evaluable + D + E | Exactly 75%, definitive level, D kept separate | PASS |
| E | Four evaluable + D/D/E/E | 50%, provisional, no definitive level | PASS |
| F | Eight D | No denominator or score, eight verification priorities, no correction | PASS |
| G | Eight E | No denominator or score, no correction, critical applicability warning | PASS |
| H | Eight B | 67%, deterministic tie-break and personalized three-stage plan | PASS |

Additional cases passed for no strength, no corrective priority, invalid inputs, invalid versions, all 40 recommendations, public destinations, availability truth and deterministic output.

## 5. Browser acceptance

Browser: real Chrome against the isolated local Next.js runtime (`localhost:3413`).

Executed flows:

- Completed a mixed FR-CA questionnaire producing exactly 79%.
- Confirmed the score, level, coverage, ordered priorities, three strengths, 90-day plan, eight recommendations and contextual modules.
- Switched the completed result to EN-CA without navigation or losing the in-memory result.
- Restarted and confirmed return to the introduction.
- Completed eight D answers and confirmed a 0% coverage provisional result, no level, no score, no strength, no correction priority and eight verification priorities.
- Confirmed no browser console warning or error.

Measured component geometry after the final implementation:

| Requested viewport | Effective content viewport | Horizontal overflow |
|---:|---:|---|
| 320 × 844 | 305 px | No |
| 390 × 844 | 375 px | No |
| 768 × 900 | 753 px | No |
| 1024 × 900 | 1009 px | No |
| 1440 × 900 | 1425 px | No |
| 1920 × 1080 | 1905 px | No |

Result sections remain within 16 px mobile margins, 24 px tablet margins and a 1152 px desktop maximum. Cards collapse to one column on mobile and use two or three columns only at the desktop breakpoint.

## 6. Captures

Four Chrome captures were taken during the QA execution:

1. FR-CA, 1440 × 900 — 79% structured result header and dimension cards.
2. FR-CA, 390 × 844 — mobile score, coverage, level and first dimensions.
3. EN-CA, 1440 × 900 — translated structured result with unchanged score and coverage.
4. EN-CA, 390 × 844 — translated mobile result and local language control.

The captures are retained in the execution evidence for this session; no generated binary capture was added to the product source.

## 7. Accessibility

- One result H1 followed by ordered H2/H3 sections.
- Definition lists for score metadata and recommendation semantics.
- Ordered lists for dimensions and the time-based plan.
- The eight-dimension view includes answer letters and full text; meaning does not depend on colour.
- Unknown and non-applicable answers remain explicitly labelled.
- Focus is moved to the changing question/result heading.
- Questionnaire radios remain native keyboard controls.
- Result language is declared through `lang="fr-CA"` or `lang="en-CA"`.
- Language, module and restart controls have explicit text and at least 44 px interactive height after QA adjustment.
- Reduced-motion behavior from DX-01 remains intact.

## 8. Privacy and product truth

- Static source verification found no `fetch`, `XMLHttpRequest`, `sendBeacon` or WebSocket use in the diagnostic.
- No answers or score enter the URL.
- No local storage, cookie, backend call or analytics SDK was introduced.
- `sessionStorage` remains tab-scoped and is removed on completion and restart.
- No unimplemented module receives an invented route.
- CORO Ops and audit-related capability references are marked planned and are not represented as available products.
- The diagnostic does not claim to be the official CORO Index or an audit.

## 9. Technical results

| Control | Result |
|---|---|
| DX-01 to DX-03 targeted tests | PASS — 34/34 before final full run |
| Complete website suite | PASS — 685/685, 0 failed, 0 skipped |
| TypeScript | PASS |
| Targeted ESLint | PASS |
| Production build | PASS |
| Chrome console | PASS — no warning/error |
| `git diff --check` | PASS |

## 10. Anomalies corrected

1. **Completed-result language change:** the global route switch could reload after the approved completion cleanup removed questionnaire state. A local bilingual result control now switches all result content without URL mutation or extra persistence.
2. **Interactive target size:** inline result/module links initially measured 24 px high. They now use a minimum 44 px interactive height.

No open DX-03 defect was observed after correction.

## 11. Reserves

- The route remains hidden, `noindex` and absent from the sitemap and navigation.
- The result exists only in memory after completion; leaving or reloading the page intentionally discards it.
- PDF export, enriched commercial conversion, analytics, backend persistence and CORO AI remain excluded.
- Product availability must be rechecked immediately before a future publication decision.
- Local QA is not authorization to merge or deploy.

## 12. Verdict

**DX-03 IMPLEMENTED_AND_VALIDATED_LOCALLY — AWAITING_EXPLICIT_APPROVAL.**

The personalized result is deterministic, bilingual, responsive, accessible, private and grounded exclusively in the approved DX-02 engine and recommendation registry. DX-04 has not been started. No commit, merge or deployment was performed.
