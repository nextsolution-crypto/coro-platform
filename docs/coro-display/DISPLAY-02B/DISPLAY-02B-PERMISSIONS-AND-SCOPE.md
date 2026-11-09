# DISPLAY-02B — Permissions et portée

## Autorité

Un accès exige simultanément :

1. une identité active;
2. une organisation active identique à celle de la requête;
3. la permission Display exacte;
4. l'identifiant du bâtiment dans `displayBuildingIds`;
5. l'appartenance réelle de la ressource à cette organisation et ce bâtiment.

Les rôles `ADMIN`, `SUPER_ADMIN`, `OPERATOR` ou ClientUser ne confèrent aucun droit Display implicite.

## Permissions conservées

- `DISPLAY_READ`
- `DISPLAY_DEVICE_MANAGE`
- `DISPLAY_CONTENT_MANAGE`
- `DISPLAY_COMMAND`
- `DISPLAY_EMERGENCY_ACTIVATE`
- `DISPLAY_EMERGENCY_RESET`
- `DISPLAY_AUDIT_READ`

## Portée

`User.displayBuildingIds` et `ClientUser.displayBuildingIds` sont des listes explicites, vides par défaut. Une permission sans bâtiment est refusée. Une affectation à un bâtiment ne s'étend pas à un autre bâtiment du même tenant.

Une éventuelle granularité future étage/zone devra être additive et ne pourra pas élargir implicitement cette portée.
