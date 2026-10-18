require("../../design-system/test-loader.cjs");
const test = require("node:test");
const assert = require("node:assert/strict");
const { resolveActiveNavigationPath } = require("./active-navigation.ts");

const destinations = [
  "/dashboard",
  "/buildings",
  "/buildings/map",
  "/buildings/compliance",
  "/settings",
  "/settings/users",
  "/bookings",
  "/admin/commercial",
  "/admin/commercial/prospects",
  "/admin/commercial/contracts",
  "/admin/commercial/proposals",
  "/admin/commercial/proposals/new",
].map((path) => ({ path }));

for (const [pathname, expected] of [
  ["/buildings", "/buildings"],
  ["/buildings/map", "/buildings/map"],
  ["/buildings/compliance?status=late", "/buildings/compliance"],
  ["/settings/users/", "/settings/users"],
  ["/bookings", "/bookings"],
  ["/admin/commercial/prospects", "/admin/commercial/prospects"],
  ["/admin/commercial/contracts/contract-1", "/admin/commercial/contracts"],
  ["/admin/commercial/proposals/new", "/admin/commercial/proposals/new"],
  ["/admin/commercial/proposals/proposal-1", "/admin/commercial/proposals"],
]) {
  test(`une seule destination active pour ${pathname}`, () => {
    assert.equal(resolveActiveNavigationPath(pathname, destinations), expected);
  });
}

test("aucune destination absente de la navigation autorisée ne devient active", () => {
  assert.equal(
    resolveActiveNavigationPath("/admin/secret", destinations),
    null,
  );
  assert.equal(
    resolveActiveNavigationPath(
      "/admin/platform-permission-grants",
      destinations,
    ),
    null,
  );
});
