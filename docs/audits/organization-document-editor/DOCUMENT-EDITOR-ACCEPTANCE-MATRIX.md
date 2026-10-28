# Matrice d’acceptation — éditeur documentaire

Stack isolé : PostgreSQL 16, backend/frontend réels, stockage et fournisseurs QA, réseau deny-by-default.

| Domaine | Scénario | Statut | Preuve / limite |
|---|---|---|---|
| Types | PMU | PASS | États, concurrence, versions et Chrome. |
| Types | PSI/PCA | PASS | Génération canonique, sauvegarde et relecture de contenu riche. |
| Types | PGC/PRA/PUE | NOT_VERIFIED | Parcours complets non exécutés. |
| XSS | Événements, protocoles, HTML collé | PASS | Jest et Chrome réel; SVG/MathML interdits. |
| XSS | Historique/snapshot | PASS_SERVER | Assainissement à la lecture, restauration et export. |
| Autorisation | Autre organisation | PASS | GET/PUT 404. |
| Autorisation | Session révoquée | PASS | Refus serveur après désactivation de l’acteur synthétique. |
| Autorisation | Permission fine lecture seule | PARTIAL | Portée et action distinctes; permission fine absente du modèle canonique. |
| États | Projet VALIDATED / document VALIDATED / projet ARCHIVED | PASS | PUT 403 dans les trois cas. |
| Concurrence | Deux écritures | PASS | 200/409, une seule persiste. |
| Versions | Création, liste, lecture, refus | PASS | Liste sans snapshot; lecture explicite 200/404; validé 403. |
| Audit | Mutations réussies | PASS_CODE_UNIT | Métadonnées minimales, aucun audit de succès au refus. |
| Saisie | État sale/navigation/F5 | PASS_CODE_BUILD | Confirmation commune et `beforeunload`. |
| Saisie | 503/réponse perdue | NOT_VERIFIED | Aucun retry automatique; campagne réseau à compléter. |
| Responsive | 4 largeurs × 3 préférences | PASS | 12/12, sans overflow ni erreur console critique. |
| Accessibilité | Zoom 200 %, lecteur d’écran, focus | NOT_VERIFIED | Suivi UX distinct. |
| Nettoyage | Fixtures | PASS | PMU restauré, PSI/PCA supprimés, aucune production. |

`DOCUMENT_EDITOR_ACCEPTANCE: PASS_SECURITY_AND_INTEGRITY_WITH_DOCUMENTED_UX_LIMITS`

Ce verdict autorise une PR et une revue, pas une fusion ni un déploiement.
