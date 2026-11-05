# SP-OPS-03 — Scénario de validation

## Jeu d'essai

- bâtiment fictif et coordonnées synthétiques;
- rapport de dispersion utilisé comme référence documentaire seulement;
- source canonique synthétique `ProjectFile`, version 1;
- scénario ammoniac basé sur les quatre distances publiées;
- une empreinte scientifique `MODELED_IMPACT` et une zone opérationnelle `PUBLIC_NOTIFICATION` séparées;
- abonnés synthétiques dedans, dehors, sans localisation et dans le rayon mais hors secteur;
- adaptateurs SMS/courriel simulés; aucun fournisseur réel.

## Parcours A à J

| Étape | Résultat |
|---|---|
| A — Connaissance | PASS par extraction locale et contrôle de provenance/version |
| B — Analyse | PASS au niveau composant/contrat : paramètres, limites, zones et avertissements visibles |
| C — Détection | PARTIAL : événement opérationnel couvert par tests automatisés, pas par stack HTTP intégré dans ce lot |
| D — Décision | PASS par politiques et tests d'approbation; aucune décision scientifique nouvelle automatisée |
| E — Population | PASS unitaire pour abonnés; FAIL/PARTIAL pour établissements sensibles non raccordés |
| F — Communication | PASS simulé; bilinguisme et snapshots de message couverts |
| G — Autorisation | PASS automatisé, y compris refus sans approbation et double contrôle |
| H — Simulation | PASS SANDBOX; aucune communication réelle |
| I — Preuve | PASS automatisé pour roster, livraisons et preuves |
| J — REX | PARTIAL : données disponibles; parcours navigateur de bout en bout non rejoué |

## Cas directionnel déterminant

Deux abonnés sont dans un rayon opérationnel. Un seul est dans le secteur NE confirmé. Le test de non-régression prouve que le gel crée une livraison uniquement pour l'abonné du secteur NE; l'autre n'est pas ajouté au roster.
