# Constats — éditeur documentaire

| ID | Sévérité | Statut | Constat et preuve | Impact |
|---|---:|---|---|---|
| DE-001 | Critique | REPRODUCED | Contenu `<img onerror=...>` accepté (HTTP 200), rendu et gestionnaire exécuté dans les 12 sessions Chrome. | XSS stockée sous l’identité d’un utilisateur autorisé. |
| DE-002 | Critique | REPRODUCED | Modification d’une section d’un projet `VALIDATED`: HTTP 200. | Altération d’un document approuvé malgré l’indication « lecture seule ». |
| DE-003 | Élevée | REPRODUCED | Modification d’un document lié à un projet `ARCHIVED`: HTTP 200. | Contournement de l’immuabilité attendue des archives. |
| DE-004 | Élevée | REPRODUCED | Deux PUT concurrents: HTTP 200/200, une valeur perdue. | Écrasement silencieux entre éditeurs. |
| DE-005 | Élevée | CONFIRMED_CODE | Tous les acteurs qui peuvent lire un projet peuvent modifier le document et gérer ses versions; aucune permission fonctionnelle distincte. | Confusion lecture/édition/restauration/suppression. |
| DE-006 | Élevée | CONFIRMED_CODE | Le mode lecture seule n’est utilisé que pour le rendu texte du module 1; modules 2–8 et procédures restent raccordés à des API mutables. | Verrou visuel incomplet et trompeur. |
| DE-007 | Moyenne | REPRODUCED | Création de version sur projet `VALIDATED`: HTTP 201. | Historique mutable après finalisation. |
| DE-008 | Moyenne | REPRODUCED | `GET /versions` renvoie `snapshot` complet alors que l’UI n’en a pas besoin. | Exposition excessive de contenu et poids inutile. |
| DE-009 | Élevée | CONFIRMED_CODE | Aucun état sale commun, `beforeunload` ou garde de navigation. | Perte de saisie lors d’un changement de section/langue/route/F5. |
| DE-010 | Moyenne | CONFIRMED_CODE | Échecs de lecture/sauvegarde/version consignés seulement dans la console; lecture échouée redirige vers le projet. | Faux sentiment de succès, diagnostic et reprise insuffisants. |
| DE-011 | Moyenne | CONFIRMED_CODE | Validation filtre par organisation seulement, contrairement à `projectAccessWhere`. | Un opérateur de la même organisation peut inférer des constats hors de son périmètre projet. |
| DE-012 | Moyenne | CONFIRMED_CODE | Sauvegarde et versions sans journal d’audit canonique ni provenance explicite de l’éditeur. | Traçabilité insuffisante. |
| DE-013 | Faible | OBSERVED | 12/12 sans overflow, mais la route reste `legacy-only` sous les préférences Glass. | La matrice ne démontre pas une expérience Glass native. |
| DE-014 | Faible | CONFIRMED_CODE | Actions restaurer/supprimer visibles surtout au survol; erreurs non annoncées; modale sans gestion de focus démontrée. | Accessibilité clavier/mobile incomplète. |

## Points positifs préservés

- Le périmètre inter-tenant de lecture et de téléchargement synthétique est refusé (404).
- Une identité révoquée est refusée (401).
- La persistance normale d’une section est effective après relecture.
- La page ne déborde pas horizontalement aux quatre largeurs mesurées.
- La campagne a restauré les données synthétiques après les essais adversariaux.
