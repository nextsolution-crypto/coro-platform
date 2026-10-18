export type NavigationDestination = { path: string };

const normalizePathname = (pathname: string) => {
  const path = pathname.split(/[?#]/, 1)[0] || "/";
  if (path === "/") return path;
  return path.replace(/\/+$/, "");
};

/** Resolve exactly one selected destination; the most specific match wins. */
export function resolveActiveNavigationPath(
  pathname: string,
  destinations: readonly NavigationDestination[],
): string | null {
  const current = normalizePathname(pathname);
  const matches = destinations
    .map(({ path }) => normalizePathname(path))
    .filter(
      (path) =>
        current === path || (path !== "/" && current.startsWith(`${path}/`)),
    )
    .sort(
      (left, right) => right.length - left.length || left.localeCompare(right),
    );

  return matches[0] ?? null;
}
