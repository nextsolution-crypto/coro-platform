# Registre maître — clôture des réserves de consolidation

## Baseline autoritative

| Élément | Valeur vérifiée | Preuve |
| --- | --- | --- |
| Consolidation fusionnée | `0c76580648996ad6f2ccbb29e760772372619d48` | PR #153, fusionnée le 2026-11-01; CI `41352262505` réussie; aucun job de release |
| Produit actif de référence | `91c1313c393bd630489e66e26aa5557ca53c2dd` | release `41348342595`; inspection `41349712708` |
| PostgreSQL | 165 migrations; tête `20261118010000_organization_settings_governance` | clôture Paramètres et inspection `41349712708` |
| Capacité post-release | SUCCESS | workflow `41349728310` |

Le SHA documentaire de `main` ne remplace pas silencieusement le SHA produit actif. Toute future livraison doit rétablir cette baseline depuis le manifeste de production au moment du gate.

## États permis

- `DEMONTRÉ` : preuve concluante, sans changement produit à livrer.
- `CORRIGÉ_QA` : correction et preuve QA présentes, mais non déployées.
- `DÉPLOYÉ` : SHA exact livré, inspecté et réconcilié.
- `BLOQUÉ` : dépendance précise empêchant la clôture.
- `EXCLU_PAR_DÉCISION` : exclusion explicite maintenue.

## Registre

| Lot | Périmètre | Critères de clôture | Dépendances | État | Preuves / PR | SHA testé / déployé | Limites | Prochaine action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| A | Rollback de sécurité | matrice par release; rollback admissible accepté; dangereux refusé; schéma, secrets, workers et routes vérifiés; récupération démontrée | manifestes réconciliés, digests immuables | CORRIGÉ_QA | PR #154; dry-run `41354344585`; bascule Docker isolée PASS | HEAD PR à republier / `91c1313c…` | jeu actif précédent explicitement bloqué; contrôle non encore fusionné/déployé | attendre CI du HEAD final, fusionner puis livrer le contrôle sans exécuter de rollback |
| B | Invitations internes réelles | demande, outbox, fournisseur, réception humaine, lien, secret, MFA, portée, usage unique, expiration/renvoi/révocation et remise en état | fournisseur gouverné; `info@getcoro.io`; confirmation humaine | BLOQUÉ | preuves simulateur Paramètres existantes | `91c1313c…` | livraison réelle non exercée | préparer identité QA et préflight sans envoi |
| C | Divergences historiques organisationnelles | inventaire privé; résolution autoritative ou décision groupée; application auditée; isolation et rollback | accès production en lecture seule; décision Mathieu pour ambiguïtés | DEMONTRÉ / CLOS | inventaire production `41356195887`: 0 conflit, 0 organisation affectée | `96800e95` / outil fusionné | aucune valeur sensible émise | aucune action |
| D | Accessibilité et PDF | périmètre déclaré; lecteur d’écran réel représentatif; défauts partagés corrigés; analyse PDF PMU/PSI/PCA et limites honnêtes | NVDA/JAWS/VoiceOver; validateurs PDF | BLOQUÉ | clavier/focus/zoom et PDF extractible déjà couverts; inventaire Windows sans lecteur d’écran pilotable | historique / `91c1313c…` | restitution vocale et PDF/UA restent `NOT_VERIFIED` | intervention humaine avec lecteur d’écran réel et validateur PDF/UA |
| E | Stockage orphelin | inventaire multi-références; classification; exposition privée traitée de façon réversible; aucun effacement | accès métadonnées stockage et DB | PARTIEL | production `41356195887`: 145 objets; 29 référencés présents; 0 manquant; 116 candidats / 690458654 octets | `96800e95` / outil fusionné | candidats non classés orphelins avant revue individuelle | revue privée des 116 candidats; aucune suppression automatique |
| F | Bibliothèque → Knowledge/CORO AI | source typée, portée avant récupération, provenance/version, citation autorisée, remplacement/retrait, prompt injection; public isolé | architecture Knowledge; fournisseur simulé | BLOQUÉ | audit code : retrieval et audit de citations sont liés exclusivement à ProjectFile | `1d64d91f` / non déployé | un raccord direct contournerait les FK de provenance; assistant public doit rester isolé | ajouter une autorité de source typée et une migration dédiée avant connexion |
| G | Indicateurs Projet et Dashboard | formules/sources documentées; fixtures indépendantes; libellés exacts; preuves ciblées multi-rôle | décision métier si définition absente | PARTIEL | score qualité serveur documenté; `Project.progress` confirmé persistant et manuel; proposition chiffrée | `1d64d91f` / non déployé | formule de progression non approuvée | choisir jalons gouvernés ou progression déclarée |
| H | PGC/PRA/PUE, signature, juridique, carte | capacité, preuve manquante, risque, décision et critères de clôture; interface/Manuel non trompeurs | décisions distinctes | EXCLU_PAR_DÉCISION | consolidation PR #153 | `91c1313c…` | aucune activation dans ce master | vérifier les libellés et maintenir les exclusions |

## Journal d’exécution

- 2026-11-01 — PR #153 vérifiée puis fusionnée. Aucun déploiement déclenché.
- 2026-11-01 — worktree isolé `organization-reserves-closure` créé depuis `origin/main` au merge `0c765806…`; worktree principal et travaux P-5 préservés.
- 2026-11-01 — lot A commencé : mécanisme de rétention/rollback inspecté; contrôle de blocage existant, autorité de matrice manquante.
- 2026-11-01 — lot A, fondation QA : validateur déterministe ajouté pour les digests, le commit, la compatibilité de schéma, les identifiants de clés et l’état worker. Les tests capacité ont été rejoués fichier par fichier sous Windows : 33/33 PASS au total, dont 4 nouveaux. Aucun jeu de production n’est approuvé par défaut.
- 2026-11-01 — CI initiale PR #154 : six contrôles obligatoires PASS, images et release SKIPPED.
- 2026-11-01 — dry-run production `41354344585` : SUCCESS, 4/4 images précédentes disponibles, zéro pull, conteneurs inchangés. Le backend antérieur `bb9de4e5…` est classé dangereux et bloqué.
- 2026-11-01 — seul chemin de bascule complète gouvernée ajouté, feature flag fermé par défaut; 5/5 tests de politique et 3/3 contrats d’orchestration PASS; syntaxe Bash validée sous Alpine 3.20.
- 2026-11-01 — recette Docker isolée : bascule approuvée, refus avant mutation, récupération et conservation d’une donnée et d’un événement synthétiques, tous PASS; ressources jetables nettoyées.
- 2026-11-01 — probe backend rollback aligné sur le contrat de release (`/api/auth/login`, 400/401); contrat 4/4 PASS; HEAD `448a2ee7` publié.
- 2026-11-01 — inventaires assainis ajoutés : divergences 2/2 PASS; bucket contre l’union de 11 autorités 6/6 PASS; aucune clé d’objet, valeur de paramètre ou donnée personnelle dans les rapports; aucune suppression possible.
- 2026-11-01 — audit Bibliothèque/Knowledge : le catalogue est toujours non connecté; le schéma d’audit des réponses authentifiées impose actuellement des FK ProjectFile. Une source Bibliothèque ne peut pas être ajoutée honnêtement sans autorité typée et migration.
- 2026-11-01 — aucun lecteur d’écran Windows pilotable n’est disponible dans l’environnement de recette; DOM, clavier et zoom ne sont pas requalifiés comme restitution vocale.
- 2026-11-01 — PR #154 fusionnée au merge `7eed82db`; contrôle rollback et inventaires publiés/fusionnés, non déployés comme produit et non activés pour une bascule réelle.
- 2026-11-01 — première exécution d’inventaire `41355742703` arrêtée sans mutation : le garde `stdin` n’exécutait pas `main`; PR corrective #155, 7/7 + 3/3 tests, fusion `96800e95`.
- 2026-11-01 — inventaire production `41356195887` SUCCESS : divergences historiques absentes; 29/29 objets référencés présents; 116 objets restent candidats et non déclarés orphelins; aucune suppression.

## État de livraison explicite

| Élément | Implémenté | Testé | Publié | Fusionné | Déployé | Réconcilié | Clos |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Autorité et chemin rollback | oui | oui, QA isolée | oui | oui (`7eed82db`) | non applicable au produit; feature fermée | non, aucun rollback production exécuté | non, procédure opérationnelle réelle non démontrée |
| Inventaire divergences | oui | oui | oui | oui (`96800e95`) | workflow disponible | oui (`41356195887`) | oui, aucun conflit |
| Inventaire stockage multi-autorités | oui | oui | oui | oui (`96800e95`) | workflow disponible | oui (`41356195887`) | non, 116 candidats à qualifier |
| Progression Projet | proposition seulement | analyse code | oui | oui (`7eed82db`) | aucune modification produit | non applicable | décision métier ouverte |
