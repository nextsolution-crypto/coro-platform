# Préparation de release

La branche est candidate à une PR Draft locale : historique source préservé, migrations reproductibles, builds de production verts, runtime sans vulnérabilité connue et contrats multitenant/idempotence exercés.

Conditions avant fusion/production : exécuter le test OCR sous Linux avec Poppler, réaliser la recette navigateur authentifiée synthétique, et accepter ou corriger explicitement les avis de dépendances de développement. Aucune migration partagée ni production n'a été touchée.
