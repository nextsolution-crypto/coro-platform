# Architecture

- Autorité: `DisplayCorrectionObservation` existante.
- API: `DisplayManagerController` et `DisplayObservationWorkflowService`.
- Interface: composant `ObservationManager` intégré à `/display`.
- Stockage: PostgreSQL, transactions Prisma, verrou `lockVersion`.
- Communication: `DisplayCorrectionObservationMessage`, visibilité explicite `INTERNAL` ou `CLIENT`.
- Audit: `DisplayCorrectionObservationEvent`, append-only.

Les liens vers une correction documentaire contiennent un type, un identifiant et une preuve; ils ne créent ni tâche, ni version, ni publication.
