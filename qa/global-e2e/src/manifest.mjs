export const actors = Object.freeze(
  [
    ["founder", "SUPER_ADMIN", "operator"],
    ["employee-org", "OPERATOR", "operator"],
    ["employee-global", "OPERATOR", "operator"],
    ["employee-none", "OPERATOR", "operator"],
    ["customer-admin-a", "ADMIN", "customer-a"],
    ["customer-admin-b", "ADMIN", "customer-b"],
    ["advisor-a", "OPERATOR", "customer-a"],
    ["portal-manager-a", "CLIENT_MANAGER", "customer-a"],
    ["portal-user-a", "CLIENT_USER", "customer-a"],
    ["cross-tenant", "OPERATOR", "customer-b"],
    ["anonymous", "ANONYMOUS", null],
  ].map(([key, role, tenant]) => ({
    key,
    role,
    tenant,
    email: `${key}@global-e2e.test`,
  })),
);

export const smokeRequirements = Object.freeze([
  "founder-login-mfa",
  "authority-draft-active",
  "grant-revocation",
  "customer-admin-platform-denial",
  "cross-tenant-api-denial",
  "portal-session-separation",
  "organization-building-create",
  "project-mandate-create",
  "booking-planner-persistence",
  "cad-only-rendering",
  "commercial-scenario",
  "provider-capture",
  "private-document-cross-tenant-denial",
  "reload-theme-persistence",
]);

export const viewports = Object.freeze(
  [
    [1440, 900],
    [1920, 1080],
    [390, 844],
    [430, 932],
    [320, 700],
    [768, 1024],
  ].map(([width, height]) => ({ width, height })),
);
