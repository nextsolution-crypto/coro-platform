# SP-OPS-01 — Rapport d'audit opérationnel

Date d'exécution : 2026-11-05

Baseline : `f071982edadcc6fba31d8663ab43d072cc20cc12`

Branche isolée : `audit/sentinelle-population-sp-ops-01`

## Résultat

| Capacité | Statut | Preuve ou limite |
|---|---|---|
| Source canonique ProjectFile | Présente, renforcée | admissibilité contrôlée à l'usage : partagée, validée, approuvée, non révoquée, non expirée, non remplacée |
| Synthèse critique | Présente | source/version, hypothèses, limites, seuil, météo, durées, distances et zones visibles |
| Distinction des zones | Corrigée | `MODELED_IMPACT` ne cible plus implicitement des destinataires; libellés UX explicites |
| Secteurs directionnels | Corrigée | le gel du roster réapplique maintenant le secteur confirmé lors de l'aperçu |
| Approbation humaine | Présente | approbation distincte; double contrôle disponible |
| Simulation | Présente | mode SANDBOX et suppression des destinataires synthétiques en LIVE |
| Preuves et REX | Présents | événements, livraisons, statuts et rapports de preuve existants |
| Établissements sensibles | Partiel | modèle `RueSurroundingAsset` présent, mais aucune intégration démontrée au ciblage Population |
| Démographie exhaustive | Absente | seuls les abonnés CORO actifs et géolocalisés sont ciblés; aucune estimation ne doit être présentée comme population réellement joignable |
| Recette HTTP/PostgreSQL/Chrome du candidat | NOT_VERIFIED | le stack complet n'a pas été finalisé dans cette exécution; aucune preuve d'exploitation industrielle n'est revendiquée |

## Défauts reproduits et corrigés

1. Une zone `MODELED_IMPACT` validée participait au ciblage. Elle est désormais exclue des zones opérationnelles.
2. Un aperçu directionnel pouvait annoncer un sous-ensemble alors que le gel reprenait le rayon complet. Le gel réutilise maintenant le snapshot directionnel confirmé.
3. Une source devenue expirée, révoquée ou remplacée après son rattachement pouvait rester implicitement admissible. Son état courant est désormais revérifié.
4. Une alerte LIVE pouvait conserver une base scientifique ou des zones devenues obsolètes après l'aperçu. Le preflight et le gel échouent maintenant fermés avec des motifs explicites.

## Conclusion

La chaîne de préparation est plus sûre et défendable, mais l'exploitation industrielle demeure **NO-GO** tant que le ciblage des établissements sensibles et la recette intégrée complète ne sont pas démontrés.
