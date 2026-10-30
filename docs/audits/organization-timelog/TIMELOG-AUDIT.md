# Audit ciblé Timelog CORO

## Baseline et portée

- SHA audité : `201243ec2eff3bab25e76b9f460f87412538d00f` (`origin/main`).
- Produit observé : `76e7a3c60b38d005e81be72c631f2b91a33668bf`.
- Relation : `201243ec` ajoute la réconciliation documentaire de la release Activities; le code produit Timelog est identique au SHA actif.
- PostgreSQL rapporté : 161 migrations. Aucune migration ni lecture de données de production n'a été exécutée.
- Verdict limité : **FAIL — correction requise avant acceptation métier de Timelog**.

## Fonction réelle

| Élément | Autorité | Statut |
|---|---|---|
| Route UI | `/timelog`, `coro-frontend/app/timelog/page.tsx` | Présent |
| Heures générales | `TimelogEntry`, toujours `isBillable=false` | Présent |
| Heures projet | `TaskTimeEntry`, créées dans le parcours tâche/projet | Présent en lecture agrégée |
| Catégories | globales et propres à l'organisation | Présent |
| Vue équipe | ADMIN/SUPER_ADMIN de l'organisation | Présent |
| Périodes | semaine, mois, année, personnalisée | Présent |
| Chronomètre | aucune autorité ni endpoint | NON_APPLICABLE |
| Validation/verrouillage/export/pagination | absents | NON_APPLICABLE |

## Contrats et consommateurs

Les endpoints `/timelog/catalog`, `/timelog/me` et `/timelog/team` sont protégés par JWT et `OrganizationStatusGuard`. Les mutations personnelles dérivent `userId` et `organizationId` de l'acteur et filtrent mise à jour/suppression par propriétaire et tenant.

`TimelogEntry` alimente les heures saisies du planning de capacité et les observations Organization 360. Il **n'alimente pas** le calcul financier Rendement, lequel consomme les `TaskTimeEntry` reliées aux tâches projet. L'étiquette UI « facturable » des heures de tâche n'est donc pas une facture ni une preuve de facturation.

## Limite de preuve

Le runner de caractérisation et les tests serveur existants ont été exécutés. La campagne PostgreSQL/API multi-tenant et la matrice Chrome 12 configurations n'ont pas été exécutées dans cette passe : elles restent `NOT_VERIFIED`, sans être transformées en PASS par l'analyse statique.

## Contrôles exécutés

- `node --test qa/global-e2e/test/organization-timelog-audit.test.mjs` : **3/3 PASS**.
- runner `organization-timelog-audit.mjs` : **7 contrôles conformes, 5 constats FAIL attendus**.
- `git diff --check` : PASS.
- régressions Jest ciblées : **NOT_VERIFIED**; l'installation verrouillée locale s'est arrêtée sur `npm ENOTEMPTY` avant création de `node_modules/.bin/jest`. Aucun résultat n'est revendiqué pour ces suites.
