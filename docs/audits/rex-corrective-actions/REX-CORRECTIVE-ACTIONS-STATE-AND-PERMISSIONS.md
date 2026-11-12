# États et permissions REX / actions correctives

## REX

| Opération | État requis | Permission ClientUser |
|---|---|---|
| Créer | source admissible terminée/publiée selon son type | `REX_CREATE` |
| Modifier synthèse/constats/recommandations | `DRAFT` | `REX_EDIT` |
| Soumettre | `DRAFT` | `REX_REVIEW` |
| Décider une recommandation | `IN_REVIEW` | `REX_REVIEW` |
| Finaliser | `IN_REVIEW` | `REX_FINALIZE` |
| Générer le rapport REX | `FINALIZED` | `REX_FINALIZE` |

Un REX finalisé et ses enfants sont immuables. Les actions déjà liées continuent leur cycle; aucune nouvelle action ne peut être rattachée après finalisation.

## Action corrective

| Opération | Transition/état | Permission ClientUser |
|---|---|---|
| Créer/affecter | création `PLANNED` | `CORRECTIVE_ACTION_CREATE` |
| Démarrer/modifier/annuler | `PLANNED → IN_PROGRESS`, champs autorisés | `CORRECTIVE_ACTION_EDIT` |
| Ajouter/retirer une preuve | avant `VERIFIED` | `CORRECTIVE_ACTION_EDIT` |
| Déclarer réalisée | `IN_PROGRESS → COMPLETED` | `CORRECTIVE_ACTION_COMPLETE` |
| Vérifier | `COMPLETED → VERIFIED` ou rejet vers `IN_PROGRESS` | `CORRECTIVE_ACTION_VERIFY` explicite |
| Fermer | `VERIFIED → CLOSED` | `CORRECTIVE_ACTION_CLOSE` explicite |
| Rapport de suivi | REX finalisé | `CORRECTIVE_ACTION_REPORT_GENERATE` |

La personne ayant réalisé l'action ou le ClientUser assigné ne peut pas la vérifier. Cette règle est déjà canonique; aucun quorum supplémentaire n'est ajouté.

## Portée

- `CLIENT_MANAGER` : client et bâtiments affectés.
- `CLIENT_CORPORATE` : client canonique, portée organisationnelle autorisée par ce rôle.
- Aucune lecture ou mutation inter-organisation.
- `RESTRICTED` : créateur ou permission REX qualifiante.
- `ADVISOR` : canal conseiller seulement.
- Identité inactive : refus à la requête suivante via la lecture serveur de l'identité.
