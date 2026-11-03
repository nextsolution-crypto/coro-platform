# États et permissions — fiche Incident

## Politique appliquée

| Opération | Permission | Invariant |
|---|---|---|
| Lire le détail | `INCIDENT_READ` | Organisation, Incident et affectation explicite contrôlés avant projection. |
| Ajouter un journal | `INCIDENT_SUPERVISE` | Acteur détenu par le serveur; parent autorisé; aucun champ technique client. |
| Contenir | `INCIDENT_COMMAND` | `ACTIVE -> CONTAINED`; rejeu de l’état contenu sans nouvel effet. |
| Résoudre | `INCIDENT_COMMAND` | `ACTIVE/CONTAINED -> RESOLVED`; motif obligatoire; rejeu identique idempotent. |
| Modifier REX | `INCIDENT_SUPERVISE` | Date de complétion serveur et autorité parent. |

`PRE_ALERT -> ACTIVE/CANCELLED` demeure gouverné par les routes dédiées existantes. `RESOLVED` et `CANCELLED` sont terminaux; aucune réouverture n’est ajoutée.

## Atomicité et concurrence

Containment et résolution relisent l’autorité dans la transaction. La mise à jour conditionnelle, le journal, l’audit et les effets associés sont atomiques. Une panne SQL injectée retourne HTTP 500 et laisse statut, journaux et audits inchangés. Le rejeu d’une résolution déjà réussie requiert toujours la même identité, la même affectation et le même motif; il ne crée aucun effet supplémentaire.

## Refus

Les refus inter-tenant, hors bâtiment, hors sous-ressource et anonymes ne renvoient pas de contenu protégé et ne produisent aucune écriture métier. Le verrou client empêche deux requêtes dans le même tick; le verrou serveur demeure l’autorité en cas de concurrence réelle.
