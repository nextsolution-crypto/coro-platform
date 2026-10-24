"use client";
import { FormEvent, useCallback, useEffect, useState } from "react";
import {
  FileText,
  Upload,
  Search,
  RefreshCw,
  Database,
  ShieldCheck,
} from "lucide-react";
import { getToken } from "../../store/auth";
import styles from "./BuildingDocuments.module.css";

type Document = {
  id: string;
  name: string;
  category: string;
  size: number;
  mimeType: string;
  version: number;
  parentId: string | null;
  projectId: string | null;
  project: { name: string } | null;
  lifecycleState: string;
  knowledgeStatus: string;
  lockVersion: number;
  visibility: string;
  effectiveAt: string | null;
  expiresAt: string | null;
  supersededEffectiveAt: string | null;
  knowledgeIngestions: Array<{ lastErrorCode: string | null }>;
};
type Listing = {
  building: { id: string; name: string };
  canUpload: boolean;
  canManage: boolean;
  files: Document[];
  nextCursor: string | null;
};
type Grant = {
  id: string;
  name: string;
  defaultAllowed: boolean;
  canUpload: boolean | null;
};
const categories: Record<string, string> = {
  documents_reference: "Documents de référence",
  plans_evacuation: "Plans d’évacuation",
  plans_operation: "Plans techniques et systèmes",
  plans_implantation: "Plans d’implantation",
  rapports: "Rapports et inspections",
  registres: "Registres et inventaires",
  photos: "Photographies",
  fichiers_client: "Fichiers client",
  autre: "Autres documents",
};
const states: Record<string, string> = {
  DRAFT: "Brouillon",
  REVIEW: "En révision",
  APPROVED: "Approuvé",
  REVOKED: "Révoqué",
  SUPERSEDED: "Remplacé",
  EXPIRED: "Expiré",
  FUTURE: "À venir",
};
const knowledge: Record<string, string> = {
  READY: "Indexé",
  FAILED: "Échec du traitement",
  QUEUED: "En attente",
  PROCESSING: "Traitement en cours",
  STALE: "Source retirée",
  REVOKED: "Source révoquée",
  UNSUPPORTED: "Conservé — extraction non prise en charge",
  AWAITING_APPROVAL: "En attente d’approbation",
};
function status(d: Document) {
  if (d.lifecycleState !== "APPROVED") return d.lifecycleState;
  if (d.expiresAt && new Date(d.expiresAt).getTime() <= Date.now())
    return "EXPIRED";
  if (
    d.supersededEffectiveAt &&
    new Date(d.supersededEffectiveAt).getTime() <= Date.now()
  )
    return "SUPERSEDED";
  if (d.effectiveAt && new Date(d.effectiveAt).getTime() > Date.now())
    return "FUTURE";
  return "APPROVED";
}
const request = async (
  path: string,
  method = "GET",
  body?: unknown,
  blob = false,
) => {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002/api"}${path}`,
    {
      method,
      headers: {
        Authorization: `Bearer ${getToken()}`,
        ...(body && !(body instanceof FormData)
          ? { "Content-Type": "application/json" }
          : {}),
      },
      body:
        body instanceof FormData
          ? body
          : body
            ? JSON.stringify(body)
            : undefined,
    },
  );
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.message || "Opération impossible");
  }
  return blob ? response.blob() : response.json();
};
const prefix = "/client-portal";
const internal = false;

export default function BuildingDocuments({
  buildingId,
}: {
  buildingId: string;
}) {
  const base = `${prefix}/buildings/${buildingId}/documents`;
  const [data, setData] = useState<Listing | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("");
  const [history, setHistory] = useState(false);
  const [upload, setUpload] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [category, setCategory] = useState("documents_reference");
  const [visibility, setVisibility] = useState("shared");
  const [parentId, setParentId] = useState("");
  const [action, setAction] = useState<{
    file: Document;
    kind: "review" | "approve" | "revoke";
  } | null>(null);
  const [reason, setReason] = useState("");
  const [effective, setEffective] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [expiry, setExpiry] = useState("");
  const [askOpen, setAskOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<any>(null);
  const [grants, setGrants] = useState<Grant[] | null>(null);
  const message = (e: any) =>
    typeof e?.response?.data?.message === "string"
      ? e.response.data.message
      : e?.message || "Opération impossible";
  const load = useCallback(async () => {
    try {
      setData(
        await request(
          `${base}?${new URLSearchParams({ q: search, category: filter, history: String(history) })}`,
        ),
      );
      setError("");
    } catch (e) {
      setError(message(e));
    }
  }, [base, search, filter, history]);
  useEffect(() => {
    const timer = setTimeout(() => {
      void load();
    }, 250);
    return () => clearTimeout(timer);
  }, [load]);
  useEffect(() => {
    const timer = setInterval(() => {
      void load();
    }, 30000);
    return () => clearInterval(timer);
  }, [load]);
  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  };
  const submit = (e: FormEvent) => {
    e.preventDefault();
    void run(async () => {
      if (!file) throw new Error("Sélectionnez un fichier");
      if (file.size > 50 * 1024 * 1024)
        throw new Error("Maximum 50 Mo par fichier");
      const form = new FormData();
      form.append("file", file);
      form.append("category", category);
      form.append("visibility", visibility);
      if (parentId) form.append("parentId", parentId);
      await request(base, "POST", form);
      setUpload(false);
      setFile(null);
      setParentId("");
      await load();
    });
  };
  const transition = (e: FormEvent) => {
    e.preventDefault();
    if (!action) return;
    void run(async () => {
      await request(`/project-files/${action.file.id}/${action.kind}`, "PUT", {
        reason,
        requestId: crypto.randomUUID(),
        lockVersion: action.file.lockVersion,
        ...(action.kind === "approve"
          ? {
              effectiveAt: new Date(effective + "T00:00:00").toISOString(),
              ...(expiry
                ? { expiresAt: new Date(expiry + "T23:59:59").toISOString() }
                : {}),
            }
          : {}),
      });
      setAction(null);
      setReason("");
      await load();
    });
  };
  const download = (d: Document) =>
    void run(async () => {
      const blob = await request(
        `${base}/${d.id}/content`,
        "GET",
        undefined,
        true,
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = d.name;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    });
  const activeFiles =
    data?.files.filter(
      (d) => !["REVOKED", "SUPERSEDED", "EXPIRED"].includes(status(d)),
    ) ?? [];
  const visible = (history ? (data?.files ?? []) : activeFiles).filter(
    (d) =>
      (!filter || d.category === filter) &&
      `${d.name} ${d.project?.name ?? ""}`
        .toLocaleLowerCase("fr")
        .includes(search.toLocaleLowerCase("fr")),
  );
  return (
    <section
      className={styles.space}
      aria-label="Espace documentaire du bâtiment"
    >
      <header className={styles.header}>
        <div>
          <span className={styles.eyebrow}>
            <Database size={15} /> PLANS · RAPPORTS · RÉFÉRENCES
          </span>
          <h2>Documentation du bâtiment</h2>
          <p>
            Les plans, rapports, registres et fichiers de référence de {data?.building.name ?? "ce bâtiment"}. Les
            documents approuvés des projets enrichissent cette base, même après
            leur archivage.
          </p>
        </div>
        <div className={styles.actions}>
          <button type="button" onClick={() => setAskOpen(!askOpen)}>
            Interroger CORO AI
          </button>
          <button
            type="button"
            onClick={() => void load()}
            aria-label="Actualiser les documents"
          >
            <RefreshCw size={17} />
          </button>
          {data?.canUpload && (
            <button
              type="button"
              onClick={() => {
                setParentId("");
                setUpload(true);
              }}
            >
              <Upload size={16} /> Ajouter un document
            </button>
          )}
        </div>
      </header>
      {askOpen && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void run(async () =>
              setAnswer(
                await request(`${prefix}/knowledge/ask`, "POST", {
                  question,
                  buildingId,
                }),
              ),
            );
          }}
          className={styles.assistant}
        >
          <h3>CORO AI · Ce bâtiment</h3>
          <label>
            Votre question
            <input
              required
              minLength={3}
              maxLength={2000}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ex. : Où se trouve la vanne principale ?"
            />
          </label>
          <button disabled={busy || question.trim().length < 3} type="submit">
            {busy ? "Recherche…" : "Interroger"}
          </button>
          {answer && (
            <div aria-live="polite">
              <p>
                {answer.answer ||
                  answer.uncertainty ||
                  "Les sources disponibles ne permettent pas de répondre."}
              </p>
              {answer.citations?.map((c: any) => (
                <button
                  type="button"
                  key={c.citationId}
                  onClick={() => {
                    const d = data?.files.find((f) => f.id === c.projectFileId);
                    if (d) download(d);
                  }}
                >
                  {c.name} · v{c.version} ·{" "}
                  {c.sectionPath || `page ${c.pageStart}`}
                </button>
              ))}
            </div>
          )}
        </form>
      )}
      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
      {!data && !error && <p role="status">Chargement des documents…</p>}
      {data && (
        <>
          <div className={styles.stats}>
            <span>
              <strong>{activeFiles.length}</strong> documents affichés
            </span>
            <span>
              <strong>
                {
                  data.files.filter(
                    (d) =>
                      status(d) === "APPROVED" && d.knowledgeStatus === "READY",
                  ).length
                }
              </strong>{" "}
              sources indexées en vigueur
            </span>
            <span>
              <strong>
                {
                  data.files.filter((d) =>
                    ["DRAFT", "REVIEW"].includes(status(d)),
                  ).length
                }
              </strong>{" "}
              à valider
            </span>
          </div>
          <div className={styles.filters}>
            <label>
              <Search size={16} />
              <input
                aria-label="Rechercher un document"
                placeholder="Rechercher un document…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </label>
            <select
              aria-label="Catégorie"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              <option value="">Toutes les catégories</option>
              {Object.entries(categories).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <label>
              <input
                type="checkbox"
                checked={history}
                onChange={(e) => setHistory(e.target.checked)}
              />{" "}
              Inclure l’historique
            </label>
          </div>
          <p className={styles.note}>
            PDF, Word, Excel, textes, images et plans · 50 Mo maximum. Les
            formats spécialisés sont conservés ; leur analyse exige un export
            exploitable. Seuls les documents approuvés et en vigueur alimentent
            CORO AI.
          </p>
          {visible.length === 0 ? (
            <div className={styles.empty}>
              <FileText size={32} />
              <h3>
                {data.files.length
                  ? "Aucun document correspondant"
                  : "Construisez la mémoire de votre bâtiment"}
              </h3>
              <p>
                Ajoutez vos plans, procédures, rapports et inventaires. Les
                livrables approuvés de vos projets apparaîtront ici.
              </p>
            </div>
          ) : (
            <div className={styles.list}>
              {visible.map((d) => (
                <article key={d.id} className={styles.document}>
                  <FileText size={23} />
                  <div className={styles.body}>
                    <h3>
                      {d.name} <small>v{d.version}</small>
                    </h3>
                    <p>
                      {categories[d.category] ?? d.category} ·{" "}
                      {(d.size / 1024 / 1024).toFixed(2)} Mo ·{" "}
                      {d.project
                        ? `Projet : ${d.project.name}`
                        : "Dépôt direct au bâtiment"}{" "}
                      ·{" "}
                      {d.visibility === "internal"
                        ? "Interne"
                        : "Partagé avec le client"}
                    </p>
                    <div className={styles.badges}>
                      <span>{states[status(d)] ?? status(d)}</span>
                      <span>
                        {status(d) === "APPROVED"
                          ? (knowledge[d.knowledgeStatus] ?? d.knowledgeStatus)
                          : "Non utilisé par Knowledge"}
                      </span>
                      {d.expiresAt && (
                        <span>
                          Échéance :{" "}
                          {new Date(d.expiresAt).toLocaleDateString("fr-CA")}
                        </span>
                      )}
                    </div>
                    {d.knowledgeIngestions[0]?.lastErrorCode && (
                      <p className={styles.note}>
                        Traitement : {d.knowledgeIngestions[0].lastErrorCode}
                      </p>
                    )}
                  </div>
                  <div className={styles.actions}>
                    <button disabled={busy} onClick={() => download(d)}>
                      Télécharger
                    </button>
                    {data.canUpload && (
                      <button
                        disabled={busy}
                        onClick={() => {
                          setParentId(d.parentId ?? d.id);
                          setCategory(d.category);
                          setUpload(true);
                        }}
                      >
                        Nouvelle version
                      </button>
                    )}
                    {internal &&
                      ["DRAFT", "REVIEW", "APPROVED"].includes(
                        d.lifecycleState,
                      ) && (
                        <button
                          disabled={busy}
                          onClick={() => {
                            setAction({
                              file: d,
                              kind:
                                d.lifecycleState === "DRAFT"
                                  ? "review"
                                  : d.lifecycleState === "REVIEW"
                                    ? "approve"
                                    : "revoke",
                            });
                            setReason("");
                          }}
                        >
                          {d.lifecycleState === "DRAFT"
                            ? "Soumettre en révision"
                            : d.lifecycleState === "REVIEW"
                              ? "Approuver"
                              : "Révoquer"}
                        </button>
                      )}
                  </div>
                </article>
              ))}
            </div>
          )}
          {data.nextCursor && (
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                void run(async () => {
                  const next: Listing = await request(
                    `${base}?${new URLSearchParams({ q: search, category: filter, history: String(history), cursor: data.nextCursor! })}`,
                  );
                  setData({
                    ...next,
                    files: [
                      ...data.files,
                      ...next.files.filter(
                        (f) => !data.files.some((old) => old.id === f.id),
                      ),
                    ],
                  });
                })
              }
            >
              Afficher plus de documents
            </button>
          )}
          {data.canManage && (
            <div className={styles.permissions}>
              <button
                onClick={() =>
                  void run(async () =>
                    setGrants(grants ? null : await request(`${base}/grants`)),
                  )
                }
              >
                <ShieldCheck size={16} /> Permissions de dépôt client
              </button>
              {grants && (
                <div>
                  <p>
                    Les responsables disposent du droit par défaut. Vous pouvez
                    autoriser ou suspendre le dépôt pour chaque utilisateur de
                    ce client.
                  </p>
                  {grants.map((g) => (
                    <label key={g.id} className={styles.grant}>
                      <span>
                        {g.name} {g.defaultAllowed ? "(responsable)" : ""}
                      </span>
                      <input
                        type="checkbox"
                        disabled={busy}
                        checked={g.canUpload ?? g.defaultAllowed}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          void run(async () => {
                            await request(`${base}/grants/${g.id}`, "PUT", {
                              canUpload: checked,
                            });
                            setGrants(await request(`${base}/grants`));
                          });
                        }}
                      />
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
      {upload && (
        <div className={styles.backdrop}>
          <form
            className={styles.modal}
            onSubmit={submit}
            aria-label="Ajouter un document"
          >
            <h3>
              {parentId
                ? "Ajouter une nouvelle version"
                : "Ajouter au dossier du bâtiment"}
            </h3>
            <p>
              Le dépôt crée un brouillon. Une approbation est nécessaire avant
              son utilisation par Knowledge.
            </p>
            <label>
              Fichier
              <input
                type="file"
                required
                accept=".pdf,.docx,.doc,.xlsx,.xls,.csv,.tsv,.txt,.md,.jpg,.jpeg,.png,.tif,.tiff,.webp,.dwg,.dxf,.ifc"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </label>
            <label>
              Catégorie
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {Object.entries(categories).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </label>
            {internal && (
              <label>
                Visibilité
                <select
                  value={visibility}
                  onChange={(e) => setVisibility(e.target.value)}
                >
                  <option value="shared">Partagé avec le client</option>
                  <option value="internal">Interne à l’organisation</option>
                </select>
              </label>
            )}
            <div className={styles.actions}>
              <button
                type="button"
                disabled={busy}
                onClick={() => setUpload(false)}
              >
                Annuler
              </button>
              <button disabled={busy || !file} type="submit">
                {busy ? "Dépôt en cours…" : "Déposer le document"}
              </button>
            </div>
            {error && <p role="alert">{error}</p>}
          </form>
        </div>
      )}
      {action && (
        <div className={styles.backdrop}>
          <form className={styles.modal} onSubmit={transition}>
            <h3>
              {action.kind === "approve"
                ? "Approuver"
                : action.kind === "review"
                  ? "Soumettre en révision"
                  : "Révoquer"}{" "}
              : {action.file.name}
            </h3>
            <label>
              Justification
              <textarea
                required
                minLength={8}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </label>
            {action.kind === "approve" && (
              <>
                <label>
                  En vigueur le
                  <input
                    required
                    type="date"
                    value={effective}
                    onChange={(e) => setEffective(e.target.value)}
                  />
                </label>
                <label>
                  Expiration (facultative)
                  <input
                    type="date"
                    min={effective}
                    value={expiry}
                    onChange={(e) => setExpiry(e.target.value)}
                  />
                </label>
              </>
            )}
            <div className={styles.actions}>
              <button
                type="button"
                disabled={busy}
                onClick={() => setAction(null)}
              >
                Annuler
              </button>
              <button disabled={busy} type="submit">
                Confirmer
              </button>
            </div>
            {error && <p role="alert">{error}</p>}
          </form>
        </div>
      )}
    </section>
  );
}
