# R2-08 — Pilote de migration synthétique

Le pilote est un test PostgreSQL isolé. Il ne contient aucune donnée client et ne contacte aucun fournisseur externe.

## Jeu représentatif

- 37 lignes JSON synthétiques couvrant 2021 à 2026;
- 36 identités historiques uniques et un doublon intentionnel;
- identifiants, titres, catégories et dates entièrement fictifs;
- source déclarée `REPORTPERFECT`, sans revendication de parité exacte.

## Parcours vérifié

1. staging privé immuable;
2. analyse antivirus simulée propre et contrôle SHA-256;
3. mapping typé et prévisualisation sans conflit;
4. import initial de sept lignes;
5. interruption volontaire et lecture de l’état persisté;
6. reprise en lots de huit lignes;
7. détection du doublon sans deuxième archive;
8. réconciliation de 36 archives actives;
9. confirmation `nativeCoroApproval=false` pour chaque archive;
10. rollback borné aux 36 archives du run, sans suppression de preuve.

Le test exécutable est `coro-backend/test/incident-report-r2-pilot.postgres-spec.ts`.

La parité Reportperfect demeure `NOT VERIFIED` jusqu’à l’obtention d’un export client représentatif et autorisé.

