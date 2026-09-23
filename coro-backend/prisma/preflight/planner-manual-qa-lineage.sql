-- READ ONLY post-QA lineage check. Run only against the intended environment.
-- Bind $1 = ProjectActivity.id and $2 = organizationId in the SQL client.

SELECT
  a.id AS "activityId",
  a."projectId",
  a.status AS "activityStatus",
  a."scheduledDate",
  a."reportedDate",
  b.id AS "bookingId",
  b.status AS "bookingStatus",
  b."requestedDate",
  b."reportedDate" AS "bookingReportedDate",
  b."createdAt" AS "bookingCreatedAt"
FROM "ProjectActivity" a
LEFT JOIN "Booking" b
  ON b."activityId" = a.id
 AND b."organizationId" = a."organizationId"
WHERE a.id = $1
  AND a."organizationId" = $2
ORDER BY b."createdAt";

SELECT
  ba.id AS "assignmentId",
  ba."bookingId",
  ba."userId",
  ba.role,
  ba.status,
  ba."replacedByAssignmentId",
  ba."assignedAt",
  ba."endedAt"
FROM "BookingAssignment" ba
JOIN "Booking" b ON b.id = ba."bookingId"
WHERE b."activityId" = $1
  AND b."organizationId" = $2
ORDER BY b."createdAt", ba."assignedAt";

SELECT
  al.id,
  al.action,
  al."entityType",
  al."entityId",
  al."projectId",
  al."createdAt"
FROM "AuditLog" al
WHERE al."organizationId" = $2
  AND al."entityId" = $1
ORDER BY al."createdAt";

SELECT COUNT(*) AS "openBookingCount"
FROM "Booking"
WHERE "activityId" = $1
  AND "organizationId" = $2
  AND status IN ('DEMANDEE', 'CONFIRMEE', 'REPORTEE', 'REASSIGNEE');
