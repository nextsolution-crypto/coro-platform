# Préparation de release

La branche locale est cohérente avec `origin/main`, sans conflit et sans modification de production. Les migrations, tests Display, builds et contrôles de sécurité runtime passent. Le diff est limité au workflow, à ses tests, à l’interface, aux assets Liquid Glass générés et aux preuves documentaires.

Avant PR/fusion :

1. exécuter la recette navigateur authentifiée;
2. rejouer l’OCR sur un runner Linux/Windows équipé de Poppler;
3. confirmer la capacité mémoire TypeScript backend en CI;
4. faire relire la correction « preuve obligatoire + validateur distinct »;
5. surveiller les avis dev-tooling sans forcer de migration majeure.

Aucun push, PR, merge, déploiement ou migration partagée n’a été réalisé.
