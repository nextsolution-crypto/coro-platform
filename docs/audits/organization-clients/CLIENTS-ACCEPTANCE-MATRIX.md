# Matrice d’acceptation — Clients

| Contrôle | Statut | Preuve |
|---|---|---|
| Route réelle `/clients` et fiche `/clients/[id]` | PASS | code frontend au SHA audité |
| Liste limitée à `organizationId` | PASS statique | `findAll` serveur |
| Lecture directe limitée à `organizationId` | PASS statique | `findOne` serveur |
| Création réservée ADMIN/SUPER_ADMIN | PASS | test #94 et runner |
| Organisation de création imposée serveur | PASS | test #94 et runner |
| Modification réservée aux administrateurs | FAIL | CLIENT-001 |
| Logo réservé aux administrateurs | FAIL | CLIENT-001 |
| Désactivation réservée aux administrateurs | FAIL | CLIENT-001 |
| Payload de modification fermé | FAIL | CLIENT-002 |
| Création + accès + invitation atomiques/idempotents | FAIL | CLIENT-003 |
| Collision ClientUser explicite | FAIL | CLIENT-004 |
| Révocation immédiate après changement de contact | NOT_VERIFIED/FAIL conception | CLIENT-005 |
| Refus inter-organisation | PASS statique | filtre serveur; E2E navigateur NOT_VERIFIED |
| Compteurs bâtiments/projets | PASS statique | `_count`; exactitude PostgreSQL E2E NOT_VERIFIED |
| Erreur distincte de liste vide/introuvable | FAIL | CLIENT-006 |
| Persistance après F5 | NOT_VERIFIED |
| Longues valeurs, accents, doublons, concurrence | NOT_VERIFIED |
| Parcours organisation vers portail client | PARTIAL | provisionnement identifié; E2E isolé non exécuté |
| 12 configurations Chrome | NOT_VERIFIED |
| Clavier, focus, zoom 200 % | NOT_VERIFIED; lacunes statiques CLIENT-008 |
| Lecteur d’écran réel | NOT_VERIFIED |
| Fournisseur simulé, aucune notification réelle | PASS pour l’audit statique |

Le verdict de l’écran est **FAIL — correction de sécurité requise avant acceptation fonctionnelle**. Les preuves statiques ne remplacent pas la campagne PostgreSQL/navigateur demandée après correction.
