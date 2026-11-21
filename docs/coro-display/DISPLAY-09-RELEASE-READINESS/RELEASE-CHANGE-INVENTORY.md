# Inventaire des changements

| Domaine | Changement | Risque / contrôle |
|---|---|---|
| Backend | Spatial, publication, PDF, observations, appareils, commandes, Player Web | Autorités composites, tests unitaires/PostgreSQL |
| Frontend | `/display`, Manager, supervision et opérations | Permissions serveur conservées; build PASS |
| Portail | `/display`, `/d/{publicDisplayId}`, lien bâtiment | `DISPLAY_CLIENT_PLAN_READ`; build PASS |
| Site Web | Aucun produit Display exposé; image reconstruite avec le candidat | Build PASS |
| PostgreSQL | 11 migrations, 21 tables Display à la fin | Upgrade 176→187 PASS |
| Auth | Hydratation ClientUser/User ajustée pour permissions Display | Pas d'accès implicite; tests CI |
| Documents | Publication depuis `ProjectFile`, rendu PDF isolé | Stockage privé, approbation et SHA |
| Incident/Ops | Orchestration Display gouvernée | Provenances machine et urgence non activées |
| Infrastructure | Worker/rasterizer optionnels, Player physique, compose | Profils désactivés sans activation explicite |
| Secrets | Aucun secret ajouté; scan CI PASS | Valeurs opérationnelles à injecter hors Git |

Les 15 merge commits et leurs SHA sont consignés dans l'historique Git; le fichier de delta exhaustif est reproductible par `git diff --name-status e83d83a1..5ae7cd21`.
