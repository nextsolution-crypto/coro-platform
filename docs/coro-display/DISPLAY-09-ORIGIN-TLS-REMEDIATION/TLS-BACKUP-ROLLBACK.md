# Sauvegarde et rollback

Avant phase B : archiver avec permissions root la configuration active, les références de certificat (pas de copie inutile des clés), le résultat de validation et les empreintes. Installer le nouveau vhost comme fichier séparé.

Rollback : désactiver uniquement le vhost Display, restaurer la configuration référencée, valider la syntaxe, recharger le terminateur, puis vérifier les quatre services existants. Aucun rollback applicatif ou PostgreSQL n'est requis.
