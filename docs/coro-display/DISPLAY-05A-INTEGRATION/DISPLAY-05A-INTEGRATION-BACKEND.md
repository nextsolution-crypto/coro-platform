# DISPLAY-05A-INTEGRATION — Backend

## API

`GET /organizations/:organizationId/display-manager` fournit les capacités, indicateurs, bâtiments autorisés, plans, sources PDF admissibles et événements. Les mutations et lectures détaillées réutilisent `DisplayPlanPublicationService`, ses DTO validés et son audit.

La bibliothèque canonique `GET .../display-plan-publications` applique les filtres `status`, `floorId`, `locationId` et la pagination bornée `offset/limit`. L'intégration ajoute une preuve PostgreSQL directe pour ces comportements.

## Protections

- JWT et organisation active.
- Organisation du jeton identique à la route.
- Permissions Display persistées et relues côté serveur.
- Affectation bâtiment explicite.
- UUID de requête, verrou optimiste et motif.
- Empreintes et versions exactes.
- Historique borné et audit distinct.
- Messages sans clé de stockage ni contenu privé.

## Sources PDF

Une source proposée doit être PDF, approuvée avec identité/date, posséder un SHA-256, être effective, non expirée, non révoquée, non remplacée et appartenir à l'organisation/bâtiment autorisé.

## Correction

`AuthService` utilise désormais `UserRole` et un type minimal pour le dépôt `refreshToken`; le formatage historique du même fichier a été normalisé. Tests MFA/Auth, TypeScript et lint : PASS.
