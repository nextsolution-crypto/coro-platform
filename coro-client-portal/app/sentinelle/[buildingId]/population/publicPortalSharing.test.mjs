import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  buildPublicRegistrationUrl,
  copyPublicPortalUrl,
  createPublicPortalQr,
  resolvePublicPortalBaseUrl,
} from "./publicPortalSharing.mjs";

const directory = dirname(fileURLToPath(import.meta.url));
const componentSource = readFileSync(join(directory, "PublicPortalSharing.tsx"), "utf8");

test("constructs the canonical public URL and encodes the public slug", () => {
  assert.equal(
    buildPublicRegistrationUrl("coro validation/live", "https://client.getcoro.io/internal?token=no"),
    "https://client.getcoro.io/population/coro%20validation%2Flive",
  );
  assert.equal(resolvePublicPortalBaseUrl("", "https://preview.example.test/path"), "https://preview.example.test/");
});

test("the public URL contains only the public route and encoded slug", () => {
  const url = new URL(buildPublicRegistrationUrl("public-slug", "https://client.getcoro.io"));
  assert.equal(url.pathname, "/population/public-slug");
  assert.equal(url.search, "");
  assert.equal(url.hash, "");
  assert.doesNotMatch(url.toString(), /token|jwt|organization|building|clientUser/i);
});

test("QR generation receives exactly the displayed public URL", async () => {
  const publicUrl = "https://client.getcoro.io/population/public-slug";
  let renderedPayload = "";
  const result = await createPublicPortalQr(publicUrl, async (payload) => {
    renderedPayload = payload;
    return "<svg data-test=\"qr\"></svg>";
  });
  assert.equal(renderedPayload, publicUrl);
  assert.equal(result.payload, publicUrl);
  assert.match(result.svg, /^<svg/);
});

test("generates a printable SVG locally without a hosted QR service", async () => {
  const result = await createPublicPortalQr("https://client.getcoro.io/population/public-slug");
  assert.match(result.svg, /^<svg/);
  assert.match(result.svg, /viewBox=/);
  assert.doesNotMatch(result.svg, /client\.getcoro\.io|population\/public-slug/);
});

test("copy-link writes the exact public URL and propagates clipboard failure", async () => {
  const publicUrl = "https://client.getcoro.io/population/public-slug";
  let copied = "";
  await copyPublicPortalUrl(publicUrl, async (value) => { copied = value; });
  assert.equal(copied, publicUrl);
  await assert.rejects(copyPublicPortalUrl(publicUrl, async () => { throw new Error("denied"); }), /denied/);
});

test("renders bilingual enabled, disabled, copy, open, and downloadable QR states", () => {
  assert.match(componentSource, /PORTAIL CITOYEN · CITIZEN PORTAL/);
  assert.match(componentSource, /Les inscriptions citoyennes sont actuellement désactivées/);
  assert.match(componentSource, /Citizen registration is currently disabled/);
  assert.match(componentSource, /Ouvrir le portail \/ Open portal/);
  assert.match(componentSource, /Copier le lien \/ Copy link/);
  assert.match(componentSource, /Télécharger le QR \/ Download QR/);
  assert.match(componentSource, /data-state="enabled"/);
  assert.match(componentSource, /data-state="disabled"/);
  assert.match(componentSource, /image\/svg\+xml/);
});

test("keeps the existing public Population route unchanged", () => {
  const publicPage = join(directory, "..", "..", "..", "population", "[publicSlug]", "page.tsx");
  assert.equal(statSync(publicPage).isFile(), true);
  const source = readFileSync(publicPage, "utf8");
  assert.match(source, /PopulationPublicShell publicSlug=\{publicSlug\}/);
});
