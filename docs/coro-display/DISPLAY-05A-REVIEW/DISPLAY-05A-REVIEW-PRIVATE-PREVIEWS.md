# DISPLAY-05A-REVIEW — Aperçus privés

## Observations

L'interface récupère la variante comme blob authentifié; elle ne reçoit ni clé de stockage ni URL permanente publique. Le service charge organisation et bâtiment, vérifie les permissions et compare l'empreinte des octets privés. Le lecteur opérationnel refuse les états suspendus et révoqués; la vue de gestion conserve l'accès historique autorisé pour audit.

## Tests

Les suites DISPLAY-03/04 couvrent authentification, organisation, bâtiment, version, empreinte, révocation et stockage privé simulé. Le contrat frontend vérifie `responseType: 'blob'` et l'absence de `publicUrl`/`variantStorageKey`.

## Corrections

Le dialogue possède désormais un nom accessible via `aria-labelledby`. Les messages d'erreur restent génériques et ne révèlent pas les clés privées.

## Risques résiduels

`NOT_VERIFIED` visuellement : le stockage QA S3 local n'était pas configuré et le connecteur navigateur était indisponible. Une recette ultérieure doit charger une variante privée réelle, puis vérifier suspension, révocation et session expirée.
