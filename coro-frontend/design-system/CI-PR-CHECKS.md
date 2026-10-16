# Proposition — contrôles frontend sur Pull Request

> **Document de proposition : aucun workflow n'est ajouté ni modifié par ce fichier.** Le pipeline de production (`.github/workflows/deploy.yml`) n'est pas touché.
> Pour l'activer, un propriétaire du dépôt doit créer le fichier ci-dessous dans `.github/workflows/` (décision distincte, hors Liquid Glass).

## Constat (état de `main`)
- Aucun contrôle frontend ne s'exécute **avant** la fusion : `deploy.yml` valide au push sur `main` (`tsc` des quatre applications, tests backend, build du portail client) et ne déploie qu'en `workflow_dispatch` protégé.
- Seul `website-docker-check.yml` tourne sur Pull Request (chemins `coro-website/**`) : c'est le précédent à suivre (déclenchement `pull_request` + filtre de chemins, `permissions: contents: read`).
- `npm test` n'existe pas côté frontend ; 15 fichiers de test ne sont câblés dans aucun script npm (voir la liste en fin de document).

## Workflow proposé (`frontend-pr-checks.yml`)
```yaml
name: Frontend PR Checks

on:
  pull_request:
    paths:
      - "coro-frontend/**"
      - ".github/workflows/frontend-pr-checks.yml"
  workflow_dispatch:

permissions:
  contents: read

concurrency:
  group: frontend-pr-${{ github.ref }}
  cancel-in-progress: true

jobs:
  frontend-checks:
    runs-on: ubuntu-latest
    timeout-minutes: 20
    defaults:
      run:
        working-directory: coro-frontend
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
          cache-dependency-path: coro-frontend/package-lock.json
      - run: npm ci
      - name: Type check
        run: npx tsc --noEmit --incremental false
      - name: Design system and bench contract tests
        run: npm run test:design-system
      - name: Glass page contracts
        run: |
          npm run test:settings-glass
          npm run test:portfolio-glass
      - name: Critical product contracts (rendement, financial display, platform grants)
        run: |
          node app/dashboard/rendement/rendement.contract.test.cjs
          node app/dashboard/rendement/financial-money.test.cjs
          npm run test:platform-permission-grants
      - name: Booking, planning and commercial contracts
        run: |
          npm run test:bookings
          npm run test:planning
          npm run test:commercial-configurator
          npm run test:commercial-catalog
          npm run test:commercial-proposals
      - name: Production safety of the Glass beta (build without token)
        run: node design-system/tools/production-check.cjs
```

## Choix et garde-fous
- **Lecture seule, sans secret, sans déploiement** : `permissions: contents: read`, aucun environnement protégé, aucune image, aucun accès à la production. Indépendant de `deploy.yml`.
- **Filtre de chemins** `coro-frontend/**` : une PR qui ne touche pas le frontend ne paie pas ces contrôles.
- **`production-check`** reconstruit `.next` sans jeton et vérifie que la bêta Liquid Glass reste désactivée (`NEXT_PUBLIC_GLASS_BETA` absent) : c'est le contrôle qui protège la production. Il est le plus long (build Next.js) ; il peut être placé dans un second job si la durée devient gênante.
- **Linux** : les fins de ligne du dépôt sont LF, ce qui est ce qu'attendent les tests de contrat. Les tests du cycle de vie Chrome du banc sont ignorés automatiquement sans Chrome (`CHROME_PATH`).
- **Non inclus volontairement** : les scénarios navigateur (faux API, Chrome) — réservés à la campagne locale `glass:campaign` — et l'acceptation sur le vrai backend (voir `ACCEPTANCE-REAL-BACKEND.md`).
- **Non inclus : ESLint.** `main` compte aujourd'hui 610 erreurs et 142 avertissements historiques ; un contrôle strict échouerait. Une option raisonnable est un contrôle « pas de nouvelle erreur » par comparaison à `main` (le banc sait comparer fichier par fichier).

## Tests frontend non câblés (à intégrer progressivement)
Inventaire au 17 octobre 2026 (`design-system/` n'est pas concerné : sa chaîne est câblée dans `test:design-system`).

- `app/admin/commercial/` : `commercial-center`, `configuration`, `dossier`, `entitlements/capability-operations`, `journey/journey` (**échoue déjà sur `main`**), `journey/target-pagination` (`.mjs`), `proposals/[proposalId]/proposal-document-workspace`, `prospects`
- `app/admin/control-center/control-center.contract`
- `app/dashboard/rendement/financial-money`, `rendement.contract` (**inclus dans la proposition ci-dessus**)
- `app/settings/activity-types/activity-types`
- `components/layout/auth-hydration.contract`, `commercial-navigation.contract` (**échoue déjà sur `main`**)
- `components/workScheduleEditor`

Recommandation : câbler d'abord ceux qui protègent la sécurité et la finance (`rendement.contract`, `financial-money`, `auth-hydration`), corriger les deux échecs existants dans `main`, puis ajouter les autres.
