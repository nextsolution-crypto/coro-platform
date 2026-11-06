# SP-OPS-04B — Rapport QA webhook SMS

## Candidat local

- Branche : `fix/sentinelle-population-sp-ops-04b-webhook`
- Base : `c40c92422bca989e62ad814d4cb67824dc9749b3`
- Fournisseur réel contacté : non
- Payloads : synthétiques uniquement

## Résultats exécutés

| Contrôle | Résultat |
|---|---|
| Tests et régressions Population ciblés | PASS — 372/372 |
| PostgreSQL réel ciblé | PASS — 12/12 |
| Migration depuis zéro | PASS — 174 migrations |
| TypeScript `--noEmit` | PASS |
| Build Nest | PASS |
| ESLint ciblé | PASS |
| `git diff --check` | PASS |
| `npm audit --omit=dev` | PASS — 0 vulnérabilité |
| Suite backend complète | PARTIAL — 2527 PASS, 5 SKIP, 1 échec d'environnement |

L'unique échec de la suite complète est
`knowledge/office-extractor.spec.ts`, causé par l'absence locale de l'exécutable
`pdftoppm` (`spawnSync pdftoppm ENOENT`). Il est indépendant du webhook SMS et
sera départagé par la CI du dépôt, qui constitue le gate terminal.

## Scénarios démontrés

- Accepted → Sent → Delivered.
- Delivered reçu avant Sent, sans régression.
- Hard bounce, Rejected, Blacklisted et Skip comme échecs permanents.
- Soft bounce comme résultat temporairement non confirmé.
- Doublon acquitté sans seconde mutation.
- Identifiant inconnu sans mutation.
- Identifiant ambigu sans mutation.
- Secret invalide refusé avant traitement.
- Événement reconnu mais malformé refusé.
- Événement inconnu acquitté sans faux statut de livraison.
- Réponse, HELP, STOP, subscribe et unsubscribe préservés.
- Livraison annulée ou supprimée non rouverte.
- Webhooks concurrents et désordonnés sérialisés sous PostgreSQL.
- Webhook précoce corrélé par tag avant persistance du `messageId`.
- Retour fournisseur acceptant un état déjà réconcilié sans faux échec.

## Limites

- Aucun webhook Brevo réel n'a été reçu dans ce chantier.
- Aucun SMS n'a été envoyé.
- La preuve finale de non-régression complète dépend de la CI terminale de la PR.
