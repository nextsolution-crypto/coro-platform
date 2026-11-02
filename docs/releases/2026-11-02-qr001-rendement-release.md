# Manifeste de release — QR-001 et Rendement

Date : 2 novembre 2026

## Candidat immuable

- SHA actif : `205eb1283b7de71a338e36647ecb5c91b6ed0784`.
- Production précédente : `c41e05b891cdcfcc23a1a64e27278ca942d417fe`.
- QR-001 : PR #164, merge `a5cc1ddcc163b39b99ee6a8cf9f5864a29b130f4`.
- Rendement : PR #165, merge `600b1a4134ada3b3c9dd15b7333876f6e511fcdd`.
- Documentation QR : PR #166, merge `205eb1283b7de71a338e36647ecb5c91b6ed0784`.
- Élément supplémentaire identifié : PR #163, dix lignes de documentation de réconciliation de la release précédente, sans code ni artefact runtime, déjà fusionnée par le propriétaire du dépôt.

## Images actives

- Backend : `sha256:943f162317a14ed88c55d99d6b6d3702010783cf70b64908c9687e1923b93e49`.
- Frontend : `sha256:ad667b89547616efab3f5e36fe553db2c352c1f7800606a3ddae794a55a238c2`.
- Website : `sha256:64fa1310f0680a27dd104747365670e28039d663c368c9a76674889ba5434ded`.
- Portail client : `sha256:bd3779d84027fd73488909ed6f57e179079261538891f9808c72cc5a9d92ac26`.

## Gates et données

- Release : run `41533537344`, **SUCCESS**.
- Réconciliation immuable : run `41535693393`, **SUCCESS**.
- Inspection post-release : run `41535829755`, **GO**.
- Capacité post-release : run `41535834393`, **HEALTHY**; 38 222 364 672 octets libres, sauvegarde et release prêtes.
- Sauvegarde : `production-20261102T221218Z-3aa3b2fe7fea`, `REMOTE_VERIFIED`, SHA-256 `c9251e82f5a007a19fa80d0fe2e78672aec42fc543d2e41a09e8d3d321920889`.
- Restauration : `20261102T221239Z-6a64532c9e57`, `RESTORE_VERIFIED`.
- Rollback : quatre images précédentes disponibles; la migration QR additive n'est pas supprimée par un rollback applicatif.
- PostgreSQL : 167 migrations, tête `20261120010000_permanent_qr_codes`, application unique, aucun échec.

## Vérifications fonctionnelles

- QR public : 307 exact vers `https://getcoro.io/contact`, sans cache applicatif ou Cloudflare; destination 200; slug inconnu 404.
- Fichiers publics : SVG `eeac299775a079a6d23a188fcca2643bf9cfa21ab37f34821a1c22cb7bc885ac`; PNG `ddc1e0997183eff6f96642cec81319589399769f062e49881345a3e30b6ea25f`.
- Administration QR : session autorisée, statut actif, destination exacte, F5 réussi; anonyme refusé.
- Rendement : session autorisée et F5 réussi. Aucun projet archivé visible dans ce compte de production; le contrôle visuel d'une fiche archivée est `NOT_VERIFIED`, tandis que les protections API/PostgreSQL sont **PASS**.

## Réserves maintenues

- Téléphone physique : `NOT_VERIFIED`.
- Impression réelle : `NOT_VERIFIED`.
- Libellé `asOf` : décision ouverte, calcul inchangé.
- Libellé conseiller : décision ouverte, calcul inchangé.
- Aucune panne, désactivation QR ou mutation d'un projet réel n'a été provoquée.
