"use client";
import { FormEvent, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import AppLayout from "@/components/layout/AppLayout";
import api from "@/lib/api";

type Metric = { code: string; labelFr: string; labelEn: string; metricVersion: string; policyVersion: string; unit: string; allowedScopes: string[]; maxPeriodDays: number; sourceQuality: string; billingStatus: string };
type Result = { id: string; metricCode: string; metricVersion: string; policyVersion: string; quantity: string; unit: string; sourceQuality: string; periodStart: string; periodEnd: string; timezone: string; calculatedAt: string; status: string; sourceFingerprint: string; correctionReason?: string | null };

export default function MeteringPage() {
  const params = useSearchParams();
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [results, setResults] = useState<Result[]>([]);
  const [organizationId, setOrganizationId] = useState(params.get("organizationId") ?? "");
  const [metricCode, setMetricCode] = useState("");
  const [scope, setScope] = useState("ORGANIZATION");
  const [clientId, setClientId] = useState("");
  const [buildingId, setBuildingId] = useState("");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [timezone, setTimezone] = useState("UTC");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    if (!organizationId) { setResults([]); return; }
    const response = await api.get(`/admin/v1/organizations/${organizationId}/metering?page=1&pageSize=50`);
    setResults(response.data.items ?? []);
  };
  useEffect(() => { api.get("/admin/v1/metering/metrics").then(r => { setMetrics(r.data); setMetricCode((value) => value || r.data[0]?.code || ""); }).catch(() => setMessage("Measurement registry unavailable.")); }, []);
  useEffect(() => {
    if (!organizationId) return;
    api
      .get(
        `/admin/v1/organizations/${organizationId}/metering?page=1&pageSize=50`,
      )
      .then((response) => setResults(response.data.items ?? []))
      .catch(() => setMessage("Measurement results unavailable."));
  }, [organizationId]);

  const calculate = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true); setMessage("");
    try {
      const response = await api.post(`/admin/v1/organizations/${organizationId}/metering/calculate`, { metricCode, scope, ...(clientId ? { clientId } : {}), ...(buildingId ? { buildingId } : {}), periodStart: new Date(periodStart).toISOString(), periodEnd: new Date(periodEnd).toISOString(), timezone });
      setMessage(response.data.created ? "Measurement recorded." : "Identical measurement already exists."); await refresh();
    } catch (error: unknown) { const data = (error as { response?: { data?: { message?: string } } }).response?.data; setMessage(data?.message ?? "Measurement unavailable. No result was recorded."); }
    finally { setBusy(false); }
  };
  const correct = async (result: Result) => {
    const reason = window.prompt("Correction reason"); if (!reason) return;
    setBusy(true);
    try { const response = await api.post(`/admin/v1/organizations/${organizationId}/metering/${result.id}/correct`, { reason }); setMessage(response.data.corrected ? "Correction recorded; previous result preserved." : "No correction was created because the authoritative source set has not changed."); await refresh(); }
    catch { setMessage("Correction unavailable."); } finally { setBusy(false); }
  };
  const selected = metrics.find(m => m.code === metricCode);
  return <AppLayout><div className="mx-auto max-w-7xl p-6">
    <h1 className="text-3xl font-semibold">Metering</h1>
    <p className="text-sm text-slate-600">Operational measurement results</p>
    <p className="mt-1 rounded border border-amber-200 bg-amber-50 p-3 text-sm">Measurements are immutable, versioned and not evaluated for billing. Enforcement: NONE.</p>
    <form onSubmit={calculate} className="mt-6 grid gap-3 rounded-xl border bg-white p-4 md:grid-cols-3">
      <label className="text-sm">Organization ID<input required value={organizationId} onChange={e=>setOrganizationId(e.target.value)} className="mt-1 w-full rounded border p-2" /></label>
      <label className="text-sm">Metric<select value={metricCode} onChange={e=>setMetricCode(e.target.value)} className="mt-1 w-full rounded border p-2">{metrics.map(m=><option key={m.code} value={m.code}>{m.labelFr} ({m.code})</option>)}</select></label>
      <label className="text-sm">Scope<select value={scope} onChange={e=>setScope(e.target.value)} className="mt-1 w-full rounded border p-2">{selected?.allowedScopes.map(s=><option key={s}>{s}</option>)}</select></label>
      {scope !== "ORGANIZATION" && <label className="text-sm">Client ID<input required value={clientId} onChange={e=>setClientId(e.target.value)} className="mt-1 w-full rounded border p-2" /></label>}
      {scope === "SITE" && <label className="text-sm">Site ID<input required value={buildingId} onChange={e=>setBuildingId(e.target.value)} className="mt-1 w-full rounded border p-2" /></label>}
      <label className="text-sm">Observation period start<input required type="datetime-local" value={periodStart} onChange={e=>setPeriodStart(e.target.value)} className="mt-1 w-full rounded border p-2" /></label>
      <label className="text-sm">Observation period end<input required type="datetime-local" value={periodEnd} onChange={e=>setPeriodEnd(e.target.value)} className="mt-1 w-full rounded border p-2" /></label>
      <label className="text-sm">IANA timezone<input required value={timezone} onChange={e=>setTimezone(e.target.value)} className="mt-1 w-full rounded border p-2" /></label>
      <div className="flex items-end"><button disabled={busy} className="rounded bg-slate-900 px-4 py-2 text-white disabled:opacity-50">Calculate</button></div>
    </form>
    {message && <p role="status" className="mt-4 rounded border p-3 text-sm">{message}</p>}
    <h2 className="mt-8 text-xl font-semibold">Measurement results</h2>
    {!organizationId ? <p className="mt-3 text-sm">Select an organization.</p> : results.length === 0 ? <p className="mt-3 text-sm">NOT_AVAILABLE — no measurement result recorded.</p> : <div className="mt-3 overflow-x-auto rounded-xl border bg-white"><table className="min-w-full text-sm"><thead><tr className="border-b text-left">{["Metric","Period","Quantity","Quality","Versions","Status","Calculated","Action"].map(x=><th key={x} className="p-3">{x}</th>)}</tr></thead><tbody>{results.map(r=><tr key={r.id} className="border-b"><td className="p-3 font-medium">{r.metricCode}</td><td className="p-3">{new Date(r.periodStart).toLocaleString()} → {new Date(r.periodEnd).toLocaleString()}<br/>{r.timezone}</td><td className="p-3">{r.quantity} {r.unit}</td><td className="p-3"><span className="rounded bg-slate-100 px-2 py-1">{r.sourceQuality}</span></td><td className="p-3">metric {r.metricVersion}<br/>policy {r.policyVersion}</td><td className="p-3">{r.status}<br/><code title={r.sourceFingerprint}>{r.sourceFingerprint.slice(0,8)}…{r.sourceFingerprint.slice(-4)}</code></td><td className="p-3">{new Date(r.calculatedAt).toLocaleString()}</td><td className="p-3">{r.status === "CURRENT" && <button disabled={busy} onClick={()=>void correct(r)} className="text-red-700 underline">Correct</button>}</td></tr>)}</tbody></table></div>}
  </div></AppLayout>;
}
