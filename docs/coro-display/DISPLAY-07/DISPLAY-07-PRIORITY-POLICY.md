# Politique de priorité

Ordre déterministe : `EMERGENCY_REAL > EMERGENCY_EXERCISE > PERMANENT_PLAN > NORMAL_CYCLE`.

Une séquence ancienne est refusée. Une priorité inférieure ne remplace pas la priorité courante. Un exercice ne remplace jamais une urgence réelle. Une sortie exige le même incident et une priorité suffisante. Tests : `display-command-policy.spec.ts`.
