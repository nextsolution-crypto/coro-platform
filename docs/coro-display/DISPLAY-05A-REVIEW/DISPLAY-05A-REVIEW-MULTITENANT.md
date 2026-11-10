# DISPLAY-05A-REVIEW — Cloisonnement multitenant

## Observations

Les requêtes du gestionnaire combinent l'organisation issue du jeton, l'organisation de route et les bâtiments explicitement affectés. Les publications, emplacements, étages, sources et événements sont filtrés par cette portée. Aucun UUID seul ne suffit à charger une publication.

## Tests

Les fixtures PostgreSQL créent plusieurs organisations et bâtiments distincts. Elles démontrent le refus ou l'absence de fuite pour les plans, documents, emplacements et historiques étrangers, y compris avec UUID connu. `plan-http-security.postgres-spec.ts` et `spatial-foundations.postgres-spec.ts` ajoutent les contrôles HTTP et spatiaux.

## Corrections

Les emplacements retournent maintenant leurs coordonnées « vous êtes ici » et orientation; seuls ceux dont l'autorité spatiale est complète sont proposés à la création.

## Risques résiduels

Aucune donnée client réelle n'a été utilisée. Le comportement navigateur inter-organisations reste à rejouer visuellement, sans modifier le verdict serveur.
