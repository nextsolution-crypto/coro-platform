# DISPLAY-03-REVIEW — Gouvernance documentaire

## Preuves

- FK composite `ProjectFile(id, organizationId, buildingId)`.
- `sourceVersion`, `sourceSha256`, `sourceApprovedById` et `sourceApprovedAt` figés.
- lecture des octets privés et comparaison SHA avant création, rendu, approbation et publication.
- source exigée `APPROVED`, effective, non expirée, non révoquée et non remplacée.

## Observations et corrections

Une révocation pouvait survenir après la vérification précédant `publish`. La transaction revérifie maintenant source et emplacement après acquisition du verrou de publication. Le contrat Player exécute aussi `assertCurrentAuthority`, ce qui lie version et hash exacts au `ProjectFile` courant.

Le source reste immuable dans le stockage privé. Une variante utilise une clé contenant version et SHA; aucun écrasement n’est permis. Les preuves historiques ne sont jamais supprimées.

## Risque résiduel

Un accès SQL privilégié peut toujours altérer directement certaines colonnes : la protection opérationnelle repose sur contrôle d’accès DB, audit et API. DISPLAY-04 devrait ajouter un manifeste de rendu signé et un worker à identité minimale.
