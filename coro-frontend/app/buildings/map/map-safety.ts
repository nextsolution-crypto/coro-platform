export type MapCoordinate = {
  latitude: unknown;
  longitude: unknown;
};

export function hasValidMapCoordinate<T extends MapCoordinate>(
  value: T,
): value is T & { latitude: number; longitude: number } {
  return (
    typeof value.latitude === "number" &&
    Number.isFinite(value.latitude) &&
    value.latitude >= -90 &&
    value.latitude <= 90 &&
    typeof value.longitude === "number" &&
    Number.isFinite(value.longitude) &&
    value.longitude >= -180 &&
    value.longitude <= 180
  );
}

export function createSafeTooltip(
  documentRef: Pick<Document, "createElement">,
  name: unknown,
  clientName?: unknown,
): HTMLDivElement {
  const root = documentRef.createElement("div");
  const title = documentRef.createElement("div");
  title.style.cssText = "font-size:12px;font-weight:700;color:#E2E8F0;";
  title.textContent = typeof name === "string" ? name : "";
  root.appendChild(title);

  if (typeof clientName === "string" && clientName.trim()) {
    const client = documentRef.createElement("div");
    client.style.cssText = "font-size:10px;color:#8899AA;margin-top:2px;";
    client.textContent = clientName;
    root.appendChild(client);
  }

  return root;
}

export function safeEntityPath(prefix: string, id: unknown): string | null {
  if (typeof id !== "string" || !/^[A-Za-z0-9_-]{1,128}$/.test(id)) return null;
  return `${prefix}/${encodeURIComponent(id)}`;
}
