import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(
  new URL(
    "../app/clients/[id]/OperationalPermissionsPanel.tsx",
    import.meta.url,
  ),
  "utf8",
);

test("expose les trois permissions Incident sans droit implicite de délégation", () => {
  for (const permission of [
    "INCIDENT_READ",
    "INCIDENT_SUPERVISE",
    "INCIDENT_COMMAND",
  ])
    assert.match(source, new RegExp(permission));
  assert.match(source, /COMMAND ne permet jamais de déléguer/);
});

test("explique et administre les deux niveaux avec motif et révocation", () => {
  assert.match(source, /permission individuelle et\s+une affectation active/);
  assert.match(source, /incident-permissions/);
  assert.match(source, /incident-authorizations/);
  assert.match(source, /Motif de révocation/);
  assert.match(source, /Idempotency-Key/);
});

test("rend les contrôles tactiles utilisables et affiche l accès effectif", () => {
  assert.match(source, /min-h-11/);
  assert.match(source, /Affectations et accès effectif/);
  assert.match(source, /effectivePermissions/);
});
