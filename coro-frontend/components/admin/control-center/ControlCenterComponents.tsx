import Link from "next/link";
export type Quality = "CANONICAL" | "INFERABLE" | "NOT_AVAILABLE";
export function DataQualityBadge({ quality }: { quality: Quality }) {
  const colors =
    quality === "CANONICAL"
      ? "bg-emerald-50 text-emerald-700"
      : quality === "INFERABLE"
        ? "bg-amber-50 text-amber-700"
        : "bg-slate-100 text-slate-600";
  return (
    <span className={`rounded-full px-2 py-1 text-xs font-semibold ${colors}`}>
      {quality}
    </span>
  );
}
export function ControlCenterSummaryCard({
  label,
  value,
  href,
  quality = "CANONICAL",
}: {
  label: string;
  value: unknown;
  href?: string;
  quality?: Quality;
}) {
  const content = (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm text-slate-600">{label}</p>
        <DataQualityBadge quality={quality} />
      </div>
      <p className="mt-3 text-3xl font-semibold text-slate-900">
        {String(value ?? "—")}
      </p>
    </div>
  );
  return href ? <Link href={href}>{content}</Link> : content;
}
export function OrganizationStatusBadge({ active }: { active: boolean }) {
  return (
    <span
      className={`rounded-full px-2 py-1 text-xs font-semibold ${active ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}
    >
      {active ? "ACTIVE" : "SUSPENDED"}
    </span>
  );
}
export function CommercialRelationshipBadge({
  value,
}: {
  value?: string | null;
}) {
  return (
    <span className="rounded-full bg-indigo-50 px-2 py-1 text-xs font-semibold text-indigo-700">
      {value ?? "NOT_CONFIGURED"}
    </span>
  );
}
export function ReconciliationBadge({ value }: { value: string }) {
  const color =
    value === "MATCH"
      ? "bg-emerald-50 text-emerald-700"
      : value === "ACTION_REQUIRED"
        ? "bg-red-50 text-red-700"
        : value === "WARNING"
          ? "bg-amber-50 text-amber-700"
          : "bg-slate-100 text-slate-600";
  return (
    <span className={`rounded-full px-2 py-1 text-xs font-semibold ${color}`}>
      {value}
    </span>
  );
}
export function LegacyLicensePanel({ licenseType }: { licenseType: string }) {
  const limited = licenseType === "ESSAI_GRATUIT";
  return (
    <section className="rounded-xl border border-amber-200 bg-amber-50 p-4">
      <p className="text-xs font-bold tracking-wider text-amber-800">
        LEGACY LICENSE
      </p>
      <h3 className="mt-1 font-semibold text-slate-900">{licenseType}</h3>
      <p className="mt-2 text-sm text-slate-700">
        Legacy enforcement: ACTIVE · Users: {limited ? "1" : "unlimited"} ·
        Projects: {limited ? "1" : "unlimited"}
      </p>
      <p className="mt-1 text-xs text-slate-600">
        Not derived from Contract or Entitlements. Existing user and project
        creation workflows still depend on it.
      </p>
    </section>
  );
}
type Cell = {
  value: unknown;
  quality: Quality;
  provenance?: Array<{ entityType?: string }>;
};
type MatrixRow = {
  code: string;
  label: string;
  platform: Cell;
  proposed: Cell;
  contracted: Cell;
  licensed: Cell;
  enabled: Cell;
  distributable: Cell;
  configured: Cell;
  observed: Cell;
  reconciliation: Cell;
};
export function CapabilityMatrix({ rows }: { rows: MatrixRow[] }) {
  const columns: Array<keyof Omit<MatrixRow, "code" | "label">> = [
    "platform",
    "proposed",
    "contracted",
    "licensed",
    "enabled",
    "distributable",
    "configured",
    "observed",
    "reconciliation",
  ];
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-left text-xs">
        <thead>
          <tr>
            <th className="border-b p-2">Capability</th>
            {columns.map((column) => (
              <th className="border-b p-2 capitalize" key={column}>
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.code}>
              <td className="border-b p-2 font-semibold">{row.label}</td>
              {columns.map((column) => {
                const cell = row[column] as Cell;
                const display =
                  column === "reconciliation" &&
                  cell.value &&
                  typeof cell.value === "object"
                    ? String(
                        (cell.value as { status?: string }).status ?? "UNKNOWN",
                      )
                    : typeof cell.value === "boolean"
                      ? cell.value
                        ? "YES"
                        : "NO"
                      : Array.isArray(cell.value)
                        ? String(cell.value.length)
                        : cell.value && typeof cell.value === "object"
                          ? JSON.stringify(cell.value)
                          : String(cell.value ?? "—");
                return (
                  <td className="border-b p-2 align-top" key={column}>
                    <div className="max-w-48 truncate" title={display}>
                      {display}
                    </div>
                    <div className="mt-1">
                      <DataQualityBadge quality={cell.quality} />
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
type TreeNode = {
  type: string;
  id: string;
  label: string;
  exactEntitlements?: unknown[];
  children?: TreeNode[];
};
export function CapabilityScopeTree({ root }: { root?: TreeNode }) {
  if (!root)
    return <p className="text-sm text-slate-500">Scope tree unavailable.</p>;
  const Node = ({ node, depth = 0 }: { node: TreeNode; depth?: number }) => (
    <div
      style={{ marginLeft: depth * 18 }}
      className="border-l border-slate-200 py-1 pl-3"
    >
      <span className="font-medium">{node.label}</span>{" "}
      <span className="text-xs text-slate-500">
        {node.type} · {node.exactEntitlements?.length ?? 0} explicit grant(s)
      </span>
      {node.children?.map((child) => (
        <Node
          key={`${child.type}-${child.id}`}
          node={child}
          depth={depth + 1}
        />
      ))}
    </div>
  );
  return <Node node={root} />;
}
