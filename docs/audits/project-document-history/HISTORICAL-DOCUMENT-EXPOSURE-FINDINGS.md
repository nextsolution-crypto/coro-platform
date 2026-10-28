# Constats — exposition historique des documents

## Totaux réconciliés disponibles

| Mesure | Résultat actuel |
|---|---:|
| Références PDF officielles analysées | 4 |
| Objets uniques PDF officiels | 4 |
| Références privées canoniques | 4 |
| Références HTTPS historiques | 0 |
| Expositions confirmées | 0 |
| Accès privés vérifiés | 4 |
| Objets absents ou cassés | 0 |
| Références invalides | 0 |
| Cas non vérifiables | 0 |
| Références ProjectFile élargies | NOT_VERIFIED |
| Objets ProjectFile uniques | NOT_VERIFIED |
| Objets orphelins / copies non référencées | OUT_OF_SCOPE |

## Constats

### HDOC-001 — Couverture ProjectFile incomplète

**Statut :** `NOT_VERIFIED`

Les quatre références officielles ne représentent pas tous les fichiers projet, versions et historiques. L'outil élargi est développé et testé, mais n'a pas encore l'autorité d'être exécuté depuis `main` en production.

### HDOC-002 — PDF officiels historiques

**Statut :** `PRIVATE_ACCESS_VERIFIED`

Le workflow `40691755682` confirme quatre objets canoniques privés et aucune URL historique ou exposition anonyme. Cette conclusion est limitée aux références inventoriées.

### HDOC-003 — Objets orphelins

**Statut :** `OUT_OF_SCOPE`

Aucun scan intégral du bucket n'est justifié. L'audit ne peut donc pas conclure sur des copies dépourvues de référence persistée.

### HDOC-004 — Mutation

**Statut :** `PASS`

Aucune ACL, référence, donnée, objet, cache, migration, capacité, image ou configuration de production n'a été modifié. Aucun contenu documentaire n'a été téléchargé ou publié.

## Limite actionnable

**LIMITATION** : inventaire agrégé réel de tous les `ProjectFile` non exécuté.

**IMPACT** : la confidentialité globale des anciens objets ne peut pas être affirmée.

**CONDITION DE LEVÉE** : revue/fusion du workflow, exécution gouvernée, compteurs réconciliés et zéro `PUBLIC_EXPOSURE_CONFIRMED`.

**RESPONSABLE** : autorité de revue GitHub puis opérateur du workflow de production.

**STATUT** : bloquant uniquement pour lever la réserve historique globale; sans impact sur la correction applicative PR #103 déjà livrée.
