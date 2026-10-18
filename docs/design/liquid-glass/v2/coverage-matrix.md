# Matrice de couverture Liquid Glass V2 — acceptation page par page

Générée par `design-system/tools/build-matrix.cjs` à partir de l’inventaire des pages, du registre de routes, du balayage visuel réel (Chrome, Light/Dark, 320/390/768/1600 px, sessions d’un backend de test jetable) et de l’exécution de tous les scripts de test. Le site vitrine `coro-website` est **exclu**.

| | Routes | Actives en Glass (préproduction) | Validées sans réserve | Couverture visuelle |
|---|---:|---:|---:|---:|
| Application CORO | 83 | 82 | 82 | **98.8 %** |
| Portail client | 36 | 35 | 35 | **97.2 %** |

## Application CORO

| Route | Rendu | Style | Formulaires | Tables | Modales | Sensibilité | Visuel (L/D × 4 largeurs) | Tests de validation | Statut |
|---|---|---|---:|---:|---:|---|---|---|---|
| `/` | skin (plein écran) | none | 0 | 0 | 0 | — | INACCESSIBLE | — | **MIGRÉE (redirection, sans interface)** |
| `/activities/portfolio` | Glass natif | inline-hex | 3 | 2 | 0 | — | OK | tests locaux | **MIGRÉE** |
| `/admin/capacity` | skin + shell Glass | inline-hex+tailwind | 0 | 0 | 0 | permissions | OK | test:skin: PASS<br>test:design-system: PASS | **MIGRÉE** |
| `/admin/changelog` | skin + shell Glass | inline-hex+tailwind | 1 | 0 | 1 | destructive, permissions | OK | test:skin: PASS<br>test:design-system: PASS | **MIGRÉE** |
| `/admin/commercial` | skin + shell Glass | tailwind | 0 | 1 | 0 | financial-legal, permissions | OK | test:commercial-contracts: PASS<br>test:skin: PASS<br>test:design-system: PASS | **MIGRÉE** |
| `/admin/commercial/assumptions/cost` | skin + shell Glass | tailwind | 2 | 0 | 0 | financial-legal, permissions | OK | test:commercial-contracts: PASS<br>test:commercial-assumptions: PASS<br>test:skin: PASS<br>test:design-system: PASS | **MIGRÉE** |
| `/admin/commercial/assumptions/value` | skin + shell Glass | tailwind | 2 | 0 | 0 | financial-legal, permissions | OK | test:commercial-contracts: PASS<br>test:commercial-assumptions: PASS<br>test:skin: PASS<br>test:design-system: PASS | **MIGRÉE** |
| `/admin/commercial/clauses` | skin + shell Glass | tailwind | 1 | 0 | 0 | financial-legal, permissions | OK | test:commercial-contracts: PASS<br>test:commercial-clauses: PASS<br>test:skin: PASS<br>test:design-system: PASS | **MIGRÉE** |
| `/admin/commercial/configuration` | skin + shell Glass | tailwind | 0 | 1 | 0 | destructive, financial-legal, permissions | OK | test:commercial-contracts: PASS<br>test:skin: PASS<br>test:design-system: PASS | **MIGRÉE** |
| `/admin/commercial/configurator` | skin + shell Glass | tailwind | 5 | 2 | 2 | financial-legal, permissions | OK | test:commercial-contracts: PASS<br>test:commercial-configurator: PASS<br>test:skin: PASS<br>test:design-system: PASS | **MIGRÉE** |
| `/admin/commercial/content` | skin + shell Glass | tailwind | 1 | 0 | 0 | financial-legal, permissions | OK | test:commercial-contracts: PASS<br>test:commercial-content: PASS<br>test:skin: PASS<br>test:design-system: PASS | **MIGRÉE** |
| `/admin/commercial/contracts` | skin + shell Glass | tailwind | 0 | 1 | 0 | financial-legal, permissions | OK | test:commercial-contracts: PASS<br>test:organization-contracts: PASS<br>test:skin: PASS<br>test:design-system: PASS | **MIGRÉE** |
| `/admin/commercial/dossier/[targetType]/[targetId]` | skin + shell Glass | tailwind | 2 | 0 | 0 | destructive, financial-legal, permissions | OK | test:commercial-contracts: PASS<br>test:skin: PASS<br>test:design-system: PASS | **MIGRÉE** |
| `/admin/commercial/entitlements` | skin + shell Glass | tailwind | 0 | 1 | 0 | financial-legal, permissions | OK | test:commercial-contracts: PASS<br>test:capability-entitlements: PASS<br>test:skin: PASS<br>test:design-system: PASS | **MIGRÉE** |
| `/admin/commercial/entitlements/[organizationId]` | skin (plein écran) | tailwind | 1 | 0 | 0 | financial-legal, permissions | OK | test:commercial-contracts: PASS<br>test:capability-entitlements: PASS<br>test:skin: PASS<br>test:design-system: PASS | **MIGRÉE** |
| `/admin/commercial/journey` | skin + shell Glass | tailwind | 1 | 0 | 0 | financial-legal, permissions | OK | test:commercial-contracts: PASS<br>test:skin: PASS<br>test:design-system: PASS | **MIGRÉE** |
| `/admin/commercial/legal-issuer` | skin + shell Glass | tailwind | 1 | 0 | 0 | financial-legal, permissions | OK | test:commercial-contracts: PASS<br>test:commercial-legal-issuer: PASS<br>test:skin: PASS<br>test:design-system: PASS | **MIGRÉE** |
| `/admin/commercial/proposals` | skin + shell Glass | tailwind | 1 | 1 | 0 | financial-legal, permissions | OK | test:commercial-contracts: PASS<br>test:commercial-proposals: PASS<br>test:skin: PASS<br>test:design-system: PASS | **MIGRÉE** |
| `/admin/commercial/proposals/[proposalId]` | skin + shell Glass | tailwind | 1 | 2 | 1 | destructive, financial-legal, permissions | OK | test:commercial-contracts: PASS<br>test:commercial-proposals: PASS<br>test:skin: PASS<br>test:design-system: PASS | **MIGRÉE** |
| `/admin/commercial/proposals/new` | skin + shell Glass | tailwind | 1 | 0 | 0 | financial-legal, permissions | OK | test:commercial-contracts: PASS<br>test:commercial-proposals: PASS<br>test:skin: PASS<br>test:design-system: PASS | **MIGRÉE** |
| `/admin/commercial/prospects` | skin + shell Glass | tailwind | 1 | 0 | 0 | financial-legal, permissions | OK | test:commercial-contracts: PASS<br>test:skin: PASS<br>test:design-system: PASS | **MIGRÉE** |
| `/admin/commercial/reconciliation` | skin + shell Glass | tailwind | 0 | 1 | 0 | financial-legal, permissions | OK | test:commercial-contracts: PASS<br>test:skin: PASS<br>test:design-system: PASS | **MIGRÉE** |
| `/admin/commercial/simulator` | skin + shell Glass | tailwind | 5 | 0 | 0 | financial-legal, permissions | OK | test:commercial-contracts: PASS<br>test:commercial-simulator: PASS<br>test:skin: PASS<br>test:design-system: PASS | **MIGRÉE** |
| `/admin/control-center` | skin + shell Glass | tailwind | 0 | 1 | 0 | permissions, supervision | OK | test:control-center: PASS<br>test:skin: PASS<br>test:design-system: PASS | **MIGRÉE** |
| `/admin/feedback` | skin + shell Glass | inline-hex | 1 | 0 | 0 | destructive, permissions | OK | test:skin: PASS<br>test:design-system: PASS | **MIGRÉE** |
| `/admin/health` | skin + shell Glass | inline-hex | 0 | 0 | 0 | permissions, supervision | OK | test:skin: PASS<br>test:design-system: PASS | **MIGRÉE** |
| `/admin/mandates` | skin + shell Glass | inline-hex+tailwind | 1 | 1 | 0 | emergency-content, permissions | OK | test:skin: PASS<br>test:design-system: PASS | **MIGRÉE** |
| `/admin/map` | skin + shell Glass | inline-hex | 1 | 0 | 1 | permissions | OK | test:skin: PASS<br>test:design-system: PASS | **MIGRÉE** |
| `/admin/metering` | skin + shell Glass | tailwind | 1 | 1 | 0 | financial-legal, permissions, supervision | OK | test:metering: PASS<br>test:skin: PASS<br>test:design-system: PASS | **MIGRÉE** |
| `/admin/organizations` | skin + shell Glass | inline-hex+tailwind | 1 | 0 | 1 | destructive, financial-legal, permissions | OK | test:organization360: PASS<br>test:organization-contracts: PASS<br>test:capability-entitlements: PASS<br>test:skin: PASS<br>test:design-system: PASS | **MIGRÉE** |
| `/admin/organizations/[organizationId]` | skin + shell Glass | inline-hex+tailwind | 1 | 2 | 0 | financial-legal, permissions | OK | test:organization360: PASS<br>test:organization-contracts: PASS<br>test:capability-entitlements: PASS<br>test:skin: PASS<br>test:design-system: PASS | **MIGRÉE** |
| `/admin/organizations/[organizationId]/clients/[clientId]` | skin + shell Glass | inline-hex+tailwind | 1 | 0 | 0 | financial-legal, permissions | OK | test:organization360: PASS<br>test:organization-contracts: PASS<br>test:capability-entitlements: PASS<br>test:skin: PASS<br>test:design-system: PASS | **MIGRÉE** |
| `/admin/platform-permission-grants` | Legacy | tailwind | 1 | 0 | 0 | destructive, financial-legal, permissions | — | tests locaux | **EXCLUE** |
| `/admin/procedures` | skin + shell Glass | inline-hex+tailwind | 1 | 0 | 1 | emergency-content, permissions | OK | test:skin: PASS<br>test:design-system: PASS | **MIGRÉE** |
| `/admin/procedures/[id]` | skin + shell Glass | inline-hex+tailwind | 1 | 0 | 0 | destructive, emergency-content, permissions | OK | test:skin: PASS<br>test:design-system: PASS | **MIGRÉE** |
| `/admin/procedures/custom` | skin + shell Glass | inline-hex+tailwind | 1 | 0 | 1 | destructive, emergency-content, permissions | OK | test:skin: PASS<br>test:design-system: PASS | **MIGRÉE** |
| `/admin/product-catalog` | skin + shell Glass | tailwind | 0 | 0 | 0 | financial-legal, permissions | OK | test:commercial-catalog: PASS<br>test:skin: PASS<br>test:design-system: PASS | **MIGRÉE** |
| `/admin/product-catalog/capabilities` | skin + shell Glass | tailwind | 1 | 0 | 0 | financial-legal, permissions | OK | test:commercial-catalog: PASS<br>test:skin: PASS<br>test:design-system: PASS | **MIGRÉE** |
| `/admin/product-catalog/price-books` | skin + shell Glass | tailwind | 3 | 1 | 1 | destructive, financial-legal, permissions | OK | test:commercial-catalog: PASS<br>test:skin: PASS<br>test:design-system: PASS | **MIGRÉE** |
| `/admin/projects` | skin + shell Glass | inline-hex | 1 | 1 | 0 | permissions | OK | test:skin: PASS<br>test:design-system: PASS | **MIGRÉE** |
| `/admin/referrals` | skin + shell Glass | inline-hex | 1 | 0 | 0 | destructive, permissions | OK | test:skin: PASS<br>test:design-system: PASS | **MIGRÉE** |
| `/admin/rex-reports` | skin + shell Glass | inline-hex | 1 | 0 | 0 | permissions | OK | test:skin: PASS<br>test:design-system: PASS | **MIGRÉE** |
| `/admin/task-templates` | skin + shell Glass | inline-hex+tailwind | 1 | 0 | 0 | destructive, permissions | OK | test:skin: PASS<br>test:design-system: PASS | **MIGRÉE** |
| `/blog` | skin + shell Glass | inline-hex+tailwind | 0 | 0 | 0 | destructive | OK | — | **MIGRÉE** |
| `/blog/[id]/edit` | skin + shell Glass | inline-hex+tailwind | 2 | 0 | 0 | destructive | OK | — | **MIGRÉE** |
| `/blog/new` | skin + shell Glass | inline-hex+tailwind | 2 | 0 | 0 | destructive | OK | — | **MIGRÉE** |
| `/bookings` | skin + shell Glass | inline-hex+tailwind | 1 | 0 | 1 | destructive, emergency-content | OK | test:bookings: PASS<br>test:skin: PASS<br>test:design-system: PASS | **MIGRÉE** |
| `/buildings` | skin + shell Glass | inline-hex+tailwind | 1 | 0 | 1 | destructive | OK | — | **MIGRÉE** |
| `/buildings/[id]` | skin + shell Glass | inline-hex+tailwind | 2 | 0 | 1 | — | OK | — | **MIGRÉE** |
| `/buildings/compliance` | skin + shell Glass | inline-hex+tailwind | 1 | 1 | 0 | — | OK | — | **MIGRÉE** |
| `/buildings/map` | skin + shell Glass | inline-hex | 1 | 0 | 1 | — | OK | — | **MIGRÉE** |
| `/clients` | skin + shell Glass | inline-hex+tailwind | 1 | 0 | 1 | destructive | OK | — | **MIGRÉE** |
| `/clients/[id]` | skin + shell Glass | inline-hex+tailwind | 2 | 0 | 0 | permissions | OK | test:skin: PASS<br>test:design-system: PASS | **MIGRÉE** |
| `/clients/[id]/portfolio` | skin + shell Glass | inline-hex+tailwind | 2 | 1 | 0 | — | OK | — | **MIGRÉE** |
| `/configurator/[projectId]` | skin (plein écran) | inline-hex+tailwind | 3 | 1 | 1 | destructive, documents, emergency-content | OK | test:skin: PASS<br>test:design-system: PASS | **MIGRÉE** |
| `/configurator/pca/[projectId]` | skin + shell Glass | inline-hex+tailwind | 1 | 0 | 0 | destructive, documents, emergency-content | OK | test:skin: PASS<br>test:design-system: PASS | **MIGRÉE** |
| `/dashboard` | Glass natif | inline-hex+tailwind | 0 | 1 | 0 | — | OK | — | **GA (pilote)** |
| `/dashboard/rendement` | skin + shell Glass | tailwind | 0 | 1 | 0 | financial-legal, permissions | OK | test:rendement: PASS<br>test:skin: PASS<br>test:design-system: PASS | **MIGRÉE** |
| `/editor/[projectId]` | skin (plein écran) | inline-hex+tailwind | 15 | 16 | 5 | destructive, documents, emergency-content | OK | test:skin: PASS<br>test:design-system: PASS | **MIGRÉE** |
| `/editor/[projectId]/procedures/[procedureId]` | skin (plein écran) | inline-hex+tailwind | 1 | 0 | 0 | destructive, documents, emergency-content | OK | test:skin: PASS<br>test:design-system: PASS | **MIGRÉE** |
| `/glass-kit` | Glass natif | none | 0 | 0 | 0 | — | — | — | **OUTIL DE DÉVELOPPEMENT** |
| `/library` | skin + shell Glass | inline-hex | 0 | 0 | 0 | emergency-content | OK | test:skin: PASS<br>test:design-system: PASS | **MIGRÉE** |
| `/login` | skin (plein écran) | inline-hex+tailwind | 3 | 0 | 0 | auth | OK | test:auth-hydration: PASS<br>test:skin: PASS<br>test:design-system: PASS | **MIGRÉE** |
| `/notifications` | skin + shell Glass | inline-hex | 0 | 0 | 0 | destructive | OK | — | **MIGRÉE** |
| `/planning` | skin + shell Glass | inline-hex+css-module | 7 | 0 | 2 | destructive | OK | tests locaux | **MIGRÉE** |
| `/profile` | Glass natif | inline-hex+tailwind | 2 | 0 | 0 | destructive | OK | — | **GA (pilote)** |
| `/profile/rendement` | skin + shell Glass | tailwind | 1 | 0 | 0 | financial-legal | OK | test:rendement: PASS<br>test:skin: PASS | **MIGRÉE** |
| `/projects` | skin + shell Glass | inline-hex+tailwind | 1 | 0 | 1 | destructive | OK | — | **MIGRÉE** |
| `/projects/[id]` | skin + shell Glass | inline-hex+tailwind | 3 | 0 | 3 | destructive, documents | OK | test:skin: PASS<br>test:design-system: PASS | **MIGRÉE** |
| `/projects/[id]/activities` | skin (plein écran) | inline-hex+tailwind+css-module | 3 | 0 | 1 | destructive | OK | — | **MIGRÉE** |
| `/projects/[id]/mandate` | skin + shell Glass | inline-hex+tailwind | 7 | 1 | 3 | destructive, emergency-content | OK | test:skin: PASS<br>test:design-system: PASS | **MIGRÉE** |
| `/projects/[id]/procedures` | skin + shell Glass | inline-hex+tailwind | 1 | 0 | 1 | destructive, emergency-content | OK | test:skin: PASS<br>test:design-system: PASS | **MIGRÉE** |
| `/referrals` | skin + shell Glass | inline-hex+tailwind | 0 | 1 | 0 | — | OK | — | **MIGRÉE** |
| `/reset-password` | skin (plein écran) | inline-hex+tailwind | 1 | 0 | 0 | auth | INACCESSIBLE | test:auth-hydration: PASS<br>test:skin: PASS<br>test:design-system: PASS | **MIGRÉE (redirection, sans interface)** |
| `/settings` | Glass natif | inline-hex | 0 | 0 | 0 | permissions | OK | tests locaux | **MIGRÉE** |
| `/settings/activity-types` | skin + shell Glass | inline-hex+tailwind | 2 | 0 | 0 | destructive, permissions | OK | tests locaux | **MIGRÉE** |
| `/settings/feedback` | skin + shell Glass | inline-hex+tailwind | 1 | 0 | 0 | — | OK | tests locaux | **MIGRÉE** |
| `/settings/module1-template` | skin + shell Glass | inline-hex+tailwind | 1 | 0 | 0 | — | OK | tests locaux | **MIGRÉE** |
| `/settings/organization` | skin + shell Glass | inline-hex+tailwind | 2 | 0 | 0 | destructive, permissions | OK | test:skin: PASS<br>test:design-system: PASS | **MIGRÉE** |
| `/settings/profile` | skin (plein écran) | none | 0 | 0 | 0 | — | INACCESSIBLE | tests locaux | **MIGRÉE (redirection, sans interface)** |
| `/settings/task-templates` | skin + shell Glass | inline-hex+tailwind | 1 | 0 | 0 | destructive | OK | tests locaux | **MIGRÉE** |
| `/settings/timelog-categories` | skin + shell Glass | inline-hex+tailwind | 1 | 0 | 0 | destructive | OK | tests locaux | **MIGRÉE** |
| `/settings/users` | skin + shell Glass | inline-hex+tailwind | 2 | 1 | 1 | destructive, permissions | OK | test:skin: PASS<br>test:design-system: PASS | **MIGRÉE** |
| `/timelog` | skin + shell Glass | inline-hex+tailwind | 1 | 1 | 1 | destructive | OK | — | **MIGRÉE** |

## Portail client

| Route | Rendu | Style | Formulaires | Tables | Modales | Sensibilité | Visuel (L/D × 4 largeurs) | Tests de validation | Statut |
|---|---|---|---:|---:|---:|---|---|---|---|
| `/` | skin (plein écran) | inline-hex | 0 | 0 | 0 | — | INACCESSIBLE | — | **MIGRÉE (redirection, sans interface)** |
| `/activities` | skin (plein écran) | inline-hex | 1 | 0 | 0 | — | OK | — | **MIGRÉE** |
| `/bookings` | skin (plein écran) | inline-hex+tailwind | 1 | 0 | 0 | destructive | OK | test:skin: PASS<br>test:bookings: PASS | **MIGRÉE** |
| `/buildings` | skin (plein écran) | inline-hex | 0 | 0 | 0 | — | OK | — | **MIGRÉE** |
| `/dashboard` | skin (plein écran) | inline-hex | 1 | 0 | 0 | — | OK | — | **MIGRÉE** |
| `/documents` | skin (plein écran) | inline-hex | 1 | 0 | 0 | — | OK | test:skin: PASS | **MIGRÉE** |
| `/documents/[id]` | skin (plein écran) | inline-hex | 1 | 0 | 1 | — | OK | test:skin: PASS | **MIGRÉE** |
| `/files/[id]` | skin (plein écran) | inline-hex | 1 | 0 | 1 | — | INACCESSIBLE | test:skin: PASS | **NON VALIDÉE** |
| `/forgot-password` | skin (plein écran) | none | 1 | 0 | 0 | auth | OK | test:skin: PASS | **MIGRÉE** |
| `/intelligence` | skin (plein écran) | inline-hex | 1 | 0 | 0 | — | OK | — | **MIGRÉE** |
| `/intervention/[token]` | skin (plein écran) | inline-hex | 0 | 0 | 0 | emergency-content | OK | test:skin: PASS | **MIGRÉE** |
| `/kiosk/[token]` | skin (plein écran) | inline-hex | 1 | 0 | 0 | destructive, emergency-content | OK | test:skin: PASS | **MIGRÉE** |
| `/kiosk/qr/[token]` | skin (plein écran) | inline-hex | 0 | 0 | 0 | emergency-content | INACCESSIBLE | test:skin: PASS | **MIGRÉE (redirection, sans interface)** |
| `/login` | skin (plein écran) | inline-hex | 1 | 0 | 0 | auth | OK | test:skin: PASS | **MIGRÉE** |
| `/magic` | skin (plein écran) | inline-hex+tailwind | 0 | 0 | 0 | auth | INACCESSIBLE | test:skin: PASS | **MIGRÉE (redirection, sans interface)** |
| `/map` | skin (plein écran) | inline-hex | 0 | 0 | 1 | — | OK | — | **MIGRÉE** |
| `/notifications` | skin (plein écran) | inline-hex | 0 | 0 | 0 | — | OK | — | **MIGRÉE** |
| `/offline` | skin (plein écran) | inline-hex | 0 | 0 | 0 | — | OK | — | **MIGRÉE** |
| `/population/[publicSlug]` | skin (plein écran) | inline-hex+css-module | 7 | 0 | 0 | emergency-content | OK | test:skin: PASS<br>test:population-identity: PASS<br>test:population-profile: PASS<br>test:population-sharing: PASS<br>test:sms-compliance: PASS | **MIGRÉE** |
| `/presence/[kioskToken]` | skin (plein écran) | inline-hex | 0 | 0 | 0 | emergency-content | OK | test:skin: PASS | **MIGRÉE** |
| `/profile` | skin (plein écran) | inline-hex | 1 | 0 | 0 | — | OK | — | **MIGRÉE** |
| `/reset-password` | skin (plein écran) | none | 1 | 0 | 0 | auth | OK | test:skin: PASS | **MIGRÉE** |
| `/sentinelle/[buildingId]` | skin (plein écran) | inline-hex | 0 | 0 | 1 | destructive, emergency-content | OK | test:skin: PASS<br>test:sentinelle-auth: PASS | **MIGRÉE** |
| `/sentinelle/[buildingId]/corrective-actions/[actionId]` | skin (plein écran) | inline-hex+css-module | 2 | 0 | 0 | destructive, emergency-content | OK | test:skin: PASS<br>test:sentinelle-auth: PASS | **MIGRÉE** |
| `/sentinelle/[buildingId]/employes` | skin (plein écran) | inline-hex | 1 | 1 | 1 | destructive, emergency-content | OK | test:skin: PASS<br>test:sentinelle-auth: PASS | **MIGRÉE** |
| `/sentinelle/[buildingId]/evacuation` | skin (plein écran) | inline-hex | 0 | 0 | 0 | destructive, emergency-content | OK | test:skin: PASS<br>test:sentinelle-auth: PASS | **MIGRÉE** |
| `/sentinelle/[buildingId]/historique` | skin (plein écran) | inline-hex | 1 | 0 | 0 | emergency-content | OK | test:skin: PASS<br>test:sentinelle-auth: PASS | **MIGRÉE** |
| `/sentinelle/[buildingId]/incident` | skin (plein écran) | inline-hex | 1 | 0 | 0 | destructive, emergency-content | OK | test:skin: PASS<br>test:sentinelle-auth: PASS | **MIGRÉE** |
| `/sentinelle/[buildingId]/incidents` | skin (plein écran) | inline-hex | 0 | 0 | 0 | emergency-content | OK | test:skin: PASS<br>test:sentinelle-auth: PASS | **MIGRÉE** |
| `/sentinelle/[buildingId]/incidents/[incidentId]` | skin (plein écran) | inline-hex | 1 | 0 | 0 | emergency-content | OK | test:skin: PASS<br>test:sentinelle-auth: PASS | **MIGRÉE** |
| `/sentinelle/[buildingId]/invitations` | skin (plein écran) | inline-hex | 1 | 0 | 0 | emergency-content | OK | test:skin: PASS<br>test:sentinelle-auth: PASS | **MIGRÉE** |
| `/sentinelle/[buildingId]/population` | skin (plein écran) | inline-hex+css-module | 1 | 0 | 2 | destructive, emergency-content | OK | test:skin: PASS<br>test:sentinelle-auth: PASS<br>test:population-sharing: PASS<br>test:population-identity: PASS<br>test:population-profile: PASS | **MIGRÉE** |
| `/sentinelle/[buildingId]/population/evidence/[evidenceId]` | skin (plein écran) | inline-hex+css-module | 0 | 2 | 0 | destructive, emergency-content | OK | test:skin: PASS<br>test:sentinelle-auth: PASS<br>test:population-sharing: PASS<br>test:population-identity: PASS<br>test:population-profile: PASS | **MIGRÉE** |
| `/sentinelle/[buildingId]/population/reviews/[reviewId]` | skin (plein écran) | inline-hex+css-module | 1 | 0 | 0 | destructive, emergency-content | OK | test:skin: PASS<br>test:sentinelle-auth: PASS<br>test:population-sharing: PASS<br>test:population-identity: PASS<br>test:population-profile: PASS | **MIGRÉE** |
| `/sentinelle/[buildingId]/rapports` | skin (plein écran) | inline-hex | 0 | 2 | 0 | emergency-content | OK | test:skin: PASS<br>test:sentinelle-auth: PASS | **MIGRÉE** |
| `/sentinelle/[buildingId]/resilience` | skin (plein écran) | inline-hex | 0 | 0 | 0 | emergency-content | OK | test:skin: PASS<br>test:sentinelle-auth: PASS | **MIGRÉE** |

