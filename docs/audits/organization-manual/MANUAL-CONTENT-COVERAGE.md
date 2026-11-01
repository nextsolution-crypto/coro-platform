# Couverture du contenu — Manuel CORO

## Inventaire du catalogue

- 23 articles au total.
- 15 accessibles à l’application Organisation.
- 14 accessibles au Portail client.
- 6 articles communs.
- Une langue proposée : français; contrôle multilingue `NON_APPLICABLE`.
- Aucun média, téléchargement ou export propre au Manuel.

## Application Organisation

| Espace / fonction | Article actuel | Statut | Observation |
|---|---|---|---|
| Tableau de bord | `demarrer` | PARTIAL | repérage générique seulement |
| Projets | `projets` | PARTIAL | consultation de base; archives absentes |
| Fichiers projet | `deposer-document`, `approuver-document`, `versions-document` | PARTIAL | cycle ProjectFile; parcours génération/éditeur/PDF incomplet |
| Activités | `activites-interne` | PARTIAL | lecture générique; `ProjectActivity` non nommé |
| Timelog | `timelog` | PASS_WITH_LIMITS | suivi du temps correctement distingué du financier |
| Planification | `planning` | PARTIAL | consultation générique |
| Clients | aucun | FAIL | désactivation/provisionnement/invitation absents |
| Bâtiments | `batiments`, `building-document-library` | PARTIAL | fiche et documents; règles de gouvernance récentes incomplètes |
| Carte | aucun | FAIL | fournisseur, attribution, panne et géocodage absents |
| Conformité | aucun | FAIL | suivi documentaire factuel absent |
| Bibliothèque | aucun | FAIL | lecture seule globale et non-raccordement IA absents |
| Manuel | `demarrer` et catalogue | PASS | aide disponible et versionnée |
| Paramètres | aucun | FAIL | aucune instruction dédiée |
| Profil | `profil` | PASS_WITH_LIMITS | apparence couverte, autres fonctions non détaillées |
| Notifications | `notifications` | PARTIAL | consultation seulement |
| Rapports d’exercice | `rex-interne` | PARTIAL | état de publication seulement |
| Commercial | `commercial` | PARTIAL | accès général, réserves contractuelles présentes |
| OCR | `ocr` | PASS_WITH_LIMITS | limites explicites et activation conditionnelle |

## Portail client partagé

| Fonction | Article | Statut |
|---|---|---|
| Documents | `documents-client` | PARTIAL |
| Knowledge | `knowledge` | PASS_WITH_LIMITS |
| Activités | `activites` | PARTIAL |
| Sentinelle | `sentinelle` | PARTIAL |
| Incidents | `incidents` | PARTIAL |
| Population | `population` | PASS_WITH_LIMITS |
| REX/actions correctives | `rex-client` | PARTIAL |
| Hors ligne | `hors-ligne` | PASS_WITH_LIMITS |
| Profil | `profil` | PARTIAL |
| Notifications | `notifications` | PARTIAL |
| Bâtiments | `batiments`, `building-document-library` | PARTIAL |

Cette section est un inventaire de contenu partagé, pas une nouvelle acceptation du Portail client.

## Règles récentes à intégrer

| Règle démontrée | Source de vérité | Présente dans le Manuel |
|---|---|---|
| Client désactivé : accès, sessions et liens révoqués; données conservées | `CLIENTS-INTEGRATED-ACCEPTANCE.md` | NON |
| Projet archivé : lecture seulement, pas de mutation/régénération implicite | clôtures documentaires/portail | NON |
| Documents techniques distincts du suivi de conformité | clôtures Buildings/Compliance | NON |
| Stockage distinct de l’indexation Knowledge | services Building Documents/Knowledge | PARTIELLEMENT |
| Carte : tuiles publiques, attribution, liste de repli | `MAP-CORRECTION-AND-ACCEPTANCE.md` | NON |
| Géocodage public désactivé par défaut | même source | NON |
| Conformité = suivi documentaire, pas attestation réglementaire | `COMPLIANCE-CORRECTION-AND-ACCEPTANCE.md` | NON |
| Bibliothèque globale en lecture seule | `LIBRARY-CORRECTION-AND-ACCEPTANCE.md` | NON |
| Bibliothèque non connectée à Knowledge/CORO AI/public | même source | NON |

## Conclusion de couverture

La couverture est suffisante pour une aide de découverte, pas pour l’autonomie complète d’un nouvel utilisateur Organisation. Les omissions concernent cinq espaces principaux et plusieurs décisions de sécurité/gouvernance; elles doivent être traitées avant toute présentation du Manuel comme référence exhaustive de la release.
