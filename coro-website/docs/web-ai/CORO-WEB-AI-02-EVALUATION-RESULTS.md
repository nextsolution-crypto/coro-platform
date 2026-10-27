# CORO WEB-AI-02 — Résultats d'évaluation

## Jeu documentaire

50 questions de référence : 25 FR-CA et 25 EN-CA. Elles couvrent présentation générale, plans, Knowledge/AI, opérations, REX, multisite, navigation, statuts commerciaux, prix et certification inconnue.

## Résultats

| Mesure | Cible | Résultat |
|---|---:|---:|
| Recall@5 des sources attendues | ≥ 95 % | 100 % |
| Citation canonique/version cohérente | 100 % | 100 % |
| Fuite privée observée | 0 | 0 |
| Cas FR/EN | 25/25 | 25/25 |
| Tests unitaires ciblés | PASS | 17/17 |
| Tests PostgreSQL ciblés | PASS | 4/4 |
| Médiane locale PostgreSQL | information | 4,86 ms |
| P95 local PostgreSQL | < 250 ms | 5,67 ms |

Les performances sont des mesures locales sur corpus initial et ne constituent pas une mesure de production. Aucun modèle génératif n'a été utilisé : l'évaluation couvre la récupération et la provenance, pas la qualité rédactionnelle future du WEB-AI-03.

## Régressions

La campagne backend élargie initiale a produit 2 212 tests réussis, 2 ignorés et 3 échecs : deux écarts WEB-AI-02 ont ensuite été corrigés et leurs suites ciblées rejouées avec succès; le troisième est le test OCR PNG historique, faute du binaire local `pdftoppm`. La suite complète n'a pas été rejouée après ces corrections ciblées. Le build backend et TypeScript passent. L'audit de production conserve 10 avis historiques (1 modéré, 8 élevés, 1 critique); aucun correctif automatique n'a été appliqué dans ce lot.
