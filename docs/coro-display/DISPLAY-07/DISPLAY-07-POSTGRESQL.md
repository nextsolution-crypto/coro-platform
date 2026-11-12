# PostgreSQL

Base : PostgreSQL 16 Alpine jetable `coro-display07-pg`, port local 55437. Les 186 migrations ont été appliquées depuis zéro. `migrate status` a confirmé la tête; 2 tests transactionnels ont passé.

Migration additive : `20261206010000_display_emergency_orchestration`. Aucune base partagée n’a été touchée. Le conteneur doit être supprimé après la campagne.
