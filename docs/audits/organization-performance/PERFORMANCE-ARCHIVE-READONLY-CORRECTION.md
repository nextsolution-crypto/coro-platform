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

- Production authentifiée : module Rendement chargé et persistant après F5 sous session autorisée. Aucun projet archivé n'existe dans le périmètre visible de ce compte; la bannière et les contrôles de lecture seule d'un projet archivé restent donc `NOT_VERIFIED` visuellement en production, sans création ni mutation de donnée pour forcer le cas. Les refus serveur, la concurrence et la préservation de l'historique demeurent **PASS** dans les tests PostgreSQL/API du candidat livré.
- Lecteur d'écran réel : `NOT_VERIFIED`; les rôles et alertes accessibles sont couverts par les contrats et Chrome, sans revendiquer de restitution vocale.
- `asOf` : proposition `Travail réalisé jusqu'au`, non approuvée; le résultat peut changer après une saisie rétroactive.
- Filtre conseiller : proposition `Mandats avec participation de`, non approuvée; il inclut toute la main-d'œuvre des mandats sélectionnés.

## Clôture de production combinée — 2 novembre 2026

- PR #165 : merge `600b1a4134ada3b3c9dd15b7333876f6e511fcdd`, parent exact `7f6580b0788ed22705b0604911c76189632c5a90`.
- Candidat commun actif : `205eb1283b7de71a338e36647ecb5c91b6ed0784`.
- Pipeline `41533537344` : **SUCCESS**; tests backend/PostgreSQL, concurrence, historique, builds et typechecks réussis avec QR-001 présent dans le même candidat.
- Inspection `41535829755` : services sains, zéro redémarrage applicatif, release `SUCCESS`, état `SUCCEEDED`.
- Recette Chrome : authentification conservée, page Rendement chargée et identique après F5. Le compte observé affiche zéro mandat financier et zéro projet archivé; aucune écriture métier réelle n'a été effectuée.
- Les calculs `asOf` et conseiller n'ont pas été modifiés; leurs décisions de libellés restent ouvertes.
