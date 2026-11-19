# CORO Report 2.0 — Dictionnaire de données cible

| Concept | Clé canonique | Type | Règle |
|---|---|---|---|
| Moment de l’événement | `core.occurredAt` | DATETIME | requis, fuseau conservé |
| Résumé | `core.summary` | LONG_TEXT | requis, 1..4000 |
| Lieu | `core.location` | ROOM | référence autorisée |
| Priorité | `core.priority` | SELECT | liste versionnée |
| Chronologie | `core.timeline` | REPEATABLE_SECTION | date, acteur, action |
| Personnes | `people.items` | REPEATABLE_SECTION | données minimales/finalité |
| Témoins | `witnesses.items` | REPEATABLE_SECTION | permission sensible |
| Véhicules | `vehicles.items` | REPEATABLE_SECTION | plaque facultative/restreinte |
| Équipements | `assets.items` | REPEATABLE_SECTION | référence ou texte historique |
| Communications | `response.communications` | REPEATABLE_SECTION | canal, date, destinataire fonctionnel |
| Interventions | `response.actions` | REPEATABLE_SECTION | responsable, résultat, heure |
| Suivis | `followups.items` | REPEATABLE_SECTION | référence Ops, pas de copie |
| Clôture | `closure.*` | groupe | résultat, limites, date |
| Source historique | `legacy.*` | enveloppe | original immuable, non éditable |

## Métadonnées de champ

Clé, libellé bilingue, type, version, provenance, sensibilité, finalité,
obligation, condition, cardinalité, options versionnées, unité, règles de
validation, indexabilité et politique d’affichage. Les champs clients utilisent
`custom.<organizationId>.<key>` et n’exigent pas une migration Prisma.

## Règles de non-perte

Une valeur importée conserve valeur brute, libellé, type observé, encodage,
format de date, position source, mapping appliqué et résultat. Toute donnée non
mappée demeure consultable dans l’enveloppe historique privée.
