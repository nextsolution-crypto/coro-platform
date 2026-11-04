# Activation des comptes permanents de présentation

## Principe

Le QA Identity Lab démontre le comportement, mais ne sera jamais activé en production. Les comptes permanents utilisent exclusivement les parcours produit normaux : création gouvernée, invitation ou activation, choix du mot de passe, connexion et MFA livré à une adresse réelle.

## Comptes requis

| Profil | Autorité cible | Portée |
|---|---|---|
| Conseiller interne | `OPERATOR` | Projets synthétiques assignés du tenant CORO Démo |
| Responsable client | `CLIENT_CORPORATE` | Portée organisationnelle expressément autorisée |
| Gestionnaire de bâtiment | `CLIENT_MANAGER` | Bâtiment durable Tour Prémont existant uniquement; ne pas le rattacher à un client supprimé par le reset |

Le compte administrateur existant `demo@getcoro.io` peut assurer les étapes de révision ou de responsabilité d'action déjà permises. Aucun quatrième compte n'est créé tant qu'un scénario ne prouve pas sa nécessité.

## Données humaines requises en une fois

Mathieu doit fournir ou confirmer trois adresses ou alias **réellement livrables et distincts**, un pour chaque profil ci-dessus. Aucun alias dérivé de `demo@getcoro.io` n'est supposé fonctionner.

Pour chaque adresse, Mathieu devra :

1. ouvrir l'invitation ou suivre l'activation normale;
2. choisir le mot de passe sans le communiquer;
3. recevoir et saisir le MFA;
4. confirmer que la connexion aboutit;
5. laisser la session disponible pour la recette de périmètre.

## Contrôles avant DEMO_READY

- absence de collision avec un `User` ou `ClientUser` existant;
- rôle et portée exacts, sans `SUPER_ADMIN`, `SUPERVISE` ou `COMMAND` implicite;
- connexion et MFA réels pour les trois comptes;
- refus hors périmètre;
- reset des seules fixtures sans suppression des comptes permanents ni des données préexistantes;
- communications de démonstration toujours isolées après reset.
