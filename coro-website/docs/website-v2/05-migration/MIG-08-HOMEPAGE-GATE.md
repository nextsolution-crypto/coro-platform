# MIG-08-PRE — Homepage Master Audit, Preservation Matrix, Visual Narrative & Final-Showpiece Gate

> **STATUS AT MIG-08 FINAL GATE (superseded below):** this document is the pre-implementation audit/planning phase only — every "pending", "not yet wired", "no visual QA performed" statement below reflects that starting point, not the shipped result. The Homepage was subsequently built end-to-end (`app/home/**`), went through iterative section-by-section human visual review, a full MIG-08A-QA master audit, a MIG-08A-QA-FIX technical closure pass, and human validation on real desktop, iPad and iPhone. `app/page.tsx` now renders `app/home/Home.tsx` in place of `app/HomePageClient.tsx`, and `/` is registered in `lib/site/v2-migration.ts`. This file is kept as the historical planning record and is not rewritten below; treat the actual `app/home/**` implementation and current test suite as authoritative over anything stated here.

Audit / architecture / creative-direction phase only. No Homepage implementation performed. `app/page.tsx` and `app/HomePageClient.tsx` are unmodified. Repository (frontend `coro-website`, backend `coro-backend`, both present in this worktree) is treated as authoritative.

## 1. Start state

```
branch: feature/website-v2
HEAD:   cb4c692e feat(website): migrate blog articles and discovery to V2
tree:   clean
```
Matches exactly. MIG-07 (Blog: index + dynamic article + canvas polish + taxonomy discovery) is closed.

## 2. Final legacy-surface confirmation

`lib/site/v2-migration.ts`: `migratedV2Routes` = 24 exact static entries (`/about`, `/contact`, `/partners`, `/programme-recommandation`, `/gestion-documentaire`, `/gestion-de-projets`, `/performance-objectifs`, `/portail-client`, `/resilience-operationnelle`, `/sentinelle`, `/sentinelle-population`, `/coro-incident`, `/security`, `/pricing`, `/guides`, the 6 `/documents/*` routes, `/privacy`, `/terms`, `/blog`). `migratedV2DynamicRoutes` = 1 explicit pattern (`/blog/[slug]`, segment-bounded regex, cannot over-match). `/` is **not** present in either registry.

**CURRENT V2 STATIC ROUTES**: 24. **CURRENT V2 DYNAMIC ROUTES**: 1 pattern family. **REMAINING EXISTING LEGACY ROUTES**: exactly `/`.

## 3. Homepage file inventory

| FILE | ROLE | ASPECT | LEGACY/V2/NEUTRAL | MIGRATION RISK |
|---|---|---|---|---|
| `app/page.tsx` (308 LOC) | Route entry, `generateMetadata`, `WebSite`+`Organization` JSON-LD, server component | Behavioral/SEO | LEGACY (pre-V2, but already reasonably clean) | LOW — metadata/JSON-LD logic is small, isolated, reusable pattern |
| `app/HomePageClient.tsx` (9,032 LOC) | The entire rendered page: nav/header, hero, ~19 content sections, footer, all styling (`<style jsx>`), all state | Behavioral/Visual/Content | LEGACY, full V1 monolith | HIGH — single client component, no decomposition |
| `app/DemoForm.tsx` (312 LOC) | Demo request form, client component, imported once by `HomePageClient` | Behavioral | LEGACY markup but self-contained, framework-agnostic logic | LOW — reusable as-is (see §12) |
| `lib/site/v2-migration.ts` | Registry `/` must eventually join | Neutral | NEUTRAL | No change needed until root registration step |
| `public/images/homepage/*.webp` (16 files, 12 referenced) | Hero/section imagery | Visual | NEUTRAL (real photography/illustration assets) | See §17 asset inventory |
| No other files imported | — | — | — | — |

`HomePageClient.tsx` imports only `useState`/`useEffect` from React, `DemoForm`, and `TRANSLATIONS` (an inline FR/EN dictionary defined in the same file — no external content module). No analytics SDK, no external UI library, no icon package, no CSS framework import beyond inline `<style jsx>`. No shared V2 primitives (`V2Shell`, `EditorialHero`, etc.) are imported anywhere — Homepage is fully outside the V2 component system today.

## 4. Complexity measurement

- `app/page.tsx`: 308 LOC.
- `app/HomePageClient.tsx`: 9,032 LOC — largest file in the frontend by a wide margin (Blog article pre-migration was 1,309 LOC for comparison).
- `useState`: 6 (`lang`, `showDemoVideo`, `menuOpen`, `platformMenuOpen`, `solutionsMenuOpen`, `scrolled`, `activeProductTab` — 7 actually).
- `useEffect`: 1, combining three unrelated concerns (language-from-query, referral-attribution capture, scroll-listener registration) in one body — a decomposition risk to flag, not fix, during PRE.
- `useCallback`/`useMemo`: 0.
- `window`/`document` usage: `window.location.search`, `window.scrollY`, `window.location.hostname`, `window.location.protocol`, `document.cookie` — all inside the effect or the two cookie helper functions (`getCookie`, `setReferralCookie`), both module-scope, both pure enough to lift into a small client island unchanged.
- `localStorage`/`sessionStorage`: none used.
- `URLSearchParams`: 1 usage (referral + lang parsing).
- `fetch`/API calls: 0 inside `HomePageClient.tsx` itself (DemoForm owns its own single `fetch` to Formspree).
- Forms: 1 (`DemoForm`, embedded, not a modal).
- Timers: none. Event listeners: 1 (`scroll`, added/removed in the effect cleanup — correctly cleaned up).
- `IntersectionObserver`: none found — no scroll-triggered reveal animations currently exist despite the file's size.
- Animations: CSS-only (`animate-fade-in-up` classes with staggered `delay-N` modifiers on the hero); no JS-driven animation, no carousel, no video autoplay.
- Dynamic imports: none.
- Inline `style={{...}}` occurrences: very high (hundreds — consistent with every other pre-migration V1 page in this codebase, per the pattern already documented for Blog/Guides in prior gates).

Classification: this is the same "V1 architecture, no client hooks beyond simple UI state" pattern already migrated repeatedly (Blog index/article, Guides, legal pages), just at ~10x the size and with the added referral/cookie/DemoForm behavioral surface that no prior migration had to preserve.

## 5. Current section inventory (decomposition of the monolith)

Rendered order, from direct inspection of the JSX (`<section>` boundaries and inline comment banners):

| # | Section ID / comment | Purpose (as implemented) | CTA | Assets | MIGRATION DECISION |
|---|---|---|---|---|---|
| 0 | Nav/header (no `<section>`, top of render) | Logo, Platform/Solutions dropdowns, lang toggle, login links, demo CTA | `Demander une démo` | none | RECOMPOSE into `SiteHeader`/`V2Shell` |
| 1 | **HERO V2** | Headline, sub-copy, 2 CTAs, "building intelligence" visual panel with metric callouts | Primary: demo scroll. Secondary: "Watch demo" (video modal state, `showDemoVideo`) | `hero-building.webp` | RECOMPOSE — becomes Blueprint §3 Hero |
| 2 | **TRUST STRIP V2** | 4 compact proof points (Canada hosting, bilingual, etc.) in a thin strip | none | none (text/icon only) | RECOMPOSE — feeds Blueprint §15 Confiance, distributed not concentrated |
| 3 | **PROBLÈME — DOCUMENTÉ ≠ PRÊT** | Problem statement: plans exist but aren't operationally connected | contextual link | none confirmed in this pass | RECOMPOSE — maps to Blueprint §4 "La tension" |
| 4 | **CONTINUUM** (`id="continuum"`) | Renders the 9-step CONNAÎTRE→AMÉLIORER continuum | none | `continuum-coro.webp` | KEEP CONCEPT, RECOMPOSE VISUAL — this is the approved Blueprint §5 narrative spine, already present in legacy form |
| 5 | **INDICE CORO** (`id="indice-coro"`) | Resilience score/index explainer | link | none confirmed | MERGE into Blueprint §13 Résilience |
| 6 | **SENTINELLE** (`id="sentinelle"`) | Occupancy/registry narrative, links to `/sentinelle` and `/sentinelle-population` | 2 links | none confirmed (data-panel style) | RECOMPOSE — maps to Blueprint §9 |
| 7 | **EVACUATION** (`id="evacuation"`) | Evacuation/assembly-point flow ("PRESENCE → EVACUATION → ASSEMBLY → VERIFICATION") | none | `evacuation.webp` | MERGE into Sentinelle moment (§6/§7 overlap — same narrative beat) |
| 8 | **OPERATIONAL BRIDGE** | Short transition band (dark, `#2C3E50`) | none | none | REMOVE or fold into transition design (§10.4 Homepage transitions), redundant as standalone section |
| 9 | **MODULE INCIDENT** (`id="module-incident"`) | Incident coordination narrative, links to `/resilience-operationnelle` | 1 link | none confirmed | RECOMPOSE — maps to Blueprint §10 |
| 10 | **INTERVENTION SECOURS** | First-responder context, dark hero-style panel | none confirmed | `first-responders.webp` | MERGE into Incident moment (§9) — same narrative beat as module-incident |
| 11 | **EXERCICES + REX** | Exercise/lessons-learned narrative | link | `drill-exercise.webp` | RECOMPOSE — maps to Blueprint §12 |
| 12 | **PLATEFORME** (`id="plateforme"`) | Tabbed product-UI proof (dashboard/project/editor tabs via `activeProductTab`) | none | `platform-dashboard.webp`, `platform-client-portal.webp` | KEEP CONCEPT — real product-UI proof moment, RECOMPOSE presentation |
| 13 | **PRODUCT PROOF** | Second product-proof band, links to gestion-documentaire/gestion-de-projets/performance-objectifs/portail-client/resilience-operationnelle (5 links) | 5 links | `platform-documents.webp`, `platform-incident.webp`, `platform-sentinelle.webp` | MERGE with §12 PLATEFORME — clear duplication, two product-proof sections back to back |
| 14 | **DOCUMENTS** (`id="documents"`) | Document-compliance narrative, dynamic `href={`/documents/${...}`}` links | dynamic links | none confirmed | RECOMPOSE — maps to Blueprint §8 |
| 15 | **SOLUTIONS** (`id="solutions"`) | Sector/audience framing | none confirmed | `sector-commercial.webp`, `sector-industrial.webp` | REVIEW — overlaps with §16 ENVIRONMENTS, evaluate merge |
| 16 | **ENVIRONMENTS** (`id="environments"`) | Building-type/environment framing | none confirmed | shares assets with §15 | REVIEW — likely mergeable with SOLUTIONS |
| 17 | **PRICING** (`id="pricing"`) | Pricing teaser, links to `/pricing` and `/pricing#fondateur` | 2 links | none | KEEP AS LINK-OUT ONLY per §90 — do not duplicate the dedicated Pricing V2 page's content |
| 18 | **SECURITY** (`id="security"`) | Full security/trust content, **no link found to the dedicated `/security` V2 page** | none (anchor only) | none | REVIEW/FIX — this is content duplication against an existing approved V2 page (§95); MIG-08A should compress to a trust summary + explicit link to `/security`, not reproduce it |
| 19 | **DEMO** (`id="demo"`) | Embeds `<DemoForm lang={lang} />` | form submit | none | KEEP, RECOMPOSE — see §12 |
| — | Footer (legacy `Footer.tsx` via `LegacyChrome`, site-wide) | — | — | LEGACY | Retires automatically once `/` is V2-registered, per existing `isLegacyFooterVisible` mechanism |

19 major content sections plus nav/footer. No section disappears silently in this proposal — every legacy section maps to a decision above; several are recommended for merging (7→6, 10→9, 13→12, 15/16 review) which is exactly the "merge related legacy sections into stronger narrative moments" instruction of §32 of the directive.

## 6. Content preservation matrix (headline-level)

Full line-by-line copy inventory was not transcribed into this document (9,000+ lines of embedded FR/EN strings would make the gate document itself unreviewable) — instead, every current section is captured at decision-granularity in §5, and the claim-bearing statements are separately captured in §7's claim audit. This satisfies the directive's requirement that nothing disappear silently: the MIG-08A implementer must resolve every row in §5 to KEEP/RECOMPOSE/MERGE/REMOVE, and REMOVE is used exactly once (Operational Bridge transition band, itself content-free).

Content categories confirmed present and requiring preservation: headline + sub-headline (hero), problem statement, continuum labels (9 steps), Indice CORO description, Sentinelle/Evacuation/Population narrative, Incident narrative, Exercises/REX narrative, Documents narrative (PMU/PSI/PCA/PGC/PRA/PUE references — **must respect the CLAUDE.md-documented PGC/PRA/PUE-are-marketing-only-Phase-2 boundary**, verified in §8), Platform/Product-proof captions, Solutions/Environments sector framing, Pricing teaser copy, Security/trust statements, DemoForm field labels (already covered fully in §12), trust-strip proof points (Canada hosting, bilingual), footer-linked content (owned by the shared legacy `Footer.tsx`, not Homepage-specific — out of MIG-08 scope, belongs to MIG-09 per §119/§145/§146 boundary).

## 7. Claim audit

Cross-checked against `coro-backend/src/app.module.ts`'s actual registered modules and CLAUDE.md's documented module status.

| CLAIM AREA | HOMEPAGE TREATMENT (current) | REPOSITORY TRUTH | CLASSIFICATION |
|---|---|---|---|
| Sentinelle (occupancy, QR/PIN check-in, evacuation) | Presented as live capability | `PopulationModule`, `OccupancyModule`, `BuildingsModule` real; client-portal controller (~39 endpoints) confirms Sentinelle/panic/incident/REX/resilience/intelligence all real, per CLAUDE.md | PRODUCT-VERIFIED |
| Incident coordination / chronology | Presented as live capability | Confirmed real via `client-portal.controller.ts` per CLAUDE.md ("Module Incident ✅", "Boucle REX ✅") — no standalone `IncidentModule` in `app.module.ts`, it lives inside client-portal | PRODUCT-VERIFIED (verify exact Homepage wording doesn't overstate scope beyond what CLAUDE.md documents) |
| Exercices / REX | Presented as live | CLAUDE.md: "Boucle REX ✅ : formulaire post-incident (ISO 22301)" confirmed | PRODUCT-VERIFIED |
| Indice CORO / résilience score | Presented as live | CLAUDE.md: "Résilience opérationnelle / indice CORO ✅" confirmed | PRODUCT-VERIFIED |
| Documents PMU/PSI/PCA | Presented as live, configurable, exportable | CLAUDE.md: "100% fonctionnels (configurateur + export PDF)" | PRODUCT-VERIFIED |
| Documents PGC/PRA/PUE | **Must be verified in current Homepage copy for overclaim** | CLAUDE.md explicit: "pages marketing 'Phase 2' seulement, aucun configurateur applicatif" | **NEEDS-SOURCE / OVERCLAIM RISK** — MIG-08A must audit the exact Homepage sentence referencing these 3 documents and ensure it does not imply they are configurable/exportable today; this is the single highest-priority claim check for MIG-08A |
| CORO AI | Not found as a distinct Homepage section in the current 19-section inventory (no "AI" id/comment found) | No `AiModule`/AI-chat module in `app.module.ts` beyond the site's own "Sophie" marketing chatbot (site-vitrine only, per CLAUDE.md, not a CORO-platform AI feature) | ROADMAP / VISION — if MIG-08A introduces an AI moment (per directive §39), it must be explicitly labeled VISION, not built from a fabricated screenshot |
| CORO Ops (orchestration engine) | Not found as a distinct section | No `OpsModule` in backend | CONCEPT / FUTURE — do not present as available |
| CORO Network | Not found as a distinct section | No `NetworkModule`; multi-site exists only via `ClientPortalModule`'s portfolio view | CONCEPT / FUTURE for "Network" branding; portfolio/multi-site viewing itself is PRODUCT-VERIFIED (per CLAUDE.md "portefeuille mandats") |
| Building Bridge | Not found as a distinct Homepage section | No matching backend module found | CONCEPT / FUTURE |
| QR Intervention | Not found as a distinct Homepage section (Sentinelle's own kiosk QR is real, per CLAUDE.md "borne kiosque QR dynamique" — a different, narrower thing than a general "QR Intervention" module) | Only the Sentinelle kiosk QR is real | Existing kiosk QR = PRODUCT-VERIFIED; a broader "QR Intervention" concept = CONCEPT / FUTURE, do not conflate |
| CORO Campus | No trace anywhere in repository | Not found | CONCEPT / FUTURE — must not appear as a current capability |
| Hosting in Canada | Trust-strip claim | Documented in CLAUDE.md prod topology (DigitalOcean Toronto VPS) | REGULATORY/PRODUCT-VERIFIED |
| Bilingual FR/EN | Trust-strip claim | Confirmed site-wide throughout V2 migration work | PRODUCT-VERIFIED |
| MFA | Not found as a Homepage claim in the sections inspected | CLAUDE.md: "MFA (conseiller + client) + refresh tokens + trusted devices + magic links" — real | Available to cite if MIG-08A wants a trust-section fact; currently ROADMAP/unused, not an overclaim risk either way |

No fabricated statistics (customer counts, uptime %, ROI %) were found in the sections sampled; this should be explicitly re-verified against the full rendered copy during MIG-08A's own claim-review checkpoint (§138 of the directive), since this PRE pass did not machine-read all 9,032 lines of embedded strings verbatim.

## 8. Product maturity matrix

| CAPABILITY | STATUS | EVIDENCE |
|---|---|---|
| CORO Documents (PMU/PSI/PCA) | AVAILABLE | CLAUDE.md, `pca-configurator` active |
| CORO Documents (PGC/PRA/PUE) | PLANNED / PHASE 2 | CLAUDE.md explicit |
| CORO Projects | AVAILABLE | `ProjectsModule`, `ProjectFilesModule` |
| CORO Performance | AVAILABLE (capacity planning, health score) | CLAUDE.md |
| CORO Client (portfolio, bookings) | AVAILABLE | `ClientPortalModule`, `BookingsModule` |
| CORO Knowledge (procedures library) | PARTIAL | CLAUDE.md §6.6 "CRUD bibliothèque complet... actuellement partiel" |
| CORO AI (procedure generator) | AVAILABLE (narrow: "générateur de procédures IA") — **but not a general conversational AI product** | CLAUDE.md | 
| CORO Ops | CONCEPT / FUTURE | No backend module |
| CORO Incident | AVAILABLE | CLAUDE.md, client-portal controller |
| Sentinelle | AVAILABLE | CLAUDE.md, extensive feature list |
| Sentinelle Population | AVAILABLE | CLAUDE.md, dedicated V2 page already live |
| Building Bridge | CONCEPT / FUTURE | Roadmap item #2 in CLAUDE.md ("Intégration systèmes d'alarme physiques") — logiciel côté pont d'alarme existe (per memory: alarm-panel-bridge), mais matériel IoT physique pas construit |
| QR Intervention (general) | CONCEPT / FUTURE | Only the narrower Sentinelle kiosk QR is real |
| CORO Network | CONCEPT / FUTURE | No backend module |
| Audit / Indice CORO | AVAILABLE | CLAUDE.md |
| Exercises / simulations | AVAILABLE (mode exercice within Incident) | CLAUDE.md |
| REX / corrective actions | AVAILABLE | CLAUDE.md |
| Booking / Planner | AVAILABLE | `BookingsModule`, `PlanningModule` |
| Campus | UNKNOWN/CONCEPT | Zero repository trace |

MIG-08A must never visually present Ops, general QR Intervention, Network, Building Bridge (as a live integration), Campus, or PGC/PRA/PUE-as-configurable as available today.

## 9. Referral contract (critical — must survive byte-for-byte semantically)

Traced exactly from `app/HomePageClient.tsx` lines 26-28, 789-832, 850-885:

- **Cookie names**: `coro_referral_code`, `coro_referral_first_touch`.
- **Accepted format**: `?ref=CR-XXXXXX` where `XXXXXX` matches `/^CR-[A-HJ-NP-Z2-9]{6}$/` (Crockford-style base32 alphabet, excludes `I`, `O`, `0`, `1` confusables) — case-insensitive at parse time (`.toUpperCase()` applied before validation).
- **Validation**: regex test only; invalid/malformed `?ref=` values are silently ignored (no error shown, no cookie set).
- **First-touch preservation**: `getCookie(REFERRAL_COOKIE_CODE)` is checked before writing — **if a referral cookie already exists, it is never overwritten**, even by a new valid `?ref=` parameter. This is the "first-touch attribution" model and must not be changed to last-touch.
- **Cookie lifetime**: `Max-Age = 60 * 60 * 24 * 90` = exactly 90 days.
- **Cookie scope**: `Path=/`; `Domain=.getcoro.io` only when `window.location.hostname` is `getcoro.io` or ends with `.getcoro.io` (i.e. omitted on localhost/preview domains — correct, do not hardcode the domain); `Secure` only when `window.location.protocol === 'https:'`; `SameSite=Lax` always.
- **When captured**: client-side only, inside the single `useEffect` on mount, reading `window.location.search` via `URLSearchParams` — not server-side, not middleware.
- **When consumed**: `DemoForm.tsx`'s own `getCookie()` call at submit time, reading both `coro_referral_code` and `coro_referral_first_touch`, sent to Formspree as `referralCode`/`referralFirstTouchAt`/`referralSource` (`'LINK'` if a code exists, else `''`).
- **Query cleanup**: none — the `?ref=`/`?lang=` parameters are left in the URL, not stripped via `history.replaceState` or similar.
- **Backend involvement**: none directly from Homepage — Formspree is a third-party form endpoint; the referral code only reaches CORO's own backend if/when a human later reconciles a Formspree lead against `ReferralsModule` (out of Homepage's scope entirely).

**MIGRATION RULE reconfirmed**: this behavior must be preserved exactly — same cookie names, same 90-day duration, same first-touch-wins semantics, same format regex, same client-side capture point.

## 10. Cookie audit

Homepage-owned cookies are exactly the two referral cookies in §9. No consent-banner cookie, no analytics cookie, no session/auth cookie is set or read by `HomePageClient.tsx` or `DemoForm.tsx` — those (if they exist) belong to global/shared site infrastructure outside Homepage's scope and were not audited here (out of scope per the directive's own framing — Homepage "owns" only what it directly sets).

## 11. DemoForm contract (critical)

- **Location**: `app/DemoForm.tsx`, standalone client component (`'use client'`), imported once, embedded inline in the DEMO section (§5 row 19) — not a modal, not a separate route.
- **Fields**: `firstName`* , `lastName`*, `email`*, `organization`*, `phone` (optional), `buildingType` (optional select, 6 options + placeholder), `message` (optional textarea). 4 required fields.
- **Language**: full FR/EN dictionary inline in the component (`t = {fr:{...}, en:{...}}[lang]`), driven by the `lang` prop passed down from `HomePageClient`'s own state — no independent language detection.
- **Submission**: `POST https://formspree.io/f/xnpadzyq`, JSON body, includes all form fields plus `referralCode`, `referralFirstTouchAt`, `referralSource`, and a `_subject` line built from `form.organization`.
- **States**: `idle` / `sending` (button disabled + relabeled) / `success` (form replaced by a confirmation message with `role="status"`) / `error` (inline `role="alert"` banner, form remains editable, user can retry).
- **Anti-spam**: none visible (no honeypot field, no CAPTCHA, no rate limiting client-side) — Formspree itself may apply server-side spam filtering, not auditable from this repository.
- **Accessibility**: labels are correctly associated via `htmlFor`/`useId()`-generated ids; required fields marked with a visual `*` only (no `aria-required` or `required` announced beyond the native HTML `required` attribute, which is itself present and functional); success state uses `role="status"`, error uses `role="alert"` — both reasonable; no visible focus-ring customization found (relies on browser default) — SAFE TO FIX DURING MIGRATION, not a blocker; privacy-policy link present and correctly localized (`/privacy` or `/privacy?lang=en`).
- **Mobile**: uses a CSS class-based 2-column row layout (`coro-demo-form-row`) whose responsive collapse behavior lives in the `<style jsx>` block in `HomePageClient.tsx` (§5 "RESPONSIVE" comment banner) — must be re-verified once decoupled into V2 CSS.

**Recommendation**: REUSE UNCHANGED. `DemoForm.tsx` has zero dependency on `HomePageClient.tsx` internals beyond the `lang` prop and is already a clean, small, self-contained client component — exactly the "client island" architecture the directive wants (§12, §57, §127). No redesign needed for MIG-08A; at most, its inline `style={{}}` could later move to CSS modules as a non-blocking polish item, but this is explicitly out of scope for PRE and not required for MIG-08A either.

## 12. CTA inventory

| LABEL (FR) | DESTINATION | SECTION | TYPE | DECISION |
|---|---|---|---|---|
| Demander une démo (nav) | `#demo` (scroll) | Nav | Primary | KEEP |
| Hero primary CTA | `#demo` (scroll, inferred from hero-to-demo pattern) | Hero | Primary | KEEP |
| "Watch demo" | opens `showDemoVideo` state (video modal) | Hero | Secondary | REVIEW — confirm a real demo video exists; if not, RECOMPOSE per Blueprint §3's "Explorer l'écosystème" secondary CTA instead |
| Sentinelle section links (×2) | `/sentinelle`, `/sentinelle-population` | Sentinelle | Internal | KEEP — both valid V2 routes |
| Incident section link | `/resilience-operationnelle` | Module Incident | Internal | KEEP — valid V2 route |
| Product-proof links (×5) | `/gestion-documentaire`, `/gestion-de-projets`, `/performance-objectifs`, `/portail-client`, `/resilience-operationnelle` | Product Proof | Internal | KEEP — all valid V2 routes; redundant with §5 row 13's proposed merge into Plateforme |
| Documents section links | `/documents/{slug}` (dynamic) | Documents | Internal | KEEP — must verify each slug still resolves (it does, all 6 are in `migratedV2Routes`) |
| Pricing links (×2) | `/pricing`, `/pricing#fondateur` | Pricing | Internal | KEEP — valid V2 route + anchor |
| Demo form submit | Formspree | Demo | Form | KEEP (§11) |

No dead/broken internal links found in the sampled `href={...}` set (§3's link audit). No link to `/blog`, `/guides`, `/about`, `/contact`, or `/security` was found anywhere in `HomePageClient.tsx` — this is a **discovery gap** Homepage should close per Blueprint §6 (Documents CTA), §88-89 (editorial discovery), and the missing Security link flagged in §5 row 18.

## 13. Internal link audit

All found `href="..."` (static) and `href={...}` (dynamic) targets cross-checked against `migratedV2Routes`/route existence:

| TARGET | VALID? |
|---|---|
| `/sentinelle-population(?lang=en)` | VALID (V2) |
| `/pricing(?lang=en)(#fondateur)` | VALID (V2) |
| `/sentinelle(?lang=en)` | VALID (V2) |
| `/resilience-operationnelle(?lang=en)` | VALID (V2) |
| `/gestion-documentaire(?lang=en)` | VALID (V2) |
| `/gestion-de-projets(?lang=en)` | VALID (V2) |
| `/performance-objectifs(?lang=en)` | VALID (V2) |
| `/portail-client(?lang=en)` | VALID (V2) |
| `/documents/{dynamic-slug}` | VALID (all 6 PMU/PSI/PCA/PGC/PRA/PUE routes exist and are V2) |
| `https://app.getcoro.io/login`, `https://client.getcoro.io/login` | VALID (external, product app login — unaffected by Website migration) |
| In-page anchors `#continuum`, `#demo`, `#documents`, `#environments`, `#module-incident`, `#security`, `#sentinelle`, `#solutions` | VALID (all correspond to real `id="..."` attributes found in §5's section map) |

No links found to: `/blog`, `/guides`, `/about`, `/contact`, `/security` (page), `/privacy` or `/terms` (except indirectly via DemoForm's own privacy link) — classified **FUTURE** discovery opportunities, not broken links (nothing currently points there and is wrong; nothing currently points there at all). MIG-08A should decide whether the Homepage becomes a stronger navigation hub into these V2 destinations, consistent with the "Homepage Role" statement in §29 below.

## 14. FR/EN contract

Locale selection: identical mechanism to every other Website V2 page — `?lang=en` query param, read client-side via `URLSearchParams` in the same effect that handles referral capture (§9), defaulting to `'fr'`. All 19 sections use the inline `TRANSLATIONS`/`t.*` dictionary pattern (same file, both languages present for every section sampled — no section-level language gap found in this pass, though full line-by-line EN-completeness was not exhaustively verified across all 9,032 lines). `generateMetadata` in `app/page.tsx` already has fully separate, real (not machine-translated-looking) FR and EN metadata blocks (§16). No cookie/localStorage persistence of language choice — every page load re-reads the query param, consistent with the rest of the site's established `?lang=en` policy (still an explicitly OPEN decision site-wide per MASTER-INDEX §23 "Stratégie locale à long terme").

## 15. SEO audit

From `app/page.tsx`:

| FIELD | STATUS | NOTE |
|---|---|---|
| Title (FR/EN) | VALID, distinct real copy | "CORO \| Plateforme de résilience opérationnelle et mesures d'urgence" / English equivalent |
| Description (FR/EN) | VALID, distinct real copy | |
| Canonical | VALID | Query-free root URL, `?lang=en` variant for EN |
| Alternates (`fr-CA`/`en-CA`/`x-default`) | VALID | `x-default` → FR, consistent with site-wide pattern |
| OpenGraph | VALID | `og-coro.jpg`, 1728×910, real alt text |
| Twitter | VALID | `summary_large_image`, same image |
| Robots | VALID | `index:true, follow:true`, googleBot directives present |
| `WebSite` JSON-LD | VALID, minimal (`name`, `alternateName`, `url`, `inLanguage`) | KEEP |
| `Organization` JSON-LD | VALID (`name`, `alternateName`, `url`, `logo` as `ImageObject`, `description`) | KEEP |
| `SoftwareApplication`/`Product`/`Offer`/`FAQ`/`BreadcrumbList` schema | **NOT PRESENT** | N/A today — MIG-08A may consider adding `SoftwareApplication` if truthful and non-duplicative with `/pricing`'s own schema (not audited here, out of PRE scope); no action required, not a defect |

No orphaned/duplicated schema found. SEO foundation is solid and mostly reusable as-is; MIG-08A's job is primarily visual/structural, not an SEO rewrite.

## 16. Asset inventory (deferred since MIG-06-PRE — now complete)

12 of 16 files in `public/images/homepage/` are referenced by `HomePageClient.tsx`; 4 are unreferenced (dead weight, safe to remove during MIG-08A, not before, in case another branch/PR relies on them):

| FILE | SECTION | REFERENCED? | MIGRATION DECISION |
|---|---|---|---|
| `hero-building.webp` | Hero | YES | KEEP — architectural hero image, matches Blueprint §3's "bâtiment contemporain" requirement |
| `continuum-coro.webp` | Continuum | YES | REVIEW — evaluate against Blueprint §5's own visual direction (progression, not necessarily a static photo) |
| `evacuation.webp` | Evacuation | YES | KEEP — merges into Sentinelle moment per §5 row 7 |
| `first-responders.webp` | Intervention Secours | YES | KEEP — merges into Incident moment per §5 row 10 |
| `drill-exercise.webp` | Exercices + REX | YES | KEEP |
| `platform-dashboard.webp` | Plateforme | YES | KEEP — real product UI |
| `platform-client-portal.webp` | Plateforme | YES | KEEP — real product UI |
| `platform-documents.webp` | Product Proof | YES | KEEP — real product UI |
| `platform-incident.webp` | Product Proof | YES | KEEP — real product UI |
| `platform-sentinelle.webp` | Product Proof | YES | KEEP — real product UI |
| `sector-commercial.webp` | Solutions | YES | KEEP, pending §5 rows 15/16 merge decision |
| `sector-industrial.webp` | Environments | YES | KEEP, pending §5 rows 15/16 merge decision |
| `incident-response.webp` | none found | NO | REMOVE (unused) or REVIEW if intended for a section not fully traced in this pass |
| `problem-documents.webp` | none found | NO | REMOVE or REVIEW — plausible candidate for §5 row 3 "Problème" section if that section is image-light today |
| `problem-people.webp` | none found | NO | REMOVE or REVIEW — same as above |
| `sentinel-occupancy.webp` | none found | NO | REMOVE or REVIEW — plausible candidate for a stronger Sentinelle visual (§5 row 6) |

Per-asset format/dimensions/FR-EN-embedded-text/alt fields were not individually measured pixel-by-pixel in this pass (would require opening each binary); the 4 unreferenced files are flagged as the priority item for MIG-08A's own asset review checkpoint (§140 of the directive) — they may in fact be exactly the missing visuals for the "Problème" and "Sentinelle" sections, which currently have no confirmed image reference, and should be checked before any new photography is commissioned.

## 17. Existing photography audit

The 12 referenced assets fall into two families: (a) real product-UI screenshots (`platform-*.webp`, 5 files) and (b) editorial/architectural photography (`hero-building`, `evacuation`, `first-responders`, `drill-exercise`, `continuum-coro`, `sector-*`, 7 files). Without opening each binary for resolution/crop-flexibility inspection, the product-UI screenshots are the higher-risk category per §20 (must be verified current, not outdated) — this is a MIG-08A action item, not resolved here. The editorial photography set is directionally consistent with Blueprint §21's "architecture réelle... personnes en contexte crédible" language and with §62 of the PRE directive's "REALISTIC / OPERATIONAL / ARCHITECTURAL" guidance — worth preserving rather than replacing wholesale, pending the individual quality check MIG-08A must perform before final sign-off.

## 18. Product UI screenshots

5 files (`platform-dashboard`, `platform-client-portal`, `platform-documents`, `platform-incident`, `platform-sentinelle`) are presented as real product UI across the Plateforme and Product-Proof sections. Classification (REAL CURRENT / OUTDATED / MOCKUP) requires visual inspection MIG-08A must perform directly against the current live product UI — not resolvable from a code-only PRE pass. Flagged explicitly as a **MIG-08A pre-registration checkpoint item** (§140/§85/§86 of the directive): verify each is still an accurate representation of the shipped advisor/client-portal UI, and screen for any real client data leaking into any screenshot per §86.

## 19. New visual needs

Two candidate gaps identified from the section/asset cross-reference in §16:
1. **Problem statement section (§5 row 3)** has no confirmed asset — the 3 unreferenced "problem-*" files may already be intended for it; verify before commissioning anything new.
2. **AI/Ops/Network "vision" moments**, if MIG-08A chooses to include them per Blueprint-adjacent directive sections §39/§40/§45, will need entirely new editorial illustration (not real screenshots, since nothing real exists yet) — explicitly marked VISION VISUALIZATION per §81 of the directive, never presented as a live product screen.

No other new-visual gaps identified; the existing 12-asset set is directionally sufficient for the 8 non-merged major moments MIG-08A is likely to ship (see §29 storyboard below).

## 20. Current visual audit (desktop, structural/code-level — no rendered viewport used in this PRE pass)

Candid assessment from reading the actual layout code:

- **Strength**: real product-UI proof exists (rare and valuable — most SaaS homepages fake this); the continuum concept is already present in legacy form, not something to invent from scratch; FR/EN parity appears structurally sound; DemoForm is clean and already reusable.
- **Weakness**: 19 sections is too many distinct "moments" for one coherent story (directive §32/§101 flags this directly) — at least 4 clear merge candidates exist (§5 rows 7→6, 10→9, 13→12, 15/16 review) bringing a realistic target to ~12-14 major sections plus nav/footer.
- **Weakness**: two consecutive product-proof sections (Plateforme + Product Proof) is close to the literal "card wall" anti-pattern the directive rejects in §102 — needs consolidation into one strong moment, not two medium ones.
- **Weakness**: the Security section duplicates the dedicated `/security` V2 page's content with no link out — a maintenance/drift risk as well as a design bloat risk (§53/§91 of the directive both call for a compact summary + link, not a duplicate).
- **Weakness**: zero links to `/blog` or `/guides` from a Homepage that otherwise routes competently into every product page — a real discovery gap now that both are fully migrated, real, and worth surfacing (§88).
- **Unknown/needs-verification**: whether the current desktop composition already uses the ~1100-1200px canvas well or repeats the "narrow column, wasted right margin" mistake flagged repeatedly in prior migration gates (Guides, Blog article pre-polish) — this requires an actual rendered viewport, which this PRE pass explicitly did not perform (see §21 below); MIG-08A's own pre-implementation visual pass must check this specifically on the *legacy* page as a baseline comparison point.

## 21. Website V2 migration lessons applied to Homepage

- PMU-family early composition mistake (too much unused canvas) → Homepage must exploit ~1100-1200px intentionally (§26 below), same lesson already learned and must not be relearned.
- PSI needed a stronger identity/hierarchy pass after its first version → Homepage's "bouquet final" requirement (directive §23) makes this a first-pass requirement, not a second-pass correction.
- PCA's narrow-content-plus-empty-canvas was explicitly rejected → same discipline applies here, at larger scale.
- Blog index taught that editorial hierarchy (one dominant moment + supporting structure, not uniform cards) scales better than a card wall, and that pagination/discovery mechanics can be added cleanly once the core hierarchy is right — Homepage's ecosystem/module-navigation sections (§5 rows 12-16) should borrow this "one dominant + supporting" logic rather than defaulting to equal-weight cards.
- Blog article taught the **separate canvas vs. reading-measure** discipline (~72rem outer canvas, ~46rem prose column) — directly reusable for Homepage's few genuinely text-heavy sections (Tension, Trust) even though most Homepage sections are visual/compositional rather than long-form prose.
- Legal pages taught that restraint is sometimes correct — not every page needs a "moment"; Homepage's calmer sections (Confiance/Trust, Pricing teaser) should intentionally be quiet per directive §65, not forced into visual drama.
- Cards are useful only when they carry real meaning (a lesson already encoded in Component Library governance) — Homepage's ecosystem section must not default to "N equal cards" (directive §24/§49/§102) merely because CORO has many named modules.
- Each page/section benefits from its own visual signature, but visual character must never come from invented factual content — this is the single most important carry-over rule for Homepage given how much unverified/aspirational language legacy marketing copy tends to accumulate (§7/§8 above).

## 22. Homepage role (governance statement)

"The Homepage explains why CORO exists, demonstrates how the ecosystem connects, proves what is real today, communicates the larger vision honestly and separately from current capability, and routes visitors toward the appropriate deeper V2 page — including, going forward, the Blog and Guides, which the Homepage currently does not link to at all." This refines the directive's suggested statement (§96) by adding the concrete discovery-gap finding from §13.

## 23. Positioning

Primary positioning (one sentence, VISION/POSITIONING language, not a literal technical claim): "CORO connects plans, buildings, people and operations into one Canadian resilience environment — not a document generator, not an occupancy register, not an incident manager alone, but the system that links all of it." The `HOMEPAGE-V2-BLUEPRINT.md`'s own §1 mission statement already expresses this well and is APPROVED — MIG-08A should treat it as the working positioning line, refined only for final copywriting.

## 24. Audience

**PRIMARY**: facility/property managers and emergency/security managers responsible for a commercial or institutional building's compliance and operational readiness (matches the DemoForm's own `buildingType` options: office tower, commercial building, industrial site, healthcare facility, educational institution). **SECONDARY**: multi-site/portfolio directors (Client/Network moment), consultants/security-fire-safety professionals (Documents moment). The hero should speak to the primary audience without trying to greet every audience equally, per directive §55.

## 25. Narrative spine

The already-APPROVED `01-strategy/HOMEPAGE-V2-BLUEPRINT.md` defines the canonical continuum (CONNAÎTRE → ANTICIPER → DÉTECTER → DÉCIDER → AGIR → PROTÉGER → PROUVER → APPRENDRE → AMÉLIORER) as the narrative spine, expressed through 4 acts (Comprendre / Voir / Agir / Améliorer) across 14 blueprint sections. This PRE audit confirms the spine remains valid, requires no redesign, and should be treated as the binding narrative architecture for MIG-08A, adjusted only for the section-merge findings in §5.

## 26. Proposed storyboard

The Blueprint's 14 sections map closely onto the legacy 19-section inventory in §5, with the merges identified there applied. Recommended target: **13 major sections** (down from 19), which resolves the card-wall/section-overload weaknesses in §20 while preserving every content decision from §5-6:

| # | NAME (from Blueprint) | OBJECTIVE | CONTENT SOURCE | CURRENT/VISION | MOBILE BEHAVIOR |
|---|---|---|---|---|---|
| 1 | Hero architectural | Immediate CORO signature | Legacy Hero (§5 row 1), reworked | Current capability framing, no overclaim | Text-first, building image recropped, 1-2 callouts max (Blueprint §22) |
| 2 | La tension | Why documents alone aren't enough | Legacy "Problème" (§5 row 3) | Positioning | Near-static, no layout risk |
| 3 | Le continuum | Whole-ecosystem logic | Legacy Continuum (§5 row 4), kept | Positioning/vision framing | Vertical sequence (Blueprint §22) |
| 4 | L'écosystème | Reveal breadth without a card wall | New composition — synthesizes Solutions/Environments (§5 rows 15-16) at a higher level | Mixed current/vision, clearly separated | Stacked families, not 15 cards |
| 5 | Du bâtiment à la décision | Signature visual moment | New/recomposed — could reuse `hero-building.webp` differently or a new blueprint-style diagram (§19) | Current capability, plausible data only | Recrop + sequential callouts |
| 6 | CORO Documents | Compliance-as-capability | Legacy Documents (§5 row 14) | PMU/PSI/PCA = current; PGC/PRA/PUE = explicitly Phase 2, not shown as live | Standard responsive card/panel |
| 7 | CORO Sentinelle (+ Evacuation) | Building-to-human moment | Legacy Sentinelle + Evacuation merged (§5 rows 6-7) | Current | Timeline/flow collapses vertically |
| 8 | CORO Incident (+ Intervention Secours) | Operational coordination | Legacy Module Incident + Intervention Secours merged (§5 rows 9-10) | Current | Vertical timeline (Blueprint §22) |
| 9 | Exercices et REX | Loop-closing, learning | Legacy Exercices+REX (§5 row 11) | Current | Standard stack |
| 10 | Résilience (+ Indice CORO) | Measurement/improvement | Legacy Indice CORO merged here (§5 row 5) | Current | Calm, low layout risk |
| 11 | Plateforme (+ Product Proof merged) | Product-UI proof, once not twice | Legacy Plateforme + Product Proof merged (§5 rows 12-13) | Current — real screenshots only, verified per §18 | Tabs collapse to accordion/stack |
| 12 | Confiance | Trust/security summary + link to `/security` | Legacy Security compressed, trust-strip facts folded in (§5 rows 2, 18) | Current, verified facts only, no duplication of `/security` | Simple stack |
| 13 | CTA final | Convert | Legacy Demo section (§5 row 19), DemoForm reused unchanged | — | DemoForm's existing responsive behavior (§11) |

Pricing (§5 row 17) becomes a compact teaser embedded near Confiance or its own thin band linking to `/pricing`, per directive §90 — not a numbered major section, to avoid duplicating the dedicated Pricing V2 page. Client/Network (Blueprint §14) and Population (Blueprint §11) are folded contextually into Sentinelle/Documents/Ecosystem rather than becoming two additional standalone numbered sections, given §46's guidance that Sentinelle Population shouldn't dominate the general narrative — a smaller mention plus its existing dedicated link (§13) is sufficient.

## 27. Opening sequence

Sections 1-3 (Hero → Tension → Continuum) directly answer the directive's required 4 questions (§34): What is CORO? (Hero) What problem does it solve? (Tension) Why is the integrated model different? (Continuum) What can an organization do with it? (transition into Écosystème, section 4). This matches the already-APPROVED Blueprint's own Act 1 exactly — no deviation recommended.

## 28. Mid-page peak / final visual peak

**Mid-page peak** (directive §105): section 5, "Du bâtiment à la décision" — matches the Blueprint's own explicit instruction (§7: "cette section doit pouvoir devenir une référence visuelle majeure de la marque"). **Final visual peak** (directive §106): section 10/11 combined (Résilience + Plateforme), closing the loop before Confiance/CTA — not a hero duplicate, consistent with Blueprint §13's "beaucoup d'espace" calm-but-conclusive framing.

## 29. Section identity / rhythm map

Using the Blueprint's own §20 palette assignments (already APPROVED, not re-litigated here): Hero = marine/architecture; Tension = white; Continuum = light/transition; Écosystème = light/structured; Bâtiment-décision = navy/technical or light (Design Lab decides); Documents = light; Sentinelle = mixed light/dark; Incident = dark; Exercices = light/human; Résilience = light premium + navy; Confiance = light; CTA final = navy. This produces the required non-mechanical dark/light alternation (directive §66) with dark sections corresponding to genuine narrative intensity (Incident, CTA-adjacent bâtiment-décision) rather than an every-other-section pattern.

## 30. Current-vs-vision language system

Recommend a restrained textual pattern only where genuinely needed (not a badge on every section): a single small "Vision CORO" label reserved exclusively for content classified VISION/CONCEPT/FUTURE in §8 (e.g., if MIG-08A includes an Ops/Network/AI-as-orchestration moment at all). Sections describing AVAILABLE capability need no marker — the absence of a marker is itself the "available" signal. This avoids turning the page into a roadmap dashboard (directive §51's own explicit warning) while still meeting the discipline requirement.

## 31. Proof / credibility

Real proof sources confirmed available: actual product UI screenshots (pending §18's currency check), Canada hosting fact, bilingual fact, real document types (PMU/PSI/PCA), real Indice CORO mechanism, real Sentinelle/Incident/REX workflows. **No customer logos, testimonials, or usage statistics were found anywhere in the current Homepage** — per directive §54, do not fabricate any; if none become available before MIG-08A ships, credibility must rest entirely on product-truth proof (screenshots, real workflows, verified facts), which is sufficient given the volume of real capability already documented.

## 32. Trust/security summary

Recommend 3-4 compact verified facts (Canada hosting, PIPEDA/Law 25 awareness if legally reviewed — flagged REVIEW per MASTER-INDEX §23's own open item, MFA if the copy decision confirms it's ready to cite) + a clear link to `/security` for full detail — replacing the current full-duplicate Security section (§5 row 18, §20).

## 33. Conversion strategy

**PRIMARY CTA**: "Demander une démonstration" → embedded DemoForm (unchanged). **SECONDARY CTA**: "Explorer l'écosystème"/"Découvrir la plateforme" → scroll or route into the écosystème section, replacing the current "Watch demo" video CTA unless a real demo video is confirmed to exist (§12 REVIEW item). **MID-PAGE**: contextual per-section links only (already present pattern, §12-13), not repeated demo CTAs. **FINAL CTA**: DemoForm again at the natural end of the page — the existing architecture already does this correctly (one embedded form, not a duplicated hero CTA).

## 34. DemoForm placement

Recommend keeping DemoForm embedded near the end of the page (current placement, §5 row 19) rather than moving to a modal — this preserves existing behavior exactly (directive §57's stated preference) and avoids introducing new client-side modal-management complexity with no proven need.

## 35. Motion audit

Current: CSS-only fade-in-up with staggered delays on the hero, no JS animation, no scroll-triggered reveal, no carousel/video-autoplay. **KEEP** this restrained baseline. **Future motion direction** (not implemented): the continuum (§26 row 3) and bâtiment-décision (§26 row 5) sections are the two best candidates for restrained scroll-tied motion per Blueprint §5/§25, provided `prefers-reduced-motion` is respected and the page remains fully understandable statically (directive §131) — this is a MIG-08A implementation decision, not resolved here.

## 36. 1200px canvas / mobile / accessibility architecture

**Canvas**: Homepage should generally use the ~1100-1200px V2 content canvas already established site-wide, distinguishing composition width from reading width exactly as Blog article migration did (§21 above) — this is the single most load-bearing lesson carried into MIG-08A. **Mobile**: every one of the 13 proposed sections has an explicit mobile behavior noted in §26's table, sourced directly from the already-APPROVED Blueprint §22. **Accessibility**: current Homepage has no confirmed accessibility debt beyond what's already flagged in §11 (DemoForm focus-ring, `aria-required`) — MIG-08A must still confirm one `<h1>`, logical heading order across 13 sections (currently unverified whether the legacy page has heading-level discipline; likely not, given the file's age), reduced-motion support for any new motion, and `alt=""` on decorative imagery vs. real `alt` text on informative imagery (not yet audited per-image in this pass).

## 37. Performance / server-client architecture

**Target architecture** (directive §73-74): `app/page.tsx` stays a server component (already true); the new Homepage body should be composed of server-rendered section components by default, with exactly two client islands: (1) a small `HomeReferralCapture` component owning only `getCookie`/`setReferralCookie`/the referral-parsing effect (lifted verbatim from §9, no behavior change), and (2) `DemoForm` (already a clean client component, §11, reused as-is). The language-toggle/`scrolled`/menu-open UI state can either live in a small client `SiteHeader`-equivalent island or be reconsidered against the already-existing V2 header pattern used by every other migrated page — MIG-08A should check whether Homepage can adopt the same shared nav mechanism the rest of V2 uses rather than reinventing its own. This eliminates the current single 9,032-line client component entirely without losing any of the audited behavior.

**Performance budget**: no autoplay video by default (the current "Watch demo" is a modal-on-click, not autoplay — preserve that gating); reserve image dimensions to avoid layout shift; lazy-load below-the-fold imagery (currently: unknown whether any `loading="lazy"` is applied — not confirmed in this pass, flag as MIG-08A verification item); avoid loading all 5 product-UI screenshots eagerly if the Plateforme/Product-Proof merge (§26 row 11) reduces the shown set.

## 38. Component architecture (proposed, not created)

Conceptual shape, consistent with repository conventions already used for Blog (`lib/site/*` for pure helpers, `page.module.css` for local styling, small local components for local-only composition):

```
app/page.tsx                          (unchanged: metadata + JSON-LD + renders HomeClient tree)
app/home/
  page.module.css                     (or per-section modules if a section proves large enough)
  components/
    HomeHero.tsx
    HomeTension.tsx
    HomeContinuum.tsx
    HomeEcosystem.tsx
    HomeBuildingDecision.tsx
    HomeDocuments.tsx
    HomeSentinelle.tsx
    HomeIncident.tsx
    HomeExercises.tsx
    HomeResilience.tsx
    HomePlatformProof.tsx
    HomeTrust.tsx
    HomeFinalCta.tsx
  client/
    ReferralCapture.tsx                (lifted from §9/§37, narrow responsibility only)
  content.ts                          (typed FR/EN content object, see §39)
```

13 named section components matching §26's storyboard, avoiding both the 9,000-line-monolith extreme and an over-fragmented 50-tiny-component extreme. `DemoForm.tsx` stays where it is (`app/DemoForm.tsx`), reused unchanged, imported by `HomeFinalCta.tsx`.

## 39. Content architecture

Recommend a single typed `content.ts` (or `content.fr.ts`/`content.en.ts` pair) module exporting the FR/EN copy object, replacing the current inline `TRANSLATIONS` dictionary buried in the 9,032-line file — this directly serves the FR/EN-parity and claim-traceability requirements (directive §79-80) by making every string a reviewable, diffable unit separate from layout code, and is consistent with no other V2 page needing a bespoke pattern (no prior migration needed this because no prior page had Homepage's content volume).

## 40. Baseline / test strategy

**Baseline fixtures** (not created during PRE, per directive §114): `homepage-referral-baseline.json` (cookie names/format/duration/domain-scoping rules from §9, as a deterministic contract, not live cookie values), `homepage-links-baseline.json` (the validated internal link set from §13), `homepage-sections-baseline.json` (the 19→13 section inventory decision matrix from §5/§26, so MIG-08A can prove no content was silently dropped). **Test strategy** (§116 of the directive): route/registry chronology tests (root added to `migratedV2Routes` last, mirroring every prior MIG's own protocol), referral capture tests per the exact matrix in directive §112 (valid/invalid `?ref=`, cookie creation, 90-day lifetime, first-touch-wins, `?lang=en` interaction, DemoForm payload propagation), DemoForm tests per directive §113 (FR/EN render, required-field validation, submission payload shape, loading/success/error states, referral propagation — without hitting the real Formspree endpoint), one-`<h1>`/one-`<main>`/no-duplicate-footer structural tests, metadata/canonical/alternates/JSON-LD tests (extending the already-working pattern from `app/page.tsx`), and a section-inventory test asserting all 13 proposed sections render.

## 41. Root-route registry audit (critical)

Confirmed from direct code reading of `lib/site/v2-migration.ts` (§2 above): `normalizePath('/')` returns `'/'` (the length-1 branch skips trailing-slash stripping entirely), and `migratedV2Routes.includes(path)` is exact-string equality — adding `'/'` to the array will match **only** the literal root pathname, never any other route, because `Array.includes` performs no prefix logic. No special-case risk exists. `isLegacyFooterVisible('/')` will correctly flip to `false` once `/` is added, and no other pathname's classification changes as a side effect. This is safe by construction, already verified, not merely assumed.

## 42. Legacy infrastructure boundary

Once `/` is registered, no existing *implemented* public route remains legacy — but `Footer.tsx` (the shared legacy footer component) and `LegacyChrome.tsx`'s `isLegacyFooterVisible` mechanism must **not** be deleted during MIG-08A. Per directive §119/§145, this retirement is explicitly MIG-09's job (global crawl, redirect review, dead-component removal, final regression) — MIG-08A's scope ends at "Homepage is V2 and registered," not "legacy infrastructure is gone."

## 43. Risk matrix

| RISK | SEVERITY | EVIDENCE | CONTROL | PHASE TO VERIFY |
|---|---|---|---|---|
| Referral attribution loss | HIGH | §9 exact contract documented | Baseline fixture + deterministic tests (§40) | MIG-08A pre-registry |
| DemoForm regression | HIGH | §11 | Reuse unchanged, no rewrite | MIG-08A pre-registry |
| PGC/PRA/PUE overclaim in rendered copy | HIGH | §7 flagged explicitly | Claim-review checkpoint before registration | MIG-08A pre-registry |
| Fake/outdated product screenshots | MEDIUM | §18 unresolved without live inspection | Screenshot currency check | MIG-08A pre-registry |
| FR/EN drift | MEDIUM | §14, not exhaustively verified line-by-line | Content module + parity table (§39) | MIG-08A pre-registry |
| SEO regression | LOW | §15 — solid foundation, mostly reusable | Preserve `generateMetadata`/JSON-LD logic near-verbatim | MIG-08A pre-registry |
| Security-section content duplication | MEDIUM (design/maintenance debt, not a blocker) | §5 row 18, §20, §32 | Compress + link to `/security` | MIG-08A implementation |
| Root registry bug | LOW (verified safe) | §41 — exact-match confirmed safe | N/A, already controlled | MIG-08A registry step |
| Mobile composition failure | MEDIUM | Unverified — no rendered viewport used in this PRE pass | Human mobile QA mandatory (directive §108/§142) | MIG-08A pre-registry |
| Performance regression from 9,032→13-component split done poorly | LOW-MEDIUM | §37 architecture defined | Server-component-by-default discipline | MIG-08A pre-registry |
| Cookie/domain-scoping regression | MEDIUM | §9 exact scoping logic documented | Preserve exact `isCoroDomain`/`Secure`/`SameSite` logic | MIG-08A pre-registry |
| Accessibility regression (heading order, one H1) | MEDIUM | §36 — current heading discipline unverified | Explicit accessibility pass | MIG-08A pre-registry |

## 44. Blockers

| ID | TYPE | DESCRIPTION | AFFECTS | RESOLUTION REQUIRED BEFORE |
|---|---|---|---|---|
| none | — | No MIGRATION-BLOCKER identified — every audited contract (referral, DemoForm, FR/EN, SEO, root-registry safety) is fully understood and preservable | — | — |

**NON-BLOCKING DEBT / REVIEW items** (must be resolved during MIG-08A, not before it can begin):
- R-01: Verify exact PGC/PRA/PUE Homepage copy does not overclaim configurator availability (§7).
- R-02: Verify all 5 product-UI screenshots are current, not outdated, contain no real client data (§18/§86).
- R-03: Resolve the 4 unreferenced `public/images/homepage/*.webp` assets — reuse or remove (§16).
- R-04: Confirm whether a real "Watch demo" video exists before deciding its CTA fate (§12/§33).
- R-05: Legal/compliance REVIEW items already open site-wide in MASTER-INDEX §23 (hosting/pricing/referral-count/regulatory claims, legal identity/copyright wording) apply equally to Homepage and are not newly introduced here.
- R-06: Full line-by-line FR/EN parity was not exhaustively verified across all 9,032 lines in this pass — MIG-08A's content-module extraction (§39) should surface any gap mechanically as it migrates each section.

None of these prevent MIG-08A from beginning; all are implementation-time verification/decision items, consistent with the directive's own distinction between a MIGRATION-BLOCKER and a REVIEW item.

## 45. MIG-08A implementation contract

- **IN SCOPE**: full Homepage reshell (`app/page.tsx` metadata/JSON-LD logic preserved near-verbatim; new `app/home/` component tree per §38; new `app/home/content.ts` per §39); referral-capture logic lifted into a narrow client island, behaviorally unchanged (§9/§37); DemoForm reused unchanged (§11); root-route registration in `lib/site/v2-migration.ts` as the **last** step (§41), following the same pre-registry → QA → registry → post-registry protocol used by every prior MIG.
- **OUT OF SCOPE**: any legacy-infrastructure deletion (`Footer.tsx`, `LegacyChrome.tsx` mechanism) — MIG-09 (§42); backend changes; any change to `/pricing` or `/security`'s own dedicated pages (Homepage only summarizes/links); customer testimonials/logos unless genuinely sourced and approved (§31); any new named module (Ops/Network/Campus/QR Intervention/Building Bridge) presented as available today (§8).
- **FILES THAT MUST NOT CHANGE**: `coro-backend/**`; any file under an already-migrated V2 route; `app/DemoForm.tsx` (behavior — file may move/be re-exported if the directory structure changes, but logic must stay byte-equivalent).
- **BASELINES REQUIRED**: `homepage-referral-baseline.json`, `homepage-links-baseline.json`, `homepage-sections-baseline.json` (§40).
- **REFERRAL / COOKIE / DEMOFORM / FR-EN / SEO / STRUCTURED-DATA / ASSET / PRODUCT-TRUTH / CURRENT-VS-VISION contracts**: exactly as documented in §9-11, §14-19 above.
- **DESIGN SYSTEM CONTRACT**: reuse existing V2 primitives (`V2Shell` and whichever nav/footer/CTA primitives fit, per §76 of the directive) wherever they genuinely fit; Homepage-specific primitives (continuum visualization, building/blueprint composition, ecosystem composition) are justified as HOMEPAGE-LOCAL, not shared, per §77.
- **STORYBOARD**: §26 (13 sections) is the binding architecture.
- **COMPONENT ARCHITECTURE**: §38.
- **MOBILE CONTRACT**: per-section behaviors in §26's table, sourced from the already-APPROVED Blueprint §22.
- **PERFORMANCE CONTRACT**: §37.
- **ACCESSIBILITY CONTRACT**: §36.
- **PRE-REGISTRY GATES**: tests/typecheck/lint/build green; desktop structural QA; desktop visual QA against the bouquet-final acceptance criteria (directive §107, adopted verbatim); claim-review checkpoint (§138, resolving R-01/R-02); link-review checkpoint (§139); asset-review checkpoint (§140, resolving R-03); performance-review checkpoint (§141).
- **REGISTRY PROTOCOL**: root added to `migratedV2Routes` only after all pre-registry gates pass (§41 confirms this is mechanically safe whenever it happens).
- **POST-REGISTRY GATES**: re-run tests/typecheck/lint/build; verify `/` and `/?lang=en` each render exactly 1 `main`/1 H1/1 footer/1 V2 header, no legacy footer, no duplicate DemoForm/referral capture; verify all 24 existing V2 static routes + the 1 dynamic Blog pattern remain unaffected.
- **HUMAN VISUAL REVIEW**: mandatory, both desktop and ~390px mobile (directive §108/§142) — this PRE pass performed no rendered-viewport QA at all (code-level audit only), so MIG-08A owns the first real visual pass on both the legacy and new Homepage.
- **GO/NO-GO**: GO (see §46 below).

## 46. MIG-08A phasing recommendation

**CONTROLLED SUB-PHASES**, not one monolithic implementation commit — given the page's unprecedented size (9,032 legacy lines, 13 target sections, a referral contract with real financial/attribution consequences, and an explicit "bouquet final" quality bar), a single all-at-once implementation risks exactly the kind of weak-composition-shipped-anyway outcome the directive repeatedly warns against (§39/§101). Recommended internal checkpoints (not separate MIG numbers, matching directive §137): **Checkpoint 1** — hero + opening narrative (sections 1-3) reviewed before building the rest; **Checkpoint 2** — mid-page peak + high-energy sections (4-9) reviewed; **Checkpoint 3** — full desktop Homepage; **Checkpoint 4** — mobile ~390px. Final commit remains one migration (`MIG-08A`), consistent with how every prior MIG in this repository has shipped as a single reviewed commit — only the internal working process is staged.

## 47. Review checkpoints

As listed in §46, plus the four dedicated review gates already specified in §45 (claim, link, asset, performance) — all required before root registration per directive §143.

## 48. MIG-09 boundary preview

After MIG-08A ships and is approved: global crawl/URL-parity check across the now-fully-V2 site; final FR/EN parity sweep; redirect review (none expected, no URLs change per §16 slug-preservation discipline already proven true for the root path — it was never renamed, just reshelled); legacy-shell retirement (`Footer.tsx`, `LegacyChrome.tsx`'s now-unused legacy branch); dead-asset cleanup (including the 4 unreferenced Homepage images if still unused after §16's review); the site-wide **GLOBAL RESPONSIVE DEBT — FLOATING MOBILE CONTROLS** item (carried since MIG-06, re-confirmed still open, explicitly recommended to remain a MIG-09 item rather than a MIG-08A one, since it is not Homepage-specific and fixing it inside Homepage's scope would blur the boundary the directive itself asks to preserve in §71/§145); final sitemap/robots/structured-data review; performance sanity check; production Go/No-Go.

## 49. Bouquet-final acceptance criteria

Adopted verbatim as the binding MIG-08A visual gate, per directive §107 (17 criteria) and §108 (mobile-specific criteria) — not restated here in full to avoid drift from the directive's own canonical wording; MIG-08A's implementer must re-read directive §107-108 directly (preserved in this conversation's history and referenced here by exact section number) rather than relying on a paraphrase.

## 50. GO / NO-GO

**GO — MIG-08A MAY BEGIN.**

Every required precondition from directive §122 is satisfied: Homepage completely inventoried (§3-6); referral contract understood exactly (§9); DemoForm contract understood exactly (§11); FR/EN contract understood (§14); SEO contract understood (§15); section preservation matrix complete (§5-6); claim audit complete (§7, with R-01/R-02 as explicit MIG-08A-time verification items, not blockers); product maturity boundaries established (§8); asset inventory complete (§16-19); useful existing photography identified (§17); obsolete/misleading-asset candidates identified (§16); storyboard complete (§26-29); narrative architecture complete (already APPROVED via the pre-existing Homepage Blueprint, confirmed still valid); visual rhythm defined (§29); current-vs-vision treatment defined (§30); mobile architecture defined (§26/§36); performance architecture defined (§37); component architecture defined (§38); root-registry behavior understood and proven safe (§41); baseline/test strategy defined (§40); no unresolved MIGRATION-BLOCKER (§44).

## 51. Validation

`npx tsc --noEmit`: clean (no application code was touched — this confirms the repository's pre-existing type-check state is unaffected by this audit). `npm test`: full suite passes unchanged (same reasoning). `npm run build`: successful, unchanged route table, no new warnings introduced. All three ran against the exact same application code as HEAD `cb4c692e` — this PRE phase changed zero lines of `app/`, `lib/`, or `tests/`.

## 52. Final git safety

```
git status --short
```
Only two changes: `docs/website-v2/05-migration/MIG-08-HOMEPAGE-GATE.md` (new, this file) and `docs/website-v2/00-governance/MASTER-INDEX.md` (modified, mechanical pointer addition only — see below). No application code, CSS, tests, assets, routes, backend, or config changed.

---

**MIG-08-PRE STATUS: READY FOR REVIEW**

## MIG-08A — Homepage implementation result

**Start state**: branch `feature/website-v2`, HEAD `cb4c692e`, two uncommitted PRE files present (this gate doc, MASTER-INDEX pointer). Approved on Mathieu's "continu".

**What was implemented**: `app/page.tsx`'s metadata/JSON-LD logic preserved near-verbatim (only the render target changed, `HomePageClient` → `Home`). New tree: `app/home/content.ts` (typed FR/EN content, copy carried over verbatim/near-verbatim from the legacy `TRANSLATIONS` dictionary and section JSX — no invented claims), `app/home/client/ReferralCapture.tsx` (the referral/cookie logic lifted byte-for-byte from the legacy effect), `app/home/components/Sections.tsx` (13 named section functions matching the approved storyboard §26), `app/home/components/sections.module.css`, `app/home/Home.tsx` (39-line composition, server component by default). `app/HomePageClient.tsx` (9,032 LOC) is now unimported/dead code — left in place rather than deleted, since its removal isn't required for MIG-08A and legacy-infrastructure cleanup is explicitly MIG-09's job (§42/§48); flagged for MIG-09.

**Storyboard-to-code mapping**: Hero, Tension, Continuum, Ecosystem (5-dimension list, replacing the 15-card-wall risk), Documents (PMU/PSI/PCA current + PGC/PRA/PUE marked `phase: 2`), Sentinelle, Incident, Exercises, Resilience, Platform (merged Plateforme+Product-Proof per §5 row 13), Trust (compressed Security section + trust-strip facts, now linking to `/security` — closing the discovery gap noted in §12/§20), Resources (new: closes the zero-links-to-`/blog`/`/guides` discovery gap found in §13/§22), Final CTA (DemoForm reused unchanged). Pricing/Client-Network/Population are folded as contextual links rather than standalone sections, per §26's own recommendation.

**Referral contract regression**: exact match confirmed — same cookie names, `CR-[A-HJ-NP-Z2-9]{6}` regex, 90-day Max-Age, first-touch-wins (existing cookie checked before write), `.getcoro.io` domain scoping only on the real domain, `Secure` only on HTTPS, `SameSite=Lax`, capture is client-side on mount via `ReferralCapture` (a ~40-line island, not embedded in a large component). Covered by `tests/home-migration.test.ts`'s referral-contract tests and `tests/fixtures/homepage-referral-baseline.json`.

**Cookie regression**: no new cookies introduced; the two referral cookies are the only ones this page owns, unchanged.

**DemoForm regression**: reused unchanged (`app/DemoForm.tsx`, zero diff) — imported by `FinalCta` with the same `lang` prop contract.

**FR/EN parity**: `tests/home-migration.test.ts` asserts structural key parity between the `fr` and `en` content objects (same top-level keys in both). Content is carried over from the legacy dictionary, which the PRE audit already found to have real (not machine-translated) EN throughout.

**SEO/structured data**: `app/page.tsx`'s `generateMetadata`, `WebSite` and `Organization` JSON-LD are unchanged — only the rendered body changed.

**Claim traceability**: PGC/PRA/PUE (and their EN codes CMP/DRP/EEP) are represented only inside `documents.items` entries carrying `phase: 2`, never claimed as available — asserted by a dedicated test. No Ops/Network/Campus/Building-Bridge moment was introduced (the PRE audit's product-maturity matrix classifies these CONCEPT/FUTURE — omitted entirely rather than shown as vision, since no new visual asset exists for them and inventing one was explicitly out of scope for this pass).

**Asset reuse / gaps**: `hero-building.webp` reused in the hero photo slot; `continuum-coro.webp` reused in Continuum. The other 10 referenced legacy assets (product-UI screenshots, evacuation/first-responders/drill-exercise/sector photography) were **not** wired into the new component tree in this pass — the storyboard's per-asset placement (§16-19 of this gate) needs a follow-up visual pass to slot them in; sections currently render as text-only panels for Sentinelle/Incident/Exercises/Platform/Ecosystem. This is the single largest gap between this implementation and the full "bouquet final" ambition of the storyboard, flagged honestly below rather than claimed as done.

**Component architecture used**: server components throughout except two client islands (`ReferralCapture`, `DemoForm`) — matches §37/§38's target architecture exactly; no new 9,000-line monolith was created.

**Accessibility**: one `<h1>` (`home-title`), 13 `<h2>`s labelling their sections via `aria-labelledby` (via `PageSection`), one `<main>` (via `V2Shell`), real `<a>`/`<button>` elements throughout (no clickable divs), `TrustStrip` for Confiance uses its existing accessible list pattern.

**Performance**: no new client JS beyond the two islands; no images loaded eagerly beyond the hero (which is `priority` by `EditorialHero`'s own default). Full per-image lazy-loading audit was not re-verified pixel-by-pixel in this pass.

**PRE-REGISTRY GATE: PASS** — tests (632/632 before the registry step, all pre-existing), typecheck clean, build green, live structural QA on the dev server (pointed at the production Blog API via `INTERNAL_API_URL` runtime env var, no code change) confirmed 1 main/1 h1/13 sections/2 footers (V2 + legacy, correct pre-registry state) on `/` and `/?lang=en`, PGC/PRA/PUE phase-2 marking rendered correctly (4 occurrences), `/blog` unaffected.

**Registry step**: `/` added as the 25th `migratedV2Routes` entry (`lib/site/v2-migration.ts`), last, after the pre-registry gate passed. Safe by construction per §41 (exact-match array, no prefix risk).

**Registry test sync**: 16 mechanically-necessary test files updated (the same "array snapshot + `isLegacyFooterVisible('/')` flip" pattern used at every prior MIG step): `about-migration`, `contact-migration`, `gestion-de-projets-migration`, `gestion-documentaire-migration`, `partners-migration`, `performance-objectifs-migration`, `portail-client-migration`, `programme-recommandation-migration`, `resilience-operationnelle-migration`, `sentinelle-migration`, `sentinelle-population-migration`, `sitemap`, `v2-shell`, `visual-01`, `blog-dynamic-registry`, `page-rhythm`, `design-lab` (checkpoint list updated, referral-ownership test repointed to `ReferralCapture.tsx`).

**POST-REGISTRY VALIDATION: PASS** — 632/632 tests, typecheck clean, `npx eslint app/home app/page.tsx` clean, build green. Live re-verification: `/` and `/?lang=en` now render exactly 1 footer (V2 only, legacy gone), 1 main, 1 h1, 13 sections; full regression matrix (all 24 previously-migrated static routes + `/blog?page=2` + a real article) all HTTP 200.

**Desktop visual QA**: performed via `curl`/structural HTML inspection only — no rendered-viewport screenshot tool was used in this pass. Section presence, footer count, phase-2 marking and content were verified in the raw HTML; actual visual composition (canvas usage, rhythm, image placement — since most sections currently lack imagery per the asset-reuse gap above) has **not** been human-reviewed.

**Mobile visual QA**: PENDING HUMAN REVIEW — no ~390px viewport was rendered in this pass.

**Remaining legacy routes**: none — `/` was the last one. `migratedV2Routes` now has 25 static entries + 1 dynamic pattern family, covering every implemented public route.

**Legacy infrastructure status**: `Footer.tsx`/`LegacyChrome.tsx`'s `isLegacyFooterVisible` mechanism intentionally left in place (MIG-09 scope, §42/§48). `app/HomePageClient.tsx` is now dead code, also left in place for the same reason.

**Git**: nothing staged, committed, or pushed.

**Human review URLs**: `http://localhost:3000/`, `http://localhost:3000/?lang=en`.

**Unresolved items**: (1) most legacy imagery (10 of 12 assets) is not yet wired into the new sections — a follow-up visual/asset pass is needed before this can be called visually "bouquet final"; (2) no rendered desktop or mobile visual QA was performed, only structural HTML checks; (3) product-UI screenshot currency (R-02) was not re-verified against live product UI in this pass.

---

## MIG-08A-B — Bouquet-final art-direction completion

**Reference image review**: `public/website-v2/template.png` viewed directly (dark hero with architectural night photography + floating editorial overlay cards showing occupation/plan-status/incident-alert concepts, a 10-icon module grid, a building "cutaway" with floating labels + a circular "Indice CORO" score gauge, a dark operations section with a security-desk photo + phone/QR mockup + a DÉTECTER/DÉCIDER/AGIR/... vertical word list, a customer-logo strip, and two named/photographed testimonials, closing with a full-width skyline CTA band). **Non-copy boundary honored**: no customer logo, no testimonial (named or otherwise), no fabricated statistic (e.g. "187 personnes"), and no literal live-data screenshot mimicry was added anywhere in this pass — the repository has no evidence any of the reference's customer names or testimonials are real, approved CORO proof, so none were used or invented. Only the compositional ambition (photography scale, dark/light rhythm, layered split-content moments, restrained full-width immersive sections) was carried over, adapted to verified 2026 CORO product truth per this gate's own product-maturity matrix.

**Asset-reuse work (prior sub-pass in this same phase)**: 7 previously text-only sections — Tension, Documents, Sentinelle, Incident, Exercises, Resilience, Platform — were wired with real existing imagery already approved and in production use elsewhere on the site: `problem-people.webp`, `platform-documents.webp` (with a real `cartouche` reading "PMU · Tour Prémont 2026 · Score 100/100" — the `Tour Prémont` demo account, the same sanitized demo identity used on other already-migrated V2 pages, not a real client), `sentinel-occupancy.webp`, `incident-response.webp`, `drill-exercise.webp`, `website-v2/resilience/resilience-emergency-coordination.webp`, `platform-dashboard.webp` (relabeled "TABLEAU DE BORD · Portefeuille de mandats · Vue d'ensemble" and moved to the Platform section rather than mislabeled as the CORO Index). Hero (`hero-building.webp`) and Continuum (`continuum-coro.webp`) already carried imagery from the original MIG-08A pass. No new photography or illustration was generated; only pre-existing, already-approved repository assets were placed.

**Hero treatment**: kept the existing `EditorialHero` photographic-mode treatment (real architectural night photo, navy scrim, dual CTA) rather than adding floating editorial-overlay cards in the reference's style. `EditorialHero` is a shared V2 primitive (`components/page/EditorialHero.tsx`) used by other pages and carries its own explicit governance comment — "No motion, no parallax, no glow" — and the reference's overlay cards (occupation count, per-document status, incident alert) would require either inventing plausible-looking but fake live figures (explicitly forbidden: "do not invent '187 personnes' or similar fabricated stats") or modifying a shared cross-page primitive outside this pass's Homepage-only scope. Decision: leave the hero as a strong, honest, real-photography moment without decorative overlay chrome, rather than fabricate data to hit the reference's exact visual pattern. Flagged as a legitimate PARTIAL against the reference's hero density (see reference matrix below), not a gap to be closed by inventing content.

**Section identity / rhythm / energy summary**: 13 sections + demo panel. Background-tone sequence: Hero (dark photo) → Tension (white) → Continuum (navy, immersive) → Ecosystem (soft) → Documents (white) → Sentinelle (soft) → Incident (navy, immersive) → Exercises (white) → Resilience (soft) → Platform (white) → Trust (soft, compact) → Resources (white, compact) → Final CTA (dark) → Demo (white). This alternates white/soft/navy with two deliberate navy "peaks" — Continuum (the system-overview moment, immersive density) and Incident (the highest-energy operational moment, immersive density) — bracketing calmer white/soft sections on either side, closing on a dark Final CTA. This is narrative-justified alternation, not mechanical dark/light flipping: every navy section corresponds to a genuine intensity increase (system connectivity, live incident response), and every white/soft section is an explanatory or calmer moment (problem framing, ecosystem list, document status, people/Sentinelle, exercises, resilience measurement, platform links, trust facts, resource links).

**Copy polish outcome**: reviewed `app/home/content.ts` in full. Copy was already strong and claim-disciplined from the original MIG-08A pass (no placeholder-feeling text found) — PGC/PRA/PUE (and EN codes CMP/DRP/EEP) correctly marked `phase: 2` throughout, no Ops/Network/Campus/Building-Bridge content invented, hero/section punch-lines are already specific and non-generic ("Avoir un plan ne signifie pas être prêt.", "Un incident ne devrait jamais commencer par chercher l'information."). No rewrite was made — the existing copy already satisfies the punch-line quality bar (one idea per line, no jargon, FR is not a translation of EN or vice versa, both are native-quality). Referral/cookie logic was not touched.

**Customer-proof policy**: excluded entirely. No repository or governance evidence was found of any publicly-approved CORO customer logo or testimonial (consistent with this gate's earlier §54/§34-36 social-proof audit). The reference's logo strip and testimonial pair were treated as fictional example content per the directive's own explicit instruction and omitted rather than replaced with placeholders.

**Self-verification tests**:
- *Card-wall test*: **PASS**. Only one true card cluster exists on the page (the 6-item Documents status-badge grid — small inline badges with a 1px border, not full feature cards). The Ecosystem section is a numbered/divided list (`<ol>` with border-dividers), not a card grid. This matches the project's own established rule (asserted elsewhere in the test suite): "cards are selective: at most one card cluster per page, restrained."
- *No-text test*: **PASS with a caveat**. With imagery now wired into 9 of 13 sections, the page reads as visually distinct zones (photo hero → white text → navy image-and-text → list → image-and-text → image-and-text → navy image-and-text → image-and-text → image-and-text → image-and-text → compact trust strip → compact link row → dark CTA). The 4 sections still without imagery (Continuum already has one; Ecosystem, Trust, Resources are intentionally text/list-led per their content type — a numbered capability list, a fact strip, and a link row do not need photography) are legitimately non-photographic by design, not gaps.
- *No-image test*: **PASS**. Every section's copy stands alone and makes sense without its image — verified by reading `content.ts` independent of `Sections.tsx`.
- *5-second test*: hero alone communicates: CORO, operational resilience platform, Quebec/Canada, that resilience starts before the emergency, with an immediate primary CTA.
- *20-second test*: through Tension + Continuum, a visitor additionally understands the problem (a plan alone isn't readiness) and that CORO keeps one continuous thread of information from planning through lessons-learned.
- *60-second test*: through Ecosystem + Documents + Sentinelle, a visitor understands the five capability dimensions, which compliance documents are real today vs. Phase 2, and that CORO tracks who is present/missing in real time.
- *Full-scroll test*: a visitor reaches Incident, Exercises, Resilience, Platform, Trust, Resources and the Final CTA, closing with hosting/security facts, a resource discovery moment, and one clear conversion action — no module-name memorization required to follow the story.
- *Four memorable moments*: (1) the hero's real architectural night photograph with a two-line display headline; (2) the navy immersive Continuum section with the full-width continuum diagram; (3) the navy immersive Incident section pairing a real incident-response photo with "Un incident ne devrait jamais commencer par chercher l'information."; (4) the Documents section's sanitized real-product cartouche ("PMU · Tour Prémont 2026 · Score 100/100") proving actual document output rather than describing it abstractly.

**Bouquet-final acceptance matrix** (MIG-08-PRE §107, 17 criteria, scored individually):
1. Hero has immediate visual impact — **PASS** (real photo, navy scrim, strong two-line H1).
2. Does not resemble a generic SaaS template — **PASS** (no icon-only feature-card wall; capability list + alternating photo/text split sections).
3. At least four major sections have clearly distinct visual identities — **PASS** (see four moments above).
4. No long run of identical card grids — **PASS** (one card cluster total, see card-wall test).
5. Desktop 1100–1200px canvas used intentionally — **PARTIAL**, not independently re-measured against a rendered viewport in this pass (see Desktop Visual QA below); the `SplitContent`/`PageSection` primitives used are the same ones already visually approved on `/sentinelle`, `/coro-incident`, `/resilience-operationnelle`, so canvas usage is inherited from already-approved patterns, not newly invented.
6. Strong sections alternate with calmer explanatory sections — **PASS** (rhythm summary above).
7. Existing useful photography retained where appropriate — **PASS** (9 of 13 sections now carry real existing imagery).
8. New visuals introduced only where they add narrative value — **PASS** (no new visuals were created at all in this pass; only existing approved assets were placed).
9. Real product UI distinguishable from editorial illustration — **PASS** (the two `MediaFrame kind="technical"` cartouches are explicitly labeled with the sanitized demo identity "Tour Prémont"; the photographic sections are plainly photography, not UI).
10. Current capabilities distinguishable from vision/future — **PASS** (PGC/PRA/PUE phase-2 marking verified live, 4 occurrences).
11. Each major section has one clear message/punch-line — **PASS** (per content.ts review).
12. Narrative understandable without knowing module names — **PASS** (per 60-second/full-scroll test above).
13. Mobile preserves hierarchy, not merely stacking — **NOT VERIFIED**, no rendered ~390px viewport in this pass (see Mobile Visual QA).
14. CTA rhythm is disciplined — **PASS** (one primary + one secondary in the hero, contextual links/buttons in-section, one Final CTA — no repeated red-button spam).
15. Page feels premium, operational, credible and memorable — **PARTIAL**, self-assessed from source/structural review only, not a rendered human judgment call — genuinely requires Mathieu's eyes.
16. No unsupported claim introduced for visual impact — **PASS** (no fabricated stats/testimonials/logos, per customer-proof policy above).
17. Performance remains credible despite visual richness — **PASS**, no new client JS, only the pre-existing two islands; images use existing `next/image`/`MediaFrame` responsive delivery already proven on other pages; no eager-loading beyond the hero's own `priority` default.

**Reference art-direction matrix** (11 dimensions, against `template.png`):
- Visual impact: **PARTIAL** (real photography and a strong hero exist; the reference's floating overlay-card technique was deliberately not replicated, per the hero-treatment decision above).
- Density: **PARTIAL** (page is now image-rich across 9/13 sections vs. the reference's near-every-section density; three sections — Ecosystem, Trust, Resources — remain intentionally text/list-led).
- Photography scale: **MEETS** (hero and Continuum use large/full-width imagery; split sections use large `MediaFrame` images at meaningful scale, not thumbnails).
- Canvas usage: **PARTIAL** (inherited from already-approved primitives; not independently re-verified at a rendered 1200px viewport in this pass).
- Section character: **MEETS** (13 sections now have genuinely distinct visual identities — photo hero, navy immersive diagram, list, two technical cartouches, four photo-split sections, a compact trust strip, a compact link row, a dark final CTA).
- Dark/light rhythm: **MEETS** (narrative-justified alternation, see rhythm summary).
- Typography: **MEETS** (existing `EditorialHero`/`EditorialBlock`/`TechLabel` primitives already carry the site's established display-type discipline; no ad hoc typography was introduced).
- Operational feel: **MEETS** (Incident/Sentinelle/Resilience sections use real operational photography and product cartouches rather than abstract icons).
- Premium feel: **PARTIAL**, self-assessed only, genuinely needs human judgment.
- Storytelling: **MEETS** (see 5/20/60-second/full-scroll tests).
- Final impact: **PARTIAL** (Final CTA is dark and conclusive but does not include a late-page visual culmination image distinct from the hero — no new asset existed for this and none was fabricated).

**Tests**: 632/632 passing (`npm test`), including `tests/home-migration.test.ts`'s 11 tests (route, FR/EN parity, referral contract, metadata/JSON-LD preservation) and the 16 mechanically-updated registry-dependent test files.

**Typecheck**: `npx tsc --noEmit` — clean.

**Lint**: not re-run as a separate scoped pass in this sub-phase (no lint-relevant code changed beyond JSX attribute edits already covered by the prior `npx eslint app/home app/page.tsx` clean run recorded in the MIG-08A section above).

**Build**: `npm run build` — successful, full route table unchanged.

**Regression**: live-verified `/`, `/?lang=en` both HTTP 200 with exactly 1 `<main>`, 1 `<h1>`, 1 `<footer>`; `/blog`, `/sentinelle`, `/coro-incident`, `/resilience-operationnelle`, `/gestion-documentaire`, `/security`, `/pricing`, `/guides` all HTTP 200; all 9 newly-wired image URLs resolve HTTP 200 live against the running dev server.

**Referral/DemoForm regression (hard gate)**: `tests/home-migration.test.ts`'s referral-contract and DemoForm-ownership tests pass unchanged (11/11); `ReferralCapture.tsx` and `app/DemoForm.tsx` were not touched by this sub-phase's asset-wiring or copy review. **PASS.**

**Desktop visual QA**: method used — `curl`-based structural HTML inspection (main/h1/footer counts, image URL HTTP-200 verification) plus direct visual inspection of the reference image and direct source-code review of every touched section and the primitives they compose (`SplitContent`, `MediaFrame`, `PageSection`, `EditorialHero`, `EditorialBlock`), all of which are shared, already-visually-approved components reused unmodified from other migrated V2 pages. **No rendered-viewport screenshot was captured in this sub-phase either** — this pass had no browser-screenshot tool available, consistent with every prior phase in this conversation. Canvas-usage, section-to-section transition feel, and overall rhythm-as-experienced have not been human-verified.

**Mobile visual QA**: PENDING HUMAN REVIEW — no ~390px viewport was rendered in this sub-phase.

**Git**: diff scope confirmed limited to `app/page.tsx`, `app/home/**`, `lib/site/v2-migration.ts`, 19 Homepage/registry-dependent test files, 3 Homepage fixtures, `tests/home-migration.test.ts`, `docs/website-v2/05-migration/MIG-08-HOMEPAGE-GATE.md`, `docs/website-v2/00-governance/MASTER-INDEX.md`, `public/website-v2/template.png` (the reference image itself). No Blog, backend, or other already-migrated-page files changed. Nothing staged, committed, or pushed.

**Human review URLs**: `http://localhost:3000/`, `http://localhost:3000/?lang=en`.

**Unresolved items**: (1) no rendered desktop (~1440px) or mobile (~390px) viewport screenshot was captured in this or the prior sub-phase — every visual claim above is source/structural, not a human-verified rendered judgment; (2) the hero does not use the reference's floating editorial-overlay-card technique, by deliberate decision to avoid fabricating data or modifying a shared cross-page primitive outside Homepage scope; (3) no late-page visual-culmination image distinct from the hero exists, since no suitable unused asset was found and none was created; (4) "premium feel" and "final impact" against the reference are self-assessed only and genuinely require Mathieu's human judgment, which is exactly what this report is requesting, not claiming to have already obtained.

**MIG-08A-B STATUS: READY FOR VISUAL REVIEW** — every hard technical/behavioral gate passes (tests, typecheck, build, full regression, referral, DemoForm, claim-traceability), the bouquet-final acceptance matrix has no core FAIL (only three legitimate PARTIALs, all tied to the same honestly-disclosed lack of rendered-viewport QA and the deliberate no-fabrication decision on hero overlays), and no customer-proof or product-truth violation exists. This is offered for Mathieu's visual review, not as a self-approval — the premium/final-impact/canvas-usage judgment calls above are explicitly his to make.

---

**MIG-08A STATUS: READY FOR VISUAL REVIEW** — technically complete (referral/DemoForm/FR-EN/SEO/claim-traceability/registry all preserved and tested, full regression green), but visually unfinished relative to the storyboard's full ambition (see unresolved items above) — Mathieu's review should treat this as a structural/behavioral checkpoint, not the final "bouquet final" visual pass.
