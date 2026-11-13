# Gate 1A — enregistrement DemoFixtureRecord

La PR #270, HEAD `a94097ed`, prépare une opération gouvernée qui :

- verrouille l'organisation et l'empreinte du bâtiment canonique;
- refuse les collisions de clé ou d'entité;
- modifie uniquement `DemoFixtureRecord` dans une transaction `SERIALIZABLE`;
- inscrit la décision propriétaire et l'identifiant d'exécution dans la baseline;
- est idempotente et possède une opération de retrait strictement ciblée;
- prend le verrou commun de production et exige une sauvegarde réussie;
- préserve client, bâtiment, PMU/PCA, documents, personnes, permissions et autres données métier.

Tests ciblés : 9/9 PASS. CI PR #270, run `43424120751` : PASS; images et release SKIPPED.

**Mutation effectuée : NON. État : READY_FOR_CONTROLLED_REGISTRATION_AFTER_PR_MERGE.**
