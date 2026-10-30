# Constats — Planning Activités organisation

Référence initiale : `93fedd799f76f8aab963df89017c62508f95a7a4`. Candidat : `fix/organization-activities-governance`.

| ID | Statut final | Constat et résolution | Preuve |
|---|---|---|---|
| ACT-001 | PASS | Le fan-out limité à 200 projets est remplacé par `GET /activities/portfolio`, une requête serveur sur le périmètre canonique. | PostgreSQL avec 201 projets et `Scale activity 200`. |
| ACT-002 | PASS | La panne n'est plus convertie en liste vide : erreur explicite, données effacées et reprise. | Scénario navigateur 503. |
| ACT-003 | PASS | Update via `mutableProjectAccessWhere(actor)`, champs en liste blanche et concurrence optimiste. | Unitaires, PostgreSQL, refus hors portée et 409 obsolète. |
| ACT-004 | PASS | Delete soumis à la même autorité projet mutable. | Refus sans suppression ni modification. |
| ACT-005 | PASS | Duplication soumise à l'autorité projet mutable; archive/inactif refusés. | Tests unitaires et PostgreSQL. |
| ACT-006 | PASS | ICS produit après résolution canonique de l'activité et du projet. | 200 autorisé; 404 hors portée sans MIME calendrier. |
| ACT-007 | PASS | Le portefeuille client interne applique la portée projet de l'acteur. | OPERATOR limité, ADMIN légitime préservé. |
| ACT-008 | PASS | La portée Client Portal organisation/client/bâtiments demeure intacte. | Client A autorisé; organisation B isolée et réservation 403. |
| ACT-009 | PASS | Erreur et nouvelle tentative Client Portal conservées. | Régression du consommateur et campagne authentifiée. |
| ACT-010 | PASS | Le bootstrap démarre PostgreSQL 16, backend, application organisation, portail, stockage et fournisseur simulé sur réseau isolé. | Readiness 55473/3166/3167/3168, migration 161. |
| ACT-011 | PASS — PÉRIMÈTRE CLARIFIÉ | « Activités » est le planning `ProjectActivity`; aucun journal général n'est inclus. | Mandat produit. |
| ACT-012 | PASS | Le téléchargement vérifie HTTP, MIME et VCALENDAR/VEVENT avant de créer le fichier. | ICS réel; 404 hors portée; 503 sans `createObjectURL`. |
| ACT-013 | PASS (contrat applicable) | Campagne PostgreSQL/API/navigateur, fournisseur simulé et aucune notification sur le doublon refusé. Le flux n'offre pas d'outbox durable. | 4 tests PostgreSQL et E2E final. |

## Limites restantes

- Lecteur d'écran réel : `NOT_VERIFIED`; structure, clavier/focus et zoom 200 % sont vérifiés.
- Les notifications ne promettent pas une outbox durable ni une reprise après panne fournisseur.
- Journal général, messagerie, Timelog et refonte Planification d'équipe : hors périmètre.

## Verdict

`ACCEPTATION_INTÉGRÉE_PASS`

Campagne QA : `PRODUCTION_MUTATION: NO` · `REAL_NOTIFICATION: NO` · `WEB_AI_ACTIVATION: NO`.
La fusion et le déploiement ultérieurs sont réconciliés ci-dessous.

## État livré

Les constats ACT-001 à ACT-013 ci-dessus sont actifs dans la release privée
`76e7a3c60b38d005e81be72c631f2b91a33668bf`. La release gouvernée
`40977838218` et l'inspection post-release `40979105630` sont réussies.
Aucune migration n'a été ajoutée. Les limites lecteur d'écran, fournisseur réel
et outbox durable demeurent inchangées.
