const fs = require("node:fs"),
  path = require("node:path");
const page = fs.readFileSync(path.join(__dirname, "page.tsx"), "utf8");
const layout = fs.readFileSync(
  path.join(__dirname, "../../../components/layout/AppLayout.tsx"),
  "utf8",
);
const styles = fs.readFileSync(
  path.join(__dirname, "platform-permission-grants.module.css"),
  "utf8",
);
const registry = fs.readFileSync(
  path.join(__dirname, "../../../design-system/routes/route-registry.ts"),
  "utf8",
);

for (const token of [
  "/admin/v1/platform-authority/grants",
  "/users/organization",
  "/organizations",
  "ORGANIZATION",
  "GLOBAL",
  "globalAcknowledged",
  "lockVersion",
  "grantReason",
  "revocationReason",
  "authority.isFounder",
  'router.replace("/dashboard")',
  "GlassModal",
  "persistGrant",
  "persistRevocation",
])
  if (!page.includes(token)) throw new Error(`grants UI missing ${token}`);

for (const forbidden of [
  "localStorage.setItem",
  "sessionStorage.setItem",
  "priceMinor",
  "entitlementRevision",
  "prisma",
])
  if (page.includes(forbidden))
    throw new Error(`grants UI crossed boundary: ${forbidden}`);

for (const primitive of [
  "PageHeader",
  "GlassCard",
  "GlassButton",
  "StatusBadge",
  "LoadingState",
  "EmptyState",
  "GlassModal",
  "cgx-input",
])
  if (!page.includes(primitive))
    throw new Error(`grants Glass presentation missing ${primitive}`);

for (const token of [
  "--cg-text-primary",
  "--cg-glass-bg",
  "--cg-border-default",
  "--cg-focus-ring",
  "--cg-warning-bg",
])
  if (!styles.includes(token))
    throw new Error(`grants Glass tokens missing ${token}`);

if (!registry.includes("pattern: '/admin/platform-permission-grants'"))
  throw new Error("grants route missing from registry");
if (
  !/platform-permission-grants'[\s\S]{0,220}status: 'beta'[\s\S]{0,80}render: 'skin'/.test(
    registry,
  )
)
  throw new Error("grants route is not enabled for governed Glass rendering");
if (
  /platform-permission-grants'[\s\S]{0,220}status: 'legacy-only'/.test(registry)
)
  throw new Error("grants Classic-only exception still present");

if (!layout.includes("/admin/platform-permission-grants"))
  throw new Error("Founder navigation is missing the grants route");
if (
  !layout.includes("...(platform.isFounder ? [SUPER_ADMIN_OTHER_GROUP] : [])")
)
  throw new Error("grants navigation is not Founder-only");
console.log("platform permission grants contract: PASS");
