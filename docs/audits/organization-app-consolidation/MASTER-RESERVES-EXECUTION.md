# Registre maître — clôture des réserves de consolidation

## Réconciliation finale du 2026-11-01

- PR #157 : HEAD testé `dbe7d7c9fb9ebfd2c9487d54c311b1ecbecb1ed7`, fusion `c91543efdf34c6429d1877a0b92f0a28567b5bb7`.
- CI PR `41359701346`, sécurité backend `41359701377`, portail `41359701367` et CI main `41360139308` : PASS.
- Release gouvernée `41360598223` : SUCCESS; quatre images immuables déployées; migration 165 → 166.
- Inspection `41361880281` : `PASS/GO`; SHA actif exact; migration `20261119010000_library_knowledge_source_authority`; sauvegarde `REMOTE_VERIFIED`; restauration `RESTORE_VERIFIED`; quatre rollbacks; verrou libre.
- Digests : backend `sha256:dfe9d86437e40aaf1d2e16001e935a34341a8d3bb0df93625a5a9a1edce65aa6`; frontend `sha256:ff637cd5522f754e7cfe7a548d4eaea7eb7892b02777a05c2d0c30ac6de2186f`; portail `sha256:56787baedb767ad55a3cdab7b15b8f9d17e74c1e55d1f6a51bbae3810e27e5ec`; site `sha256:cb160063578a63db5eecfe5312241a8da72cebd781b769100b7ccd7f904a0eb4`.
- Inventaire stockage `41361883831` : PASS lecture seule; 145 objets, 29/29 références présentes, 0 manquante, 116 candidats / 690 458 654 octets; 60 historiques non classés / 33 348 239 octets; 56 projet/bâtiment / 657 110 415 octets; 110 âgés de 30–89 jours, 6 de moins de 30 jours; aucune version non courante. Aucune suppression.
- Bibliothèque → Knowledge/CORO AI authentifié : **IMPLÉMENTÉ, TESTÉ, PUBLIÉ, FUSIONNÉ, DÉPLOYÉ ET RÉCONCILIÉ**. Récupération déterministe démontrée; fournisseur réel non activé.
- Rollback : **PRÉPARATION OPÉRATIONNELLE DÉMONTRÉE** et répétition isolée réussie; utilisation réelle en production non exercée; ancien backend dangereux interdit.

## Baseline autoritative

| Élément | Valeur vérifiée | Preuve |
| --- | --- | --- |
| Consolidation fusionnée | `0c76580648996ad6f2ccbb29e760772372619d48` | PR #153, fusionnée le 2026-11-01; CI `41352262505` réussie; aucun job de release |
| Produit actif de référence | `c91543efdf34c6429d1877a0b92f0a28567b5bb7` | release `41360598223`; inspection `41361880281` |
| PostgreSQL | 166 migrations; tête `20261119010000_library_knowledge_source_authority` | inspection `41361880281` |
| Capacité post-release | 31,3 Go libres; verrou libre | inspection `41361880281` |

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
| A | Rollback de sécurité | matrice par release; rollback admissible accepté; dangereux refusé; schéma, secrets, workers et routes vérifiés; récupération démontrée | manifestes réconciliés, digests immuables | DÉMONTRÉ / PRÊT OPÉRATIONNELLEMENT | PR #154 fusionnée `7eed82db`; dry-run `41354344585`; bascule Docker isolée PASS; quatre images vérifiées après release | `7eed82db` / produit actif `c91543ef…` | répétition isolée réussie; aucune utilisation réelle en production exercée; ancien backend `bb9de4e5…` interdit | conserver l’interdiction et n’utiliser le workflow réel que pour un incident autorisé |
| B | Invitations internes réelles | demande, outbox, fournisseur, réception humaine, lien, secret, MFA, portée, usage unique, expiration/renvoi/révocation et remise en état | fournisseur gouverné; `info@getcoro.io`; confirmation humaine | BLOQUÉ INTERVENTION MINIMALE | endpoint `POST /api/users/organization`; page `/settings/users`; outbox et remise en état déjà testées en simulateur | `91c1313c…` | aucune session ADMIN/SUPER_ADMIN autorisée disponible; aucun envoi effectué | Mathieu se connecte à `https://app.getcoro.io/settings/users`; la création finale vers `info@getcoro.io` exige confirmation au moment de l’envoi |
| C | Divergences historiques organisationnelles | inventaire privé; résolution autoritative ou décision groupée; application auditée; isolation et rollback | accès production en lecture seule; décision Mathieu pour ambiguïtés | DEMONTRÉ / CLOS | inventaire production `41356195887`: 0 conflit, 0 organisation affectée | `96800e95` / outil fusionné | aucune valeur sensible émise | aucune action |
| D | Accessibilité et PDF | périmètre déclaré; lecteur d’écran réel représentatif; défauts partagés corrigés; analyse PDF PMU/PSI/PCA et limites honnêtes | NVDA/JAWS/VoiceOver; validateurs PDF | BLOQUÉ | clavier/focus/zoom et PDF extractible déjà couverts; inventaire Windows sans lecteur d’écran pilotable | historique / `91c1313c…` | restitution vocale et PDF/UA restent `NOT_VERIFIED` | intervention humaine avec lecteur d’écran réel et validateur PDF/UA |
| E | Stockage orphelin | inventaire multi-références; classification; exposition privée traitée de façon réversible; aucun effacement | accès métadonnées stockage et DB | INVENTAIRE_PRODUCTION_QUALIFIÉ_PARTIEL | `41361883831`: 145 objets; 29/29 référencés présents; 116 candidats / 690458654 octets; catégories, âges et versions agrégés | `c91543ef` / outil exécuté en production lecture seule | aucun candidat qualifié orphelin; rapprochement individuel historique requis | aucune suppression; appliquer le plan documenté si une remédiation distincte est autorisée |
| F | Bibliothèque → Knowledge/CORO AI | source typée, portée avant récupération, provenance/version, citation autorisée, remplacement/retrait, prompt injection; public isolé | architecture Knowledge; fournisseur simulé | DÉPLOYÉ / RÉCONCILIÉ | migration 166, tests ciblés et complets, CI, release `41360598223`, inspection `41361880281` | `c91543ef` / actif | génération fournisseur réelle non exercée; aucun coût engagé | conserver Bedrock désactivé; campagne fournisseur distincte seulement si autorisée |
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
- 2026-11-01 — source Bibliothèque typée implémentée au commit `64e8335a`: migration additive, priorité global/organisation/projet, citations ouvrables, retrait/fraîcheur, refus ClientUser et isolement public. PostgreSQL 16 à 166 migrations, 27/27 tests ciblés et deux builds PASS; aucun fournisseur réel activé.
- 2026-11-01 — inventaire stockage étendu: catégories/âges agrégés et versions non courantes, 9/9 tests PASS; aucune capacité de suppression.
- 2026-11-01 — PR #157 fusionnée au SHA `c91543ef`; release `41360598223` SUCCESS; inspection `41361880281` PASS/GO; migration 166, sauvegarde et restauration vérifiées, quatre images de rollback disponibles.
- 2026-11-01 — inventaire production final `41361883831` PASS : 145 objets / 814 284 456 octets, 29/29 références présentes, 116 candidats / 690 458 654 octets, aucune version non courante et aucune suppression.

## État de livraison explicite

| Élément | Implémenté | Testé | Publié | Fusionné | Déployé | Réconcilié | Clos |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Autorité et chemin rollback | oui | oui, QA isolée | oui | oui (`7eed82db`) | non applicable au produit; feature fermée | non, aucun rollback production exécuté | non, procédure opérationnelle réelle non démontrée |
| Inventaire divergences | oui | oui | oui | oui (`96800e95`) | workflow disponible | oui (`41356195887`) | oui, aucun conflit |
| Inventaire stockage multi-autorités | oui | oui | oui | oui (`96800e95`) | workflow disponible | oui (`41356195887`) | non, 116 candidats à qualifier |
| Bibliothèque → Knowledge/CORO AI authentifié | oui (`64e8335a`) | oui, déterministe + migration 166 | oui | oui (`c91543ef`) | oui | oui (`41361880281`) | oui pour récupération authentifiée; génération fournisseur réelle reste NOT_VERIFIED |
| Progression Projet | proposition seulement | analyse code | oui | oui (`7eed82db`) | aucune modification produit | non applicable | décision métier ouverte |
