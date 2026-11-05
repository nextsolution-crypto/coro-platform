import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const summary = readFileSync(
  join(here, "DispersionCriticalSummary.tsx"),
  "utf8",
);
const map = readFileSync(join(here, "PopulationOperationalMap.tsx"), "utf8");

test("labels scientific, notification, protection and responder zones explicitly", () => {
  assert.match(summary, /Zone scientifique modélisée/);
  assert.match(summary, /Zone opérationnelle de notification/);
  assert.match(summary, /Zone de protection - mise à l’abri/);
  assert.match(summary, /Zone opérationnelle des intervenants/);
});

test("does not present a maximum distance or a planning ring as an exact plume", () => {
  assert.match(summary, /distance issue de la source/);
  assert.match(
    summary,
    /ne.*constitue pas, à elle seule, une empreinte scientifique circulaire/s,
  );
  assert.match(map, /indicatifs de planification/);
  assert.match(map, /ne remplacent.*la géométrie du rapport de dispersion/s);
});
