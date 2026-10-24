require("../../design-system/test-loader.cjs");
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { resolveActiveNavigationPath } = require("./active-navigation.ts");

const layout = fs.readFileSync(path.join(__dirname, "AppLayout.tsx"), "utf8");
const navigationSource = layout.slice(
  layout.indexOf("const NAV_GROUPS"),
  layout.indexOf("const NAVIGATION_ALIASES"),
);
const destinations = [...navigationSource.matchAll(/path:\s*['"]([^'"]+)['"]/g)]
  .map(([, destination]) => destination)
  .filter((destination) => destination.startsWith("/"))
  .map((destination) => ({ path: destination }));

const destinationsWithAliases = destinations.map((destination) => {
  if (destination.path === "/projects")
    return { ...destination, matchPaths: ["/editor", "/configurator"] };
  if (destination.path === "/admin/commercial/journey")
    return { ...destination, matchPaths: ["/admin/commercial/configurator"] };
  if (destination.path === "/admin/commercial/prospects")
    return { ...destination, matchPaths: ["/admin/commercial/dossier"] };
  return destination;
});

test("les 52 destinations réelles sont toutes auditées et uniques", () => {
  assert.equal(destinations.length, 52);
  assert.equal(new Set(destinations.map(({ path: destination }) => destination)).size, 52);
});

for (const [pathname, expected] of [
  ["/buildings", "/buildings"],
  ["/manual#knowledge", "/manual"],
  ["/buildings/map", "/buildings/map"],
  ["/buildings/compliance?status=late", "/buildings/compliance"],
  ["/settings/users/", "/settings/users"],
  ["/bookings", "/bookings"],
  ["/admin/commercial/prospects", "/admin/commercial/prospects"],
  ["/admin/commercial/contracts/contract-1", "/admin/commercial/contracts"],
  ["/admin/commercial/proposals/new", "/admin/commercial/proposals/new"],
  ["/admin/commercial/proposals/proposal-1", "/admin/commercial/proposals"],
  ["/admin/commercial/journey", "/admin/commercial/journey"],
  ["/admin/commercial/content", "/admin/commercial/content"],
  ["/admin/commercial/legal-issuer", "/admin/commercial/legal-issuer"],
  ["/admin/commercial/simulator", "/admin/commercial/simulator"],
  ["/settings/task-templates", "/settings/task-templates"],
  ["/settings/activity-types", "/settings/activity-types"],
  ["/settings/timelog-categories", "/settings/timelog-categories"],
  ["/settings/feedback", "/settings/feedback"],
  ["/admin/commercial/configurator", "/admin/commercial/journey"],
  ["/admin/commercial/dossier/PROSPECT/prospect-1", "/admin/commercial/prospects"],
  ["/editor/project-1", "/projects"],
  ["/configurator/pca/project-1", "/projects"],
]) {
  test(`une seule destination active pour ${pathname}`, () => {
    assert.equal(resolveActiveNavigationPath(pathname, destinationsWithAliases), expected);
  });
}

test("aucune destination absente de la navigation autorisée ne devient active", () => {
  assert.equal(
    resolveActiveNavigationPath("/admin/secret", destinations),
    null,
  );
});

test("chaque destination et ses routes imbriquées ne produisent qu'une sélection", () => {
  for (const { path: destination } of destinations) {
    for (const pathname of [destination, `${destination}/fixture-id`, `${destination}/fixture-id?tab=details`]) {
      const active = resolveActiveNavigationPath(pathname, destinationsWithAliases);
      assert.ok(active);
      assert.equal(destinations.filter(({ path: pathValue }) => pathValue === active).length, 1, pathname);
    }
  }
});

test("le rendu applique aria-current seulement au résultat canonique", () => {
  assert.match(layout, /aria-current=\{active \? 'page' : undefined\}/);
  assert.doesNotMatch(layout, /pathname\.startsWith\(path/);
  assert.match(layout, /path: '\/projects', matchPaths: \['\/editor', '\/configurator'\]/);
  assert.match(layout, /path: '\/admin\/commercial\/journey', matchPaths: \['\/admin\/commercial\/configurator'\]/);
  assert.match(layout, /path: '\/admin\/commercial\/prospects', matchPaths: \['\/admin\/commercial\/dossier'\]/);
});

test("la destination active pilote sa visibilité sans déplacer le contenu principal", () => {
  assert.match(layout, /ref=\{active \? activeNavigationRef : undefined\}/);
  assert.match(layout, /getScrollTopForVisibleItem\(/);
  assert.match(layout, /persistSidebarScrollPosition\(event\.currentTarget\.scrollTop\)/);
  assert.doesNotMatch(layout, /scrollIntoView\(/);
});

test("les 88 pages applicatives réelles ont au plus une destination active", () => {
  const appRoot = path.resolve(__dirname, "../../app");
  const pages = [];
  const visit = (directory) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const target = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(target);
      else if (entry.name === "page.tsx") pages.push(target);
    }
  };
  visit(appRoot);
  assert.equal(pages.length, 88);

  for (const page of pages) {
    const relative = path.relative(appRoot, path.dirname(page)).replaceAll("\\", "/");
    const pathname = `/${relative}`
      .replace(/\/\[\.\.\.[^/]+\]/g, "/fixture-rest")
      .replace(/\/\[[^/]+\]/g, "/fixture-id")
      .replace(/^\/$/, "/");
    const active = resolveActiveNavigationPath(pathname, destinationsWithAliases);
    const activeCount = active === null
      ? 0
      : destinations.filter(({ path: destination }) => destination === active).length;
    assert.ok(activeCount <= 1, `${pathname}: ${activeCount} destinations actives`);
  }
});
