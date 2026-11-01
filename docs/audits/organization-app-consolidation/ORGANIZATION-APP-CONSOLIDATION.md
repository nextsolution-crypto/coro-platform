# Bilan consolidé — application organisation CORO

## Synthèse pour Mathieu

### Ce qui est terminé

La campagne a corrigé et accepté les principaux écrans de l’application organisation : sécurité des périmètres, états d’erreur, concurrence, reprise, responsive et parcours métier ciblés. Les 18 périmètres recensés sont présents dans l’historique du produit actif `91c1313c393bd630489e66e26aa5557ca53c2dd`. Les lots les plus récents — Clients, Bâtiments, Carte, Conformité, Bibliothèque, Manuel et Paramètres — disposent en plus d’une livraison et d’une inspection de production explicitement réconciliées.

### Ce qui reste

Les réserves principales ne sont pas des régressions générales : lecteur d’écran réel non exercé; PDF non balisé/PDF-UA non démontré; PGC, PRA et PUE hors acceptation documentaire; signature réelle et valeur juridique non validées; catalogue Bibliothèque non raccordé à Knowledge ou aux assistants; divergences historiques de paramètres à confirmer par un administrateur; inventaire des objets de stockage orphelins incomplet; rollback vers certaines anciennes images susceptible de réintroduire des défauts corrigés.

### Ce qui peut être présenté

- gestion organisationnelle des projets, clients et bâtiments avec isolation et affectations;
- activités, réservations, timelog et planification d’équipe dans le périmètre validé;
- génération, édition, révision indépendante et export PDF pour PMU, PSI et PCA;
- carte avec fond OSM facultatif, liste de repli et géocodage public désactivé;
- suivi documentaire factuel de conformité, sans attestation réglementaire;
- Bibliothèque globale en lecture seule, Manuel guidé et Paramètres gouvernés.

### Ce qu’il faut éviter de promettre

Ne pas annoncer « CORO fonctionnel à 100 % », une conformité réglementaire globale, une signature juridiquement validée, un PDF accessible PDF/UA, un SLA cartographique, une indexation IA de tout fichier ou un raccordement IA du catalogue Bibliothèque. Les résultats du portail client conservent leur propre périmètre commercial.

### Prochaine action recommandée

Traiter en priorité la matrice de rollback de sécurité et l’accessibilité réelle, puis décider explicitement du raccordement gouverné Bibliothèque → Knowledge/CORO AI. Aucun de ces travaux n’est lancé par ce bilan.

## Baseline vérifiée

| Élément | Référence |
| --- | --- |
| Produit actif | `91c1313c393bd630489e66ee26aa5557ca53c2dd` |
| Dernière clôture documentaire | PR #152, `f90fb03ed3b3dfd4c9b4c23585d533ba1a53cf4b` |
| PostgreSQL | 165 migrations |
| Tête | `20261118010000_organization_settings_governance` |
| Release produit | workflow `41348342595` — SUCCESS |
| Inspection post-release | `41349712708` — SUCCESS |
| Capacité post-release | `41349728310` — SUCCESS |

La PR documentaire #152 a ensuite passé la CI `41351348515`; ses jobs de construction d’images et de release ont été ignorés. Aucun déploiement n’a donc remplacé le SHA produit actif.

## Lecture correcte des preuves

| Niveau | Ce qu’il prouve | Ce qu’il ne prouve pas |
| --- | --- | --- |
| QA synthétique | scénarios multi-acteurs, refus, concurrence, pannes et responsive sur données contrôlées | comportement de données clientes réelles |
| CI | compilation, tests et contrôles du commit | présence en production |
| Release | déploiement du SHA et des images du candidat | acceptation fonctionnelle exhaustive |
| Inspection technique | SHA, services, PostgreSQL, migrations, sauvegarde, restauration, capacité | rendu et parcours utilisateur |
| Observation authentifiée | affichage et navigation en lecture seule | mutations non exercées en production |

## Parcours transversaux

| Parcours | Maillons démontrés | Limite |
| --- | --- | --- |
| Conseiller → client | activité créée, visibilité du bon client, réservation et lecture conseiller | fournisseur réel de notification non exercé |
| Client → conseiller | réservation, visibilité et annulation propriétaire en QA | ne constitue pas une campagne portail client complète |
| Client et bâtiment | création atomique, affectations, isolation, suspension héritée | invitations réelles non envoyées pendant ces lots |
| Retrait d’accès | session, MFA, appareil, liens et téléchargement refusés à la requête suivante | lecteur d’écran réel non exercé |
| Document complet | génération → édition → sauvegarde → soumission → revue indépendante → décision → PDF | PMU/PSI/PCA seulement; signature séparée |
| Document → Knowledge | stockage privé et autorisé prouvé; ProjectFile est la source admissible | ingestion/citation non rejouée sur le SHA actuel par cette campagne |
| Activité → réservation | création, réservation, report/annulation, idempotence | aucune notification externe réelle |
| Invitation → authentification | outbox chiffrée, jeton haché, MFA et révocation en QA | fournisseur réel interne non exercé dans Paramètres |
| Désactivation → réactivation | session refusée, anciens liens invalides, nouvelle authentification exigée | aucune restauration d’ancienne session |

## Knowledge et CORO AI

| Source | Stockage / extraction | Recherche / citations | Autorisation / retrait | Statut démontré |
| --- | --- | --- | --- | --- |
| Documents de bâtiment | ProjectFile privé; admissibilité par version approuvée | capacité Knowledge ProjectFile existante, non rejouée ici sur le SHA actif | tenant, bâtiment, confidentialité et cycle source | PARTIEL dans cette campagne |
| Documents de projet | stockage privé, versions et SHA-256 validés | même autorité ProjectFile; aucune promesse d’extraction universelle | accès projet canonique et retrait de version | PARTIEL dans cette campagne |
| Catalogue Bibliothèque | données structurées globales, pas des ProjectFile | aucune indexation/recherche Knowledge | lecture globale; mutations interdites | `NON_CONNECTÉ` |
| Manuel | contenu éditorial et recherche guidée | recherche déterministe, pas une réponse IA | visibilité selon rôle et liens existants | CONNECTÉ AU MANUEL, PAS À L’IA |
| CORO AI authentifié | ProjectFile/chunks autorisés selon l’architecture existante | catalogue Bibliothèque absent | pas de fallback Platform Authority | Bibliothèque `NON_CONNECTÉE` |
| Assistant public | corpus public séparé | aucune donnée privée ni catalogue Bibliothèque | isolation publique | Catalogue `NON_CONNECTÉ` |

Le complément produit éventuel est un adaptateur de source gouverné, versionné et autorisé pour le catalogue. Il doit couvrir provenance, portée global/organisation/projet, mise à jour, retrait et refus public. Il n’est ni implémenté ni activé ici.

## Exploitation

| Domaine | État consolidé |
| --- | --- |
| Sauvegarde / restauration | `REMOTE_VERIFIED` / `RESTORE_VERIFIED` dans la dernière release |
| Capacité | gate post-release SUCCESS; dernière marge documentée suffisante |
| Rétention | automatisation gouvernée fusionnée avant les derniers lots; exécutions observées lors de releases ultérieures |
| Journaux | politique de rotation présente; sa surveillance continue reste opérationnelle |
| Images | actif et jeu complet de rollback protégés; vérification juste avant suppression |
| Verrou | partagé par déploiement, maintenance et inspection; libéré après réconciliation |

La configuration d’une automatisation ne vaut pas preuve d’exécution permanente. Les dernières releases démontrent son passage, pas toutes les échéances périodiques futures.

## Verdict de campagne

`CAMPAGNE_ÉCRANS_PRINCIPAUX_CONSOLIDÉE — PÉRIMÈTRES_ACCEPTÉS_AVEC_RÉSERVES_DOCUMENTÉES`

Ce verdict ne transforme pas les limites en PASS et ne constitue ni une acceptation commerciale globale de CORO, ni une validation de tous les modules.

## Sources

La matrice détaillée renvoie aux rapports sous `docs/audits/organization-*`. Les références de livraison et limites sont consolidées dans [ORGANIZATION-APP-ACCEPTANCE-MATRIX.md](./ORGANIZATION-APP-ACCEPTANCE-MATRIX.md) et [ORGANIZATION-APP-OPEN-ITEMS.md](./ORGANIZATION-APP-OPEN-ITEMS.md).
