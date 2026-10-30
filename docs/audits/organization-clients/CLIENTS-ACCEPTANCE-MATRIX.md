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

## État du candidat correctif

| Contrôle | Statut candidat |
|---|---|
| Modification/logo/désactivation réservés ADMIN/SUPER_ADMIN | PASS ciblé |
| DTO fermés et projection explicite | PASS ciblé |
| Collision ClientUser refusée avant création | PASS ciblé |
| États de chargement distincts et reprise | PASS TypeScript/contractuel |
| Modale nommée, Escape, focus initial/restauré, double soumission | PARTIAL; confinement complet à confirmer dans Chrome |
| Transaction + outbox + idempotence | FAIL/non implémenté |
| Cascade de désactivation | DÉCISION MÉTIER EN ATTENTE |
| PostgreSQL et Chrome 12/12 | NOT_VERIFIED |

## Matrice finale PR #135

| Controle | Statut final |
|---|---|
| Mutations ADMIN/SUPER_ADMIN et refus operateur sans effet | PASS |
| Organisation imposee serveur et refus inter-organisation | PASS |
| DTO fermes, aucune affectation massive | PASS |
| Transaction Client + ClientUser + requete + invitation | PASS |
| Panne SQL sans etat partiel | PASS PostgreSQL reel |
| Idempotence, concurrence et perte de reponse | PASS |
| Collision d'identite sans reaffectation | PASS |
| Invitation durable, reprise fournisseur et bail expire | PASS fournisseur simule |
| Migration depuis zero et mise a niveau historique | PASS |
| Chrome 12/12, F5, focus, Escape, zoom 200 % | PASS |
| Lecteur d'ecran reel | NOT_VERIFIED |
| Cascade de desactivation | DECISION_ATTENDUE |

Verdict : `ACCEPTATION_INTEGREE_PASS_WITH_DEACTIVATION_POLICY_PENDING`.
