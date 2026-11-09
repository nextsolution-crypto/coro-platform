# DISPLAY-02A-REVIEW — Sécurité spatiale

## Garanties vérifiées

- Organisation et bâtiment proviennent de la route authentifiée, jamais du corps.
- Les accès recherchent systématiquement `organizationId` et `buildingId`.
- Les FK composites interdisent les rattachements contradictoires même par SQL direct.
- Les codes sont uniques au bon niveau et les ordres comprennent un départage par identifiant.
- Les mutations sont sérialisées par verrou consultatif de bâtiment et protégées par `lockVersion`.
- Les audits et mutations partagent la même transaction.
- Les ressources archivées ne sont pas supprimées physiquement.

## Anomalie corrigée

Le contrôle mutable ne refusait que `ARCHIVED`. Une ressource `INACTIVE` pouvait encore recevoir un enfant ou être modifiée. Le garde exige maintenant `ACTIVE` pour un étage, une zone ou un emplacement mutable. Un test unitaire et un test PostgreSQL prouvent le refus sans écriture.

## Preuves négatives

- Bâtiment d'un autre tenant : 404 sans énumération.
- Étage/zone contradictoire : refus avant création.
- FK composite inter-tenant : insertion SQL refusée.
- Version obsolète : 409 sans audit de succès.
- Parent inactif ou archivé : 409 sans création enfant.

## Risque résiduel

La géométrie reste un objet JSON générique et non un contrat GeoJSON complet. Elle est bornée par la limite HTTP globale mais sa validation métier détaillée appartient à un lot spatial ultérieur.
