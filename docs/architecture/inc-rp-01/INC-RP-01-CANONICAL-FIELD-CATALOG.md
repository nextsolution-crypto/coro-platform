# INC-RP-01 — Catalogue canonique extensible

## Principes

Le catalogue décrit des champs versionnés. Le contenu d'un rapport est une
structure validée contre la version figée de son modèle. Ajouter un champ
personnalisé ne requiert pas une migration Prisma.

Chaque définition possède au minimum :

```json
{
  "fieldKey": "incident.occurredAt",
  "version": 1,
  "label": { "fr": "Date et heure", "en": "Date and time" },
  "type": "datetime",
  "cardinality": "one",
  "requirement": "required",
  "sensitivity": "internal",
  "source": "CORO_PROPOSED",
  "validation": { "timezoneRequired": true },
  "prefill": { "source": "serverClock", "editable": true }
}
```

`fieldKey` est stable, qualifié et insensible au libellé. Les champs clients
utilisent `custom.<organizationId>.<key>`. Les libellés et listes sont
localisables et versionnés.

## Types supportés

`text`, `textarea`, `integer`, `decimal`, `boolean`, `date`, `time`,
`datetime`, `duration`, `enum`, `multi_enum`, `reference`, `address`, `geo`,
`person_collection`, `vehicle_collection`, `equipment_collection`,
`witness_collection`, `intervention_collection`, `attachment_collection` et
`acknowledgement`.

Le texte riche arbitraire et le HTML actif ne sont pas admis. Les présentations
sont rendues depuis des valeurs structurées et échappées.

## Métadonnées obligatoires

- identité : clé, version, espace de noms, libellé, aide;
- sémantique : type, unité, cardinalité, valeur nulle;
- exigence : `required`, `optional`, `conditional`, `computed`, `prefilled`;
- validation : longueur, plage, format, précision, valeurs autorisées;
- visibilité : expression déclarative sans code exécutable;
- gouvernance : origine/preuve, sensibilité, rétention, exportabilité;
- accès : classes de lecteurs/éditeurs et politique de masquage;
- recherche : indexable, filtrable, triable, normalisation;
- migration : alias source et transformations explicitement versionnées.

## Noyau CORO proposé

| Espace | Champs canoniques essentiels |
|---|---|
| identité | `report.number`, `report.type`, `report.status`, `report.title` |
| portée | `scope.organization`, `scope.building`, `scope.floor`, `scope.zone`, `scope.location` |
| événement | `incident.occurredAt`, `incident.discoveredAt`, `incident.reportedAt`, `incident.category`, `incident.priority`, `incident.description` |
| auteur | `author.actorType`, `author.actorId`, `author.displayNameSnapshot` |
| personnes | `people.involved[]`, `people.witnesses[]`, `people.responders[]` |
| biens | `assets.vehicles[]`, `assets.equipment[]`, `assets.damage[]` |
| intervention | `response.interventions[]`, `response.servicesCalled[]`, `response.actionsTaken` |
| suivi | `followup.correctiveActions[]`, `followup.notifications[]`, `followup.closureSummary` |
| preuve | `evidence.attachments[]`, `evidence.externalReferences[]` |
| gouvernance | `governance.templateVersion`, `governance.contentHash`, `governance.provenance` |

Les détails de personne ou de véhicule restent des sous-schémas configurables;
seules les données pertinentes sont demandées.

## Règles d'extension

1. Une version publiée est immuable.
2. Une nouvelle définition n'altère aucun rapport historique.
3. Une suppression logique conserve la définition pour la lecture historique.
4. Les expressions conditionnelles référencent uniquement des clés présentes.
5. Toute valeur calculée indique sa formule versionnée et ses sources.
6. Le serveur valide contenu, portée et permissions; le client ne fait que
   guider la saisie.
7. Les données inconnues importées restent dans `legacyPayload` et ne sont pas
   promues automatiquement au catalogue.

## Condition de gel

Le catalogue est prêt pour une fondation technique, mais sa parité RP demeure
conditionnelle à l'échantillon client. Le modèle Prisma doit stocker les
définitions et contenus versionnés, non une colonne par champ métier.
