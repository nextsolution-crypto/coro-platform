"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import api from "@/lib/api";

type Json = Record<string, unknown>;
type Grant = Json & {
  id: string;
  source: string;
  lockVersion: number;
  capability?: Json;
  revisions?: Json[];
};
const noticeFr =
  "Cette action modifie uniquement le droit commercial associé à cette capability. Elle ne modifie aucune configuration opérationnelle et n'interrompt aucun workflow opérationnel actif. Aucun mécanisme d'enforcement n'est appliqué.";
const noticeEn =
  "This action changes only the commercial entitlement associated with this capability. It does not modify operational configuration or interrupt any active operational workflow. No enforcement mechanism is applied.";

export default function CapabilityOperationsWorkspace({
  organizationId,
  initialCapability,
}: {
  organizationId: string;
  initialCapability?: string;
}) {
  const [grants, setGrants] = useState<Grant[]>([]);
  const [filter, setFilter] = useState(initialCapability ?? "");
  const [selected, setSelected] = useState<Grant | null>(null);
  const [action, setAction] = useState("DISABLE");
  const [createAction, setCreateAction] = useState("CREATE_TRIAL");
  const [reason, setReason] = useState("");
  const [scope, setScope] = useState("ORGANIZATION");
  const [clientId, setClientId] = useState("");
  const [buildingId, setBuildingId] = useState("");
  const [parentEntitlementId, setParentEntitlementId] = useState("");
  const [contractId, setContractId] = useState("");
  const [contractRevisionId, setContractRevisionId] = useState("");
  const [snapshotLineId, setSnapshotLineId] = useState("");
  const [enabled, setEnabled] = useState(true);
  const [distributable, setDistributable] = useState(false);
  const [effectiveUntil, setEffectiveUntil] = useState("");
  const [limitsText, setLimitsText] = useState("[]");
  const [removeAllLimits, setRemoveAllLimits] = useState(false);
  const [preview, setPreview] = useState<Json | null>(null);
  const [acknowledged, setAcknowledged] = useState<string[]>([]);
  const [error, setError] = useState("");
  const refresh = useCallback(async () => {
    const response = await api.get(
      `/admin/v1/organizations/${organizationId}/entitlements`,
    );
    setGrants(response.data ?? []);
  }, [organizationId]);
  useEffect(() => {
    let active = true;
    api
      .get(`/admin/v1/organizations/${organizationId}/entitlements`)
      .then((response) => {
        if (active) setGrants(response.data ?? []);
      });
    return () => {
      active = false;
    };
  }, [organizationId]);
  const visible = useMemo(
    () =>
      grants.filter(
        (grant) => !filter || String(grant.capability?.code) === filter,
      ),
    [filter, grants],
  );

  function parsedLimits() {
    const value: unknown = JSON.parse(limitsText);
    if (!Array.isArray(value)) throw new Error("Limits must be a JSON array");
    return value;
  }

  function creationPayload() {
    return {
      operation: createAction,
      capabilityCode: filter,
      scope,
      clientId: clientId || undefined,
      buildingId: buildingId || undefined,
      source:
        createAction === "PROVISION_CONTRACT"
          ? "CONTRACT"
          : createAction === "DISTRIBUTE"
            ? "DISTRIBUTION"
            : createAction === "CREATE_TRIAL"
              ? "TRIAL"
              : createAction === "CREATE_MANUAL_OVERRIDE"
                ? "MANUAL_OVERRIDE"
                : "INTERNAL",
      parentEntitlementId: parentEntitlementId || undefined,
      sourceContractId: contractId || undefined,
      sourceContractRevisionId: contractRevisionId || undefined,
      sourceSnapshotLineId: snapshotLineId || undefined,
      enabled,
      distributable,
      effectiveFrom: new Date().toISOString(),
      effectiveUntil: effectiveUntil
        ? new Date(effectiveUntil).toISOString()
        : undefined,
      limits: parsedLimits(),
      reason,
      acknowledgedWarningCodes: [],
    };
  }

  async function previewCreation() {
    try {
      const response = await api.post(
        `/admin/v1/organizations/${organizationId}/entitlements/preview`,
        creationPayload(),
      );
      setPreview(response.data);
      setSelected(null);
      setAcknowledged([]);
      setError("");
    } catch (value) {
      setError(value instanceof Error ? value.message : "Preview failed");
    }
  }

  async function executeCreation() {
    if (!preview) return;
    const payload = {
      ...creationPayload(),
      acknowledgedWarningCodes: acknowledged,
    };
    const path =
      createAction === "PROVISION_CONTRACT"
        ? `contracts/${contractId}/revisions/${contractRevisionId}/provision-entitlements`
        : createAction === "DISTRIBUTE" && scope === "SITE"
          ? `sites/${buildingId}/entitlements/distribute`
          : createAction === "DISTRIBUTE"
            ? `clients/${clientId}/entitlements/distribute`
            : createAction === "CREATE_TRIAL"
              ? "entitlements/trials"
              : createAction === "CREATE_MANUAL_OVERRIDE"
                ? "entitlements/manual-overrides"
                : "entitlements/internal";
    await api.post(
      `/admin/v1/organizations/${organizationId}/${path}`,
      payload,
    );
    setPreview(null);
    await refresh();
  }

  async function requestPreview() {
    if (!selected) return;
    const revision = selected.revisions?.[0];
    try {
      const response = await api.post(
        `/admin/v1/organizations/${organizationId}/entitlements/preview`,
        {
          operation: action,
          entitlementId: selected.id,
          expectedLockVersion: selected.lockVersion,
          expectedRevisionId: revision?.id,
          reason,
          effectiveFrom:
            action === "REVOKE" ? undefined : new Date().toISOString(),
          effectiveUntil:
            action === "CHANGE_DATES" && effectiveUntil
              ? new Date(effectiveUntil).toISOString()
              : undefined,
          distributable:
            action === "SET_DISTRIBUTABLE" ? distributable : undefined,
          limits: action === "CHANGE_LIMITS" ? parsedLimits() : undefined,
          removeAllLimits:
            action === "CHANGE_LIMITS" ? removeAllLimits : undefined,
          acknowledgedWarningCodes: [],
        },
      );
      setPreview(response.data);
      setAcknowledged([]);
      setError("");
    } catch (value) {
      setError(value instanceof Error ? value.message : "Preview failed");
    }
  }
  async function execute() {
    if (!selected || !preview) return;
    const path = action.toLowerCase().replaceAll("_", "-");
    try {
      await api.post(
        `/admin/v1/organizations/${organizationId}/entitlements/${selected.id}/${path}`,
        {
          expectedLockVersion: preview.expectedLockVersion,
          expectedRevisionId: preview.expectedRevisionId,
          reason,
          effectiveFrom:
            action === "REVOKE" ? undefined : new Date().toISOString(),
          effectiveUntil:
            action === "CHANGE_DATES" && effectiveUntil
              ? new Date(effectiveUntil).toISOString()
              : undefined,
          distributable:
            action === "SET_DISTRIBUTABLE" ? distributable : undefined,
          limits: action === "CHANGE_LIMITS" ? parsedLimits() : undefined,
          removeAllLimits:
            action === "CHANGE_LIMITS" ? removeAllLimits : undefined,
          acknowledgedWarningCodes: acknowledged,
        },
      );
      setPreview(null);
      setSelected(null);
      await refresh();
    } catch (value) {
      setError(value instanceof Error ? value.message : "Execution failed");
    }
  }
  return (
    <div className="space-y-5">
      <header className="rounded border bg-white p-4">
        <h2 className="text-xl font-semibold">Capability Operations</h2>
        <p className="text-sm text-slate-600">
          Commercial rights only · Observation · Enforcement NONE
        </p>
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Capability filter"
          className="mt-3 w-full rounded border p-2"
        />
        <details className="mt-4 rounded border p-3">
          <summary className="cursor-pointer font-medium">
            Create explicit commercial grant
          </summary>
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            <select
              value={createAction}
              onChange={(event) => setCreateAction(event.target.value)}
              className="rounded border p-2"
            >
              {[
                "PROVISION_CONTRACT",
                "DISTRIBUTE",
                "CREATE_TRIAL",
                "CREATE_MANUAL_OVERRIDE",
                "CREATE_INTERNAL",
              ].map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
            <select
              value={scope}
              onChange={(event) => setScope(event.target.value)}
              className="rounded border p-2"
            >
              <option>ORGANIZATION</option>
              <option>CLIENT</option>
              <option>SITE</option>
            </select>
            <input
              value={clientId}
              onChange={(event) => setClientId(event.target.value)}
              placeholder="Client ID"
              className="rounded border p-2"
            />
            <input
              value={buildingId}
              onChange={(event) => setBuildingId(event.target.value)}
              placeholder="Site ID"
              className="rounded border p-2"
            />
            <input
              value={parentEntitlementId}
              onChange={(event) => setParentEntitlementId(event.target.value)}
              placeholder="Parent entitlement ID"
              className="rounded border p-2"
            />
            <input
              value={contractId}
              onChange={(event) => setContractId(event.target.value)}
              placeholder="Contract ID"
              className="rounded border p-2"
            />
            <input
              value={contractRevisionId}
              onChange={(event) => setContractRevisionId(event.target.value)}
              placeholder="Contract revision ID"
              className="rounded border p-2"
            />
            <input
              value={snapshotLineId}
              onChange={(event) => setSnapshotLineId(event.target.value)}
              placeholder="Snapshot line ID"
              className="rounded border p-2"
            />
            <input
              type="datetime-local"
              value={effectiveUntil}
              onChange={(event) => setEffectiveUntil(event.target.value)}
              className="rounded border p-2"
            />
            <label>
              <input
                type="checkbox"
                checked={enabled}
                onChange={(event) => setEnabled(event.target.checked)}
              />{" "}
              Enabled commercial state
            </label>
            <label>
              <input
                type="checkbox"
                checked={distributable}
                onChange={(event) => setDistributable(event.target.checked)}
              />{" "}
              Distributable commercial state
            </label>
            <textarea
              value={limitsText}
              onChange={(event) => setLimitsText(event.target.value)}
              className="rounded border p-2 md:col-span-2"
              aria-label="Complete limits JSON"
            />
            <textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Reason required"
              className="rounded border p-2 md:col-span-2"
            />
          </div>
          <button
            disabled={!filter || !reason.trim()}
            onClick={() => void previewCreation()}
            className="mt-3 rounded bg-blue-700 px-4 py-2 text-white disabled:opacity-40"
          >
            Preview grant creation
          </button>
        </details>
      </header>
      {visible.length === 0 && (
        <div className="rounded border bg-white p-6">No explicit grants.</div>
      )}
      {visible.map((grant) => {
        const revision = grant.revisions?.[0];
        return (
          <article key={grant.id} className="rounded border bg-white p-4">
            <h3 className="font-semibold">
              {String(grant.capability?.code ?? "Capability")}
            </h3>
            <p className="text-sm">
              {grant.source} · {String(grant.scope)} · Grant {grant.id}
            </p>
            <p className="mt-2 text-sm">
              Lifecycle {String(revision?.lifecycle)} · Enabled{" "}
              {String(revision?.enabled)} · Distributable{" "}
              {String(revision?.distributable)}
            </p>
            <button
              className="mt-3 rounded bg-slate-900 px-3 py-2 text-white"
              onClick={() => {
                setSelected(grant);
                setPreview(null);
              }}
            >
              Commercial action
            </button>
          </article>
        );
      })}
      {selected && (
        <section className="rounded border-2 bg-white p-5">
          <h3 className="font-semibold">Grant-specific mutation</h3>
          <select
            value={action}
            onChange={(e) => {
              setAction(e.target.value);
              setPreview(null);
            }}
            className="mt-3 w-full rounded border p-2"
          >
            {[
              "ENABLE",
              "DISABLE",
              "SUSPEND",
              "RESUME",
              "REVOKE",
              "SET_DISTRIBUTABLE",
              "CHANGE_LIMITS",
              "CHANGE_DATES",
            ].map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason required"
            className="mt-3 w-full rounded border p-2"
          />
          {action === "SET_DISTRIBUTABLE" && (
            <label className="mt-3 block">
              <input
                type="checkbox"
                checked={distributable}
                onChange={(event) => setDistributable(event.target.checked)}
              />{" "}
              Resulting distributable state
            </label>
          )}
          {action === "CHANGE_LIMITS" && (
            <>
              <textarea
                value={limitsText}
                onChange={(event) => setLimitsText(event.target.value)}
                className="mt-3 w-full rounded border p-2"
                aria-label="Replacement limits JSON"
              />
              <label>
                <input
                  type="checkbox"
                  checked={removeAllLimits}
                  onChange={(event) => setRemoveAllLimits(event.target.checked)}
                />{" "}
                Explicitly remove all limits
              </label>
            </>
          )}
          {action === "CHANGE_DATES" && (
            <input
              type="datetime-local"
              value={effectiveUntil}
              onChange={(event) => setEffectiveUntil(event.target.value)}
              className="mt-3 w-full rounded border p-2"
            />
          )}
          <button
            disabled={!reason.trim()}
            onClick={() => void requestPreview()}
            className="mt-3 rounded bg-blue-700 px-4 py-2 text-white disabled:opacity-40"
          >
            Preview
          </button>
          {preview && (
            <div className="mt-4 rounded bg-slate-50 p-4">
              <p>{noticeFr}</p>
              <p className="mt-2">{noticeEn}</p>
              <pre className="my-3 max-h-64 overflow-auto text-xs">
                {JSON.stringify(preview, null, 2)}
              </pre>
              {((preview.requiredConfirmations as string[]) ?? []).map(
                (code) => (
                  <label key={code} className="block">
                    <input
                      type="checkbox"
                      checked={acknowledged.includes(code)}
                      onChange={(e) =>
                        setAcknowledged((old) =>
                          e.target.checked
                            ? [...old, code]
                            : old.filter((x) => x !== code),
                        )
                      }
                    />{" "}
                    Acknowledge {code}
                  </label>
                ),
              )}
              <button
                onClick={() => void execute()}
                className="mt-3 rounded bg-red-700 px-4 py-2 text-white"
              >
                Confirm commercial mutation
              </button>
            </div>
          )}
          {error && <p className="mt-3 text-red-700">{error}</p>}
        </section>
      )}
      {!selected && preview && (
        <section className="rounded border-2 bg-white p-5">
          <p>{noticeFr}</p>
          <p className="mt-2">{noticeEn}</p>
          <pre className="my-3 max-h-64 overflow-auto text-xs">
            {JSON.stringify(preview, null, 2)}
          </pre>
          {((preview.requiredConfirmations as string[]) ?? []).map((code) => (
            <label key={code} className="block">
              <input
                type="checkbox"
                checked={acknowledged.includes(code)}
                onChange={(event) =>
                  setAcknowledged((old) =>
                    event.target.checked
                      ? [...old, code]
                      : old.filter((item) => item !== code),
                  )
                }
              />{" "}
              Acknowledge {code}
            </label>
          ))}
          <button
            onClick={() => void executeCreation()}
            className="mt-3 rounded bg-red-700 px-4 py-2 text-white"
          >
            Confirm explicit grant creation
          </button>
        </section>
      )}
    </div>
  );
}
