# DISPLAY-02A-REVIEW — Permissions

## Résultat

Les sept permissions sont présentes et distinctes :

- `DISPLAY_READ`
- `DISPLAY_DEVICE_MANAGE`
- `DISPLAY_CONTENT_MANAGE`
- `DISPLAY_COMMAND`
- `DISPLAY_EMERGENCY_ACTIVATE`
- `DISPLAY_EMERGENCY_RESET`
- `DISPLAY_AUDIT_READ`

Les tableaux de `User` et `ClientUser` sont vides par défaut. La migration n'accorde aucun droit. Ni `ADMIN` ni `SUPER_ADMIN` n'obtient implicitement une permission Display. L'autorisation relit l'utilisateur, son activité, son organisation active et la permission exacte en base à chaque requête.

Les API 02A exigent `DISPLAY_READ` pour lire et `DISPLAY_DEVICE_MANAGE` pour muter. Aucun endpoint de commande, publication, audit Display ou urgence n'existe.

## Cloisonnement

La route doit correspondre à l'organisation canonique de la session. Les requêtes de ressources sont ensuite limitées au bâtiment de la route. Les tests couvrent le tenant incorrect et la permission manquante.

## Réserve de conception

Une permission Display interne est actuellement valable sur les bâtiments accessibles par ces routes dans l'organisation; il n'existe pas encore d'affectation Display par bâtiment pour les `User`. Cette absence n'est pas une élévation inter-tenant, mais elle doit être résolue ou explicitement acceptée avant de livrer une interface d'administration des permissions. Les `ClientUser` ne disposent d'aucune route spatiale 02A.
