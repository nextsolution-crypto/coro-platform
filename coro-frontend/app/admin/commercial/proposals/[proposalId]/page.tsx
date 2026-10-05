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
  revisions: Revision[];
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
    setForm({
      validFrom: revision.validFrom?.slice(0, 10) ?? "",
      validUntil: revision.validUntil?.slice(0, 10) ?? "",
      contextFR: revision.contextFR ?? "",
      contextEN: revision.contextEN ?? "",
      termsFR: revision.termsFR ?? "",
      termsEN: revision.termsEN ?? "",
    });
    const response = await api.get(
      `/admin/v1/commercial/proposals/${proposalId}/revisions/${revision.id}/customer-preview`,
    );
    setPreview(response.data);
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
  const documents =
    revision?.documents.filter((item) => item.status === "FINALIZED") ?? [];
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
        {preview && <CustomerSafeReview preview={preview} />}
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
                  onClick={() => void downloadPdf(document)}
                  className="block rounded border px-3 py-2 text-left hover:bg-slate-50"
                >
                  Télécharger {document.fileName} · version{" "}
                  {document.artifactVersion}
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
