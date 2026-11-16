# ADR — Agrégat de rapports Incident gouvernés

## Décision

`IncidentReport` est un agrégat autonome. Il peut référencer un
`IncidentEvent`, mais ne dépend ni de Sentinelle, ni d'un exercice, ni d'un
projet. Le journal Incident demeure une source et n'est jamais réécrit.

Les formulaires et contenus sont JSON structurés, validés par une version de
modèle immuable. Les champs personnalisés n'ajoutent pas de colonnes Prisma.
Les données sources inconnues restent dans une enveloppe historique privée.

## Conséquences

- contraintes composites organisation/ressource;
- version soumise immuable et nouvelle version pour toute correction;
- export PDF serveur distinct de l'impression navigateur;
- pièces jointes privées en quarantaine avant admissibilité;
- projection Knowledge limitée aux versions publiées admissibles;
- activation serveur `INCIDENT_REPORTS_ENABLED=false` par défaut.

La parité exacte Reportperfect reste conditionnelle à un artefact client.
