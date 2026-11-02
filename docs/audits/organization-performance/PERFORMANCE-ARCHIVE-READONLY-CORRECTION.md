# Correction ciblée Rendement — projets archivés et inactifs

## Périmètre

Ce lot interdit les écritures opérationnelles sur les projets archivés ou inactifs tout en conservant les lectures et l'historique financier. Il ne modifie ni les calculs `asOf`, ni le filtre conseiller, ni les données historiques.

## Autorité serveur

`lockMutableProject` applique l'autorité canonique de projet, verrouille la ligne PostgreSQL `FOR UPDATE`, puis relit son état avant toute écriture dans la même transaction.

Chemins couverts :

- mandat et services commerciaux;
- opérations de mandat;
- commentaires;
- tâches ordinaires et initialisation depuis un modèle;
- association d'une tâche à une activité;
- listes de tâches importées, renommées ou supprimées;
- checklists instanciées depuis une activité;
- saisies de temps et suppressions.

Un projet inconnu, inter-tenant ou hors affectation reste indistinguable d'un projet absent. Un projet accessible mais archivé ou inactif retourne `409 Conflict` avec un message explicite de lecture seule.

## Interface

La fiche Mandat affiche une bannière de lecture seule. Les contrôles de mutation du travail et des commentaires ne sont plus présentés. Si le projet est archivé après le chargement, le refus serveur est affiché dans une alerte et aucune valeur n'est annoncée comme sauvegardée.

## Validation

| Contrôle | Résultat |
|---|---|
| Tests serveur ciblés | PASS — 6 suites, 61 tests |
| Contrats UI ciblés | PASS — 2 tests |
| Régressions Planning | PASS — 76 tests |
| TypeScript et build frontend | PASS |
| Build backend | PASS |
| PostgreSQL 16 réel | PASS — actif, archive, inactif, isolation, concurrence, historique |
| Chrome réel | PASS — mobile Classic, desktop Glass Light/Dark, F5, erreur tardive, aucun débordement |

Preuves hors dépôt : `D:\CORO-QA\tracking\organization-performance-fix`.

## Réserves

- Production authentifiée : `NOT_VERIFIED`, hors mandat sans déploiement.
- Lecteur d'écran réel : `NOT_VERIFIED`; les rôles et alertes accessibles sont couverts par les contrats et Chrome, sans revendiquer de restitution vocale.
- `asOf` : proposition `Travail réalisé jusqu'au`, non approuvée; le résultat peut changer après une saisie rétroactive.
- Filtre conseiller : proposition `Mandats avec participation de`, non approuvée; il inclut toute la main-d'œuvre des mandats sélectionnés.
