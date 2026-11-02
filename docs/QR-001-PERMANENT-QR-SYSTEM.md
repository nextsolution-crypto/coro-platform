# CORO — QR-001 — Système autonome de codes QR permanents

## Verdict de qualification

`READY_FOR_PRODUCTION_REVIEW`

Le lot est qualifié sur une branche et un worktree dédiés. Il est prêt pour la revue de production, mais il n'est ni fusionné, ni déployé, ni activé en production. Aucune base propriétaire et aucune destination publique existante n'ont été modifiées.

## Baseline et isolation

- Branche : `feature/qr-001-production-review`.
- Baseline : `origin/main` au début de la qualification, `98eedfdd4adcb3aa1f4614f17bf25a6d0beb525d`.
- Worktree : `.worktrees/qr-001-production-review`.
- L'arbre principal sale et les travaux Rendement ont été laissés intacts.
- Portée du registre : **globale à la plateforme**, jamais implicite par organisation.

## Migration et provisionnement

La migration QR locale portait initialement l'identifiant `20261103010000`. Cet identifiant appartient déjà, sur la tête réelle, à `network_typed_customer_actor_provenance`. La migration QR n'existait ni dans l'historique Git publié ni dans les migrations appliquées inspectées; elle a donc reçu avant publication l'identifiant inédit `20261120010000_permanent_qr_codes`. Une migration déjà appliquée ne doit jamais être renommée.

La migration est additive : elle crée l'enum `QrCodeStatus`, les tables `QrCode` et `QrCodeChange`, leurs index et clés étrangères, puis provisionne de façon idempotente :

- slug : `contact`;
- URL permanente : `/qr/contact`;
- destination initiale : `https://getcoro.io/contact`;
- statut : `ACTIVE`;
- version de configuration : `1`.

Preuves PostgreSQL 16 isolées :

- création depuis zéro : **PASS**, 167 migrations appliquées;
- upgrade depuis la véritable tête antérieure : **PASS**, 166 migrations existantes, données sentinelles préexistantes préservées, puis migration QR;
- base de recette : `qr001_fresh_v2` sur le conteneur local isolé `coro-qr001-postgres`, port 5597;
- base propriétaire : lecture seule seulement, aucune mutation QR de qualification.

## Autorité backend et administration

Le module `coro-backend/src/qr-codes/` fournit la résolution publique, la création, la modification de destination, l'activation/désactivation, le journal de changements et les compteurs agrégés. Les mutations sont transactionnelles, exigent une raison et produisent à la fois un `QrCodeChange` et un `AdminAuditEvent`.

L'optimistic locking utilise `configurationVersion`, distinct des compteurs de scans. Une écriture obsolète est refusée en HTTP 409. L'unicité du slug est garantie par PostgreSQL et une création concurrente donne exactement une acceptation et un refus.

La page `/admin/qr-codes` réutilise l'authentification CORO. Les opérations administratives exigent `SUPER_ADMIN` et l'autorité fondatrice. Les appels anonymes, `OPERATOR` et `ADMIN` non autorisés sont refusés. La résolution publique n'expose ni journal, ni acteur, ni secret.

Recette backend/PostgreSQL réelle : **PASS** pour la résolution de `contact`, le changement puis la restauration de destination, la désactivation, le slug inconnu, l'unicité, la concurrence, l'audit et la portée `GLOBAL`.

## Frontière de redirection

`coro-website/app/qr/[slug]/route.ts` interroge l'autorité backend à chaque requête. Les réponses sont dynamiques et `no-store`; aucun redirect obsolète ne doit survivre à une modification de destination.

Sont refusés côté backend et à la frontière Web :

- HTTP ou tout protocole autre que HTTPS;
- domaine hors liste autorisée;
- URL protocol-relative;
- identifiant ou mot de passe intégré;
- port non standard;
- fragment;
- chemin ambigu ou encodé qui boucle vers `/qr/*`, y compris double encodage.

Domaines autorisés : `getcoro.io`, `www.getcoro.io`, `app.getcoro.io`, `client.getcoro.io`.

Comportements explicites : 307 pour un code actif, 404 pour un slug inconnu, 410 pour un code désactivé, 503 sans cache si le backend est indisponible ou renvoie une destination dangereuse. La route publique ne mute aucune configuration et ne reçoit aucun secret.

## Recette Chrome authentifiée

Recette effectuée dans Chrome contre l'interface Next réelle et une autorité locale QA isolée :

- connexion et affichage du registre : **PASS**;
- création et message de succès : **PASS**;
- erreur d'unicité visible : **PASS**;
- modification et journal : **PASS**;
- F5 et persistance de la nouvelle destination : **PASS**;
- désactivation puis réactivation : **PASS**;
- raison obligatoire et champ invalide à vide : **PASS**;
- navigation clavier/focus : **PASS**;
- 390, 768, 1024, 1440 et 1920 px : **PASS**, contenu visible, cinq contrôles d'action présents, aucun contrôle hors viewport et aucun débordement horizontal;
- thème observé : thème actuellement fourni par l'application; aucun thème supplémentaire n'a été revendiqué.

La recette UI utilise une autorité QA locale, pas la base de production. Les contrôles PostgreSQL et API ont été exécutés séparément contre PostgreSQL réel.

## Exports QR

- URL exacte encodée : `https://getcoro.io/qr/contact`.
- SVG : `coro-website/public/qr/contact.svg`.
- PNG : `coro-website/public/qr/contact.png`, 2048 × 2048.
- Manifeste : `coro-website/public/qr/contact.manifest.json`.
- Style : noir sur blanc, correction H, zone silencieuse de quatre modules, sans logo central.

Empreintes SHA-256 :

- SVG : `eeac299775a079a6d23a188fcca2643bf9cfa21ab37f34821a1c22cb7bc885ac`;
- PNG : `ddc1e0997183eff6f96642cec81319589399769f062e49881345a3e30b6ea25f`.

Le PNG a été décodé directement vers l'URL exacte. Le SVG a été rasterisé localement en 2048 × 2048 puis décodé vers la même URL exacte. Le changement de destination en base n'a modifié aucune empreinte.

Régénération déterministe :

```powershell
cd coro-website
npm run qr:generate -- contact https://getcoro.io/qr/contact
```

## Validation technique

- Prisma validate/generate : **PASS**.
- Migrations fresh/upgrade PostgreSQL : **PASS**.
- Recette PostgreSQL réelle : **PASS**.
- Jest backend ciblé : **PASS**, 2 suites, 13 tests.
- Barrière HTTP/RBAC : **PASS**, anonyme/OPERATOR/ADMIN refusés et SUPER_ADMIN accepté.
- Build Nest backend : **PASS**.
- Tests Web QR : **PASS**, 7/7.
- TypeScript Website et Frontend : **PASS**.
- Builds Website et Frontend : **PASS**; routes `/qr/[slug]` et `/admin/qr-codes` présentes.
- ESLint ciblé Backend, Website et Frontend : **PASS**.
- Chrome authentifié et responsive : **PASS**.

## Procédure de déploiement proposée

1. Geler le SHA revu et sauvegarder PostgreSQL.
2. Vérifier l'identité de la base et l'absence du nom/checksum QR dans `_prisma_migrations`.
3. Appliquer `20261120010000_permanent_qr_codes` une seule fois.
4. Vérifier le provisionnement `contact` avant tout trafic public.
5. Déployer backend, puis Website et Frontend à partir du même SHA.
6. Vérifier l'API publique, l'administration authentifiée et les statuts 307/404/410/503 en préproduction.
7. Vérifier que `Location` vaut exactement la destination attendue et que `Cache-Control` interdit le cache.
8. Effectuer la recette physique téléphone/impression.
9. Autoriser séparément l'activation de production.

## Retour arrière

- Avant activation : revenir au SHA applicatif précédent; la migration additive peut rester dormante sans exposition publique.
- Après activation applicative mais avant mutation métier : redéployer le SHA précédent et retirer la route du trafic.
- Après mutation métier : exporter `QrCode` et `QrCodeChange`, désactiver les codes concernés, puis restaurer les valeurs validées. Ne jamais supposer qu'un rollback de code annule PostgreSQL.
- Un `DROP TABLE` automatique n'est pas fourni : toute suppression de schéma nécessiterait une migration distincte, une sauvegarde restaurable et une autorisation de production explicite.
- Le SVG et le PNG restent immuables; leur retour arrière est le redéploiement des fichiers aux empreintes ci-dessus.

## Limites restantes

- Recette physique sur plusieurs téléphones : `NOT_VERIFIED`.
- Test d'impression réel : `NOT_VERIFIED`.
- HTTPS public `https://getcoro.io/qr/contact` : `NOT_DEPLOYED` et non activé.
- Migration de production : non exécutée.
- La CI de la PR constitue la dernière barrière automatique; son état terminal doit être attaché à la remise de revue.

## Invariants de remise

- Travaux Rendement modifiés : **0**.
- Base propriétaire mutée : **NON**.
- Destination publique existante modifiée : **NON**.
- Fusion : **NON**.
- Migration production : **NON**.
- Activation/release : **AUCUNE**.
