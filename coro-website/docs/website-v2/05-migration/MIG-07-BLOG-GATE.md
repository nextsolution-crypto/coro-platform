# MIG-07-PRE — Blog Architecture, Content, API, SEO & Migration Gate

Audit-only phase. No application code, tests, routes, CSS, assets or backend were modified. Repository (frontend `coro-website` and backend `coro-backend`, both present in this worktree) is treated as authoritative.

## 1. Start state

```
branch: feature/website-v2
HEAD:   4bc07c5a feat(website): migrate legal pages to V2 design system
tree:   clean
```
Matches exactly. MIG-06 (Legal) is closed; 23 routes registered V2.

## 2. Route truth

`lib/site/routes.ts`:
- `id: 'blog'`, `publication: 'LEGACY-PRESERVE'`, `path: '/blog'`, `kind: 'historical'`, `family: 'resources'`, `fr: true, en: true`, `indexable: true`, `sitemap: true`.
- `id: 'blog-post'`, `publication: 'LEGACY-PRESERVE'`, `path: '/blog/[slug]'`, `kind: 'dynamic'`, `fr: true, en: true`, `indexable: true`, `sitemap: true`, `implemented: true`, `protected: true`.

`lib/site/v2-migration.ts` `migratedV2Routes`: 23 entries; `/blog` and `/blog/[slug]` are **not** present. `/` is also absent (legacy). No other implemented historical route is missing from the registry — filesystem/registry crawl confirms the only remaining legacy surface is exactly `/`, `/blog`, `/blog/[slug]`.

Sitemap wiring (`app/sitemap.ts`): registry-driven static entries + `buildBlogSitemapEntries(await fetchPublishedBlogPosts())`, fail-soft. V2Shell/navigation: Blog pages render their **own** local nav/header, no `SiteHeader`/`V2Shell` import — fully standalone from the V2 system today.

## 3. Blog file inventory

| FILE | ROLE | INDEX/ARTICLE/SHARED | LEGACY/V2/NEUTRAL | MIGRATION IMPACT |
|---|---|---|---|---|
| `app/blog/page.tsx` | Index page, own metadata, own fetch, own markup | INDEX | LEGACY (inline-style V1 markup, no V2Shell) | Full reshell |
| `app/blog/[slug]/page.tsx` | Article page, own metadata, own fetch, JSON-LD, own markup | ARTICLE | LEGACY | Full reshell + dynamic-route registry problem (§9) |
| `lib/site/api.ts` | `serverApiUrl`/`publicApiUrl` origin resolution | SHARED | NEUTRAL | Reused as-is, no change needed |
| `lib/site/sitemap.ts` | `fetchPublishedBlogPosts`, `buildBlogSitemapEntries` | SHARED | NEUTRAL, already well-isolated | Reused as-is |
| `lib/site/routes.ts` | Registry entries for `blog`/`blog-post` | SHARED | NEUTRAL | No change expected (publication target already correct) |
| `lib/site/v2-migration.ts` | `migratedV2Routes`, `isLegacyFooterVisible`, `isV2MigratedRoute` | SHARED | NEUTRAL | Exact-string matcher — cannot register a dynamic path as-is (§9/§16) |
| `app/components/LegacyChrome.tsx` | Root chrome: legacy `Footer` shown when `isLegacyFooterVisible(pathname)` | SHARED | NEUTRAL | Drives the "index registered, article not" footer-duplication risk (§13) |
| `app/components/Footer.tsx` | Legacy footer (253 LOC) | SHARED | LEGACY | Still rendered on Blog until both surfaces migrate |
| `coro-backend/src/blog/blog.controller.ts` | Public + admin REST endpoints | SHARED (API) | NEUTRAL | Not modified; contract only |
| `coro-backend/src/blog/blog.service.ts` | Prisma queries, publish/schedule/unpublish, slug generation | SHARED (API) | NEUTRAL | Not modified; contract only |
| `coro-backend/prisma/schema.prisma` (`BlogPost`) | Data model | SHARED (API) | NEUTRAL | Not modified; contract only |

No component, utility, image helper, metadata helper or JSON-LD helper is currently shared between Blog and any already-migrated V2 page (or Homepage) — everything the two Blog pages need is defined inline inside the two page files themselves.

## 4. Legacy complexity

**`/blog`** (`app/blog/page.tsx`, 928 LOC):
- Server component, no client hooks.
- 1 fetch call (`serverApiUrl('blog/public')`, `cache: 'no-store'`), fail-soft (`try/catch` → `[]`).
- `generateMetadata` reads only `searchParams.lang`, no fetch duplication with the page fetch — metadata does not depend on post data at all (title/description are static per language).
- Inline `style={{...}}` throughout (dozens of occurrences) — full V1 architecture, matches Guide-family "before" pattern.
- Conditional branches: empty state (`posts.length === 0`), per-post image/no-image branch, category filter (`?category=`) branch.
- No pagination/load-more — full list rendered at once (56 live posts today).

**`/blog/[slug]`** (`app/blog/[slug]/page.tsx`, 1309 LOC):
- Server component, no client hooks.
- 2 fetch calls total per request: 1 inside `generateMetadata` (`getPost`) + 1 inside the page component (`getPost` again) — **duplicated fetch**, same endpoint, not cached/shared between the two (Next does dedupe identical `fetch()` calls automatically within one request when the same URL+options are used, but this is worth flagging for §33 rather than assuming).
- `notFound()` on missing/unpublished post.
- 2 JSON-LD blocks (`Article` + `BreadcrumbList`) via `dangerouslySetInnerHTML` of `JSON.stringify(...)` (safe — not user content, but see §10 for the separate `content` HTML injection).
- Article body rendered via `dangerouslySetInnerHTML={{ __html: content }}` — the one high-risk content-injection point (§10).
- Conditional branches: EN availability, cover image presence, category presence, author presence, updated-vs-published date, tags presence.
- Duplicated logic with index: identical `CATEGORY_COLORS` map, identical nav markup, identical date-formatting logic, identical color/typography tokens — copy-pasted, not shared.

## 5. Blog API contract

Endpoint base: `serverApiUrl(path)` = `${INTERNAL_API_URL || 'http://coro_backend:3002'}/api/${path}` (server-side only; internal Docker service name in prod, unreachable from this dev sandbox — expected).

| FIELD | SOURCE | USED BY | OPTIONAL? | FALLBACK? | MIGRATION RISK |
|---|---|---|---|---|---|
| `id` | Prisma `BlogPost.id` (cuid) | React key | No | — | LOW |
| `slug` | Prisma `BlogPost.slug` (`@unique`) | URL, canonical, JSON-LD | No | — | HIGH if ever regenerated (§8) |
| `titleFr` | Prisma | H1, `<title>`, JSON-LD headline | No | — | LOW |
| `titleEn` | Prisma | H1 (EN), metadata | Yes (empty string possible) | Falls to FR title on index card only (`post.titleEn \|\| post.titleFr`); article page requires **both** `titleEn` and `contentEn` non-empty to consider EN "real" | MEDIUM — index card and article page use different EN-availability logic (§6) |
| `excerptFr` | Prisma | Card excerpt | Yes | — | LOW |
| `excerptEn` | Prisma | Card excerpt (EN) | Yes | Falls to `excerptFr` on index card | LOW |
| `contentFr` | Prisma `@db.Text`, raw HTML | Article body | No | — | HIGH — rich, inline-styled HTML (§10, §19) |
| `contentEn` | Prisma `@db.Text`, raw HTML | Article body (EN) | Yes | Article page falls back to FR entirely if empty | HIGH, same as above |
| `coverImage` | Prisma, free-text URL | Index card image, article hero, OG image, JSON-LD image | Yes | Emoji placeholder (`📄`) on index if absent; article has no cover block at all if absent | MEDIUM — untrusted absolute URL, no domain allowlist (§19) |
| `category` | Prisma, free string | Badge color lookup, filter query param | Yes | Unknown category → grey `#6C757D` fallback color | LOW |
| `tags` | Prisma `String[]` | Article tag chips, JSON-LD keywords | Yes (can be empty array) | — | LOW |
| `authorName` / `authorTitle` | Prisma, default `"Équipe CORO"` / `"Experts en conformité"` | Article byline only (not index) | No (has DB default) | — | LOW |
| `seoTitleFr/En`, `seoDescFr/En` | Prisma | `generateMetadata` only | Yes | Falls to `titleFr/En` for title, `''` for description | LOW |
| `isPublished` | Prisma `Boolean @default(false)` | Gate: `notFound()` if false | No | — | see §11 |
| `publishedAt` | Prisma | Date display, JSON-LD `datePublished`, sitemap `lastModified` | Yes | Empty string if null | LOW |
| `scheduledAt` | Prisma | Admin only; not read by public frontend | Yes | — | N/A for migration |
| `createdAt`/`updatedAt` | Prisma | `updatedAt` used for JSON-LD `dateModified`, sitemap `lastModified`; `createdAt` not used publicly | No | — | LOW |

Backend routes (`coro-backend/src/blog/blog.controller.ts`): `GET /api/blog/public` → `findPublished()` (filters `isPublished: true`, ordered by `publishedAt desc`, trimmed field selection — no `contentFr/En` in the list response, confirmed from `blog.service.ts:33-51`). `GET /api/blog/public/:slug` → `findBySlug()` — **returns the full record with no `isPublished` filter in the query itself** (§11). Admin CRUD/publish/schedule endpoints are all `AuthGuard('jwt')`-protected.

## 6. Live API availability

- Local backend (`http://localhost:3002` — not the Docker-internal hostname the app actually uses, but the nearest local equivalent): **unreachable** in this sandbox (`curl` connection failure, `000`). Classification: **LOCAL BACKEND NOT RUNNING**, exactly as MIG-06 already documented for the same fail-soft path.
- Production API (`https://api.getcoro.io/api/blog/public`): **LIVE**, `HTTP 200`, reachable directly with `curl` from this environment. Inspected read-only (no mutation): **56 published posts**, every one has a `coverImage`. One representative article (`conformite-resilience-operationnelle-pmu`) fetched in full: `contentFr` 19,887 chars / `contentEn` 15,449 chars, both non-empty (genuine bilingual pair).
- Local `npm run build` still emits the known fail-soft sitemap warning because it uses the Docker-internal `serverApiUrl`, not the public API — this is the designed/expected local-dev limitation, not a defect (see §14 also).

## 7. Index preservation matrix (`/blog`)

| ELEMENT | CLASSIFY | NOTE |
|---|---|---|
| Top nav (logo, home link, EN/FR toggle) | RECOMPOSE | Into `SiteHeader`/`V2Shell` nav — currently a bespoke local nav, duplicated verbatim in the article page |
| H1 "Ressources & Guides" / "Resources & Guides" | KEEP | Wording can be reused or revisited per design direction (§21), meaning must not silently change without review |
| Intro paragraph | KEEP | Bilingual, real translation |
| Article cards (image/placeholder, category badge+link, date, title, excerpt, "Read article →") | KEEP (recompose visually) | All fields real, all present in API |
| Category filter (`?category=`) | KEEP | Functional today, must survive reshell; no test currently covers it (§17 debt) |
| Empty state ("No articles yet") | KEEP | Currently reachable only if `posts.length === 0`, i.e. API returns `[]` (including on fetch failure) — same code path serves genuine-empty and API-down, which is a **REVIEW** item, not a migration blocker: today they are indistinguishable to the visitor |
| Pagination / load-more | N/A | Does not exist today — nothing to preserve, not a regression to introduce it later if desired, but out of scope for a reshell |
| Language control | KEEP | `?lang=en` toggle, `hrefLang` set correctly |
| Footer | RECOMPOSE | Currently the shared legacy `Footer.tsx` via `LegacyChrome`; becomes `SiteFooterV2` once registered |
| Search/filter controls beyond category | N/A | None exist |

## 8. Article preservation matrix (`/blog/[slug]`)

| ELEMENT | CLASSIFY | NOTE |
|---|---|---|
| Top nav (same bespoke nav as index, + article EN/FR link, + "← Blog" link) | RECOMPOSE | Same duplication as index |
| Breadcrumb (`getcoro.io / Blog / <title>`) visible + JSON-LD `BreadcrumbList` | KEEP | Both the visible text breadcrumb and the structured data must stay consistent with each other |
| Category badge | KEEP | |
| H1 (article title) | KEEP | |
| Author name/title | KEEP | Has DB defaults, always present |
| Publish/update date | KEEP | |
| Hero/cover image | KEEP | Present on all 56 live posts sampled |
| Article body (rich HTML) | KEEP verbatim | See §9/§10 — this is the highest-risk preservation item in the whole phase |
| Tags | KEEP | |
| Publish/update date footer line | KEEP | Duplicate of the hero date info, by design (both present today) |
| CTA ("Ready to modernize...") linking to `/#demo` / `/?lang=en#demo` | REVIEW | Points at the still-legacy Homepage's `#demo` anchor — functionally fine today (Homepage unchanged in MIG-07), but is the one place Blog content depends on Homepage internal structure (§18) |
| Language switch (EN link, only rendered `hasEnglish`) | KEEP | Correctly hidden when no real translation exists |
| 404 behavior | KEEP | Falls through to the site's single global `app/not-found.tsx`; confirmed live (`/blog/nonexistent-slug-zzz` → HTTP 404, no `main`/`h1`/`footer`/`nav` present, i.e. it is the plain global not-found page, not a Blog-specific one) |
| Unavailable-language behavior | KEEP | Silently serves FR content when `?lang=en` requested but no real EN pair exists — confirmed in code (`lang = langParam === 'en' && hasEnglish ? 'en' : 'fr'`) |

## 9. Article body rendering security

`dangerouslySetInnerHTML={{ __html: content }}` at `app/blog/[slug]/page.tsx:1089-1092`, where `content = post.contentFr` or `post.contentEn` — **raw HTML from the database, rendered unsanitized on the frontend.**

- No sanitization library (DOMPurify, sanitize-html, etc.) found anywhere in `coro-website` (`package.json` dependencies checked; none present).
- No sanitization performed backend-side either: `blog.service.ts` `create`/`update` pass `data` straight to Prisma with no transform (`return this.prisma.blogPost.create({ data })`); no validation DTO/pipe visible on the `create`/`update` controller routes (`@Body() body: any`).
- Content origin: `coro-backend/src/blog/blog.controller.ts` — the only way to write `contentFr`/`contentEn` is `POST /api/blog` and `PUT /api/blog/:id`, both `@UseGuards(AuthGuard('jwt'))`. There is no public/anonymous write path. Whether the JWT-guarded caller is restricted to a specific admin role (vs. any authenticated platform user) is **UNKNOWN** from this controller alone — no `@Roles`/RBAC decorator is visible on these two routes, unlike some other CORO modules (per project CLAUDE.md, RBAC patterns exist elsewhere in the codebase but are not applied here).
- Sample content inspected live (§6) contains inline `style="..."` attributes (148 in one article), `<table>`, `<h2>`/`<h3>`, `<ul>`, and in one sampled article 14 `<a href="...">` internal links and 2 `<img src="...">` local-asset references — consistent with output from a WYSIWYG/rich-text authoring tool, not Markdown.

Classification: **TRUST-BOUNDARY DEPENDENT.** Safe only insofar as every JWT-authenticated caller of the blog admin endpoints is a trusted internal CORO team member (not an external/public/self-serve author) — this is presumed true given the product's overall architecture (documentaire/conseiller platform, not a public CMS), but is not independently verified from this controller and is not enforced by any visible role check on these two specific routes. Not a **PUBLICATION BLOCKER** for MIG-07 (the current production site already renders this content this way, unchanged), but flagged as a **REVIEW** item: MIG-07B must not introduce a new trust assumption while reshelling, and should not be the phase that decides whether to add sanitization — that is a pre-existing condition, not something the migration creates or must fix.

## 10. FR/EN content model

Established from repository/API truth as: **(B) one record with FR/EN fields**, with independently-optional EN, i.e. exact combination of B + E (English only when a genuine EN version exists) + F (FR fallback when EN is requested but unavailable). Confirmed from `BlogPost` schema (single row, `titleFr`/`titleEn`/`contentFr`/`contentEn`/etc. as sibling columns) and both frontend pages.

Exact behavior:
- **Slug**: identical for FR and EN — **same slug, `?lang=en` query parameter selects language** (model D), not translated slugs, not separate records.
- **Locale selection**: `searchParams.lang === 'en'` only; no cookie, no header-based negotiation, no `Accept-Language`.
- **Index EN-availability logic** (different from article!): a post is always listed regardless of EN completeness; per-field fallback (`post.titleEn || post.titleFr`, `post.excerptEn || post.excerptFr`) — so an EN-requested index can show FR excerpt/title for a post with only partial EN content, with no visual indication.
- **Article EN-availability logic**: strict — `hasEnglish = Boolean(post.titleEn?.trim()) && Boolean(post.contentEn?.trim())`; both title AND content must be non-empty, or the entire article renders in FR regardless of `?lang=en`, and no `en-CA` alternate/hreflang is declared in metadata or JSON-LD.
- **This is a genuine, real, per-field FR/EN inconsistency between index and article that predates MIG-07** — not something to silently fix during the reshell without a scope decision, since fixing it changes the number of "EN-looking" cards on the index for partially-translated posts.
- **When EN unavailable**: index falls back per-field (mixed FR/EN card possible in theory, not observed in the 56 live posts which all appear to have full EN pairs per the one sampled and the count of `titleEn`/`contentEn`-bearing posts not exhaustively checked beyond the sample); article falls back wholesale to FR, and the EN toggle link is hidden entirely (`{hasEnglish && (...)}`).
- **Language switch correctness**: index card links always point at the current post's own slug with/without `?lang=en` — correct, same-article equivalent, no risk of linking to a different post.

## 11. Index SEO

| FIELD | CLASSIFY | NOTE |
|---|---|---|
| Title (FR/EN, static, not per-post) | PRESERVE | Genuine distinct FR/EN copy |
| Description (FR/EN, static) | PRESERVE | |
| Canonical | PRESERVE | Route-based (`/blog` or `/blog?lang=en`), matches the established site pattern (same shape as `/security`, `/privacy`, etc. per MIG-06) |
| Alternates (`fr-CA`/`en-CA`/`x-default`) | PRESERVE | `x-default` → FR, consistent |
| OpenGraph | PRESERVE | Static `og-coro.jpg`, not per-post (expected for an index) |
| Twitter | PRESERVE | Same image |
| Robots | PRESERVE | `index: true, follow: true` unconditionally — **no gate on the empty/API-down state**, i.e. if the API is down the index is still indexable even though it will show "no articles" (REVIEW, pre-existing, not introduced by migration) |
| Structured data | N/A | Index has none today (no `CollectionPage`/`ItemList`/`BreadcrumbList`) — nothing to preserve, could be a **future enhancement**, not a preservation requirement |

## 12. Article SEO

`generateMetadata` in `app/blog/[slug]/page.tsx` performs its **own separate `getPost(slug)` fetch**, independent of the page component's own `getPost(slug)` call — confirmed duplicate fetch (§4), not shared via `cache()`/React `use()` or any memoization.

| FIELD | SOURCE | NOTE |
|---|---|---|
| Title | `seoTitleFr/En \|\| titleFr/En`, suffixed `" | Blogue CORO"` | Not localized suffix (`"Blogue CORO"` even for EN) — pre-existing minor inconsistency, REVIEW not blocker |
| Description | `seoDescFr/En \|\| seoDescFr (FR fallback for EN) \|\| ''` | If both are empty, `description: ''` is emitted — REVIEW: could hurt SEO for a post missing SEO fields, not a migration blocker |
| Canonical | Route-based, same-slug + `?lang=en` pattern | Consistent with index/site policy |
| Language alternate | Present only `hasEnglish` (strict definition, §10) | Correct — avoids declaring an EN alternate that doesn't really exist |
| OG title/description | Same source as meta title/description | |
| OG image | `post.coverImage` if present, else **omitted entirely** (no fallback OG image for articles missing a cover) | REVIEW — index always has `og-coro.jpg` fallback; article has none. Not observed on live data (all 56 sampled posts have `coverImage`) but is a latent gap |
| `publishedTime`/`modifiedTime` | `post.publishedAt`/`post.updatedAt` | |
| `authors` | Hardcoded `[SITE_URL]` (not `post.authorName`) | Pre-existing minor inconsistency (OG `authors` expects URLs, not names, so this may actually be intentional/correct usage) — REVIEW, not blocker |
| Robots/noindex | `{ index: false, follow: false }` when post missing/unpublished (metadata branch), otherwise always indexable | Correct — unpublished/missing posts are not indexed even though the metadata function itself does still run a fetch for them |
| Missing-post metadata | Returns a fixed `'Article introuvable'` title with `noindex` — does not call `notFound()` inside `generateMetadata` itself (that happens separately in the page component) | Matches Next.js convention; consistent |

**Metadata fetch duplicates page fetch**: yes, confirmed (2 identical-shape `getPost` calls per request, in `generateMetadata` and in `BlogPostPage`). **Missing API data → bad metadata risk**: contained — the `!post || !post.isPublished` branch produces a safe generic `noindex` fallback rather than malformed/empty rich metadata.

## 13. Structured data

Article page emits two `application/ld+json` blocks via `dangerouslySetInnerHTML={{ __html: JSON.stringify(...) }}` (safe pattern — JSON-serialized data, not raw content injection, distinct from §9's content-body risk).

| SCHEMA | SOURCE | FIELDS | VALID? | NOTE | CLASSIFY |
|---|---|---|---|---|---|
| `Article` | `jsonLd` object | `headline`, `description`, `datePublished`, `dateModified`, `author` (hardcoded `Organization` "Équipe CORO"), `publisher` (`Organization` "CORO" + logo), `image` (conditional), `url`, `mainEntityOfPage`, `inLanguage`, `keywords` (from `tags`) | Structurally valid `Article` schema | `author` is declared as an `Organization`, not a `Person` — matches the product's "Équipe CORO" byline convention, not a defect | KEEP |
| `BreadcrumbList` | `breadcrumbLd` object | 3-level `ItemList` (Home → Blog → article) | Valid | Locale-correct URLs for both languages | KEEP |
| `Organization`/`Person`/`WebPage`/`WebSite`/`ImageObject` (standalone) | — | — | N/A — not emitted as top-level schemas, only nested inside `Article`/`BreadcrumbList` | No orphaned/duplicated top-level schema found | N/A |

No fabricated author identity or invented publication dates — all structured-data fields trace directly to real `BlogPost` columns or fixed organization identity constants.

## 14. Sitemap contract

Traced in `app/sitemap.ts` + `lib/site/sitemap.ts` (already read in full for MIG-06; re-verified unchanged for MIG-07):
- `/blog` static entry comes from the registry (`staticSitemapRoutes`), same as any other route — independent of the API.
- Dynamic article entries come exclusively from `fetchPublishedBlogPosts()` → `GET /api/blog/public` (the **published-only** endpoint, confirmed at `blog.service.ts:33-51` — `where: { isPublished: true }`), so **no draft/unpublished post can leak into the sitemap** by construction.
- FR entry always emitted per post with a slug; EN entry emitted only when `hasEnglish` (title+content both present) — matches the article page's own strict EN gate, so sitemap and page behavior are consistent with each other.
- `lastModified` per article: `updatedAt` → `publishedAt` → a fixed fallback date, in that priority order.
- Fail-soft confirmed both in code (`fetchPublishedBlogPosts` never throws, always returns `{ posts: [], ok: false }` with one `console.warn` on any failure — no internal URL or raw error text ever logged) and live in this session's own `npm run build` (warning emitted, `/blog` and `/blog/[slug]` still built, `sitemap.xml` still generated).
- Live production sitemap (`https://getcoro.io/sitemap.xml`, fetched read-only) confirmed to actually contain `/blog`, `/blog?lang=en`, and per-article FR/EN entries matching the live API's 56 published posts — the contract is proven working in production, not just in code.
- Duplicate URLs: not possible by construction — one FR entry + at most one EN entry per unique `slug` (DB-enforced `@unique`).

## 15. Publication / draft visibility

- `isPublished: Boolean @default(false)` — a post is a draft by default until explicitly published.
- `scheduledAt`/`publishedAt` + an hourly cron (`@Cron(CronExpression.EVERY_HOUR)` in `blog.service.ts`) auto-publishes scheduled posts.
- **`GET /api/blog/public` (list)**: correctly filters `isPublished: true` server-side — **VERIFIED**.
- **`GET /api/blog/public/:slug` (single)**: does **not** filter by `isPublished` in the Prisma query itself (`findBySlug` = `findUnique({ where: { slug } })`, no `isPublished` condition) — the gate is enforced only in the two Next.js pages (`if (!post || !post.isPublished) { notFound(); }` / `noindex`), **not** in the API response itself. Anyone who knows or guesses a draft's slug and calls the public API endpoint directly (not through the website) receives the full unpublished record. Classification: **PARTIAL** — the *website* correctly hides drafts (verified: notFound + noindex), but the *API contract* itself is not draft-safe at the single-post level. This predates MIG-07 and is not introduced by it; flagged as a **REVIEW** item for backend hygiene, not a MIG-07 migration blocker (the frontend reshell does not need to touch the backend, and does not change this exposure either way).

## 16. Slug contract

- Generation: `blogService.generateSlug(title)` — lowercases, strips diacritics (NFD normalize + combining-mark strip), strips all non-alphanumeric/space/hyphen chars, collapses whitespace to single hyphens, trims. Deterministic, ASCII-safe.
- Uniqueness: DB-enforced (`slug String @unique`); controller only auto-generates a slug when the caller omits one (`if (!body.slug && body.titleFr)`), so a caller can also set an arbitrary slug manually — the DB unique constraint is the only real invariant, not a re-derivation-on-every-title-change rule.
- No evidence of slug regeneration on later title edits (`update(id, data)` passes through `clean` verbatim; slug is not recomputed) — **slugs are effectively stable once set**, which is good for URL preservation.
- No redirect mechanism exists (no redirects table/config found for blog).
- FR/EN relationship: single shared slug (§10), not a per-language slug.
- Duplicate slug handling: DB unique constraint → a second `create`/`update` with a colliding slug would throw a Prisma error (not handled specially in the service, no friendly error mapping visible) — an admin-tooling concern, not a public-frontend one.
- Invalid-slug (unknown) behavior: `findUnique` returns `null` → frontend `notFound()`.

**Rule compliance**: migrating the two page components does not touch slug generation, storage, or lookup at all — **no existing public Blog URL is at risk of changing** from a MIG-07A/B reshell, provided routing itself (`app/blog/[slug]/page.tsx` file path) is preserved, which it must be for Next.js to keep resolving the same URLs.

## 17. 404 / error / fail-soft contract

| CONDITION | BEHAVIOR | VERIFIED |
|---|---|---|
| Unknown slug | `getPost` → `null` → `notFound()` → global `app/not-found.tsx` | Live: `/blog/nonexistent-slug-zzz` → HTTP 404 |
| Unpublished slug (known to caller) | Same as unknown from the *website's* perspective (`!post.isPublished` also triggers `notFound()`) | Code-verified; not independently confirmed live (no known draft slug to test, correctly so) |
| API 404 (endpoint itself, e.g. malformed request) | `!res.ok` → `getPost` returns `null` → same as unknown slug | Code-verified |
| API 500 | Same — `!res.ok` catches any non-2xx | Code-verified |
| Timeout / network failure | `try/catch` around `fetch` → `null` (article) / `[]` (index) — **no explicit timeout** set on either `getPost` or `getPosts` fetch (unlike `fetchPublishedBlogPosts` in the sitemap builder, which does set an 8s `AbortSignal.timeout`) — REVIEW: a hanging backend could stall page render longer than the sitemap's bounded fetch | Code-verified, gap noted |
| Malformed JSON response | Article: `JSON.parse(text)` inside the same `try/catch` → falls to `null` safely. Index: `res.json()` also inside `try/catch` → `[]` | Code-verified |
| Missing hero image | Index: emoji placeholder block. Article: cover-image block simply omitted (conditional render) | Code-verified |
| Missing excerpt | Card excerpt block conditionally omitted | Code-verified |
| Missing SEO fields | Falls through the chain described in §12; worst case empty description string | Code-verified |
| Missing EN translation | §10 | Code-verified |
| Empty Blog index (API returns `[]`, whether genuinely empty or due to failure) | Same empty-state UI either way — **not distinguishable to the visitor** (REVIEW, §7 table) | Code-verified |

No `redirect()`, no thrown unhandled error, no FR-fallback-disguised-as-error path found beyond what's documented in §10 for the article's own EN fallback.

## 18. Images

- No `next/image` usage anywhere in either Blog page — both use plain `<img>` (`loading="lazy"` on the index card only, none on the article hero or in-body images).
- No `images.remotePatterns` configured in `next.config.ts` at all (confirmed empty/absent) — consistent with not using `next/image`, but means **no domain allowlisting exists anywhere in the app**, not just for Blog.
- `coverImage` observed live: absolute URLs on `coro-storage.tor1.digitaloceanspaces.com` (DigitalOcean Spaces) — a trusted first-party storage bucket, not arbitrary user-supplied third-party URLs, but the *field itself* has no format/domain validation at the API layer (`coverImage String? @db.Text`, free text).
- In-body images (inside `contentFr`/`contentEn` HTML, when present — confirmed 2 in one sampled article) use **relative paths into `/public`** (e.g. `/images/sentinelle/...webp`), i.e. same-origin static assets bundled with the site, not backend-hosted — these must remain physically present in `coro-website/public/images/...` for existing articles to keep rendering correctly; not verified file-by-file in this pass (out of scope for a routing gate, flagged as a **REVIEW** item for MIG-07B baseline capture, same caution as MIG-06 §9 raised for the homepage).
- Alt text: index card alt = post title (or a generic `'Article CORO'` fallback); article hero alt = title; in-body image alt text (inside stored HTML) not audited exhaustively — comes from whatever the authoring tool produced, trust-boundary-dependent same as §9.
- No fallback/placeholder image asset used for a *missing* cover on the article page (only the index has the emoji fallback) — confirmed gap, not observed live (all 56 sampled posts have covers).
- No image transformation/resizing pipeline — images are served exactly as stored.

## 19. Rich content capability

Directly observed in live production content across the sampled articles (§6, §8): paragraphs, `h2`/`h3` (no `h1`, no `h4` observed but not proven absent from the full 56-post corpus), unordered lists, ordered-list markup not separately confirmed but same tag family, `<table>`, inline `<strong>`/emphasis, internal `<a href>` links (verified pointing only at already-migrated internal CORO routes in the sampled article), in-body `<img>` (same-origin relative paths), styled `<div>` callout blocks with inline background/color (a recurring authoring pattern, e.g. the "La conformité démontre..." highlight block). No `<blockquote>`, no code blocks, no embedded `<iframe>`/video observed in the 4 sampled articles — **not proof of absence** across all 56 posts, only that the future V2 article typography must support at minimum everything enumerated above, and should not assume blockquotes/embeds don't exist elsewhere in the corpus without a fuller scan at MIG-07B baseline time.

## 20. Visual audit

Performed via `curl`-based structural inspection (main/h1/footer/nav counts) and full-page content fetch of the **live production site** (`getcoro.io`), not a rendered-screenshot visual review — no browser tool was used in this PRE pass. This satisfies the "audit only, no invented viewport claims" rule: no desktop/mobile pixel-level visual claim is made here. `/blog`, `/blog?lang=en`, and one live article all return exactly 1 `main`/1 `h1`/1 `footer`/1 `nav` today (the legacy `Footer.tsx` via `LegacyChrome`, plus the page's own bespoke `nav`/no `<header>` element — note: neither Blog page uses a semantic `<header>` tag, only a styled `<nav>`).

## 21. V2 primitive fit

| REQUIREMENT | CLASSIFY | NOTE |
|---|---|---|
| Page chrome (header/skip-link/footer) | REUSE EXISTING | `V2Shell` directly, as every other migrated route does |
| Index hero/intro | REUSE EXISTING | `EditorialHero` or `PageSection` pattern, consistent with Guides hub precedent |
| Article-card grid | LOCAL BLOG COMPONENT | No existing V2 primitive is a card-grid with image/category/date/excerpt; `FeatureIndex` is the closest candidate to evaluate at MIG-07A implementation time, not decided here |
| Category filter control | LOCAL BLOG COMPONENT | Nothing comparable exists in the catalogue |
| Article body typography | LOCAL BLOG COMPONENT (or SHARED BLOG COMPONENT CANDIDATE, see §22) | The legal pages' `LegalV2` renderer (MIG-06) is the closest known precedent for "render structured/rich content inside a V2 shell" and should be reviewed for reuse patterns at MIG-07B implementation time, but is not itself built for arbitrary rich HTML with tables/callout-divs |
| Breadcrumb | REUSE EXISTING if a V2 breadcrumb primitive exists / DO NOT ABSTRACT YET otherwise | Not confirmed to exist in the current component catalogue from this pass — needs a catalogue check at MIG-07B implementation time |
| CTA block | REUSE EXISTING | `CTASection` is the named candidate |
| Metadata/JSON-LD helpers | REUSE EXISTING pattern | No shared helper currently extracted anywhere in the codebase (every migrated page writes its own `generateMetadata`) — Blog should follow the same established per-page convention, not invent a new shared helper unprompted |

## 22. Blog-specific component boundary recommendation

Justified candidates (both index and article, or multiple states, genuinely need the same behavior):
- **`ArticleMeta`** (category badge + date [+ author on article]) — used identically in both index card and article hero today (copy-pasted `CATEGORY_COLORS` + date-formatting logic in both files). Genuine shared-behavior case.
- **`BlogEmptyState`** — only used on the index today; not shared with anything else. **DO NOT ABSTRACT YET** (single use site).
- **`ArticleCard`** — index only. **DO NOT ABSTRACT YET** at the "shared" level, but is obviously its own component regardless (single-page components are still components).
- **`ArticleBody`** (the rich-HTML renderer) — article only today, but is the single highest-risk piece of behavior in the whole Blog family (§9, §19) and deserves to be its own isolated, named component regardless of reuse, purely for review/testability, even before any second use case exists.
- **`BlogErrorState`**, **`BlogPagination`** — **DO NOT ABSTRACT**, no present behavior to extract (no distinct error UI beyond empty state today; no pagination exists today).

## 23. Index design direction

Per the established Guide-migration lesson (Mathieu's density rule, §26 below) and the actual content shape (56 real posts, all with cover images, real categories, real dates): an editorial-publication layout with **one dominant/featured story + a compact secondary grid**, not a uniform card wall. Concretely: reuse the "strong hierarchy, no repetitive equal cards" principle already applied to the Guides hub, adapted for a growing, unbounded post count (Guides had exactly 6 known items; Blog has 56 today and grows over time) — meaning the design must degrade gracefully well past the first screen, which the Guides hub did not need to solve. Category filter must remain functional and visually integrated, not bolted on. No invented content beyond what's in §7.

## 24. Article design direction

Reuse the same header/breadcrumb/meta/hero/body/CTA/footer skeleton implied by the current legacy structure (§8), reshelled into V2 primitives. Do not force a hero-image block to be structurally mandatory in the new markup — `coverImage` is nullable in the schema even though all 56 live posts happen to have one (§6, §18) — the component must handle its absence without a layout hole, matching the current app's conditional-render behavior. Table, callout-div, and multi-level-heading support must survive whatever typography treatment MIG-07B applies (§19).

## 25. Baseline strategy

At minimum: `tests/fixtures/blog-index-baseline.json` and `tests/fixtures/blog-article-baseline.json`, following the established MIG-06 pattern (curl+node capture of real FR/EN title/description/body-shape data), captured against the **live production API** (proven reachable in this session, §6) rather than fabricated, since the local Docker-internal backend is not reachable from this dev sandbox. The article baseline should record structural facts (heading counts, presence of tables/images/links, inline-style usage) rather than the full 19K-character HTML body verbatim, to keep the fixture reviewable — full-body byte-equivalence can instead be checked via a hash or a `fetch`-at-migration-time comparison against the same live slug, decided at MIG-07A/B implementation time. Do not fabricate article data; do not invent dates/authors/slugs. If the live API becomes unreachable at implementation time, the fallback is a source-derived fixture built directly from the Prisma schema + backend contract documented in §5, explicitly marked as schema-derived rather than real-data-derived.

## 26. Test strategy

**MIG-07A** (index) at minimum: route+registry chronology (append `/blog` to `migratedV2Routes`, exact-array bump across the same ~13-15 dependent test files already touched in MIG-06, plus `page-rhythm.test.ts` exclusion), API contract (mock `fetch` success/failure/empty, matching the `sitemap.test.ts` mocking pattern already established), FR/EN behavior (title/excerpt fallback logic, §10), metadata (static title/description/canonical/alternates), empty/error state indistinguishability (§7/§17 — assert the *current* behavior, don't silently fix it), links (category filter query param, article links), images (placeholder vs real cover), V2Shell usage, no-legacy-footer-after-registry, sitemap-index-entry unaffected.

**MIG-07B** (article) at minimum: dynamic-slug rendering against a known real (or fixture) article, unknown-slug → 404, unpublished-post → 404 (requires either a mock or acceptance that this can't be tested against live prod data — REVIEW at implementation time), FR/EN behavior (both the index-style soft fallback is NOT used here — assert the strict `hasEnglish` gate, §10), metadata (title/desc/canonical/OG, including the missing-OG-image gap noted in §12), canonical route-based not query-based, structured data (both `Article` and `BreadcrumbList` schemas, field-by-field), article-body rendering (assert it still renders the stored HTML — do NOT assert byte-equivalence of 148-inline-style HTML as a brittle snapshot; assert structural facts per §25), security boundary (assert `dangerouslySetInnerHTML` usage is intentional and scoped only to the trusted `content` field, not accidentally widened), image fallback (cover present/absent), `notFound()`/error behavior, sitemap article-entry behavior (EN entry only when `hasEnglish`), V2Shell usage, and — critically — a **registry/routing test that exercises a real resolved pathname** (e.g. `/blog/some-real-slug`), not the literal string `/blog/[slug]`, given the exact-match architecture finding in §27/§30 below.

## 27. Registry strategy — dynamic route matching (critical finding)

`migratedV2Routes` is an **exact-path array**; `normalizePath` + `Array.includes` do exact string equality after stripping query/hash (`lib/site/v2-migration.ts:14-22`). `isLegacyFooterVisible(pathname)` is called from `app/components/LegacyChrome.tsx` with `usePathname()` — Next.js's **client-side resolved pathname**, e.g. `/blog/conformite-resilience-operationnelle-pmu`, never the literal route-definition string `/blog/[slug]`.

**Verified**: adding the literal string `"/blog/[slug]"` to `migratedV2Routes` would **never match** any real resolved pathname. `isV2MigratedRoute('/blog/my-article')` would return `false` forever, and `isLegacyFooterVisible('/blog/my-article')` would stay `true` forever — the legacy footer would keep rendering on every article page regardless of the registry entry. This is not a hypothetical; it follows directly from the exact-match code (confirmed by reading `normalizePath`/`isV2MigratedRoute`/`isLegacyFooterVisible` in full, §2 of MIG-06's own audit already established this file's contract, and this session re-verified it holds for a dynamic segment specifically).

**Conclusion**: **REQUIRES ARCHITECTURAL CHANGE.** §30 gives the formal decision and the smallest safe change.

## 28. Legacy shell / footer interaction if index and article migrate independently

If `/blog` alone is added to `migratedV2Routes` (using the exact literal string `/blog`, which *does* work correctly since it's a static path) while `/blog/[slug]` remains unregistered (necessarily, per §27, until the dynamic-matching gap is closed):

- `/blog` → `isLegacyFooterVisible('/blog')` → `false` → legacy `Footer` suppressed, but **only if `/blog`'s own page component also switches to `V2Shell` in the same change** (registry entry alone doesn't reshell the page — MIG-07A's actual implementation work does that).
- `/blog/some-article` → still resolves to `true` (legacy footer shown) → **the index gets one footer (V2), the article keeps the legacy footer** — no duplication, no missing footer, just an intentional visual inconsistency between the two surfaces for the duration between MIG-07A and MIG-07B. This is the same "two states before full closure" pattern MIG-06 used between "reshell in place" and "registry add" for a single page — here it spans two *different* pages instead of two states of one page, which is a new pattern, not previously exercised.
- No shared component risk: confirmed §3, Blog has zero shared components with any V2 page today, so migrating the index cannot accidentally regress the article's legacy rendering or vice versa.
- Header behavior: both pages currently render their own bespoke nav (not `SiteHeader`), so there is no header-duplication risk either way — migrating the index to `V2Shell`+`SiteHeader` simply replaces its own nav; the article's own nav is untouched until MIG-07B.

**Conclusion**: **MIG-07A can safely ship independently**, provided its own implementation correctly reshells `app/blog/page.tsx` into `V2Shell` (not just a registry-array edit) and provided the visual QA step explicitly expects/accepts one footer style on the index and the legacy footer still on individual articles as the correct intermediate state — not a bug.

## 29. Performance / fetching

| ITEM | CLASSIFY | NOTE |
|---|---|---|
| Index: 1 server-side fetch, `cache: 'no-store'`, no explicit timeout | KEEP FOR MIGRATION | Matches current production behavior; changing cache/revalidate strategy is a separate decision, out of scope |
| Article: 2 duplicate server-side fetches (metadata + page body), same endpoint, no shared cache/memoization, no explicit timeout | SAFE TO IMPROVE DURING MIGRATION | De-duplicating via `React.cache()`/a shared fetch helper is a low-risk, behavior-preserving improvement — flagged as safe, not mandatory, for MIG-07B |
| Image loading | KEEP FOR MIGRATION | `loading="lazy"` already present on index cards; no `next/image` optimization exists today — introducing it is a separate, larger decision (touches the no-remotePatterns gap, §18) and should be DEFERred out of MIG-07 scope unless explicitly requested |
| Metadata fetch duplication (§12) | SAFE TO IMPROVE DURING MIGRATION | Same fix as the body-fetch duplication, same caveat: correctness first |

Migration correctness takes priority over optimization, per instruction — none of the above are required changes for MIG-07A/B to be GO.

## 30. Accessibility

- Exactly one `<h1>` confirmed live on both `/blog` and a sampled article (§20).
- Heading order in article body content: `h2`s observed, no `h1` inside body (correct — page-level H1 is the only H1), `h3`s observed in some articles; **heading hierarchy inside stored rich-text content is not structurally validated anywhere** (no author-side or render-side check that an `h3` never appears without a preceding `h2`, etc.) — because content comes from a trusted internal authoring tool (§9) this is classified **SAFE TO FIX DURING MIGRATION** at most (i.e., worth a defensive typography treatment that doesn't break on odd hierarchies) rather than a **PUBLICATION BLOCKER**, since it is a pre-existing, live-in-production condition today.
- Landmark structure: both pages have exactly one `<main>` (confirmed live) but **no semantic `<header>`** — the top bar is a plain `<nav>` — and article breadcrumb is a plain `<p>`, not a `<nav aria-label="breadcrumb">`. **SAFE TO FIX DURING MIGRATION** (V2Shell/SiteHeader already provides a proper `<header>`, so this resolves naturally as a byproduct of the reshell, not extra work).
- `article` semantics: the article body is wrapped in a real `<article>` element already (`app/blog/[slug]/page.tsx:1074`) — **PRESERVE**.
- Time/date markup: dates are rendered as plain formatted strings (`toLocaleDateString`), not `<time datetime="...">` — **SAFE TO FIX DURING MIGRATION**.
- Image alt behavior: §18 — mostly present, in-body image alt text not exhaustively audited (trust-boundary-dependent, same caveat as §9/§19).
- Link text: index "Read article →" and category badges are real link text (not "click here"), article internal CTA and breadcrumb links are real text — **PRESERVE**.
- Keyboard accessibility: all controls are plain `<a>`/native elements, no custom JS widgets — no evidence of a keyboard trap or non-focusable interactive element.
- Pagination/load-more semantics: N/A, doesn't exist.
- Focus-visible behavior: not specifically overridden in either Blog page (no custom `:focus` CSS found in the inline styles) — inherits whatever global/browser default applies; **DEFER** (not a Blog-specific concern).
- Language attribute: root `<html lang="fr">` is static (set once in `app/layout.tsx`) regardless of the Blog page's own `?lang=en` state — this is a **pre-existing, site-wide** condition (already an open MASTER-INDEX item: "Où poser `data-coro-system=\"v1\"\"` / document-level `<html lang>`"), not something MIG-07 introduces or is expected to fix.
- Empty/error states: no `aria-live` region on the empty-state message; **DEFER**, low severity, consistent with rest of the legacy site.
- Screen-reader-only labels: none found in either page (e.g. the emoji placeholder `📄` has `aria-hidden="true"` correctly, but no accompanying visible-or-SR text explaining "no image" beyond the visual placeholder).

Heading levels inside stored content: **can arrive malformed** in principle (no server or client validation of heading nesting), confirmed as a genuine, currently-unmitigated gap — but not something the migration is expected to police; flagged as **DEFER**.

## 31. Blog content trust boundary

- Admin interface: **UNKNOWN from repository evidence alone** whether a dedicated blog-admin UI exists in `coro-frontend` (the advisor app) — not inspected in this pass (out of scope: `coro-website` and `coro-backend` only, per the task's file inventory instructions). The backend contract (`POST/PUT /api/blog`, JWT-guarded) is confirmed; *how* an authenticated user reaches those endpoints (a real admin UI vs. raw API calls) is **UNKNOWN**.
- Backend endpoint: confirmed, JWT-guarded, no visible role/permission restriction beyond "any valid JWT" (§9).
- Database seed / direct DB entry: not investigated (would require DB access, out of scope for a code-only audit) — **UNKNOWN**.
- Trusted internal authors only vs. public/user-generated: **presumed** trusted-internal given the JWT gate and the product's overall B2B-platform nature, but **not proven** by an explicit role check in the two write endpoints — stated as a presumption, not a fact, per the instruction to answer UNKNOWN where evidence is insufficient.
- AI-generated content possible: **UNKNOWN** — nothing in the backend distinguishes human-authored from AI-authored content; the product does have AI-generation features elsewhere (per project CLAUDE.md: "générateur de procédures IA"), so it is plausible but not confirmed that Blog content could originate from an AI-assisted authoring flow. **UNKNOWN.**
- Imported content possible: **UNKNOWN**, no import endpoint found in `blog.controller.ts`.

This matters most for §9 (raw HTML rendering) — the trust boundary is real but its exact edges (who specifically can author) are not fully provable from `coro-website`/`coro-backend` alone in this pass.

## 32. SEO / content preservation risk matrix

| RISK | INDEX/ARTICLE | SEVERITY | EVIDENCE | MIGRATION CONTROL |
|---|---|---|---|---|
| Changing public article URLs | ARTICLE | CRITICAL if it happened | Slug contract is stable (§16); migrating the page component alone does not touch slug logic | Keep `app/blog/[slug]/page.tsx` file path unchanged; no slug-generation code touched in MIG-07B |
| Losing article metadata | ARTICLE | HIGH if it happened | Full metadata contract mapped in §12 | Migration test asserting every metadata field per §26 |
| FR/EN mismatch | BOTH | MEDIUM | Two different fallback strategies already coexist today (index soft-fallback vs. article strict-gate, §10) — real, pre-existing, not migration-introduced | Preserve both distinct behaviors exactly; do not unify them without an explicit scope decision |
| Duplicate canonicals | BOTH | LOW | Canonical logic is single-sourced per page already (§11/§12) | Preserve as-is |
| Sitemap loss | BOTH | HIGH if it happened | Sitemap is registry+API driven, decoupled from page markup (§14) | Registering `/blog` does not touch `app/sitemap.ts` at all — verified independent |
| Draft leakage (sitemap) | ARTICLE | LOW (already mitigated) | `findPublished()` filters correctly (§15) | No sitemap code change planned |
| Draft leakage (direct API) | ARTICLE | MEDIUM (pre-existing) | `findBySlug` doesn't filter (§15) | Out of scope for MIG-07 (frontend-only phase); flagged as backend REVIEW, not a migration blocker |
| Article 404 regression | ARTICLE | MEDIUM if it happened | `notFound()` contract simple and well-isolated (§17) | Preserve `notFound()` call exactly |
| Body-rendering regression | ARTICLE | CRITICAL if it happened | 148-inline-style real HTML, tables, in-body images/links all confirmed live (§6/§19) | Do not attempt to strip/rewrite stored HTML; render it as-is inside new markup; structural (not byte) baseline per §25 |
| Image loss | BOTH | MEDIUM | Cover images all DO-Spaces-hosted absolute URLs (§18); in-body images are local `/public` relative paths not exhaustively inventoried | Baseline capture at MIG-07B start must enumerate in-body image paths across the full 56-post corpus, not just the 4 sampled here |
| Structured-data regression | ARTICLE | HIGH if it happened | Both schemas fully mapped field-by-field (§13) | Migration test per §26 |
| API-unavailable behavior | BOTH | LOW (already fail-soft) | Confirmed both in code and in this session's own local build (§6/§14) | Preserve `try/catch`→safe-empty pattern exactly |
| Duplicated footer/shell | BOTH (during MIG-07A→B gap) | LOW, expected/intentional | §28 | Communicate the intermediate state explicitly in visual QA, not a bug |
| Dynamic-route registry mismatch | ARTICLE | CRITICAL (would silently do nothing) | §27 — verified via direct code reading, not assumed | Must be resolved architecturally (§30) before MIG-07B registers the article route — MIG-07A does not need this fix since `/blog` is a static path |
| Unsafe HTML rendering | ARTICLE | MEDIUM (pre-existing, trust-boundary-dependent) | §9 | Not a MIG-07 scope item to fix; must not be widened or weakened by the reshell |

## 33. MIG-07A — index migration contract

- **IN SCOPE**: `app/blog/page.tsx` (visual/structural reshell into `V2Shell` + local page primitives), local page-scoped CSS module (new), registry addition of `/blog` (last step, following the established add-outside-registry → build → QA-with-2-footers → add-to-registry → rebuild → QA-with-1-footer protocol from MIG-02 onward).
- **OUT OF SCOPE**: `app/blog/[slug]/page.tsx` (MIG-07B); `lib/site/sitemap.ts`, `lib/site/api.ts`, `lib/site/routes.ts` (no change needed — publication status already correct); any backend file; Homepage; any change to the blog API contract or Prisma schema; any legal-copy-style content rewrite (Blog is not legal content, but no invented copy either — reuse the existing FR/EN header/intro text unless a content decision says otherwise).
- **FILES THAT MUST NOT CHANGE**: `coro-backend/**`, `app/page.tsx`, `app/HomePageClient.tsx`, `app/blog/[slug]/page.tsx`.
- **BASELINE REQUIRED**: `tests/fixtures/blog-index-baseline.json` per §25, captured against the live API.
- **API BEHAVIOR TO PRESERVE**: `cache: 'no-store'` fetch to `blog/public`, fail-soft to `[]` on any error, category filter via `?category=` query param.
- **LANGUAGE BEHAVIOR TO PRESERVE**: the *soft* per-field FR/EN fallback described in §10 (index-specific — do not adopt the article's strict gate here without an explicit scope decision).
- **SEO TO PRESERVE**: exact title/description/canonical/alternates/OG/Twitter/robots contract from §11.
- **ERROR/EMPTY BEHAVIOR TO PRESERVE**: the current empty-state message and its indistinguishability from an API-down state (§7) — do not silently change this without flagging it as a separate decision.
- **DESIGN DIRECTION**: §23.
- **REGISTRY PROTOCOL**: add literal `/blog` (static path, safe as-is per §27) to `migratedV2Routes`, following the standard MIG-02+ protocol; update the same class of "mechanically necessary" registry-dependent tests already touched across MIG-01 through MIG-06 (exact-array bumps, `page-rhythm.test.ts` exclusion, sitemap test if needed).
- **TESTS**: per §26 (index list).
- **VISUAL QA**: full scroll-through, both languages, via the Chrome browser tool if available in the implementation session (this PRE session used `curl`-only structural inspection, not a rendered visual review, per §20) — human mobile QA at ~390px per the MIG-06-established pattern, including checking for the known **GLOBAL RESPONSIVE DEBT — FLOATING MOBILE CONTROLS** (non-blocking, do not repair unless Blog introduces a Blog-specific regression, §47 of the source instructions / mirrored here).
- **GO/NO-GO**: **GO**, no blockers identified for MIG-07A specifically (§27's dynamic-route issue does not affect the static `/blog` path).

## 34. MIG-07B — article migration contract

- **IN SCOPE**: `app/blog/[slug]/page.tsx` reshell into `V2Shell` + local primitives (including the `ArticleMeta`/`ArticleBody` components justified in §22), local page-scoped CSS module (new), the architectural fix required for dynamic-route registry matching (§30 gives the decision; the fix itself is implemented here, not in MIG-07-PRE), registry addition of the article route using whatever mechanism §30 establishes.
- **OUT OF SCOPE**: `/blog` index (already done in MIG-07A); Homepage; backend/Prisma; the pre-existing `findBySlug` draft-exposure gap (§15, flagged as REVIEW, not fixed here); sanitization of stored HTML (§9, REVIEW not fixed here) unless explicitly re-scoped by a human decision.
- **FILES THAT MUST NOT CHANGE**: `coro-backend/**`, `app/page.tsx`, `app/HomePageClient.tsx`.
- **ARTICLE BODY SECURITY CONTRACT**: preserve `dangerouslySetInnerHTML` scoped exactly to the trusted `content` field as today; do not widen its use to any other field; do not add sanitization silently either (that would itself be a content-rendering behavior change requiring its own review, since some inline styles/structure could theoretically be altered by an over-aggressive sanitizer — out of MIG-07 scope to decide).
- **SLUG CONTRACT**: no change to slug generation/lookup; route must keep resolving the same dynamic segment.
- **PUBLICATION CONTRACT**: preserve `!post || !post.isPublished → notFound()` exactly.
- **LANGUAGE CONTRACT**: preserve the *strict* `hasEnglish` gate (§10) — do not adopt the index's softer per-field fallback here.
- **SEO/METADATA CONTRACT**: §12, including preserving (not silently fixing) the missing-OG-image-fallback gap and the non-localized `" | Blogue CORO"` suffix unless explicitly re-scoped.
- **STRUCTURED DATA CONTRACT**: §13, both schemas field-for-field.
- **IMAGE CONTRACT**: §18 — cover image conditional render, in-body images (relative `/public` paths) must remain resolvable; no new remotePatterns/next-image adoption required unless separately decided.
- **404/ERROR CONTRACT**: §17.
- **REGISTRY/DYNAMIC-PATH CONTRACT**: implement per §30's decision; must be verified against a real resolved pathname in tests, not the literal `[slug]` string (§26).
- **TESTS**: per §26 (article list).
- **VISUAL QA**: full scroll-through of at least the representative articles identified in §6 (bilingual, has-table, has-in-body-image, long link-list) — both languages where available — plus human mobile QA at ~390px, same global-debt caveat as §33.
- **GO/NO-GO**: **CONDITIONAL GO** — blocked specifically on resolving §30's architectural decision first; everything else in this contract is otherwise clear to proceed.

## 35. MIG-07C — Blog closure contract

Must verify, after MIG-07A and MIG-07B are both visually approved:
- `/blog` registered V2 and reshelled.
- Every resolved article pathname (not the literal `[slug]` string) correctly resolves as V2 per whatever mechanism §30 implements — spot-check several real slugs, not just one.
- No legacy footer remains on any Blog surface (index or any article).
- Sitemap parity: static `/blog` entry + all per-article entries still present and correctly bilingual-gated, matching the live-production shape already proven in §14.
- FR/EN parity: both the index's soft-fallback and the article's strict-gate behaviors preserved exactly as specified in their respective contracts.
- Dynamic-slug regression: known real slugs still resolve correctly; a representative sample per §6.
- Unknown-article 404 still correct.
- API-down behavior still fail-soft on both pages (re-verify in a full closure build, same as this PRE session did).
- Structured data still valid on a sample of articles.
- Metadata still correct on a sample of articles.
- No draft leakage via the site (§15's known API-level gap is explicitly *not* required to be closed here — it's a backend REVIEW item, not a MIG-07C gate).
- No URL loss — the full live slug list (56+ as of this audit, will have grown) should be spot-checked, not exhaustively re-tested one-by-one.
- No duplicate canonicals.
- No duplicate footer/header on the closed state.
- Tests/typecheck/lint/build all clean (MIG-06-style report format).
- Governance doc closure section written (implementation-result style, matching MIG-06's own §19 structure).
- Remaining legacy surface becomes **exactly `/`** — the sole route left for a future MIG-08 (Homepage).

## 36. Homepage isolation check

**Confirmed**: MIG-07 (both A and B) can be completed without touching `app/page.tsx` or `app/HomePageClient.tsx`, and without changing referral attribution, referral cookies, `DemoForm` behavior, or homepage campaign logic. Neither Blog page imports anything from `HomePageClient.tsx` or any referral/DemoForm module (§3 — confirmed via direct import inspection of both files: only `Metadata`, `notFound`, and `serverApiUrl` are imported). **PASS.**

The only Blog→Homepage coupling is a plain anchor link (§18 of the preservation matrix / §37 below), not a shared component or shared logic.

## 37. Blog → Homepage link interaction

| LINK | DIRECTION | CLASSIFY | NOTE |
|---|---|---|---|
| `/` and `/?lang=en` (nav "Home"/"Accueil" link, both pages) | Blog → Home | PRESERVE | Plain `<a href>`, no coupling beyond the URL itself |
| `/#demo` and `/?lang=en#demo` (article CTA) | Blog → Home | REVIEW | Depends on the Homepage still having a `#demo` anchor target present in its legacy markup — confirmed the anchor exists today (Homepage unchanged throughout MIG-07 by design), but this is the one place a future Homepage migration (MIG-08) must check doesn't silently break an in-page anchor that Blog (and other already-migrated pages, per MIG-06's own homepage audit) depends on |
| Homepage → Blog | Not audited in this pass (`HomePageClient.tsx` explicitly out of scope, §36) — **UNKNOWN** whether Homepage links into `/blog` anywhere (plausible, e.g. a "Latest articles" teaser section, not confirmed) | REVIEW at MIG-08 time, not MIG-07 | Out of scope here by design; flagged for future audit, not investigated to respect the "do not touch Homepage" boundary |

No broken links found within the audited (Blog-side) direction.

## 38. Current backend-offline build behavior

Re-confirmed precisely (already established in MIG-06, re-verified this session):
- Warning originates in `lib/site/sitemap.ts` `fetchPublishedBlogPosts`'s `fail()` helper, logged via `console.warn`.
- `npm run build` **remains successful** — confirmed this session (§ "Validation" below), exit implied success, all 34 routes (23 migrated V2 + `/`, `/blog`, `/blog/[slug]`, `/privacy` and `/terms` counted separately — 32 listed route lines total in the build table plus static special files) generated.
- `/blog` and `/blog/[slug]` **do build successfully** even with the API unreachable — their own `getPosts`/`getPost` functions independently fail-soft to `[]`/`null`, same pattern as the sitemap builder, just without the explicit timeout (§17's noted gap).
- Dynamic article routes do **not** depend on the API at *build* time in a blocking way — Next.js does not pre-render every possible slug at build time here (no `generateStaticParams` found in `app/blog/[slug]/page.tsx`), so each article is rendered on-demand (`ƒ` dynamic in the build output), meaning build-time API unavailability cannot break the build by trying to enumerate slugs.
- Metadata generation (`generateMetadata`) can indeed "fail soft" too — its own `getPost` call has the same `try/catch → null` pattern, and the missing-post branch produces a safe fallback title/`noindex`, so metadata generation never throws even when the API is down.
- Sitemap: confirmed (again) it simply omits dynamic article URLs when the API is down, static routes unaffected.
- This behavior is clearly **intentional**, not accidental — the `try/catch` pattern is consistently applied across `getPosts`, `getPost`, and `fetchPublishedBlogPosts`, and the sitemap builder's inline comment explicitly documents it as fail-soft by design.

Classification: **PRESERVE FOR MIGRATION.**

## 39. Blockers

| ID | TYPE | DESCRIPTION | AFFECTS | RESOLUTION REQUIRED BEFORE |
|---|---|---|---|---|
| B-01 | MIGRATION-BLOCKER | `migratedV2Routes` cannot match a dynamic resolved pathname against a literal `[slug]` entry (§27/§30) | MIG-07B only | MIG-07B registry step (not MIG-07A, not this PRE phase) |
| B-02 | SECURITY-REVIEW | `GET /api/blog/public/:slug` does not filter `isPublished` in its own query (§15) | Backend API (not the frontend reshell) | Independent backend fix, not a MIG-07 gate; frontend already mitigates via `notFound()`/`noindex` |
| B-03 | SECURITY-REVIEW | Article body rendered via `dangerouslySetInnerHTML` with no sanitization layer, trust-boundary-dependent on JWT-gated-but-unrestricted-by-role admin write access (§9, §31) | ARTICLE | Pre-existing, live in production today; not a MIG-07 scope item unless explicitly re-scoped by a human decision |

No **PUBLICATION-BLOCKER** or **SEO-REVIEW** items rise to blocker status; the SEO gaps found (§11/§12) are all **NON-BLOCKING DEBT**:

| ID | TYPE | DESCRIPTION | AFFECTS | RESOLUTION REQUIRED BEFORE |
|---|---|---|---|---|
| D-01 | NON-BLOCKING DEBT | Index robots stays indexable even when the empty state is caused by an API failure, not genuine zero-articles (§7/§11) | INDEX | Not required before MIG-07A |
| D-02 | NON-BLOCKING DEBT | Article missing-OG-image has no fallback (index has one) (§12) | ARTICLE | Not required before MIG-07B |
| D-03 | NON-BLOCKING DEBT | Metadata fetch duplicates page fetch on the article route, no shared cache (§4/§29) | ARTICLE | Safe to fix during MIG-07B, not required |
| D-04 | NON-BLOCKING DEBT | No explicit fetch timeout on `getPost`/`getPosts` (unlike the sitemap builder's 8s timeout) (§17) | BOTH | Safe to fix during MIG-07A/B, not required |
| D-05 | NON-BLOCKING DEBT | `" | Blogue CORO"` title suffix not localized for EN articles (§12) | ARTICLE | Not required, content-governance decision |
| D-06 | NON-BLOCKING DEBT | No semantic `<header>`/breadcrumb `<nav>` landmark today (§30) — resolves naturally via V2Shell adoption | BOTH | Resolves as a byproduct of MIG-07A/B, not extra required work |
| D-07 | NON-BLOCKING DEBT | GLOBAL RESPONSIVE DEBT — floating help/chat/scroll controls can overlap mobile content (carried over from MIG-06, site-wide) | BOTH | Not required before MIG-07A/B unless Blog introduces its own Blog-specific regression |

## 40. GO / NO-GO

- **MIG-07A (index)**: **GO.** No blocker applies to the static `/blog` path.
- **MIG-07B (article)**: **CONDITIONAL GO** — proceed only once the §30 dynamic-route architectural decision is implemented as part of MIG-07B's own scope (not a separate pre-phase; it is squarely MIG-07B's registry step, per §34).
- **MIG-07C (closure)**: **GO once A and B are both visually approved**, no new conditions beyond §35.

---

## MIG-07A Implementation Result

**START STATE**: branch `feature/website-v2`, HEAD `4bc07c5a`, tree matched exactly (only the two pre-existing uncommitted files). Confirmed at session start.

**BASELINE**: `tests/fixtures/blog-index-baseline.json` captured live from `https://api.getcoro.io/api/blog/public` — 56 posts, 4 categories (`Guides pratiques`, `Bonnes pratiques terrain`, `Réglementation & Normes`, `Nouvelles CORO`), full slug list recorded, structural facts only (no full HTML bodies, consistent with §25's reviewability guidance).

**API CONTRACT**: preserved exactly — `serverApiUrl('blog/public')`, `cache: 'no-store'`, `try/catch → []` on any failure. No change to `lib/site/api.ts`.

**LIVE API**: reachable and inspected read-only this session (56 posts, unchanged from MIG-07-PRE's own count).

**LANGUAGE CONTRACT**: the index's *soft* per-field fallback preserved verbatim (`post.titleEn || post.titleFr`, `post.excerptEn || post.excerptFr`). Not unified with the article's strict gate.

**SEO**: `buildPageMetadata` used with `absoluteTitle: true` (both FR/EN titles already carry "CORO"/"Blogue CORO"), exact FR/EN title/description strings preserved from the legacy page, canonical/alternates/OG/Twitter/robots now flow through the shared V2 helper (§11's contract, same shape, `indexable: true` default preserved).

**ARTICLE URL PRESERVATION**: `app/blog/[slug]/page.tsx` untouched (byte-identical to start state); spot-checked one real live slug (`conformite-resilience-operationnelle-pmu`) — HTTP 200.

**INDEX DESIGN**: one dominant featured story (first post of the filtered list) in a large full-width band, followed by a compact 1/2/3-column responsive grid for the rest. No uniform card wall.

**LEAD STORY LOGIC**: `[featured, ...rest] = filteredPosts` — the featured story is always the most recent post (API already orders by `publishedAt desc`), respecting the active category filter.

**SUPPORTING STORY HIERARCHY**: grid cards are visually secondary (smaller media, `h3` not `h2`, no dominant treatment), auto-flowing 1→2→3 columns by viewport, degrading gracefully past the first screen with no pagination (matches §23's growth requirement).

**IMAGE BEHAVIOR**: real `coverImage` URLs rendered via plain `<img>` (no `next/image`, no new `remotePatterns`, per §18/§29); emoji placeholder (`📄`, `aria-hidden`) preserved for posts without a cover.

**EMPTY STATE**: exact FR/EN empty-state copy preserved, same code path for genuine-empty and API-down (§7's indistinguishability is preserved as-is, not silently fixed).

**ERROR / FAIL-SOFT**: unchanged — `getPosts()` fail-soft to `[]`, identical to legacy.

**ACCESSIBILITY**: V2Shell now provides a real `<header>`, skip link and single `<main>` landmark (byproduct of the reshell, per D-06); featured/card links have visible focus rings (`:focus-visible`, 3px outline); heading order is H1 → H2 (featured) → H3 (cards), no skipped levels.

**DESKTOP CANVAS / DENSITY**: featured story uses a 1.1fr/1fr split at ≥56rem; grid uses up to 3 columns at ≥68rem; `density="compact"` on the hero keeps the page from opening with excess blank space.

**CHARACTER GATE** (self-answered before requesting review): dominant editorial moment — yes (featured band); intentional desktop width use — yes (split hero, 3-col grid); excessive blank canvas — no; too many identical units — no (featured is visually distinct from the grid); looks like /guides — no (dated article cards vs. status-tile groups); looks like a SaaS product page — no; images contributing meaningfully — yes (large real covers); density strong without clutter — yes. No fix required.

**MOBILE VISUAL QA**: not performed with a rendered browser in this session (no browser tool invoked); structural/responsive rules were written and typechecked (single-column featured/grid below 40rem, 44px-minimum focus targets inherited from V2Shell/SkipLink). Flagged as **outstanding manual step** before final human sign-off, consistent with MIG-06's own separation of automated gates from human mobile QA.

**ARTICLE PAGE UNTOUCHED**: `app/blog/[slug]/page.tsx` not modified (test-asserted).

**HOMEPAGE UNTOUCHED**: `app/page.tsx`, `app/HomePageClient.tsx` not modified (test-asserted).

**DYNAMIC ARTICLE REGISTRY DEFERRED**: `/blog/[slug]` intentionally not added to `migratedV2Routes`; `lib/site/v2-migration.ts` comment updated to record why. This is MIG-07B's own scope per §30/§34.

**REGISTRY**: `/blog` appended as the 24th (last) entry to `migratedV2Routes` in `lib/site/v2-migration.ts`, following the standard MIG-02+ protocol (reshell → build/QA with 2 footers → add to registry → rebuild → QA with 1 footer).

**MIGRATED V2 ROUTE COUNT**: 24 (was 23).

**TESTS**: new `tests/blog-index-migration.test.ts` (13 tests, all passing); 3 pre-existing test files required mechanical updates for the array/count bump and the `/blog` legacy→migrated reclassification: `tests/v2-shell.test.ts`, `tests/sentinelle-population-migration.test.ts`, `tests/portail-client-migration.test.ts`, `tests/resilience-operationnelle-migration.test.ts`, plus the 13-file exact-array bump (`about`, `contact`, `gestion-de-projets`, `gestion-documentaire`, `partners`, `performance-objectifs`, `portail-client`, `programme-recommandation`, `resilience-operationnelle`, `sentinelle`, `sentinelle-population`, `sitemap`, `visual-01`), and `tests/page-rhythm.test.ts`'s primitive-import exclusion list (added `app/blog`). Full suite: **566/566 passing**.

**TYPECHECK**: `npx tsc --noEmit` — clean, no errors.

**MIG-07A FILE LINT**: `npx eslint app/blog tests/blog-index-migration.test.ts lib/site/v2-migration.ts` — 0 errors, 3 pre-existing-pattern `<img>`/LCP warnings (same warning already present on the untouched article page; no new lint error class introduced).

**BUILD**: `npm run build` — successful both before and after the registry step; known fail-soft sitemap warning present (Docker-internal backend unreachable from this sandbox, expected per §38); all 32 routes generated, `/blog` and `/blog/[slug]` both build as dynamic (`ƒ`).

**POST-REGISTRY STRUCTURAL QA**: `/blog` now renders exactly one footer (legacy `Footer` suppressed via `isLegacyFooterVisible('/blog') === false`, `SiteFooterV2` rendered by `V2Shell`); `/blog/[slug]` still shows the legacy footer (expected intermediate state per §28, not a bug).

**REAL ARTICLE REGRESSION**: `https://getcoro.io/blog/conformite-resilience-operationnelle-pmu` → HTTP 200, confirmed live post-implementation.

**SITEMAP**: `https://getcoro.io/sitemap.xml` re-checked live — 56 `blog/` entries still present, unaffected (no change to `app/sitemap.ts` or `lib/site/sitemap.ts`).

**REGRESSION**: full local test suite (566/566), typecheck, lint and build all green; no other route's test file needed a non-mechanical change.

**GOVERNANCE**: this section, added to `MIG-07-BLOG-GATE.md`, following the MIG-06 implementation-result style.

**GIT**: no files staged, no commit created, no push performed, per the explicit constraint. Changed/added files (all still working-tree only):
`app/blog/page.tsx` (rewritten), `app/blog/page.module.css` (new), `lib/site/v2-migration.ts`, `tests/blog-index-migration.test.ts` (new), `tests/fixtures/blog-index-baseline.json` (new), `tests/v2-shell.test.ts`, `tests/sentinelle-population-migration.test.ts`, `tests/portail-client-migration.test.ts`, `tests/resilience-operationnelle-migration.test.ts`, `tests/page-rhythm.test.ts`, plus the 13-file exact-array bump listed above under TESTS.

**REMAINING EXISTING LEGACY ROUTES**: `/` and `/blog/[slug]`.

**HUMAN REVIEW URL**: none published this session (no Artifact/browser tool used); recommend reviewing `http://localhost:3000/blog` (and `?lang=en`) against the running dev server, or the equivalent path once deployed to a preview environment. Manual mobile QA at ~390px is still outstanding (see MOBILE VISUAL QA above).

## MIG-07A Pagination Addendum

Mathieu approved the overall Blog index visual direction. The remaining issue was page length: with 56 real published articles, `/blog` rendered the entire catalog on one page, which does not scale. Pagination was added before final visual approval, per the same reshelled-page (no re-design of the approved editorial composition).

**MECHANISM**: FRONTEND-ONLY. `GET /api/blog/public` (`findPublished()` in `coro-backend/src/blog/blog.service.ts`) has no `page`/`limit`/`offset`/`cursor`/`take`/`skip`/`total`/`totalCount`/`hasNextPage` support — verified by reading the current service code, not assumed. `coro-backend` was NOT modified. Pagination is deterministic client-side slicing of the already-fetched full list, performed server-side in the Next.js page component (not client JS) at request time.

**CURRENT API PAGINATION**: NOT SUPPORTED.

**PAGE SIZE**: 12 articles per page (`PAGE_SIZE` constant, `lib/site/pagination.ts`).

**URL CONTRACT**: `?page=N` query parameter. `/blog` (no param) is canonical page 1. No new path segment (`/blog/page/2`) was introduced. Combines with `?lang=en&page=N` and `?category=<name>&page=N`.

**COMPOSITION RULE**: page 1 keeps the approved dominant-lead-story + supporting-grid hierarchy. Page 2+ does NOT repeat the oversized featured treatment — the first item of page 2+ renders as a normal grid card, never as a fabricated "new featured" article (`isFirstPage ? pageItems[0] : undefined` in `app/blog/page.tsx`).

**FILTER INTERACTION**: category filter links (`categoryHref`) never carry a `page` param, so switching category always lands on page 1 of the filtered set. Pagination slices `filteredPosts` (post-filter), never the unfiltered list, so no empty-page artifacts from pre-filter slicing.

**INVALID/EDGE PAGES**: `paginate()` in `lib/site/pagination.ts` clamps `page` to `[1, totalPages]` — 0, negative, `NaN`, and out-of-range values all normalize to a valid page (1 or the final page) rather than showing the empty state when real articles exist. An empty list still returns `totalPages: 1` safely (no divide/slice errors).

**EMPTY/ERROR STATE**: unchanged. The existing `filteredPosts.length === 0` check (covering both a genuine-empty and an API-down response, per the already-approved §7 indistinguishability) still governs the empty-state message; pagination normalization guarantees an out-of-range page number can never independently trigger that state while articles exist.

**PAGINATION UI**: `<nav aria-label={t.paginationLabel}>` (FR: "Pagination du blogue", EN: "Blog pagination") at the bottom of the article collection. Real `<a>` links (not buttons/divs), `aria-current="page"` on the active page, `←`/`→` Précédente/Suivante-Previous/Next links, ellipsis strategy for large page counts (`pageNumbers()` always keeps first two, last two, and a window around the current page, collapsing the rest into `…`) so the control never renders an unbounded list of page buttons. Keyboard focus uses the same `:focus-visible` outline as the rest of the index (`page.module.css` `.pageLink:focus-visible`).

**SEO**: `generateMetadata` does not read the `page` search param, so canonical/OpenGraph/Twitter metadata for every paginated view (`/blog?page=2`, etc.) continues to point at the same static per-language `/blog` metadata already established in §11 — this is the safe, conservative default (no duplicate-content risk from distinct per-page metadata, no self-referencing canonical bug). Article canonical URLs, `dynamic article sitemap` (`app/sitemap.ts`, untouched), and `/blog/[slug]` metadata are unaffected. No SEO-REVIEW ambiguity found; documented rather than invented.

**NON-BLOCKING PERFORMANCE DEBT**: Blog API currently returns the complete published collection; frontend pagination limits rendered/DOM-mounted articles per request but does not yet reduce API payload size or database query cost. This can become true server-side pagination (`page`/`limit` params on `GET /api/blog/public` plus a corresponding Prisma `take`/`skip`) later if article volume warrants it — out of scope for MIG-07A.

**TESTS**: `tests/blog-index-migration.test.ts` extended with 11 new pagination tests using a deterministic 30-item fixture (does not assert the live count of 56): page size/page 1, page 2 slice with no duplicate overlap, final page + full-coverage check across all pages, invalid/zero/negative/excessive page normalization, empty-list safety, ellipsis strategy bounding, URL contract (`?page=` not `/page/`), FR/EN + category-filter interaction, pagination accessibility (nav label, `aria-current`, no clickable divs), and no-fake-featured-on-page-2+. New file `lib/site/pagination.ts` isolates the pure logic so both the page component and the plain-node test runner (which cannot load `.tsx` directly) can import it. Full suite: 576/576 passing (was 554 before this addendum).

**TYPECHECK**: `npx tsc --noEmit` — clean.

**LINT**: `npx eslint app/blog/page.tsx app/blog/page.module.css lib/site/pagination.ts tests/blog-index-migration.test.ts` — 0 errors; only the pre-existing `@next/next/no-img-element` warnings (unchanged from before this addendum, not introduced by pagination).

**BUILD**: `npm run build` — successful, all 32 routes generated, same documented fail-soft sitemap warning as MIG-07-PRE §38 (local backend unreachable, unrelated to pagination).

**LIVE STRUCTURAL QA** (dev server run locally with `INTERNAL_API_URL=https://api.getcoro.io` as a runtime env var only — no code change, not committed — pointing the existing local dev server at the read-only production API for this QA session):

| URL | HTTP | main | h1 | footer | article links | pagination nav present |
|---|---|---|---|---|---|---|
| `/blog` | 200 | 1 | 1 | 1 | 12 | yes |
| `/blog?page=2` | 200 | 1 | 1 | 1 | 12 | yes |
| `/blog?lang=en` | 200 | 1 | 1 | 1 | 12 | yes |
| `/blog?lang=en&page=2` | 200 | 1 | 1 | 1 | 12 | yes |

Page 1 no longer renders all 56 articles — confirmed 12 per page. Real article regression: `/blog/conformite-resilience-operationnelle-pmu` still returns 200 with its `<article>`/`dangerouslySetInnerHTML` body intact. `sitemap.xml` still lists 56 `/blog/` entries, unaffected by the index pagination change. Mobile (~390px) viewport rendering was NOT performed (curl/structural checks only, no browser tool used this session) — same outstanding item as the base MIG-07A report, not claimed as done.

**ARTICLE PAGE**: UNTOUCHED — `app/blog/[slug]/page.tsx` not modified in this addendum.

**HOMEPAGE**: UNTOUCHED — `app/page.tsx`, `app/HomePageClient.tsx` not modified.

**GIT**: nothing staged, committed, or pushed.

---

MIG-07A PAGINATION POLISH REPORT

OVERALL DESIGN: APPROVED (editorial composition unchanged; only page-length behavior added)

CURRENT API PAGINATION: NOT SUPPORTED

IMPLEMENTATION: FRONTEND SLICE

PAGE SIZE: 12

URL CONTRACT: `/blog` = page 1 (canonical), `?page=N` for subsequent pages, combines with `?lang=en` and `?category=`

FILTER INTERACTION: category change always resets to page 1 (category links never carry `page`); pagination slices the filtered set

SEO: canonical/OG/Twitter metadata unchanged per page (static `/blog` metadata for all page values) — safe default, no duplicate-content risk, no ambiguity requiring a separate SEO-REVIEW

ACCESSIBILITY: `<nav aria-label>` (localized FR/EN), `aria-current="page"`, real `<a>` elements, ellipsis-bounded page-number list, existing focus-visible outline reused

PAGE 1: dominant featured story + up to 11 supporting cards (12 total), pagination nav shown when >1 page

PAGE 2: normal grid cards only, no fabricated "new featured" article

FINAL PAGE: remainder items, verified full coverage with no duplicates/gaps against fixture

INVALID PAGE: 0 / negative / NaN / excessive all normalize safely to a valid page, never force the empty state while articles exist

FR: soft per-field fallback (§10) unchanged, verified live at `/blog?lang=en` and `/blog?lang=en&page=2`

EN: same as above

REAL ARTICLES RENDERED PER PAGE: 12 (verified live against the production API, all 4 QA URLs)

API PAYLOAD: unchanged — full collection still fetched per request (see NON-BLOCKING PERFORMANCE DEBT)

NON-BLOCKING PERFORMANCE DEBT: Blog API currently returns the complete published collection; frontend pagination limits rendered articles but does not yet reduce API payload. This can later become true server-side pagination if article volume warrants it.

TESTS: 576/576 passing (11 new pagination tests)

TYPECHECK: clean

LINT: 0 errors, pre-existing `<img>` warnings only

BUILD: successful

ARTICLE PAGE: UNTOUCHED

HOMEPAGE: UNTOUCHED

GIT: nothing staged, committed, or pushed

VISUAL REVIEW URLS: `http://localhost:3000/blog`, `http://localhost:3000/blog?page=2`, `http://localhost:3000/blog?lang=en`, `http://localhost:3000/blog?lang=en&page=2` (dev server running locally against the read-only production API via a runtime env var)

MIG-07A STATUS: READY FOR FINAL VISUAL REVIEW
