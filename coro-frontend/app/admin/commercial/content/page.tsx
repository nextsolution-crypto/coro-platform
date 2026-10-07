"use client";

import { useCallback, useEffect, useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import api from "@/lib/api";

type Binding = {
  id: string;
  targetType: string;
  targetCode: string;
  labelFR: string;
  labelEN: string | null;
  commercialIntent: string;
  deliveryMaturity: string;
  evidence: string | null;
  displayOrder: number;
};
type Version = {
  id: string;
  versionNumber: number;
  status: string;
  titleFR: string;
  titleEN: string | null;
  descriptionFR: string;
  descriptionEN: string | null;
  provenance: string;
  contentHash: string;
  lockVersion: number;
  bindings: Binding[];
};
type Content = { id: string; code: string; versions: Version[] };

export default function CommercialContentPage() {
  const [contents, setContents] = useState<Content[]>([]);
  const [selected, setSelected] = useState<Version>();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (selectId?: string) => {
    const { data } = await api.get("/admin/v1/commercial/content");
    setContents(data);
    const versions = (data as Content[]).flatMap((item) => item.versions);
    setSelected(versions.find((item) => item.id === selectId) ?? versions[0]);
  }, []);
  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function action(
    run: () => Promise<{ data: Version }>,
    success: string,
  ) {
    setBusy(true);
    setMessage("");
    try {
      const { data } = await run();
      await load(data.id);
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
  const updateBinding = (id: string, patch: Partial<Binding>) =>
    setSelected((current) =>
      current
        ? {
            ...current,
            bindings: current.bindings.map((binding) =>
              binding.id === id ? { ...binding, ...patch } : binding,
            ),
          }
        : current,
    );

  return (
    <AppLayout>
      <main className="mx-auto max-w-7xl space-y-5 p-6">
        <header>
          <p className="text-sm text-emerald-700">Commercial</p>
          <h1 className="text-3xl font-semibold">
            Contenu commercial gouverné
          </h1>
          <p className="text-sm text-slate-600">
            Les brouillons et contenus non vérifiés ne sont jamais des promesses
            client.
          </p>
        </header>
        {message && (
          <p role="status" className="rounded border p-3">
            {message}
          </p>
        )}
        {contents.length === 0 && (
          <button
            disabled={busy}
            className="rounded bg-emerald-700 px-4 py-2 text-white"
            onClick={() =>
              void action(
                () =>
                  api.post("/admin/v1/commercial/content/professional-draft"),
                "Brouillon CORO Professional créé.",
              )
            }
          >
            Créer le brouillon Professional
          </button>
        )}
        <div className="grid gap-5 lg:grid-cols-[18rem_1fr]">
          <aside className="rounded border bg-white p-4">
            {contents.map((content) => (
              <div key={content.id}>
                <b>{content.code}</b>
                {content.versions.map((version) => (
                  <button
                    key={version.id}
                    onClick={() => setSelected(version)}
                    className="mt-2 block w-full rounded border p-2 text-left"
                  >
                    v{version.versionNumber} · {version.status}
                  </button>
                ))}
              </div>
            ))}
          </aside>
          {selected && (
            <section className="space-y-4 rounded border bg-white p-5">
              <div>
                {selected.status === "DRAFT" ? (
                  <>
                    <input
                      aria-label="Titre français"
                      className="w-full rounded border p-2 font-semibold"
                      value={selected.titleFR}
                      onChange={(event) =>
                        setSelected({
                          ...selected,
                          titleFR: event.target.value,
                        })
                      }
                    />
                    <textarea
                      aria-label="Description française"
                      className="mt-2 w-full rounded border p-2"
                      value={selected.descriptionFR}
                      onChange={(event) =>
                        setSelected({
                          ...selected,
                          descriptionFR: event.target.value,
                        })
                      }
                    />
                    <input
                      aria-label="English title"
                      className="mt-2 w-full rounded border p-2"
                      value={selected.titleEN ?? ""}
                      onChange={(event) =>
                        setSelected({
                          ...selected,
                          titleEN: event.target.value,
                        })
                      }
                    />
                    <textarea
                      aria-label="English description"
                      className="mt-2 w-full rounded border p-2"
                      value={selected.descriptionEN ?? ""}
                      onChange={(event) =>
                        setSelected({
                          ...selected,
                          descriptionEN: event.target.value,
                        })
                      }
                    />
                  </>
                ) : (
                  <>
                    <h2 className="text-xl font-semibold">
                      {selected.titleFR}
                    </h2>
                    <p>{selected.descriptionFR}</p>
                  </>
                )}
                <small className="block">
                  Provenance : {selected.provenance}
                </small>
                <small className="block font-mono">
                  SHA-256 : {selected.contentHash}
                </small>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr>
                      <th>Élément</th>
                      <th>Intention</th>
                      <th>Maturité</th>
                      <th>Preuve</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selected.bindings.map((binding) => (
                      <tr key={binding.id} className="border-t">
                        <td className="py-2">
                          {binding.labelFR}
                          {selected.status === "DRAFT" && (
                            <input
                              aria-label={`English label ${binding.labelFR}`}
                              className="mt-1 block rounded border p-1"
                              value={binding.labelEN ?? ""}
                              onChange={(event) =>
                                updateBinding(binding.id, {
                                  labelEN: event.target.value,
                                })
                              }
                            />
                          )}
                          <small className="block text-slate-500">
                            {binding.targetType} · {binding.targetCode}
                          </small>
                        </td>
                        <td>
                          {selected.status === "DRAFT" ? (
                            <select
                              aria-label={`Intention ${binding.labelFR}`}
                              value={binding.commercialIntent}
                              onChange={(event) =>
                                updateBinding(binding.id, {
                                  commercialIntent: event.target.value,
                                })
                              }
                            >
                              {[
                                "INCLUDED",
                                "OPTIONAL",
                                "AUTONOMOUS",
                                "TECHNICAL_DEPENDENCY",
                                "NOT_INCLUDED",
                                "FUTURE",
                              ].map((value) => (
                                <option key={value}>{value}</option>
                              ))}
                            </select>
                          ) : (
                            binding.commercialIntent
                          )}
                        </td>
                        <td>
                          {selected.status === "DRAFT" ? (
                            <select
                              aria-label={`Maturité ${binding.labelFR}`}
                              value={binding.deliveryMaturity}
                              onChange={(event) =>
                                updateBinding(binding.id, {
                                  deliveryMaturity: event.target.value,
                                })
                              }
                            >
                              {[
                                "AVAILABLE",
                                "LIMITED",
                                "FUTURE",
                                "UNVERIFIED",
                              ].map((value) => (
                                <option key={value}>{value}</option>
                              ))}
                            </select>
                          ) : (
                            binding.deliveryMaturity
                          )}
                        </td>
                        <td>{binding.evidence ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex flex-wrap gap-2">
                {selected.status === "DRAFT" && (
                  <>
                    <button
                      disabled={busy}
                      className="rounded border px-3 py-2"
                      onClick={() =>
                        void action(
                          () =>
                            api.patch(
                              `/admin/v1/commercial/content/versions/${selected.id}`,
                              {
                                lockVersion: selected.lockVersion,
                                titleFR: selected.titleFR,
                                titleEN: selected.titleEN || undefined,
                                descriptionFR: selected.descriptionFR,
                                descriptionEN:
                                  selected.descriptionEN || undefined,
                                provenance: selected.provenance,
                                bindings: selected.bindings.map((binding) => ({
                                  targetType: binding.targetType,
                                  targetCode: binding.targetCode,
                                  labelFR: binding.labelFR,
                                  labelEN: binding.labelEN || undefined,
                                  commercialIntent: binding.commercialIntent,
                                  deliveryMaturity: binding.deliveryMaturity,
                                  evidence: binding.evidence || undefined,
                                  displayOrder: binding.displayOrder,
                                })),
                              },
                            ),
                          "Brouillon enregistré.",
                        )
                      }
                    >
                      Enregistrer le brouillon
                    </button>
                    <button
                      disabled={busy}
                      className="rounded border px-3 py-2"
                      onClick={() =>
                        void action(
                          () =>
                            api.post(
                              `/admin/v1/commercial/content/versions/${selected.id}/submit-review`,
                              {
                                lockVersion: selected.lockVersion,
                                reason: "Soumis à la revue commerciale",
                              },
                            ),
                          "Contenu soumis en revue.",
                        )
                      }
                    >
                      Soumettre en revue
                    </button>
                  </>
                )}
                {selected.status === "IN_REVIEW" && (
                  <>
                    <button
                      disabled={busy}
                      className="rounded border px-3 py-2"
                      onClick={() =>
                        void action(
                          () =>
                            api.post(
                              `/admin/v1/commercial/content/versions/${selected.id}/return-to-draft`,
                              {
                                lockVersion: selected.lockVersion,
                                reason: "Corrections requises",
                              },
                            ),
                          "Contenu retourné en brouillon.",
                        )
                      }
                    >
                      Retourner au brouillon
                    </button>
                    <button
                      disabled={busy}
                      className="rounded bg-emerald-700 px-3 py-2 text-white"
                      onClick={() =>
                        void action(
                          () =>
                            api.post(
                              `/admin/v1/commercial/content/versions/${selected.id}/approve`,
                              {
                                lockVersion: selected.lockVersion,
                                reason: "Approbation commerciale explicite",
                              },
                            ),
                          "Contenu approuvé.",
                        )
                      }
                    >
                      Approuver explicitement
                    </button>
                  </>
                )}
                {selected.status === "APPROVED" && (
                  <>
                    <button
                      disabled={busy}
                      className="rounded border px-3 py-2"
                      onClick={() =>
                        void action(
                          () =>
                            api.post(
                              `/admin/v1/commercial/content/CORO_PROFESSIONAL/revisions`,
                            ),
                          "Nouvelle révision brouillon créée.",
                        )
                      }
                    >
                      Créer une révision
                    </button>
                    <button
                      disabled={busy}
                      className="rounded border px-3 py-2"
                      onClick={() =>
                        void action(
                          () =>
                            api.post(
                              `/admin/v1/commercial/content/versions/${selected.id}/archive`,
                              {
                                lockVersion: selected.lockVersion,
                                reason: "Archivé par le Super Admin",
                              },
                            ),
                          "Contenu archivé.",
                        )
                      }
                    >
                      Archiver
                    </button>
                  </>
                )}
              </div>
            </section>
          )}
        </div>
      </main>
    </AppLayout>
  );
}
