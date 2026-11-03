# Matrice des permissions Incident

| Permission | Capacité | Ne permet pas | Prérequis effectif |
|---|---|---|---|
| `INCIDENT_READ` | liste, fiche et sous-ressources lisibles autorisées | mutation ou délégation | permission individuelle + affectation scoped active |
| `INCIDENT_SUPERVISE` | supervision des tâches et de la chronologie selon les routes existantes | commandement du cycle de vie ou délégation | permission individuelle + affectation scoped active |
| `INCIDENT_COMMAND` | transitions gouvernées du cycle de vie selon la machine d'états | administration ou délégation des accès | permission individuelle + affectation scoped active |

## Administration

| Acteur | Même organisation | Organisation explicite différente | Délégation |
|---|---:|---:|---:|
| `ADMIN` interne | oui | non | oui, via API gouvernée seulement |
| `SUPER_ADMIN` | oui | oui, via route plateforme explicite | oui, via API gouvernée seulement |
| `OPERATOR` | non | non | non |
| `CLIENT_USER` | non | non | non |
| détenteur de `INCIDENT_COMMAND` sans rôle admin | non | non | non |

## Portées

- bâtiment : l'affectation vaut pour les incidents de ce bâtiment selon les contrôles serveur existants;
- incident : l'affectation vaut uniquement pour l'incident actif sélectionné;
- inter-tenant, autre Client, bâtiment inactif ou incident d'un autre bâtiment : refus sans écriture;
- identité ou Client désactivé : aucune autorisation effective.
