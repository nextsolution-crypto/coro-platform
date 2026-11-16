# INC-RP-01 — Validation de migration

Migration additive : `20261208010000_incident_report_foundations`.

Contrôles requis avant fusion :

1. chaîne complète depuis zéro sur PostgreSQL jetable;
2. upgrade depuis `20261207010000_display_permanent_url_web_player`;
3. Prisma validate/generate;
4. contraintes intertenant négatives;
5. trigger d'immuabilité;
6. aucune attribution de permission existante;
7. rollback logique par désactivation du flag; aucune inversion destructive
   improvisée.

Les tables et enums sont nouveaux. Le seul changement d'un objet existant est
l'ajout des permissions et de l'unicité composite Incident nécessaire à la FK.
Le déploiement n'est pas autorisé dans ce lot de préparation.
