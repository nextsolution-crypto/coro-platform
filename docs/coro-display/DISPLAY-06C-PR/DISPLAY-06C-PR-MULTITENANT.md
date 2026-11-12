# DISPLAY-06C-PR — Multitenant

Les accès Gateway appliquent les relations tenant, site et appareil sur chaque opération sensible. Les manifests, heartbeats, confirmations, événements et commandes ne sont pas récupérables par simple substitution d’identifiant.

Les tests positifs et négatifs vérifient l’isolation inter-tenant, le refus des appareils désactivés ou révoqués et l’absence d’autorité accordée au tenant transmis par le client. Les contraintes PostgreSQL et les services applicatifs composent la défense; aucune politique ne repose uniquement sur l’interface.

Réserve : la validation avec plusieurs comptes humains réels dans l’interface d’administration reste `NOT_VERIFIED`.
