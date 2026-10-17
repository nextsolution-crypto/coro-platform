# Contrôles frontend sur Pull Request

> **Workflow actif : `.github/workflows/frontend-pr-checks.yml`** (ajouté en Phase 42B). Il ne touche ni `deploy.yml`, ni `production-inspection.yml`, ni `website-docker-check.yml`.
> Validation seulement : aucune publication, aucun déploiement, aucun secret, aucun accès à la production.

## Déclenchement et sécurité
- `pull_request` uniquement, filtré sur `coro-frontend/**` et le workflow lui-même. Jamais `pull_request_target` : le code d'une PR s'exécute avec un jeton **en lecture seule** (`permissions: contents: read`), sans secret.
- Aucun `workflow_dispatch`, aucune image, aucun SSH, aucun environnement protégé, aucun accès Docker privilégié, aucune base de données.
- Actions épinglées par empreinte de commit (`actions/checkout`, `actions/setup-node`), identifiants non conservés (`persist-credentials: false`).
- Node 22, `npm ci` sur le lockfile existant, `concurrency` par numéro de PR.
- Ces propriétés sont **verrouillées par un test** (`design-system/ci/frontend-pr-workflow.test.cjs`, intégré à `test:design-system`) : toute régression (écriture, secret, déploiement, action non épinglée, déclencheur interdit) fait échouer la chaîne.

## Ce qui est contrôlé (job bloquant `Frontend checks`)
1. TypeScript (`tsc --noEmit`).
2. `test:design-system` (tokens, thème, registre de routes, kit, banc, garde-fous d'acceptation, garde-fou du workflow).
3. Contrats Glass : `test:settings-glass`, `test:portfolio-glass`.
4. **Autorité et session** : `test:platform-permission-grants`, `test:auth-hydration`.
5. **Rendement et finance gouvernée** (CAD seul, UNKNOWN sans erreur) : `test:rendement` (`rendement.contract`, `financial-money`).
6. Booking et Planning : `test:bookings`, `test:planning`.
7. Commercial : tous les contrats existants (`catalog`, `configurator`, `proposals`, `simulator`, `assumptions`, `content`, `legal-issuer`, `clauses`, `organization-contracts`, `organization360`, `capability-entitlements`, `metering`) et `test:commercial-contracts` (7 contrats auparavant non câblés).
8. `test:control-center`, `test:ui-units`.
9. **Sécurité de production de Liquid Glass** : `production-check` reconstruit sans jeton et vérifie que la bêta est inactive.

Non inclus : les scénarios navigateur (faux API, Chrome) et l'acceptation sur le vrai backend (campagne locale, voir `ACCEPTANCE-REAL-BACKEND.md`) ; ESLint (610 erreurs historiques identiques sur `main` ; la comparaison fichier par fichier face à `main` donne 0 écart).

## Tests auparavant non câblés (15) — classement
| Test | Résultat sur `main` (a91a76f9) | Décision |
|---|---|---|
| `app/dashboard/rendement/rendement.contract` | passe | **bloquant** (`test:rendement`) |
| `app/dashboard/rendement/financial-money` | passe | **bloquant** (`test:rendement`) |
| `components/layout/auth-hydration.contract` | passe | **bloquant** (`test:auth-hydration`) |
| `app/admin/commercial/commercial-center.contract` | passe | **bloquant** (`test:commercial-contracts`) |
| `app/admin/commercial/configuration/configuration.contract` | passe | **bloquant** (`test:commercial-contracts`) |
| `app/admin/commercial/dossier/dossier.contract` | passe | **bloquant** (`test:commercial-contracts`) |
| `app/admin/commercial/entitlements/capability-operations.contract` | passe | **bloquant** (`test:commercial-contracts`) |
| `app/admin/commercial/journey/target-pagination` | passe | **bloquant** (`test:commercial-contracts`) |
| `app/admin/commercial/proposals/[proposalId]/proposal-document-workspace.contract` | passe | **bloquant** (`test:commercial-contracts`) |
| `app/admin/commercial/prospects/prospects.contract` | passe | **bloquant** (`test:commercial-contracts`) |
| `app/admin/control-center/control-center.contract` | passe | **bloquant** (`test:control-center`) |
| `app/settings/activity-types/activity-types` | passe | **bloquant** (`test:ui-units`) |
| `components/workScheduleEditor` | passe | **bloquant** (`test:ui-units`) |
| `app/admin/commercial/journey/journey.contract` | **échoue déjà sur `main`** (« Missing paginated target behavior: router.replace( ») | **non bloquant** : job `Known failures on main`, à corriger dans `main` avant application |
| `components/layout/commercial-navigation.contract` | **échoue déjà sur `main`** (libellé « Configurateur d'offres » absent du menu) | **non bloquant**, idem |

Aucun test lié à la sécurité ou à la finance n'est exclu. Les deux échecs sont des défauts de `main`, non corrigés ici (Liquid Glass ne corrige pas `main`) ; ils restent visibles à chaque PR. Quand `main` les corrige, les déplacer dans le job bloquant.
