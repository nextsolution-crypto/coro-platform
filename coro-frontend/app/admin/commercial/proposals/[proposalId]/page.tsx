"use client";
import { use, useCallback, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import AppLayout from "@/components/layout/AppLayout";
import api from "@/lib/api";
import { CustomerSafeReview } from "../../configurator/CustomerSafeReview";
import type { CustomerSafeProjection } from "../../configurator/configurator-types";

type Document = {
  id: string;
  status: string;
  fileName: string;
  artifactVersion: number;
  templateVersion: string;
  compositionSnapshotId: string | null;
  compositionReadiness: "INTERNAL_DRAFT" | "ISSUANCE_READY" | null;
};
type Revision = {
  id: string;
  revisionNumber: number;
  status: string;
  lockVersion: number;
  recipientPreferredLanguage: "FR" | "EN";
  validFrom: string | null;
  validUntil: string | null;
  contextFR: string | null;
  contextEN: string | null;
  termsFR: string | null;
  termsEN: string | null;
  documents: Document[];
};
type Detail = {
  id: string;
  reference: string;
  title: string;
  organization: { id: string; name: string } | null;
  prospect: { id: string; legalName: string } | null;
  revisions: Revision[];
};
type CompositionDiagnostic = {
  code: string;
  severity: "BLOCKING" | "WARNING";
  subject?: string;
};
type Composition = {
  id: string;
  templateCode: string;
  templateVersion: string;
  language: "FR" | "EN";
  sequence: number;
  readiness: "INTERNAL_DRAFT" | "ISSUANCE_READY";
  issuanceReady: boolean;
  canonicalHash: string;
  diagnostics: CompositionDiagnostic[];
  snapshot?: { sections?: { code: string }[] };
  composedAt: string;
};
const labels: Record<string, string> = {
  DRAFT: "Brouillon",
  INTERNAL_REVIEW: "Revue interne",
  READY: "Prête",
  SENT: "Envoyée",
  ACCEPTED: "Acceptée",
  REJECTED: "Refusée",
  CANCELLED: "Annulée",
  SUPERSEDED: "Remplacée",
};
const errorMessage = (error: unknown) => {
  const message = (error as { response?: { data?: { message?: unknown } } })
    ?.response?.data?.message;
  return Array.isArray(message)
    ? message.join(" ")
    : typeof message === "string"
      ? message
      : "Action impossible. Vérifiez les données et réessayez.";
};

export default function ProposalDetailPage({
  params,
}: {
  params: Promise<{ proposalId: string }>;
}) {
  const { proposalId } = use(params);
  const [detail, setDetail] = useState<Detail>();
  const [preview, setPreview] = useState<CustomerSafeProjection>();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [composition, setComposition] = useState<Composition>();
  const [compositionHistory, setCompositionHistory] = useState<Composition[]>(
    [],
  );
  const [documentForm, setDocumentForm] = useState({
    templateCode: "CORO_PROFESSIONAL",
    language: "FR" as "FR" | "EN",
    clauseParameters: "{}",
  });
  const closePreview = useCallback(() => setPreview(undefined), []);
  const [form, setForm] = useState({
    validFrom: "",
    validUntil: "",
    contextFR: "",
    contextEN: "",
    termsFR: "",
    termsEN: "",
  });
  const load = useCallback(async () => {
    const { data } = await api.get(
      `/admin/v1/commercial/proposals/${proposalId}`,
    );
    setDetail(data);
    const revision = data.revisions[0] as Revision | undefined;
    if (!revision) return;
    const historyResponse = await api.get(
      `/admin/v1/commercial/proposals/${proposalId}/revisions/${revision.id}/document-compositions`,
    );
    const history = historyResponse.data as Composition[];
    setCompositionHistory(history);
    if (history[0]) {
      const snapshotResponse = await api.get(
        `/admin/v1/commercial/proposals/${proposalId}/revisions/${revision.id}/document-compositions/${history[0].id}`,
      );
      setComposition(snapshotResponse.data);
    } else {
      setComposition(undefined);
    }
    setForm({
      validFrom: revision.validFrom?.slice(0, 10) ?? "",
      validUntil: revision.validUntil?.slice(0, 10) ?? "",
      contextFR: revision.contextFR ?? "",
      contextEN: revision.contextEN ?? "",
      termsFR: revision.termsFR ?? "",
      termsEN: revision.termsEN ?? "",
    });
  }, [proposalId]);
  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void load().catch(() =>
        setMessage("Impossible de charger la proposition."),
      );
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [load]);
  const revision = detail?.revisions[0];
  const documents = revision?.documents ?? [];
  async function openPreview() {
    if (!revision) return;
    setBusy(true);
    setMessage("");
    try {
      const response = await api.get(
        `/admin/v1/commercial/proposals/${proposalId}/revisions/${revision.id}/customer-preview`,
      );
      setPreview(response.data);
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }
  async function execute(action: () => Promise<void>, success: string) {
    setBusy(true);
    setMessage("");
    try {
      await action();
      await load();
      setMessage(success);
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }
  function save() {
    if (!revision) return;
    return execute(async () => {
      await api.put(
        `/admin/v1/commercial/proposals/${proposalId}/revisions/${revision.id}/finalization`,
        {
          lockVersion: revision.lockVersion,
          validFrom: form.validFrom
            ? new Date(`${form.validFrom}T00:00:00.000Z`).toISOString()
            : null,
          validUntil: form.validUntil
            ? new Date(`${form.validUntil}T23:59:59.999Z`).toISOString()
            : null,
          contextFR: form.contextFR || null,
          contextEN: form.contextEN || null,
          termsFR: form.termsFR || null,
          termsEN: form.termsEN || null,
        },
      );
    }, "Informations client enregistrées.");
  }
  function transition(path: "request-review" | "mark-ready") {
    if (!revision) return;
    const ready = path === "mark-ready";
    return execute(
      async () => {
        await api.post(
          `/admin/v1/commercial/proposals/${proposalId}/revisions/${revision.id}/${path}`,
          {
            lockVersion: revision.lockVersion,
            reason: ready
              ? "Validation finale par le fondateur"
              : "Revue interne par le fondateur",
          },
        );
      },
      ready ? "Proposition marquée prête." : "Revue interne commencée.",
    );
  }
  function generatePdf() {
    if (!revision) return;
    return execute(async () => {
      await api.post(
        `/admin/v1/commercial/proposals/${proposalId}/revisions/${revision.id}/generate-pdf`,
        {
          language: revision.recipientPreferredLanguage,
          idempotencyKey: crypto.randomUUID(),
        },
      );
    }, "PDF client privé généré.");
  }
  function composeDocument() {
    if (!revision) return;
    return execute(async () => {
      let clauseParameters: Record<string, unknown>;
      try {
        clauseParameters = JSON.parse(documentForm.clauseParameters) as Record<
          string,
          unknown
        >;
      } catch {
        throw new Error(
          "Les paramètres de clauses doivent être un objet JSON.",
        );
      }
      const response = await api.post(
        `/admin/v1/commercial/proposals/${proposalId}/revisions/${revision.id}/document-compositions`,
        {
          templateCode: documentForm.templateCode,
          language: documentForm.language,
          clauseParameters,
        },
      );
      setComposition(response.data);
    }, "Composition documentaire immuable créée.");
  }
  function generateGovernedPdf() {
    if (!revision || !composition) return;
    return execute(async () => {
      await api.post(
        `/admin/v1/commercial/proposals/${proposalId}/revisions/${revision.id}/document-compositions/${composition.id}/generate-pdf-v2`,
        { idempotencyKey: crypto.randomUUID() },
      );
    }, "Offre de service V2 générée dans le stockage privé.");
  }
  async function downloadPdf(document: Document) {
    if (!revision) return;
    try {
      const response = await api.get(
        `/admin/v1/commercial/proposals/${proposalId}/revisions/${revision.id}/documents/${document.id}/download`,
        { responseType: "blob" },
      );
      const url = URL.createObjectURL(response.data);
      const anchor = window.document.createElement("a");
      anchor.href = url;
      anchor.download = document.fileName;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      setMessage(errorMessage(error));
    }
  }
  return (
    <AppLayout>
      <main className="mx-auto max-w-6xl space-y-5 p-6">
        <Link href="/admin/commercial/proposals" className="text-sm underline">
          â† Propositions
        </Link>
        <header>
          <p className="text-sm text-emerald-700">Commercial</p>
          <h1 className="text-3xl font-semibold">
            {detail?.reference ?? "Proposition"}
          </h1>
          {detail && (detail.organization || detail.prospect) && (
            <Link
              className="mt-2 inline-block text-sm underline"
              href={
                detail.organization
                  ? `/admin/commercial/dossier/ORGANIZATION/${detail.organization.id}`
                  : `/admin/commercial/dossier/PROSPECT/${detail.prospect!.id}`
              }
            >
              Ouvrir le dossier commercial
            </Link>
          )}
          <p>
            {detail?.title} · {labels[revision?.status ?? ""]} · v
            {revision?.revisionNumber}
          </p>
        </header>
        {message && (
          <p role="status" className="rounded border p-3">
            {message}
          </p>
        )}
        {revision?.status === "DRAFT" && (
          <section className="space-y-4 rounded border bg-white p-5">
            <div>
              <h2 className="text-lg font-semibold">
                Finaliser l’offre client
              </h2>
              <p className="text-sm text-slate-500">
                Aucun texte juridique ou délai de validité n’est ajouté
                automatiquement.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Début de validité">
                <input
                  type="date"
                  value={form.validFrom}
                  onChange={(e) =>
                    setForm({ ...form, validFrom: e.target.value })
                  }
                  className="w-full rounded border p-2"
                />
              </Field>
              <Field label="Fin de validité">
                <input
                  type="date"
                  value={form.validUntil}
                  onChange={(e) =>
                    setForm({ ...form, validUntil: e.target.value })
                  }
                  className="w-full rounded border p-2"
                />
              </Field>
              <Field label="Contexte client (FR)">
                <textarea
                  value={form.contextFR}
                  onChange={(e) =>
                    setForm({ ...form, contextFR: e.target.value })
                  }
                  className="min-h-28 w-full rounded border p-2"
                />
              </Field>
              <Field label="Customer context (EN)">
                <textarea
                  value={form.contextEN}
                  onChange={(e) =>
                    setForm({ ...form, contextEN: e.target.value })
                  }
                  className="min-h-28 w-full rounded border p-2"
                />
              </Field>
              <Field label="Conditions commerciales (FR)">
                <textarea
                  value={form.termsFR}
                  onChange={(e) =>
                    setForm({ ...form, termsFR: e.target.value })
                  }
                  className="min-h-36 w-full rounded border p-2"
                />
              </Field>
              <Field label="Commercial terms (EN)">
                <textarea
                  value={form.termsEN}
                  onChange={(e) =>
                    setForm({ ...form, termsEN: e.target.value })
                  }
                  className="min-h-36 w-full rounded border p-2"
                />
              </Field>
            </div>
            <button
              disabled={busy}
              onClick={() => void save()}
              className="rounded bg-emerald-700 px-4 py-2 text-white disabled:opacity-50"
            >
              Enregistrer et actualiser l’aperçu
            </button>
          </section>
        )}
        {revision && (
          <button
            type="button"
            disabled={busy}
            onClick={() => void openPreview()}
            className="rounded border px-4 py-2 disabled:opacity-50"
          >
            Ouvrir l’aperçu client
          </button>
        )}
        {preview && (
          <CustomerSafeReview preview={preview} onClose={closePreview} />
        )}
        {revision && (
          <section className="space-y-4 rounded border bg-white p-5">
            <div>
              <h2 className="font-semibold">Composition documentaire V2</h2>
              <p className="text-sm text-slate-500">
                Compose un brouillon interne à partir des autorités approuvées.
                Cette action ne génère, n&apos;approuve et n&apos;envoie aucun
                PDF.
              </p>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Modèle documentaire">
                <select
                  value={documentForm.templateCode}
                  onChange={(event) =>
                    setDocumentForm({
                      ...documentForm,
                      templateCode: event.target.value,
                    })
                  }
                  className="w-full rounded border p-2"
                >
                  <option value="CORO_PROFESSIONAL">CORO Professional</option>
                  <option value="SENTINELLE_POPULATION_STANDALONE">
                    Sentinelle Population autonome
                  </option>
                  <option value="PROFESSIONAL_SERVICES">
                    Services professionnels
                  </option>
                  <option value="COMBINED_OFFER">Offre combinée</option>
                </select>
              </Field>
              <Field label="Langue">
                <select
                  value={documentForm.language}
                  onChange={(event) =>
                    setDocumentForm({
                      ...documentForm,
                      language: event.target.value as "FR" | "EN",
                    })
                  }
                  className="w-full rounded border p-2"
                >
                  <option value="FR">Français</option>
                  <option value="EN">English</option>
                </select>
              </Field>
            </div>
            <Field label="Paramètres de clauses gouvernés (JSON)">
              <textarea
                value={documentForm.clauseParameters}
                onChange={(event) =>
                  setDocumentForm({
                    ...documentForm,
                    clauseParameters: event.target.value,
                  })
                }
                rows={4}
                className="w-full rounded border p-2 font-mono text-xs"
              />
            </Field>
            <button
              disabled={busy}
              onClick={() => void composeDocument()}
              className="rounded bg-slate-900 px-4 py-2 text-white disabled:opacity-50"
            >
              Composer le brouillon documentaire
            </button>
            {composition && (
              <div className="space-y-3 rounded border p-4 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <strong>
                    {composition.issuanceReady
                      ? "Prêt pour émission"
                      : "Brouillon interne — exigences manquantes"}
                  </strong>
                  <span>
                    {composition.templateCode} · v{composition.sequence}
                  </span>
                </div>
                <p className="break-all font-mono text-xs">
                  SHA-256 : {composition.canonicalHash}
                </p>
                {composition.snapshot?.sections && (
                  <div>
                    <h3 className="font-medium">Sections incluses</h3>
                    <ul className="list-disc pl-5">
                      {composition.snapshot.sections.map((section) => (
                        <li key={section.code}>{section.code}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <div>
                  <h3 className="font-medium">Diagnostics de préparation</h3>
                  {composition.diagnostics.length ? (
                    <ul className="list-disc pl-5">
                      {composition.diagnostics.map((diagnostic) => (
                        <li
                          key={`${diagnostic.code}:${diagnostic.subject ?? ""}`}
                        >
                          {diagnostic.severity} · {diagnostic.code}
                          {diagnostic.subject ? ` · ${diagnostic.subject}` : ""}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p>Aucun diagnostic bloquant.</p>
                  )}
                </div>
                <p className="text-xs text-slate-500">
                  Historique immuable : {compositionHistory.length} capture(s).
                </p>
                <button
                  type="button"
                  disabled={
                    busy || composition.templateCode !== "CORO_PROFESSIONAL"
                  }
                  onClick={() => void generateGovernedPdf()}
                  className="rounded bg-emerald-700 px-4 py-2 text-white disabled:opacity-50"
                >
                  Générer l&apos;offre de service V2
                </button>
                <p className="text-xs text-slate-500">
                  Source explicite : snapshot #{composition.sequence} ·{" "}
                  {composition.readiness}. Un brouillon incomplet demeure marqué
                  comme document interne non transmissible.
                </p>
              </div>
            )}
          </section>
        )}
        <section className="space-y-4 rounded border bg-white p-5">
          <div>
            <h2 className="font-semibold">Finalisation interne</h2>
            <p className="text-sm text-slate-500">
              Le serveur demeure autoritatif pour toutes les validations.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            {revision?.status === "DRAFT" && (
              <button
                disabled={busy}
                onClick={() => void transition("request-review")}
                className="rounded bg-slate-900 px-4 py-2 text-white disabled:opacity-50"
              >
                Commencer la revue interne
              </button>
            )}
            {revision?.status === "INTERNAL_REVIEW" && (
              <button
                disabled={busy}
                onClick={() => void transition("mark-ready")}
                className="rounded bg-emerald-700 px-4 py-2 text-white disabled:opacity-50"
              >
                Marquer la proposition prête
              </button>
            )}
            {revision &&
              ["DRAFT", "INTERNAL_REVIEW", "READY"].includes(
                revision.status,
              ) && (
                <button
                  disabled={busy}
                  onClick={() => void generatePdf()}
                  className="rounded border px-4 py-2 disabled:opacity-50"
                >
                  Générer un PDF privé
                </button>
              )}
          </div>
          {documents.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-medium">Documents finalisés</h3>
              {documents.map((document) => (
                <button
                  key={document.id}
                  disabled={document.status !== "FINALIZED"}
                  onClick={() => void downloadPdf(document)}
                  className="block rounded border px-3 py-2 text-left hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Télécharger {document.fileName} · version{" "}
                  {document.artifactVersion} · {document.status}
                  {document.compositionSnapshotId
                    ? ` · PDF V2 ${document.compositionReadiness === "ISSUANCE_READY" ? "admissible" : "brouillon interne"} · snapshot ${document.compositionSnapshotId.slice(0, 8)}`
                    : " · PDF historique v3"}
                </button>
              ))}
            </div>
          )}
        </section>
      </main>
    </AppLayout>
  );
}
function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="space-y-1 text-sm font-medium">
      <span>{label}</span>
      {children}
    </label>
  );
}
