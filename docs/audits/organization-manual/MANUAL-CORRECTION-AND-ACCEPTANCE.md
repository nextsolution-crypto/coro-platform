# Correction et acceptation intégrée du Manuel CORO

## Candidat fonctionnel

- Branche initiale : `fix/organization-manual-completeness`.
- HEAD accepté en QA : `36b4a3bde156bc5135dad188bb03eef393e13936`.
- PR fonctionnelle : `#146`.
- Catalogue : `2026-11-01.1`.

## Acceptation synthétique

- Backend : 24/24; contrats de navigation Organisation et Portail : PASS.
- Builds backend, Organisation et Portail : PASS; Design System : 17/17.
- Chrome authentifié : 12 configurations sur chacune des deux applications (24 captures).
- 503/reprise, F5, ancres, historique, recherche sans résultat, clavier et zoom 200 % : PASS.
- PostgreSQL jetable : 164 migrations; MFA local; réseau fournisseurs fermé.
- Preuves : `D:\CORO-QA\audits\organization-manual\browser`.

## Livraison et correction post-release

- PR `#146` fusionnée dans le candidat `57cef4a5162e398aef5e63d91a042377b161b537`.
- Release `41327773737`, inspection `41329040102` et capacité `41329038127` : SUCCESS.
- L'inspection visuelle authentifiée a démontré un défaut réel : l'ancre du Manuel du Portail pouvait être perdue après F5 par la restauration tardive de défilement du navigateur.
- PR `#147`, candidat `096703d91f7f7885a36e6b5638a721de004d967e` : première correction et release réussie, mais preuve F5 encore insuffisante.
- PR `#148`, commit fonctionnel `46603c9c`, puis PR `#149`, commit pipeline `4113a2dc`, ont fourni la correction définitive et la récupération exacte du script de capacité avant son exécution.
- La release `41332876953` a échoué avant mutation de production : le dépôt local du serveur ne contenait pas encore le SHA demandé lors de l'extraction du script de capacité.
- La PR `#149` impose désormais le fetch du candidat exact avant l'extraction des scripts de capacité pré- et post-release.

## État final de production

- SHA actif : `165b41a0b8ecd6ae1fd18f0b03325bcfc1c8c63b`.
- CI main `41334403311` : SUCCESS.
- Release gouvernée `41334823191` : SUCCESS.
- Inspection post-release `41336102818` : SUCCESS, verdict `GO`.
- Contrôle de capacité `41336105050` : SUCCESS.
- PostgreSQL : 164 migrations, tête `20261117010000_building_governance`.
- Sauvegarde distante / restauration : `REMOTE_VERIFIED` / `RESTORE_VERIFIED`.
- Rollback : quatre images présentes; verrou de déploiement libéré.
- Capacité : 82 086 711 296 octets au total, 37 230 919 680 libres, besoin de release 19 705 756 806, marge 17 525 162 874.

### Digests actifs

- Backend : `sha256:bb9de4e528641851e577fa8e1172d7cb02ca2164e533f9dd24c404c12282f88a`.
- Frontend Organisation : `sha256:08772d7f2dc6034f6cdde6808bf7ab6c6795916a1dac3ba0505e496a32008d5c`.
- Portail Client : `sha256:2cc1cc1262f9989d36188ff059f3f9a64cbc96aa289decc791ea8da028922a08`.
- Site public : `sha256:5e804f4b08601e6e8143d968a8bb3cd7226d8692cb82f5fa7e949afc2d4564e6`.

## Recette visuelle authentifiée sur le SHA actif

- Manuel Organisation : chargement, navigation, contenu adapté au rôle, recherche guidée déterministe et provenance vérifiés.
- Manuel Portail Client : accès direct et F5 sur `#hors-ligne` conservent l'ancre et rendent la cible visible.
- Recherche sans résultat : état explicite vérifié.
- Desktop : largeur utile 1391 px, aucun débordement horizontal dans les deux applications.
- Mobile 390 × 844 : aucun débordement horizontal, cartes lisibles et cible d'ancre visible.
- Aucun lien métier n'a été ouvert et aucune mutation métier n'a été effectuée.
- Les messages console liés au canal d'une extension Chrome ne sont pas des erreurs applicatives CORO.

## Limites conservées

- Lecteur d'écran réel : `NOT_VERIFIED`; rôles, libellés, ordre de focus et annonces DOM contrôlés séparément.
- Paramètres non audités par ce lot; le Manuel n'en donne qu'un aperçu prudent.
- Recherche guidée déterministe, fondée sur le catalogue; ce n'est pas une IA générative.
- Aucun raccordement nouveau de la Bibliothèque à Knowledge, CORO AI authentifié ou l'assistant public.

## Verdict

`VALIDÉ_QA — FUSIONNÉ — DÉPLOYÉ — RÉCONCILIÉ`

Le périmètre Manuel est clos. L'audit Paramètres reste distinct et n'est pas commencé.
