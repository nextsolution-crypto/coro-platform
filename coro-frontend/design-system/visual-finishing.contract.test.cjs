/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const ROOT = path.resolve(__dirname, "..");
const read = (relative) => fs.readFileSync(path.join(ROOT, relative), "utf8");

test("le Profil espace les cartes principales avec un jeton du Design System", () => {
  const profile = read("app/profile/page.tsx");
  assert.match(profile, /marginBottom:\s*['"]var\(--cg-space-5\)['"]/);
  assert.match(profile, /<WorkScheduleEditorPanel manager=\{false\}/);
});

test("les libellés Founder corrigés ne réintroduisent pas les chaînes anglaises observées", () => {
  const configurator = read("app/admin/commercial/configurator/page.tsx");
  const workspace = read(
    "app/admin/commercial/configurator/GuidedWorkspace.tsx",
  );
  const metering = read("app/admin/metering/page.tsx");
  const organizationIndex = read("app/admin/commercial/organization-index.tsx");

  for (const source of [configurator, workspace, metering, organizationIndex]) {
    assert.doesNotMatch(source, />Loading(?: guided workspace)?…?</);
  }
  assert.doesNotMatch(configurator, />Organization</);
  assert.doesNotMatch(
    configurator,
    /Organization name|Converted — use the Organization|Active price book|No matching target|Selected:/,
  );
  assert.match(configurator, /var\(--cg-text-secondary, #475569\)/);
  assert.doesNotMatch(metering, />Metering<|>Calculate<|>Measurement results</);
  assert.match(metering, />Mesures opérationnelles</);
});

test("le faux backend visuel expose une pièce synthétique partagée pour /files/[id]", () => {
  const mock = read("design-system/bench/mock-api.cjs");
  assert.match(mock, /'\/api\/client-portal\/projects\/p1'/);
  assert.match(mock, /'\/api\/project-files\/project\/p1'/);
  assert.match(mock, /visibility:\s*'shared'/);
  assert.match(mock, /example\.invalid\/qa\/plan-evacuation-synthetique\.pdf/);
});

test("les menus natifs et personnalisés ont une palette explicite dans les deux applications", () => {
  for (const prefix of ["", "../coro-client-portal/"]) {
    const globalsPath = prefix
      ? path.resolve(ROOT, prefix, "app/globals.css")
      : path.join(ROOT, "app/globals.css");
    const primitivesPath = prefix
      ? path.resolve(ROOT, prefix, "design-system/primitives.css")
      : path.join(ROOT, "design-system/primitives.css");
    const globals = fs.readFileSync(globalsPath, "utf8");
    const primitives = fs.readFileSync(primitivesPath, "utf8");

    assert.match(globals, /select\s*\{[\s\S]*?color-scheme:\s*light/);
    assert.match(
      globals,
      /select option,[\s\S]*?background-color:\s*#FFFFFF;[\s\S]*?color:\s*#2C3E50/,
    );
    assert.match(
      primitives,
      /data-theme="dark"\]\s+select\s*\{\s*color-scheme:\s*dark/,
    );
    assert.match(primitives, /select option,[\s\S]*?--cg-surface-solid/);
    assert.match(primitives, /\[role="option"\]\[aria-selected="true"\]/);
  }
});

test("le Dashboard et Projets partagent l'action primaire canonique sans modifier le bouton destructif", () => {
  const dashboard = read("app/dashboard/page.tsx");
  const projects = read("app/projects/page.tsx");
  const primitives = read("design-system/primitives.css");
  const portalPrimitives = fs.readFileSync(
    path.resolve(ROOT, "../coro-client-portal/design-system/primitives.css"),
    "utf8",
  );

  assert.match(dashboard, /cg-primary-action[\s\S]*Nouveau projet/);
  assert.match(projects, /cg-primary-action[\s\S]*Nouveau projet/);
  const bulkDelete = projects.match(/setShowBulkDelete[\s\S]*?Supprimer \(/)?.[0] ?? "";
  assert.doesNotMatch(bulkDelete, /cg-primary-action/);
  for (const css of [primitives, portalPrimitives]) {
    assert.match(css, /\.cg-primary-action,/);
    assert.match(css, /\.cg-cta/);
    assert.match(css, /var\(--cg-glow-accent\)/);
  }
});

test("le quadrillage hors horaire du Planificateur suit les surfaces Glass sans changer le repli Classique", () => {
  const planning = read("app/planning/planning.module.css");
  const timeline = read("app/planning/ResourceTimeline.tsx");
  const primitives = read("design-system/primitives.css");
  assert.match(planning, /\.noSchedule\s*\{[^}]*#f5f6f8[^}]*#eceff2/);
  assert.match(timeline, /data-cg-no-schedule=\{work\.length \? undefined : ''\}/);
  assert.match(primitives, /\[data-cg-no-schedule\][\s\S]*var\(--cg-surface-sunken\)[\s\S]*var\(--cg-glass-bg-strong\)/);
});
