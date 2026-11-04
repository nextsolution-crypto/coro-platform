# Identités et permissions Démo

## Référence

`demo@getcoro.io` demeure inchangé : aucun changement de mot de passe, MFA, rôle ou identité. Il reste `ADMIN` du seul tenant CORO Démo et ne reçoit pas `SUPER_ADMIN`.

## Profils à créer uniquement si requis par un scénario

- Conseiller interne.
- Réviseur indépendant.
- Responsable client `CLIENT_CORPORATE`.
- Gestionnaire `CLIENT_MANAGER` limité à ses bâtiments.
- Responsable d'action.
- Acteur volontairement hors périmètre.

Chaque identité doit avoir un usage démontré, un domaine non routable, une authentification normale et aucun privilège plateforme. Les permissions organisation/client/bâtiment/incident restent cumulatives; aucune permission n'est déduite d'un identifiant connu.

## État

La création des identités secondaires est `NOT_VERIFIED`. Le mécanisme MFA Démo doit être utilisable sans courriel réel et sans porte dérobée avant leur provisionnement.
