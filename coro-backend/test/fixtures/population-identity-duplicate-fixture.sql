CREATE TYPE "PopulationSubscriberStatus" AS ENUM (
  'PENDING_VERIFICATION',
  'ACTIVE',
  'UNSUBSCRIBED',
  'SUSPENDED'
);

CREATE TABLE "PopulationSubscriber" (
  "id" TEXT PRIMARY KEY,
  "programId" TEXT NOT NULL,
  "status" "PopulationSubscriberStatus" NOT NULL,
  "phoneCanonical" TEXT,
  "email" TEXT
);

INSERT INTO "PopulationSubscriber" (
  "id",
  "programId",
  "status",
  "phoneCanonical",
  "email"
) VALUES
  ('email-1', 'program-1', 'ACTIVE', NULL, 'Citizen@Example.com'),
  ('email-2', 'program-1', 'SUSPENDED', NULL, ' citizen@example.com '),
  ('phone-1', 'program-1', 'ACTIVE', '+14505551234', NULL),
  ('phone-2', 'program-1', 'PENDING_VERIFICATION', '+14505551234', NULL);
