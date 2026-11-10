# Permissions client

## Observations et preuves

Les cinq permissions `DISPLAY_CLIENT_*` sont distinctes des permissions du Display Manager. Le serveur recalcule l’intersection `buildingIds ∩ displayBuildingIds`; une liste vide reste vide. Le garde JWT recharge l’utilisateur canonique et refuse utilisateur/client inactif ou `sessionVersion` révoquée.

## Tests

Tests unitaires : absence de permission, bâtiment hors portée et prévisualisation sans permission refusés. PostgreSQL : un auteur, un pair du même tenant et un utilisateur étranger; le pair ne lit pas l’observation privée de l’auteur.

## Risque résiduel

Expiration et MFA via navigateur : `NOT_VERIFIED` dans cette passe.
