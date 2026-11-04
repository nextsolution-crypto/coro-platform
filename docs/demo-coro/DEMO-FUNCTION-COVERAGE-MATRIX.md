# Matrice de couverture fonctionnelle Démo

| Domaine | Scénario cible | Classement actuel | Condition restante |
|---|---|---|---|
| Tableau de bord, clients, bâtiments | Portefeuille fictif multi-sites | DEMONTRABLE après provisionnement | QA et navigateur |
| Projets PMU/PSI/PCA | États variés, progression déclarée | DEMONTRABLE après provisionnement | Documents et transitions métier |
| Documents privés et Knowledge | Upload, REVIEW, APPROVED, téléchargement, indexation, citation, révocation | PASS intégré local | Provisionnement gouverné du tenant et recette UI restent requis |
| Activités et planning | 3 activités, 4 tâches, échéances et états variés | FIXTURES_VALIDÉES_LOCAL | Recette UI et réservation client restent à faire |
| Timelog et Rendement | 3 mandats, 4 saisies de temps, 11,5 h attendues | PASS calcul intégré local | Marges volontairement indisponibles tant que vente/taux ne sont pas gouvernés |
| Réservations | Conseiller ↔ client, ICS | NOT_VERIFIED | Identité ClientUser et parcours produit requis |
| Carte et suivi documentaire | Six sites et états variés | DEMONTRABLE après provisionnement | QA visuel et tuiles simulées |
| Bibliothèque | Catalogue global en lecture seule | DEMONTRABLE | Ne pas modifier le catalogue global |
| Knowledge | Recherche et citations autorisées | DEMONTRABLE après indexation | Sources synthétiques et fraîcheur |
| CORO AI authentifié | Génération réelle | BLOQUEE_PAR_DEPENDANCE | Fournisseur réel désactivé; ne pas simuler comme réel |
| Sentinelle | 2 employés et 4 présences synthétiques | FIXTURES_VALIDÉES_LOCAL | Recette API/UI et rôles d'urgence restent requis |
| Incident et exercices | Exercice résolu, REX descriptif, aucun jeton public | FIXTURES_VALIDÉES_LOCAL | Cycle de mutation produit et UI restent requis |
| REX et actions correctives | 2 actions liées au REX synthétique | PARTIAL | Parcours complet preuve/fermeture et UI restent requis |
| Résilience | Évaluation et résultats explicables | DEMONTRABLE après provisionnement | Fixtures et vérification des calculs |
| Sentinelle Population | Scénarios et messages simulés | DEMONTRABLE_AVEC_SIMULATION_EXPLICITE | Transport externe interdit |
| Paramètres et administration | Lecture et gestion limitée au tenant | DEMONTRABLE | Aucun SUPER_ADMIN |
| Portail client | Corporate/manager et affectations | DEMONTRABLE après provisionnement | Identités secondaires et MFA normal |
| PGC, PRA, PUE | Selon support réel seulement | NON_DISPONIBLE tant que non qualifié | Ne pas présenter comme livré |

Cette matrice est évolutive. `DEMONTRABLE` ne devient `PASS` qu'après exécution du scénario sur le candidat exact.
