# Inventaire canonique des routes — coro-frontend

> Généré par `npm run glass:inventory -- --write` (scanner d’imports × registre). Ne pas éditer à la main : les statuts se changent dans `routes/route-registry.ts`.

**84 routes** (66 statiques, 18 dynamiques) — une page `page.tsx` = une route, aucun double comptage. Avec shell Glass : 75 ; plein écran : 9. Statuts : ga 3 · beta 2 · legacy-only 79.

## Pilote migré — 2 route(s), 1877 lignes, 310 couleurs hex, 15 classes couleur Tailwind

| Route | Type | Shell | Styles | Lignes | Hex | Tailwind | Sensibilité | Statut | Composants partagés |
|---|---|---|---|---:|---:|---:|---|---|---|
| `/dashboard` | statique | app | inline-hex + tailwind | 1241 | 193 | 7 | — | ga | ui/Typography.tsx |
| `/profile` | statique | app | inline-hex + tailwind | 636 | 117 | 8 | destructive | ga | WorkScheduleEditorPanel.tsx, workScheduleEditor.ts |

## Projets, mandats, activités — 11 route(s), 16770 lignes, 1854 couleurs hex, 181 classes couleur Tailwind

| Route | Type | Shell | Styles | Lignes | Hex | Tailwind | Sensibilité | Statut | Composants partagés |
|---|---|---|---|---:|---:|---:|---|---|---|
| `/activities/portfolio` | statique | app | inline-hex | 1106 | 94 | 0 | — | beta | — |
| `/dashboard/rendement` | statique | app | tailwind | 593 | 0 | 33 | financial-legal, permissions | legacy-only | — |
| `/notifications` | statique | app | inline-hex | 605 | 35 | 0 | destructive | legacy-only | — |
| `/planning` | statique | app | inline-hex + css-module | 2514 | 178 | 0 | destructive | legacy-only | — |
| `/profile/rendement` | statique | app | tailwind | 455 | 0 | 34 | — | legacy-only | — |
| `/projects` | statique | app | inline-hex + tailwind | 1173 | 181 | 8 | destructive | legacy-only | ui/Typography.tsx |
| `/projects/[id]` | dynamique | app | inline-hex + tailwind | 4479 | 534 | 16 | destructive, documents | legacy-only | EngagementPanel.tsx, ExportModal.tsx, ProjectFiles.tsx, ui/Typography.tsx |
| `/projects/[id]/activities` | dynamique | none | inline-hex + tailwind + css-module | 1256 | 278 | 3 | destructive | legacy-only | — |
| `/projects/[id]/mandate` | dynamique | app | inline-hex + tailwind | 2958 | 295 | 76 | destructive, emergency-content | legacy-only | — |
| `/projects/[id]/procedures` | dynamique | app | inline-hex + tailwind | 710 | 100 | 6 | destructive, emergency-content | legacy-only | — |
| `/timelog` | statique | app | inline-hex + tailwind | 921 | 159 | 5 | destructive | legacy-only | — |

## Clients, bâtiments, cartes — 9 route(s), 9095 lignes, 933 couleurs hex, 32 classes couleur Tailwind

| Route | Type | Shell | Styles | Lignes | Hex | Tailwind | Sensibilité | Statut | Composants partagés |
|---|---|---|---|---:|---:|---:|---|---|---|
| `/bookings` | statique | app | inline-hex + tailwind | 1839 | 146 | 13 | destructive, emergency-content | legacy-only | — |
| `/buildings` | statique | app | inline-hex + tailwind | 1017 | 104 | 4 | destructive | legacy-only | ui/Typography.tsx |
| `/buildings/[id]` | dynamique | app | inline-hex + tailwind | 930 | 136 | 4 | — | legacy-only | — |
| `/buildings/compliance` | statique | app | inline-hex + tailwind | 701 | 88 | 2 | — | legacy-only | — |
| `/buildings/map` | statique | app | inline-hex | 758 | 71 | 0 | — | legacy-only | — |
| `/clients` | statique | app | inline-hex + tailwind | 788 | 97 | 3 | destructive | legacy-only | ui/Typography.tsx |
| `/clients/[id]` | dynamique | app | inline-hex + tailwind | 789 | 87 | 4 | permissions | legacy-only | — |
| `/clients/[id]/portfolio` | dynamique | app | inline-hex + tailwind | 732 | 92 | 1 | — | legacy-only | — |
| `/referrals` | statique | app | inline-hex + tailwind | 1541 | 112 | 1 | — | legacy-only | ui/Typography.tsx |

## Conformité et éditeurs — 5 route(s), 17792 lignes, 1880 couleurs hex, 314 classes couleur Tailwind

| Route | Type | Shell | Styles | Lignes | Hex | Tailwind | Sensibilité | Statut | Composants partagés |
|---|---|---|---|---:|---:|---:|---|---|---|
| `/configurator/[projectId]` | dynamique | none | inline-hex + tailwind | 2479 | 382 | 9 | documents, emergency-content | legacy-only | MapPicker.tsx, configurator/DangerousSubstanceSearch.tsx |
| `/configurator/pca/[projectId]` | dynamique | app | inline-hex + tailwind | 3360 | 372 | 5 | documents, emergency-content | legacy-only | — |
| `/editor/[projectId]` | dynamique | none | inline-hex + tailwind | 10534 | 963 | 299 | destructive, documents, emergency-content | legacy-only | editor/Module2PhoneTable.tsx, editor/Module2Section.tsx, editor/Module3MemberTable.tsx, editor/Module3OrgChart.tsx, editor/Module3Section.tsx, editor/Module4Library.tsx, editor/Module4PcaSection.tsx, editor/Module4ProcedureCard.tsx, editor/Module4Section.tsx, editor/Module6PcaContacts.tsx, editor/Module6Section.tsx, editor/Module7Section.tsx, editor/Module8Section.tsx, editor/Module8Section10.tsx, editor/SpellCheckedTextarea.tsx, editor/VersionHistory.tsx |
| `/editor/[projectId]/procedures/[procedureId]` | dynamique | none | inline-hex + tailwind | 838 | 105 | 1 | destructive, documents, emergency-content | legacy-only | — |
| `/library` | statique | app | inline-hex | 581 | 58 | 0 | emergency-content | legacy-only | — |

## Administration, paramètres, blog — 28 route(s), 18868 lignes, 1819 couleurs hex, 114 classes couleur Tailwind

| Route | Type | Shell | Styles | Lignes | Hex | Tailwind | Sensibilité | Statut | Composants partagés |
|---|---|---|---|---:|---:|---:|---|---|---|
| `/admin/capacity` | statique | app | inline-hex + tailwind | 531 | 76 | 2 | permissions | legacy-only | — |
| `/admin/changelog` | statique | app | inline-hex + tailwind | 640 | 30 | 2 | destructive, permissions | legacy-only | — |
| `/admin/feedback` | statique | app | inline-hex | 690 | 39 | 0 | destructive, permissions | legacy-only | — |
| `/admin/health` | statique | app | inline-hex | 1113 | 51 | 0 | permissions, supervision | legacy-only | — |
| `/admin/mandates` | statique | app | inline-hex + tailwind | 747 | 127 | 2 | permissions | legacy-only | — |
| `/admin/map` | statique | app | inline-hex | 744 | 72 | 0 | permissions | legacy-only | — |
| `/admin/organizations` | statique | app | inline-hex + tailwind | 1560 | 143 | 5 | permissions, financial-legal | legacy-only | — |
| `/admin/organizations/[organizationId]` | dynamique | app | inline-hex + tailwind | 1190 | 8 | 51 | permissions, financial-legal | legacy-only | admin/control-center/ControlCenterComponents.tsx |
| `/admin/organizations/[organizationId]/clients/[clientId]` | dynamique | app | inline-hex + tailwind | 383 | 24 | 1 | permissions, financial-legal | legacy-only | — |
| `/admin/procedures` | statique | app | inline-hex + tailwind | 534 | 56 | 2 | emergency-content, permissions | legacy-only | — |
| `/admin/procedures/[id]` | dynamique | app | inline-hex + tailwind | 791 | 93 | 1 | destructive, emergency-content, permissions | legacy-only | — |
| `/admin/procedures/custom` | statique | app | inline-hex + tailwind | 788 | 111 | 6 | destructive, emergency-content, permissions | legacy-only | — |
| `/admin/projects` | statique | app | inline-hex | 423 | 39 | 0 | permissions | legacy-only | — |
| `/admin/referrals` | statique | app | inline-hex | 1415 | 75 | 0 | permissions | legacy-only | — |
| `/admin/rex-reports` | statique | app | inline-hex | 342 | 3 | 0 | permissions | legacy-only | — |
| `/admin/task-templates` | statique | app | inline-hex + tailwind | 379 | 64 | 3 | destructive, permissions | legacy-only | — |
| `/blog` | statique | app | inline-hex + tailwind | 440 | 47 | 2 | destructive | legacy-only | — |
| `/blog/[id]/edit` | dynamique | app | inline-hex + tailwind | 800 | 145 | 4 | — | legacy-only | ui/DragDropUpload.tsx |
| `/blog/new` | statique | app | inline-hex + tailwind | 715 | 130 | 3 | — | legacy-only | ui/DragDropUpload.tsx |
| `/settings` | statique | app | inline-hex | 750 | 18 | 0 | — | beta | — |
| `/settings/activity-types` | statique | app | inline-hex + tailwind | 384 | 84 | 8 | — | legacy-only | — |
| `/settings/feedback` | statique | app | inline-hex + tailwind | 433 | 28 | 1 | — | legacy-only | — |
| `/settings/module1-template` | statique | app | inline-hex + tailwind | 306 | 49 | 3 | — | legacy-only | — |
| `/settings/organization` | statique | app | inline-hex + tailwind | 1225 | 67 | 3 | permissions | legacy-only | ui/DragDropUpload.tsx |
| `/settings/profile` | statique | none | none | 11 | 0 | 0 | — | legacy-only | — |
| `/settings/task-templates` | statique | app | inline-hex + tailwind | 459 | 92 | 3 | destructive | legacy-only | — |
| `/settings/timelog-categories` | statique | app | inline-hex + tailwind | 352 | 37 | 3 | destructive | legacy-only | — |
| `/settings/users` | statique | app | inline-hex + tailwind | 723 | 111 | 9 | destructive, permissions | legacy-only | WorkScheduleEditorPanel.tsx, workScheduleEditor.ts |

## Super Admin (commercial, catalogue, supervision) — 25 route(s), 18675 lignes, 0 couleurs hex, 935 classes couleur Tailwind

| Route | Type | Shell | Styles | Lignes | Hex | Tailwind | Sensibilité | Statut | Composants partagés |
|---|---|---|---|---:|---:|---:|---|---|---|
| `/admin/commercial` | statique | app | tailwind | 396 | 0 | 39 | permissions, financial-legal | legacy-only | admin/control-center/ControlCenterComponents.tsx |
| `/admin/commercial/assumptions/cost` | statique | app | tailwind | 127 | 0 | 12 | permissions, financial-legal | legacy-only | — |
| `/admin/commercial/assumptions/value` | statique | app | tailwind | 127 | 0 | 12 | permissions, financial-legal | legacy-only | — |
| `/admin/commercial/clauses` | statique | app | tailwind | 783 | 0 | 31 | permissions, financial-legal | legacy-only | — |
| `/admin/commercial/configuration` | statique | app | tailwind | 620 | 0 | 24 | permissions, financial-legal | legacy-only | — |
| `/admin/commercial/configurator` | statique | app | tailwind | 3872 | 0 | 202 | permissions, financial-legal | legacy-only | — |
| `/admin/commercial/content` | statique | app | tailwind | 1088 | 0 | 82 | permissions, financial-legal | legacy-only | — |
| `/admin/commercial/contracts` | statique | app | tailwind | 373 | 0 | 35 | permissions, financial-legal | legacy-only | admin/control-center/ControlCenterComponents.tsx |
| `/admin/commercial/dossier/[targetType]/[targetId]` | dynamique | app | tailwind | 1447 | 0 | 68 | permissions, financial-legal | legacy-only | admin/capability-operations/CapabilityOperationsWorkspace.tsx |
| `/admin/commercial/entitlements` | statique | app | tailwind | 374 | 0 | 35 | permissions, financial-legal | legacy-only | admin/control-center/ControlCenterComponents.tsx |
| `/admin/commercial/entitlements/[organizationId]` | dynamique | none | tailwind | 630 | 0 | 18 | permissions, financial-legal | legacy-only | admin/capability-operations/CapabilityOperationsWorkspace.tsx |
| `/admin/commercial/journey` | statique | app | tailwind | 539 | 0 | 35 | permissions, financial-legal | legacy-only | — |
| `/admin/commercial/legal-issuer` | statique | app | tailwind | 407 | 0 | 8 | permissions, financial-legal | legacy-only | — |
| `/admin/commercial/proposals` | statique | app | tailwind | 356 | 0 | 15 | permissions, financial-legal | legacy-only | — |
| `/admin/commercial/proposals/[proposalId]` | dynamique | app | tailwind | 2397 | 0 | 86 | permissions, financial-legal | legacy-only | — |
| `/admin/commercial/proposals/new` | statique | app | tailwind | 939 | 0 | 24 | permissions, financial-legal | legacy-only | — |
| `/admin/commercial/prospects` | statique | app | tailwind | 661 | 0 | 40 | permissions, financial-legal | legacy-only | — |
| `/admin/commercial/reconciliation` | statique | app | tailwind | 373 | 0 | 35 | permissions, financial-legal | legacy-only | admin/control-center/ControlCenterComponents.tsx |
| `/admin/commercial/simulator` | statique | app | tailwind | 552 | 0 | 25 | permissions, financial-legal | legacy-only | — |
| `/admin/control-center` | statique | app | tailwind | 466 | 0 | 38 | permissions, supervision | legacy-only | admin/control-center/ControlCenterComponents.tsx |
| `/admin/metering` | statique | app | tailwind | 168 | 0 | 9 | permissions, supervision | legacy-only | — |
| `/admin/platform-permission-grants` | statique | app | tailwind | 799 | 0 | 25 | financial-legal, permissions | legacy-only | — |
| `/admin/product-catalog` | statique | app | tailwind | 43 | 0 | 4 | permissions, financial-legal | legacy-only | — |
| `/admin/product-catalog/capabilities` | statique | app | tailwind | 214 | 0 | 8 | permissions, financial-legal | legacy-only | — |
| `/admin/product-catalog/price-books` | statique | app | tailwind | 924 | 0 | 25 | destructive, permissions, financial-legal | legacy-only | — |

## Authentification et accueil — 3 route(s), 1746 lignes, 90 couleurs hex, 8 classes couleur Tailwind

| Route | Type | Shell | Styles | Lignes | Hex | Tailwind | Sensibilité | Statut | Composants partagés |
|---|---|---|---|---:|---:|---:|---|---|---|
| `/` | statique | none | none | 275 | 0 | 0 | — | legacy-only | — |
| `/login` | statique | none | inline-hex + tailwind | 936 | 58 | 5 | auth | legacy-only | — |
| `/reset-password` | statique | none | inline-hex + tailwind | 535 | 32 | 3 | auth | legacy-only | — |

## Outillage de développement — 1 route(s), 21 lignes, 0 couleurs hex, 0 classes couleur Tailwind

| Route | Type | Shell | Styles | Lignes | Hex | Tailwind | Sensibilité | Statut | Composants partagés |
|---|---|---|---|---:|---:|---:|---|---|---|
| `/glass-kit` | statique | app | none | 21 | 0 | 0 | — | ga (dev) | — |

## Exceptions de sécurité documentées

Routes sensibles qui restent `legacy-only` par décision explicite ; leur statut ne change pas sans nouvelle décision Founder.

- `/admin/platform-permission-grants` (legacy-only) — Exception de sécurité V1 (décision Founder, Phase 13) : page Founder-only de gestion des permissions de plateforme. Reste LEGACY-ONLY : elle s'affiche dans le shell Glass (menu, en-tête, thème) à l'intérieur de l'îlot Legacy ; jamais bêta ni GA, aucune vue Glass native en V1. Préserver : réservée au Founder, portées ORGANIZATION et GLOBAL, confirmations d'octroi et de révocation, provenance et audit, refus des ADMIN clients. Ne pas assouplir ces règles pour permettre un passage en bêta ou GA ; toute migration exige une décision Founder distincte et une revalidation RBAC sur le vrai backend.
