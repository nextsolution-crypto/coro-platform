# Constats — espace Documents d’un projet

| ID | Sévérité | Statut | Constat | Preuve source | Condition de clôture |
|---|---|---|---|---|---|
| PROJ-DOC-001 | Bloquant | CONFIRMÉ_CODE | Les routes liste/dépôt document n’appliquent pas `projectAccessWhere(actor)`; l’organisation et un identifiant connu suffisent au contrat actuel. | `project-files.controller.ts`, `getFilesForProject`, `uploadFile` | Unifier avec la portée canonique projet; tests même organisation/non affecté et inter-tenant, sans effet secondaire. |
| PROJ-DOC-002 | Bloquant | CONFIRMÉ_CODE | Contenu privé, historique, version courante et URL de téléchargement ne reçoivent pas le périmètre acteur/bâtiment depuis le contrôleur interne. | Routes `:id/content`, `:id/history`, `:id/current`, `:id/download` | Résolution serveur du parent puis autorisation canonique avant métadonnées ou octets. |
| PROJ-DOC-003 | Élevé | CONFIRMÉ_CODE | La liste documentaire ne requiert pas `project.isActive`; incohérence avec la lecture directe canonique du projet. | `getFilesForProject` vs `ProjectsService.findOne` | Projet désactivé refusé par liste et accès direct aux sous-ressources. |
| PROJ-DOC-004 | Élevé | CONFIRMÉ_CODE | Le dépôt et la nouvelle version ne refusent pas explicitement un projet `ARCHIVED`. | `uploadFile` | Archivage en lecture seule, zéro objet/notification en cas de refus. |
| PROJ-DOC-005 | Élevé | CONFIRMÉ_CODE | Les références historiques non privées peuvent être retournées et ouvertes directement, hors chemin de contenu privé. | `getSignedUrl`; `window.open(file.url)` | Inventaire des formats historiques; accès authentifié contrôlé ou remédiation gouvernée, sans URL arbitraire. |
| PROJ-DOC-006 | Moyen | CONFIRMÉ_UI | Une erreur de chargement devient l’état « aucun fichier », sans explication ni reprise. | `fetchFiles` capture seulement dans la console | États erreur/refus/indisponibilité distincts et bouton Réessayer. |
| PROJ-DOC-007 | Moyen | CONFIRMÉ_UI | Les actions de cycle sont affichées selon l’état, pas selon l’autorité de l’acteur. | Rendu des boutons revue/approbation/révocation | Capacités serveur exposées au frontend ou masquage explicatif; serveur reste autorité. |
| PROJ-DOC-008 | Faible | CONFIRMÉ_UI | Recherche, filtres, tri et pagination absents. | Composant `ProjectFiles` | Décision produit selon volumétrie; non bloquant sécurité. |
| PROJ-DOC-009 | Moyen | NOT_VERIFIED | Téléchargement effectif, octets/SHA, résistance aux pannes et 12/12 responsive non exécutés. | Docker local indisponible | Rejouer le plan avec PostgreSQL 16, stockage privé QA, MFA et Chrome. |

Les constats de code n’autorisent aucune consultation de données étrangères en production. La démonstration négative devra utiliser uniquement des organisations synthétiques.
