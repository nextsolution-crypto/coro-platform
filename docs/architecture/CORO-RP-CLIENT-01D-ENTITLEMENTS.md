# CORO Report CLIENT-01D — entitlements sélectifs

## Décision

CLIENT-01D réutilise le moteur canonique `CapabilityEntitlement`. Il ne crée ni
un second système de droits, ni une liste spéciale fondée sur le nom ou le
domaine d'un client. Six capacités commerciales détaillées sont ajoutées au
catalogue : Report, main courante, quarts, consignes, suivis et poste de
sécurité intégré.

La décision serveur est fail-closed :

`exact-true global flag AND site entitlement EFFECTIVE AND individual permission AND active building assignment`

Le contexte organisation/client/bâtiment et l'identité `CLIENT_USER` sont
relus dans PostgreSQL. Aucun identifiant ou droit déclaré par le navigateur ne
fait autorité. Les entitlements sont limités à la portée `SITE`; les portées
organisation et client sont explicitement interdites pour ces capacités.

## Gouvernance

- Les cinq flags existants restent des arrêts globaux immédiats.
- Aucun entitlement n'est créé par les migrations.
- Aucune permission n'est attribuée implicitement, y compris aux administrateurs clients.
- Les dates, révisions, auteurs, révocations et audits restent ceux du moteur canonique.
- Les routes métier conservent leurs contrôles existants; la politique
  commerciale est un garde supplémentaire.
- Un refus métier reste un `404` générique. L'API de découverte publique ne
  retourne que `AVAILABLE` ou `NOT_AVAILABLE` et ne divulgue pas le garde en
  échec.

## Contrat CLIENT-01E

`GET /client-portal/organizations/:organizationId/operational-capabilities?buildingId=:buildingId`

La route est protégée par `ClientJwtGuard`. Elle retourne les six capacités et
leur disponibilité effective pour l'identité et le bâtiment courants. Le
portail doit masquer la navigation indisponible, mais toute API demeure
protégée indépendamment. Une révocation d'entitlement, de permission,
d'affectation ou de session prend effet lors de la requête serveur suivante.

## Activation Démo ultérieure

Une activation gouvernée devra, dans cet ordre : vérifier l'organisation
canonique `916f54ec-af22-45e0-99db-a369d9630002`, confirmer `ACTIVE/SIMULATE`,
résoudre uniquement des bâtiments couverts par des `DemoFixtureRecord` actifs,
créer les entitlements site datés, puis attribuer séparément les permissions et
affectations minimales. Le manifeste de préparation reste `enabled=false` et
toutes les communications externes y sont bloquées.

Cette PR ne réalise aucune de ces mutations.

## Rollback

Les gardes applicatifs peuvent être désactivés immédiatement par les flags
globaux. Une révision d'entitlement peut être révoquée sans supprimer
l'historique. La migration est additive; les anciennes capacités restent
inchangées. Le retrait des valeurs d'enum n'est pas requis pour un rollback
applicatif.
