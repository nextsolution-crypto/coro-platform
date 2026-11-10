# DISPLAY-05A-REVIEW — Recette navigateur

## État

**BLOCKED / NOT_VERIFIED.** L'outil de contrôle Windows a échoué avant toute interaction : `Computer Use native pipe is unavailable: ... fichier introuvable (os error 2)`. Aucune capture ni réussite visuelle n'est revendiquée.

## Contrôles de remplacement réellement exécutés

Une instance isolée a servi le frontend sur `127.0.0.1:3300` et l'API sur `127.0.0.1:3302`. Une identité synthétique a effectué connexion et MFA locale. L'API a retourné une organisation, quatre droits Display, un bâtiment affecté, un plan et une source admissible. L'accès sans session a retourné `401`; une revue interdite a retourné `403`, sans changement de compteur ni de verrou.

## Scénarios restant à exécuter

Connexion, `/display`, tableau de bord, arbre spatial, bibliothèque, recherche/filtres, détail, aperçu privé réel, création d'un brouillon, transition permise, refus visuel, historique, déconnexion et session expirée. Rejouer sur bureau, tablette et mobile avec stockage privé QA local.

## Risque

Les garanties serveur sont démontrées, mais l'acceptation UX ne peut être conclue sans ce passage.
