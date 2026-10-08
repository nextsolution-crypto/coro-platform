"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import api from "@/lib/api";

type Parameter = { key: string; type: string; required: boolean };
type Version = {
  id: string;
  versionNumber: number;
  status: string;
  titleFR: string;
  titleEN: string;
  textFR: string;
  textEN: string;
  businessOwner: string | null;
  legalOwner: string | null;
  isRequired: boolean | null;
  effectiveAt: string | null;
  provenance: string;
  contentHash: string;
  legalReviewEvidence: string | null;
  lockVersion: number;
  parameterSchema: Parameter[];
  applicabilities: { scope: string }[];
};
type Clause = {
  id: string;
  code: string;
  category: string;
  isActive: boolean;
  versions: Version[];
};

export default function CommercialClauseLibraryPage() {
  const [clauses, setClauses] = useState<Clause[]>([]);
  const [selected, setSelected] = useState<Version>();
  const [category, setCategory] = useState("ALL");
  const [reason, setReason] = useState("");
  const [evidence, setEvidence] = useState("");
  const [parameters, setParameters] = useState("[]");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (selectId?: string) => {
    const { data } = await api.get("/admin/v1/commercial/clauses");
    const values = data as Clause[];
    setClauses(values);
    const versions = values.flatMap((item) => item.versions);
    const next = versions.find((item) => item.id === selectId) ?? versions[0];
    setSelected(next);
    setParameters(JSON.stringify(next?.parameterSchema ?? [], null, 2));
  }, []);
  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const visible = useMemo(
    () =>
      clauses.filter(
        (item) => category === "ALL" || item.category === category,
      ),
    [clauses, category],
  );
  const categories = Array.from(
    new Set(clauses.map((item) => item.category)),
  ).sort();
  const selectedClause = clauses.find((item) =>
    item.versions.some((version) => version.id === selected?.id),
  );

  async function action(
    run: () => Promise<{ data: Version | Version[] }>,
    success: string,
  ) {
    setBusy(true);
    setMessage("");
    try {
      const { data } = await run();
      const id = Array.isArray(data) ? data[0]?.id : data.id;
      await load(id);
      setMessage(success);
    } catch (error) {
      setMessage(
        (error as { response?: { data?: { message?: string } } }).response?.data
          ?.message ?? "Action impossible.",
      );
    } finally {
      setBusy(false);
    }
  }

  const reasonPayload = () => ({
    lockVersion: selected!.lockVersion,
    reason: reason.trim(),
  });

  return (
    <AppLayout>
      <main className="mx-auto max-w-7xl space-y-5 p-6">
        <header>
          <p className="text-sm text-emerald-700">Commercial</p>
          <h1 className="text-3xl font-semibold">
            Bibliothèque de clauses gouvernée
          </h1>
          <p className="text-sm text-slate-600">
            Les textes DRAFT et IN_REVIEW sont NOT_APPROVED et exclus des
            documents clients.
          </p>
        </header>
        {message && (
          <p className="rounded border border-slate-200 bg-white p-3 text-sm">
            {message}
          </p>
        )}
        <section className="flex flex-wrap gap-3">
          <button
            disabled={busy || clauses.length > 0}
            className="rounded bg-slate-900 px-4 py-2 text-white disabled:opacity-40"
            onClick={() =>
              void action(
                () => api.post("/admin/v1/commercial/clauses/draft-catalog"),
                "Catalogue DRAFT préparé.",
              )
            }
          >
            Préparer le catalogue DRAFT
          </button>
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            className="rounded border p-2"
          >
            <option value="ALL">Toutes les catégories</option>
            {categories.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </section>
        <div className="grid gap-5 lg:grid-cols-[340px_1fr]">
          <aside className="space-y-2 rounded border bg-white p-3">
            {visible.map((clause) =>
              clause.versions.map((version) => (
                <button
                  key={version.id}
                  onClick={() => {
                    setSelected(version);
                    setParameters(
                      JSON.stringify(version.parameterSchema, null, 2),
                    );
                  }}
                  className={`w-full rounded border p-3 text-left ${selected?.id === version.id ? "border-emerald-600" : "border-slate-200"}`}
                >
                  <strong className="block text-sm">{clause.category}</strong>
                  <span className="text-xs">
                    {clause.code} · v{version.versionNumber} · {version.status}
                  </span>
                </button>
              )),
            )}
          </aside>
          {selected && (
            <section className="space-y-4 rounded border bg-white p-5">
              <div className="flex justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold">{selected.titleFR}</h2>
                  <p className="text-xs">SHA-256 : {selected.contentHash}</p>
                </div>
                <strong>{selected.status}</strong>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {(
                  [
                    "titleFR",
                    "titleEN",
                    "businessOwner",
                    "legalOwner",
                    "provenance",
                  ] as const
                ).map((field) => (
                  <label key={field} className="text-sm">
                    {field}
                    <input
                      disabled={selected.status !== "DRAFT"}
                      value={selected[field] ?? ""}
                      onChange={(event) =>
                        setSelected({
                          ...selected,
                          [field]: event.target.value,
                        })
                      }
                      className="mt-1 w-full rounded border p-2"
                    />
                  </label>
                ))}
                <label className="text-sm">
                  Applicabilité
                  <select
                    disabled={selected.status !== "DRAFT"}
                    value={selected.applicabilities[0]?.scope ?? "UNSPECIFIED"}
                    onChange={(event) =>
                      setSelected({
                        ...selected,
                        applicabilities: [{ scope: event.target.value }],
                      })
                    }
                    className="mt-1 w-full rounded border p-2"
                  >
                    {[
                      "UNSPECIFIED",
                      "ALL_OFFERS",
                      "CORO_PROFESSIONAL",
                      "SENTINELLE_POPULATION_STANDALONE",
                      "PROFESSIONAL_SERVICES",
                      "COMBINED_OFFER",
                    ].map((item) => (
                      <option key={item}>{item}</option>
                    ))}
                  </select>
                </label>
                <label className="text-sm">
                  Clause obligatoire
                  <select
                    disabled={selected.status !== "DRAFT"}
                    value={
                      selected.isRequired === null
                        ? "UNDECIDED"
                        : String(selected.isRequired)
                    }
                    onChange={(event) =>
                      setSelected({
                        ...selected,
                        isRequired:
                          event.target.value === "UNDECIDED"
                            ? null
                            : event.target.value === "true",
                      })
                    }
                    className="mt-1 w-full rounded border p-2"
                  >
                    <option>UNDECIDED</option>
                    <option value="true">REQUIRED</option>
                    <option value="false">OPTIONAL</option>
                  </select>
                </label>
                <label className="text-sm">
                  Date de prise d&apos;effet
                  <input
                    type="datetime-local"
                    disabled={selected.status !== "DRAFT"}
                    value={selected.effectiveAt?.slice(0, 16) ?? ""}
                    onChange={(event) =>
                      setSelected({
                        ...selected,
                        effectiveAt: event.target.value
                          ? new Date(event.target.value).toISOString()
                          : null,
                      })
                    }
                    className="mt-1 w-full rounded border p-2"
                  />
                </label>
              </div>
              {(["textFR", "textEN"] as const).map((field) => (
                <label key={field} className="block text-sm">
                  {field}
                  <textarea
                    disabled={selected.status !== "DRAFT"}
                    value={selected[field]}
                    onChange={(event) =>
                      setSelected({ ...selected, [field]: event.target.value })
                    }
                    rows={6}
                    className="mt-1 w-full rounded border p-2"
                  />
                </label>
              ))}
              <label className="block text-sm">
                Paramètres typés (JSON)
                <textarea
                  disabled={selected.status !== "DRAFT"}
                  value={parameters}
                  onChange={(event) => setParameters(event.target.value)}
                  rows={5}
                  className="mt-1 w-full rounded border p-2 font-mono text-xs"
                />
              </label>
              {selected.status === "DRAFT" && (
                <button
                  disabled={busy}
                  className="rounded bg-emerald-700 px-4 py-2 text-white"
                  onClick={() =>
                    void action(
                      () =>
                        api.patch(
                          `/admin/v1/commercial/clauses/versions/${selected.id}`,
                          {
                            lockVersion: selected.lockVersion,
                            titleFR: selected.titleFR,
                            titleEN: selected.titleEN,
                            textFR: selected.textFR,
                            textEN: selected.textEN,
                            businessOwner: selected.businessOwner || undefined,
                            legalOwner: selected.legalOwner || undefined,
                            isRequired: selected.isRequired ?? undefined,
                            effectiveAt: selected.effectiveAt ?? undefined,
                            provenance: selected.provenance,
                            applicabilities: selected.applicabilities.map(
                              ({ scope }) => scope,
                            ),
                            parameters: JSON.parse(parameters),
                          },
                        ),
                      "Brouillon enregistré.",
                    )
                  }
                >
                  Enregistrer le brouillon
                </button>
              )}
              <div className="grid gap-3 md:grid-cols-2">
                <label className="text-sm">
                  Motif
                  <input
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                    className="mt-1 w-full rounded border p-2"
                  />
                </label>
                <label className="text-sm">
                  Preuve de revue juridique
                  <input
                    value={evidence}
                    onChange={(event) => setEvidence(event.target.value)}
                    className="mt-1 w-full rounded border p-2"
                  />
                </label>
              </div>
              <div className="flex flex-wrap gap-2">
                {selected.status === "DRAFT" && (
                  <button
                    disabled={busy || !reason.trim()}
                    onClick={() =>
                      void action(
                        () =>
                          api.post(
                            `/admin/v1/commercial/clauses/versions/${selected.id}/submit`,
                            reasonPayload(),
                          ),
                        "Soumis pour revue.",
                      )
                    }
                    className="rounded border px-3 py-2"
                  >
                    Soumettre
                  </button>
                )}
                {selected.status === "IN_REVIEW" && (
                  <>
                    <button
                      disabled={busy || !reason.trim() || !evidence.trim()}
                      onClick={() =>
                        void action(
                          () =>
                            api.post(
                              `/admin/v1/commercial/clauses/versions/${selected.id}/legal-review`,
                              { ...reasonPayload(), evidence },
                            ),
                          "Preuve juridique enregistrée.",
                        )
                      }
                      className="rounded border px-3 py-2"
                    >
                      Enregistrer la revue juridique
                    </button>
                    <button
                      disabled={busy || !reason.trim()}
                      onClick={() =>
                        void action(
                          () =>
                            api.post(
                              `/admin/v1/commercial/clauses/versions/${selected.id}/return-to-draft`,
                              reasonPayload(),
                            ),
                          "Retourné en DRAFT.",
                        )
                      }
                      className="rounded border px-3 py-2"
                    >
                      Retourner au brouillon
                    </button>
                    <button
                      disabled={
                        busy || !reason.trim() || !selected.legalReviewEvidence
                      }
                      onClick={() =>
                        void action(
                          () =>
                            api.post(
                              `/admin/v1/commercial/clauses/versions/${selected.id}/approve`,
                              reasonPayload(),
                            ),
                          "Clause approuvée explicitement.",
                        )
                      }
                      className="rounded bg-slate-900 px-3 py-2 text-white"
                    >
                      Approuver explicitement
                    </button>
                  </>
                )}
                {selected.status === "APPROVED" && (
                  <button
                    disabled={busy || !reason.trim()}
                    onClick={() =>
                      void action(
                        () =>
                          api.post(
                            `/admin/v1/commercial/clauses/versions/${selected.id}/archive`,
                            reasonPayload(),
                          ),
                        "Version archivée.",
                      )
                    }
                    className="rounded border px-3 py-2"
                  >
                    Archiver
                  </button>
                )}
                {selected.status === "ARCHIVED" && selectedClause && (
                  <button
                    disabled={busy || !reason.trim()}
                    onClick={() =>
                      void action(
                        () =>
                          api.post(
                            `/admin/v1/commercial/clauses/${selectedClause.code}/revisions`,
                            reasonPayload(),
                          ),
                        "Nouvelle version DRAFT préparée.",
                      )
                    }
                    className="rounded border px-3 py-2"
                  >
                    Préparer une nouvelle version
                  </button>
                )}
              </div>
            </section>
          )}
        </div>
      </main>
    </AppLayout>
  );
}
