# Matrice consolidée d’acceptation

Tous les correctifs listés sont des ancêtres Git du produit actif `7184456f42d43429d38ccbdaa87f141df774a2c9`. « Présent » ne signifie pas que la recette historique a été rejouée sur ce SHA.

| Périmètre | Couverture et acteurs | QA / Chrome | PR et livraison de référence | Continuité actuelle | Limites / statut final |
| --- | --- | --- | --- | --- | --- |
| Dashboard | KPI, projets récents, tâches, sources secondaires; ADMIN/OPERATOR | QA 12/12; observation SUPER_ADMIN limitée | PR #99, SHA `44772a7e`; release `40406925893`, inspection `40408643149` | Présent | contrôles de session/retrait d’affectation historiques incomplets; **ACCEPTÉ AVEC LIMITES** |
| Liste Projets | listes/direct, archives, quota, erreurs, multi-sélection; ADMIN/OPERATOR | 21/21, Chrome 12/12 | PR #100, SHA `2ff9db7b`; release `40415529076`, inspection `40417223581` | Présent | progression métier et fonctions absentes non validées; **VALIDÉ QA/DÉPLOYÉ HISTORIQUE** |
| Fiche Projet | relations, qualité, concurrence, erreurs; multi-tenant | API/navigateur 22/22, Chrome 12/12 | PR #101, SHA `87c5de5f`; première release bloquée capacité | Embarqué par les releases suivantes | pas d’inspection dédiée réussie de ce SHA; **VALIDÉ QA, CONTINUITÉ GIT PROUVÉE** |
| Documents projet | liste, dépôt privé, versions, téléchargement, archive; acteurs affectés/non affectés | API/stockage 13/13, Chrome 12/12 | PR #103, merge `495e8510` | Embarqué par releases documentaires et suivantes | objets orphelins hors inventaire; **VALIDÉ QA, PRÉSENT** |
| Génération | PMU/PSI/PCA, atomicité, idempotence, reprise | PostgreSQL/API et Chrome 12/12 | PR #116, merge `18e34734`; release consolidée `93fedd79` / `40963487156` | Présent | PGC/PRA/PUE exclus; **VALIDÉ/DÉPLOYÉ VIA CANDIDAT CONSOLIDÉ** |
| Éditeur | contenu riche, XSS, versions, concurrence, états | parcours PMU/PSI/PCA; Chrome | PR #117, merge `fbccdd1c`; release consolidée `93fedd79` | Présent | permission fine dédiée absente; **VALIDÉ/DÉPLOYÉ VIA CANDIDAT CONSOLIDÉ** |
| Révision/approbation | soumission versionnée, auteur≠approbateur, obsolescence, outbox | serveur + parcours Chrome final | PR #124, merge `5b6b4fd0`; release consolidée `93fedd79` | Présent | quorum/affectation nominative non inclus; **VALIDÉ/DÉPLOYÉ VIA CANDIDAT CONSOLIDÉ** |
| Export PDF | snapshot approuvé, stockage privé, reprise, hash; PMU/PSI/PCA | PDF réels + Chrome 12/12 | PR #125, SHA `93fedd79`; release `40963487156`, inspection `40965196916` | Présent | PDF/UA, lecteur d’écran, PGC/PRA/PUE, signature exclus; **PASS AVEC LIMITES ACCESSIBILITÉ** |
| Activités | portefeuille, activité, réservation, annulation, ICS; conseiller/client | API/PostgreSQL, 69 tests, Chrome 12/12 | PR #126, `76e7a3c6`; release `40977838218`, inspection `40979105630` | Présent | fournisseur réel non exercé; **VALIDÉ/DÉPLOYÉ/RÉCONCILIÉ** |
| Timelog | CRUD, propriétaire, DST, totaux, équipe, concurrence | PostgreSQL/API, Chrome 12/12 | PR #128, `f638d7be`; release `40986534316`, inspection `40987658033`; migration 162 | Présent | timer/export/approbation hors mandat; **VALIDÉ/DÉPLOYÉ** |
| Planification équipe | activité, Booking, replanification, annulation, idempotence | 59+76 tests, Chrome 12/12 | PR #129, `6d8e18ba`; CI et inspections `41059684955`/`41059688826` | Embarqué par releases suivantes | pas de release dédiée documentée; **VALIDÉ QA, CONTINUITÉ GIT PROUVÉE** |
| Clients | création, invitation, suspension, sessions/liens; ADMIN/SUPER_ADMIN/refus opérateur | 51 ciblés, Chrome 12/12 | PR #135, `08d4a0e0`; release `41097439169`, inspection `41099241216`; migration 163 | Présent | lecteur d’écran; fournisseur simulé; **VALIDÉ/DÉPLOYÉ/RÉCONCILIÉ** |
| Bâtiments | liste/direct, création, portail Manager/Corporate, documents | API/PostgreSQL, Chrome 24/24 | PR #137, `2e6c06ef`; release `41134179928`; migration 164 | Présent | rollback ancien vulnérable; **VALIDÉ/DÉPLOYÉ/RÉCONCILIÉ** |
| Carte | portée organisation/portail, marqueurs, filtres, panne tuiles | Chrome 24/24 + réseau OSM limité | PR #139, `903f910d`; livraison réconciliée dans le rapport Carte | Présent | géocodage off, OSM sans SLA, lecteur d’écran; **VALIDÉ AVEC CONDITIONS FOURNISSEUR** |
| Conformité | états documentaires factuels, filtres, périmètres | Chrome 12/12 + production mobile/desktop | PR #142, `cedbcbf4`; release `41308088727`, inspection `41309283499` | Présent | aucune attestation réglementaire; **VALIDÉ/DÉPLOYÉ/RÉCONCILIÉ** |
| Bibliothèque | codes, rôles, procédures, lecture/personnalisation; source Knowledge typée | catalogue historique: API/PostgreSQL, Chrome 12/12, prod lecture seule; raccord Knowledge: 27 tests, suite backend, migration 166 et builds | PR #144, `204ad4cc`; raccord PR #157, merge/release `c91543ef`; inspection `41361880281` | Catalogue et raccord authentifié actifs | assistant public isolé; génération fournisseur réelle non exercée; **VALIDÉ/DÉPLOYÉ/RÉCONCILIÉ — RÉCUPÉRATION DÉTERMINISTE** |
| Manuel | contenu par rôle, recherche guidée, ancres, liens | QA + production authentifiée | PR #146–149, SHA `165b41a0`; release `41334823191`, inspection `41336102818` | Présent | recherche guidée ≠ IA; **VALIDÉ/DÉPLOYÉ/RÉCONCILIÉ** |
| Paramètres | organisation, membres, mot de passe, invitations, outils | QA intégrée, Chrome 12/12, prod desktop/mobile | PR #151, `91c1313c`; release `41348342595`, inspection `41349712708`; migration 165 | Actif | divergences historiques et rollback conditionnel; **VALIDÉ/DÉPLOYÉ/RÉCONCILIÉ** |
| Incident — liste | historique paginé, recherche, filtres, tri, statuts et exercices; Manager/Corporate/refus | API/PostgreSQL, Chrome QA 12/12; production refus/F5/reprise | PR #170, merge/release `082f396b`; release `41552585795`, inspection `41554507500` | Actif | production avec identité sans `INCIDENT_READ`, fonctions de données non observables; dette console service worker; lecteur d’écran hors lot; **VALIDÉ QA/DÉPLOYÉ/RÉCONCILIÉ — PROD PARTIAL** |

| Incident — fiche et cycle de vie | détail minimal, chronologie, containment, résolution motivée, REX; autorité parent/sous-ressources | API/PostgreSQL 13/13, Chrome QA 12/12 | PR #172, merge/release `7184456f`; release `41570892531`, inspection `41572536046` | Actif au SHA `7184456f42d43429d38ccbdaa87f141df774a2c9` | production authentifiée bloquée par l'absence d'administration UI de `incidentPermissions` et des `IncidentAuthorityAssignment`; lecteur d'écran; impression HTML seulement; jetons historiques non déclarés révoqués; **VALIDÉ QA/DÉPLOYÉ/RÉCONCILIÉ — PROD PARTIAL / PROVISIONING UI REQUIRED** |

> Référence active au 3 novembre 2026 : `7184456f42d43429d38ccbdaa87f141df774a2c9`. Cette référence remplace `082f396bf3d6e9ae85c5d47e980d09bac0df13fc` comme produit actif sans invalider sa continuité Git.

## Portée commerciale

### A — Démontrable

Projets et documents PMU/PSI/PCA, activités/réservations, timelog, planification, clients, bâtiments, carte avec repli, conformité factuelle, Bibliothèque, Manuel et Paramètres dans les rôles et limites ci-dessus.

### B — Utilisable sous conditions

Carte dépendante d’OSM sans SLA; invitations avec secret/outbox gouvernés; PDF lisible mais non PDF/UA; rollback avec suspension des routes dont l’ancienne version réintroduit un défaut; données historiques conflictuelles soumises à confirmation administrative.

### C — Non démontré ou exclu

Signature fournisseur réelle et valeur juridique; PGC/PRA/PUE documentaires; lecteur d’écran réel; PDF/UA; géocodage public; génération IA fournisseur réelle sur le catalogue; qualification individuelle des 116 candidats stockage.

### D — Hors campagne

Modules commerciaux, Sentinelle avancée, Population, Incident complet, CORO Network, fournisseurs IA réels, communications d’urgence réelles et verdict global du portail client.
