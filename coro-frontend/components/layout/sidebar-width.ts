export const LEGACY_SIDEBAR_DEFAULT_WIDTH = 240;
export const GLASS_SIDEBAR_DEFAULT_WIDTH = 350;
export const SIDEBAR_MIN_WIDTH = 180;
export const SIDEBAR_MAX_WIDTH = 400;
export const GLASS_SIDEBAR_WIDTH_STORAGE_KEY = "coro-glass-sidebar-width";
const GLASS_SIDEBAR_WIDTH_CHANGE_EVENT = "coro:glass-sidebar-width-change";

let inMemoryGlassSidebarWidth = GLASS_SIDEBAR_DEFAULT_WIDTH;
let hasInMemoryOverride = false;

export function clampSidebarWidth(width: number): number {
  return Math.min(Math.max(width, SIDEBAR_MIN_WIDTH), SIDEBAR_MAX_WIDTH);
}

export function parseStoredGlassSidebarWidth(value: string | null): number {
  if (value === null || value.trim() === "") return GLASS_SIDEBAR_DEFAULT_WIDTH;

  const width = Number(value);
  if (!Number.isFinite(width) || !Number.isInteger(width))
    return GLASS_SIDEBAR_DEFAULT_WIDTH;
  if (width < SIDEBAR_MIN_WIDTH || width > SIDEBAR_MAX_WIDTH)
    return GLASS_SIDEBAR_DEFAULT_WIDTH;

  return width;
}

export function getGlassSidebarWidthSnapshot(): number {
  if (hasInMemoryOverride) return inMemoryGlassSidebarWidth;
  try {
    inMemoryGlassSidebarWidth = parseStoredGlassSidebarWidth(
      window.localStorage.getItem(GLASS_SIDEBAR_WIDTH_STORAGE_KEY),
    );
  } catch {
    // Keep the last usable in-memory width when storage is unavailable.
  }
  return inMemoryGlassSidebarWidth;
}

export function getGlassSidebarWidthServerSnapshot(): number {
  return GLASS_SIDEBAR_DEFAULT_WIDTH;
}

export function setGlassSidebarWidthPreference(width: number): void {
  inMemoryGlassSidebarWidth = clampSidebarWidth(width);
  hasInMemoryOverride = true;
  try {
    window.localStorage.setItem(
      GLASS_SIDEBAR_WIDTH_STORAGE_KEY,
      String(inMemoryGlassSidebarWidth),
    );
  } catch {
    // Resizing remains functional for the current session when storage is unavailable.
  }
  window.dispatchEvent(new Event(GLASS_SIDEBAR_WIDTH_CHANGE_EVENT));
}

export function subscribeToGlassSidebarWidth(
  onStoreChange: () => void,
): () => void {
  const onStorage = (event: StorageEvent) => {
    if (event.key === GLASS_SIDEBAR_WIDTH_STORAGE_KEY || event.key === null) {
      hasInMemoryOverride = false;
      onStoreChange();
    }
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(GLASS_SIDEBAR_WIDTH_CHANGE_EVENT, onStoreChange);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(GLASS_SIDEBAR_WIDTH_CHANGE_EVENT, onStoreChange);
  };
}
