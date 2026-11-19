# CORO Report 2.0 — Architecture d’import Reportperfect

## Formats

CSV, XLSX, JSON, XML, ZIP et PDF sont des **formats candidats**, pas des formats
Reportperfect confirmés. Leur prise en charge signifie que CORO peut les
analyser en zone isolée; elle ne prouve pas qu’un client peut les exporter.

## Pipeline fail-closed

1. Téléversement privé, limite de taille, validation binaire et antivirus.
2. Empreinte SHA-256 et conservation immuable du fichier source.
3. Détection du conteneur, encodage et dialecte sans exécuter de macros.
4. Extraction dans un worker isolé sans réseau, quotas CPU/mémoire/temps.
5. Staging tenant-scoped; aucune création métier pendant l’analyse.
6. Profilage des colonnes, dates, identifiants et cardinalités.
7. Mapping versionné avec preuve, preview et couverture.
8. Validation des bâtiments, acteurs et références; aucune création implicite.
9. Déduplication sur source/objet/empreinte et conflits explicites.
10. Import par lots idempotents, checkpoints et verrou optimiste.
11. Réconciliation des comptes, valeurs, pièces jointes et non-mappés.
12. Rapport signé par empreinte, audit et décision humaine de clôture.

## Modèle additionnel proposé

- `HistoricalImportJob` : tenant, source, état, empreinte, mapping, compteurs.
- `HistoricalImportBatch` : plage, checkpoint, état et tentative.
- `HistoricalImportRecord` : objet source, résultat, rapport créé, erreur.
- `HistoricalImportArtifact` : fichier source/pièce jointe et scan.
- `HistoricalMappingVersion` : règles approuvées et preuves.
- `HistoricalImportConflict` : ambiguïté, résolution et acteur.

Toutes les relations incluent `organizationId`. Les contraintes composites
empêchent une référence intertenant. Les rapports importés sont en mode
historique non éditable et ne reçoivent jamais une approbation CORO fabriquée.

## Rollback

Le rollback cible uniquement un job non clôturé et les objets créés par ce job.
Il marque les artefacts comme retirés et conserve audit/provenance. Il refuse si
un objet a été référencé par une action native postérieure. Les sources brutes
ne sont pas supprimées par le rollback.

## Formats complexes

- XLSX : lecture de valeurs, jamais macros/formules exécutées.
- XML : DTD et entités externes interdites.
- ZIP : anti-zip-bomb, chemins normalisés, profondeur et ratio bornés.
- PDF : archive consultable; extraction OCR éventuelle marquée non fiable et
  jamais utilisée pour inventer des champs.
