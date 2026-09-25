# 07 --- Target Page Architecture

**Version:** 1.0\
**Date:** 24 septembre 2026\
**Status:** APPROVED TARGET ARCHITECTURE --- subject to SEO validation
in Document 09\
**Inputs:** `CURRENT-SITE-INVENTORY.md`, `CONTENT-MIGRATION-MATRIX.md`,
Visual Language, Content Guidelines, Page Family Art Direction Matrix.

> **MIG-00A :** statuts de publication, blueprints par route, cartes SEO, maillage et ordre de migration : voir `SITE-ARCHITECTURE-AND-PAGE-BLUEPRINTS.md`, référence des statuts de lancement.

> Website V2 must reduce the perceived complexity of CORO without
> reducing the real richness of the ecosystem.

## 1. What changed from V0.1

V1.0 reconciles the target architecture with the audited current site.

Key decisions:

-   Existing public product URLs are retained for launch rather than
    renamed to prettier new slugs.
-   The current `?lang=en` convention is retained pending Document 09.
-   Existing blog and guide URLs remain protected.
-   Future registered routes are not automatically promoted into launch
    navigation.
-   The homepage remains `/` and is rebuilt only after the Design Lab.
-   Current institutional routes already migrated to V2 remain part of
    the architecture.
-   The navigation target is simplified without requiring immediate
    creation of every conceptual hub proposed in V0.1.

## 2. Architecture principles

1.  Users may enter CORO through a problem, product, sector, resource or
    direct URL.
2.  The ecosystem must remain understandable without exposing every
    module at first level.
3.  Existing valuable URLs remain stable unless SEO analysis explicitly
    approves a migration.
4.  Product naming and public-route naming are separate concerns: a
    product may be branded "CORO Documents" while retaining
    `/gestion-documentaire`.
5.  FR/EN parity is designed at architecture level.
6.  Marketing, resources and authenticated applications remain distinct.
7.  Future products are not exposed merely because route placeholders
    exist.
8.  Navigation must work before all future target pages exist.

## 3. Launch architecture --- Level 1

Recommended primary navigation:

-   **Plateforme**
-   **Solutions**
-   **Produits**
-   **Ressources**
-   **Tarification**
-   **Connexion**
-   Primary CTA: **Demander une démonstration**

`Secteurs` remains a target family but is not required as a first-level
launch item until differentiated sector pages are confirmed.

## 4. Public route architecture for launch

### Core / institutional

-   `/`
-   `/about`
-   `/security`
-   `/contact`
-   `/partners`
-   `/programme-recommandation`
-   `/pricing`
-   `/privacy`
-   `/terms`

### Current product routes retained

-   `/gestion-documentaire`
-   `/gestion-de-projets`
-   `/performance-objectifs`
-   `/portail-client`
-   `/resilience-operationnelle`
-   `/sentinelle`
-   `/sentinelle-population`

### Resources

-   `/blog`
-   `/blog/[slug]`
-   `/documents/plan-*-pmu`
-   `/documents/plan-*-psi`
-   `/documents/plan-*-pca`
-   `/documents/plan-*-pgc`
-   `/documents/plan-*-pra`
-   `/documents/plan-*-pue`

### Technical/public utility

-   `/sitemap.xml`
-   `/robots.txt`
-   `/manifest.webmanifest`
-   `not-found`

## 5. Homepage

Route: `/`\
Decision: `REBUILD` after Design Lab.

Narrative:

1.  Hero architectural.
2.  Tension: a plan alone is not operational readiness.
3.  CORO continuum.
4.  Ecosystem.
5.  Building → information → decision.
6.  Documents.
7.  Sentinelle.
8.  Incident capability.
9.  Population capability where relevant.
10. Exercises / lessons learned.
11. Resilience / measurement.
12. Client / multi-site perspective.
13. Trust.
14. Final demo CTA.

The homepage is an ecosystem narrative, not a catalogue of every
product.

### Protected homepage contracts

-   referral `?ref=...`;
-   referral cookies;
-   DemoForm;
-   `#demo`;
-   agreed compatibility for historical anchors;
-   useful SEO content and structured data.

## 6. Platform navigation family

The launch navigation may use **Plateforme** as a navigation concept
without requiring `/plateforme` to exist immediately.

Current destinations under this family may include:

-   CORO Documents → `/gestion-documentaire`
-   CORO Projects → `/gestion-de-projets`
-   CORO Performance → `/performance-objectifs`
-   CORO Client → `/portail-client`
-   Security → `/security`

The conceptual `/plateforme` page is `BUILD-NOW-HIDDEN` (MIG-00A-B); public exposure is evaluated after MIG-02 for its incremental
value is demonstrated.

## 7. Solutions navigation family

Solutions organize CORO by user problem rather than internal module.

Launch solution groupings may link directly to current product pages
when no dedicated solution hub exists.

### Conformité documentaire

Primary destination: `/gestion-documentaire`

### Pilotage des mandats

Primary destination: `/gestion-de-projets`

### Performance et capacité

Primary destination: `/performance-objectifs`

### Portefeuille / accès client

Primary destination: `/portail-client`

### Occupation et évacuation

Primary destination: `/sentinelle`

### Résilience organisationnelle

Primary destination: `/resilience-operationnelle`

### Alerte population

Primary destination: `/sentinelle-population`

Dedicated `/solutions/...` routes should be created only when they
provide differentiated content and SEO value.

## 8. Products navigation family

Products should be grouped, not rendered as a flat wall of cards.

### Available / current public products

-   CORO Documents
-   CORO Projects
-   CORO Performance
-   CORO Client
-   CORO Sentinelle
-   Sentinelle Population
-   CORO Résilience

### Future / gated products

The following are not launch products; their statuses are set in `SITE-ARCHITECTURE-AND-PAGE-BLUEPRINTS.md` (Incident is `PUBLISH-NOW` and is therefore listed there, not here; Exercices is `REVIEW`; the others are `FUTURE`). None may be presented as available merely because a route placeholder exists:

-   CORO Exercices (`REVIEW`)
-   CORO Knowledge (`FUTURE`)
-   CORO AI (`FUTURE`)
-   CORO Network (`FUTURE`)
-   CORO Campus (`FUTURE`)
-   CORO Ops (`FUTURE`)
-   QR Intervention (`FUTURE`)
-   Multi-sites dedicated solution page (`FUTURE`)

Their public launch requires explicit product-status validation.

## 9. CORO Documents

Public route: `/gestion-documentaire`

Target narrative:

1.  Document/blueprint hero.
2.  Building as source of truth.
3.  Generation and structured production.
4.  Editing.
5.  Approval workflow.
6.  Bilingual output.
7.  Available document types.
8.  Integration with projects/client/context.
9.  Proof.
10. CTA.

Existing legacy copy, media and structured data must be compared before
removal.

## 10. CORO Projects

Public route: `/gestion-de-projets`

Target narrative:

1.  Workflow hero.
2.  Mandate.
3.  Activities.
4.  Tasks.
5.  Deadlines.
6.  Assignment.
7.  Capacity / performance relationship.
8.  Booking / Planner only if publicly available.
9.  Reporting.
10. CTA.

## 11. CORO Performance

Public route: `/performance-objectifs`

Target narrative:

1.  Metric-led hero.
2.  KPIs.
3.  Budgets.
4.  Capacity.
5.  Objectives.
6.  Portfolio.
7.  Trends.
8.  Decisions.
9.  CTA.

CORO Performance must remain distinct from the CORO Resilience Index.

## 12. CORO Client

Public route: `/portail-client`

Target narrative:

1.  Portfolio.
2.  Building.
3.  Documents.
4.  Projects.
5.  Emergency/resilience information.
6.  Booking if public.
7.  Transparency and access.
8.  CTA.

Authenticated destination remains `https://client.getcoro.io/login`.

## 13. CORO Sentinelle

Public route: `/sentinelle`

Target narrative:

1.  Living-building hero.
2.  QR / PIN entry.
3.  Real-time occupancy.
4.  Emergency teams.
5.  Evacuation.
6.  Assembly point.
7.  Missing persons.
8.  First-responder access.
9.  Incident integration where available.
10. Multi-site capability where available.
11. CTA.

V1.0 architecture requires a product decision on English availability
before SEO finalization.

## 14. Sentinelle Population

Public route: `/sentinelle-population`

Target narrative:

1.  Territorial/cartographic hero.
2.  Context and applicability.
3.  Risk/scenario context appropriate for public communication.
4.  Zones.
5.  Population and sensitive establishments.
6.  Prepared messages.
7.  Channels.
8.  Distribution.
9.  Traceability.
10. Privacy.
11. First responders.
12. CTA.

The page must not imply universal applicability to all buildings.

English must either be genuinely implemented or removed from locale
signals until ready.

## 15. CORO Résilience

Public route: `/resilience-operationnelle`

Target narrative:

1.  CORO Index / measurement hero.
2.  Dimensions.
3.  Gaps.
4.  Priorities.
5.  Actions.
6.  Evolution.
7.  Continuum.
8.  Proof.
9.  CTA.

Do not rename the public route for launch solely to align it with the
product brand.

## 16. Incident and Exercises

CORO Incident is `PUBLISH-NOW` (MIG-04, before the homepage), with a mandatory functional-truth audit before any public copy: only verified functionality may be described. CORO Exercises stays `REVIEW`; it becomes hidden-buildable only if a functional audit shows sufficient public readiness, otherwise `FUTURE`.


Rules:

-   the homepage may describe the ecosystem capability only if accurate;
-   navigation must not promise an unavailable public product;
-   no Exercises page is indexed while its status is `REVIEW`.

Art direction follows the Page Family Matrix and
their route strategy must pass Document 09.

## 17. Knowledge / AI / Network / Campus

Status: `REVIEW`.

These may become dedicated public pages later. For Website V2 launch,
they should be exposed only to the degree that the actual product is
public and sufficiently defined.

AI must not become a generic marketing category detached from real
workflows.

## 18. Resources

### Blog

-   `/blog`
-   `/blog/[slug]`

Existing slugs remain authoritative.

### Guides

Keep the six current `/documents/...` guide URLs.

`/guides` is `PUBLISH-NOW` (resource hub for the six guides, available from MIG-02); `/ressources` stays `FUTURE`. The hub must improve
discovery without replacing existing indexed URLs.

Status: `/guides` `PUBLISH-NOW`; `/ressources` `FUTURE`.

## 19. Pricing

Public route: `/pricing`

Target:

1.  Minimal hero.
2.  Current offers.
3.  Comparison.
4.  Price factors.
5.  Trial/demo logic.
6.  FAQ.
7.  CTA.

All pricing and availability claims require validation before V2
approval.

## 20. Security / Trust

Public route: `/security`

Target:

-   hosting;
-   privacy;
-   security controls;
-   governance;
-   relevant plan-level features;
-   trust evidence.

Claims must be factual and current.

A separate new "Trust Center" route is not required for launch.

## 21. About / Company

Public route: `/about`

The existing V2 page remains the primary company/about destination.

Do not create a duplicate `/entreprise` page without differentiated
purpose.

## 22. Contact / Demo

Public route: `/contact` plus homepage `#demo`.

`/contact` remains the contact page.

The homepage retains the primary demo conversion section unless a later
conversion decision changes this.

DemoForm must preserve referral attribution.

## 23. Partners

Public route: `/partners`

Keep current V2 route.

## 24. Referral program

Public route: `/programme-recommandation`

Keep current V2 route and preserve business conditions after validation.

The program depends on homepage referral capture and DemoForm
consumption.

## 25. Legal

Keep:

-   `/privacy`
-   `/terms`

Legal copy is content-protected. Visual migration must not silently
alter meaning.

## 26. Sectors

Target family retained, launch exposure deferred unless differentiated
pages are available.

Candidate future sectors:

-   commercial real estate;
-   industrial;
-   institutional / education / campus.

Do not create thin SEO pages merely to fill navigation.

## 27. Navigation model V1.0

### Desktop target

**Plateforme**\
Current platform/product capabilities.

**Solutions**\
Problem-oriented groupings linking to current pages where appropriate.

**Produits**\
Structured ecosystem view; only publicly available products.

**Ressources**\
Blog and current guides; future hub optional.

**Tarification**\
Direct `/pricing`.

**Connexion**\
Platform and Client destinations.

**CTA**\
Demander une démonstration.

### Mobile

Same information architecture, reorganized for touch and progressive
disclosure.

No desktop-only destination may disappear on mobile.

## 28. Footer V1.0

One shared footer only.

Candidate groups:

-   Produit
-   Solutions
-   Ressources
-   Entreprise
-   Légal
-   Connexion

Preserve validated:

-   contact details;
-   legal identity;
-   hosting statement;
-   Platform login;
-   Client login;
-   privacy/terms;
-   About/Partners/Referral/Blog/Contact.

The legacy and V2 footers must ultimately be consolidated.

## 29. Locale architecture

For launch, retain:

-   FR: URL without locale query.
-   EN: `?lang=en`.

This is a migration-stability decision, not a declaration that
query-based locale is the ideal long-term architecture.

Document 09 may recommend a future locale-URL migration only with
complete redirect/canonical/hreflang handling.

Document language and server rendering must nevertheless reflect the
actual locale.

## 30. Future registered routes --- disposition

  Route                          V1.0 disposition
  ------------------------------ ------------------
  `/plateforme`                  `BUILD-NOW-HIDDEN`
  `/coro-platform`               `REVIEW`
  `/resilience-operations`       `REVIEW`
  `/coro-incident`               `PUBLISH-NOW` (functional-truth audit first)
  `/coro-exercices`              `REVIEW`
  `/coro-ops`                    `FUTURE`
  `/qr-intervention`             `FUTURE`
  `/coro-knowledge`              `FUTURE`
  `/coro-ai`                     `FUTURE`
  `/coro-network`                `FUTURE`
  `/coro-campus`                 `FUTURE`
  `/solutions/multi-sites`       `FUTURE`
  `/ressources`                  `FUTURE`
  `/guides`                      `PUBLISH-NOW`
  `/conformite-reglementation`   `REVIEW`

`/coro-exercices` and `/conformite-reglementation` stay `REVIEW`; `/coro-platform` and `/resilience-operations` stay `REVIEW` (MERGE-REVIEW candidates). Launch statuses are authoritative in `SITE-ARCHITECTURE-AND-PAGE-BLUEPRINTS.md`.

## 31. Priority user journeys

### Property / portfolio manager

`/` → Documents / Sentinelle / Client / Performance → Demo

### Emergency-management professional

`/` → Sentinelle / Resilience → relevant operational capability → Demo

### Industrial / environmental

`/` or relevant resource → Sentinelle Population / PUE guide → Demo

### Executive

`/` → Performance / Resilience / Client → Demo

### Existing client

Marketing site → Client login

### Adviser

Marketing site → Platform login

### Organic-search visitor

Blog/guide → relevant product/solution → Demo

## 32. URL rules

1.  Existing launch URLs are stable by default.
2.  Product rebranding does not require slug migration.
3.  Future hubs may coexist with existing product URLs.
4.  No redirect is created without Document 09.
5.  Blog slugs are protected.
6.  Guide URLs are protected.
7.  Query-based English remains during this migration unless separately
    approved.

## 33. Content architecture rule

A page should not repeat the entire ecosystem.

Each product page answers:

-   What operational reality does this address?
-   What does CORO enable?
-   How does it work?
-   What proof can we show?
-   How does it connect to the ecosystem?
-   What should the visitor do next?

## 34. Relationship to the Design Lab

This architecture does not authorize immediate production-page
reconstruction.

Sequence remains:

1.  Documentation and migration planning.
2.  SEO Migration Plan.
3.  CURRENT → TARGET component matrix.
4.  Design Lab.
5.  Lock foundations/components.
6.  Production homepage.
7.  Product pages.
8.  Secondary pages.
9.  Full migration QA.

## 35. Open decisions after V1.0

-   Incident: `PUBLISH-NOW`, wording subject to the functional-truth audit;
-   exact public-launch status of Exercises (`REVIEW`);
-   Knowledge / AI / Network / Campus exposure;
-   public exposure of `/plateforme` after MIG-02;
-   `/ressources` (`FUTURE`); `/guides` is decided (`PUBLISH-NOW`);
-   whether sector pages are launch-ready;
-   final EN of Sentinelle (target FR + EN, MIG-04);
-   final EN of Sentinelle Population (target FR + EN after genuine translation, MIG-05);
-   long-term locale URL strategy.

These open decisions do not block the Design Lab.

## 36. Acceptance criteria

This architecture is acceptable when:

-   every existing route has a place in the migration model;
-   no current public URL is silently lost;
-   navigation can operate without future routes;
-   current product URLs remain usable;
-   FR/EN behavior is explicit;
-   blog and guides remain protected;
-   referral/demo contracts remain reachable;
-   future products are not falsely presented as available;
-   the architecture supports the approved visual families.

## 37. Governing rule

> Website V2 should feel simpler than the product ecosystem actually is.

The architecture achieves this through progressive disclosure and stable
entry points---not by deleting useful content, flattening the product,
or renaming URLs without evidence.

> **MIG-00A-B :** décisions humaines intégrées (statuts `/guides`, `/coro-incident`, `/plateforme`, `/coro-exercices`, gouvernance des affirmations, validation SEO préalable) : voir §26 de `01-strategy/SITE-ARCHITECTURE-AND-PAGE-BLUEPRINTS.md` (statuts déjà reportés dans ce document).
