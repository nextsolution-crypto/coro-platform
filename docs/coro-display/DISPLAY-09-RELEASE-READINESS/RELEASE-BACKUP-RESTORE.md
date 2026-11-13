# Sauvegarde et restauration

Le diagnostic gouverné `43326095939` a retourné `REMOTE_VERIFIED`; l'inspection production confirme `backupReady=true`. Le workflow de release exige une sauvegarde fraîche, vérification distante du SHA/version et restauration isolée avant migration.

La preuve historique ne remplace pas la restauration du jour de release. Gate actuel : PASS pour readiness; condition d'exécution : nouvelle sauvegarde + restauration isolée terminale. Aucun dump ni donnée sensible n'a été copié localement pendant ce mandat.
