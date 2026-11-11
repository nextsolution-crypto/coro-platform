# DISPLAY-06A-REVIEW — Anti-rollback

Une séquence strictement supérieure au maximum persistant est exigée. L'affectation attendue peut être verrouillée pour empêcher sa substitution; publication, version, portée et empreinte sont signées.

La protection après redémarrage dépend encore de la persistance durable de `highestAcceptedSequence` et de l'affectation. Une réinitialisation administrative future devra être authentifiée, auditée, physiquement explicite et ne jamais réautoriser une révocation connue. Elle n'est pas implémentée ici.
