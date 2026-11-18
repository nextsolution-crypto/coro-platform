# CORO-RP-CLIENT-01C — Rapport QA et préparation de livraison

## Périmètre livré

- 42 opérations de portail client réparties entre CORO Report, main courante,
  quarts et relèves, directives et suivis.
- Contrôleurs dédiés protégés par `ClientJwtGuard`; les contrôleurs internes
  demeurent séparés.
- Contexte d'acteur `CLIENT_USER` construit côté serveur et transmis aux
  services métier partagés. Aucun identifiant d'acteur fourni par le navigateur
  n'est accepté.
- Provenance typée des quarts, participants, relèves et transitions, sans
  création d'un `User` de substitution.
- Organisation active, permission opérationnelle active et affectation
  temporelle active au bâtiment exigées avant tout accès.
- Aucun changement Prisma et aucune migration dans ce lot.

## Résultats locaux

| Contrôle | Résultat | Preuve |
| --- | --- | --- |
| Build backend | PASS | `npm run build` |
| Tests ciblés CLIENT-01C | PASS | 6 suites, 32 tests |
| Suite backend | PASS avec dépendance locale manquante | 341 suites et 2 966 tests PASS; seul le test OCR réel échoue car `pdftoppm` est absent du poste Windows |
| PostgreSQL réel | PASS avec dépendance locale manquante | PostgreSQL 16 local isolé, 196 migrations appliquées; 82 suites et 436 tests PASS; 6 tests Knowledge échouent uniquement car le runtime Poppler local est absent |
| Build/CI Linux attendu | À confirmer par GitHub | Le workflow installe explicitement `poppler-utils` avant les suites backend et PostgreSQL |
| Diff Prisma/migrations | PASS | Aucun fichier de schéma ou de migration modifié |

## Sécurité vérifiée

- Refus structurel des jetons internes sur les routes portail par séparation des
  guards et des contrôleurs.
- Aucune autorité implicite liée au rôle `CLIENT_MANAGER` ou
  `CLIENT_CORPORATE`.
- Isolation organisation/bâtiment conservée dans les services d'accès
  existants.
- Les identités entrantes d'une relève sont validées dans le tenant et sur le
  bâtiment avant persistance.
- Les décisions de relève sont limitées à l'identité entrante désignée; le
  sortant ne peut pas accepter sa propre relève.
- Téléchargements privés servis avec `Cache-Control: no-store` et
  `X-Content-Type-Options: nosniff`.
- Journalisation et provenance `USER` / `CLIENT_USER` conservées dans les
  transactions métier.

## Activation et rollback

Les cinq flags restent désactivés par défaut et ne sont pas modifiés par ce lot :

- `INCIDENT_REPORTS_ENABLED=false`
- `OPERATIONAL_LOG_ENABLED=false`
- `OPERATIONAL_SHIFTS_ENABLED=false`
- `OPERATIONAL_DIRECTIVES_ENABLED=false`
- `OPERATIONAL_FOLLOWUPS_ENABLED=false`

Le rollback applicatif consiste à revenir au SHA précédent. Aucun rollback de
schéma n'est requis. Aucun droit client ne doit être attribué avant un lot
d'activation distinct et une recette authentifiée multirôle.

## Réserves avant livraison ou activation

1. La CI GitHub doit confirmer les suites complètes avec Poppler disponible.
2. La recette navigateur authentifiée ClientUser demeure hors de cette PR et
   doit être exécutée avant toute activation commerciale.
3. La PR ne doit être ni fusionnée ni déployée sans autorisation distincte.

## Verdict

`GO WITH RESTRICTIONS` pour la revue de PR : code et tests ciblés prêts, sous
réserve de la CI terminale GitHub. `NO-GO` pour toute activation commerciale.
