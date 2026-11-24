// Aide et support du portail (24 nov. 2026).
import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const read = (p) => fs.readFileSync(new URL(p, import.meta.url), "utf8");
const list = read("./page.tsx");
const thread = read("./[id]/page.tsx");
const shared = read("./support-shared.ts");
const layout = read("../components/PortalLayout.tsx");

test("le portail propose « Aide et support » dans le menu", () => {
  assert.match(layout, /\{ label: "Aide et support", path: "\/support", icon: LifeBuoy \}/);
});

test("le client choisit un type, la question va à sa firme-conseil", () => {
  assert.match(shared, /value: "QUESTION", label: "Question sur mes plans ou mes bâtiments", hint: "Envoyée à votre firme-conseil\."/);
  assert.match(list, /apiPost\("\/client-portal\/support\/tickets"/);
  assert.match(list, /composez le 911/);
});

test("pièces jointes PDF ou JPG, 25 Mo, et suivi du fil", () => {
  assert.match(shared, /export const ACCEPT = "\.pdf,\.jpg,\.jpeg,application\/pdf,image\/jpeg";/);
  assert.match(shared, /MAX_BYTES = 25 \* 1024 \* 1024/);
  assert.match(thread, /\/client-portal\/support\/tickets\/\$\{ticket\.id\}\/messages/);
  assert.match(thread, /act\("reopen"\)/);
  assert.doesNotMatch(thread, /internal/, "le client ne voit ni n’écrit de note interne");
});
