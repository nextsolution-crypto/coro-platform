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

Les identités QA utilisent le MFA capturé localement du QA Identity Lab, jamais en production. Le 4 novembre 2026, trois connexions normales ont été démontrées sur PostgreSQL/backend/frontends locaux : conseiller `OPERATOR` (10 projets assignés), responsable `CLIENT_CORPORATE` (portée organisationnelle canonique) et gestionnaire `CLIENT_MANAGER` (3 projets du seul bâtiment affecté). Les captures et le rapport sanité sont conservés sous `D:\CORO-QA\tracking\demo-coro`.

Les comptes permanents de présentation devront utiliser des adresses réellement livrables et le parcours normal de création, activation, mot de passe et MFA. Aucun alias de `demo@getcoro.io` n'est présumé livrable. Les permissions organisation/client/bâtiment/incident restent cumulatives; aucune permission n'est déduite d'un identifiant connu.

## État

QA multirôle : `PASS_LOCAL_QA`, y compris Chrome 12/12, F5, clavier et zoom 200 %. Environnement livré multirôle : `NOT_VERIFIED` jusqu'à fourniture d'adresses livrables et activation humaine normale. Aucun mécanisme MFA QA ne sera transféré en production.
