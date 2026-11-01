# Manuel #146 — clôture de release

## Décision

Le Manuel CORO est accepté en QA, fusionné, déployé et réconcilié en production au SHA `165b41a0b8ecd6ae1fd18f0b03325bcfc1c8c63b`.

## Traçabilité

| Élément | Résultat |
| --- | --- |
| PR fonctionnelle | `#146` |
| PR correctives | `#147`, `#148`, `#149` |
| CI du candidat final | `41334403311` — SUCCESS |
| Release finale | `41334823191` — SUCCESS |
| Inspection post-release | `41336102818` — SUCCESS |
| Capacité post-release | `41336105050` — SUCCESS |
| SHA actif | `165b41a0b8ecd6ae1fd18f0b03325bcfc1c8c63b` |
| Migrations | 164, tête `20261117010000_building_governance` |
| Sauvegarde / restauration | `REMOTE_VERIFIED` / `RESTORE_VERIFIED` |
| Rollback | quatre images présentes |

## Séparation des preuves

- QA synthétique : contrats, erreurs et reprise, matrice Chrome, rôles, responsive et persistance.
- Inspection technique de production : services, PostgreSQL, migrations, sauvegarde, restauration, rollback, capacité et digests.
- Inspection visuelle authentifiée : contenu par rôle, recherche guidée, état sans résultat, accès direct, F5, ancres et absence de débordement.

## Incident de livraison maîtrisé

La release `41332876953` a été arrêtée avant toute mutation : le script de capacité du candidat n'était pas encore récupérable dans le dépôt local du serveur. La PR `#149` a corrigé la récupération du SHA exact. La release finale et son inspection démontrent la correction.

## Réserves

- Lecteur d'écran réel : `NOT_VERIFIED`.
- Paramètres : hors périmètre de cette clôture.
- Knowledge et assistants IA : aucun nouveau raccordement introduit.

## Verdict

`VALIDÉ_QA — FUSIONNÉ — DÉPLOYÉ — RÉCONCILIÉ`
