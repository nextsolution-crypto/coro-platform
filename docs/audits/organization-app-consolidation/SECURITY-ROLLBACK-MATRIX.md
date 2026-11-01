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
| Rollback et roll-forward isolés | OUVERT | test de plan présent; parcours applicatif complet à construire |

## Releases connues à qualifier

| Release corrigée | Domaine | Risque de la release immédiatement antérieure | Décision provisoire |
| --- | --- | --- | --- |
| `2e6c06ef…` | Bâtiments | autorisations Bâtiments/Documents antérieures | INADMISSIBLE sans suspension serveur démontrée |
| `204ad4cc…` | Bibliothèque | chemins d’autorisation du catalogue antérieurs | INADMISSIBLE sans suspension serveur démontrée |
| `91c1313c…` | Paramètres | mot de passe, portée opérateur, invitations et écrasement organisationnel antérieurs | INADMISSIBLE sans protection équivalente démontrée |

Cette table ne bloque pas arbitrairement tous les historiques : elle identifie les domaines déjà documentés. Les digests exacts doivent être récupérés des manifestes réconciliés avant d’alimenter l’autorité d’exploitation.

## Critères de fermeture

1. Extraire les couples release/digests depuis les manifestes réconciliés, sans recopier une valeur supposée.
2. Relier chaque digest bloqué à un constat, une version corrigée et une condition de levée.
3. Étendre la validation à la compatibilité de migration, aux identifiants de clés nécessaires et aux workers actifs.
4. Tester : admissible, dangereux, manifeste incomplet, schéma incompatible, clé absente, outbox en cours, rollback interrompu et roll-forward.
5. Livrer le contrôle fail-closed avant toute affirmation de rollback sûr.

## Résultat QA initial

- `rollback-security-policy.test.mjs` : 4/4 PASS (admissible, digest bloqué, absence d’approbation, schéma/clé/worker).
- Suite `ops/capacity` rejouée fichier par fichier : 33/33 PASS.
- `git diff --check` : PASS.
- Le lanceur parallèle `node --test ops/capacity/*.test.mjs` est inutilisable dans ce shell Windows (`spawn EPERM`); chaque même fichier a été exécuté directement sans modifier son contenu.
- Statut du lot : `CORRIGÉ_QA`, pas `DÉPLOYÉ`. Le raccordement au geste de bascule et la qualification du manifeste actif restent obligatoires.
