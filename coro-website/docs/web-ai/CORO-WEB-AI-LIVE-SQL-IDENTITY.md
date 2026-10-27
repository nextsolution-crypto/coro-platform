# CORO Web AI — identité SQL publique

## Autorité prévue

`PUBLIC_KNOWLEDGE_DATABASE_URL` est obligatoire quand Public Knowledge est activé. Sinon, le service ne crée aucune connexion dédiée. Le runbook sépare correctement :

- une identité de migration temporaire;
- une identité runtime publique en lecture seule.

Le rôle runtime proposé reçoit seulement :

- `CONNECT` sur la base cible;
- `USAGE` sur le schéma public;
- `SELECT` sur `PublicKnowledgeSource`, `PublicKnowledgeChunk` et `PublicKnowledgeCapability`.

Il ne reçoit ni écritures, ni migration, ni accès aux tables privées.

## Preuves de conception et QA

Le test PostgreSQL jetable crée un rôle `NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT`, démontre la lecture du corpus, puis vérifie que la lecture de `ProjectFile` et une mise à jour du corpus sont rejetées. Le schéma Public Knowledge ne contient aucune colonne ou clé étrangère tenant, organisation, bâtiment, ClientUser ou ProjectFile.

## Risque de déploiement

Les privilèges ne sont volontairement pas encodés dans la migration Prisma; ils relèvent du provisionnement gouverné. Cela évite de livrer un secret SQL, mais signifie que la migration seule ne prouve pas l'existence ni les grants exacts du rôle de production.

## Contrôles préalables à une campagne réelle

Avec une inspection expurgée et sans révéler l'URL :

1. confirmer l'identité effective `current_user`;
2. lister les privilèges effectifs sur les trois tables publiques;
3. prouver l'absence de privilège sur `ProjectFile`, `Organization`, `Building`, utilisateurs et tables opérationnelles;
4. prouver le rejet d'INSERT/UPDATE/DELETE et DDL dans un environnement contrôlé;
5. confirmer TLS et le canal de secrets;
6. confirmer que l'API publique utilise cette URL, jamais `DATABASE_URL`;
7. confirmer la révocation indépendante de l'identité.

## Statut

| Élément                          | Statut                                              |
| -------------------------------- | --------------------------------------------------- |
| Modèle de moindre privilège      | PASS                                                |
| Test PostgreSQL jetable          | PASS dans l'historique CI; à rejouer avant campagne |
| Isolation structurelle du corpus | PASS                                                |
| Provisionnement production       | NOT_VERIFIED                                        |
| Grants production effectifs      | NOT_VERIFIED                                        |
| Connexion runtime production     | NOT_VERIFIED                                        |
