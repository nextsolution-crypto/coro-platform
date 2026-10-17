TRUNCATE TABLE "AdminAuditEvent", "PlatformPermissionGrant", "PlatformAuthorityConfiguration", "User", "Organization" CASCADE;
INSERT INTO "Organization" (id, name, "isInternal", "isActive", "updatedAt") VALUES
  ('44444444-4444-4444-8444-444444444444', 'CORO Recovery QA', true, true, clock_timestamp()),
  ('55555555-5555-4555-8555-555555555555', 'Customer Recovery QA', false, true, clock_timestamp());
INSERT INTO "User" (id, email, password, "firstName", "lastName", role, "organizationId", "isActive", "updatedAt") VALUES
  ('33333333-3333-4333-8333-333333333333', 'founder-recovery@example.invalid', 'synthetic', 'QA', 'Founder', 'ADMIN', '44444444-4444-4444-8444-444444444444', false, clock_timestamp()),
  ('66666666-6666-4666-8666-666666666666', 'customer-admin-recovery@example.invalid', 'synthetic', 'QA', 'Customer', 'ADMIN', '55555555-5555-4555-8555-555555555555', true, clock_timestamp());
INSERT INTO "PlatformAuthorityConfiguration" (id, "operatorOrganizationId", "founderUserId", status, "lockVersion", "createdByUserId", "createdAt", "activatedByUserId", "activatedAt", "activationReason", "updatedAt") VALUES
  ('PRIMARY', '44444444-4444-4444-8444-444444444444', '33333333-3333-4333-8333-333333333333', 'ACTIVE', 1, '33333333-3333-4333-8333-333333333333', clock_timestamp(), '33333333-3333-4333-8333-333333333333', clock_timestamp(), 'QA activation', clock_timestamp());
