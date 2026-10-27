# DX-04B — Visual integration and QA

Date: 2026-10-27
Branch: `feature/coro-diagnostic-express-v1`
Base commit: `80f5c4f00ddeab6c24022cdf56490293caa8456f`
Scope: local visual integration only; no merge, deployment, PDF, Portrait de résilience, analytics or server storage.

## Verdict

**DX-04B: PASS LOCAL — READY FOR EXPLICIT VALIDATION.**

The two supplied illustrations are integrated into `/diagnostic` in FR-CA and EN-CA. The Hero and conclusion were exercised in a dedicated Chrome session at all seven required widths. No product anomaly was found.

## Source inventory and assignment

| File | Format | Intrinsic dimensions | Source weight | Use | Rationale |
| --- | --- | ---: | ---: | --- | --- |
| `public/images/Coro_Diagnostic/coro-diagnostic-hero.webp` | WebP | 1200 × 630 | 95,074 bytes | Hero | Photographic building image supports the preparedness promise without representing product evidence. |
| `public/images/Coro_Diagnostic/coro-diagnostic-dimensions.webp` | WebP | 1200 × 654 | 48,374 bytes | Result conclusion | Cutaway building visually supports the interconnected dimensions and action-oriented conclusion. |

The files were inspected by content rather than assigned from their names alone.

## Implementation

- `next/image` is used for both local WebP files.
- Explicit intrinsic dimensions reserve the aspect ratio and prevent layout shift.
- Responsive `sizes` select appropriately sized variants.
- The Hero uses `fetchPriority="high"`; the below-the-fold conclusion retains lazy loading.
- The Hero remains compact: two columns from 768 px and a natural single-column flow on smaller screens.
- The conclusion appears after recommendations and relevant CORO modules, before methodological limits.
- No mandatory commercial CTA was introduced.
- Alternative text is distinct and localized in French and English.
- The images have no animation; the existing `prefers-reduced-motion` rule remains effective for the only animated diagnostic element.

## Modified files for DX-04B

- `app/diagnostic/DiagnosticExperience.tsx`
- `app/diagnostic/diagnostic.module.css`
- `public/images/Coro_Diagnostic/coro-diagnostic-hero.webp`
- `public/images/Coro_Diagnostic/coro-diagnostic-dimensions.webp`
- `tests/diagnostic-public-integration.test.ts`
- `scripts/dx04b-browser-qa.mjs`
- `docs/diagnostic/DX-04B-VISUAL-INTEGRATION-QA.md`
- `docs/diagnostic/evidence/dx04b/*`

## Browser QA

Environment:

- Dedicated local production build: `http://127.0.0.1:3415`
- Dedicated headless Chrome/CDP profile
- Synthetic local diagnostic responses only
- No production or external integration

### Responsive measurements

Both the Hero and conclusion were measured at 320, 375, 390, 768, 1024, 1440 and 1920 px (14 component checks).

| Viewport | Hero rendered width | Conclusion rendered width | Horizontal overflow |
| ---: | ---: | ---: | --- |
| 320 | 286 px | 288 px | No |
| 375 | 341 px | 343 px | No |
| 390 | 356 px | 358 px | No |
| 768 | 318.3 px | 387.7 px | No |
| 1024 | 435 px | 529 px | No |
| 1440 | 518.6 px | 634.8 px | No |
| 1920 | 518.6 px | 634.8 px | No |

Every measured image completed loading with a positive natural width. Aspect ratios were preserved. Text, CTA, privacy copy, recommendations and methodological limits remained readable and accessible.

### Captures

1. [Hero FR desktop](evidence/dx04b/01-hero-fr-desktop.png)
2. [Hero EN desktop](evidence/dx04b/02-hero-en-desktop.png)
3. [Hero FR mobile](evidence/dx04b/03-hero-fr-mobile.png)
4. [Hero EN mobile](evidence/dx04b/04-hero-en-mobile.png)
5. [Conclusion FR desktop](evidence/dx04b/05-conclusion-fr-desktop.png)
6. [Conclusion EN desktop](evidence/dx04b/06-conclusion-en-desktop.png)
7. [Conclusion FR mobile](evidence/dx04b/07-conclusion-fr-mobile.png)
8. [Conclusion EN mobile](evidence/dx04b/08-conclusion-en-mobile.png)

Machine-readable evidence: [dx04b-browser-results.json](evidence/dx04b/dx04b-browser-results.json).

## Performance observations

- Source assets total 143,448 bytes.
- In the 390 px browser pass, Next.js served responsive optimized resources with decoded response bodies of approximately 11.6 KB (Hero) and 6.5 KB (conclusion).
- The conclusion image is not requested until it approaches the viewport.
- Explicit dimensions reserve layout space; no visible layout shift was observed during the campaign.

These are local observations, not production Core Web Vitals.

## Technical validation

| Check | Result |
| --- | --- |
| Full Node test suite | PASS — 692/692 |
| TypeScript | PASS |
| Targeted ESLint | PASS |
| Next.js production build | PASS |
| `git diff --check` | PASS before report finalization |
| Chrome widths | PASS — 7/7 |
| Hero + conclusion geometry | PASS — 14/14 |
| Console errors | PASS — 0 |
| Failed browser requests | PASS — 0 |

The build could not reach the blog API in the restricted local environment. Its existing fail-soft behavior omitted dynamic article URLs and did not affect `/diagnostic` or this visual scope.

## Anomalies and corrections

The first browser-harness pass measured the conclusion before its lazy image had decoded because the site uses animated scrolling. The product layout was not at fault. The DX-04B harness was corrected to force deterministic local scrolling and wait for `complete && naturalWidth > 0`; the complete campaign was then rerun successfully.

No product defect was demonstrated after the corrected pass.

## Reservations

- Results are from the isolated local build only.
- DX-04B does not authorize publication, merge or deployment.
- The illustrations are conceptual marketing imagery and are not proof of product functionality.
- No PDF, Portrait de résilience, analytics, server persistence or scoring/recommendation change is included.

## Stop point

No merge, deployment, DX-03B, DX-05 or other phase was started. Explicit approval is required for any next step.
