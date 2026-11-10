# DISPLAY-04A-REVIEW — Intégrité documentaire

## Observations

L'autorité est liée au `ProjectFile` approuvé, à sa version, son SHA-256, l'organisation, le bâtiment, la publication, la page et le DPI. Le rendu PNG et la variante possèdent leurs propres SHA-256 et clés immuables.

## Preuves et tests

- Source téléchargée puis recalculée : divergence → `SOURCE_HASH_MISMATCH`.
- Révocation pendant le rendu : job `FAILED/AUTHORITY_CHANGED`, `variantSha256` reste nul.
- Modification concurrente de la publication : lock optimiste, aucun résultat autoritaire.
- Réponse rasteriseur : taille, type fichier, absence de symlink, descripteur `O_NOFOLLOW`, SHA-256.
- Stockage : clé préfixée par tenant et publication; écriture immuable vérifiée par relecture.

## Corrections

Une deuxième lecture d'autorité est faite immédiatement après le rendu, avant les téléversements, puis une troisième dans la transaction finale. Le `projectFileId` exact est inclus dans la clause de mutation.

## Risques résiduels

Des objets privés orphelins sont possibles si l'autorité change entre le téléversement et le commit. Ils ne sont pas référencés ni publiables. Une réconciliation de stockage, sans suppression automatique, doit les inventorier.
