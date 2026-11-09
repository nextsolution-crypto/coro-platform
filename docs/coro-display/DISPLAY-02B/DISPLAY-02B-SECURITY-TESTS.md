# DISPLAY-02B — Tests de sécurité

| Contrôle | Résultat |
|---|---|
| Permission absente | PASS — refus |
| Permission présente, bâtiment absent | PASS — refus |
| Bâtiment exact affecté | PASS — accès limité |
| Autre bâtiment du même tenant | PASS — refus |
| Autre organisation | PASS — refus avant lecture de ressource |
| Identité inactive | PASS — refus |
| Organisation inactive | PASS — refus |
| Parent spatial inactif | PASS — mutation refusée |
| FK composite inter-tenant | PASS — rejet PostgreSQL |
| Corps avec champs non prévus | PASS — validation stricte |
| Mutation concurrente | PASS — `lockVersion` |
| Audit des mutations | PASS |

Les refus ne créent aucune ressource spatiale ni entrée d'audit de succès. Aucun secret, identifiant personnel ou capacité d'urgence n'est ajouté.
