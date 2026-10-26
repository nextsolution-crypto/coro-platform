# Matrice de recette proposée — dashboard organisation

## Résultat exécuté — 2026-10-26

- Serveur/PostgreSQL réel isolé : **PASS**, 12 scénarios consolidés.
- Autorisation OPERATOR : **PASS** pour projets, recherche, mises à jour, activités récurrentes/à venir, délais et tâches.
- Portée ADMIN et isolation inter-organisation : **PASS**.
- Identité inactive et approbation refusée à l'OPERATOR : **PASS**.
- Panne partielle, message accessible et nouvelle tentative : **PASS**.
- États principal/partiel, fraîcheur et protection contre réponses anciennes : **PASS** par contrats ciblés et build TypeScript.
- Matrice navigateur : **12/12 PASS**, zéro débordement global/composant, zéro interaction `div[role=button]`, zéro erreur console critique.

| Viewport | Classic | Glass Light | Glass Dark |
|---|---|---|---|
| 390 × 844 | PASS | PASS | PASS |
| 768 × 1024 | PASS | PASS | PASS |
| 1440 × 900 | PASS | PASS | PASS |
| 2560 × 1440 | PASS | PASS | PASS |

La campagne utilise des données exclusivement synthétiques et n'émet aucune communication ni opération d'urgence. Les scénarios de mutation sur les écrans de destination restent hors de ce lot dashboard.

## Interactions

| Élément | Résultat attendu | ADMIN | OPERATOR | Production observée | Statut actuel |
|---|---|---|---|---|---|
| Nouveau projet | ouvre `/projects`; création soumise aux contrôles serveur | à tester | à tester | bouton visible SUPER_ADMIN | NOT_VERIFIED |
| KPI Projets actifs / Révision / Validés | chiffres issus de `/projects`, navigation `/projects` | code conforme | code conforme | rendu visible | PASS |
| KPI Mises à jour dues | périmètre de l'acteur, destination conformité | organisation | affectations seulement | zéro visible SUPER_ADMIN | FAIL_CODE |
| Approbation | seulement projets visibles et acteur approbateur | organisation | aucun élément non autorisé | aucun élément actuel | FAIL_CODE |
| Délai mandat | projet autorisé et route mandat | organisation | affectations | non présent dans la session | PASS |
| Activité à venir | seulement projets visibles, route activités | organisation | affectations | état vide visible | FAIL_CODE |
| Tâche échue | tâches réelles de l'acteur | selon rôle | selon affectation | faux état vide possible | FAIL_CODE |
| Document à renouveler | projet autorisé | organisation | affectations | absent dans la session | FAIL_CODE |
| Projet récent | projet autorisé, route détail | organisation | affectations | trois lignes observées | PASS |
| Recherche globale | résultats autorisés seulement | organisation | affectations | non exercée | FAIL_CODE |
| F5 / précédent / suivant | session et route cohérentes, aucune donnée résiduelle | à tester | à tester | chargement initial seulement | NOT_VERIFIED |

## Rôles et sécurité

| Scénario synthétique | Attendu | Statut |
|---|---|---|
| ADMIN organisation A | toutes les données de A, aucune donnée de B | NOT_VERIFIED |
| OPERATOR A affecté au projet A1 | A1 seulement dans tous les widgets et recherches | FAIL_CODE |
| OPERATOR A connaissant l'identifiant A2 | aucune lecture ou métadonnée A2 | NOT_VERIFIED |
| ADMIN/OPERATOR A connaissant un identifiant B | aucune donnée B | NOT_VERIFIED |
| Utilisateur désactivé | 401/403, session nettoyée, aucun cache visible | NOT_VERIFIED |
| Retrait d'affectation pendant session | disparition de toutes les données A1 après actualisation | NOT_VERIFIED |

## États

| État | Attendu | Statut |
|---|---|---|
| Chargement initial | indicateur accessible par zone | NOT_VERIFIED |
| Réponse lente | chargement sans faux zéro | NOT_VERIFIED |
| Organisation vide | état vide explicite et actions autorisées | NOT_VERIFIED |
| Filtre vide | NON_APPLICABLE — aucun filtre sur l'écran | NON_APPLICABLE |
| Un widget en échec | erreur locale et autres widgets conservés | FAIL_CODE |
| Erreur principale | message, retry, aucun KPI trompeur | FAIL_CODE |
| Session expirée | retour de connexion et purge visuelle | NOT_VERIFIED |
| Accès interdit | message/refus sans données | NOT_VERIFIED |
| Données périmées | fraîcheur indiquée | FAIL |

## Viewports et thèmes

| Viewport | Classic | Glass Light | Glass Dark | Notes |
|---|---|---|---|---|
| 390 × 844 | NOT_VERIFIED | NOT_VERIFIED | NOT_VERIFIED | cartes mobiles, tiroir de navigation, cibles tactiles |
| 768 × 1024 | NOT_VERIFIED | NOT_VERIFIED | NOT_VERIFIED | tableau 7 colonnes et point de rupture `md` |
| 1440 × 900 | NOT_VERIFIED | NOT_VERIFIED | NOT_VERIFIED | densité, navigation ouverte/repliée |
| 2560 × 1440 | NOT_VERIFIED | NOT_VERIFIED | NOT_VERIFIED | occupation utile et largeur du contenu |

Les anciennes captures Liquid Glass ne sont pas utilisées comme preuve fraîche. Le banc devra mesurer les bounding boxes du document, du contenu principal, des cartes, du tableau et du panneau latéral.

