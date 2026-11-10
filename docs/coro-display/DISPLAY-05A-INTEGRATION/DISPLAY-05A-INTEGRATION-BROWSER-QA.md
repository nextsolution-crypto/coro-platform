# DISPLAY-05A-INTEGRATION — Recette navigateur

## Verdict

**NOT_VERIFIED.** Le connecteur Computer Use a échoué lors de `list_apps()` avec `Computer Use native pipe is unavailable: ... fichier introuvable (os error 2)`. Aucun navigateur n'a été piloté et aucune capture n'est fournie.

## Parcours restant

Connexion/MFA, `/display`, tableau de bord, bâtiment, emplacements, bibliothèque, recherche/filtres, aperçu privé, brouillon, transition permise, transition refusée, historique, déconnexion et expiration de session. Rejouer en desktop, tablette et mobile avec une fixture privée synthétique.

## Couverture indépendante

Les mêmes autorités sont exercées par tests HTTP/PostgreSQL : authentification refusée, permissions, multitenant, transitions, stockage privé simulé, empreinte, suspension et révocation. Cela ne remplace pas la validation UX.

## Condition de reprise

Rétablir le service natif Windows du connecteur, puis utiliser exclusivement des comptes et documents synthétiques locaux. Ne pas utiliser de compte de production.
