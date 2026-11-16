# INC-RP-01 — Stratégie de correspondance Reportperfect

## Principe de non-perte

Un import conserve toujours :

- système, tenant et export source;
- identifiant opaque source;
- libellé original, valeur originale et type observé;
- ligne/objet parent et ordre;
- fuseau/format d'origine;
- fichier brut privé, SHA-256 et date d'import;
- version de la table de correspondance;
- résultat `MAPPED`, `PARTIAL`, `UNMAPPED`, `CONFLICT` ou `REJECTED`.

Aucune donnée non reconnue n'est abandonnée. Elle reste consultable dans une
vue historique à accès contrôlé et n'est pas indexée dans Knowledge par défaut.

## Table de correspondance

| Attribut | Rôle |
|---|---|
| `sourceSystem` / `sourceSchemaVersion` | qualifie le dialecte d'import |
| `sourceFieldId` | identifiant stable si fourni |
| `sourceLabel` | libellé original exact |
| `canonicalFieldKey` | cible CORO facultative |
| `mappingStatus` | degré de confiance |
| `evidenceRef` | export/formulaire ayant justifié le mapping |
| `transformVersion` | transformation déterministe |
| `valueMap` | correspondance versionnée des listes |
| `lossPolicy` | interdit, toléré avec conservation, manuel |
| `reviewedBy` / `reviewedAt` | approbation du mapping |

## Pipeline

1. réception en stockage privé et empreinte;
2. détection du format sans exécution de contenu;
3. parsing dans une zone isolée;
4. normalisation syntaxique sans perte de l'original;
5. application d'une table de mapping approuvée;
6. rapport de couverture et conflits;
7. validation humaine des ambiguïtés;
8. création idempotente des rapports historiques;
9. réconciliation des comptes, bâtiments et références;
10. audit et manifeste de provenance.

## Règles de confiance

- `CONFIRMED` : champ et sémantique démontrés par un artefact client;
- `COMPATIBLE_TRANSFORM` : conversion déterministe et réversible;
- `MANUAL_REVIEW` : ambiguïté ou valeur hors liste;
- `UNMAPPED` : conservé uniquement dans l'enveloppe historique.

Une ressemblance de libellé ne suffit jamais. Le mapping n'invente pas un
bâtiment, une identité ou un fuseau. Les collisions et références hors tenant
bloquent l'import concerné sans mutation partielle silencieuse.

## Idempotence et reprise

L'unicité porte sur organisation, système source, objet source et empreinte.
Une reprise produit le même résultat ou un conflit explicite. Une nouvelle
version de mapping génère un aperçu de remappage; elle ne réécrit pas les
rapports publiés.

## Validation finale requise

Avant de revendiquer la parité : exécuter l'import d'un échantillon anonymisé,
comparer compte, cardinalités et valeurs, faire approuver les écarts et prouver
la consultation des éléments non mappés.
