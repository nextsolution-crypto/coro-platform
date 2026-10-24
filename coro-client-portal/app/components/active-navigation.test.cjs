require("../../design-system/test-loader.cjs");
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { resolveActivePortalNavigationPath } = require("./active-navigation.ts");

const layout = fs.readFileSync(
  path.join(__dirname, "PortalLayout.tsx"),
  "utf8",
);
const destinations = [...layout.matchAll(/path:\s*['"]([^'"]+)['"]/g)].map(
  ([, destination]) => ({ path: destination }),
);

test("le registre du portail ne contient aucune destination dupliquée", () => {
  assert.equal(
    new Set(destinations.map(({ path: destination }) => destination)).size,
    destinations.length,
  );
});

for (const [pathname, expected] of [
  ["/dashboard", "/dashboard"],
  ["/manual#knowledge", "/manual"],
  ["/documents", "/documents"],
  ["/documents/document-1", "/documents"],
  ["/buildings/building-1", "/buildings"],
  ["/activities/activity-1", "/activities"],
  ["/profile/", "/profile"],
  ["/sentinelle/building-1", null],
  ["/unknown", null],
]) {
  test(`une seule destination Portail active pour ${pathname}`, () => {
    const active = resolveActivePortalNavigationPath(pathname, destinations);
    assert.equal(active, expected);
    assert.ok(
      active === null ||
        destinations.filter(({ path: destination }) => destination === active)
          .length === 1,
    );
  });
}

test("les deux rendus du Portail exposent aria-current uniquement sur la destination active", () => {
  assert.equal(
    (
      layout.match(
        /aria-current=\{\s*active \? ["']page["'] : undefined\s*\}/g,
      ) || []
    ).length,
    2,
  );
  assert.doesNotMatch(layout, /pathname\.startsWith/);
});
