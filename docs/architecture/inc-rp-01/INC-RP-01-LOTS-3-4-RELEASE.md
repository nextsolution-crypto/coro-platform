# INC-RP-01 — Lots 3 et 4 — Plan de release et rollback

## Release

1. Fusionner le Lot 2 et réconcilier son SHA actif.
2. Rebaser les Lots 3/4 sur le SHA intégré exact sans substituer le candidat.
3. Exécuter la CI, la sauvegarde distante, la restauration, la capacité et le verrou de production.
4. Appliquer uniquement la migration additive `20261210010000_incident_report_forms_approval`.
5. Déployer les images immuables réconciliées.
6. Vérifier les services, PostgreSQL, la migration et `INCIDENT_REPORTS_ENABLED=false`.
7. Ne configurer ClamAV et ne permettre une activation qu’après une recette intégrée distincte.

## Récupération

- Conserver les images actives précédentes comme rollback immédiat.
- Ne pas inverser la migration: les colonnes additives restent dormantes avec le flag désactivé.
- En cas d’échec applicatif, restaurer les images précédentes et confirmer que le flag reste désactivé.
- Ne jamais supprimer les objets privés ou les preuves d’audit lors d’un rollback.
