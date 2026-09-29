"use client";
import { useEffect, useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import api from "@/lib/api";
type Policy = { scope: string; status: string };
type Capability = {
  code: string;
  nameFr: string;
  nameEn: string;
  descriptionFr: string;
  descriptionEn: string;
  lifecycle: string;
  isAvailable: boolean;
  displayOrder: number;
  scopePolicies: Policy[];
};
export default function CapabilitiesPage() {
  const [items, setItems] = useState<Capability[]>([]);
  const [error, setError] = useState("");
  const load = () =>
    api
      .get("/admin/v1/commercial/capabilities")
      .then((r) => setItems(r.data))
      .catch(() => setError("Chargement impossible."));
  useEffect(() => {
    void load();
  }, []);
  async function update(item: Capability) {
    const reason =
      item.lifecycle === "RETIRED" || !item.isAvailable
        ? window.prompt("Raison administrative requise") || ""
        : "";
    if ((item.lifecycle === "RETIRED" || !item.isAvailable) && !reason) return;
    await api.patch(`/admin/v1/commercial/capabilities/${item.code}`, {
      nameFr: item.nameFr,
      nameEn: item.nameEn,
      descriptionFr: item.descriptionFr,
      descriptionEn: item.descriptionEn,
      lifecycle: item.lifecycle,
      isAvailable: item.isAvailable,
      displayOrder: item.displayOrder,
      reason,
    });
    load();
  }
  return (
    <AppLayout>
      <main className="mx-auto max-w-7xl p-6">
        <h1 className="text-3xl font-semibold">Capabilities</h1>
        <p className="mt-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
          Catalogue plateforme uniquement — aucune ligne ne constitue un
          entitlement organisationnel.
        </p>
        {error && <p className="mt-4 text-red-700">{error}</p>}
        <div className="mt-6 space-y-4">
          {items.map((item, index) => (
            <article key={item.code} className="rounded-xl border bg-white p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <strong>{item.code}</strong>
                  <p className="text-sm text-slate-500">
                    {item.nameFr} · {item.nameEn}
                  </p>
                </div>
                <div className="flex gap-2">
                  <select
                    value={item.lifecycle}
                    onChange={(e) =>
                      setItems((v) =>
                        v.map((x, i) =>
                          i === index ? { ...x, lifecycle: e.target.value } : x,
                        ),
                      )
                    }
                    className="rounded border p-2"
                  >
                    <option>CURRENT</option>
                    <option>FUTURE</option>
                    <option>RETIRED</option>
                  </select>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={item.isAvailable}
                      onChange={(e) =>
                        setItems((v) =>
                          v.map((x, i) =>
                            i === index
                              ? { ...x, isAvailable: e.target.checked }
                              : x,
                          ),
                        )
                      }
                    />{" "}
                    Available
                  </label>
                  <button
                    onClick={() => update(item)}
                    className="rounded bg-slate-800 px-3 py-2 text-white"
                  >
                    Save
                  </button>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {item.scopePolicies.map((p) => (
                  <span
                    key={p.scope}
                    className="rounded-full bg-slate-100 px-3 py-1 text-xs"
                  >
                    {p.scope}: {p.status}
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>
      </main>
    </AppLayout>
  );
}
