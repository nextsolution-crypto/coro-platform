# Acceptation — administration des autorisations Incident

## Candidat

- Branche : `fix/incident-authorization-administration`.
- Baseline : `f0f2442871e4301d94e98fdfe451c6e2117ab71e`.
- Commit produit testé : `9ba80c73`.
- HEAD de PR : renseigné après le commit de preuves.
- Stack : PostgreSQL 16, backend et frontend réels; données et acteurs exclusivement synthétiques.

## Résultats

| Contrôle | Résultat |
|---|---|
| TypeScript/build backend | PASS |
| TypeScript/build frontend | PASS |
| Services Clients et autorisations Incident | 25/25 PASS |
| Régressions portail/gouvernance Incident | 23/23 PASS |
| Contrat frontend Incident | 3/3 PASS |
| Migration depuis zéro (168 migrations) | PASS |
| Upgrade depuis la tête parente avec affectation historique | PASS |
| API/PostgreSQL réels | PASS, 14/14 |
| Chrome, 4 viewports × 3 thèmes | PASS, 12/12 |
| F5, zoom 200 %, focus clavier | PASS |
| 503 déterministe, erreur visible et reprise | PASS |
| Console hors panne injectée | PASS, aucune erreur critique |
| Lecteur d'écran réel | NOT_VERIFIED : aucune restitution vocale fiable disponible |

## Preuves

- `D:\CORO-QA\tracking\organization-incident-authorizations\api-acceptance.json`;
- `D:\CORO-QA\tracking\organization-incident-authorizations\migration-upgrade.json`;
- `D:\CORO-QA\tracking\organization-incident-authorizations\browser\browser-acceptance.json`;
- 12 captures réelles dans le même dossier `browser`.

## Invariants démontrés

- permission individuelle seule : refus fail-closed;
- affectation seule : refus;
- permission et affectation active compatibles : lecture autorisée;
- attribution atomique, rejeu idempotent et révocation optimiste;
- révocation effective sur la requête suivante avec la session existante;
- ClientUser désactivé refusé côté serveur;
- autre organisation et autre bâtiment refusés sans écriture;
- trois événements d'audit exacts : permission, attribution, révocation;
- un ClientUser ne peut pas déléguer;
- les lectures active, historique et détail appliquent la double garde;
- le panneau n'expose aucune affectation d'un autre client.

## Limites

- Les dates futures d'effet et d'expiration ne sont pas prises en charge; l'interface l'indique explicitement.
- Aucun fournisseur, alarme, communication externe ou compte de production n'a été utilisé.
- La restitution par lecteur d'écran réel reste `NOT_VERIFIED`.

## Réconciliation de migration avant intégration

- Ancien identifiant local jamais partagé : `20261103020000_incident_authority_idempotency`.
- Tête de production vérifiée : `20261120010000_permanent_qr_codes` (167 migrations).
- Identifiant final : `20261121010000_incident_authority_idempotency`.
- Création depuis zéro : PASS, 168 migrations dans l'ordre attendu.
- Upgrade depuis la tête de production : PASS avec affectation historique conservée et aucune permission individuelle attribuée implicitement.
- Preuve : `D:\CORO-QA\tracking\organization-incident-authorizations\migration-upgrade-20261121010000.json`.

## Verdict

`ACCEPTATION_INTÉGRÉE_PASS — PR_READY`, sous réserve de la CI terminale du HEAD publié.
