# Matrice de couverture des routes — Liquid Glass V2

Générée par `npm run glass:inventory-v2 -- --write` (lecture seule du code). Le site vitrine `coro-website` est **exclu** (décision Founder).

## Application CORO (coro-frontend) — 84 routes

| Route | Disposition | Style | Formulaires | Tables | Modales | Sensibilité | Statut Glass |
|---|---|---|---:|---:|---:|---|---|
| `/` | aucun (plein écran) | none | 0 | 0 | 0 | — | beta/skin |
| `/activities/portfolio` | AppLayout | inline-hex | 3 | 2 | 0 | — | beta |
| `/admin/capacity` | AppLayout | inline-hex+tailwind | 0 | 0 | 0 | permissions | beta/skin |
| `/admin/changelog` | AppLayout | inline-hex+tailwind | 1 | 0 | 1 | destructive, permissions | beta/skin |
| `/admin/commercial` | AppLayout | tailwind | 0 | 1 | 0 | financial-legal, permissions | beta/skin |
| `/admin/commercial/assumptions/cost` | AppLayout | tailwind | 2 | 0 | 0 | financial-legal, permissions | beta/skin |
| `/admin/commercial/assumptions/value` | AppLayout | tailwind | 2 | 0 | 0 | financial-legal, permissions | beta/skin |
| `/admin/commercial/clauses` | AppLayout | tailwind | 1 | 0 | 0 | financial-legal, permissions | beta/skin |
| `/admin/commercial/configuration` | AppLayout | tailwind | 0 | 1 | 0 | destructive, financial-legal, permissions | beta/skin |
| `/admin/commercial/configurator` | AppLayout | tailwind | 5 | 2 | 2 | financial-legal, permissions | beta/skin |
| `/admin/commercial/content` | AppLayout | tailwind | 1 | 0 | 0 | financial-legal, permissions | beta/skin |
| `/admin/commercial/contracts` | AppLayout | tailwind | 0 | 1 | 0 | financial-legal, permissions | beta/skin |
| `/admin/commercial/dossier/[targetType]/[targetId]` | AppLayout | tailwind | 2 | 0 | 0 | destructive, financial-legal, permissions | beta/skin |
| `/admin/commercial/entitlements` | AppLayout | tailwind | 0 | 1 | 0 | financial-legal, permissions | beta/skin |
| `/admin/commercial/entitlements/[organizationId]` | aucun (plein écran) | tailwind | 1 | 0 | 0 | financial-legal, permissions | beta/skin |
| `/admin/commercial/journey` | AppLayout | tailwind | 1 | 0 | 0 | financial-legal, permissions | beta/skin |
| `/admin/commercial/legal-issuer` | AppLayout | tailwind | 1 | 0 | 0 | financial-legal, permissions | beta/skin |
| `/admin/commercial/proposals` | AppLayout | tailwind | 1 | 1 | 0 | financial-legal, permissions | beta/skin |
| `/admin/commercial/proposals/[proposalId]` | AppLayout | tailwind | 1 | 2 | 1 | destructive, financial-legal, permissions | beta/skin |
| `/admin/commercial/proposals/new` | AppLayout | tailwind | 1 | 0 | 0 | financial-legal, permissions | beta/skin |
| `/admin/commercial/prospects` | AppLayout | tailwind | 1 | 0 | 0 | financial-legal, permissions | beta/skin |
| `/admin/commercial/reconciliation` | AppLayout | tailwind | 0 | 1 | 0 | financial-legal, permissions | beta/skin |
| `/admin/commercial/simulator` | AppLayout | tailwind | 5 | 0 | 0 | financial-legal, permissions | beta/skin |
| `/admin/control-center` | AppLayout | tailwind | 0 | 1 | 0 | permissions, supervision | beta/skin |
| `/admin/feedback` | AppLayout | inline-hex | 1 | 0 | 0 | destructive, permissions | beta/skin |
| `/admin/health` | AppLayout | inline-hex | 0 | 0 | 0 | permissions, supervision | beta/skin |
| `/admin/mandates` | AppLayout | inline-hex+tailwind | 1 | 1 | 0 | emergency-content, permissions | beta/skin |
| `/admin/map` | AppLayout | inline-hex | 1 | 0 | 1 | permissions | beta/skin |
| `/admin/metering` | AppLayout | tailwind | 1 | 1 | 0 | financial-legal, permissions, supervision | beta/skin |
| `/admin/organizations` | AppLayout | inline-hex+tailwind | 1 | 0 | 1 | destructive, financial-legal, permissions | beta/skin |
| `/admin/organizations/[organizationId]` | AppLayout | inline-hex+tailwind | 1 | 2 | 0 | financial-legal, permissions | beta/skin |
| `/admin/organizations/[organizationId]/clients/[clientId]` | AppLayout | inline-hex+tailwind | 1 | 0 | 0 | financial-legal, permissions | beta/skin |
| `/admin/platform-permission-grants` | AppLayout | tailwind | 1 | 0 | 0 | destructive, financial-legal, permissions | legacy-only |
| `/admin/procedures` | AppLayout | inline-hex+tailwind | 1 | 0 | 1 | emergency-content, permissions | beta/skin |
| `/admin/procedures/[id]` | AppLayout | inline-hex+tailwind | 1 | 0 | 0 | destructive, emergency-content, permissions | beta/skin |
| `/admin/procedures/custom` | AppLayout | inline-hex+tailwind | 1 | 0 | 1 | destructive, emergency-content, permissions | beta/skin |
| `/admin/product-catalog` | AppLayout | tailwind | 0 | 0 | 0 | financial-legal, permissions | beta/skin |
| `/admin/product-catalog/capabilities` | AppLayout | tailwind | 1 | 0 | 0 | financial-legal, permissions | beta/skin |
| `/admin/product-catalog/price-books` | AppLayout | tailwind | 3 | 1 | 1 | destructive, financial-legal, permissions | beta/skin |
| `/admin/projects` | AppLayout | inline-hex | 1 | 1 | 0 | permissions | beta/skin |
| `/admin/referrals` | AppLayout | inline-hex | 1 | 0 | 0 | destructive, permissions | beta/skin |
| `/admin/rex-reports` | AppLayout | inline-hex | 1 | 0 | 0 | permissions | beta/skin |
| `/admin/task-templates` | AppLayout | inline-hex+tailwind | 1 | 0 | 0 | destructive, permissions | beta/skin |
| `/blog` | AppLayout | inline-hex+tailwind | 0 | 0 | 0 | destructive | beta/skin |
| `/blog/[id]/edit` | AppLayout | inline-hex+tailwind | 2 | 0 | 0 | destructive | beta/skin |
| `/blog/new` | AppLayout | inline-hex+tailwind | 2 | 0 | 0 | destructive | beta/skin |
| `/bookings` | AppLayout | inline-hex+tailwind | 1 | 0 | 1 | destructive, emergency-content | beta/skin |
| `/buildings` | AppLayout | inline-hex+tailwind | 1 | 0 | 1 | destructive | beta/skin |
| `/buildings/[id]` | AppLayout | inline-hex+tailwind | 2 | 0 | 1 | — | beta/skin |
| `/buildings/compliance` | AppLayout | inline-hex+tailwind | 1 | 1 | 0 | — | beta/skin |
| `/buildings/map` | AppLayout | inline-hex | 1 | 0 | 1 | — | beta/skin |
| `/clients` | AppLayout | inline-hex+tailwind | 1 | 0 | 1 | destructive | beta/skin |
| `/clients/[id]` | AppLayout | inline-hex+tailwind | 2 | 0 | 0 | permissions | beta/skin |
| `/clients/[id]/portfolio` | AppLayout | inline-hex+tailwind | 2 | 1 | 0 | — | beta/skin |
| `/configurator/[projectId]` | aucun (plein écran) | inline-hex+tailwind | 3 | 1 | 1 | destructive, documents, emergency-content | beta/skin |
| `/configurator/pca/[projectId]` | AppLayout | inline-hex+tailwind | 1 | 0 | 0 | destructive, documents, emergency-content | beta/skin |
| `/dashboard` | AppLayout | inline-hex+tailwind | 0 | 1 | 0 | — | ga |
| `/dashboard/rendement` | AppLayout | tailwind | 0 | 1 | 0 | financial-legal, permissions | beta/skin |
| `/editor/[projectId]` | aucun (plein écran) | inline-hex+tailwind | 15 | 16 | 5 | destructive, documents, emergency-content | beta/skin |
| `/editor/[projectId]/procedures/[procedureId]` | aucun (plein écran) | inline-hex+tailwind | 1 | 0 | 0 | destructive, documents, emergency-content | beta/skin |
| `/glass-kit` | AppLayout | none | 0 | 0 | 0 | — | ga |
| `/library` | AppLayout | inline-hex | 0 | 0 | 0 | emergency-content | beta/skin |
| `/login` | aucun (plein écran) | inline-hex+tailwind | 3 | 0 | 0 | auth | beta/skin |
| `/notifications` | AppLayout | inline-hex | 0 | 0 | 0 | destructive | beta/skin |
| `/planning` | AppLayout | inline-hex+css-module | 7 | 0 | 2 | destructive | beta/skin |
| `/profile` | AppLayout | inline-hex+tailwind | 2 | 0 | 0 | destructive | ga |
| `/profile/rendement` | AppLayout | tailwind | 1 | 0 | 0 | financial-legal | beta/skin |
| `/projects` | AppLayout | inline-hex+tailwind | 1 | 0 | 1 | destructive | beta/skin |
| `/projects/[id]` | AppLayout | inline-hex+tailwind | 3 | 0 | 3 | destructive, documents | beta/skin |
| `/projects/[id]/activities` | aucun (plein écran) | inline-hex+tailwind+css-module | 3 | 0 | 1 | destructive | beta/skin |
| `/projects/[id]/mandate` | AppLayout | inline-hex+tailwind | 7 | 1 | 3 | destructive, emergency-content | beta/skin |
| `/projects/[id]/procedures` | AppLayout | inline-hex+tailwind | 1 | 0 | 1 | destructive, emergency-content | beta/skin |
| `/referrals` | AppLayout | inline-hex+tailwind | 0 | 1 | 0 | — | beta/skin |
| `/reset-password` | aucun (plein écran) | inline-hex+tailwind | 1 | 0 | 0 | auth | beta/skin |
| `/settings` | AppLayout | inline-hex | 0 | 0 | 0 | permissions | beta |
| `/settings/activity-types` | AppLayout | inline-hex+tailwind | 2 | 0 | 0 | destructive, permissions | beta/skin |
| `/settings/feedback` | AppLayout | inline-hex+tailwind | 1 | 0 | 0 | — | beta/skin |
| `/settings/module1-template` | AppLayout | inline-hex+tailwind | 1 | 0 | 0 | — | beta/skin |
| `/settings/organization` | AppLayout | inline-hex+tailwind | 2 | 0 | 0 | destructive, permissions | beta/skin |
| `/settings/profile` | aucun (plein écran) | none | 0 | 0 | 0 | — | beta/skin |
| `/settings/task-templates` | AppLayout | inline-hex+tailwind | 1 | 0 | 0 | destructive | beta/skin |
| `/settings/timelog-categories` | AppLayout | inline-hex+tailwind | 1 | 0 | 0 | destructive | beta/skin |
| `/settings/users` | AppLayout | inline-hex+tailwind | 2 | 1 | 1 | destructive, permissions | beta/skin |
| `/timelog` | AppLayout | inline-hex+tailwind | 1 | 1 | 1 | destructive | beta/skin |

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

