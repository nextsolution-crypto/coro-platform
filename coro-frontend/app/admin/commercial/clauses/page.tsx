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
type PreconfigurationClassification =
  | "MISSING"
  | "ELIGIBLE_PLACEHOLDER"
  | "HUMAN_EDITED_DRAFT"
  | "PROTECTED_NON_DRAFT"
  | "ALREADY_PRECONFIGURED";
type PreconfigurationPlan = {
  legalReviewRequired: true;
  automaticApproval: false;
  summary: Record<PreconfigurationClassification, number>;
  items: {
    category: string;
    classification: PreconfigurationClassification;
    proposed: {
      titleFR: string;
      titleEN: string;
      legalReviewNotes: string;
      legalReferences: string[];
    };
  }[];
};

const preconfigurationConfirmation = "APPLY_B01_STANDARD_DRAFTS";

export default function CommercialClauseLibraryPage() {
  const [clauses, setClauses] = useState<Clause[]>([]);
  const [selected, setSelected] = useState<Version>();
  const [category, setCategory] = useState("ALL");
  const [reason, setReason] = useState("");
  const [evidence, setEvidence] = useState("");
  const [parameters, setParameters] = useState<Parameter[]>([]);
  const [language, setLanguage] = useState<"FR" | "EN">("FR");
  const [plan, setPlan] = useState<PreconfigurationPlan>();
  const [confirmed, setConfirmed] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (selectId?: string) => {
    const { data } = await api.get("/admin/v1/commercial/clauses");
    const values = data as Clause[];
    setClauses(values);
    const versions = values.flatMap((item) => item.versions);
    const next = versions.find((item) => item.id === selectId) ?? versions[0];
    setSelected(next);
    setParameters(next?.parameterSchema ?? []);
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

  async function inspectPreconfiguration() {
    setBusy(true);
    setMessage("");
    try {
      const { data } = await api.get(
        "/admin/v1/commercial/clauses/preconfiguration/dry-run",
      );
      setPlan(data as PreconfigurationPlan);
      setConfirmed(false);
      setMessage("Analyse terminée sans aucune écriture.");
    } catch (error) {
      setMessage(
        (error as { response?: { data?: { message?: string } } }).response?.data
          ?.message ?? "Analyse impossible.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function applyPreconfiguration() {
    setBusy(true);
    setMessage("");
    try {
      const { data } = await api.post(
        "/admin/v1/commercial/clauses/preconfiguration/apply",
        { confirmation: preconfigurationConfirmation },
      );
      setPlan(data as PreconfigurationPlan);
      setConfirmed(false);
      await load(selected?.id);
      setMessage(
        "Préconfiguration appliquée aux seuls placeholders admissibles. Toutes les clauses restent DRAFT.",
      );
    } catch (error) {
      setMessage(
        (error as { response?: { data?: { message?: string } } }).response?.data
          ?.message ?? "Préconfiguration impossible.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppLayout>
      <main className="mx-auto max-w-7xl space-y-5 p-6">
        <header>
          <p className="text-sm text-emerald-700">Commercial</p>
          <h1 className="text-3xl font-semibold">
            Bibliothèque de clauses gouvernée
          </h1>
          <p className="text-sm text-slate-600">
            Les textes DRAFT et IN_REVIEW exigent une revue juridique et sont
            exclus des documents clients.
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
          <button
            disabled={busy || clauses.length === 0}
            className="rounded border border-emerald-700 px-4 py-2 text-emerald-800 disabled:opacity-40"
            onClick={() => void inspectPreconfiguration()}
          >
            Analyser la préconfiguration B01
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
        {plan && (
          <section className="space-y-3 rounded border border-amber-300 bg-amber-50 p-4">
            <div>
              <h2 className="font-semibold">Prévisualisation sans écriture</h2>
              <p className="text-sm text-slate-700">
                Revue juridique obligatoire. Cette opération n’approuve aucune
                clause et préserve les brouillons humains et les versions
                gouvernées.
              </p>
            </div>
            <dl className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-5">
              {Object.entries(plan.summary).map(([key, value]) => (
                <div key={key} className="rounded bg-white p-2">
                  <dt className="text-xs text-slate-500">{key}</dt>
                  <dd className="font-semibold">{value}</dd>
                </div>
              ))}
            </dl>
            <details>
              <summary className="cursor-pointer text-sm font-medium">
                Voir les 25 décisions proposées
              </summary>
              <ul className="mt-2 max-h-72 space-y-1 overflow-auto text-sm">
                {plan.items.map((item) => (
                  <li key={item.category} className="rounded bg-white p-2">
                    <strong>{item.proposed.titleFR}</strong> —{" "}
                    {item.classification}
                    <span className="block text-xs text-slate-600">
                      {item.proposed.legalReviewNotes}
                    </span>
                    <span className="block text-xs text-slate-500">
                      {item.proposed.legalReferences.length} références
                      officielles à vérifier lors de la revue juridique
                    </span>
                  </li>
                ))}
              </ul>
            </details>
            {plan.summary.ELIGIBLE_PLACEHOLDER > 0 && (
              <div className="space-y-2">
                <label className="flex items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={confirmed}
                    onChange={(event) => setConfirmed(event.target.checked)}
                    className="mt-1"
                  />
                  Je confirme la mise à jour exclusive des placeholders DRAFT
                  admissibles; aucune approbation juridique n’est créée.
                </label>
                <button
                  disabled={busy || !confirmed}
                  onClick={() => void applyPreconfiguration()}
                  className="rounded bg-amber-800 px-4 py-2 text-white disabled:opacity-40"
                >
                  Appliquer la préconfiguration gouvernée
                </button>
              </div>
            )}
          </section>
        )}
        <div className="grid gap-5 lg:grid-cols-[340px_1fr]">
          <aside className="space-y-2 rounded border bg-white p-3">
            {visible.map((clause) =>
              clause.versions.map((version) => (
                <button
                  key={version.id}
                  onClick={() => {
                    setSelected(version);
                    setParameters(version.parameterSchema);
                  }}
                  className={`w-full rounded border p-3 text-left ${selected?.id === version.id ? "border-emerald-600" : "border-slate-200"}`}
                >
                  <strong className="block text-sm">{version.titleFR}</strong>
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
                  <p className="text-sm text-amber-800">
                    {selected.status === "APPROVED"
                      ? "Version approuvée — lecture seule"
                      : "Brouillon — revue juridique requise"}
                  </p>
                </div>
                <strong>{selected.status}</strong>
              </div>
              <div className="flex gap-2" aria-label="Langue d’édition">
                {(["FR", "EN"] as const).map((item) => (
                  <button
                    key={item}
                    type="button"
                    aria-pressed={language === item}
                    onClick={() => setLanguage(item)}
                    className={`rounded border px-3 py-1 ${language === item ? "border-emerald-700 bg-emerald-50" : "border-slate-300"}`}
                  >
                    {item}
                  </button>
                ))}
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
              <label className="block text-sm">
                Texte contractuel {language}
                <textarea
                  disabled={selected.status !== "DRAFT"}
                  value={language === "FR" ? selected.textFR : selected.textEN}
                  onChange={(event) =>
                    setSelected({
                      ...selected,
                      [language === "FR" ? "textFR" : "textEN"]:
                        event.target.value,
                    })
                  }
                  rows={8}
                  className="mt-1 w-full rounded border p-2"
                />
              </label>
              <fieldset className="space-y-2 rounded border p-3">
                <legend className="px-1 text-sm font-medium">
                  Paramètres contractuels permis
                </legend>
                {parameters.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    Aucun paramètre pour cette clause.
                  </p>
                ) : (
                  parameters.map((parameter, index) => (
                    <div
                      key={`${parameter.key}-${index}`}
                      className="grid gap-2 sm:grid-cols-[1fr_180px_auto]"
                    >
                      <input
                        aria-label={`Clé du paramètre ${index + 1}`}
                        disabled={selected.status !== "DRAFT"}
                        value={parameter.key}
                        onChange={(event) =>
                          setParameters((current) =>
                            current.map((value, position) =>
                              position === index
                                ? { ...value, key: event.target.value }
                                : value,
                            ),
                          )
                        }
                        className="rounded border p-2"
                      />
                      <select
                        aria-label={`Type du paramètre ${index + 1}`}
                        disabled={selected.status !== "DRAFT"}
                        value={parameter.type}
                        onChange={(event) =>
                          setParameters((current) =>
                            current.map((value, position) =>
                              position === index
                                ? { ...value, type: event.target.value }
                                : value,
                            ),
                          )
                        }
                        className="rounded border p-2"
                      >
                        {[
                          "DURATION_DAYS",
                          "DURATION_MONTHS",
                          "MONEY_MINOR",
                          "DECIMAL",
                          "TEXT",
                          "JURISDICTION",
                        ].map((type) => (
                          <option key={type}>{type}</option>
                        ))}
                      </select>
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          disabled={selected.status !== "DRAFT"}
                          checked={parameter.required}
                          onChange={(event) =>
                            setParameters((current) =>
                              current.map((value, position) =>
                                position === index
                                  ? { ...value, required: event.target.checked }
                                  : value,
                              ),
                            )
                          }
                        />
                        Requis
                      </label>
                    </div>
                  ))
                )}
              </fieldset>
              <details className="rounded border p-3 text-sm">
                <summary className="cursor-pointer font-medium">
                  Détails techniques avancés
                </summary>
                <p>Code : {selectedClause?.code}</p>
                <p>SHA-256 : {selected.contentHash}</p>
                <p>Provenance : {selected.provenance}</p>
              </details>
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
                            parameters,
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
