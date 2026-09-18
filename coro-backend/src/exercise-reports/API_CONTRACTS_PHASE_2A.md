# Exercise Reports - API contracts Phase 2A

All routes require a valid adviser JWT. `ADMIN` and `SUPER_ADMIN` may access
projects in their organization. `OPERATOR` may access projects where they are
the assigned user (`Project.userId`) or the last editor (`lastEditedById`).
Resources outside that scope are returned as not found.

## Discover reports from activities

- `GET /projects/:projectId/activities`
- Request body: none.
- Response: the existing activity array, with
  `exerciseReport: null | { id, status }` on every item.
- Errors: `404` when the project is outside the caller's access scope.

## Discover compatible operational sources

- `GET /activities/:activityId/exercise-report-sources`
- Request body: none.
- Response:
  `{ activityId, canCreateDraft, reportType, selectionMode, incidents, evacuations }`.
- `selectionMode` is always `SINGLE_OPERATIONAL_SOURCE`: creation accepts an
  incident or an evacuation, never both.
- Incident fields: `id`, `type`, `status`, `triggeredAt`, `resolvedAt`, `hasRex`.
- Evacuation fields: `id`, `status`, `triggeredAt`, `resolvedAt`.
- Only events from the activity building and organization are returned;
  incidents must also have `isExercise=true`.
- Errors: `404` for an inaccessible activity, `400` for an inadmissible type.

## Create, read and update a report

- `POST /activities/:activityId/exercise-report`
- Body: `{ bookingId?, incidentEventId?, evacuationEventId? }`; all values UUID.
- Response: the complete report aggregate. Repeated creation returns the
  existing report. Incident and evacuation IDs cannot coexist.
- `GET /exercise-reports/:id`: returns the complete report aggregate.
- `PUT /exercise-reports/:id`: accepts `UpdateExerciseReportDto`; omitted
  properties are not modified and only a `DRAFT` report can be updated.
- Errors: `404` outside the access scope, `400` for incompatible sources or
  invalid input, `409` when the report is no longer a draft.

`canPublish` is intentionally absent in Phase 2A. Its checklist and status
transition belong to Phase 2C.

## Client portal corrective actions

- `GET /client-portal/corrective-actions?buildingId=:uuid`
- `POST /client-portal/corrective-actions` with `CreateCorrectiveActionDto`.
- `PUT /client-portal/corrective-actions/:id` with
  `UpdateCorrectiveActionDto`.
- `PUT /client-portal/corrective-actions/:id/delete` performs the existing
  logical cancellation.
- `CLIENT_CORPORATE` is restricted to buildings belonging to its `clientId`.
- `CLIENT_MANAGER` is restricted to JWT `buildingIds` for list, create, update
  and delete. Direct IDs do not bypass this filter. An incident-only creation
  derives and persists its verified building.
- Errors: `403` for an explicitly forbidden building, `404` for an inaccessible
  direct action ID, `400` for invalid or cross-tenant references.
