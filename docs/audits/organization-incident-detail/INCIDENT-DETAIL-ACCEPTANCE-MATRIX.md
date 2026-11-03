# Matrice d’acceptation — fiche Incident

## Candidat et environnement

- SHA produit : `9ed296186733934395e757ca90133f4606b28c4e`
- PostgreSQL 16, 167 migrations, tête `20261120010000_permanent_qr_codes`
- Réseau deny-by-default; fournisseurs simulés uniquement
- Preuves : `D:\CORO-QA\tracking\organization-incident-detail`

## Livraison gouvernée

- PR `#172`, fusionnée au SHA `7184456f42d43429d38ccbdaa87f141df774a2c9`.
- CI `41569957791`, capacité `41570498562`, inspection pré-release `41570500820`, release `41570892531`, inspection post-release `41572536046` et réconciliation `41572538222` : `SUCCESS`.
- Production : SHA actif `7184456f42d43429d38ccbdaa87f141df774a2c9`; PostgreSQL 16.15, 167 migrations, tête `20261120010000_permanent_qr_codes`.
- Navigateur production : `PARTIAL`. Le portail et Sentinelle sont accessibles, mais l'identité disponible reçoit un refus sur l'historique Incident. Ce `403` ne valide pas une fiche autorisée.

## API et PostgreSQL

Les 13 contrôles sont `PASS` : lecture autorisée; refus bâtiment, tenant et anonyme; projection minimale; auteur serveur; refus d’une sous-ressource étrangère sans écriture; containment idempotent; motif de résolution obligatoire; résolution, audit et rejeu; rollback intégral sur panne SQL; date REX serveur; ordre stable des égalités.

## Chrome authentifié

Les 12 combinaisons sont `PASS` : 390×844, 768×1024, 1440×900 et 2560×1440, chacune en Classic, Glass Light et Glass Dark.

| Contrôle | Résultat |
|---|---|
| Nature exercice, statut, responsable, fraîcheur | PASS |
| Snapshots mal formés, contenu valide conservé | PASS |
| Motif requis et transitions depuis l’interface | PASS |
| Double clic containment/résolution, un effet | PASS |
| Refus acteur hors périmètre | PASS |
| 503 visible, accessible et récupérable | PASS |
| F5, clavier/focus et zoom 200 % | PASS |
| Cibles tactiles et débordement horizontal | PASS |
| XSS DOM et impression | PASS — aucune exécution |
| Erreur console critique | PASS — aucune |
| Lecteur d’écran réel | NOT_VERIFIED |

## Non applicable ou distinct

- Réouverture, pièces jointes Incident et création/suppression de tâche depuis cette fiche : non présentes dans ce lot.
- Production authentifiée : `NOT_VERIFIED`; aucune mutation réelle n’est autorisée.

## Complément PR #182 — capacités effectives

| Contrôle | Résultat |
|---|---|
| Capacités calculées par intersection permission individuelle / affectation active | PASS |
| Lecture seule desktop et mobile | PASS |
| Supervision sans commande | PASS |
| Commande sans supervision | PASS |
| Révocation serveur et navigateur à la requête suivante | PASS |
| Refus sans mutation d'état ni incrément de `lockVersion` | PASS |
| Contrat API fail-closed si capacités absentes ou mal formées | PASS |
| Production : refus explicite et persistant après F5 pour l'identité non autorisée | PASS |
| Production : ouverture d'une fiche avec une identité autorisée | NOT_VERIFIED — aucune attribution réelle créée pour la recette |
| Lecteur d'écran réel | NOT_VERIFIED |

Version QA : `1b91e9af8b1c933babf21c9a8438232660ba2734`. Version fusionnée et active : `e28eec4fb26288768e147ec08fada24b2d92140a`. Release `41690727735`, inspection `41694100917` et réconciliation `41694254014` : `SUCCESS`.

## Reprise synthétique de clôture

| Contrôle | Résultat |
|---|---|
| Fondation QA isolée et effets externes neutralisés | PASS — dry-run `41698375099`, préparation `41698697992` |
| Attribution minimale `INCIDENT_READ` à l'exercice synthétique | NOT_VERIFIED — aucun point d'entrée gouverné disponible pour la session administrateur inter-organisation |
| Liste et fiche autorisées avec l'identité QA | NOT_EXECUTED |
| Absence de droits `SUPERVISE` et `COMMAND` | PASS — aucun droit Incident n'a été accordé |
| Remise en état | PASS — `41699393782` |
| Refus et absence d'accès résiduel après remise en état | PASS — `residualAccess:false`; dry-run final `41699726935` |
| Identité inactive, sessions/liens/appareils révoqués | PASS |
| Patrick et identités réelles inchangés | PASS |

Verdict : `ACCEPTATION_PRODUCTION_SYNTHETIQUE_PARTIAL`. L'accès autorisé navigateur demeure `NOT_VERIFIED`; le refus et la remise en état sont démontrés.
