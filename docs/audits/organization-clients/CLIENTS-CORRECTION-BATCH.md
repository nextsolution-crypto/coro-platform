# Lot correctif recommandé — Clients

Un lot cohérent est recommandé, sans modification dans le présent audit :

1. Autorité commune des mutations Client : ADMIN/SUPER_ADMIN, refus avant service.
2. DTO fermés pour création, modification et logo; limites de taille/type côté serveur.
3. Transaction canonique pour Client et ClientUser, puis outbox d’invitation idempotente.
4. Traitement explicite des collisions `User`/`ClientUser`, sans réaffectation implicite.
5. Désactivation gouvernée : décision métier documentée, révocation des sessions/liens selon la politique retenue.
6. États frontend distincts pour 401/403/404/409/503, reprise et conservation de saisie.
7. Confirmation décrivant « désactiver » et ses conséquences réelles.
8. Modale accessible et affichage des actions selon la capacité serveur, sans considérer le masquage comme autorisation.

Recette intégrée requise : deux organisations, plusieurs clients, ADMIN, opérateurs affecté/non affecté, identités désactivées, `CLIENT_MANAGER` et `CLIENT_CORPORATE`; API/PostgreSQL puis Chrome 12/12. Les courriels restent simulés.

Décision métier indispensable : définir si la désactivation d’une fiche Client doit révoquer immédiatement tous les accès portail associés ou seulement empêcher de nouvelles opérations, et comment conserver l’accès historique en lecture.
