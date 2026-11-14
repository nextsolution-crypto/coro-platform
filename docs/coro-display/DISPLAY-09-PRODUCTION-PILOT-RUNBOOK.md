# DISPLAY-09 — Lot A et pilote Tour Prémont

Ce runbook est opérationnel et à arrêt obligatoire. Il ne constitue pas une autorisation de mutation.

## État de départ immuable

- Candidat applicatif actif : `82125e27d70f4c763fd4c14da48dc8f152f8435a`.
- Lot B et Gate 1B : `PASS`; aucune migration ni image ne doit être rejouée.
- Tour Prémont doit être résolu par `display09-building-identity.cjs` et correspondre à la fixture `display-09-demo-pilot/tour-premont-building` ainsi qu'à son empreinte canonique.
- Le Player demeure strictement `WEB_VIEW_ONLY` et non admissible aux fonctions d'urgence.

## Lot A — changement NGINX/Certbot gouverné

Outillage : `ops/display09/display09-origin-tls-change.sh` et le virtual host `ops/display09/nginx/display.getcoro.io.conf.template`.

1. Exécuter `PLAN`; aucune mutation n'est effectuée.
2. Dans Cloudflare, démontrer la cible d'origine, les Origin Rules et le SNI. Fixer `ORIGIN_PATH_VERIFIED=PASS` seulement avec l'inventaire exhaustif. Si cet inventaire demeure incomplet, conserver `NOT_VERIFIED`; la voie distincte `CONTROLLED_ORIGIN_VERIFICATION` exige l'acceptation explicite du risque, les preuves partielles Cloudflare et tous les contrôles publics réels après changement.
3. Autoriser séparément le changement DNS/TLS. Choisir :
   - `HTTP01` seulement après résolution publique de `display.getcoro.io` et accès au challenge;
   - `DNS01` avec le plugin Cloudflare existant et un fichier d'identifiants hors Git, non symbolique, mode `0400` ou `0600`.
4. Avant `APPLY`, vérifier `DISPLAY_DNS_CHANGE_AUTHORIZED=PASS` et l'une des deux branches :
   - origine complète : `ORIGIN_PATH_VERIFIED=PASS` et `DISPLAY_CLOUDFLARE_RULES_VERIFIED=PASS`;
   - voie contrôlée : `ORIGIN_PATH_VERIFIED=NOT_VERIFIED`, `DISPLAY_CLOUDFLARE_RULES_VERIFIED=PARTIAL`, `CONTROLLED_ORIGIN_VERIFICATION_AUTHORIZED=PASS` et `CONTROLLED_ORIGIN_RISK_ACCEPTED=PASS`.
5. `APPLY` prend le verrou commun, valide NGINX, sauvegarde le vhost Display, son lien et `nginx -T`, émet uniquement le certificat dédié, installe le vhost vers `127.0.0.1:3003`, puis effectue `nginx -t` et un reload.
6. `VERIFY` contrôle les cinq SNI, la route réelle `/d/{publicDisplayId}`, `no-store`, CSP, cookies éventuels et le dry-run Certbot.
7. Au premier échec après mutation, le rollback automatique restaure uniquement le vhost Display. Le mode `ROLLBACK` reste rejouable avec l'état sauvegardé et exige `DISPLAY_TLS_ROLLBACK_AUTHORIZED=PASS`.

Les certificats historiques ne sont ni remplacés ni supprimés. Aucun restart de service n'est utilisé.

## Lot C — ordre d'exécution obligatoire

Le manifeste `ops/display09/display09-lot-c-manifest.json` fixe la cible, les codes spatiaux, les deux PDF synthétiques, leurs SHA-256, les clés d'idempotence et la séquence de preuve. `display09-lot-c-readiness.mjs` doit être `PASS` immédiatement avant la campagne.

Après `Lot A=PASS` et autorisation spécifique Lot C :

1. Résoudre Tour Prémont en lecture seule et comparer la fixture et l'empreinte canonique.
2. Relever l'état initial des étages, zones, emplacements, publications et sessions Display; arrêter sur collision non identique.
3. Créer ou réconcilier E03, E03-DEMO et E03-DISPLAY-PILOT par les routes serveur et avec les permissions limitées au bâtiment.
4. Importer le PDF V1 synthétique comme `ProjectFile`, vérifier sa version et son SHA-256, puis créer la publication.
5. Soumettre, réviser et approuver avec les acteurs habilités distincts; publier seulement la version approuvée.
6. Générer l'activation à usage unique, masquer le code dans les preuves et ouvrir l'URL permanente sur Safari iPad.
7. Observer V1 sur l'iPad, F5, mode portrait/paysage, perte/reprise réseau et absence d'autorité d'urgence.
8. Répéter le circuit indépendant pour V2; observer la synchronisation effective V1 → V2 sur le même iPad.
9. Révoquer la session et l'activation; démontrer le refus serveur à la requête suivante.
10. Conserver les audits, les identifiants non secrets, les versions et les horodatages. Ne pas supprimer les publications historiques.

## Verdicts

- `LOT_A_READY` : tests isolés et contrôles de contrat réussis.
- `LOT_A_APPLIED` : interdit tant que la corrélation Cloudflare/origine n'est pas `PASS` et qu'une autorisation de mutation n'est pas active.
- `LOT_C_READY` : manifeste, actifs et séquence validés.
- `PREUVE_2_PASS` : uniquement après observation réelle de V1, V2, synchronisation et révocation sur Safari iPad.
