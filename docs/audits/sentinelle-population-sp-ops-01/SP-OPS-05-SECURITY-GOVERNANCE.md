# SP-OPS-05 — Sécurité et gouvernance

## Autorités observées

- périmètre bâtiment et tenant appliqué par les façades Client Portal;
- permissions Population distinctes pour consultation, préparation, approbation et diffusion;
- approbateur injecté par l'authentification serveur, jamais accepté du navigateur;
- double contrôle empêchant l'auteur d'approuver lorsque configuré;
- gel atomique et idempotent des livraisons;
- fournisseur appelé seulement après preflight et claim;
- snapshots minimisés sans identité ou position individuelle dans les réponses cartographiques.

## Renforcement SP-OPS-01

Le mode LIVE revérifie juste avant le gel :

1. présence et activité du scénario;
2. complétude et révision scientifique;
3. source ProjectFile courante et admissible;
4. identité et version de la source;
5. horodatage et usage de chaque zone;
6. approbation des zones opérationnelles.

Tout écart produit un refus avant lecture complète du roster ou création de livraison.

## Risques résiduels

- absence de recette HTTP/PostgreSQL multi-tenant du candidat;
- `RueSurroundingAsset` n'est pas raccordé au calcul Population;
- absence de preuve avec lecteur d'écran réel;
- diffusion LIVE volontairement non testée et non autorisée;
- données météorologiques temps réel et autorité de décision hors du moteur actuel.

## Verdict sécurité

**GO AVEC RÉSERVES** pour la préparation simulée. **NO-GO** pour une diffusion réelle ou une exploitation industrielle autonome.
