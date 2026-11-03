# Matrice d'acceptation REX et actions correctives

| Scénario | Preuve actuelle | Statut |
|---|---|---|
| Source unique incident/exercice/événement | contraintes SQL et tests PostgreSQL | PASS |
| Création REX idempotente | concurrence PostgreSQL | PASS |
| Constat et recommandation tenant-scoped | FK composites, service et tests | PASS |
| Décision sur recommandation | état `IN_REVIEW`, permission `REX_REVIEW` | PASS |
| Création action depuis recommandation acceptée | verrou REX + intention idempotente | PASS |
| Responsable admissible | résolution serveur User/ClientUser actif du tenant | PASS |
| Échéance et lecture | DTO et projection sûre | PASS |
| Réalisation avec preuve/commentaire | transition atomique | PASS |
| Vérification indépendante | auto-vérification refusée, tentative append-only | PASS |
| Rejet puis nouvelle réalisation | historique des tentatives conservé | PASS |
| Clôture idempotente | verrou et état `VERIFIED` requis | PASS |
| Preuve privée et intégrité | objet privé, taille et SHA-256 | PASS |
| Retrait de preuve | retrait logique et audit, aucun DELETE | PASS |
| Inter-tenant / hors bâtiment | scopes serveur et tests négatifs | PASS |
| Finalisation concurrente avec création d'action | sérialisation PostgreSQL | PASS |
| Brouillon lors d'une erreur/actualisation | tests `reviewDraftState.test.mjs` | PASS |
| Build backend et portail | builds locaux du candidat | PASS |
| Chrome 12/12 | à exécuter sur stack intégré | NOT_VERIFIED |
| Production authentifiée lecture seule | après livraison gouvernée | NOT_VERIFIED |
| Lecteur d'écran réel | observation humaine requise | NOT_VERIFIED |
