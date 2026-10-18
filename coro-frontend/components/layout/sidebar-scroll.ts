export const SIDEBAR_SCROLL_STORAGE_KEY = "coro-sidebar-scroll-top";

type VerticalBounds = {
  top: number;
  bottom: number;
};

export function parseStoredSidebarScroll(value: string | null): number {
  if (value === null || value.trim() === "") return 0;

  const scrollTop = Number(value);
  if (!Number.isFinite(scrollTop) || scrollTop < 0) return 0;

  return scrollTop;
}

export function readSidebarScrollPosition(): number {
  try {
    return parseStoredSidebarScroll(
      window.sessionStorage.getItem(SIDEBAR_SCROLL_STORAGE_KEY),
    );
  } catch {
    return 0;
  }
}

export function persistSidebarScrollPosition(scrollTop: number): void {
  const safeScrollTop = Number.isFinite(scrollTop)
    ? Math.max(0, scrollTop)
    : 0;
  try {
    window.sessionStorage.setItem(
      SIDEBAR_SCROLL_STORAGE_KEY,
      String(safeScrollTop),
    );
  } catch {
    // Navigation remains usable when session storage is unavailable.
  }
}

export function getScrollTopForVisibleItem(
  currentScrollTop: number,
  container: VerticalBounds,
  item: VerticalBounds,
): number {
  if (item.top < container.top) {
    return Math.max(0, currentScrollTop + item.top - container.top);
  }
  if (item.bottom > container.bottom) {
    return Math.max(0, currentScrollTop + item.bottom - container.bottom);
  }
  return currentScrollTop;
}
