# Prévisualisations privées

Les aperçus sont récupérés par endpoint authentifié sous forme de blob. Le serveur revalide tenant, client, bâtiment, permissions, publication, source, période, révocation et empreinte.

Les réponses utilisent les en-têtes anti-cache, n'exposent ni URL publique durable ni clé de stockage. Une permission retirée ou un document devenu inadmissible bloque l'accès suivant. Aucun PDF client réel n'a été utilisé dans l'intégration.
