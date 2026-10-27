# CORO WEB-AI-03 — Acceptation locale finale

## Périmètre

WEB-AI-03A à WEB-AI-03D sont implémentés et vérifiés localement sur la branche isolée `feature/web-ai-03-intelligent-assistant`, depuis `origin/main` `4caf244ef660fccb785888124bef32090fb87cf9`.

## Résultat

| Lot | Statut | Preuve principale |
|---|---|---|
| 03A orchestrateur | PASS | 38 tests backend ciblés, PostgreSQL 16 et 38 sources publiques |
| 03B widget | PASS | 4/4 cas Chrome FR/EN desktop/mobile |
| 03C sécurité | PASS_WITH_RESERVATIONS | injection, citations, isolation, pannes et absence de persistance |
| 03D fournisseur | DECISION_PREPARED | étude Bedrock sans invocation réelle |

## Changements majeurs

- API publique versionnée et fermée par défaut.
- Orchestrateur déterministe fondé sur Public Knowledge.
- Sessions éphémères bornées et citations vérifiées côté serveur.
- Widget bilingue accessible, responsive et indépendant en mode dégradé.
- Fournisseur simulé seulement; le fournisseur réel échoue avant tout traitement.
- Harnais navigateur reproductible sous `qa/web-ai-03/`.

## Réserves

- Fournisseur réel, coût réel et compatibilité Alpine/IAM Roles Anywhere non validés.
- Identité SQL de production en lecture seule et charge production non validées.
- Lecteur d'écran réel et matrice complète de thèmes non exécutés.
- Dette historique `html[lang]` sur les pages anglaises.
- Un test backend global non relié au lot dépend de `pdftoppm`, absent localement.

## Gouvernance

Aucune fusion, PR, publication, activation publique ou mutation de production. Les flags restent désactivés par défaut. L'activation exige une validation humaine et une autorisation de livraison contrôlée.
