# CORO WEB-AI-04/05 — Release readiness

Date de revue : 2026-10-28

Base vérifiée : `origin/main` à `056ae9cbdd201409aefc57d2c8836f822a273077`

Branche : `feature/web-ai-04-05-commercial-observability`
HEAD fonctionnel revu avant réconciliation du rapport : `2e8ba8ab`

## Identification et commits

La branche contient quatre commits fonctionnels au-dessus de la base :

- `c6ee461d` — autorité commerciale gouvernée et observabilité;
- `c6d854e3` — qualification bilingue du site;
- `cf36dd92` — tableau de bord administratif minimisé;
- `44c914de` — preuves d'acceptation locales.

Le présent lot de readiness ajoute uniquement des tests adversariaux, un durcissement d'accessibilité/validation du formulaire, la correction ciblée de Zod et ce rapport. Les autres worktrees et travaux locaux n'ont pas été modifiés.

## Diff Prisma et migration

**PASS.** L'hypothèse d'un remplacement d'environ 8 000 lignes est infirmée par le diff Git réel : `schema.prisma` contient 112 insertions et aucune suppression. La migration `20261111010000_web_ai_commercial_observability` contient 87 insertions. Le diff ajoute quatre enums, trois modèles, la relation `CommercialProspect` attendue, ainsi que les index, clés étrangères et contraintes correspondants; aucun reformatage global ni changement de fin de ligne du schéma n'est présent.

Une base PostgreSQL 16 jetable a été créée, les 157 migrations ont été appliquées depuis zéro, puis `prisma migrate status` a confirmé que le schéma était à jour. Le conteneur et son volume jetable ont ensuite été supprimés de façon ciblée.

## Sécurité commerciale

**PASS.** La qualification demeure facultative et bilingue. L'intention est classée de façon déterministe. Le traitement exige un consentement explicite, distinct du consentement marketing. La validation navigateur et DTO couvre les champs requis, les courriels invalides, les langues/types non permis, les bornes numériques, les versions/actions de consentement forgées et le nombre maximal de modules. L'idempotence et le rattachement à `CommercialProspect` sont conservés. Les erreurs ne produisent pas de faux succès. Aucun courriel, rendez-vous ou fournisseur réel n'est déclenché.

## Observabilité

**PASS.** Les événements persistés sont minimisés et agrégés. Ils n'enregistrent ni conversation complète ni renseignements personnels inutiles. Les métriques couvrent statut, latence, erreurs, questions sans réponse et recommandations. Un échec d'écriture télémétrique est absorbé et ne bloque pas le chat. Les lectures administratives sont soumises à l'autorité de plateforme.

## Super Admin

**PARTIAL.** Les tests serveur prouvent le refus anonyme, le refus d'un administrateur d'organisation, le refus d'un `CLIENT_MANAGER`, et l'exigence conjointe du rôle `SUPER_ADMIN` et de l'autorité Founder. Les états de chargement, vide, erreur et métriques sont couverts par le contrat frontend et le build. Aucune session Super Admin QA authentifiée autorisée n'était disponible; la recette navigateur authentifiée reste `NOT_VERIFIED` et aucune authentification n'a été contournée.

## Accessibilité

**PARTIAL.** Le formulaire utilise des contrôles natifs libellés, une validation native explicite, des messages d'état, un focus programmatique visible sur son titre à l'ouverture et une grille qui passe à une colonne aux petites largeurs. Les parcours FR/EN et les largeurs 1440, 390 et 320 px avaient été contrôlés dans Chrome réel; le correctif responsive est aussi verrouillé par test. Aucun lecteur d'écran réel ni clavier virtuel mobile matériel n'a été exercé, donc la conformité exhaustive reste réservée.

## Dépendances

**PASS.** La dette ciblée Zod du frontend est corrigée de `4.4.3` vers `4.6.6`, sans mise à jour globale. `npm ls zod` résout une version unique et les trois `npm audit --omit=dev` rapportent zéro vulnérabilité. Aucun import produit frontend de Zod n'a été trouvé; le risque de régression est faible et le build frontend passe.

## Tests et builds

- Site : 720/720 tests réussis; TypeScript et build Next.js réussis.
- Frontend : suite Design System réussie; build Next.js et TypeScript intégrés réussis.
- Backend ciblé WEB-AI : 6 suites, 29 tests réussis; build NestJS réussi.
- Backend complet local : 240 suites réussies, 1 ignorée, 1 en échec; 2 271 tests réussis, 2 ignorés, 7 échecs concentrés dans `office-extractor.spec.ts`. Deux extractions dépassent le délai Windows de 5 secondes, ce qui laisse le limiteur occupé pour les cas suivants; le test OCR dépend en plus de `pdftoppm`, absent localement. Ce défaut historique, extérieur au diff WEB-AI-04/05, n'est pas masqué et doit être tranché par la CI Linux.
- PostgreSQL 16 : 157/157 migrations appliquées, statut à jour.
- Audits de production backend/site/frontend : zéro vulnérabilité.
- `git diff --check` : réussi.

## Workflows GitHub et CI

Le workflow principal exécute validations, typage et tests lors des PR et des pushes sur `main`. La construction d'images et le job `production-release` sont limités à `workflow_dispatch`. La release utilise un environnement protégé, des approbations, des images immuables et un verrou de concurrence. Une fusion ne déclenche donc pas automatiquement le déploiement, mais le mandat impose néanmoins une décision humaine séparée.

PR : [#114](https://github.com/nextsolution-crypto/coro-platform/pull/114).

La première exécution a détecté deux incohérences TypeScript dans des tests de la branche : le constructeur du contrôleur public n'injectait pas le nouveau service commercial et les littéraux de consentement du test commercial étaient élargis en `string`. Le commit `2e8ba8ab` les corrige sans changement produit.

La seconde exécution est entièrement réussie : sécurité backend, frontend, tests backend Linux, quatre typechecks, builds portail et Docker du site. Les jobs `build-images` et `production-release` sont explicitement ignorés sur une PR; aucune image ni release n'a été produite.

## Risques et réserves

- Session navigateur Super Admin authentifiée : `NOT_VERIFIED`.
- Lecteur d'écran réel et clavier virtuel matériel : `NOT_VERIFIED`.
- Suite backend complète Windows : échec historique Office/OCR décrit ci-dessus; aucun échec ciblé WEB-AI.
- Bedrock réel reste désactivé et n'a reçu aucun appel.
- Le gate de capacité de production reste une condition distincte avant toute livraison.

## Recommandations

Fusion : possible uniquement après CI obligatoire réussie et décision humaine.

Déploiement : non autorisé dans ce mandat; à planifier séparément après résolution du gate de capacité, sauvegarde, restauration et rollback.

## Verdict

`READY_TO_MERGE` sur décision humaine, avec les réserves non bloquantes d'accessibilité et de navigateur Super Admin ci-dessus. Ce verdict n'autorise ni fusion automatique ni déploiement.
