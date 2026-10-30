# Constats Timelog — statut consolidé

| Constat | Gravité | Statut final | Preuve |
|---|---:|---|---|
| TIME-001 — validation serveur | Critique | CORRIGÉ / PASS | DTO, refus sans écriture, catégorie tenant, période ordonnée |
| TIME-002 — concurrence | Élevée | CORRIGÉ / PASS | update/delete obsolètes `409`, état inchangé |
| TIME-003 — erreurs UI | Élevée | CORRIGÉ / PASS | alertes, retry, saisie conservée, F5 |
| TIME-004 — date civile | Moyenne | CORRIGÉ / PASS | UTC civil exact et cas DST |
| TIME-005 — politique durées | Moyenne | PARTIEL / DÉCISION_PRODUIT_NON_BLOQUANTE | positif/fini; maximum/incrément/futur non inventés |
| TIME-006 — permissions | Élevée | PASS DYNAMIQUE | deux tenants, propriété, admin, conseiller, révoqué |

Le maximum quotidien, l'incrément de 0,25 h, la politique des dates futures et les chevauchements restent au suivi produit. Le modèle ne contient pas d'heures de début/fin permettant de définir un chevauchement.

Une tentative fournissant `userId` et `organizationId` dans le corps n'usurpe pas l'autorité : le serveur conserve l'acteur et le tenant du JWT. Un admin du même tenant ne peut modifier l'entrée personnelle d'un autre utilisateur; l'autre tenant est également refusé sans mutation.
