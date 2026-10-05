"use client";
import { useCallback, useEffect, useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import api from "@/lib/api";
import {
  COMMERCIAL_REVENUE_CATEGORIES,
  revenueCategoryLabel,
} from "@/lib/commercial-revenue-category";

type Capability = { code: string; nameFr: string };
type Tier = {
  id: string;
  minimumQuantity: string;
  maximumQuantity: string | null;
  amountMinor: string;
};
type Component = {
  id: string;
  code: string;
  nameFr: string;
  nameEn: string;
  capability: Capability;
  pricingModel: string;
  chargeType: string;
  revenueCategory: string | null;
  billingPeriod: string | null;
  metric: string | null;
  tierMode: string | null;
  amountMinor: string | null;
  displayOrder: number;
  tiers: Tier[];
};
type Version = {
  id: string;
  versionNumber: number;
  status: string;
  effectiveFrom: string | null;
  components: Component[];
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
const toMinor = (v: string) => {
  if (!/^\d+(?:\.\d{1,2})?$/.test(v)) throw new Error("Montant CAD invalide.");
  const [w, f = ""] = v.split(".");
  return (BigInt(w) * BigInt(100) + BigInt(f.padEnd(2, "0"))).toString();
};
const money = (v: string | null) =>
  v === null
    ? "Non configuré"
    : `${(Number(v) / 100).toLocaleString("fr-CA", { minimumFractionDigits: 2 })} $ CA`;

export default function Page() {
  const [books, setBooks] = useState<Book[]>([]),
    [caps, setCaps] = useState<Capability[]>([]),
    [message, setMessage] = useState("");
  const [book, setBook] = useState({ code: "", name: "", audience: "DIRECT" });
  const [target, setTarget] = useState<{
    bookId: string;
    versionId: string;
    component?: Component;
  } | null>(null);
  const [tier, setTier] = useState<{
    bookId: string;
    versionId: string;
    componentId: string;
    tier?: Tier;
  } | null>(null);
  const load = useCallback(async () => {
    const [b, c] = await Promise.all([
      api.get("/admin/v1/commercial/price-books"),
      api.get("/admin/v1/commercial/capabilities"),
    ]);
    setBooks(b.data);
    setCaps(c.data);
  }, []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);
  const run = async (task: () => Promise<unknown>, ok: string) => {
    try {
      await task();
      await load();
      setMessage(ok);
    } catch (e) {
      setMessage(
        (e as { response?: { data?: { message?: string } } }).response?.data
          ?.message ?? (e as Error).message,
      );
    }
  };
  return (
    <AppLayout>
      <main className="mx-auto max-w-7xl space-y-6 p-6">
        <header>
          <h1 className="text-3xl font-semibold">Catalogues tarifaires</h1>
          <p className="text-sm text-slate-600">
            CAD uniquement pour l’édition actuelle. Cette surface configure
            exclusivement les prix clients.
          </p>
        </header>
        {message && (
          <p role="status" className="rounded border bg-white p-3">
            {message}
          </p>
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void run(
              () =>
                api.post("/admin/v1/commercial/price-books", {
                  ...book,
                  currency: "CAD",
                }),
              "Catalogue créé.",
            ).then(() => setBook({ code: "", name: "", audience: "DIRECT" }));
          }}
          className="grid gap-3 rounded-xl border bg-white p-5 md:grid-cols-4"
        >
          <Field
            label="Code stable"
            value={book.code}
            onChange={(v) =>
              setBook({
                ...book,
                code: v.toUpperCase().replace(/[^A-Z0-9_]/g, "_"),
              })
            }
          />
          <Field
            label="Nom"
            value={book.name}
            onChange={(v) => setBook({ ...book, name: v })}
          />
          <Select
            label="Audience"
            value={book.audience}
            options={[
              ["DIRECT", "Client direct"],
              ["PARTNER", "Partenaire"],
            ]}
            onChange={(v) => setBook({ ...book, audience: v })}
          />
          <button className="self-end rounded bg-slate-900 p-2 text-white">
            Créer
          </button>
        </form>
        {books.map((b) => (
          <section key={b.id} className="rounded-xl border bg-white p-5">
            <div className="flex justify-between">
              <div>
                <h2 className="text-xl font-semibold">{b.name}</h2>
                <p className="text-sm text-slate-500">
                  {b.code} · {b.audience} · {b.currency} ·{" "}
                  {b.versions.filter((v) => v.status === "ACTIVE").length}{" "}
                  active ·{" "}
                  {b.versions.filter((v) => v.status === "SCHEDULED").length}{" "}
                  planifiée ·{" "}
                  {b.versions.filter((v) => v.status === "DRAFT").length}{" "}
                  brouillon
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  disabled={!!b.archivedAt}
                  onClick={() =>
                    void run(
                      () =>
                        api.post(
                          `/admin/v1/commercial/price-books/${b.id}/versions`,
                          {},
                        ),
                      "Brouillon créé.",
                    )
                  }
                  className="rounded border px-3 disabled:opacity-40"
                >
                  Nouvelle version
                </button>
                {!b.archivedAt && (
                  <button
                    onClick={() =>
                      void run(
                        () =>
                          api.post(
                            `/admin/v1/commercial/price-books/${b.id}/archive`,
                            {
                              reason: "Archived through catalog administration",
                            },
                          ),
                        "Catalogue archivé.",
                      )
                    }
                    className="rounded border px-3"
                  >
                    Archiver
                  </button>
                )}
              </div>
            </div>
            <div className="mt-4 space-y-3">
              {b.versions.map((v) => (
                <article key={v.id} className="rounded border bg-slate-50 p-4">
                  <div className="flex flex-wrap justify-between gap-2">
                    <div>
                      <strong>
                        v{v.versionNumber} · {v.status}
                      </strong>
                      <p className="text-xs text-slate-500">
                        {v.effectiveFrom?.slice(0, 10) ?? "Date non définie"} ·{" "}
                        {v.components.length} composant(s)
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {v.status === "DRAFT" && (
                        <>
                          <button
                            onClick={() =>
                              setTarget({ bookId: b.id, versionId: v.id })
                            }
                            className="rounded border bg-white px-3"
                          >
                            Ajouter un composant
                          </button>
                          <Publish bookId={b.id} version={v} run={run} />
                        </>
                      )}
                      {v.status === "SCHEDULED" && (
                        <button
                          onClick={() =>
                            void run(
                              () =>
                                api.post(
                                  `/admin/v1/commercial/price-books/${b.id}/versions/${v.id}/cancel`,
                                  {
                                    reason:
                                      "Cancelled through catalog administration",
                                  },
                                ),
                              "Version annulée.",
                            )
                          }
                          className="rounded border px-3"
                        >
                          Annuler
                        </button>
                      )}
                      {v.status === "ACTIVE" && (
                        <button
                          onClick={() =>
                            void run(
                              () =>
                                api.post(
                                  `/admin/v1/commercial/price-books/${b.id}/versions/${v.id}/archive`,
                                  {
                                    reason:
                                      "Archived through catalog administration",
                                  },
                                ),
                              "Version archivée.",
                            )
                          }
                          className="rounded border px-3"
                        >
                          Archiver
                        </button>
                      )}
                    </div>
                  </div>
                  {v.status !== "DRAFT" && (
                    <p className="mt-2 rounded bg-amber-50 p-2 text-xs">
                      Version publiée immuable. Aucune activation planifiée
                      automatique.
                    </p>
                  )}
                  <div className="mt-3 overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr>
                          <th>Composant</th>
                          <th>Capability</th>
                          <th>Catégorie</th>
                          <th>Modèle</th>
                          <th>Prix</th>
                          <th />
                        </tr>
                      </thead>
                      <tbody>
                        {v.components.map((c) => (
                          <tr key={c.id} className="border-t">
                            <td className="py-2">
                              <b>{c.nameFr}</b>
                              <div className="text-xs text-slate-500">
                                {c.code}
                              </div>
                            </td>
                            <td>{c.capability.nameFr}</td>
                            <td>
                              {revenueCategoryLabel(c.revenueCategory as never)}
                            </td>
                            <td>{c.pricingModel}</td>
                            <td>
                              {money(c.amountMinor)}
                              {c.tiers.map((t) => (
                                <div key={t.id} className="text-xs">
                                  {t.minimumQuantity}–{t.maximumQuantity ?? "∞"}
                                  : {money(t.amountMinor)}{" "}
                                  {v.status === "DRAFT" && (
                                    <>
                                      <button
                                        className="ml-2 underline"
                                        onClick={() =>
                                          setTier({
                                            bookId: b.id,
                                            versionId: v.id,
                                            componentId: c.id,
                                            tier: t,
                                          })
                                        }
                                      >
                                        Modifier
                                      </button>
                                      <button
                                        className="ml-2 underline"
                                        onClick={() =>
                                          void run(
                                            () =>
                                              api.delete(
                                                `/admin/v1/commercial/price-books/${b.id}/versions/${v.id}/components/${c.id}/tiers/${t.id}`,
                                              ),
                                            "Palier supprimé.",
                                          )
                                        }
                                      >
                                        Supprimer
                                      </button>
                                    </>
                                  )}
                                </div>
                              ))}
                            </td>
                            <td>
                              {v.status === "DRAFT" && (
                                <div className="flex gap-2">
                                  <button
                                    className="underline"
                                    onClick={() =>
                                      setTarget({
                                        bookId: b.id,
                                        versionId: v.id,
                                        component: c,
                                      })
                                    }
                                  >
                                    Modifier
                                  </button>
                          {["TIERED", "CAPACITY_BAND"].includes(
                            c.pricingModel,
                          ) && (
                                    <button
                                      className="underline"
                                      onClick={() =>
                                        setTier({
                                          bookId: b.id,
                                          versionId: v.id,
                                          componentId: c.id,
                                        })
                                      }
                                    >
                                      Palier
                                    </button>
                                  )}
                                  <button
                                    className="underline"
                                    onClick={() =>
                                      void run(
                                        () =>
                                          api.delete(
                                            `/admin/v1/commercial/price-books/${b.id}/versions/${v.id}/components/${c.id}`,
                                          ),
                                        "Composant supprimé.",
                                      )
                                    }
                                  >
                                    Supprimer
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ))}
        {target && (
          <ComponentDialog
            caps={caps}
            initial={target.component}
            close={() => setTarget(null)}
            save={(data) =>
              run(
                () =>
                  target.component
                    ? api.patch(
                        `/admin/v1/commercial/price-books/${target.bookId}/versions/${target.versionId}/components/${target.component.id}`,
                        data,
                      )
                    : api.post(
                        `/admin/v1/commercial/price-books/${target.bookId}/versions/${target.versionId}/components`,
                        data,
                      ),
                target.component ? "Composant modifié." : "Composant ajouté.",
              ).then(() => setTarget(null))
            }
          />
        )}{" "}
        {tier && (
          <TierDialog
            initial={tier.tier}
            close={() => setTier(null)}
            save={(data) =>
              run(
                () =>
                  tier.tier
                    ? api.patch(
                        `/admin/v1/commercial/price-books/${tier.bookId}/versions/${tier.versionId}/components/${tier.componentId}/tiers/${tier.tier.id}`,
                        data,
                      )
                    : api.post(
                        `/admin/v1/commercial/price-books/${tier.bookId}/versions/${tier.versionId}/components/${tier.componentId}/tiers`,
                        data,
                      ),
                tier.tier ? "Palier modifié." : "Palier ajouté.",
              ).then(() => setTier(null))
            }
          />
        )}
      </main>
    </AppLayout>
  );
}
function Publish({
  bookId,
  version,
  run,
}: {
  bookId: string;
  version: Version;
  run: (t: () => Promise<unknown>, m: string) => Promise<void>;
}) {
  const [open, setOpen] = useState(false),
    [date, setDate] = useState(""),
    [reason, setReason] = useState("");
  return open ? (
    <div className="rounded border bg-white p-2">
      <p className="text-xs text-red-700">
        Publication immuable de {version.components.length} composant(s).
      </p>
      <input
        aria-label="Date d’effet"
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        className="border p-1"
      />
      <input
        aria-label="Raison"
        placeholder="Raison"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        className="border p-1"
      />
      <button
        disabled={!date || !reason}
        onClick={() =>
          void run(
            () =>
              api.post(
                `/admin/v1/commercial/price-books/${bookId}/versions/${version.id}/publish`,
                { effectiveFrom: `${date}T00:00:00.000Z`, reason },
              ),
            "Version publiée.",
          )
        }
        className="bg-red-700 p-1 text-white disabled:opacity-40"
      >
        Confirmer
      </button>
      <button onClick={() => setOpen(false)}>Annuler</button>
    </div>
  ) : (
    <button
      onClick={() => setOpen(true)}
      className="rounded bg-red-700 px-3 text-white"
    >
      Réviser et publier
    </button>
  );
}
function ComponentDialog({
  caps,
  initial,
  close,
  save,
}: {
  caps: Capability[];
  initial?: Component;
  close: () => void;
  save: (x: Record<string, unknown>) => Promise<void>;
}) {
  const [f, setF] = useState({
    code: initial?.code ?? "",
    nameFr: initial?.nameFr ?? "",
    nameEn: initial?.nameEn ?? "",
    capabilityCode:
      initial?.capability.code ?? caps[0]?.code ?? "COMPLIANCE_OPERATIONS",
    revenueCategory: initial?.revenueCategory ?? "SAAS",
    pricingModel: initial?.pricingModel ?? "FLAT",
    chargeType: initial?.chargeType ?? "RECURRING",
    billingPeriod: initial?.billingPeriod ?? "MONTH",
    metric: initial?.metric ?? "FIXED",
    tierMode: initial?.tierMode ?? "VOLUME",
    amountCad: initial?.amountMinor
      ? String(Number(initial.amountMinor) / 100)
      : "",
    displayOrder: String(initial?.displayOrder ?? 10),
  });
  return (
    <Modal>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void save({
            ...f,
            code:
              f.code ||
              f.nameEn
                .toUpperCase()
                .replace(/[^A-Z0-9]+/g, "_")
                .replace(/^_|_$/g, ""),
            amountMinor: f.amountCad ? toMinor(f.amountCad) : undefined,
            billingPeriod:
              f.chargeType === "RECURRING" ? f.billingPeriod : undefined,
            tierMode: f.pricingModel === "TIERED" ? f.tierMode : undefined,
            displayOrder: Number(f.displayOrder),
            amountCad: undefined,
          });
        }}
        className="grid gap-3 md:grid-cols-2"
      >
        <h2 className="text-xl font-semibold md:col-span-2">
          {initial ? "Modifier" : "Créer"} un composant tarifaire
        </h2>
        <Field
          label="Nom français"
          value={f.nameFr}
          onChange={(v) => setF({ ...f, nameFr: v })}
        />
        <Field
          label="Nom anglais"
          value={f.nameEn}
          onChange={(v) => setF({ ...f, nameEn: v })}
        />
        <Field
          label="Code stable"
          value={f.code}
          onChange={(v) => setF({ ...f, code: v.toUpperCase() })}
        />
        <Field
          label="Montant CAD (vide si non applicable)"
          value={f.amountCad}
          required={false}
          onChange={(v) => setF({ ...f, amountCad: v })}
        />
        <Select
          label="Capability"
          value={f.capabilityCode}
          options={caps.map((c) => [c.code, c.nameFr])}
          onChange={(v) => setF({ ...f, capabilityCode: v })}
        />
        <Select
          label="Catégorie"
          value={f.revenueCategory}
          options={COMMERCIAL_REVENUE_CATEGORIES.map((c) => [
            c,
            revenueCategoryLabel(c),
          ])}
          onChange={(v) => setF({ ...f, revenueCategory: v })}
        />
        <Select
          label="Modèle"
          value={f.pricingModel}
          options={[
            "FLAT",
            "PER_UNIT",
            "PER_SEAT",
            "PER_SITE",
            "CAPACITY_BAND",
            "TIERED",
            "USAGE",
            "COMPLEXITY",
            "CUSTOM",
          ].map((x) => [x, x])}
          onChange={(v) =>
            setF({
              ...f,
              pricingModel: v,
              metric: v === "CAPACITY_BAND" ? "SITE" : f.metric,
            })
          }
        />
        <Select
          label="Charge"
          value={f.chargeType}
          options={[
            ["RECURRING", "Récurrente"],
            ["ONE_TIME", "Unique"],
          ]}
          onChange={(v) => setF({ ...f, chargeType: v })}
        />
        <Select
          label="Période"
          value={f.billingPeriod}
          options={[
            ["MONTH", "Mois"],
            ["YEAR", "Année"],
          ]}
          onChange={(v) => setF({ ...f, billingPeriod: v })}
        />
        <Select
          label="Métrique"
          value={f.metric}
          options={[
            "FIXED",
            "HOUR",
            "SEAT",
            "SITE",
            "CLIENT",
            "USAGE_UNIT",
            "COMPLEXITY",
          ].map((x) => [x, x])}
          onChange={(v) => setF({ ...f, metric: v })}
        />
        {f.pricingModel === "TIERED" && (
          <Select
            label="Mode de paliers"
            value={f.tierMode}
            options={[
              ["VOLUME", "Volume"],
              ["GRADUATED", "Progressif"],
            ]}
            onChange={(v) => setF({ ...f, tierMode: v })}
          />
        )}
        <div className="flex gap-2 md:col-span-2">
          <button className="rounded bg-slate-900 px-4 py-2 text-white">
            Enregistrer
          </button>
          <button type="button" onClick={close}>
            Annuler
          </button>
        </div>
      </form>
    </Modal>
  );
}
function TierDialog({
  initial,
  close,
  save,
}: {
  initial?: Tier;
  close: () => void;
  save: (x: Record<string, unknown>) => Promise<void>;
}) {
  const [f, setF] = useState({
    minimumQuantity: initial?.minimumQuantity ?? "",
    maximumQuantity: initial?.maximumQuantity ?? "",
    amountCad: initial ? String(Number(initial.amountMinor) / 100) : "",
    displayOrder: "10",
  });
  return (
    <Modal>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void save({
            minimumQuantity: f.minimumQuantity,
            maximumQuantity: f.maximumQuantity || undefined,
            amountMinor: toMinor(f.amountCad),
            displayOrder: Number(f.displayOrder),
          });
        }}
        className="space-y-3"
      >
        <h2 className="text-xl font-semibold">
          {initial ? "Modifier" : "Créer"} un palier structuré
        </h2>
        <p className="text-sm text-slate-600">
          Pour CAPACITY_BAND, le montant est le prix total de la bande
          sélectionnée, jamais un prix par unité.
        </p>
        <Field
          label="Minimum inclusif"
          value={f.minimumQuantity}
          onChange={(v) => setF({ ...f, minimumQuantity: v })}
        />
        <Field
          label="Maximum exclusif (vide = ouvert)"
          value={f.maximumQuantity}
          required={false}
          onChange={(v) => setF({ ...f, maximumQuantity: v })}
        />
        <Field
          label="Montant CAD du palier"
          value={f.amountCad}
          onChange={(v) => setF({ ...f, amountCad: v })}
        />
        <button className="rounded bg-slate-900 px-4 py-2 text-white">
          Enregistrer
        </button>{" "}
        <button type="button" onClick={close}>
          Annuler
        </button>
      </form>
    </Modal>
  );
}
function Modal({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 p-6">
      <div className="mx-auto max-w-3xl rounded-xl bg-white p-6">
        {children}
      </div>
    </div>
  );
}
function Field({
  label,
  value,
  onChange,
  required = true,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
}) {
  return (
    <label className="text-sm">
      {label}
      <input
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded border p-2"
      />
    </label>
  );
}
function Select({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[][];
  onChange: (v: string) => void;
}) {
  return (
    <label className="text-sm">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded border p-2"
      >
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </label>
  );
}
