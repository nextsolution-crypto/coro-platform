"use client";
import { use, useEffect, useState } from "react";
import Link from "next/link";
import AppLayout from "@/components/layout/AppLayout";
import api from "@/lib/api";
import { CustomerSafeReview } from "../../configurator/CustomerSafeReview";
import type { CustomerSafeProjection } from "../../configurator/configurator-types";

type Detail = {
  id: string;
  reference: string;
  title: string;
  revisions: Array<{
    id: string;
    revisionNumber: number;
    status: string;
    lockVersion: number;
    documents: Array<{ id: string; status: string; fileName: string }>;
  }>;
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
  useEffect(() => {
    api
      .get(`/admin/v1/commercial/proposals/${proposalId}`)
      .then(({ data }) => {
        setDetail(data);
        const revision = data.revisions[0];
        if (revision)
          return api.get(
            `/admin/v1/commercial/proposals/${proposalId}/revisions/${revision.id}/customer-preview`,
          );
      })
      .then((response) => response && setPreview(response.data))
      .catch(() => setMessage("Impossible de charger la proposition."));
  }, [proposalId]);
  const revision = detail?.revisions[0];
  async function generatePdf() {
    if (!revision) return;
    await api.post(
      `/admin/v1/commercial/proposals/${proposalId}/revisions/${revision.id}/generate-pdf`,
      { language: "FR", idempotencyKey: crypto.randomUUID() },
    );
    setMessage("PDF customer-safe généré.");
  }
  return (
    <AppLayout>
      <main className="mx-auto max-w-6xl space-y-5 p-6">
        <Link href="/admin/commercial/proposals" className="text-sm underline">
          ← Propositions
        </Link>
        <header>
          <p className="text-sm text-emerald-700">Commercial</p>
          <h1 className="text-3xl font-semibold">
            {detail?.reference ?? "Proposition"}
          </h1>
          <p>
            {detail?.title} · {revision?.status} · v{revision?.revisionNumber}
          </p>
        </header>
        {message && (
          <p role="status" className="rounded border p-3">
            {message}
          </p>
        )}
        {preview && <CustomerSafeReview preview={preview} />}
        <section className="rounded border bg-white p-5">
          <h2 className="font-semibold">Actions internes</h2>
          <p className="text-sm text-slate-500">
            Les contrôles de cycle de vie restent autoritatifs côté serveur.
          </p>
          <button
            className="mt-3 rounded bg-slate-900 px-4 py-2 text-white"
            onClick={() => void generatePdf()}
          >
            Générer le PDF privé
          </button>
        </section>
      </main>
    </AppLayout>
  );
}
