# Concurrence

Les créations utilisent SERIALIZABLE et une séquence unique `(organizationId, buildingId, sequence)`. L’idempotence est unique par organisation. Une priorité active supérieure bloque la nouvelle commande; une urgence réelle concurrente bloque une sortie étrangère.

Le réseau reste au-moins-une-fois : les identifiants, séquences et transitions monotones fournissent la déduplication, sans promesse exactly-once.
