# Workflow

États : `SUBMITTED`, `UNDER_REVIEW`, `MORE_INFO_REQUIRED`, `ACCEPTED`, `REJECTED`, `CORRECTION_IN_PROGRESS`, `RESOLVED`, `CLOSED`.

Chaque mutation exige motif, version attendue et clé idempotente. Une transition interdite, périmée, concurrente ou non autorisée est refusée sans écrasement. Après `CLOSED`, qualifications, assignations, messages et transitions sont bloqués.

La priorité client reste distincte et immuable; la priorité professionnelle est traçable. L’attribution exige un utilisateur actif de la même organisation, avec lecture Display et bâtiment correspondant.

Une résolution requiert un constat/preuve et un validateur distinct du décideur. La clôture n’est possible qu’après `RESOLVED` ou `REJECTED`. Les corrections n’imposent pas artificiellement une nouvelle version documentaire.
