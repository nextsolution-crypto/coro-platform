CREATE TABLE "Organization" (id text PRIMARY KEY);
CREATE TABLE "User" (id text PRIMARY KEY, "organizationId" text REFERENCES "Organization"(id));
CREATE TABLE "Client" (id text PRIMARY KEY, "organizationId" text REFERENCES "Organization"(id));
CREATE TABLE "Building" (id text PRIMARY KEY, "organizationId" text REFERENCES "Organization"(id), "clientId" text REFERENCES "Client"(id));
CREATE TABLE "PopulationProgram" (id text PRIMARY KEY);
CREATE TABLE "PopulationSubscriber" (id text PRIMARY KEY, "programId" text REFERENCES "PopulationProgram"(id), "phoneCanonical" text);
CREATE TABLE "_prisma_migrations" (migration_name text, finished_at timestamptz, rolled_back_at timestamptz);

INSERT INTO "Organization" VALUES ('org-fixture');
INSERT INTO "User" VALUES ('user-fixture', 'org-fixture');
INSERT INTO "Client" VALUES ('client-fixture', 'org-fixture');
INSERT INTO "Building" VALUES ('building-fixture', 'org-fixture', 'client-fixture');
INSERT INTO "PopulationProgram" VALUES ('program-fixture');
INSERT INTO "PopulationSubscriber" VALUES ('subscriber-fixture', 'program-fixture', '+15145550123');
INSERT INTO "_prisma_migrations" VALUES ('20261002010000_restore_real_fixture', now(), NULL);
