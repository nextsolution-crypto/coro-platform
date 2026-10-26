/* eslint-disable @typescript-eslint/no-require-imports */
// Portail client — migration Liquid Glass V2 : noyau partagé synchronisé, registre complet, Classique par défaut,
// bêta de préproduction seule activatrice, sensibilité et isolation vis-à-vis de l'application interne.
// Lancer : npm run test:skin
require("./test-loader.cjs");
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const REPO = path.resolve(ROOT, "..");
const { ROUTE_REGISTRY } = require("./routes/route-registry.ts");
const matcher = require("./routes/route-matcher.ts");
const core = require("./theme/theme-core.ts");
const pkg = JSON.parse(
  fs.readFileSync(path.join(ROOT, "package.json"), "utf8"),
);

const walk = (dir, out = []) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (["node_modules", ".next"].includes(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
};
const pages = walk(path.join(ROOT, "app"))
  .filter((p) => /[\\/]page\.tsx$/.test(p))
  .map(
    (p) =>
      "/" +
      path
        .relative(path.join(ROOT, "app"), p)
        .replace(/\\/g, "/")
        .replace(/\/?page\.tsx$/, ""),
  );
const sample = (pattern) => pattern.replace(/\[[^\]]+\]/g, "abc123");

test("le registre couvre exactement les pages de app/ (rien en trop, rien d’oublié)", () => {
  const a = new Set(pages);
  const b = new Set(ROUTE_REGISTRY.map((e) => e.pattern));
  assert.equal(
    a.size,
    47,
    "nombre de routes du portail : mettre à jour l’inventaire si une page est ajoutée",
  );
  assert.deepEqual(
    [...a].filter((p) => !b.has(p)),
    [],
    "page sans entrée au registre",
  );
  assert.deepEqual(
    [...b].filter((p) => !a.has(p)),
    [],
    "entrée sans page",
  );
  assert.equal(
    new Set(ROUTE_REGISTRY.map((e) => e.pattern)).size,
    ROUTE_REGISTRY.length,
  );
});

test("noyau partagé (jetons, thème, résolution de routes, chargeur) identique à coro-frontend", () => {
  const sync = require(
    path.join(
      REPO,
      "coro-frontend",
      "design-system",
      "tools",
      "sync-portal.cjs",
    ),
  );
  assert.deepEqual(sync.diff(), []);
});

test("feuille de teinte du portail identique à celle de l’application et référencée par SKIN_HREF", () => {
  const lf = (p) => fs.readFileSync(p, "utf8").replace(/\r\n/g, "\n");
  const mine = fs
    .readdirSync(path.join(ROOT, "public"))
    .filter((n) => /^glass-skin\.[0-9a-f]{10}\.css$/.test(n));
  const theirs = fs
    .readdirSync(path.join(REPO, "coro-frontend", "public"))
    .filter((n) => /^glass-skin\.[0-9a-f]{10}\.css$/.test(n));
  assert.equal(mine.length, 1);
  assert.deepEqual(mine, theirs);
  assert.equal(
    lf(path.join(ROOT, "public", mine[0])),
    lf(path.join(REPO, "coro-frontend", "public", theirs[0])),
  );
  assert.ok(
    lf(path.join(ROOT, "design-system", "skin", "skin-asset.ts")).includes(
      `'/${mine[0]}'`,
    ),
  );
});

test("toutes les routes : sans shell Glass natif, re-teintées, bêta uniquement (jamais ga) ; sensibles avec validation nommée et existante", () => {
  const SENSITIVE = ["emergency-content", "documents", "auth"];
  for (const e of ROUTE_REGISTRY) {
    assert.equal(
      e.shell,
      "none",
      e.pattern + " : le portail n’a pas de shell Glass natif",
    );
    assert.equal(e.render, "skin", e.pattern);
    assert.equal(e.status, "beta", e.pattern);
    assert.ok(!e.exception, e.pattern);
    if ((e.sensitivity || []).some((s) => SENSITIVE.includes(s))) {
      assert.ok(
        Array.isArray(e.validation) && e.validation.length > 0,
        `${e.pattern} : validation obligatoire`,
      );
      for (const s of e.validation)
        assert.ok(pkg.scripts[s], `${e.pattern} : script inexistant ${s}`);
    }
  }
  // Familles attendues : les routes d'urgence (Sentinelle, borne, présence, intervention, population) et d'authentification sont sensibles.
  for (const e of ROUTE_REGISTRY) {
    if (
      /^\/(sentinelle|kiosk|presence|intervention|population)/.test(e.pattern)
    )
      assert.ok(e.sensitivity.includes("emergency-content"), e.pattern);
    if (/^\/(login|forgot-password|reset-password|magic|magic-link)$/.test(e.pattern))
      assert.ok(e.sensitivity.includes("auth"), e.pattern);
    if (/^\/(documents|files)/.test(e.pattern))
      assert.ok(e.sensitivity.includes("documents"), e.pattern);
  }
});

test("routes d'authentification : inventaire sensible complet et sans doublon", () => {
  const authPatterns = ROUTE_REGISTRY.filter((e) => e.family === "auth").map(
    (e) => e.pattern,
  );
  assert.deepEqual(authPatterns.sort(), [
    "/forgot-password",
    "/login",
    "/magic",
    "/magic-link",
    "/reset-password",
  ]);
});

test("sans jeton de préproduction, AUCUNE route du portail n’est rendue en Glass (portail client livré strictement Classique)", () => {
  // En production : ni « 1 », ni « true », ni le stockage local d'un utilisateur n'activent la bêta ; seul le jeton exact le fait.
  for (const envValue of [undefined, "1", "true", "preview", "production"]) {
    assert.equal(
      core.resolveBetaEnabled({
        production: true,
        envValue,
        storageValue: "on",
      }),
      false,
      `envValue=${envValue}`,
    );
  }
  for (const production of [true, false])
    for (const e of ROUTE_REGISTRY) {
      const r = matcher.resolveRoute(sample(e.pattern), {
        production,
        betaEnabled: false,
      });
      assert.equal(r.mode, "legacy", `${e.pattern} (production=${production})`);
    }
  // Avec le jeton exact : toutes en canvas (Glass sans shell natif) ; routes inconnues : Legacy.
  const on = core.resolveBetaEnabled({
    production: true,
    envValue: "production-preview",
  });
  assert.equal(on, true);
  for (const e of ROUTE_REGISTRY)
    assert.equal(
      matcher.resolveRoute(sample(e.pattern), {
        production: true,
        betaEnabled: on,
      }).mode,
      "canvas",
      e.pattern,
    );
  assert.equal(
    matcher.resolveRoute("/inconnue", { production: true, betaEnabled: on })
      .mode,
    "legacy",
  );
  assert.equal(
    matcher.resolveRoute("/admin", { production: true, betaEnabled: on }).mode,
    "legacy",
    "aucune route interne n’existe dans le portail",
  );
});

test("script anti-flash : décision identique pour toutes les routes, avec et sans bêta", () => {
  const vm = require("node:vm");
  const table = matcher.shellTable();
  for (const betaBuild of [false, true])
    for (const e of ROUTE_REGISTRY) {
      const attrs = {};
      const p = sample(e.pattern);
      vm.runInNewContext(core.buildThemeInitScript(table, { betaBuild }), {
        window: {
          localStorage: {
            getItem: (k) => (k === "coro-ui-generation" ? "glass" : null),
          },
          matchMedia: () => ({ matches: false }),
          location: { pathname: p },
          setTimeout: () => 0,
        },
        document: {
          documentElement: {
            setAttribute: (k, v) => {
              attrs[k] = v;
            },
          },
        },
      });
      assert.equal(
        attrs["data-ui"],
        betaBuild ? "glass" : "legacy",
        `${p} (bêta ${betaBuild})`,
      );
    }
});

test("Classique par défaut : <html> rendu en legacy/light, feuille de teinte jamais importée globalement, seule ThemeProvider la charge", () => {
  const layout = fs.readFileSync(path.join(ROOT, "app", "layout.tsx"), "utf8");
  assert.match(layout, /data-ui="legacy"/);
  assert.match(layout, /data-theme="light"/);
  assert.match(layout, /suppressHydrationWarning/);
  assert.ok(
    !/glass-skin|skin-asset/.test(
      layout + fs.readFileSync(path.join(ROOT, "app", "globals.css"), "utf8"),
    ),
  );
  const users = walk(ROOT)
    .filter(
      (p) =>
        /\.(tsx|ts)$/.test(p) &&
        !/node_modules|\.test\./.test(p) &&
        fs.readFileSync(p, "utf8").includes("skin-asset"),
    )
    .map((p) => path.relative(ROOT, p).replace(/\\/g, "/"));
  assert.deepEqual(users, ["design-system/theme/ThemeProvider.tsx"]);
});

test("choix d’apparence : visible seulement dans un build de préproduction, mémorisé localement, sans appel réseau", () => {
  const src = fs.readFileSync(
    path.join(ROOT, "app", "components", "AppearanceSection.tsx"),
    "utf8",
  );
  assert.match(src, /isBetaEnabled\(\)/);
  assert.match(src, /if \(!enabled\) return null;/);
  assert.ok(
    !/fetch\(|apiGet|apiPost|XMLHttpRequest/.test(src),
    "aucun appel réseau",
  );
  const profile = fs.readFileSync(
    path.join(ROOT, "app", "profile", "page.tsx"),
    "utf8",
  );
  assert.match(profile, /<AppearanceSection \/>/);
});

test("isolation : le portail n’importe rien de l’application interne et n’expose aucune navigation ni permission interne", () => {
  for (const p of walk(ROOT)) {
    if (
      !/\.(tsx|ts|cjs|mjs)$/.test(p) ||
      /node_modules|\.next|\.test\./.test(p)
    )
      continue;
    const src = fs.readFileSync(p, "utf8");
    assert.ok(
      !/from ['"][^'"]*coro-frontend[^'"]*['"]/.test(src),
      `${p} importe l'application interne`,
    );
    assert.ok(
      !/from ['"][^'"]*coro-website[^'"]*['"]/.test(src),
      `${p} importe le site vitrine`,
    );
  }
  const layout = fs.readFileSync(
    path.join(ROOT, "app", "components", "PortalLayout.tsx"),
    "utf8",
  );
  assert.ok(
    !/SUPER_ADMIN|isFounder|PlatformAuthority|\/admin/.test(layout),
    "PortalLayout ne contient aucune navigation interne",
  );
  // La barre ne reçoit la classe de verre qu'en Glass : en Classique, aucune classe n'est ajoutée (rendu inchangé).
  assert.match(
    layout,
    /className=\{\s*ui === ["']glass["'] \? ["']cg-chrome["'] : undefined\s*\}/,
  );
});

test("navigation : les libellés complets attendent un écran large pour éviter le débordement du bandeau", () => {
  const layout = fs.readFileSync(
    path.join(ROOT, "app", "components", "PortalLayout.tsx"),
    "utf8",
  );
  assert.match(layout, /className=\{workspace.navigationLabel\}/);
  const responsive = fs.readFileSync(path.join(ROOT, "app/components/PortalWorkspace.module.css"), "utf8");
  assert.match(responsive, /min-width: 1900px/);
  assert.match(responsive, /overflow-x: auto/);
  assert.match(layout, /className="hidden 2xl:block"/);
  assert.doesNotMatch(layout, /hidden xl:inline/);
});

test("modules CSS du portail : replis var(--cg-skin-*, #hex) à jour", () => {
  const tok = require(
    path.join(
      REPO,
      "coro-frontend",
      "design-system",
      "tools",
      "tokenize-css.cjs",
    ),
  );
  assert.deepEqual(tok.status(), []);
});

test("production : aucun fichier du portail n’importe un test, le chargeur de test ou un outil de développement", () => {
  for (const p of walk(ROOT)) {
    if (
      !/\.(tsx|ts)$/.test(p) ||
      /node_modules|\.next/.test(p) ||
      /\.test\./.test(p)
    )
      continue;
    const src = fs.readFileSync(p, "utf8");
    assert.ok(
      !/from ['"][^'"]*(test-loader|\.test|bench|mock-api|sync-portal|build-skin|tokenize-css)[^'"]*['"]/.test(
        src,
      ),
      `${path.relative(ROOT, p)} importe un outil de développement`,
    );
  }
  // Le portail ne contient ni banc ni outils : ils vivent dans coro-frontend/design-system et ne sont jamais livrés.
  assert.ok(
    !fs.existsSync(path.join(ROOT, "design-system", "bench")) &&
      !fs.existsSync(path.join(ROOT, "design-system", "tools")),
  );
  // Aucune route de développement (équivalent de /glass-kit) dans le portail.
  assert.ok(
    !walk(path.join(ROOT, "app")).some((p) => /page\.dev\.tsx$/.test(p)),
  );
});
