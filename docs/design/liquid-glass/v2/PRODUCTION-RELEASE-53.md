# Liquid Glass V2 — publication directe en production (mandat 53)

**Décision du Founder** : l'application interne et le portail client ne sont pas utilisés par des clients externes et le développement fonctionnel est suspendu ; Liquid Glass V2 est publié **directement** dans l'environnement de production existant, suivi de la revue page par page du Founder. Aucun VPS de préproduction n'est créé (`PREPROD-PLAN.md` est **remplacé** par cette décision ; il reste une référence si la décision change).
Portée : application CORO et portail client. **Exclu** : `coro-website`.

## Ce que la publication active

* Les builds de production de l'application et du portail reçoivent `NEXT_PUBLIC_GLASS_BETA=production-preview` (workflow `deploy.yml`, job `build-images`, **réservé** à la release manuelle protégée). Les Dockerfile déclarent l'argument avec une valeur **vide par défaut**.
* Effet : les 77 écrans re-teintés de l'application, les 32 du portail et les pilotes natifs rendent Glass **pour l'utilisateur qui choisit Glass** (section « Apparence » de `/profile` ; section équivalente dans le profil du portail). **Classique reste le défaut** (barre latérale 240 px) ; Glass : 350 px par défaut, 180–400 px ajustable ; Clair / Sombre / Système.
* Le jeton **n'est pas un mécanisme d'authentification ni d'autorisation** : aucun droit n'en dépend. Les gardes d'accès (Platform Authority, délégations, refus des ADMIN clients, isolation par organisation, MFA) sont ceux du backend et ne changent pas.
* Le jeton est une chaîne publique dans le bundle client ; les seules variables de build sont des `NEXT_PUBLIC_*` non secrètes (testé : `ops/deploy/glass-preview-token.test.mjs`).
* Inchangés : backend, Prisma (aucune migration), permissions, site vitrine, `docker-compose.yml`, scripts de release (`ops/deploy`), workflow d'inspection.

## Exceptions explicites

* `/admin/platform-permission-grants` reste **Classique** (exception de sécurité documentée).
* Écrans d'urgence : bouton panique et fenêtre de résultat gardent leur rendu Classique exact ; bornes : couleurs d'état plein écran inchangées ; feuille de document de l'éditeur toujours claire ; cartes : rendu sombre d'origine.
* Le Glass repose sur une couche de **re-teinte** des écrans existants, pas sur une réécriture native de tous les composants. Couverture mesurée : application 82/83, portail 35/36 (`coverage-matrix.md`).
* `/files/[id]` (portail) non vérifiée avec des données.

## Chaîne de publication (aucune étape n'est contournée)

1. Branche V2 publiée **sans force** ; Pull Request vers `main` ; CI requise : *Frontend PR Checks* et *Client Portal PR Checks* (nouveau, lecture seule).
2. Revue du diff exact ; fusion par commit de fusion normal seulement si la source revue et toutes les vérifications requises sont confirmées.
3. Push sur `main` : validation (typecheck ×4, tests backend, build du portail) ; **aucune image n'est construite sur push**.
4. **Release de production** : `workflow_dispatch` manuel du workflow protégé *Validate and Release Production* (`release_commit` = SHA complet sur `main`, `production_approval = DEPLOY_PRODUCTION`, `migration_compatibility_approval = CONFIRMED_BACKWARD_COMPATIBLE`), environnement `production` à approbation requise.
   Préalables obligatoires **avant** le déclenchement : inspection de production gouvernée récente **PASS / GO** ; Platform Authority **ACTIVE** ; sauvegarde, restauration et retour arrière confirmés ; SHA exact approuvé ; CI **SUCCESS** ; vérification des empreintes d'images immuables (`release-policy.mjs images`).
   Pas de nouvelle tentative automatique en cas d'échec.
5. Vérifications post-déploiement (liste du mandat) puis revue du Founder, page par page (`FOUNDER-ACCEPTANCE-MATRIX.md`).

## Retour arrière

Niveau 1 : l'utilisateur choisit Classique. Niveau 2 : release gouvernée suivante construite **sans** le jeton (retire l'argument de build) : tout retombe en Classique / îlot, sans toucher aux données. Niveau 3 : `git revert` de la fusion puis release gouvernée. Aucune migration n'est associée : le retour arrière ne touche jamais la base.
