-- READ ONLY preflight for Booking_one_open_per_activity_idx.
-- Open: DEMANDEE, CONFIRMEE, REPORTEE, REASSIGNEE.
-- Terminal: REFUSEE, COMPLETEE, ANNULEE.

-- Any row returned here blocks creation of the partial unique index.
SELECT "activityId", COUNT(*) AS "openBookingCount",
  ARRAY_AGG("id" ORDER BY "createdAt") AS "bookingIds",
  ARRAY_AGG(status ORDER BY "createdAt") AS statuses
FROM "Booking"
WHERE "activityId" IS NOT NULL
  AND status IN ('DEMANDEE', 'CONFIRMEE', 'REPORTEE', 'REASSIGNEE')
GROUP BY "activityId"
HAVING COUNT(*) > 1
ORDER BY COUNT(*) DESC, "activityId";

-- Status distribution, split between linked and legacy unlinked Bookings.
SELECT status, ("activityId" IS NULL) AS "activityIdIsNull", COUNT(*) AS "bookingCount"
FROM "Booking"
GROUP BY status, ("activityId" IS NULL)
ORDER BY status, "activityIdIsNull";

-- Legacy Bookings outside the Activity invariant.
SELECT COUNT(*) AS "bookingsWithNullActivityId"
FROM "Booking"
WHERE "activityId" IS NULL;

-- Historical chains are valid when at most one Booking is open.
SELECT "activityId", COUNT(*) AS "totalBookingCount",
  COUNT(*) FILTER (WHERE status IN ('DEMANDEE', 'CONFIRMEE', 'REPORTEE', 'REASSIGNEE')) AS "openBookingCount",
  COUNT(*) FILTER (WHERE status IN ('REFUSEE', 'COMPLETEE', 'ANNULEE')) AS "terminalBookingCount",
  ARRAY_AGG(status ORDER BY "createdAt") AS statuses
FROM "Booking"
WHERE "activityId" IS NOT NULL
GROUP BY "activityId"
HAVING COUNT(*) > 1
ORDER BY COUNT(*) DESC, "activityId";