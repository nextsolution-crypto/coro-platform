require("../../design-system/test-loader.cjs");
const test = require("node:test");
const assert = require("node:assert/strict");

const {
  SIDEBAR_SCROLL_STORAGE_KEY,
  getScrollTopForVisibleItem,
  parseStoredSidebarScroll,
  persistSidebarScrollPosition,
  readSidebarScrollPosition,
} = require("./sidebar-scroll.ts");

test("la position de navigation est conservée pour la session et après F5", () => {
  const previousWindow = global.window;
  const values = new Map();
  global.window = {
    sessionStorage: {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, value),
    },
  };
  try {
    persistSidebarScrollPosition(428);
    assert.equal(values.get(SIDEBAR_SCROLL_STORAGE_KEY), "428");
    assert.equal(readSidebarScrollPosition(), 428);
  } finally {
    global.window = previousWindow;
  }
});

test("les préférences absentes ou invalides reviennent au sommet en sécurité", () => {
  for (const value of [null, "", "-1", "NaN", "Infinity", "invalide"]) {
    assert.equal(parseStoredSidebarScroll(value), 0);
  }
});

test("une destination déjà visible ne provoque aucun défilement", () => {
  assert.equal(
    getScrollTopForVisibleItem(
      320,
      { top: 100, bottom: 700 },
      { top: 240, bottom: 284 },
    ),
    320,
  );
});

test("une destination hors champ est révélée par le déplacement minimal", () => {
  assert.equal(
    getScrollTopForVisibleItem(
      320,
      { top: 100, bottom: 700 },
      { top: 52, bottom: 96 },
    ),
    272,
  );
  assert.equal(
    getScrollTopForVisibleItem(
      320,
      { top: 100, bottom: 700 },
      { top: 728, bottom: 772 },
    ),
    392,
  );
});

test("le repli supérieur ne produit jamais une position négative", () => {
  assert.equal(
    getScrollTopForVisibleItem(
      10,
      { top: 100, bottom: 700 },
      { top: 20, bottom: 64 },
    ),
    0,
  );
});
