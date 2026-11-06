# SP-OPS-04B — Préparation à la livraison

## Verdict par axe

| Axe | Verdict | Justification |
|---|---|---|
| Contrat fournisseur | GO | Événements et identifiants vérifiés dans la documentation officielle Brevo |
| Implémentation | GO | Corrélation stricte, historique, projection déterministe et verrou transactionnel |
| Sécurité | GO | Authentification préalable, isolation par livraison, ambiguïté refusée, journaux assainis |
| Migration | GO | Migration additive testée depuis zéro sur PostgreSQL 16 |
| Non-régression locale | GO AVEC RÉSERVE | Contrôles ciblés réussis; outil `pdftoppm` absent pour un test Knowledge indépendant |
| Fournisseur réel | NOT_VERIFIED | Interdit dans ce mandat |
| Fusion / déploiement | NON AUTORISÉ | Point d'arrêt du mandat |

## Gate de PR

Le candidat est prêt à être publié pour revue. Le verdict final devient
`PR_READY` uniquement après :

1. commit et publication de la branche;
2. création de la PR dédiée;
3. succès terminal de tous les contrôles obligatoires du HEAD exact.

## Conditions avant SP-OPS-04B réel

- Fusion et déploiement gouvernés par un mandat distinct.
- Inspection post-release du SHA actif.
- Configuration webhook Brevo pointant vers la route authentifiée.
- Essai réel explicitement autorisé, limité et réconcilié.
- PAUSED/BLOCK/STOP et toutes les restrictions SP-OPS existantes maintenus.

**Verdict courant : CODE_READY_FOR_PR — aucun envoi réel, aucune activation LIVE.**
