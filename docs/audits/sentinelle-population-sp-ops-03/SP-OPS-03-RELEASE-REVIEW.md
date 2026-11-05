# SP-OPS-03 — Revue de livraison SP-OPS-02

Date de revue : 2026-11-05

## Candidat

- PR : #208
- HEAD vérifié : `8779e3c4e0e10f0d920c09102b934d2c79a3dab3`
- Base vérifiée : `f071982edadcc6fba31d8663ab43d072cc20cc12`
- État GitHub : OPEN, MERGEABLE, CLEAN.
- Migration additive : `20261126010000_population_sensitive_asset_targeting`.

## Contrôles terminaux

Les contrôles Backend security, Client Portal, les quatre typechecks, backend-tests et client-portal-build sont SUCCESS sur le HEAD exact. Les jobs build-images et production-release sont SKIPPED comme attendu pour une PR non autorisée à livrer.

Le diff ajoute la gouvernance scientifique et le ciblage des actifs sensibles, sans modifier la priorité des états PAUSED/BLOCK ni autoriser un fournisseur réel. Les communications Population du tenant Démo demeurent simulées par défaut.

## Preuves d'exploitation disponibles

La dernière release réconciliée de `main`, workflow `42086994797`, a réussi sur `f071982edadcc6fba31d8663ab43d072cc20cc12`. L'inspection lecture seule `42089695469` est SUCCESS. La maintenance capacité `42048117584` est SUCCESS. La release précédente a terminé sa réconciliation, la rotation gouvernée et conservait `31 219 666 944` octets libres après release.

Ces preuves démontrent le fonctionnement récent du processus, mais ne sont pas des gates calculés sur #208. Les images, digests, capacité exacte, sauvegarde/restauration et autorité de rollback devront être recalculés sur le SHA fusionné.

## Rollback

La migration est additive. Un ancien backend pourrait néanmoins réintroduire les défauts de gouvernance corrigés; la simple disponibilité de ses images ne suffit donc pas à le déclarer sûr. Le manifeste de rollback devra qualifier simultanément schéma, code, protections scientifiques et ciblage institutionnel.

## Verdict

- Fusion de #208 : **GO**, sous autorisation explicite de Mathieu.
- Déploiement immédiat : **NO-GO tant que les gates du candidat fusionné ne sont pas exécutés**.
- Fusion/déploiement exécutés pendant SP-OPS-03 : **NON**.
