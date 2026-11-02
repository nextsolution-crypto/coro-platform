# Registre maître — clôture des réserves de consolidation

## Réconciliation de clôture du 2026-11-02

- Décisions produit enregistrées : `PDF_UA_EXCLU_V1` et `PROGRESSION_DÉCLARÉE`.
- PR #159 fusionnée au SHA `b0183e56c0b84a7b8eb3c7f9d55efef7345c83d5`; CI main `41365027388` et release gouvernée `41365428137` : SUCCESS.
- Inspection post-release `41366771019` : `PASS/GO`; SHA actif exact `b0183e56c0b84a7b8eb3c7f9d55efef7345c83d5`; PostgreSQL 16.15; 166 migrations; tête `20261119010000_library_knowledge_source_authority`; verrou libre.
- Digests actifs : backend `sha256:0215801c6c3b7302fe8b4413d1a0e2f88d8cd8b4198fd74c6aa6f0d94f3a79b1`; frontend `sha256:d6f2ffcfb7074c98b7fbdaa045de4c7fb518accafe6809e6183cf647b255fc29`; portail `sha256:b964e0dad7cc82d1ce6b22a57b358cddf034473a5857adbacad4b85d831ebc24`; site `sha256:0ab6fb7f9eca105acb33839043c7629f453e17ded0201cb1df727209a26d0add`.
- Sauvegarde `production-20261102T001849Z-8c66880152c4` : `REMOTE_VERIFIED`; restauration `20261102T001913Z-6d4937579d6f` : `RESTORE_VERIFIED`; quatre images de rollback disponibles; disque 28 725 664 Ko libres (65 % utilisé).
- Recette Chrome production : libellé « Progression déclarée » vérifié sur liste, fiche Projet, Dashboard et administration; aide concise visible sur la fiche; score qualité distinct; F5 concluant.
- Citation Bibliothèque : la réponse authentifiée sur PC014 a présenté une citation ouvrable; source globale, version `2026-08-23T21:09:43.289Z` et empreinte `81fb773211443a2d48e928e31eb51d6bccd5dfd1c60caa385de819ad72e4943d` vérifiées avant et après F5. Le fournisseur affiché était déjà `CORO AI · AWS Canada`; aucun flag, secret ou fournisseur n'a été activé pendant cette recette. Cette observation ne constitue pas une validation générale de génération IA.
- Invitation interne : formulaire préparé pour une identité QA minimale vers l'unique destinataire autorisé `info@getcoro.io`; aucun envoi effectué sans confirmation d'action immédiate.
- Lecteur d'écran réel : `NOT_VERIFIED`; aucun NVDA, JAWS ou VoiceOver pilotable n'est disponible. La preuve DOM n'est pas requalifiée en restitution vocale.
- Stockage : les 116 candidats sont conservés; aucune suppression; qualification restante maintenue dans `STORAGE-CANDIDATE-QUALIFICATION-PLAN.md`.

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
| Produit actif de référence | `b0183e56c0b84a7b8eb3c7f9d55efef7345c83d5` | release `41365428137`; inspection `41366771019` |
| PostgreSQL | 166 migrations; tête `20261119010000_library_knowledge_source_authority` | inspection `41366771019` |
| Capacité post-release | 28 725 664 Ko libres; verrou libre | inspection `41366771019` |

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
| D | Accessibilité et PDF | périmètre déclaré; lecteur d’écran réel représentatif; défauts partagés corrigés; analyse PDF PMU/PSI/PCA et limites honnêtes | NVDA/JAWS/VoiceOver | DÉCISION PDF CLOSE / LECTEUR D’ÉCRAN NOT_VERIFIED | `PDF_UA_EXCLU_V1`; clavier/focus/zoom et PDF extractible couverts; script humain prêt | candidat final à renseigner | aucune certification PDF/UA; restitution vocale réelle non exécutée | conserver l’exclusion V1; exécuter la recette humaine lorsqu’un lecteur réel est disponible |
| E | Stockage orphelin | inventaire multi-références; classification; exposition privée traitée de façon réversible; aucun effacement | accès métadonnées stockage et DB | INVENTAIRE_PRODUCTION_QUALIFIÉ_PARTIEL | `41361883831`: 145 objets; 29/29 référencés présents; 116 candidats / 690458654 octets; catégories, âges et versions agrégés | `c91543ef` / outil exécuté en production lecture seule | aucun candidat qualifié orphelin; rapprochement individuel historique requis | aucune suppression; appliquer le plan documenté si une remédiation distincte est autorisée |
| F | Bibliothèque → Knowledge/CORO AI | source typée, portée avant récupération, provenance/version, citation autorisée, remplacement/retrait, prompt injection; public isolé | architecture Knowledge; fournisseur simulé | DÉPLOYÉ / RÉCONCILIÉ | migration 166, tests ciblés et complets, CI, release `41360598223`, inspection `41361880281` | `c91543ef` / actif | génération fournisseur réelle non exercée; aucun coût engagé | conserver Bedrock désactivé; campagne fournisseur distincte seulement si autorisée |
| G | Indicateurs Projet et Dashboard | formules/sources documentées; fixtures indépendantes; libellés exacts; preuves ciblées multi-rôle | décision `PROGRESSION_DÉCLARÉE` | DÉPLOYÉ / RÉCONCILIÉ | valeur manuelle persistée; libellés « Progression déclarée »; Manuel, test contractuel, TypeScript, build et recette Chrome production | `82ee97b8` testé / `b0183e56` actif | score qualité distinct; aucun calcul automatique ni jalon implicite | aucune action produit; surveiller les régressions |
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
- 2026-11-02 — PR #159 fusionnée; release `41365428137` SUCCESS; inspection `41366771019` PASS/GO; SHA actif `b0183e56`; libellés et aide « Progression déclarée » vérifiés en Chrome production et après F5.
- 2026-11-02 — citation Bibliothèque PC014 ouverte dans le portail authentifié; portée, version et empreinte vérifiées après F5. L'interface signalait AWS Canada déjà actif; aucune activation n'a été réalisée et la génération réelle reste hors verdict global.

## État de livraison explicite

| Élément | Implémenté | Testé | Publié | Fusionné | Déployé | Réconcilié | Clos |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Autorité et chemin rollback | oui | oui, QA isolée | oui | oui (`7eed82db`) | non applicable au produit; feature fermée | non, aucun rollback production exécuté | non, procédure opérationnelle réelle non démontrée |
| Inventaire divergences | oui | oui | oui | oui (`96800e95`) | workflow disponible | oui (`41356195887`) | oui, aucun conflit |
| Inventaire stockage multi-autorités | oui | oui | oui | oui (`96800e95`) | workflow disponible | oui (`41356195887`) | non, 116 candidats à qualifier |
| Bibliothèque → Knowledge/CORO AI authentifié | oui (`64e8335a`) | oui, déterministe + migration 166 | oui | oui (`c91543ef`) | oui | oui (`41361880281`) | oui pour récupération authentifiée; génération fournisseur réelle reste NOT_VERIFIED |
| Progression Projet | oui, libellés + Manuel | oui, contrat 2/2, Manuel 24/24, TypeScript et build | oui | oui (`b0183e56`) | oui | oui (`41366771019`) | oui pour la décision et les interfaces |
