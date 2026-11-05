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

## Mise à jour après clôture de SP-OPS-02

- PR #208 fusionnée le 2026-11-05.
- SHA fusionné, déployé et inspecté : `c255fd6650ae38465f2f28c1e240035287a9e3c9`.
- CI `42118246809` : SUCCESS.
- release gouvernée `42119192234` : SUCCESS et réconciliation réussie.
- inspection lecture seule `42121475894` : PASS / GO.
- migration active : `20261126010000_population_sensitive_asset_targeting`.
- sauvegarde distante et restauration : vérifiées; quatre images de rollback disponibles.
- SP-OPS-03 n'était pas inclus dans cette release.

La branche SP-OPS-03 a ensuite été réconciliée avec cette baseline de production. Cette mise à jour documentaire ne vaut pas autorisation de fusion, de déploiement ou d'envoi réel pour SP-OPS-03.
