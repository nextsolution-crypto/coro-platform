SELECT
  count(*) AS after_count,
  count(*) FILTER (
    WHERE "emailCanonical" IS NOT NULL
       OR "identityAuthorityAt" IS NOT NULL
  ) AS changed_rows
FROM "PopulationSubscriber";

SELECT count(*) AS duplicate_phone_rows
FROM "PopulationSubscriber"
WHERE "phoneCanonical" = '+14505551234';

SELECT count(*) AS duplicate_email_rows
FROM "PopulationSubscriber"
WHERE lower(trim("email")) = 'citizen@example.com';
