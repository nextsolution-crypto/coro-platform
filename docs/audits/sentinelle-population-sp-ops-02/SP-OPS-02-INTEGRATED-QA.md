# SP-OPS-02 — Recette intégrée

## Environnement

- PostgreSQL réel isolé;
- backend/API et portail construits depuis le worktree;
- stockage privé QA;
- adaptateur fournisseur simulé et réseau sortant bloqué;
- identités synthétiques avec MFA locale normale;
- preuves hors dépôt sous `D:\CORO-QA\tracking\sentinelle-population\`.

## Parcours exécuté

Les étapes aperçu, exclusion de l’empreinte modélisée, qualification des établissements, création, snapshots, passage READY, refus d’auto-approbation, approbation indépendante, gel concurrent idempotent, simulation, journal, clôture, preuve, manifeste et rapport ont toutes répondu avec le résultat attendu.

Le rapport a d’abord révélé un défaut produit : la clé `population-evidence/...` n’était pas admise par le stockage privé tenant-scoped. Les nouveaux rapports utilisent maintenant `tenant-<organizationId>/population-evidence/...`; les anciennes références restent lisibles.

## Migration

- création depuis zéro : 173 migrations, aucune migration en attente;
- upgrade synthétique depuis la tête précédente : PASS;
- données avant upgrade préservées : 1 alerte et 3 livraisons;
- nouvelle table disponible sans attribution rétroactive de cible institutionnelle.

## Chrome

| Viewports | Variantes | Résultat |
|---|---|---|
| 390×844, 768×1024, 1440×900, 2560×1440 | Classic clair, sombre et préférence système sombre | **12/12 PASS** |

Aucun débordement, aucun contrôle hors écran, aucune erreur JavaScript et aucun HTTP 5xx. Les 403 Incident observés correspondent à l’absence volontaire de `INCIDENT_READ`; le 404 de preuve correspond à un ancien événement sans preuve. Ils sont conservés séparément des erreurs critiques. La route Population est explicitement `shell: none`; Glass Light/Dark sont donc **NOT_APPLICABLE**, et non présentés comme testés.

## Tests

- Population ciblé : 26 suites, 600/600 PASS;
- rapport de preuve : 5/5 PASS;
- portail : skin 13/13, autorité 5/5, partage 7/7, contrats identité/profil PASS;
- builds backend et portail : PASS;
- suite backend globale : 270 suites PASS, 3 SKIP, 2 suites en échec environnemental; 2 489 tests PASS, 5 SKIP, 7 FAIL;
- réexécution hors bac à sable : 34/35 PASS; seul le test OCR PNG reste bloqué par `pdftoppm` absent;
- les trois anciens timeouts de rendu sous contention ne se reproduisent pas.

## Verdict

**GO — simulation PostgreSQL/API/Chrome intégrée.** Lecteur d’écran réel : **NOT_VERIFIED**.
