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
