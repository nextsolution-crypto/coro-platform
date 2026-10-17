# Matrice de couverture des routes — Liquid Glass V2

Générée par `npm run glass:inventory-v2 -- --write` (lecture seule du code). Le site vitrine `coro-website` est **exclu** (décision Founder).

## Application CORO (coro-frontend) — 84 routes

| Route | Disposition | Style | Formulaires | Tables | Modales | Sensibilité | Statut Glass |
|---|---|---|---:|---:|---:|---|---|
| `/` | aucun (plein écran) | none | 0 | 0 | 0 | — | legacy-only |
| `/activities/portfolio` | AppLayout | inline-hex | 3 | 2 | 0 | — | beta |
| `/admin/capacity` | AppLayout | inline-hex+tailwind | 0 | 0 | 0 | permissions | legacy-only |
| `/admin/changelog` | AppLayout | inline-hex+tailwind | 1 | 0 | 1 | destructive, permissions | legacy-only |
| `/admin/commercial` | AppLayout | tailwind | 0 | 1 | 0 | financial-legal, permissions | legacy-only |
| `/admin/commercial/assumptions/cost` | AppLayout | tailwind | 2 | 0 | 0 | financial-legal, permissions | legacy-only |
| `/admin/commercial/assumptions/value` | AppLayout | tailwind | 2 | 0 | 0 | financial-legal, permissions | legacy-only |
| `/admin/commercial/clauses` | AppLayout | tailwind | 1 | 0 | 0 | financial-legal, permissions | legacy-only |
| `/admin/commercial/configuration` | AppLayout | tailwind | 0 | 1 | 0 | destructive, financial-legal, permissions | legacy-only |
| `/admin/commercial/configurator` | AppLayout | tailwind | 5 | 2 | 2 | financial-legal, permissions | legacy-only |
| `/admin/commercial/content` | AppLayout | tailwind | 1 | 0 | 0 | financial-legal, permissions | legacy-only |
| `/admin/commercial/contracts` | AppLayout | tailwind | 0 | 1 | 0 | financial-legal, permissions | legacy-only |
| `/admin/commercial/dossier/[targetType]/[targetId]` | AppLayout | tailwind | 2 | 0 | 0 | destructive, financial-legal, permissions | legacy-only |
| `/admin/commercial/entitlements` | AppLayout | tailwind | 0 | 1 | 0 | financial-legal, permissions | legacy-only |
| `/admin/commercial/entitlements/[organizationId]` | aucun (plein écran) | tailwind | 1 | 0 | 0 | financial-legal, permissions | legacy-only |
| `/admin/commercial/journey` | AppLayout | tailwind | 1 | 0 | 0 | financial-legal, permissions | legacy-only |
| `/admin/commercial/legal-issuer` | AppLayout | tailwind | 1 | 0 | 0 | financial-legal, permissions | legacy-only |
| `/admin/commercial/proposals` | AppLayout | tailwind | 1 | 1 | 0 | financial-legal, permissions | legacy-only |
| `/admin/commercial/proposals/[proposalId]` | AppLayout | tailwind | 1 | 2 | 1 | destructive, financial-legal, permissions | legacy-only |
| `/admin/commercial/proposals/new` | AppLayout | tailwind | 1 | 0 | 0 | financial-legal, permissions | legacy-only |
| `/admin/commercial/prospects` | AppLayout | tailwind | 1 | 0 | 0 | financial-legal, permissions | legacy-only |
| `/admin/commercial/reconciliation` | AppLayout | tailwind | 0 | 1 | 0 | financial-legal, permissions | legacy-only |
| `/admin/commercial/simulator` | AppLayout | tailwind | 5 | 0 | 0 | financial-legal, permissions | legacy-only |
| `/admin/control-center` | AppLayout | tailwind | 0 | 1 | 0 | permissions, supervision | legacy-only |
| `/admin/feedback` | AppLayout | inline-hex | 1 | 0 | 0 | destructive, permissions | legacy-only |
| `/admin/health` | AppLayout | inline-hex | 0 | 0 | 0 | permissions, supervision | legacy-only |
| `/admin/mandates` | AppLayout | inline-hex+tailwind | 1 | 1 | 0 | emergency-content, permissions | legacy-only |
| `/admin/map` | AppLayout | inline-hex | 1 | 0 | 1 | permissions | legacy-only |
| `/admin/metering` | AppLayout | tailwind | 1 | 1 | 0 | financial-legal, permissions, supervision | legacy-only |
| `/admin/organizations` | AppLayout | inline-hex+tailwind | 1 | 0 | 1 | destructive, financial-legal, permissions | legacy-only |
| `/admin/organizations/[organizationId]` | AppLayout | inline-hex+tailwind | 1 | 2 | 0 | financial-legal, permissions | legacy-only |
| `/admin/organizations/[organizationId]/clients/[clientId]` | AppLayout | inline-hex+tailwind | 1 | 0 | 0 | financial-legal, permissions | legacy-only |
| `/admin/platform-permission-grants` | AppLayout | tailwind | 1 | 0 | 0 | destructive, financial-legal, permissions | legacy-only |
| `/admin/procedures` | AppLayout | inline-hex+tailwind | 1 | 0 | 1 | emergency-content, permissions | legacy-only |
| `/admin/procedures/[id]` | AppLayout | inline-hex+tailwind | 1 | 0 | 0 | destructive, emergency-content, permissions | legacy-only |
| `/admin/procedures/custom` | AppLayout | inline-hex+tailwind | 1 | 0 | 1 | destructive, emergency-content, permissions | legacy-only |
| `/admin/product-catalog` | AppLayout | tailwind | 0 | 0 | 0 | financial-legal, permissions | legacy-only |
| `/admin/product-catalog/capabilities` | AppLayout | tailwind | 1 | 0 | 0 | financial-legal, permissions | legacy-only |
| `/admin/product-catalog/price-books` | AppLayout | tailwind | 3 | 1 | 1 | destructive, financial-legal, permissions | legacy-only |
| `/admin/projects` | AppLayout | inline-hex | 1 | 1 | 0 | permissions | legacy-only |
| `/admin/referrals` | AppLayout | inline-hex | 1 | 0 | 0 | destructive, permissions | legacy-only |
| `/admin/rex-reports` | AppLayout | inline-hex | 1 | 0 | 0 | permissions | legacy-only |
| `/admin/task-templates` | AppLayout | inline-hex+tailwind | 1 | 0 | 0 | destructive, permissions | legacy-only |
| `/blog` | AppLayout | inline-hex+tailwind | 0 | 0 | 0 | destructive | legacy-only |
| `/blog/[id]/edit` | AppLayout | inline-hex+tailwind | 2 | 0 | 0 | destructive | legacy-only |
| `/blog/new` | AppLayout | inline-hex+tailwind | 2 | 0 | 0 | destructive | legacy-only |
| `/bookings` | AppLayout | inline-hex+tailwind | 1 | 0 | 1 | destructive, emergency-content | legacy-only |
| `/buildings` | AppLayout | inline-hex+tailwind | 1 | 0 | 1 | destructive | legacy-only |
| `/buildings/[id]` | AppLayout | inline-hex+tailwind | 2 | 0 | 1 | — | legacy-only |
| `/buildings/compliance` | AppLayout | inline-hex+tailwind | 1 | 1 | 0 | — | legacy-only |
| `/buildings/map` | AppLayout | inline-hex | 1 | 0 | 1 | — | legacy-only |
| `/clients` | AppLayout | inline-hex+tailwind | 1 | 0 | 1 | destructive | legacy-only |
| `/clients/[id]` | AppLayout | inline-hex+tailwind | 2 | 0 | 0 | permissions | legacy-only |
| `/clients/[id]/portfolio` | AppLayout | inline-hex+tailwind | 2 | 1 | 0 | — | legacy-only |
| `/configurator/[projectId]` | aucun (plein écran) | inline-hex+tailwind | 3 | 1 | 1 | destructive, documents, emergency-content | legacy-only |
| `/configurator/pca/[projectId]` | AppLayout | inline-hex+tailwind | 1 | 0 | 0 | destructive, documents, emergency-content | legacy-only |
| `/dashboard` | AppLayout | inline-hex+tailwind | 0 | 1 | 0 | — | ga |
| `/dashboard/rendement` | AppLayout | tailwind | 0 | 1 | 0 | financial-legal, permissions | legacy-only |
| `/editor/[projectId]` | aucun (plein écran) | inline-hex+tailwind | 15 | 16 | 5 | destructive, documents, emergency-content | legacy-only |
| `/editor/[projectId]/procedures/[procedureId]` | aucun (plein écran) | inline-hex+tailwind | 1 | 0 | 0 | destructive, documents, emergency-content | legacy-only |
| `/glass-kit` | AppLayout | none | 0 | 0 | 0 | — | ga |
| `/library` | AppLayout | inline-hex | 0 | 0 | 0 | emergency-content | legacy-only |
| `/login` | aucun (plein écran) | inline-hex+tailwind | 3 | 0 | 0 | auth | legacy-only |
| `/notifications` | AppLayout | inline-hex | 0 | 0 | 0 | destructive | legacy-only |
| `/planning` | AppLayout | inline-hex+css-module | 7 | 0 | 2 | destructive | legacy-only |
| `/profile` | AppLayout | inline-hex+tailwind | 2 | 0 | 0 | destructive | ga |
| `/profile/rendement` | AppLayout | tailwind | 1 | 0 | 0 | financial-legal | legacy-only |
| `/projects` | AppLayout | inline-hex+tailwind | 1 | 0 | 1 | destructive | legacy-only |
| `/projects/[id]` | AppLayout | inline-hex+tailwind | 3 | 0 | 3 | destructive, documents | legacy-only |
| `/projects/[id]/activities` | aucun (plein écran) | inline-hex+tailwind+css-module | 3 | 0 | 1 | destructive | legacy-only |
| `/projects/[id]/mandate` | AppLayout | inline-hex+tailwind | 7 | 1 | 3 | destructive, emergency-content | legacy-only |
| `/projects/[id]/procedures` | AppLayout | inline-hex+tailwind | 1 | 0 | 1 | destructive, emergency-content | legacy-only |
| `/referrals` | AppLayout | inline-hex+tailwind | 0 | 1 | 0 | — | legacy-only |
| `/reset-password` | aucun (plein écran) | inline-hex+tailwind | 1 | 0 | 0 | auth | legacy-only |
| `/settings` | AppLayout | inline-hex | 0 | 0 | 0 | permissions | beta |
| `/settings/activity-types` | AppLayout | inline-hex+tailwind | 2 | 0 | 0 | destructive, permissions | legacy-only |
| `/settings/feedback` | AppLayout | inline-hex+tailwind | 1 | 0 | 0 | — | legacy-only |
| `/settings/module1-template` | AppLayout | inline-hex+tailwind | 1 | 0 | 0 | — | legacy-only |
| `/settings/organization` | AppLayout | inline-hex+tailwind | 2 | 0 | 0 | destructive, permissions | legacy-only |
| `/settings/profile` | aucun (plein écran) | none | 0 | 0 | 0 | — | legacy-only |
| `/settings/task-templates` | AppLayout | inline-hex+tailwind | 1 | 0 | 0 | destructive | legacy-only |
| `/settings/timelog-categories` | AppLayout | inline-hex+tailwind | 1 | 0 | 0 | destructive | legacy-only |
| `/settings/users` | AppLayout | inline-hex+tailwind | 2 | 1 | 1 | destructive, permissions | legacy-only |
| `/timelog` | AppLayout | inline-hex+tailwind | 1 | 1 | 1 | destructive | legacy-only |

## Portail client (coro-client-portal) — 36 routes

| Route | Disposition | Style | Formulaires | Tables | Modales | Sensibilité | Statut Glass |
|---|---|---|---:|---:|---:|---|---|
| `/` | aucun (plein écran) | inline-hex | 0 | 0 | 0 | — | non couvert (V1) |
| `/activities` | PortalLayout | inline-hex | 1 | 0 | 0 | — | non couvert (V1) |
| `/bookings` | PortalLayout | inline-hex+tailwind | 1 | 0 | 0 | destructive | non couvert (V1) |
| `/buildings` | PortalLayout | inline-hex | 0 | 0 | 0 | — | non couvert (V1) |
| `/dashboard` | PortalLayout | inline-hex | 1 | 0 | 0 | — | non couvert (V1) |
| `/documents` | PortalLayout | inline-hex | 1 | 0 | 0 | — | non couvert (V1) |
| `/documents/[id]` | PortalLayout | inline-hex | 1 | 0 | 1 | — | non couvert (V1) |
| `/files/[id]` | PortalLayout | inline-hex | 1 | 0 | 1 | — | non couvert (V1) |
| `/forgot-password` | aucun (plein écran) | none | 1 | 0 | 0 | auth | non couvert (V1) |
| `/intelligence` | PortalLayout | inline-hex | 1 | 0 | 0 | — | non couvert (V1) |
| `/intervention/[token]` | aucun (plein écran) | inline-hex | 0 | 0 | 0 | emergency-content | non couvert (V1) |
| `/kiosk/[token]` | aucun (plein écran) | inline-hex | 1 | 0 | 0 | destructive, emergency-content | non couvert (V1) |
| `/kiosk/qr/[token]` | aucun (plein écran) | inline-hex | 0 | 0 | 0 | emergency-content | non couvert (V1) |
| `/login` | aucun (plein écran) | inline-hex | 1 | 0 | 0 | auth | non couvert (V1) |
| `/magic` | aucun (plein écran) | inline-hex+tailwind | 0 | 0 | 0 | auth | non couvert (V1) |
| `/map` | PortalLayout | inline-hex | 0 | 0 | 1 | — | non couvert (V1) |
| `/notifications` | PortalLayout | inline-hex | 0 | 0 | 0 | — | non couvert (V1) |
| `/offline` | aucun (plein écran) | inline-hex | 0 | 0 | 0 | — | non couvert (V1) |
| `/population/[publicSlug]` | aucun (plein écran) | inline-hex+css-module | 7 | 0 | 0 | emergency-content | non couvert (V1) |
| `/presence/[kioskToken]` | aucun (plein écran) | inline-hex | 0 | 0 | 0 | emergency-content | non couvert (V1) |
| `/profile` | PortalLayout | inline-hex | 1 | 0 | 0 | — | non couvert (V1) |
| `/reset-password` | aucun (plein écran) | none | 1 | 0 | 0 | auth | non couvert (V1) |
| `/sentinelle/[buildingId]` | PortalLayout | inline-hex | 0 | 0 | 1 | destructive, emergency-content | non couvert (V1) |
| `/sentinelle/[buildingId]/corrective-actions/[actionId]` | PortalLayout | inline-hex+css-module | 2 | 0 | 0 | destructive, emergency-content | non couvert (V1) |
| `/sentinelle/[buildingId]/employes` | PortalLayout | inline-hex | 1 | 1 | 1 | destructive, emergency-content | non couvert (V1) |
| `/sentinelle/[buildingId]/evacuation` | PortalLayout | inline-hex | 0 | 0 | 0 | destructive, emergency-content | non couvert (V1) |
| `/sentinelle/[buildingId]/historique` | PortalLayout | inline-hex | 1 | 0 | 0 | emergency-content | non couvert (V1) |
| `/sentinelle/[buildingId]/incident` | PortalLayout | inline-hex | 1 | 0 | 0 | destructive, emergency-content | non couvert (V1) |
| `/sentinelle/[buildingId]/incidents` | PortalLayout | inline-hex | 0 | 0 | 0 | emergency-content | non couvert (V1) |
| `/sentinelle/[buildingId]/incidents/[incidentId]` | PortalLayout | inline-hex | 1 | 0 | 0 | emergency-content | non couvert (V1) |
| `/sentinelle/[buildingId]/invitations` | PortalLayout | inline-hex | 1 | 0 | 0 | emergency-content | non couvert (V1) |
| `/sentinelle/[buildingId]/population` | PortalLayout | inline-hex+css-module | 1 | 0 | 2 | destructive, emergency-content | non couvert (V1) |
| `/sentinelle/[buildingId]/population/evidence/[evidenceId]` | PortalLayout | inline-hex+css-module | 0 | 2 | 0 | destructive, emergency-content | non couvert (V1) |
| `/sentinelle/[buildingId]/population/reviews/[reviewId]` | PortalLayout | inline-hex+css-module | 1 | 0 | 0 | destructive, emergency-content | non couvert (V1) |
| `/sentinelle/[buildingId]/rapports` | PortalLayout | inline-hex | 0 | 2 | 0 | emergency-content | non couvert (V1) |
| `/sentinelle/[buildingId]/resilience` | PortalLayout | inline-hex | 0 | 0 | 0 | emergency-content | non couvert (V1) |

