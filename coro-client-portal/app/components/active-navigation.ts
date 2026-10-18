export type PortalNavigationDestination = { path: string };

const normalizePathname = (pathname: string) => {
  const path = pathname.split(/[?#]/, 1)[0] || "/";
  if (path === "/") return path;
  return path.replace(/\/+$/, "");
};

/** Resolve one portal destination only; the most specific route wins. */
export function resolveActivePortalNavigationPath(
  pathname: string,
  destinations: readonly PortalNavigationDestination[],
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
