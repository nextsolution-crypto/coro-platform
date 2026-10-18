export type NavigationDestination = {
  path: string;
  /** Nested workflows whose stable sidebar destination is this item. */
  matchPaths?: readonly string[];
};

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
    .flatMap(({ path, matchPaths = [] }) =>
      [path, ...matchPaths].map((matchPath) => ({
        destination: normalizePathname(path),
        matchPath: normalizePathname(matchPath),
      })),
    )
    .filter(
      ({ matchPath }) =>
        current === matchPath ||
        (matchPath !== "/" && current.startsWith(`${matchPath}/`)),
    )
    .sort(
      (left, right) =>
        right.matchPath.length - left.matchPath.length ||
        left.destination.localeCompare(right.destination),
    );

  return matches[0]?.destination ?? null;
}
