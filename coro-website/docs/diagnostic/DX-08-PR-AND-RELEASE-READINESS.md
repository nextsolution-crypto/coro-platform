# DX-08 — PR et préparation de release

Date : 2026-10-27

## Branche et base

- Branche : `feature/coro-diagnostic-express-v1`
- Base actualisée : `origin/main` à `80f5c4f00ddeab6c24022cdf56490293caa8456f`
- Écart initial : 0 commit derrière, 0 commit devant avant création des commits DX
- Conflits détectés : aucun
- Autres worktrees : inventoriés et préservés

## Commits

1. `8fa93adc` — `feat(website): add CORO Diagnostic Express V1.0`
   - produit, moteur, intégration publique, PDF, conversion et tests;
   - 44 fichiers, 1 945 ajouts, 22 suppressions.
2. `a173900c` — `test(website): add Diagnostic Express acceptance evidence`
   - rapports DX-00 à DX-07, captures, résultats structurés et harnais QA;
   - exclusion explicite de `output/` et `tmp/`;
   - 61 fichiers, 4 306 ajouts.

Les caches, profils Chrome, PDF régénérables et rendus temporaires ne sont pas publiés.

## Pull Request

- PR : [#107 — feat(website): CORO Diagnostic Express V1.0](https://github.com/nextsolution-crypto/coro-platform/pull/107)
- Base : `main`
- Tête vérifiée avant ce rapport : `a173900cd4d394674375d3b222943efdcb47e578`
- État : OPEN
- Fusionnable : MERGEABLE
- Merge state : CLEAN
- Draft : non

La description contient le résumé fonctionnel, l'architecture, les lots, les résultats QA, la confidentialité, l'accessibilité, le SEO, les PDF, la conversion commerciale, les réserves, la validation post-déploiement et le rollback.

## Validations locales sur les commits

| Contrôle | Résultat |
|---|---:|
| Suite complète | PASS — 709/709 |
| TypeScript | PASS |
| ESLint ciblé | PASS |
| Build Next.js 16.4.3 | PASS |
| Audit dépendances production | PASS — 0 vulnérabilité |
| `git diff --check origin/main...HEAD` | PASS |
| Navigation et sitemap | PASS |
| PDF | PASS — six profils bilingues |
| Conversion commerciale simulée | PASS |
| Formspree réel | NOT_VERIFIED |

Le seul avertissement du build est le mode dégradé connu du sitemap quand l'API du blogue est inaccessible localement; `/diagnostic` demeure généré.

## CI GitHub initiale

Workflow principal : `Validate and Release Production`, run `40570472541`.

| Job | Conclusion |
|---|---:|
| typecheck (coro-backend) | SUCCESS |
| typecheck (coro-client-portal) | SUCCESS |
| typecheck (coro-frontend) | SUCCESS |
| typecheck (coro-website) | SUCCESS |
| backend-tests | SUCCESS |
| client-portal-build | SUCCESS |
| build-images | SKIPPED sur PR |
| production-release | SKIPPED sur PR |

Workflow `Website Docker Check`, run `40570472506` : `website-docker-build` SUCCESS.

Les skips d'images et de release sont attendus pour une `pull_request`; aucune production n'a été modifiée.

## Écarts et risques

- Aucun conflit avec `origin/main` au moment de la PR.
- Zones partagées : navigation, accueil, pied de page, `DemoForm`, registre des routes et dépendances du site.
- La documentation et les captures augmentent la taille de la PR d'environ 6,9 Mo, mais ne changent pas le runtime.
- Aucun changement backend, migration ou stockage serveur.
- Le formulaire historique demeure le comportement par défaut; la variante Diagnostic est additive.

## Réserves

- Livraison Formspree réelle : NOT_VERIFIED.
- Lecteur d'écran : NOT_VERIFIED.
- PDF/UA : non démontré.
- Performances production : NOT_VERIFIED.
- Dette historique du `lang` racine; langue locale V2 vérifiée.

## Plan de déploiement gouverné

1. Confirmer que la CI sur le SHA final de la PR est entièrement réussie.
2. Confirmer la fusionabilité et l'absence de nouvelle divergence avec `main`.
3. Fusionner la PR selon la stratégie protégée du dépôt.
4. Identifier le SHA exact résultant sur `main`.
5. Déclencher ou suivre le pipeline gouverné existant, sans déploiement manuel.
6. Respecter les gates de capacité, sauvegarde, restauration, rollback et concurrence.
7. Attendre le succès terminal du workflow de release.
8. Vérifier le SHA et le digest du site actifs.
9. Inspecter `/diagnostic`, `?lang=en`, navigation, sitemap, PDF, partage et absence de transmission automatique.
10. Conserver Formspree réel comme NOT_VERIFIED sans essai autorisé distinct.

## Plan de rollback

Le lot n'a ni migration ni donnée persistée. En cas d'échec :

1. arrêter la promotion avant mutation si un gate échoue;
2. sinon redéployer l'image du site correspondant au dernier SHA validé;
3. vérifier le retrait cohérent de la route, des liens et du sitemap;
4. vérifier la restauration du `DemoForm` historique et des pages publiques;
5. ne supprimer aucune donnée, puisqu'aucune donnée Diagnostic n'est persistée côté serveur.

## Verdict

**PRÊT POUR FUSION ET RELEASE GOUVERNÉE, SOUS RÉSERVE D'UNE CI RÉUSSIE SUR LE SHA FINAL.**

Au moment du premier contrôle, la PR est propre, fusionnable et tous ses jobs applicables sont réussis. Ce rapport ajouté à la branche doit lui-même passer les contrôles finaux avant fusion.
