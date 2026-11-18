# CLIENT-01B — Revue de sécurité

## Contrôles démontrés

- FK composites tenant + type + identifiant vers une identité concrète.
- Refus PostgreSQL d’un `ClientUser` réel utilisé sous une autre organisation.
- Permissions et affectations bâtiment vérifiées côté serveur.
- Séparation des identités internes, clientes et système.
- Soumission/approbation comparées sur le couple `(actorType, actorId)`.
- Révocation effective au prochain appel, sans droits incorporés depuis un DTO.
- Audits et décisions probantes non modifiables.
- Feature flags Report et Opérations inchangés et désactivés par défaut.

## Réserves

- Les contrôleurs portail client seront ajoutés seulement dans CLIENT-01C; aucune nouvelle route client n’est exposée ici.
- Les colonnes historiques sont conservées pendant la phase expand. Leur retrait éventuel exige une phase contract distincte après observation.
- La recette multirôle navigateur reste un gate de CLIENT-01C, pas une preuve de ce lot de fondation.
