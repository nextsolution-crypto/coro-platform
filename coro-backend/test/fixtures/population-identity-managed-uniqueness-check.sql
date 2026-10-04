INSERT INTO "PopulationSubscriber" (
  "id",
  "programId",
  "status",
  "emailCanonical",
  "identityAuthorityAt"
) VALUES (
  'managed-email-1',
  'program-1',
  'PENDING_VERIFICATION',
  'citizen@example.com',
  now()
);

DO $$
BEGIN
  BEGIN
    INSERT INTO "PopulationSubscriber" (
      "id",
      "programId",
      "status",
      "emailCanonical",
      "identityAuthorityAt"
    ) VALUES (
      'managed-email-duplicate',
      'program-1',
      'ACTIVE',
      'citizen@example.com',
      now()
    );
    RAISE EXCEPTION 'managed email duplicate was accepted';
  EXCEPTION WHEN unique_violation THEN
    NULL;
  END;
END $$;

INSERT INTO "PopulationSubscriber" (
  "id",
  "programId",
  "status",
  "emailCanonical",
  "identityAuthorityAt"
) VALUES (
  'managed-email-other-program',
  'program-2',
  'ACTIVE',
  'citizen@example.com',
  now()
);

INSERT INTO "PopulationSubscriber" (
  "id",
  "programId",
  "status",
  "phoneCanonical",
  "identityAuthorityAt"
) VALUES (
  'managed-phone-1',
  'program-1',
  'ACTIVE',
  '+14505551234',
  now()
);

DO $$
BEGIN
  BEGIN
    INSERT INTO "PopulationSubscriber" (
      "id",
      "programId",
      "status",
      "phoneCanonical",
      "identityAuthorityAt"
    ) VALUES (
      'managed-phone-duplicate',
      'program-1',
      'SUSPENDED',
      '+14505551234',
      now()
    );
    RAISE EXCEPTION 'managed phone duplicate was accepted';
  EXCEPTION WHEN unique_violation THEN
    NULL;
  END;
END $$;

SELECT count(*) AS managed_rows
FROM "PopulationSubscriber"
WHERE "identityAuthorityAt" IS NOT NULL;
