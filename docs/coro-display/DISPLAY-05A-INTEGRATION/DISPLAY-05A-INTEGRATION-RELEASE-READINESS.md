# DISPLAY-05A-INTEGRATION — Préparation de release

## Candidat

La branche contient le dernier `origin/main` vérifié, les deux commits DISPLAY-05A originaux et un commit d'intégration local à produire. Le diff est ciblé; aucune migration additionnelle n'est requise.

## Prêt

- API et route compilées.
- PostgreSQL depuis zéro et idempotence des migrations.
- Permissions, multitenant, transitions et sources admissibles testés.
- OCR et PDF Population confirmés sous Linux.
- Audits production à zéro.
- `follow-redirects` corrigé.
- Documentation et contrat DISPLAY-05B disponibles.

## Barrière restante

La recette visuelle authentifiée n'a pas été exécutée. Avant fusion de la future PR, exiger une preuve desktop/tablette/mobile, clavier, contraste, dialogue, aperçu privé réel, déconnexion et expiration de session.

## Déploiement

Aucun déploiement n'est autorisé ou effectué dans ce chantier.
