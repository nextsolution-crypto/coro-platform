# DISPLAY-02A — Permissions

## Permissions persistées

| Permission | Usage prévu |
|---|---|
| DISPLAY_READ | Lire les fondations spatiales et, plus tard, l’état Display |
| DISPLAY_DEVICE_MANAGE | Muter étages, zones et emplacements; gérer plus tard les appareils |
| DISPLAY_CONTENT_MANAGE | Gérer plus tard publications et contenus approuvés |
| DISPLAY_COMMAND | Commandes ordinaires futures |
| DISPLAY_EMERGENCY_ACTIVATE | Activation d’urgence future seulement |
| DISPLAY_EMERGENCY_RESET | Réinitialisation d’urgence future seulement |
| DISPLAY_AUDIT_READ | Lecture d’audit future |

Les tableaux `User.displayPermissions` et `ClientUser.displayPermissions` ont `[]` comme valeur par défaut. Aucune migration n’accorde de permission et aucun rôle n’est converti en permission.

## Politique des API DISPLAY-02A

- Lecture : `DISPLAY_READ` exact.
- Mutation spatiale : `DISPLAY_DEVICE_MANAGE` exact.
- Tenant : l’organisation de la route doit égaler l’organisation canonique de la session.
- L’utilisateur et son organisation doivent être actifs.
- La permission est relue en base à chaque requête; elle ne provient pas du navigateur.
- Les ClientUser sont préparés au niveau du modèle et de la session, mais aucune route portail spatiale n’est exposée dans ce lot.

## Séparation sensible

Les permissions DEVICE_MANAGE, CONTENT_MANAGE, EMERGENCY_ACTIVATE et EMERGENCY_RESET sont des valeurs différentes. Aucun endpoint d’urgence n’existe dans ce lot; les tests de politique vérifient cette séparation sans fabriquer une capacité opérationnelle.

## Limite assumée

DISPLAY-02A ne fournit pas encore d’interface d’attribution de ces permissions. Leur administration gouvernée relève d’un lot ultérieur et devra respecter les périmètres organisation/bâtiment ainsi que l’audit.
