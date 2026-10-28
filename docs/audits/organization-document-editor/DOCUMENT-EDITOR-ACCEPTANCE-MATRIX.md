# Matrice d’acceptation — éditeur documentaire

| Domaine | Scénario | Statut | Preuve / limite |
|---|---|---|---|
| Baseline | SHA production et origin/main identiques | PASS | `12766061...` |
| Ouverture | PMU correct par ID autorisé | PASS | API et Chrome synthétiques |
| Ouverture | ID inter-tenant connu | PASS | 404, aucun document |
| Ouverture | PSI/PCA | NOT_VERIFIED | chemins présents, non exercés |
| Ouverture | PGC/PRA/PUE | NOT_VERIFIED | aucune preuve de support réel |
| Édition | Texte module 1 | PASS | PUT + relecture persistée |
| Édition | Modules 2–8 | PARTIAL | capacités présentes; lecture seule et autorité communes absentes |
| Sauvegarde | Persistance après relecture | PASS | contenu synthétique retrouvé |
| Sauvegarde | Erreur visible et reprise | FAIL | `console.error` seulement |
| Navigation | Changement section/langue avec saisie | FAIL | état local réinitialisé sans garde |
| Navigation | F5/retour avec saisie | FAIL | aucun `beforeunload` |
| Concurrence | Conflit entre deux écritures | FAIL | 200/200, dernière écriture gagnante |
| Autorisation | Projet d’une autre organisation | PASS | 404 |
| Autorisation | Permission d’édition distincte | FAIL | contrôle de lecture réutilisé |
| État | Projet `VALIDATED` immuable | FAIL | PUT 200 |
| État | Projet `ARCHIVED` immuable | FAIL | PUT 200 |
| Versions | Création/restauration/suppression gouvernées | FAIL | état et permission non contrôlés |
| Versions | Réponse minimisée | FAIL | snapshot complet retourné |
| Sécurité | XSS stockée | FAIL | élément rendu et handler exécuté |
| Sécurité | Validation dans le périmètre projet | FAIL | organisation seulement |
| Audit | Provenance de chaque mutation | FAIL | aucun événement canonique dans ces services |
| Responsive | 390/768/1440/2560 sans overflow | PASS | 12 captures réelles |
| Thèmes | Classic | PASS | `legacy/light` vérifié |
| Thèmes | Glass Light/Dark natifs | NOT_APPLICABLE | route `legacy-only`; dark influence le thème racine mais UI reste legacy |
| Accessibilité | Clavier/focus/annonces d’erreur | PARTIAL | contrôles natifs présents; focus modal et erreurs non gouvernés |
| Nettoyage | Données synthétiques restaurées | PASS | JSON de campagne |

## Verdict

`DOCUMENT_EDITOR_ACCEPTANCE: FAIL_SECURITY_AND_INTEGRITY_BLOCKERS`
