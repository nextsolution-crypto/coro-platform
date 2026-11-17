# INC-RP-02C — Consignes et suivis opérationnels

## Décision d’architecture

INC-RP-02C ajoute deux capacités autonomes, désactivées par défaut :

- `OPERATIONAL_DIRECTIVES_ENABLED`
- `OPERATIONAL_FOLLOWUPS_ENABLED`

Elles réutilisent les permissions de plateforme et l’affectation bâtiment de la main courante. Elles n’accordent aucun droit Sentinelle, ne modifient aucune procédure Knowledge et n’envoient aucune communication externe.

## Modèle

### Consignes

`OperationalDirective` porte le cycle gouverné et le ciblage. `OperationalDirectiveVersion` conserve le contenu, les références documentaires et les pièces jointes sous forme de références JSON; un trigger PostgreSQL interdit toute modification ou suppression d’une version. `OperationalDirectiveReceipt` distingue consultation et confirmation explicite, horodatée par le serveur.

Transitions :

`DRAFT → SUBMITTED → APPROVED → PUBLISHED → REVOKED`

Les états `EXPIRED`, `SUPERSEDED` et `ARCHIVED` sont réservés aux traitements gouvernés ultérieurs. Le créateur ne peut pas approuver sa propre consigne. La publication fige la version et crée seulement les reçus des utilisateurs qui possèdent déjà `OPERATIONAL_DIRECTIVE_READ` et une affectation active au bâtiment.

### Suivis

`OperationalFollowUp` référence une source sans la dupliquer. `OperationalFollowUpEvent` constitue l’historique idempotent des décisions.

`OPEN → ASSIGNED → IN_PROGRESS → COMPLETED → VERIFIED → CLOSED`

Annulation, réouverture et retour contrôlé en exécution sont pris en charge. L’exécutant ne peut pas vérifier son propre suivi.

## API

- `POST/GET /organizations/:organizationId/operations/directives`
- `POST .../directives/:id/submit|approve|publish|revoke|acknowledge`
- `POST/GET /organizations/:organizationId/operations/follow-ups`
- `POST .../follow-ups/:id/assign|start|complete|verify|close|cancel|reopen`

Toutes les routes exigent JWT, organisation active, permission explicite et affectation active au bâtiment. Les ressources hors périmètre sont masquées par un 404.

## Permissions

Quinze permissions dédiées séparent lecture, création, édition, révision, approbation, publication, révocation, confirmation, assignation, exécution, vérification, clôture et administration. Aucune attribution implicite n’est ajoutée.

## Interface

La page `/operational-directives` propose : sélection du bâtiment autorisé, création de consigne ou suivi, liste des éléments admissibles, transitions contextuelles et confirmation explicite. Elle est responsive et utilise le client API authentifié normal.

## Rollback

La migration est additive. Tant que les flags restent absents ou différents de la chaîne littérale `true`, les routes refusent tout accès. Le rollback applicatif consiste à redéployer l’image précédente; les nouvelles tables peuvent rester dormantes. Aucun `DROP` ne doit être improvisé en production.

## Réserves pour 02D

- Paramétrage administratif des politiques de séparation et délais de confirmation.
- Résolution avancée des groupes, équipes et rôles dans `targetCriteria`.
- Automatisation des expirations, retards et rappels internes.
- Recette navigateur authentifiée multi-profils.
- Présentation immobilière intégrée dans les fiches bâtiment et tableaux de bord.
