"use client";
import { FormEvent, useEffect, useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import api from "@/lib/api";
type Version = {
  id: string;
  versionNumber: number;
  status: string;
  effectiveFrom: string | null;
  effectiveUntil: string | null;
  components: Component[];
};
type Tier = {
  id: string;
  minimumQuantity: string;
  maximumQuantity: string | null;
  amountMinor: string;
};
type Component = {
  id: string;
  code: string;
  pricingModel: string;
  amountMinor: string | null;
  tiers: Tier[];
};
type Book = {
  id: string;
  code: string;
  name: string;
  audience: string;
  currency: string;
  archivedAt: string | null;
  versions: Version[];
};
export default function PriceBooksPage() {
  const [items, setItems] = useState<Book[]>([]);
  const [form, setForm] = useState({ code: "", name: "", audience: "DIRECT" });
  const [error, setError] = useState("");
  const load = () =>
    api
      .get("/admin/v1/commercial/price-books")
      .then((r) => setItems(r.data))
      .catch(() => setError("Chargement impossible."));
  useEffect(() => {
    void load();
  }, []);
  async function create(e: FormEvent) {
    e.preventDefault();
    await api.post("/admin/v1/commercial/price-books", {
      ...form,
      currency: "CAD",
    });
    setForm({ code: "", name: "", audience: "DIRECT" });
    load();
  }
  async function version(bookId: string) {
    await api.post(`/admin/v1/commercial/price-books/${bookId}/versions`, {});
    load();
  }
  async function publish(bookId: string, versionId: string) {
    const effectiveFrom = window.prompt("effectiveFrom UTC (ISO 8601)");
    const reason = window.prompt("Raison de publication");
    if (!effectiveFrom || !reason) return;
    await api.post(
      `/admin/v1/commercial/price-books/${bookId}/versions/${versionId}/publish`,
      { effectiveFrom, reason },
    );
    load();
  }
  async function addComponent(bookId: string, versionId: string) {
    const code = window.prompt("Component code");
    const capabilityCode = window.prompt(
      "Capability code",
      "COMPLIANCE_OPERATIONS",
    );
    const pricingModel = window.prompt("Pricing model", "FLAT");
    const amountMinor = window.prompt(
      "Amount in minor units (empty for TIERED/COMPLEXITY/CUSTOM)",
    );
    if (!code || !capabilityCode || !pricingModel) return;
    await api.post(
      `/admin/v1/commercial/price-books/${bookId}/versions/${versionId}/components`,
      {
        code,
        capabilityCode,
        nameFr: code,
        nameEn: code,
        pricingModel,
        chargeType: "RECURRING",
        billingPeriod: "MONTH",
        metric:
          pricingModel === "PER_SEAT"
            ? "SEAT"
            : pricingModel === "PER_SITE"
              ? "SITE"
              : "FIXED",
        tierMode: pricingModel === "TIERED" ? "VOLUME" : undefined,
        amountMinor: amountMinor || undefined,
        displayOrder: 10,
      },
    );
    load();
  }
  async function addTier(
    bookId: string,
    versionId: string,
    componentId: string,
  ) {
    const minimumQuantity = window.prompt("Minimum quantity (inclusive)");
    const maximumQuantity = window.prompt(
      "Maximum quantity (exclusive, empty for last tier)",
    );
    const amountMinor = window.prompt("Tier amount in minor units");
    if (!minimumQuantity || amountMinor === null || amountMinor === "") return;
    await api.post(
      `/admin/v1/commercial/price-books/${bookId}/versions/${versionId}/components/${componentId}/tiers`,
      {
        minimumQuantity,
        maximumQuantity: maximumQuantity || undefined,
        amountMinor,
        displayOrder: 10,
      },
    );
    load();
  }
  return (
    <AppLayout>
      <main className="mx-auto max-w-7xl p-6">
        <h1 className="text-3xl font-semibold">Price Books</h1>
        <p className="mt-2 text-sm text-slate-500">
          CAD uniquement en Phase 2A. Aucun catalogue n’est assigné aux
          organisations.
        </p>
        <form
          onSubmit={create}
          className="mt-6 flex flex-wrap gap-2 rounded-xl border bg-white p-4"
        >
          <input
            required
            placeholder="CODE_STABLE"
            value={form.code}
            onChange={(e) =>
              setForm({ ...form, code: e.target.value.toUpperCase() })
            }
            className="rounded border p-2"
          />
          <input
            required
            placeholder="Nom"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="rounded border p-2"
          />
          <select
            value={form.audience}
            onChange={(e) => setForm({ ...form, audience: e.target.value })}
            className="rounded border p-2"
          >
            <option>DIRECT</option>
            <option>PARTNER</option>
          </select>
          <button className="rounded bg-slate-800 px-4 py-2 text-white">
            Create DRAFT catalog
          </button>
        </form>
        {error && <p className="mt-4 text-red-700">{error}</p>}
        <div className="mt-6 space-y-4">
          {items.map((book) => (
            <article key={book.id} className="rounded-xl border bg-white p-5">
              <div className="flex justify-between">
                <div>
                  <strong>{book.code}</strong>
                  <p className="text-sm text-slate-500">
                    {book.name} · {book.audience} · {book.currency}
                  </p>
                </div>
                <button
                  disabled={!!book.archivedAt}
                  onClick={() => version(book.id)}
                  className="rounded border px-3 py-2 disabled:opacity-40"
                >
                  New version
                </button>
              </div>
              <div className="mt-4 space-y-2">
                {book.versions.map((v) => (
                  <div key={v.id} className="rounded bg-slate-50 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span>
                        v{v.versionNumber} · {v.status} ·{" "}
                        {v.effectiveFrom ?? "not scheduled"}
                      </span>
                      <div className="flex gap-2">
                        {v.status === "DRAFT" && (
                          <button
                            onClick={() => addComponent(book.id, v.id)}
                            className="rounded border px-3 py-1"
                          >
                            Add component
                          </button>
                        )}
                        {v.status === "DRAFT" && (
                          <button
                            onClick={() => publish(book.id, v.id)}
                            className="rounded bg-red-700 px-3 py-1 text-white"
                          >
                            Publish
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="mt-2 space-y-2">
                      {v.components.map((component) => (
                        <div
                          key={component.id}
                          className="rounded border bg-white p-2 text-sm"
                        >
                          <div className="flex justify-between">
                            <span>
                              {component.code} · {component.pricingModel} ·{" "}
                              {component.amountMinor ?? "NO AMOUNT"}
                            </span>
                            {v.status === "DRAFT" &&
                            component.pricingModel === "TIERED" ? (
                              <button
                                onClick={() =>
                                  addTier(book.id, v.id, component.id)
                                }
                                className="underline"
                              >
                                Add tier
                              </button>
                            ) : null}
                          </div>
                          {component.tiers.map((tier) => (
                            <p key={tier.id} className="text-xs text-slate-500">
                              [{tier.minimumQuantity},{" "}
                              {tier.maximumQuantity ?? "∞"}) ·{" "}
                              {tier.amountMinor}
                            </p>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                {!book.versions.length && (
                  <p className="text-sm text-slate-400">No versions.</p>
                )}
              </div>
            </article>
          ))}
        </div>
      </main>
    </AppLayout>
  );
}
