# Liquid Glass V2 — dossier d'acceptation du Founder

Mandat 49 · base `main` `ad9f86e2` + point de contrôle `56dcb5a1` · branche locale `feature/liquid-glass-v2-full-migration` (aucun push, aucune fusion, aucun déploiement).
Pièces : `coverage-matrix.md` (page par page), `ARCHITECTURE.md`, `FOUNDER-ACCEPTANCE-ORDER.md`, `ROLLBACK-AND-RELEASE-DOSSIER.md`. Captures : `D:\CORO-Workspace\artifacts\liquid-glass\v2\screenshots` (498 images, Classique / Clair / Sombre, 1600 et 390 px).

## 1. Couverture

| | Routes | Actives en Glass (préproduction) | Validées | Couverture |
|---|---:|---:|---:|---:|
| Application CORO | 83 (hors outil `/glass-kit`) | 82 | 82 | **98,8 %** |
| Portail client | 36 | 35 | 35 | **97,2 %** |

Détail application : 2 pilotes GA (`/dashboard`, `/profile`), 2 bêtas natives (`/settings`, `/activities/portfolio`), 77 re-teintées, 3 redirections sans interface, **1 exclue** (`/admin/platform-permission-grants`, exception de sécurité : reste Classique).
Détail portail : 32 écrans re-teintés, 3 redirections sans interface (`/`, `/magic`, `/kiosk/qr/[token]`), **1 non vérifiée** (`/files/[id]` : aucune pièce jointe dans les données de test, donc jamais rendue).
Site vitrine : **exclu**, aucun fichier modifié.

## 2. Preuves obtenues (backend et base de test JETABLES, données synthétiques, port 3002 jamais utilisé)

| Contrôle | Résultat |
|---|---|
| TypeScript application et portail | OK |
| 31 scripts `test:*` des deux applications | **31 / 31** |
| Classique identique à la référence `ad9f86e2` (styles calculés de chaque élément, 1600 et 390 px) | **0 écart** (application : 36 vérifications ; portail : 72, hors section « Apparence » volontaire de `/profile`) |
| Parité RBAC : 7 rôles réels × 15 routes sensibles, référence Classique contre V2 Glass | **105 / 105** identiques (refus ADMIN client, sans permission, rôle seul conservés) |
| Acceptation API réelle (Phase 41 rejouée) | 75 OK, 0 KO |
| Balayage visuel réel Light/Dark × 320/390/768/1600 px | application : 0 défaut restant ; portail : 0 défaut (4 redirections et 1 emoji, faux positifs) |
| Scénarios réels (barre latérale 350 px, Classique, chargement paresseux, apparence Clair/Sombre/Système, clavier, modale) | tous satisfaits (application et portail) |
| Accessibilité (axe-core, Classique contre Glass) | portail : 0 nouvelle violation ; application : aucune violation introduite par la teinte |
| Builds de production : sans jeton, jeton accidentel `1`, jeton exact | OK ; routes migrées Glass **seulement** avec le jeton exact ; `/admin/platform-permission-grants` toujours Classique |
| Outils de développement absents de la production | 32 / 32 + 29 / 29 contrôles |
| Retour au Classique si la feuille de teinte ne se charge pas | testé (unitaire et en navigateur) |

## 3. Éléments sensibles

* **Urgence** : le bouton panique et sa fenêtre de résultat gardent leur rendu Classique exact (`data-cg-emergency`) ; les rouges d'urgence ne sont jamais teintés ni translucides ; les écrans de borne gardent leurs couleurs d'état plein écran.
* **Documents** : la feuille de contenu de l'éditeur reste claire (`data-cg-paper`). Cartes : rendu sombre d'origine (`data-cg-keep`).
* **Financier / commercial / rendement** : contenu, montants, devises (CAD seul, UNKNOWN sans erreur) et contrats inchangés ; les scripts `test:rendement`, `test:commercial-*`, `test:organization-*`, etc. conditionnent la migration (registre).
* **Portail** : aucune navigation ni permission interne ; section d'apparence invisible hors préproduction.
* **Aucun changement** : backend, Prisma, permissions, Platform Authority, site vitrine, CI/CD.

## 4. Limites connues et points ouverts

| # | Gravité | Point |
|---|---|---|
| 1 | P1 hérité de `main` — CORRIGÉ par `3fca7996` (mandat 52) | `/dashboard` plante (« This page couldn't load ») dès qu'un projet attend une approbation : `pendingApprovals.map(p => …)` (ligne 270) masque la palette `p` puis appelle `p.bg(…)`. Reproduit à l'identique sur la référence `ad9f86e2` en Classique. Correctif trivial (renommer la variable) à décider séparément. |
| 2 | P2 | La barre du shell Glass V1 contient un `<p>` hors région (axe `region`) : présent aussi en mode îlot, antérieur à la V2. |
| 3 | P2 | `/files/[id]` du portail non vérifiée avec des données. |
| 4 | P2 | Navigateur Chrome émulé uniquement (320/390/768/1600) : pas de Safari, de Firefox ni d'appareil mobile réel ; états rares (erreurs réseau, modales profondes) couverts par la revue manuelle. |
| 5 | Information | La production actuelle (Dockerfile / `deploy.yml`) ne transmet pas le jeton de bêta : la revue du Founder exige un build de préproduction privé (décision séparée, voir `ROLLBACK-AND-RELEASE-DOSSIER.md`). Le portail n'a pas de CI frontend. |
| 6 | Information | La feuille de teinte pèse ≈ 316 Ko (≈ 27 Ko gzippée), chargée uniquement sur les routes re-teintées. |

**P0 ouverts : 0. P1 ouverts : 0 (le P1 hérité est corrigé dans `main` `3fca7996`, fusionné dans V2 : voir `MAIN-RECONCILIATION-52.md`).**

## 5. Reproduire

`npm run test:design-system` · `npm run glass:skin-check` · `npm run glass:sweep` · `npm run glass:classic-compare` · `npm run glass:skin-scenarios` · `npm run glass:validation` · `npm run glass:matrix` (voir `ARCHITECTURE.md`, section outils).
