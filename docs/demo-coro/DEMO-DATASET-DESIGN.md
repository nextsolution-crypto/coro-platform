# Conception du jeu de données Démo

## Principe

Le manifeste `ops/demo/demo-coro-fixture-manifest.json` est l'autorité des nouvelles fixtures. Les identifiants sont stables, les noms comportent « Démo », les courriels utilisent `example.invalid` et les coordonnées représentent des lieux fictifs de présentation.

## Première tranche déterministe

- Préservation du client Groupe Immobilier Prémont et de ses projets existants.
- Ajout de 2 clients fictifs pour atteindre un portefeuille de 3 clients.
- Ajout de 3 bâtiments fictifs pour atteindre 6 bâtiments avec l'existant.
- Ajout de 10 projets PMU/PSI/PCA pour atteindre 12 projets avec l'existant.
- États : brouillon, en cours, révision, validé, exporté et archivé.
- `progress` reste une progression déclarée; aucune formule automatique n'est introduite.

## Tranches suivantes

- Activités/planning : 3 activités datées rattachées à des projets actifs et 4 tâches assignées au compte de référence.
- Timelog/Rendement : 3 mandats fictifs, 4 saisies de temps réparties sur les tâches et des montants strictement synthétiques. Aucun montant n'est déclaré officiellement approuvé.
- Documents et versions, Knowledge, Sentinelle, Incident/exercices, REX/actions, résilience et Population seront ajoutés seulement avec leurs autorités métier et preuves propres. Un statut approuvé ne sera pas fabriqué par une mise à jour SQL.

Tout document devra afficher : « DÉMONSTRATION — DONNÉES FICTIVES — NON UTILISABLE POUR UNE INTERVENTION RÉELLE ».
