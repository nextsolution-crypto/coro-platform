# DISPLAY-03 — Modèle de données

`DisplayPlanPublication` référence par clés composites l’organisation, le bâtiment, l’étage, la zone facultative, l’emplacement et le `ProjectFile`. Le triplet source `projectFileId/sourceVersion/sourceSha256` est figé. La variante conserve clé privée, SHA-256, format, dimensions et paramètres de rendu.

`DisplayPlanPublicationEvent` forme un journal append-only : action, états avant/après, acteur, motif, corrélation, horodatage et métadonnées. Les contraintes SQL valident dimensions positives, coordonnées normalisées, cohérence des dates et champs requis par statut.

Les index couvrent listes tenant/bâtiment, sélection Player par emplacement/statut et historique. Une seule publication `PUBLISHED` par emplacement est imposée par index partiel; le remplacement est transactionnel.
