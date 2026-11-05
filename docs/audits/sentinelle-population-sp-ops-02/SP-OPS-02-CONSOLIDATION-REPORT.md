# SP-OPS-02 — Rapport de consolidation

Date : 2026-11-05

Branche : `audit/sentinelle-population-sp-ops-01`

Base : `19c3dbdf31a152bed2f4b9cedeef7d8c445c12e5`

## Matrice des réserves SP-OPS-01

| Priorité | Réserve | Critère de fermeture | Résultat SP-OPS-02 |
|---|---|---|---|
| P0 | Établissements sensibles absents du ciblage | qualification géographique, admissibilité, sélection explicite et snapshot | **FERMÉ** |
| P0 | Recette PostgreSQL/API/Chrome absente | parcours simulé complet, cloisonnement, concurrence et 12 configurations Chrome | **FERMÉ** |
| P0 | Rapport de simulation non démontré | génération privée et téléchargeable après clôture | **FERMÉ**, avec correction du préfixe privé |
| P0 | Zone de protection confondue avec la modélisation | usages et autorité humaine séparés; `MODELED_IMPACT` non ciblable | **FERMÉ pour la simulation** |
| P1 | Import scientifique et météo observée | source, fraîcheur et validation humaine | **OUVERT**, hors périmètre de ce lot |
| P1 | Lecteur d’écran réel | restitution humaine observée | **NOT_VERIFIED** |
| P1 | Diffusion réelle | allowlist serveur, propriétaire vérifié, fournisseur et autorisation distincte | **NO-GO** |

## Corrections livrables

- ajout d’un snapshot immuable `PopulationAlertInstitutionTarget`;
- distinction `hasCoordinates`, `hasGeometry`, `geographicallyConcerned`, `notificationEligible` et `selectedForNotification`;
- sélection humaine explicite, vide par défaut, puis revalidation serveur;
- contacts institutionnels actifs requis pour l’admissibilité;
- refus des identifiants hors périmètre avant toute écriture;
- livraison institutionnelle SANDBOX toujours `SUPPRESSED`, sans destinataire ni fournisseur;
- blocage fermé d’une diffusion LIVE institutionnelle sans politique approuvée;
- stockage des nouveaux rapports sous le préfixe privé canonique du tenant.

## Verdicts

- Ciblage des établissements : **GO**.
- Simulation intégrée : **GO**.
- Diffusion réelle : **NO-GO**.
- Exploitation industrielle autonome : **GO AVEC RÉSERVES**, limitée aux capacités simulées démontrées.
