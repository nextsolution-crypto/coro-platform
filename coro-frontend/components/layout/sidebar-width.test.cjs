/* eslint-disable @typescript-eslint/no-require-imports */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

require.extensions[".ts"] = (module, filename) => {
  const output = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  module._compile(output, filename);
};

const {
  GLASS_SIDEBAR_DEFAULT_WIDTH,
  GLASS_SIDEBAR_WIDTH_STORAGE_KEY,
  LEGACY_SIDEBAR_DEFAULT_WIDTH,
  SIDEBAR_MAX_WIDTH,
  SIDEBAR_MIN_WIDTH,
  clampSidebarWidth,
  getGlassSidebarWidthServerSnapshot,
  getGlassSidebarWidthSnapshot,
  parseStoredGlassSidebarWidth,
  setGlassSidebarWidthPreference,
} = require("./sidebar-width.ts");

test("fresh Glass users receive the governed 350px default", () => {
  assert.equal(GLASS_SIDEBAR_DEFAULT_WIDTH, 350);
  assert.equal(getGlassSidebarWidthServerSnapshot(), 350);
  assert.equal(parseStoredGlassSidebarWidth(null), 350);
  assert.equal(parseStoredGlassSidebarWidth(""), 350);
});

test("valid saved Glass widths remain unchanged", () => {
  for (const width of [SIDEBAR_MIN_WIDTH, 240, 350, SIDEBAR_MAX_WIDTH]) {
    assert.equal(parseStoredGlassSidebarWidth(String(width)), width);
  }
});

test("invalid saved Glass widths fail closed to 350px", () => {
  for (const value of ["179", "401", "350.5", "NaN", "Infinity", "garbage"]) {
    assert.equal(parseStoredGlassSidebarWidth(value), 350);
  }
});

test("drag clamping preserves the existing 180px to 400px range", () => {
  assert.equal(clampSidebarWidth(100), 180);
  assert.equal(clampSidebarWidth(350), 350);
  assert.equal(clampSidebarWidth(500), 400);
});

test("resizing remains active for the session when browser storage is unavailable", () => {
  const previousWindow = global.window;
  global.window = {
    localStorage: {
      getItem: () => {
        throw new Error("storage unavailable");
      },
      setItem: () => {
        throw new Error("storage unavailable");
      },
    },
    dispatchEvent: () => true,
  };
  try {
    setGlassSidebarWidthPreference(325);
    assert.equal(getGlassSidebarWidthSnapshot(), 325);
  } finally {
    global.window = previousWindow;
  }
});

test("Classic retains its 240px default and Glass uses a dedicated preference key", () => {
  assert.equal(LEGACY_SIDEBAR_DEFAULT_WIDTH, 240);
  assert.equal(GLASS_SIDEBAR_WIDTH_STORAGE_KEY, "coro-glass-sidebar-width");
});

test("AppLayout keeps mobile sizing independent and persists only Glass resizing", () => {
  const source = fs.readFileSync(path.join(__dirname, "AppLayout.tsx"), "utf8");
  assert.ok(source.includes("'min(86vw, 320px)'"));
  assert.ok(source.includes("glass ? glassSidebarWidth : legacySidebarWidth"));
  assert.ok(source.includes("setGlassSidebarWidthPreference(newWidth)"));
  assert.ok(source.includes("if (glass)"));
});
