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

- PR produit : `#165`, HEAD testé `7f6580b0788ed22705b0604911c76189632c5a90`, fusionnée par `600b1a4134ada3b3c9dd15b7333876f6e511fcdd`.
- Candidat final : `205eb1283b7de71a338e36647ecb5c91b6ed0784`. Il contient la correction Rendement, le système QR de `#164` et la mise à jour documentaire QR de `#166`; aucun autre chantier applicatif non autorisé n'a été ajouté après la fusion de `#165`.
- CI main : `41441005855` SUCCESS. Release gouvernée : `41533537344` SUCCESS.
- Inspection post-release : `41535662856` PASS/GO; release `SUCCESS`, état `SUCCEEDED/COMPLETED`, verrou libre.
- Production active : `205eb1283b7de71a338e36647ecb5c91b6ed0784`, quatre services applicatifs actifs, aucun redémarrage observé.
- Images actives : backend `sha256:943f162317a14ed88c55d99d6b6d3702010783cf70b64908c9687e1923b93e49`; frontend `sha256:ad667b89547616efab3f5e36fe553db2c352c1f7800606a3ddae794a55a238c2`; site `sha256:64fa1310f0680a27dd104747365670e28039d663c368c9a76674889ba5434ded`; portail client `sha256:bd3779d84027fd73488909ed6f57e179079261538891f9808c72cc5a9d92ac26`.
- PostgreSQL : `16.15`, 167 migrations, tête `20261120010000_permanent_qr_codes`, aucune migration en échec.
- Sauvegarde : `REMOTE_VERIFIED`; restauration : `RESTORE_VERIFIED`.
- Capacité : l'entretien pré-release gouverné a supprimé 16 images expirées non référencées et récupéré physiquement 9 434 075 136 octets. La rotation post-release n'avait plus aucun candidat. L'inspection finale mesure 80 162 804 KiB au total et 37 326 564 KiB disponibles (54 % utilisés).
- Rollback : les quatre images précédentes sont physiquement disponibles, mais le backend antérieur réintroduit les écritures sur projets archivés. En l'absence d'un jeu explicitement approuvé par l'autorité de rollback, ce retour applicatif reste interdit; la restauration de données est vérifiée et la correction doit être conservée par roll-forward.
- Recette Chrome authentifiée : page Rendement chargée et identique après F5; desktop et viewport mobile 320 px lisibles, sans débordement. Après rechargement mobile, la console ne contient aucune erreur; seuls des avertissements de performance `Forced reflow` ont été observés. Le compte affiche zéro mandat financier et zéro projet archivé; aucune écriture métier réelle n'a été effectuée. La lecture seule visuelle d'un projet archivé demeure donc `NOT_VERIFIED`, tandis que les refus backend/PostgreSQL, la concurrence et l'historique sont couverts par les tests réussis.
- Les calculs `asOf` et conseiller n'ont pas été modifiés; leurs décisions de libellés restent ouvertes.
