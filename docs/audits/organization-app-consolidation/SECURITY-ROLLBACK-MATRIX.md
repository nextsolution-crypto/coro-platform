# Matrice de sécurité des rollbacks

## Règle de décision

Un jeu de quatre images disponible n’est admissible que si les quatre références sont immuables, le schéma reste compatible, les secrets requis sont disponibles, les workers/outbox sont sûrs et aucune image ne réintroduit un défaut de sécurité applicable. En cas de doute, le rollback est refusé. Une suspension documentée de routes n’est acceptable que si elle est effectivement appliquée par un contrôle serveur gouverné; une consigne d’exploitation seule ne suffit pas.

## État du mécanisme au démarrage

| Contrôle | État | Observation |
| --- | --- | --- |
| Références actives et rollback immuables | DEMONTRÉ | le plan exige exactement quatre références GHCR par digest |
| Rotation après release réconciliée | DEMONTRÉ | seules les releases SUCCESS réconciliées sont sélectionnées |
| Release échouée/non réconciliée | DEMONTRÉ | ne déplace pas la protection rollback |
| Blocage d’un digest dangereux | CORRIGÉ_QA | le validateur refuse un digest bloqué avant de considérer une approbation |
| Matrice versionnée des digests dangereux | CORRIGÉ_QA / VIDE PAR DÉFAUT | schéma versionné présent; aucune valeur de rapport n’est promue sans manifeste autoritatif |
| Compatibilité migration/schéma | CORRIGÉ_QA | tête courante explicitement autorisée par jeu; sinon refus |
| Disponibilité des clés | CORRIGÉ_QA | seuls les identifiants, jamais les valeurs, sont comparés; clé absente refusée |
| Workers/outbox | CORRIGÉ_QA | approbation `COMPATIBLE` et état `QUIESCED` requis |
| Suspension effective des routes vulnérables | OUVERT | plusieurs rapports la prescrivent, sans contrôle serveur d’urgence démontré |
| Rollback et roll-forward isolés | DÉMONTRÉ_QA | quatre conteneurs et un volume jetables : bascule autorisée, refus avant mutation, rétablissement, donnée et événement conservés |

## Releases connues à qualifier

| Release corrigée | Domaine | Risque de la release immédiatement antérieure | Décision provisoire |
| --- | --- | --- | --- |
| `2e6c06ef…` | Bâtiments | autorisations Bâtiments/Documents antérieures | INADMISSIBLE sans suspension serveur démontrée |
| `204ad4cc…` | Bibliothèque | chemins d’autorisation du catalogue antérieurs | INADMISSIBLE sans suspension serveur démontrée |
| `91c1313c…` | Paramètres | mot de passe, portée opérateur, invitations et écrasement organisationnel antérieurs | INADMISSIBLE sans protection équivalente démontrée |

Le dry-run gouverné `41354344585` a lu le manifeste actif le 2026-11-01 sans pull ni changement de conteneur. Il confirme le jeu immédiatement antérieur :

- backend `ghcr.io/nextsolution-crypto/coro-backend@sha256:bb9de4e528641851e577fa8e1172d7cb02ca2164e533f9dd24c404c12282f88a`;
- frontend `ghcr.io/nextsolution-crypto/coro-frontend@sha256:08772d7f2dc6034f6cdde6808bf7ab6c6795916a1dac3ba0505e496a32008d5c`;
- portail client `ghcr.io/nextsolution-crypto/coro-client-portal@sha256:2cc1cc1262f9989d36188ff059f3f9a64cbc96aa289decc791ea8da028922a08`;
- site `ghcr.io/nextsolution-crypto/coro-website@sha256:5e804f4b08601e6e8143d968a8bb3cd7226d8692cb82f5fa7e949afc2d4564e6`.

Les quatre images étaient disponibles, les conteneurs actifs sont restés inchangés et l’espace libre mesuré était `34 649 989 120` octets. Le backend est explicitement bloqué par la politique : sa disponibilité n’autorise pas son exécution.

Cette table ne bloque pas arbitrairement tous les historiques : elle identifie les domaines déjà documentés. Les digests exacts doivent être récupérés des manifestes réconciliés avant d’alimenter l’autorité d’exploitation.

## Critères de fermeture

1. Extraire les couples release/digests depuis les manifestes réconciliés, sans recopier une valeur supposée.
2. Relier chaque digest bloqué à un constat, une version corrigée et une condition de levée.
3. Étendre la validation à la compatibilité de migration, aux identifiants de clés nécessaires et aux workers actifs.
4. Tester : admissible, dangereux, manifeste incomplet, schéma incompatible, clé absente, outbox en cours, rollback interrompu et roll-forward.
5. Livrer le contrôle fail-closed avant toute affirmation de rollback sûr.

## Résultat QA initial

- `rollback-security-policy.test.mjs` : 5/5 PASS (admissible, digest bloqué, absence d’approbation, schéma/clé/worker et double validation).
- `governed-rollback-contract.test.mjs` : 4/4 PASS, dont le probe backend canonique de la release; aucun endpoint de santé fictif.
- Suite `ops/capacity` rejouée fichier par fichier : 33/33 PASS.
- `git diff --check` : PASS.
- Le lanceur parallèle `node --test ops/capacity/*.test.mjs` est inutilisable dans ce shell Windows (`spawn EPERM`); chaque même fichier a été exécuté directement sans modifier son contenu.
- Chemin de bascule ajouté : workflow `Governed Production Application Rollback`, désactivé par défaut, approbation d’environnement, verrou commun, validation avant et après arrêt des workers, quatre services exacts, aucune migration descendante, roll-forward automatique et preuve immuable.
- Les points d’entrée ont été distingués : restauration d’images (aucune exécution), maintenance mono-service (retour à l’image active capturée), release normale (aucun rollback automatique général), transition d’état (aucun Docker) et nouveau workflow gouverné (seule bascule complète autorisée).
- Recette Docker isolée `qa/rollback-governance/isolated-rollback.mjs` : bascule autorisée PASS; digest dangereux refusé sans changement d’identifiant de conteneur PASS; retour à la génération corrigée PASS; donnée et événement outbox synthétiques persistants PASS. Les quatre conteneurs, le réseau et le volume jetables ont été supprimés en fin de test.
- Statut du lot : `CORRIGÉ_QA`, pas `DÉPLOYÉ`. La CI du HEAD final, la fusion et la livraison du contrôle restent obligatoires avant fermeture opérationnelle.
