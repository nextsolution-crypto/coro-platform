# Team Planner API V1

Both routes require a staff JWT and a required ISO `start`/`end` window with an explicit offset. The window is half open and capped at 31 days. `GET /planning/team` returns at most 50 users. `GET /planning/actions` accepts `page` (from 1), `limit` (1–50), `type`, and `userId`, in addition to the team filters. Both routes derive the organization from the JWT. `displayTimeZone` is validated as IANA and affects display only.

`GET /planning/team` returns `version: 1`, `asOf`, `window`, `displayTimeZone`, `users`, `workIntervals`, `events`, `actionSummary`, and `warnings`. The action endpoint returns `version`, `asOf`, `window`, `page`, `limit`, `total`, and `items`. Action items share a `groupId` (Booking or Activity ID) so the UI can group requested, missing lead, pending assignment, and conflict signals.

The admin user projection contains a 12-week Capacity summary, never detailed capacity rows. An operator sees their own summary and a colleague's ID, name, title, generic work intervals and busy events. The planner selects only generic unavailability fields. It never selects absence type or private note. Client roles are rejected before any database read. Detailed Booking events include active assignment roles/statuses and short project, client, building, and dossier-owner names for the drawer; colleague-only busy events omit them.

Booking, schedule, unavailability, and legacy Activity rows are read in groups. Scheduling performs one broad source analysis for the team window and checks the resulting conflicts against each Booking slot in memory. A second grouped schedule read refines unknown coverage per slot. The broad analysis remains conservative for imprecise legacy Activity and unverified timezone warnings. CapacityService is called once per team request. There is no database query inside a User or Booking loop.

Candidate Booking and Activity reads each use `take: 2001` to detect whether more than 2,000 records match the SQL filters. Exactly 2,000 is valid. At 2,001, both routes reject the request with HTTP 400 and ask the caller to narrow the date window or add a filter. Neither route returns a silently truncated projection. Tenant, effective date, client, building, status, and selected-user filters are applied in SQL where applicable before this limit. Action pagination is applied to normalized actions after these bounded reads. Undated Activities are included for `UNPLANNED_ACTIVITY`, so a narrower date window alone may not reduce that backlog; a client, building, or user filter may be needed. V1 has no dedicated Planning index or migration, and these tests use mocks rather than a live PostgreSQL planner benchmark.

## Foundations and context

`GET /planning/context` returns the tenant-scoped Client, Building, Project/Mandate and active ActivityType choices used by the planner drawer. A Project remains the operational mandate selected by the UI; `ProjectMandate` supplies its commercial metadata and preferred owner when present. No `projectMandateId` is duplicated on `ProjectActivity`.

`POST /planning/activities` creates one undated `ProjectActivity` attached to an accessible active Project. The organization always comes from the staff JWT. The ActivityType must be active and either global or owned by that organization. Activity creation and its `PLANNING_ACTIVITY_CREATED` audit row share one transaction. This foundation route creates no empty Booking and no BookingAssignment; slot and team orchestration belong to the following scheduling phases.

The team and action routes accept optional `projectId` and `activityTypeId` filters. These filters are applied in Prisma before the candidate ceiling. Unplanned action items expose stable Client, Building, Project and ActivityType identifiers and labels so the drawer can reopen the existing Activity without copying business objects into a planner-specific model.

## Team preview

`POST /planning/team-preview` accepts a UTC start instant, a duration in minutes and a tenant-scoped Building ID. It loads active candidates once, calls `SchedulingService.analyzeUsers` once for the complete slot, and calls Capacity once. It does not create a Booking or BookingAssignment.

The public candidate contract contains `userId`, `displayName`, an optional secondary email, `availabilityStatus`, a generic reason, an optional generic blocked interval and the committed 12-week capacity percentage. `SOFT_CONFLICT` is projected as `UNKNOWN`; the Planner exposes only `AVAILABLE`, `UNKNOWN` and `BLOCKED`. Raw Scheduling conflicts, Booking or client details, absence type and private notes are never returned.

Admins and super administrators see active staff candidates from their organization. An operator can preview only their own availability. Client JWTs are rejected before database access. Capacity is informational and never changes the Scheduling category.

## Planner mutations

`PlanningActionsService` owns the composed writes. `PlanningService` remains the read projection. Planning an existing Activity locks its `ProjectActivity` row, verifies that no open Booking exists, locks candidate Users in deterministic order, reruns Scheduling through the transaction, then creates the Booking, PENDING assignments, Activity schedule and audit together.

Backlog removal is derived from persisted relations rather than the displayed status. An Activity with no Booking, ExerciseReport, or operational audit can be physically deleted even when its only audit is the intrinsic `PLANNING_ACTIVITY_CREATED` row. That intrinsic row is deleted with the Activity in one transaction. Any Booking, ExerciseReport, or other Activity audit preserves the Activity and exposes business cancellation instead.

The admin-created assignment policy follows `BookingAssignmentsService.add`: LEAD and SUPPORT start as `PENDING`. `Booking.assignedUserId` mirrors the selected LEAD for legacy readers; `BookingAssignment` is the team source of truth. The required legacy `clientUserId` is populated from an active ClientUser scoped to the Project client and Building. Planning is rejected when no such contact exists.

`UNKNOWN` requires `confirmUnknown: true`; `BLOCKED` is always rejected with a generic adviser message. No Scheduling conflict details are returned by mutation errors. Creating and planning uses the same transaction, so a failure leaves neither Activity nor Booking. Slot edits preserve the Booking ID. A report preserves `requestedDate`, stores the new effective instant in `reportedDate`, and sets `REPORTEE`.

Cancelling a schedule sets the Booking to `ANNULEE`, terminates active assignments as `REMOVED`, clears the Activity scheduling dates and keeps the same active Activity for the backlog. Replanning creates a new Booking attempt while preserving the cancelled Booking. No Activity cancellation endpoint is introduced.
The one-open-Booking-per-Activity invariant covers both Planner and client Booking creation. Both paths lock the same `ProjectActivity` row before their final open-status check and insert. PostgreSQL remains the final authority through the partial unique index `Booking_one_open_per_activity_idx` for `DEMANDEE`, `CONFIRMEE`, `REPORTEE`, and `REASSIGNEE`. `REFUSEE`, `COMPLETEE`, and `ANNULEE` are terminal and permit a later Booking attempt. The read-only preflight is `prisma/preflight/activity-booking-open-invariant.sql`.

Planner team replacement keeps the old LEAD as `REPLACED` and links it to the new LEAD with `replacedByAssignmentId`. A retained SUPPORT is likewise linked to its new Assignment for the same user and Booking; removed SUPPORT assignments remain terminal without an invented successor. PostgreSQL index `BookingAssignment_one_active_lead` protects one `PENDING` or `ACCEPTED` LEAD per Booking. `BookingAssignment_unique_active_person_role` protects each `bookingId + userId + role` combination for those same active statuses.
## 3D workflow and permissions

The Planner drawer exposes VIEW, EDIT_SLOT, RESCHEDULE, REASSIGN, and CANCEL_SCHEDULE as explicit modes. Creation and backlog planning remain the CREATE and PLAN_EXISTING modes of ActivityPlanningDrawer. Mutations refresh Team, Context, and Action Center projections without reloading or changing URL filters.

Permissions remain backend-owned:

| Capability | SUPER_ADMIN | ADMIN | OPERATOR | Client JWT |
| --- | --- | --- | --- | --- |
| View Planner and own permitted context | yes | yes | own scope | no |
| Team preview | yes | yes | self only | no |
| Create an unplanned Activity | yes | yes | permitted Projects | no |
| Plan, edit, reschedule, reassign, cancel schedule | yes | yes | no | no |
| View Action Center | yes | yes | own scope | no |

Client Booking requests remain available through their canonical Booking workflow. Assignment acceptance/refusal remains in the existing BookingAssignment endpoints and is not duplicated in Planner 3D. Permanent Activity cancellation, physical deletion, Outlook, annual programs, Network materialization, and a partial audit timeline are intentionally outside this pass. The Planner reads and mutates ProjectActivity, Booking, BookingAssignment, Project, Client, Building, User, Scheduling, and Capacity directly; it owns no parallel calendar entity.

Operational deployment checks include the read-only `prisma/preflight/activity-booking-open-invariant.sql` and the PostgreSQL suites for Planner mutations, Activity/Booking, BookingAssignment, WorkSchedules, and Scheduling. Never run those suites against production.
