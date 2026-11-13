# Runbook opérationnel

Ordre obligatoire :

1. Autoriser et exécuter Lot A; rollback immédiat sur échec TLS/routage/SNI.
2. Autoriser Lot B; gates frais, release unique, onze migrations, inspection et réconciliation.
3. Exécuter Gate 1B READ ONLY; arrêter si autre chose que PASS.
4. Autoriser Lot C; créer l'emplacement Tour Prémont, publier V1, activer Player sur iPad, publier V2, vérifier synchronisation puis révocation.
5. Clôturer avec SHA, digests, migrations, URL masquée, preuves iPad et limites.

Chaque lot possède son propre STOP et ne transmet pas automatiquement l'autorisation au lot suivant.
