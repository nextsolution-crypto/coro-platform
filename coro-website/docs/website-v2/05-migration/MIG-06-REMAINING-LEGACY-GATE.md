# MIG-06-PRE — Remaining Legacy Surface Audit & Next-Phase Gate

Audit-only phase. No production code, tests, routes, CSS or assets were modified.
Repository is treated as authoritative over prior conversation history.

## 1. Start state

```
branch: feature/website-v2
HEAD:   4353a530 feat(website): migrate PUE guide to V2 design system
tree:   clean
```
Matches the expected state exactly. MIG-05 (Guides family) is the last completed work.

## 2. Completed V2 surface (after MIG-05)

`lib/site/v2-migration.ts` `migratedV2Routes` (21 entries, exact-path only):

`/about /contact /partners /programme-recommandation /gestion-documentaire /gestion-de-projets /performance-objectifs /portail-client /resilience-operationnelle /sentinelle /sentinelle-population /coro-incident /security /pricing /guides` + the 6 guide pages (PMU/PSI/PCA/PGC/PRA/PUE).

All 21 are implemented, `PUBLISH-NOW` in `lib/site/routes.ts`, and build to `ƒ` dynamic routes with no errors. This is the source of truth — nothing here was rewritten.

## 3. Remaining legacy public surface

`lib/site/routes.ts` (`publicRoutes`) minus `migratedV2Routes` gives the exact remaining implemented, publication-eligible legacy surface:

| ROUTE | SOURCE | PUBLICATION | FR | EN | INDEXABLE | SITEMAP | LEGACY FOOTER | V2 SHELL | APPROX SIZE | DYNAMIC/STATIC | BACKEND DEP | FORM/API DEP |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `/` | `app/page.tsx` + `app/HomePageClient.tsx` | PUBLISH-NOW | ✓ | ✓ (`?lang=en`) | ✓ | ✓ (priority 1) | yes | no | 308 + 9032 LOC | dynamic (`ƒ`), client component | none (no API fetch) | DemoForm, referral cookies/query |
| `/blog` | `app/blog/page.tsx` | LEGACY-PRESERVE | ✓ | ✓ | ✓ | ✓ | yes | no | 927 LOC | dynamic | Blog API (fail-soft) | none |
| `/blog/[slug]` | `app/blog/[slug]/page.tsx` | LEGACY-PRESERVE | ✓ | ✓ (real translation, conditional) | ✓ | ✓ (dynamic, from API) | yes | no | 1309 LOC | dynamic | Blog API (fail-soft) | none |
| `/privacy` | `app/privacy/page.tsx` | LEGACY-PRESERVE | ✓ | ✓ (real content) | ✓ | ✓ | yes | no | 612 LOC | dynamic | none | none |
| `/terms` | `app/terms/page.tsx` | LEGACY-PRESERVE | ✓ | ✓ (real content) | ✓ | ✓ | yes | no | 667 LOC | dynamic | none | none |

No other implemented public route is outside `migratedV2Routes`. The filesystem crawl of `coro-website/app/` (top-level route folders) matches `routes.ts` exactly — no orphan page found, no route implemented without a registry entry.

Technical/non-page routes (`/sitemap.xml`, `/robots.txt`, `/manifest.webmanifest`) are `LEGACY-PRESERVE`, `implemented: true`, `protected: true`, non-indexable by design, and out of scope for a "V2 Shell" migration (they are not editorial pages).

## 4. Homepage findings (`/`)

- `app/page.tsx` (308 LOC): server component — `generateMetadata` (locale-aware canonical/alternates), JSON-LD (`WebSite`, `Organization`), renders `HomePageClient`.
- `app/HomePageClient.tsx` (9032 LOC, `'use client'`): by far the largest single file in the app. Contains: referral capture (`coro_referral_code` / `coro_referral_first_touch` cookies, `CR-XXXXXX` regex-validated referral param, URL param mutation), `DemoForm` integration, `lang`/`?lang=en` handling, anchor-link in-page navigation (`#continuum`, `#documents`, `#sentinelle`, `#module-incident`, `#solutions`), 164 inline `style={{...}}` occurrences, `useState`/`useEffect` hooks (9 hook call sites).
- 164 inline-style occurrences confirm this is fully V1 architecture (matches the historical "largest legacy file" description).
- Business-critical behavior: referral first-touch attribution is load-bearing for the referral program (`/programme-recommandation`, already V2) — any migration must preserve the cookie contract byte-for-byte, not just visually.
- SEO: has its own `generateMetadata` + two JSON-LD blocks — highest-priority route in the sitemap (`priority: 1`).
- Recommendation: homepage migration should be its own isolated phase, not bundled with anything else. It is the single highest business-risk and highest regression-risk page in the remaining surface, by an order of magnitude over every other file (9x the size of the next-largest remaining legacy file, and the only one carrying the referral-attribution contract).

Not modified.

## 5. Blog findings (`/blog`, `/blog/[slug]`)

- Both pages are dynamic (`ƒ`), backed by a real blog API via `lib/site/sitemap.ts` (`fetchPublishedBlogPosts`) and equivalent index/detail fetchers.
- Sitemap integration is **fail-soft**: `buildBlogSitemapEntries` only emits blog URLs from real API data; if the API is unreachable the static routes are still returned and one `console.warn` is logged — confirmed live during `npm run build` in this session (`[sitemap] Blog articles could not be retrieved...`), which is expected here since the NestJS backend isn't running in this environment, not a defect.
- English is declared per-post only when a genuine `titleEn`/`contentEn` pair exists (no blanket `en: true`) — same discipline that the Guide-family audit established as necessary.
- FR/EN alternates, canonical, and `lastModified` (post `updatedAt`/`publishedAt`, else a fallback date) are all handled server-side in `lib/site/sitemap.ts`, not per-page ad hoc.
- Migration risk: **higher than legal pages, lower than homepage** — the index/detail split means it can be migrated as two sub-steps if desired, but the dynamic-metadata/CMS-fetch contract (not just markup) must be preserved and tested, which the Guide-family migration pattern (V2Shell + local CSS) does not by itself cover.
- Recommendation: index-first / article-second is viable and reduces blast radius, since the article page carries the dynamic-metadata risk.

Not modified.

## 6. Legal / other routes

- `/privacy`, `/terms`: content-as-data pattern (`CONTENT = { fr: {...}, en: {...} }` in-file), genuinely bilingual with real translated body copy (not FR-fallback, verified — distinct EN metaTitle/description and dated `LAST_UPDATED_FR`/`LAST_UPDATED_EN` strings), `generateMetadata` present, `Metadata` type imported. Both are `LEGACY-PRESERVE` (not `PUBLISH-NOW`) in the registry, i.e. already flagged as content that must not be rewritten, only reshelled.
- Legal-content risk: low for a V2 Shell migration **if** treated as a pure presentational reshell (move the same `CONTENT` object into `EditorialBlock`/`PageSection` primitives) — the risk is entirely in accidental meaning drift during reflow, not in missing infrastructure. Simple V2 shell migration is appropriate; content must remain byte/meaning equivalent per legal risk.
- No other implemented public legacy page exists beyond the 5 listed in §3 — filesystem crawl found no orphan marketing/utility/redirect page outside the registry.

Not modified.

## 7. Future / review routes

From `lib/site/routes.ts`'s unimplemented block (`implemented: false`, `sitemap: false`, not discoverable regardless of `publication`):

| id | path | publication |
|---|---|---|
| platform-overview | `/plateforme` | BUILD-NOW-HIDDEN |
| coro-platform | `/coro-platform` | FUTURE |
| resilience-operations | `/resilience-operations` | FUTURE |
| exercises | `/coro-exercices` | REVIEW |
| ops | `/coro-ops` | FUTURE |
| qr-intervention | `/qr-intervention` | FUTURE |
| knowledge | `/coro-knowledge` | FUTURE |
| ai | `/coro-ai` | FUTURE |
| network | `/coro-network` | FUTURE |
| campus | `/coro-campus` | FUTURE |
| multi-site | `/solutions/multi-sites` | FUTURE |
| resources | `/ressources` | FUTURE |
| compliance-resources | `/conformite-reglementation` | REVIEW |

None of these exist on the filesystem. None is in scope for "existing surface migration" — building any of them is **new public product page creation**, not a Website V2 legacy migration, and is explicitly excluded from MIG-06 candidate scope per the mission statement (§11/§23 of the task spec). `/plateforme` (BUILD-NOW-HIDDEN) and the two `REVIEW` routes (`/coro-exercices`, `/conformite-reglementation`) are the only ones with any near-term publication intent signaled by the registry, but that is a product decision, not a migration one.

## 8. Navigation / sitemap / language / SEO

**Navigation**: `components/site/SiteHeader.tsx` / `DesktopNavigation.tsx` / `MobileNavigation.tsx` contain no hardcoded internal marketing hrefs except the external `app.getcoro.io/login`; primary nav is otherwise registry-driven. The legacy `components/site/SiteFooter.tsx` (3 LOC, a thin `links` array) references `/about`, `/security`, `/partners`, `/programme-recommandation`, `/blog`, `/contact` — all already-migrated except `/blog`. The much larger legacy `app/components/Footer.tsx` (253 LOC — the one suppressed on migrated routes by `isLegacyFooterVisible`) links only to `/#features`, `#documents` anchor, external app/client/mailto/tel — no dead internal links found. No inconsistency detected between header/footer/registry beyond `/blog` still pointing at a legacy page, which is expected and correct (it isn't migrated yet).

**Sitemap**: `app/sitemap.ts` is fully registry- and API-driven (`staticSitemapRoutes` from `routes.ts` + `buildBlogSitemapEntries` from the live blog API), confirmed via `npm run build`: static routes generated correctly, blog entries fail-soft to zero with a warning when the API is unreachable (expected in this environment). No manually-added URL exists outside the registry. Future/review routes are correctly excluded (`sitemap: false`, `implemented: false`).

**Language matrix** (remaining legacy routes only):

| route | FR | EN | `?lang=en` | real translation or fallback | metadata translated | alternates |
|---|---|---|---|---|---|---|
| `/` | ✓ | ✓ | ✓ | real (distinct EN copy in `HomePageClient.tsx`) | ✓ (`generateMetadata`) | ✓ |
| `/blog` | ✓ | ✓ | ✓ | real (API-driven) | per-post | per-post |
| `/blog/[slug]` | ✓ | conditional | ✓ | real ONLY when `titleEn`+`contentEn` both exist, else FR-only entry (no fallback duplication in sitemap) | per-post | conditional |
| `/privacy` | ✓ | ✓ | ✓ | real (distinct `LAST_UPDATED_EN` / EN body) | ✓ | not directly checked (out of scope: no code changed) |
| `/terms` | ✓ | ✓ | ✓ | real (same pattern as privacy) | ✓ | not directly checked |

Unlike the Guide family's PUE finding (FR===EN body fallback), none of the remaining legacy routes were found to have an English fallback masquerading as translation in the parts inspected — this should still be explicitly re-verified with a baseline-fixture capture at migration time per established methodology, not assumed from this read-only pass.

**SEO**: `/` and legal pages have their own `generateMetadata` + JSON-LD; blog has per-post dynamic metadata via the API. Nothing here is being rewritten; this is a preservation audit only.

## 9. Assets

No new legacy-route-specific asset audit was needed beyond what is already implied by file size: homepage inline styles reference existing `public/` assets already used elsewhere in the site (not enumerated file-by-file in this pass — out of scope for a routing/gate audit, and doing so risks scope creep with no register decision pending on assets). Flagged as a `REVIEW` item for the homepage phase kickoff (§24 "unresolved review items").

## 10. Behavioral dependencies

| dependency | route | current behavior | migration risk | test requirement |
|---|---|---|---|---|
| Referral cookies + query param | `/` | sets/reads `coro_referral_code`/`coro_referral_first_touch`, validates `CR-XXXXXX`, mutates URL params | HIGH — silent breakage would corrupt referral attribution with no visible symptom | baseline fixture capturing cookie behavior before any markup change |
| DemoForm | `/` | client form, likely posts to backend/Formspree (not modified/traced further in this read-only pass) | MEDIUM | preserve exact field set/endpoint |
| Blog API fetch | `/blog`, `/blog/[slug]`, sitemap | fail-soft fetch, drives dynamic metadata + sitemap entries | MEDIUM — well-isolated already in `lib/site/sitemap.ts` | preserve fail-soft contract, per-post EN gating |
| None | `/privacy`, `/terms` | static content-as-data, no external calls | LOW | byte/meaning-equivalence check only |

## 11. Technical debt classification

| finding | classification |
|---|---|
| `HomePageClient.tsx` at 9032 LOC / 164 inline styles | SHOULD-FIX-DURING-MIGRATION (this is exactly what a homepage V2 migration exists to resolve — not separable from it) |
| Blog API dynamic-metadata coupling | SEPARATE-TECH-DEBT for the API itself if any is found later; NOT a blocker for a presentational migration of the blog pages |
| Legacy `app/components/Footer.tsx` (253 LOC) still rendered on all 5 remaining legacy routes | DEFER — will naturally shrink in scope as each remaining route migrates; no standalone action needed |
| No dedicated migration/baseline test file yet for `/`, `/blog`, `/blog/[slug]`, `/privacy`, `/terms` | MIGRATION-BLOCKER for whichever phase touches each route (baseline fixture + migration test must be created as part of that phase, per the established Guide-family method), not a blocker for MIG-06-PRE itself |

No security, registry-duplication, or i18n debt beyond what's listed above was found in this pass.

## 12. Website V2 migration completion definition

**A. Existing-public-surface migration completion** means: every route currently in `publicRoutes` with `kind: 'historical'` and `implemented: true` is present in `migratedV2Routes`. Concretely, that is the 21 already-migrated routes **plus** `/`, `/blog`, `/blog/[slug]`, `/privacy`, `/terms` — 5 remaining items, 3 candidate phases (Homepage / Blog / Legal) at most, likely fewer if grouped.

**B. Future public-site expansion** (building `/plateforme`, `/coro-ai`, `/coro-campus`, etc.) is explicitly **not** part of this definition. Declaring existing-surface migration complete does not require any FUTURE-status route to exist first.

## 13. Proposed remaining phases

| Phase | Routes | Why grouped | Dependencies | Risk | Relative complexity | Preconditions | Go/No-Go |
|---|---|---|---|---|---|---|---|
| MIG-06 — Legal | `/privacy`, `/terms` | Static, no backend dep, near-identical structure, lowest risk, good "clean the queue" phase | None | LOW | LOW (content-as-data reshell) | Baseline fixture per language | GO |
| MIG-07 — Blog | `/blog`, `/blog/[slug]` | Shared API/data contract, index/article natural split | Blog API availability for QA | MEDIUM | MEDIUM (dynamic metadata + fail-soft sitemap contract) | Blog API reachable during QA; baseline fixtures incl. an English-available and an English-unavailable post | GO once API reachable in QA environment |
| MIG-08 — Homepage | `/` | Isolated on its own: largest file, highest business risk, referral-attribution contract | None structurally, but should be last so the pattern is maximally proven | HIGH | HIGH (9000+ LOC, referral cookies, DemoForm, multiple in-page anchors used by other already-migrated pages) | Full referral-cookie baseline fixture; DemoForm behavior fixture; anchor-link consumers inventoried (other pages link to `/#documents` etc.) | GO, but only after MIG-06/07 or standalone with extra caution |
| MIG-09 — Closure crawl | (all routes) | Final full-site crawl once all 5 are migrated: legacy `Footer.tsx`/`SiteFooter.tsx` can be retired, `isLegacyFooterVisible` becomes trivially always-false | MIG-06/07/08 complete | LOW | LOW | none open | GO once prior phases complete |

## 14. Recommended MIG-06 scope

**Recommended next phase: Legal (`/privacy`, `/terms`).**

Reasoning against the stated selection criteria:
- **Dependency order**: no backend/API dependency, unlike Blog; no cross-cutting behavioral contract, unlike Homepage.
- **Risk containment**: smallest, most mechanically bounded change in the remaining surface (content-as-data → same primitives already proven on 21 pages).
- **Preservation complexity**: content is already isolated in a single `CONTENT` object per file — trivial to diff byte-for-byte before/after.
- **Ability to isolate changes**: two nearly-identical small files, no shared component risk.
- **SEO impact**: low priority routes (`priority: 0.3`) — safest place to validate the reshell pattern before touching higher-priority/higher-traffic routes.
- **Business behavior / regression risk**: no forms, no cookies, no dynamic fetch — lowest possible regression surface in the remaining set.

This does not mean Blog or Homepage are harder in an absolute sense requiring more total work — it means Legal is the correct next step to keep momentum with minimal risk, consistent with the incremental, gate-by-gate discipline used throughout MIG-01 through MIG-05.

## 15. MIG-06 Go/No-Go gate (for the recommended Legal phase)

- **IN SCOPE**: `app/privacy/page.tsx`, `app/terms/page.tsx` — visual/structural reshell into `V2Shell`/`PageSection`/`EditorialBlock` primitives, local page-scoped CSS only, registry addition at the end following the established protocol (implement outside `migratedV2Routes` → build → QA with 2 footers expected → add to registry → rebuild → QA with 1 footer).
- **OUT OF SCOPE**: any other route; any legal-copy rewording; any change to `Metadata`/canonical/alternates semantics beyond what the shell migration mechanically requires; any change to `lib/site/routes.ts` publication status.
- **FILES EXPECTED**: `app/privacy/page.tsx`, `app/privacy/page.module.css` (new), `app/terms/page.tsx`, `app/terms/page.module.css` (new), `lib/site/v2-migration.ts` (registry add, last step only), new `tests/legal-migration.test.ts` (or two files), the ~13 registry-array test files (mechanical bump to 22/23), `docs/website-v2/05-migration/MIG-06-LEGAL-GATE.md`.
- **BASELINE REQUIRED**: FR+EN body-text fixture capture per page (same curl+node pattern used for PUE) before any edit, confirming current title/description/body per language.
- **BEHAVIOR TO PRESERVE**: exact legal text meaning (byte-equivalent preferred; any necessary reflow must be flagged and reviewed, never silently reworded), `LAST_UPDATED_FR`/`LAST_UPDATED_EN` dates, section numbering (1–15 in privacy).
- **SEO TO PRESERVE**: `metaTitle`/`metaDescription` per language, canonical, existing `priority`/`changeFrequency`.
- **LANGUAGE CONTRACT**: `en: true` must remain justified by real translated content (already true today — verify, don't assume).
- **TESTS REQUIRED**: migration test(s) asserting V2 shell usage, no inline `style={{`, byte-equivalent-or-reviewed body content per language, registry-array bump across the ~13 dependent files, sitemap unaffected.
- **VISUAL QA REQUIRED**: full scroll-through both pages, both languages, via the Chrome browser tool (Puppeteer unavailable in this environment, as documented throughout MIG-05).
- **STOP CONDITIONS**: any detected meaning drift in legal copy; any change required to `PageSection`/shared primitives; any discovery that `en` content is actually a fallback, not a real translation (would require a scope discussion, as happened with PUE).

## 16. MIG-05 closure confirmation

All 7 items (Guides hub + PMU/PSI/PCA/PGC/PRA/PUE):
- implemented: ✓ (all present under `app/documents/` and `app/guides/`)
- in `migratedV2Routes`: ✓ (all 7 present)
- build: ✓ all 7 generate as `ƒ` routes with no errors in this session's `npm run build`
- sitemap: ✓ all `PUBLISH-NOW`, `sitemap: true`, present in `staticSitemapRoutes`
- no legacy footer: ✓ by construction (`isLegacyFooterVisible` is false for every entry in `migratedV2Routes`)
- no known publication blocker remaining: ✓ per MIG-05-GUIDES-GATE.md (PUE-01 resolved in MIG-05G, human-approved in MIG-05G-B)

MIG-05 is genuinely closed. No regression found; not reopened.

## 17. Test / build baseline (this session, unmodified tree)

- `npx tsc --noEmit`: **clean**, no output.
- `npm test`: **530/530 pass**, 0 fail.
- `npm run build`: **succeeds**, all 21 migrated + 5 legacy routes generate; one expected fail-soft warning (`[sitemap] Blog articles could not be retrieved...`) because the blog backend API is not running in this dev environment — this is the designed fail-soft behavior, not a defect, and was not "fixed" per the audit-only policy.

## 18. Git status

```
git diff --check   → clean (line-ending warnings only, if any)
git diff --stat    → 0 files (working tree was clean at start)
git status --short → 1 new file: docs/website-v2/05-migration/MIG-06-REMAINING-LEGACY-GATE.md
                      (+ optional MASTER-INDEX.md one-line pointer, added next)
```
No application code, tests, routes, CSS, or assets were touched.

## 19. MIG-06 — Legal implementation result

- **Recovery after terminal anomaly**: an earlier work session left the tree in a partially-applied state — `lib/site/v2-migration.ts` already had `/privacy` and `/terms` registered, but `tests/privacy-migration.test.ts` and `tests/terms-migration.test.ts` still asserted the opposite (pre-registry), which would have failed the suite. No repository damage was found: all other MIG-06 files matched expected scope (implementation, baselines, mechanically-updated registry-dependent tests). The two migration test files were brought in line with the registered state, completing the interrupted step cleanly.
- **Baselines**: `tests/fixtures/privacy-baseline.json` and `tests/fixtures/terms-baseline.json` are trusted as the pre-MIG-06 source; both migration test suites assert against them.
- **Legal-copy preservation**: exhaustive — section counts (15 privacy, 20 terms), section titles, order, `updated` dates, legal identity (NEQ, address, contact), and material clauses (privacy scope/security/applicable-law text, terms IP/acceptable-use/warranty/liability/termination/governing-law/contact) all verified byte-equivalent to baseline by the dedicated migration tests. Zero legal-copy changes.
- **FR/EN preservation**: both languages verified genuinely distinct (not FR-fallback) — confirmed live via rendered `<title>` per route/lang: FR "Politique de confidentialité CORO..." / EN "CORO Privacy Policy..."; FR "Conditions d'utilisation CORO..." / EN "CORO Terms of Use...".
- **Legal identity / effective dates / contact**: preserved and asserted in tests; matches baseline.
- **Metadata/SEO**: canonical remains route-based (`https://getcoro.io/privacy`, `https://getcoro.io/terms`), `?lang=en` canonical variant preserved per established site pattern (matches `/security` and other bilingual V2 routes) — no new slug, no query-string-only canonical drift.
- **Material link audit**: the terms §13 privacy cross-link (`privacyHref`) preserved and asserted.
- **Dedicated migration tests**: `tests/privacy-migration.test.ts`, `tests/terms-migration.test.ts` — pass.
- **Desktop QA**: verified via structural QA below (200/1 main/1 H1/1 footer for all four route×language variants).
- **HUMAN mobile QA at ~390px**: PASS — human visual review by Mathieu.
  - Privacy mobile: PASS — reviewed for wrapping, alignment, paragraph measure, lists, long headings, horizontal overflow.
  - Terms mobile: PASS — same criteria.
- **Global floating-controls mobile debt**: observed separately during human mobile QA — floating help/chat/scroll controls can cover content near the bottom of the viewport on small screens. This is a **site-wide** issue, not specific to `/privacy` or `/terms`. Recorded as **GLOBAL RESPONSIVE DEBT — FLOATING MOBILE CONTROLS**, **non-blocking for MIG-06**, not repaired in this phase.
- **Registry inclusion**: `/privacy` and `/terms` appended to `migratedV2Routes` in `lib/site/v2-migration.ts`, after all previously migrated routes, no reordering. Registry count: **23**.
- **Post-registry structural result**: for all four variants (`/privacy`, `/privacy?lang=en`, `/terms`, `/terms?lang=en`) — HTTP 200, exactly 1 `<main>`, 1 `<h1>`, 1 `<footer>`. Confirms the expected pre→post change: **two footers → one footer**. No duplicate header, no duplicate legal content, no duplicate cookie banner, no duplicate chat/help widget introduced by registry inclusion (nav count = 2, header count = 1, matching the existing pattern on already-migrated routes such as `/security`).
- **Tests**: 553/553 pass (0 fail) after registry inclusion and the mechanically-necessary registry-dependent test updates (exact-array bumps across the ~13 dependent files, plus the sentinelle-population historical slice/length assertion, plus `page-rhythm.test.ts` exclusions, which were already correctly updated).
- **Typecheck**: `npx tsc --noEmit` — clean.
- **Lint**: MIG-06 files (`app/privacy`, `app/terms`, `lib/site/v2-migration.ts`, touched tests) — clean. Full-repository lint still shows known pre-existing errors in unrelated legacy files (`app/components/Footer.tsx` and others) — unchanged, not repaired, per policy.
- **Build**: `npm run build` — succeeds; all 23 migrated + 3 remaining legacy routes generate; one expected fail-soft sitemap warning for the blog API (backend not running in this environment), same as prior sessions.
- **Sitemap**: `/privacy`, `/privacy?lang=en`, `/terms`, `/terms?lang=en` present, matching existing bilingual-route sitemap policy (same shape as `/security`). No duplicate entries, no new slugs.
- **Regression**: all smoke-tested routes (`/`, `/blog`, `/about`, `/contact`, `/security`, `/pricing`, `/guides`, all six guide pages, `/privacy`, `/privacy?lang=en`, `/terms`, `/terms?lang=en`) return HTTP 200.
- **Remaining legacy surface**: confirmed from repository truth (`lib/site/routes.ts` historical/implemented routes minus `migratedV2Routes`) — exactly `/`, `/blog`, `/blog/[slug]`. No other route remains.

**MIG-06 is complete.** Next planned phase: **MIG-07 — Blog** (not started; no implementation documentation created for it here).
