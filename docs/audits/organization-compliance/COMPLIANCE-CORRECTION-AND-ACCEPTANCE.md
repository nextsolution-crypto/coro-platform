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

## Clôture de livraison — PR #142

- correctif testé : `06e74b3b1b84245bc44be8e7d84be39292599541`;
- candidat fusionné et actif : `cedbcbf40db4279ac6d7dec82dc58ec6f5976a38`;
- PR : `#142`, fusionnée après CI obligatoire terminale;
- CI `main` : run `41307503527`, `SUCCESS`;
- release gouvernée : run `41308088727`, `SUCCESS`;
- inspection post-release : run `41309283499`, `PASS` / `GO`;
- capacité post-release : run `41309338858`, `HEALTHY`,
  `45 276 950 528` octets libres et `25 571 198 736` octets de marge de
  release;
- migrations : `164`, tête
  `20261117010000_building_governance`, aucun échec et aucun delta pour ce lot;
- sauvegarde : `production-20261101T125903Z-8d140a635dbe`,
  `REMOTE_VERIFIED`, intégrité distante vérifiée;
- restauration : `20261101T125923Z-2ff1e5a3da9b`, `RESTORE_VERIFIED`;
- rollback : quatre images immuables disponibles après réconciliation;
- verrou partagé : libéré après la release.

### Images actives vérifiées

| Service | Digest actif |
|---|---|
| Backend | `sha256:4ac9ff2c5281fb4fae695963527fce27167d1adc7423e878940cab1faaded643` |
| Frontend | `sha256:23925424ece2dea268bdbb18d01dd8891c4e202c8f826d1990c48220c4ce3ef3` |
| Portail Client | `sha256:1d41a44f158fb4489b00937d24ffd1b6c591c7aa06573c23566492c7a708bae8` |
| Site public | `sha256:4eeb88aadffb833ce8006d6f2129ee75300e96c72d8a2584183c575b1d41e523` |

### Vérification visuelle authentifiée en production

La session autorisée a confirmé, strictement en lecture seule : ouverture et
actualisation F5, compteurs, états documentaires factuels, provenance, sens des
dates, recherche, filtre client, navigation vers une source autorisée et rendu
aux formats `390×844` et `1440×900`. Aucun débordement horizontal, contrôle
tronqué ou erreur console n'a été observé. Aucune donnée, permission ou source
de production n'a été modifiée pour cette preuve.

Les refus multi-acteurs et le mode 503 restent attribués à la campagne QA
synthétique. Le lecteur d'écran réel demeure `NOT_VERIFIED`; l'absence
d'export, l'absence d'écran Portail Client équivalent et le moteur réglementaire
restent hors périmètre.

`VALIDÉ_QA — FUSIONNÉ — DÉPLOYÉ — RÉCONCILIÉ`
