# Correction intégrée — écran Conformité

## Périmètre

Ce lot corrige les quatre défauts reproduits sans créer un moteur réglementaire :

1. qualification trompeuse fondée sur l'âge technique;
2. portée opérateur excessive;
3. sélection d'un seul projet récent masquant une source existante;
4. panne API rendue comme un état vide.

## Contrat corrigé

La population est limitée aux bâtiments actifs de l'organisation. Pour un
opérateur, le bâtiment et ses sources sont filtrés par la politique canonique
`projectAccessWhere(actor)`. Les projets inactifs ou archivés sont exclus de
l'état courant. Toutes les sources des projets accessibles sont examinées.

| État | Définition factuelle |
|---|---|
| `APPROVED_AVAILABLE` | document courant `VALIDATED` ou `EXPORTED` accessible |
| `IN_REVIEW` | aucune source approuvée et au moins une source en révision |
| `DRAFT_ONLY` | brouillon accessible sans source approuvée ou en révision |
| `HISTORICAL_ONLY` | sources archivées seulement |
| `NO_ACCESSIBLE_DOCUMENT` | aucune source accessible dans les projets inclus |

La réponse conserve la provenance (document, version, type, projet, statut,
dernière modification et date d'approbation lorsqu'elle est enregistrée).
`regulatoryAttestation` vaut toujours `false`. Aucun délai légal n'est déduit.

## Preuves techniques

- tests serveur ciblés : 6 scénarios;
- test de contrat du harnais QA;
- compilation backend;
- ESLint ciblé et build de production frontend;
- matrice Design System;
- campagne PostgreSQL 16/API/Chrome : 16/16 contrôles et 12/12
  configurations (`390×844`, `768×1024`, `1440×900`, `2560×1440`, Classic,
  Glass Light et Glass Dark);
- panne 503 contrôlée : alerte distincte, bouton de reprise, aucun compteur vide;
- preuves assainies :
  `D:\CORO-QA\audits\organization-compliance\correction`.

## Gouvernance restante

Les modèles `ComplianceRequirement`, `BuildingRequirement` et
`ComplianceEvidence` ne pilotent pas cet écran. Leur utilisation comme moteur
de conformité, les règles d'applicabilité, échéances, renouvellements et
non-applicabilité exigent une décision métier distincte.

L'écran correspondant du portail Client et l'export restent hors périmètre.
Le lecteur d'écran réel demeure `NOT_VERIFIED` tant qu'il n'est pas exécuté.

## Verdict

`ACCEPTATION_INTÉGRÉE_PASS`

Ce verdict porte sur le suivi documentaire factuel. Il ne valide aucune
attestation réglementaire. Le lecteur d'écran réel reste `NOT_VERIFIED`.
