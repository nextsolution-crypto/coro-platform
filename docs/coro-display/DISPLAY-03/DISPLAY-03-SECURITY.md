# DISPLAY-03 — Sécurité

Contrôles : authentification JWT, tenant exact, affectation bâtiment, permission Display explicite, relations composites, source APPROVED/effective/non expirée, emplacement actif, vérification SHA avant rendu et avant approbation/publication, stockage privé immuable.

Les transitions sont atomiques et protégées contre les courses. Les réponses Player ne contiennent pas de clé de stockage ni d’URL publique; elles indiquent un endpoint de téléchargement réautorisé. Les audits n’incluent aucun contenu documentaire.

Les tests démontrent le refus inter-bâtiment, l’auto-revue refusée et la révocation immédiate. Une campagne de sécurité plus large (inter-tenant, fuzzing DTO, concurrence multi-processus) reste recommandée avant exposition publique.
