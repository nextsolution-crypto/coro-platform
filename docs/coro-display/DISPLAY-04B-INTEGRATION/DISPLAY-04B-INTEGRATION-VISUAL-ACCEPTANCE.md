# Acceptation visuelle

Le contrat d'approbation réutilise l'événement DISPLAY-03 et lie : `ProjectFile`, version et SHA-256 source, version et SHA-256 du rendu, profil, emplacement, acteur et date.

Les tests refusent séparément une version source, une empreinte source, une version de variante, une empreinte de variante, un emplacement ou un profil contradictoire. La validation technique n'élève jamais `PENDING_REVIEW` en `APPROVED`.

Réserves : l'approbation humaine explicite et l'observation sur le matériel d'affichage réel sont `NOT_EXECUTED` et restent hors du périmètre de cette intégration.
