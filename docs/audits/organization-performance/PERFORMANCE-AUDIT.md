# Audit ciblé — CORO Rendement

## Périmètre et références

- Branche isolée : `audit/organization-performance`
- Candidat audité : `98eedfdd4adcb3aa1f4614f17bf25a6d0beb525d`
- SHA produit correspondant : `c41e05b891cdcfcc23a1a64e27278ca942d417fe`
- Production applicative vérifiée : workflow `41372128690` réussi sur `c41e05b…`; workflow `41374364206` sur `98eedf…` réussi mais `build-images` et `production-release` ignorés.
- Routes : `/profile/rendement`, `/dashboard/rendement`, `/api/rendement/operational`, `/api/rendement/financial`.

## Méthode

1. Analyse statique des contrôleurs, DTO, services, schéma Prisma, pages et navigation.
2. Tests ciblés backend et frontend sur le candidat exact.
3. PostgreSQL 16 jetable avec deux organisations et identités synthétiques du QA Identity Lab.
4. API réelle, MFA local, réseau deny-by-default et fournisseurs factices.
5. Chrome réel, captures expurgées sous `D:\CORO-QA\tracking\organization-performance`.

## Résultats

- Backend : 16/16 tests ciblés PASS.
- Frontend : 9/9 tests Rendement PASS; TypeScript PASS.
- Migrations : 166 appliquées avec succès au PostgreSQL QA.
- API métier : 35/35 contrôles PASS sur cinq acteurs MFA synthétiques.
- Chrome : 12/12 configurations PASS (390, 768, 1440 et 2560 px × Classic, Glass Light et Glass Dark), sans débordement ni erreur console critique.
- Parcours complémentaires : F5, clavier, zoom 200 %, refus financier ADMIN, désactivation/réactivation et révocation de session PASS.
- Aucune modification produit, migration nouvelle, communication externe ou mutation production.

## Verdict

`AUDIT_COMPLETED_WITH_FINDINGS`

Le calcul nominal est déterministe, l’isolation inter-tenant et l’autorité financière sont fail-closed, et la matrice visuelle demandée est réussie. Le produit conserve actuellement dans les agrégats l’historique d’une identité désactivée; cette conservation est techniquement cohérente mais non explicitée dans l’interface. Les projets archivés, le filtre conseiller, la photographie `asOf`, le volume, le rechargement 503/réponses désordonnées, le lecteur d’écran réel et la lecture production restent non démontrés ou ambigus. Aucun correctif produit n’a été entrepris, conformément au mandat.

## Preuves

- API : `D:\CORO-QA\tracking\organization-performance\api\performance-api-acceptance.json`
- Identité inactive : `D:\CORO-QA\tracking\organization-performance\api\performance-inactive-acceptance.json`
- Chrome et captures : `D:\CORO-QA\tracking\organization-performance\browser\performance-browser-acceptance.json`
- Panne 503 et reprise : `D:\CORO-QA\tracking\organization-performance\browser\performance-browser-errors.json`
- Le checkpoint contenant les sessions reste hors des preuves et du dépôt, puis est supprimé à la fermeture du stack.
