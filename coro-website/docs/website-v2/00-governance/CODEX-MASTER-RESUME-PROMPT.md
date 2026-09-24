CORO

CODEX MASTER RESUME PROMPT

Website V2 · Prompt maître de reprise du chantier

AUDIT FIRST. CHANGE NOTHING.

Ce document contient le prompt à remettre à Codex lorsque le chantier
Website V2 reprend. La première passe est strictement en lecture seule.

Version 1.0 \| 24 septembre 2026 \| Statut : prêt pour reprise

# 1. Mode d'emploi

Copier le prompt de la section 2 dans Codex depuis le worktree/terminal
qui servira au chantier Website V2.

Ne pas demander simultanément une refonte, un commit ou une correction.
La première réponse attendue est uniquement un audit structuré.

Après réception du rapport Codex, le faire analyser avant d'autoriser la
moindre implémentation.

# 2. PROMPT MAÎTRE --- À COPIER DANS CODEX

You are resuming the CORO Website V2 project.\
\
CONTEXT\
CORO is rebuilding its public website. The goal is not a cosmetic
redesign and not a generic SaaS landing-page refresh. Website V2 must
preserve all useful existing public content, URLs and SEO equity while
establishing a distinctive CORO visual system: architectural,
operational, human, deep, precise, premium and technologically
credible.\
\
The public website application is expected to be \`coro-website\` inside
the CORO repository.\
\
IMPORTANT --- THIS FIRST PASS IS AUDIT ONLY.\
DO NOT modify any file.\
DO NOT create any file.\
DO NOT run migrations.\
DO NOT install packages.\
DO NOT refactor.\
DO NOT format files.\
DO NOT commit.\
DO NOT push.\
DO NOT create the Design Lab yet.\
DO NOT redesign the homepage.\
DO NOT delete or rename anything.\
\
Your job is to inspect the current repository and produce a factual,
exhaustive audit of the current public website so that we can build:\
02 --- CURRENT-SITE-INVENTORY\
03 --- CONTENT-MIGRATION-MATRIX\
07 --- PAGE-ARCHITECTURE\
09 --- SEO-MIGRATION-PLAN\
\
BEFORE ANALYSIS\
1. Print the current working directory.\
2. Print the current Git branch.\
3. Print \`git status \--short\`.\
4. Identify the repository root and confirm where \`coro-website\` is
located.\
5. Identify the framework, package manager, build scripts and relevant
website dependencies.\
6. Confirm whether you are in the intended Website V2 worktree/branch.
If not, STOP and report it. Do not change branches automatically.\
\
SCOPE\
Audit \`coro-website\` comprehensively. Do not inspect unrelated
business applications unless required to understand an import, shared
component or public link. If you need to cross that boundary, report
why; do not modify anything.\
\
A. ROUTE INVENTORY\
Identify every public and non-public route in \`coro-website\`,
including:\
- static routes;\
- dynamic routes;\
- FR routes;\
- EN routes;\
- redirects;\
- route aliases;\
- legal pages;\
- pricing;\
- contact/demo;\
- login/client portal links;\
- resources/articles if present;\
- product/module pages;\
- sector/use-case pages;\
- hidden, orphaned or unfinished routes;\
- API routes belonging to the website, if any;\
- not-found/error routes;\
- sitemap and robots handling.\
\
For every route, report:\
- path;\
- locale;\
- source file;\
- page title/purpose inferred from code;\
- public/indexable status if determinable;\
- navigation exposure;\
- major content sections;\
- major CTA;\
- notable dependencies;\
- status: active / duplicate / orphaned / unclear / utility.\
\
B. CONTENT INVENTORY\
Inventory meaningful public content:\
- headings;\
- product descriptions;\
- feature descriptions;\
- proof/trust statements;\
- pricing content;\
- FAQs;\
- testimonials;\
- customer/partner logos;\
- legal copy;\
- security/privacy/hosting claims;\
- compliance/regulatory claims;\
- statistics/numbers;\
- demo data;\
- calls to action;\
- downloadable assets;\
- video or external media.\
\
Flag content that appears:\
- duplicated;\
- stale;\
- inconsistent FR/EN;\
- hardcoded in one language;\
- contradictory across pages;\
- likely valuable and at risk during redesign;\
- potentially inaccurate and requiring human validation.\
\
Do not rewrite content yet.\
\
C. SEO INVENTORY\
For each public route, inspect where applicable:\
- metadata title;\
- meta description;\
- canonical;\
- hreflang / alternates;\
- robots directives;\
- Open Graph;\
- Twitter metadata;\
- structured data / JSON-LD;\
- sitemap inclusion;\
- internal links;\
- heading structure;\
- image alt text;\
- redirects;\
- trailing-slash conventions;\
- locale strategy.\
\
Identify global SEO configuration and page-specific overrides.\
Flag missing, duplicated or suspicious metadata.\
Do not make SEO changes.\
\
D. NAVIGATION / INFORMATION ARCHITECTURE\
Document:\
- header navigation;\
- dropdowns / mega menus;\
- mobile navigation;\
- footer navigation;\
- cross-links between products;\
- language switching;\
- CTA destinations;\
- login destinations;\
- client portal destinations.\
\
Identify pages that exist but are not reachable from normal navigation.\
\
E. DESIGN / UI INVENTORY\
Identify the current:\
- global CSS strategy;\
- CSS framework, if any;\
- design tokens or CSS variables;\
- color palette;\
- fonts and loading strategy;\
- spacing conventions;\
- radius conventions;\
- shadow conventions;\
- breakpoints;\
- layout/container primitives;\
- button variants;\
- card variants;\
- hero patterns;\
- section patterns;\
- navigation components;\
- footer components;\
- form components;\
- animation/motion libraries;\
- icon libraries;\
- image handling.\
\
List reusable components and where they are used.\
Flag obvious duplicate components or local one-off patterns.\
Do not propose replacements yet unless necessary to explain a finding.\
\
F. RESPONSIVE / ACCESSIBILITY INVENTORY\
From the code, identify:\
- breakpoint strategy;\
- mobile navigation behavior;\
- responsive image handling;\
- fixed dimensions likely to break;\
- keyboard/focus handling;\
- semantic landmarks;\
- heading patterns;\
- form labels/errors;\
- reduced-motion support;\
- obvious contrast/accessibility concerns visible from tokens/code;\
- ARIA patterns;\
- components that warrant manual testing later.\
\
This is a static audit, not a claim of WCAG conformance.\
\
G. PERFORMANCE / TECHNICAL INVENTORY\
Identify:\
- client vs server component patterns;\
- large client-side dependencies;\
- animation libraries;\
- image optimization strategy;\
- font strategy;\
- third-party scripts;\
- analytics;\
- cookie/consent tooling;\
- external embeds;\
- forms and their submission targets;\
- obvious bundle/performance risks;\
- build configuration;\
- deployment-related configuration visible in the website app.\
\
H. ASSET INVENTORY\
Inventory important public assets:\
- logos;\
- product screenshots;\
- building imagery;\
- illustrations;\
- videos;\
- icons;\
- PDFs/downloads;\
- favicons;\
- OG images;\
- locale-specific assets.\
\
Flag duplicates, unused-looking assets and assets that appear critical
to preserve.\
Do not delete anything.\
\
I. FR / EN PARITY\
Compare French and English structure:\
- route parity;\
- section parity;\
- CTA parity;\
- product naming;\
- pricing;\
- legal pages;\
- metadata;\
- navigation;\
- content omissions;\
- hardcoded strings.\
\
Report differences factually.\
\
J. EXTERNAL / PUBLIC DESTINATIONS\
List every meaningful external destination referenced by the website:\
- application login;\
- client portal;\
- demo/contact services;\
- social links;\
- video platforms;\
- external documents;\
- privacy/legal destinations;\
- third-party forms or booking services.\
\
K. MIGRATION RISKS\
Without deciding the final migration yet, identify:\
- URLs that must be protected;\
- content that is easy to lose;\
- SEO-sensitive routes;\
- duplicated pages requiring later human decision;\
- legacy patterns;\
- coupled components;\
- technical constraints that could affect Website V2;\
- anything that makes a clean rebuild risky.\
\
L. CURRENT COMPONENT MATRIX\
Produce a table:\
CURRENT COMPONENT \| FILE \| USED BY \| PURPOSE \| DUPLICATION / ISSUE
\| PRELIMINARY CLASSIFICATION\
\
Allowed preliminary classifications:\
REUSE-CANDIDATE\
ADAPT-CANDIDATE\
MERGE-CANDIDATE\
REVIEW\
Do NOT classify anything DROP or CREATE yet.\
\
M. CURRENT ROUTE MATRIX\
Produce a table:\
ROUTE \| LOCALE \| SOURCE \| PURPOSE \| NAVIGATION \| SEO STATUS \|
CONTENT RISK \| NOTES\
\
N. DOCUMENTATION DISCOVERY\
Search the repository for any existing website documentation, brand
rules, README files, design notes, SEO notes, redirects, route
inventories or migration plans that may already exist.\
List them with file paths and summarize their relevance.\
\
OUTPUT FORMAT\
Return one structured audit report with these sections:\
1. Executive summary\
2. Environment / Git / stack\
3. Route matrix\
4. Content inventory\
5. SEO inventory\
6. Navigation / information architecture\
7. Design / UI system inventory\
8. Component matrix\
9. Responsive / accessibility observations\
10. Performance / technical observations\
11. Asset inventory\
12. FR / EN parity\
13. External destinations\
14. Migration risks\
15. Existing documentation discovered\
16. Unknowns requiring human validation\
17. Recommended inputs for documents 02, 03, 07 and 09\
\
For every important finding, cite exact file paths and, where useful,
line ranges or symbols.\
\
Do not give me a redesign.\
Do not implement fixes.\
Do not create the Design Lab.\
Do not produce code patches.\
Do not commit.\
\
At the very end, print exactly:\
AUDIT STATUS: READY FOR REVIEW\
if you completed the audit without modifying the repository.\
\
If you discover that you are in the wrong worktree/branch, or cannot
safely complete the audit, print:\
AUDIT STATUS: BLOCKED\
and explain why.\
\
Before finishing, run \`git status \--short\` again and explicitly
confirm whether the working tree changed during your audit.

# 3. Réponse attendue

Codex doit retourner un rapport, pas du code. Le rapport doit être
suffisamment détaillé pour que nous puissions construire les documents
02, 03, 07 et 09 à partir de faits du dépôt.

Le marqueur final attendu est : AUDIT STATUS: READY FOR REVIEW.

Si Codex retourne AUDIT STATUS: BLOCKED, aucune correction ne doit être
improvisée avant analyse de la cause.

# 4. Contrôles immédiats après retour

Avant toute suite, vérifier :

1\. La branche/worktree était le bon.

2\. Le git status est resté inchangé.

3\. Toutes les routes FR/EN ont été couvertes.

4\. Les métadonnées SEO et redirections ont été inspectées.

5\. Les assets et composants ont été inventoriés.

6\. Les formulaires et destinations externes ont été identifiés.

7\. Les pages orphelines/non indexées ont été recherchées.

8\. Les constats importants citent des fichiers précis.

# 5. Ce qu'il ne faudra PAS répondre immédiatement à Codex

Ne pas enchaîner par « go, refais la homepage ».

Ne pas lui demander de créer tous les composants cibles.

Ne pas lui demander de supprimer les doublons détectés.

Ne pas lui demander de mettre en œuvre ses recommandations SEO.

Le rapport doit d'abord être analysé et transformé en décisions
humaines.

# 6. Séquence après l'audit

Étape A --- analyser le rapport Codex.

Étape B --- produire Document 02 CURRENT-SITE-INVENTORY.

Étape C --- produire Document 03 CONTENT-MIGRATION-MATRIX avec décisions
explicites.

Étape D --- construire/valider Document 07 PAGE-ARCHITECTURE.

Étape E --- produire Document 09 SEO-MIGRATION-PLAN.

Étape F --- confronter le code aux Documents 04/05/06/10/12 et à la
Motion Specification.

Étape G --- produire matrice EXISTANT → CIBLE : REUSE / ADAPT / MERGE /
CREATE / DROP.

Étape H --- seulement ensuite lancer LAB-01 du Design Lab.

# 7. Règle de sécurité du chantier

STOP --- aucun changement public ou destructif ne doit être décidé à
partir du seul jugement de Codex.

Les suppressions, fusions d'URL, redirections, changements de
nomenclature et modifications d'un composant partagé doivent être
validés dans le cadre documentaire du chantier.

# 8. Résultat recherché

OBJECTIVE --- utiliser Codex comme instrument d'inspection exhaustive
avant de l'utiliser comme instrument de construction.

Le premier gain attendu au retour du quota n'est pas une nouvelle page
Web : c'est une cartographie fiable de ce qui existe afin que Website V2
puisse être reconstruit sans perte et sans dérive.
