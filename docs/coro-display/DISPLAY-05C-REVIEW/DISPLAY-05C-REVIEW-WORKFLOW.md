# Workflow

Le workflow canonique est conservé. Les transitions sont validées côté serveur; l’interface ne montre désormais que celles autorisées par les capacités reçues. Une observation `CLOSED` est immuable : message, qualification, assignation et transition supplémentaire sont refusés.

Les références de correction ne sont acceptées que pour `CORRECTION_IN_PROGRESS` et `RESOLVED`. Type et identifiant doivent être fournis ensemble. La priorité déclarée par le client est conservée séparément de la qualification professionnelle.

Preuves : tests unitaires, contrat frontend et scénario PostgreSQL complet jusqu’à fermeture.
