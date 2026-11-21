# Enrôlement

L’activation utilise un code temporaire haché, borné en tentatives, expirant et consommé atomiquement. Les portées organisation, bâtiment et emplacement sont vérifiées avant création de session.

Avant activation, aucun contenu privé n’est retourné. La révocation invalide la session et exige une nouvelle activation gouvernée.
