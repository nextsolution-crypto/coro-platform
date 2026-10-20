export const identityCatalogue = Object.freeze({
  founder: { email: "founder@global-e2e.test", kind: "internal", role: "SUPER_ADMIN", tenant: "operator", scope: "PLATFORM_GOVERNED" },
  delegatedEmployee: { email: "employee-org@global-e2e.test", kind: "internal", role: "OPERATOR", tenant: "operator", scope: "EXPLICIT_GRANTS" },
  advisor: { email: "advisor-a@global-e2e.test", kind: "internal", role: "OPERATOR", tenant: "customer-a", scope: "ASSIGNED_PROJECTS" },
  clientCorporateA: { email: "portal-corporate-a@global-e2e.test", kind: "portal", role: "CLIENT_CORPORATE", tenant: "customer-a", scope: "TENANT_BUILDINGS" },
  clientRegionalA: { email: "portal-regional-a@global-e2e.test", kind: "portal", role: "CLIENT_MANAGER", tenant: "customer-a", scope: "EXPLICIT_NETWORK_REGION" },
  clientLocalA: { email: "portal-local-a@global-e2e.test", kind: "portal", role: "CLIENT_MANAGER", tenant: "customer-a", scope: "EXPLICIT_BUILDINGS" },
  clientWithoutBuildings: { email: "portal-zero-a@global-e2e.test", kind: "portal", role: "CLIENT_MANAGER", tenant: "customer-a", scope: "NONE" },
  clientOrganizationB: { email: "portal-corporate-b@global-e2e.test", kind: "portal", role: "CLIENT_CORPORATE", tenant: "customer-b", scope: "TENANT_BUILDINGS" },
  revokedUser: { email: "revoked@global-e2e.test", kind: "internal", role: "OPERATOR", tenant: "customer-a", scope: "REVOKED", active: false },
});

export function actor(key) {
  const value = identityCatalogue[key];
  if (!value) throw new Error(`Unknown synthetic actor: ${key}`);
  return Object.freeze({ key, active: true, ...value });
}

export function publicCatalogue() {
  return Object.entries(identityCatalogue).map(([key, value]) => ({ key, ...value }));
}
