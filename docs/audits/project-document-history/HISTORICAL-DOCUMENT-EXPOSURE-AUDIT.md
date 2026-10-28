# Inventaire historique des documents projet

Date : 2026-10-28

## Mandat et versions

L'audit vise uniquement l'accessibilité anonyme éventuelle d'anciens objets réels. Il ne réouvre pas la correction Documents projet de la PR #103 et ne modifie ni base, stockage, ACL, référence, cache ou production.

- `origin/main` et candidat WEB-AI : `12766061c5b0458894dd2d0b3b9dac7a161a2296`.
- production inspectée : `0654faeb6ad92e0f6f2a7cfbec1d9fc689fd90f4`.
- migration production : 156, tête `20261110010000_public_knowledge_foundation`.
- outil élargi : version incluse dans le commit de livraison de la branche `audit/project-document-history`; son SHA est consigné dans le rapport de PR.

## Sources et périmètre

L'inventaire préparé couvre les lignes `ProjectFile`, leurs versions par relation parent/enfant, les projets actifs, archivés ou désactivés et les références `officialPdfFr`/`officialPdfEn`. Il distingue référence privée canonique, URL HTTPS historique CORO, clé historique, URL signée, référence invalide et origine externe. Les références et objets uniques sont comptés séparément.

Les objets orphelins sans référence en base et les copies inconnues restent `OUT_OF_SCOPE`; aucun scan intégral du bucket n'est exécuté. Les liens externes intentionnels sont exclus et aucune URL provenant arbitrairement de la base n'est suivie.

## Méthode de sécurité

L'outil utilise une pagination de 100 lignes, une concurrence séquentielle, un HEAD de service signé sans contenu et uniquement les origines de stockage CORO configurées. Le test anonyme n'envoie ni cookie, credential, signature ou en-tête d'authentification et refuse les redirections.

Après HEAD, un GET n'est tenté qu'avec `Range: bytes=0-15`. Une réponse autre que `206` avec `Content-Range` et taille compatibles est interrompue avant lecture et classée `NOT_VERIFIED`. Aucun octet n'est conservé ou journalisé. La sortie contient seulement des compteurs; identifiants, noms, clés, URLs et contenus sont absents.

## Validation synthétique

Les tests couvrent : clé privée valide, URL historique, URL signée, origine externe, traversée/clé ambiguë, objet privé, objet public avec plage bornée, objet absent, redirection, timeout, serveur ignorant Range, HEAD non supporté et références dupliquées. Résultat local : 5/5 tests PASS via le runner Node direct. Le lancement `node --test` isolé est empêché localement par `spawn EPERM`; le workflow Linux emploie le runner standard.

## Exécution production disponible

Les inspections existantes ont été rejouées sans mutation :

- inspection production `40691751317` : SUCCESS, `PASS/GO`;
- audit des PDF officiels `40691755682` : SUCCESS;
- résultat officiel : 2 projets, 4 références, 4 références privées canoniques, 4 objets privés vérifiés, zéro objet public, absent, cassé ou non vérifiable.

Cette preuve porte uniquement sur les quatre PDF officiels. L'outil élargi n'est pas encore fusionné dans `main`; le workflow gouverné refuse volontairement d'exécuter un SHA non ancêtre de `origin/main`. Son exécution réelle doit donc attendre la revue et la fusion de la PR de cet outil.

## Définitions

- `PRIVATE_ACCESS_VERIFIED` : l'objet existe via l'autorité de service et le chemin public exact testé refuse l'accès anonyme. Cela ne prouve pas l'absence de toute copie ou autre chemin.
- `PUBLIC_EXPOSURE_CONFIRMED` : une plage bornée a effectivement livré des octets sans authentification.
- `MISSING_OR_BROKEN` : l'autorité de service ne trouve pas l'objet référencé.
- `INVALID_REFERENCE` : référence non interprétable sans ambiguïté ou non sécuritaire.
- `NOT_VERIFIED` : preuve insuffisante, erreur réseau, URL signée, comportement Range incompatible ou chemin public non conclusif.
- `OUT_OF_SCOPE` : origine externe intentionnelle, objet orphelin ou copie non référencée.

## Verdict courant

`RÉSERVE MAINTENUE — PREUVES INSUFFISANTES` pour l'ensemble des anciens fichiers projet. La réserve est levée uniquement pour les quatre PDF officiels précédemment remédiés et revérifiés.
