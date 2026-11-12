# Sauvegarde et restauration

Le diagnostic lecture seule `43326095939` est PASS et confirme `REMOTE_VERIFIED`. La release actuellement active `42713333391` a execute avec succes le gate fail-closed qui exige : sauvegarde distante versionnee, SHA correspondant, telechargement de la version exacte et restauration sur environnement isole avant migration/rollout.

Au moment de la phase B, le workflow doit obligatoirement :

1. verifier la sante de l'automatisation de sauvegarde;
2. produire un nouveau checkpoint distant versionne;
3. comparer le SHA local/distant;
4. restaurer cette version sur la base de verification isolee;
5. verifier l'integrite et enregistrer le rapport;
6. seulement ensuite appliquer les 11 migrations.

L'operateur de release gouverne est responsable. Declenchement du rollback : echec de migration, sante service, smoke test, multitenant ou reconciliation. Une preuve historique ne remplace pas la nouvelle restauration du candidat.
