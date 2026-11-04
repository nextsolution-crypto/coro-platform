# Identités et permissions Démo

## Référence

`demo@getcoro.io` demeure inchangé : aucun changement de mot de passe, MFA, rôle ou identité. Il reste `ADMIN` du seul tenant CORO Démo et ne reçoit pas `SUPER_ADMIN`.

## Profils nécessaires

- Conseiller interne. Une identité synthétique non routable est provisionnée pour les calculs et la QA locale; son accès est désactivé au reset.
- Réviseur indépendant.
- Responsable client `CLIENT_CORPORATE`.
- Gestionnaire `CLIENT_MANAGER` limité à ses bâtiments.
- Responsable d'action.
- Acteur volontairement hors périmètre.

Les identités QA utilisent le MFA capturé localement du QA Identity Lab, jamais en production. Les comptes permanents de présentation devront utiliser des adresses réellement livrables et le parcours normal d'activation/MFA. Les permissions organisation/client/bâtiment/incident restent cumulatives; aucune permission n'est déduite d'un identifiant connu.

## État

QA multirôle : en préparation avec le QA Identity Lab. Production multirôle : `NOT_VERIFIED` jusqu'à fourniture d'adresses livrables et activation humaine normale. Aucun mécanisme MFA QA ne sera transféré en production.
