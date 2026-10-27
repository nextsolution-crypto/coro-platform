# Matrice d’acceptation

| Domaine | Scénario | Résultat |
|---|---|---|
| Accès | Projet affecté, organisation A | NOT_VERIFIED_RUNTIME |
| Accès | Opérateur même organisation non affecté | FAIL_CONTRACT — PROJ-DOC-001 |
| Accès | Organisation B par identifiant connu | PARTIAL — organisation filtrée, E2E non exécuté |
| Accès | Projet désactivé | FAIL_CONTRACT — PROJ-DOC-003 |
| Archive | Consultation/versions/téléchargement autorisés | NOT_VERIFIED_RUNTIME |
| Archive | Dépôt/nouvelle version/transitions refusés | FAIL_CONTRACT — PROJ-DOC-004 |
| Liste | Métadonnées, catégories, versions, états | COMPLETE_CODE / NOT_VERIFIED_BROWSER |
| Liste | Recherche, filtre, tri, pagination | NOT_IMPLEMENTED |
| Stockage | Nouveau fichier privé, SHA-256 | COMPLETE_CODE / NOT_VERIFIED_BYTES |
| Téléchargement | Autorisé, octets et hash identiques | NOT_VERIFIED_RUNTIME |
| Téléchargement | Anonyme/inter-tenant/non affecté | PARTIAL_CONTRACT |
| Historique | Révoqué/expiré/remplacé refusé par défaut | COMPLETE_CODE / NOT_VERIFIED_RUNTIME |
| Résilience | Échec liste distinct de l’état vide | FAIL — PROJ-DOC-006 |
| Résilience | Échec stockage sans faux succès | COMPLETE_CODE / NOT_VERIFIED_RUNTIME |
| UX | 390×844 × 3 thèmes | NOT_VERIFIED_RUNTIME |
| UX | 768×1024 × 3 thèmes | NOT_VERIFIED_RUNTIME |
| UX | 1440×900 × 3 thèmes | NOT_VERIFIED_RUNTIME |
| UX | 2560×1440 × 3 thèmes | NOT_VERIFIED_RUNTIME |

La matrice 12/12 ne peut pas être déclarée PASS sans captures, géométrie mesurée et runtime réel.

## Résultat après correction

| Domaine | Résultat QA |
|---|---|
| Projet affecté et administrateur organisation | PASS |
| Opérateur même organisation non affecté | PASS — refus 404 |
| Organisation étrangère | PASS — refus 404 |
| Projet désactivé | PASS — refus 404 |
| Projet archivé en lecture | PASS |
| Projet archivé en mutation | PASS — refus avant stockage |
| Dépôt privé et historique | PASS |
| Téléchargement et SHA-256 | PASS |
| Refus de téléchargement sans octets protégés | PASS |
| Erreur 503 et reprise | PASS |
| Chrome quatre viewports × trois thèmes | PASS 12/12 |
