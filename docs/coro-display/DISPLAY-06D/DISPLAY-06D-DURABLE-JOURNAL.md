# Journal local durable

Le journal conserve ID UUID, séquence, date, type, détails bornés par contrat, hash précédent, hash courant et accusé de réconciliation. Il est borné à 5 000 événements, réécrit atomiquement et protégé par HMAC; aucune clé n’y est stockée.

Tests : chaînage, persistance, altération, pending et double accusé idempotent PASS. Une modification provoque `JOURNAL_INTEGRITY_FAILED`.
