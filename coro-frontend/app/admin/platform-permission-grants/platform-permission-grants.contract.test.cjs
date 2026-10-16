const fs = require("node:fs"),
  path = require("node:path");
const page = fs.readFileSync(path.join(__dirname, "page.tsx"), "utf8");
const layout = fs.readFileSync(
  path.join(__dirname, "../../../components/layout/AppLayout.tsx"),
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
  "window.confirm",
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

if (!layout.includes("/admin/platform-permission-grants"))
  throw new Error("Founder navigation is missing the grants route");
if (
  !layout.includes("...(platform.isFounder ? [SUPER_ADMIN_OTHER_GROUP] : [])")
)
  throw new Error("grants navigation is not Founder-only");
console.log("platform permission grants contract: PASS");
