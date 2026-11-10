# Workflow

Transitions autorisées:

`SUBMITTED → UNDER_REVIEW → MORE_INFO_REQUIRED|ACCEPTED|REJECTED`

`MORE_INFO_REQUIRED → UNDER_REVIEW`

`ACCEPTED → CORRECTION_IN_PROGRESS|RESOLVED`

`CORRECTION_IN_PROGRESS → RESOLVED → CLOSED`

`REJECTED → CLOSED`

Chaque mutation exige un motif, un identifiant de requête et la version de verrou attendue. Les demandes d'information et refus exigent une réponse communicable. Une résolution liée à une correction exige une preuve. Aucune transition arbitraire n'est permise.
