"use client";

import {
  use,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import Link from "next/link";
import AppLayout from "@/components/layout/AppLayout";
import api from "@/lib/api";
import { CustomerSafeReview } from "../../configurator/CustomerSafeReview";
import type { CustomerSafeProjection } from "../../configurator/configurator-types";
import {
  applicableApprovedClauses,
  approvedContentForLines,
  CLAUSE_PARAMETER_LABELS,
  hasVerifiedIssuer,
  missingRequiredClauseParameters,
  typedClauseParameters,
} from "./proposal-document-workspace.mjs";

type ParameterDefinition = {
  key: string;
  type:
    | "DURATION_DAYS"
    | "DURATION_MONTHS"
    | "MONEY_MINOR"
    | "TEXT"
    | "JURISDICTION";
  required: boolean;
};
type ApprovedClause = {
  titleFR: string;
  titleEN: string | null;
  textFR: string;
  textEN: string | null;
  isRequired: boolean | null;
  effectiveAt: string | null;
  parameterSchema: ParameterDefinition[];
  commercialClause: { code: string; category: string };
  applicabilities: Array<{ scope: string }>;
};
type ContentBinding = {
  targetType: string;
  targetCode: string;
  labelFR: string;
  labelEN: string | null;
  commercialIntent: string;
  deliveryMaturity: string;
};
type CommercialContent = {
  code: string;
  versions: Array<{ id: string; status: string; bindings: ContentBinding[] }>;
};
type LegalIssuer = { versions: Array<{ status: string }> };
type Document = {
  id: string;
  status: string;
  fileName: string;
  artifactVersion: number;
  compositionSnapshotId: string | null;
  compositionReadiness: "INTERNAL_DRAFT" | "ISSUANCE_READY" | null;
};
type ProposalLine = {
  id: string;
  componentCode: string;
  name: string;
  metric: string | null;
  quantity: string | null;
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
  lines: ProposalLine[];
  documents: Document[];
};
type Detail = {
  reference: string;
  title: string;
  organization: { id: string; name: string } | null;
  prospect: { id: string; legalName: string } | null;
  revisions: Revision[];
};
type Diagnostic = {
  code: string;
  severity: "BLOCKING" | "WARNING";
  subject?: string;
};
type Composition = {
  id: string;
  templateCode: string;
  sequence: number;
  readiness: "INTERNAL_DRAFT" | "ISSUANCE_READY";
  issuanceReady: boolean;
  canonicalHash: string;
  diagnostics: Diagnostic[];
};

const statusLabels: Record<string, string> = {
  DRAFT: "Brouillon",
  INTERNAL_REVIEW: "Revue interne",
  READY: "Prête techniquement",
  SENT: "Envoyée",
  ACCEPTED: "Acceptée",
  REJECTED: "Refusée",
  CANCELLED: "Annulée",
  SUPERSEDED: "Remplacée",
};
const intentLabels: Record<string, string> = {
  INCLUDED: "Inclus",
  OPTIONAL: "Optionnel",
  AUTONOMOUS: "Autonome",
  TECHNICAL_DEPENDENCY: "Dépendance technique",
  NOT_INCLUDED: "Non inclus",
  FUTURE: "À venir",
};
const templates: Record<string, string> = {
  CORO_PROFESSIONAL: "CORO Professional",
  SENTINELLE_POPULATION_STANDALONE: "Sentinelle Population autonome",
  PROFESSIONAL_SERVICES: "Services professionnels",
  COMBINED_OFFER: "Offre combinée",
};
const diagnosticLabels: Record<string, string> = {
  MISSING_VERIFIED_LEGAL_ISSUER: "Émetteur légal vérifié manquant",
  MISSING_APPROVED_CONTENT: "Contenu commercial approuvé manquant",
  MISSING_REQUIRED_CLAUSE: "Clause obligatoire approuvée manquante",
  MISSING_CLAUSE_PARAMETER: "Paramètre de clause obligatoire manquant",
};
const apiError = (error: unknown) => {
  const status = (error as { response?: { status?: number } })?.response
    ?.status;
  if (status === 401 || status === 403)
    return "Accès non autorisé à cet espace commercial.";
  const message = (error as { response?: { data?: { message?: unknown } } })
    ?.response?.data?.message;
  return Array.isArray(message)
    ? message.join(" ")
    : typeof message === "string"
      ? message
      : "Action impossible. Vérifiez les données et réessayez.";
};
const money = (minor: string | null | undefined, currency = "CAD") =>
  minor == null
    ? "Non disponible"
    : new Intl.NumberFormat("fr-CA", { style: "currency", currency }).format(
        Number(minor) / 100,
      );

export default function ProposalDetailPage({
  params,
}: {
  params: Promise<{ proposalId: string }>;
}) {
  const { proposalId } = use(params);
  const [detail, setDetail] = useState<Detail>();
  const [economic, setEconomic] = useState<CustomerSafeProjection>();
  const [preview, setPreview] = useState<CustomerSafeProjection>();
  const [clauses, setClauses] = useState<ApprovedClause[]>([]);
  const [contents, setContents] = useState<CommercialContent[]>([]);
  const [issuers, setIssuers] = useState<LegalIssuer[]>([]);
  const [composition, setComposition] = useState<Composition>();
  const [history, setHistory] = useState<Composition[]>([]);
  const [state, setState] = useState<
    "LOADING" | "READY" | "ERROR" | "UNAUTHORIZED"
  >("LOADING");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [docForm, setDocForm] = useState({
    templateCode: "CORO_PROFESSIONAL",
    language: "FR" as "FR" | "EN",
    clauseParameters: {} as Record<string, string>,
  });
  const [form, setForm] = useState({
    validFrom: "",
    validUntil: "",
    contextFR: "",
    contextEN: "",
    termsFR: "",
    termsEN: "",
  });
  const revision = detail?.revisions[0];

  const load = useCallback(async () => {
    setState("LOADING");
    setMessage("");
    try {
      const response = await api.get(
        `/admin/v1/commercial/proposals/${proposalId}`,
      );
      const next = response.data as Detail;
      const current = next.revisions[0];
      setDetail(next);
      if (!current) {
        setState("READY");
        return;
      }
      const [
        historyResult,
        clauseResult,
        contentResult,
        issuerResult,
        previewResult,
      ] = await Promise.all([
        api.get(
          `/admin/v1/commercial/proposals/${proposalId}/revisions/${current.id}/document-compositions`,
        ),
        api.get("/admin/v1/commercial/clauses/approved-projection"),
        api.get("/admin/v1/commercial/content"),
        api.get("/admin/v1/commercial/legal-issuers"),
        api.get(
          `/admin/v1/commercial/proposals/${proposalId}/revisions/${current.id}/customer-preview`,
        ),
      ]);
      const items = historyResult.data as Composition[];
      setHistory(items);
      setClauses(clauseResult.data);
      setContents(contentResult.data);
      setIssuers(issuerResult.data);
      setEconomic(previewResult.data);
      if (items[0]) {
        const snapshot = await api.get(
          `/admin/v1/commercial/proposals/${proposalId}/revisions/${current.id}/document-compositions/${items[0].id}`,
        );
        setComposition(snapshot.data);
      } else setComposition(undefined);
      setForm({
        validFrom: current.validFrom?.slice(0, 10) ?? "",
        validUntil: current.validUntil?.slice(0, 10) ?? "",
        contextFR: current.contextFR ?? "",
        contextEN: current.contextEN ?? "",
        termsFR: current.termsFR ?? "",
        termsEN: current.termsEN ?? "",
      });
      setState("READY");
    } catch (error) {
      const status = (error as { response?: { status?: number } })?.response
        ?.status;
      setState(status === 401 || status === 403 ? "UNAUTHORIZED" : "ERROR");
      setMessage(apiError(error));
    }
  }, [proposalId]);
  useEffect(() => {
    const id = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(id);
  }, [load]);

  const applicableClauses = useMemo(
    () => applicableApprovedClauses(clauses, docForm.templateCode, new Date()),
    [clauses, docForm.templateCode],
  );
  const contentLines = useMemo(
    () => approvedContentForLines(contents, revision?.lines ?? []),
    [contents, revision?.lines],
  );
  const missingParameters = missingRequiredClauseParameters(
    applicableClauses,
    docForm.clauseParameters,
  );
  const issuerReady = hasVerifiedIssuer(issuers);
  const contentReady =
    contentLines.length > 0 &&
    contentLines.every((item) => item.bindings.length > 0);
  const clausesReady =
    applicableClauses.length > 0 && missingParameters.length === 0;
  const customer =
    detail?.organization?.name ??
    detail?.prospect?.legalName ??
    "Destinataire non défini";

  async function execute(action: () => Promise<void>, success: string) {
    setBusy(true);
    setMessage("");
    try {
      await action();
      await load();
      setMessage(success);
    } catch (error) {
      setMessage(apiError(error));
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
    }, "Informations générales enregistrées.");
  }
  function transition(path: "request-review" | "mark-ready") {
    if (!revision) return;
    return execute(
      async () => {
        await api.post(
          `/admin/v1/commercial/proposals/${proposalId}/revisions/${revision.id}/${path}`,
          {
            lockVersion: revision.lockVersion,
            reason:
              path === "mark-ready"
                ? "Validation finale par le fondateur"
                : "Revue interne par le fondateur",
          },
        );
      },
      path === "mark-ready"
        ? "Proposition marquée prête techniquement."
        : "Revue interne commencée.",
    );
  }
  function compose() {
    if (!revision) return;
    if (missingParameters.length) {
      setMessage(
        "Renseignez les paramètres obligatoires avant de composer le document.",
      );
      return;
    }
    return execute(async () => {
      await api.post(
        `/admin/v1/commercial/proposals/${proposalId}/revisions/${revision.id}/document-compositions`,
        {
          templateCode: docForm.templateCode,
          language: docForm.language,
          clauseParameters: typedClauseParameters(
            applicableClauses,
            docForm.clauseParameters,
          ),
        },
      );
    }, "Composition documentaire immuable créée.");
  }
  function generateV2() {
    if (!revision || !composition) return;
    return execute(async () => {
      await api.post(
        `/admin/v1/commercial/proposals/${proposalId}/revisions/${revision.id}/document-compositions/${composition.id}/generate-pdf-v2`,
        { idempotencyKey: crypto.randomUUID() },
      );
    }, "PDF V2 gouverné généré dans le stockage privé.");
  }
  function generateHistorical() {
    if (!revision) return;
    return execute(async () => {
      await api.post(
        `/admin/v1/commercial/proposals/${proposalId}/revisions/${revision.id}/generate-pdf`,
        {
          language: revision.recipientPreferredLanguage,
          idempotencyKey: crypto.randomUUID(),
        },
      );
    }, "PDF historique V3 généré dans le stockage privé.");
  }
  async function download(document: Document) {
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
      setMessage(apiError(error));
    }
  }

  if (state === "LOADING")
    return (
      <AppLayout>
        <StatePanel
          title="Chargement de l’espace documentaire"
          detail="Les autorités commerciales sont vérifiées sans modifier la proposition."
        />
      </AppLayout>
    );
  if (state !== "READY")
    return (
      <AppLayout>
        <StatePanel
          title={
            state === "UNAUTHORIZED"
              ? "Accès refusé"
              : "Impossible de charger la proposition"
          }
          detail={message}
          action={
            <button
              type="button"
              onClick={() => void load()}
              className="rounded bg-slate-900 px-4 py-2 text-white"
            >
              Réessayer
            </button>
          }
        />
      </AppLayout>
    );

  return (
    <AppLayout>
      <main className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
        <nav aria-label="Fil d’Ariane" className="flex flex-wrap gap-2 text-sm">
          <Link href="/admin/commercial" className="underline">
            Parcours commercial
          </Link>
          <span>›</span>
          <Link href="/admin/commercial/proposals" className="underline">
            Propositions
          </Link>
          <span>›</span>
          <span aria-current="page">{detail?.reference}</span>
        </nav>
        <header className="rounded-2xl bg-slate-950 p-6 text-white">
          <p className="text-sm font-medium text-emerald-300">
            Espace documentaire gouverné
          </p>
          <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-semibold">{detail?.reference}</h1>
              <p className="mt-1 text-slate-200">
                {customer} · {detail?.title}
              </p>
            </div>
            <Badge ok={composition?.issuanceReady === true}>
              {composition?.issuanceReady
                ? "Composition admissible"
                : "Préparation requise"}
            </Badge>
          </div>
          <p className="mt-4 text-sm text-slate-300">
            Statut commercial :{" "}
            {statusLabels[revision?.status ?? ""] ?? revision?.status} ·
            Révision {revision?.revisionNumber}
          </p>
        </header>
        {message && (
          <p role="status" className="rounded-lg border bg-white p-3">
            {message}
          </p>
        )}
        <section className="rounded-xl border bg-white p-5">
          <h2 className="text-xl font-semibold">Préparation du document</h2>
          <p className="mt-1 text-sm text-slate-600">
            Ces indicateurs proviennent des autorités réelles; ouvrir une
            section ne la complète pas.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Readiness label="Émetteur légal" ready={issuerReady} />
            <Readiness label="Contenu produit" ready={contentReady} />
            <Readiness label="Clauses applicables" ready={clausesReady} />
            <Readiness label="Snapshot immuable" ready={Boolean(composition)} />
          </div>
        </section>

        <Section
          number="1"
          title="Informations générales"
          description="Destinataire, langue, validité et contexte autorisés."
          ready={Boolean(revision && issuerReady)}
        >
          <dl className="grid gap-3 rounded-lg bg-slate-50 p-4 sm:grid-cols-3">
            <Fact label="Destinataire" value={customer} />
            <Fact
              label="Référence"
              value={`${detail?.reference} · v${revision?.revisionNumber}`}
            />
            <Fact
              label="Langue"
              value={
                revision?.recipientPreferredLanguage === "EN"
                  ? "English"
                  : "Français"
              }
            />
          </dl>
          {!issuerReady && (
            <Blocker
              title="Émetteur légal vérifié manquant."
              href="/admin/commercial/legal-issuer"
              label="Configurer l’émetteur légal"
            />
          )}
          {revision?.status === "DRAFT" ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Début de validité">
                <input
                  type="date"
                  value={form.validFrom}
                  onChange={(event) =>
                    setForm({ ...form, validFrom: event.target.value })
                  }
                  className="w-full rounded border p-2"
                />
              </Field>
              <Field label="Fin de validité">
                <input
                  type="date"
                  value={form.validUntil}
                  onChange={(event) =>
                    setForm({ ...form, validUntil: event.target.value })
                  }
                  className="w-full rounded border p-2"
                />
              </Field>
              <Field label="Contexte client (FR)">
                <textarea
                  value={form.contextFR}
                  onChange={(event) =>
                    setForm({ ...form, contextFR: event.target.value })
                  }
                  className="min-h-28 w-full rounded border p-2"
                />
              </Field>
              <Field label="Customer context (EN)">
                <textarea
                  value={form.contextEN}
                  onChange={(event) =>
                    setForm({ ...form, contextEN: event.target.value })
                  }
                  className="min-h-28 w-full rounded border p-2"
                />
              </Field>
              <Field label="Conditions autorisées (FR)">
                <textarea
                  value={form.termsFR}
                  onChange={(event) =>
                    setForm({ ...form, termsFR: event.target.value })
                  }
                  className="min-h-28 w-full rounded border p-2"
                />
              </Field>
              <Field label="Authorized terms (EN)">
                <textarea
                  value={form.termsEN}
                  onChange={(event) =>
                    setForm({ ...form, termsEN: event.target.value })
                  }
                  className="min-h-28 w-full rounded border p-2"
                />
              </Field>
              <button
                disabled={busy}
                onClick={() => void save()}
                className="rounded bg-slate-900 px-4 py-2 text-white disabled:opacity-50 sm:col-span-2 sm:w-fit"
              >
                Enregistrer les informations générales
              </button>
            </div>
          ) : (
            <p className="rounded bg-slate-50 p-3 text-sm">
              Cette révision est immuable; les informations sont en lecture
              seule.
            </p>
          )}
        </Section>

        <Section
          number="2"
          title="Solution et prestations"
          description="Contenu approuvé relié aux lignes économiques immuables."
          ready={contentReady}
        >
          {!contentReady && (
            <Blocker
              title="Un contenu commercial approuvé manque pour une ou plusieurs lignes."
              href="/admin/commercial/content"
              label="Administrer le contenu commercial"
            />
          )}
          <div className="grid gap-3 md:grid-cols-2">
            {contentLines.map(({ line, bindings }) => (
              <article key={line.id} className="rounded-lg border p-4">
                <h3 className="font-semibold">{line.name}</h3>
                <p className="text-sm text-slate-600">
                  Quantité : {line.quantity ?? "Non applicable"}{" "}
                  {line.metric ?? ""}
                </p>
                {bindings.length ? (
                  bindings.map((binding) => (
                    <div
                      key={`${binding.targetCode}:${binding.commercialIntent}`}
                      className="mt-3 rounded bg-slate-50 p-3 text-sm"
                    >
                      <p className="font-medium">{binding.labelFR}</p>
                      <p>
                        {intentLabels[binding.commercialIntent] ??
                          binding.commercialIntent}{" "}
                        ·{" "}
                        {binding.deliveryMaturity === "FUTURE" ||
                        binding.commercialIntent === "FUTURE"
                          ? "À venir — non disponible"
                          : binding.deliveryMaturity}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="mt-3 text-sm text-amber-800">
                    Description approuvée indisponible; aucune promesse produit
                    n’est affichée.
                  </p>
                )}
              </article>
            ))}
          </div>
        </Section>

        <Section
          number="3"
          title="Investissement"
          description="Projection client du calcul officiel; aucune donnée de coût interne."
          ready={Boolean(economic?.totals.firstYearMinor)}
        >
          {economic ? (
            <>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Money
                  label="Frais ponctuels"
                  value={money(economic.totals.oneTimeMinor, economic.currency)}
                />
                <Money
                  label="Récurrent annuel"
                  value={money(
                    economic.totals.annualRecurringMinor,
                    economic.currency,
                  )}
                />
                {economic.totals.monthlyRecurringMinor &&
                Number(economic.totals.monthlyRecurringMinor) > 0 ? (
                  <Money
                    label="Récurrent mensuel"
                    value={money(
                      economic.totals.monthlyRecurringMinor,
                      economic.currency,
                    )}
                  />
                ) : null}
                <Money
                  label="Engagement première année"
                  value={money(
                    economic.totals.firstYearMinor,
                    economic.currency,
                  )}
                  prominent
                />
              </div>
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="p-2">Élément</th>
                      <th className="p-2">Quantité</th>
                      <th className="p-2">Cadence</th>
                      <th className="p-2">Montant</th>
                    </tr>
                  </thead>
                  <tbody>
                    {economic.lines.map((line, index) => (
                      <tr key={`${line.labelFr}:${index}`} className="border-b">
                        <td className="p-2">{line.labelFr}</td>
                        <td className="p-2">
                          {line.quantity ?? "—"} {line.quantityLabelFr ?? ""}
                        </td>
                        <td className="p-2">{line.cadenceFr}</td>
                        <td className="p-2">
                          {money(
                            line.offeredExtendedAmountMinor,
                            economic.currency,
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => setPreview(economic)}
                  className="rounded border px-4 py-2"
                >
                  Prévisualiser le contenu client
                </button>
                <Link
                  href="/admin/commercial/configurator"
                  className="rounded border px-4 py-2"
                >
                  Créer un nouveau scénario
                </Link>
              </div>
            </>
          ) : (
            <Blocker title="Projection économique client indisponible." />
          )}
        </Section>

        <Section
          number="4"
          title="Conditions commerciales"
          description="Clauses approuvées et paramètres autorisés; aucun JSON ni texte légal arbitraire."
          ready={clausesReady}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Modèle documentaire">
              <select
                value={docForm.templateCode}
                onChange={(event) =>
                  setDocForm({
                    ...docForm,
                    templateCode: event.target.value,
                    clauseParameters: {},
                  })
                }
                className="w-full rounded border p-2"
              >
                {Object.entries(templates).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Langue du document">
              <select
                value={docForm.language}
                onChange={(event) =>
                  setDocForm({
                    ...docForm,
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
          {!applicableClauses.length ? (
            <Blocker
              title="Aucune clause approuvée et applicable."
              href="/admin/commercial/clauses"
              label="Administrer les clauses"
            />
          ) : (
            <div className="space-y-4">
              {applicableClauses.map((clause) => (
                <article
                  key={clause.commercialClause.code}
                  className="rounded-lg border p-4"
                >
                  <div className="flex justify-between gap-2">
                    <h3 className="font-semibold">
                      {docForm.language === "EN"
                        ? (clause.titleEN ?? clause.titleFR)
                        : clause.titleFR}
                    </h3>
                    <span className="text-xs uppercase text-slate-500">
                      {clause.isRequired ? "Obligatoire" : "Optionnelle"}
                    </span>
                  </div>
                  <p className="mt-2 whitespace-pre-line text-sm text-slate-700">
                    {docForm.language === "EN"
                      ? (clause.textEN ?? clause.textFR)
                      : clause.textFR}
                  </p>
                  {clause.parameterSchema.length > 0 && (
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      {clause.parameterSchema.map((parameter) => (
                        <ClauseInput
                          key={parameter.key}
                          definition={parameter}
                          value={docForm.clauseParameters[parameter.key] ?? ""}
                          onChange={(value) =>
                            setDocForm({
                              ...docForm,
                              clauseParameters: {
                                ...docForm.clauseParameters,
                                [parameter.key]: value,
                              },
                            })
                          }
                        />
                      ))}
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </Section>

        <Section
          number="5"
          title="Aperçu et revue"
          description="Composition explicite, PDF V2 gouverné et lifecycle existant."
          ready={composition?.issuanceReady === true}
        >
          <div className="grid gap-4 lg:grid-cols-2">
            <article className="rounded-lg border p-4">
              <h3 className="font-semibold">Composer un snapshot immuable</h3>
              <p className="mt-1 text-sm text-slate-600">
                La composition ne se déclenche jamais automatiquement.
              </p>
              {missingParameters.length > 0 && (
                <p className="mt-3 text-sm text-amber-800">
                  Paramètres requis :{" "}
                  {missingParameters
                    .map(
                      (key) =>
                        CLAUSE_PARAMETER_LABELS[
                          key as keyof typeof CLAUSE_PARAMETER_LABELS
                        ] ?? key,
                    )
                    .join(", ")}
                  .
                </p>
              )}
              <button
                disabled={
                  busy ||
                  !issuerReady ||
                  !contentReady ||
                  !applicableClauses.length ||
                  missingParameters.length > 0
                }
                onClick={() => void compose()}
                className="mt-4 rounded bg-slate-900 px-4 py-2 text-white disabled:opacity-50"
              >
                Composer le document
              </button>
            </article>
            <article className="rounded-lg border p-4">
              <h3 className="font-semibold">PDF V2 gouverné</h3>
              {composition ? (
                <>
                  <p className="mt-1 text-sm">
                    Snapshot #{composition.sequence} ·{" "}
                    {composition.issuanceReady
                      ? "Admissible à l’émission documentaire"
                      : "Brouillon interne non transmissible"}
                  </p>
                  <p className="mt-2 text-xs text-slate-500">
                    Le snapshot reste immuable. Si les autorités approuvées ont
                    évolué depuis sa création, composez explicitement un nouveau
                    snapshot plutôt que de remplacer celui-ci.
                  </p>
                  <button
                    disabled={
                      busy || composition.templateCode !== "CORO_PROFESSIONAL"
                    }
                    onClick={() => void generateV2()}
                    className="mt-4 rounded bg-emerald-700 px-4 py-2 text-white disabled:opacity-50"
                  >
                    Générer le PDF V2
                  </button>
                </>
              ) : (
                <p className="mt-1 text-sm text-slate-600">
                  Aucune composition sélectionnée.
                </p>
              )}
            </article>
          </div>
          {composition && (
            <article className="rounded-lg bg-slate-50 p-4">
              <h3 className="font-semibold">Diagnostic documentaire</h3>
              {composition.diagnostics.length ? (
                <ul className="mt-2 list-disc pl-5 text-sm">
                  {composition.diagnostics.map((item) => (
                    <li key={`${item.code}:${item.subject ?? ""}`}>
                      {item.severity === "BLOCKING" ? "Bloquant" : "Attention"}{" "}
                      : {diagnosticLabels[item.code] ?? item.code}
                      {item.subject ? ` — ${item.subject}` : ""}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-sm">
                  Aucun diagnostic bloquant. Cela ne vaut ni approbation ni
                  envoi.
                </p>
              )}
            </article>
          )}
          {revision && (
            <article className="rounded-lg border p-4">
              <h3 className="font-semibold">Revue interne existante</h3>
              <p className="mt-1 text-sm text-slate-600">
                Ces actions conservent le lifecycle actuel et ne constituent pas
                les futurs gates E01.
              </p>
              <div className="mt-3 flex gap-3">
                {revision.status === "DRAFT" && (
                  <button
                    disabled={busy}
                    onClick={() => void transition("request-review")}
                    className="rounded border px-4 py-2"
                  >
                    Commencer la revue interne
                  </button>
                )}
                {revision.status === "INTERNAL_REVIEW" && (
                  <button
                    disabled={busy}
                    onClick={() => void transition("mark-ready")}
                    className="rounded border px-4 py-2"
                  >
                    Marquer prête techniquement
                  </button>
                )}
              </div>
            </article>
          )}
          <details className="rounded-lg border p-4">
            <summary className="cursor-pointer font-semibold">
              Documents historiques et détails avancés
            </summary>
            <p className="mt-2 text-sm text-slate-600">
              Les PDF historiques V3 restent séparés des PDF V2 gouvernés.
            </p>
            <button
              disabled={
                busy ||
                !revision ||
                !["DRAFT", "INTERNAL_REVIEW", "READY"].includes(revision.status)
              }
              onClick={() => void generateHistorical()}
              className="mt-3 rounded border px-3 py-2 text-sm disabled:opacity-50"
            >
              Générer un PDF historique V3
            </button>
            <div className="mt-4 space-y-2">
              {revision?.documents.length ? (
                revision.documents.map((document) => (
                  <button
                    key={document.id}
                    disabled={document.status !== "FINALIZED"}
                    onClick={() => void download(document)}
                    className="block w-full rounded border p-3 text-left text-sm disabled:opacity-50"
                  >
                    <strong>{document.fileName}</strong>
                    <span className="block text-slate-600">
                      {document.compositionSnapshotId
                        ? `PDF V2 · ${document.compositionReadiness === "ISSUANCE_READY" ? "admissible" : "brouillon interne"}`
                        : "PDF historique V3"}{" "}
                      · {document.status}
                    </span>
                  </button>
                ))
              ) : (
                <p className="text-sm">Aucun document généré.</p>
              )}
            </div>
            <p className="mt-4 break-all text-xs text-slate-500">
              Historique C01 : {history.length} composition(s)
              {composition ? ` · SHA-256 ${composition.canonicalHash}` : ""}
            </p>
          </details>
        </Section>
        <nav
          aria-label="Navigation contextuelle"
          className="flex flex-wrap gap-3 rounded-xl border bg-white p-4 text-sm"
        >
          {detail && (detail.organization || detail.prospect) && (
            <Link
              className="underline"
              href={
                detail.organization
                  ? `/admin/commercial/dossier/ORGANIZATION/${detail.organization.id}`
                  : `/admin/commercial/dossier/PROSPECT/${detail.prospect!.id}`
              }
            >
              Dossier commercial
            </Link>
          )}
          <Link className="underline" href="/admin/commercial/configurator">
            Configurateur
          </Link>
          <Link className="underline" href="/admin/commercial/content">
            Contenu commercial
          </Link>
          <Link className="underline" href="/admin/commercial/legal-issuer">
            Émetteur légal
          </Link>
          <Link className="underline" href="/admin/commercial/clauses">
            Clauses
          </Link>
        </nav>
        {preview && (
          <CustomerSafeReview
            preview={preview}
            onClose={() => setPreview(undefined)}
          />
        )}
      </main>
    </AppLayout>
  );
}

function Section({
  number,
  title,
  description,
  ready,
  children,
}: {
  number: string;
  title: string;
  description: string;
  ready: boolean;
  children: ReactNode;
}) {
  return (
    <section
      aria-labelledby={`section-${number}`}
      className="space-y-5 rounded-xl border bg-white p-5 sm:p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-emerald-700">Étape {number}</p>
          <h2 id={`section-${number}`} className="text-xl font-semibold">
            {title}
          </h2>
          <p className="mt-1 max-w-3xl text-sm text-slate-600">{description}</p>
        </div>
        <Badge ok={ready}>{ready ? "Prêt" : "À compléter"}</Badge>
      </div>
      {children}
    </section>
  );
}
function Badge({ ok, children }: { ok: boolean; children: ReactNode }) {
  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-semibold ${ok ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-900"}`}
    >
      {children}
    </span>
  );
}
function Readiness({ label, ready }: { label: string; ready: boolean }) {
  return (
    <div className="rounded-lg border p-3">
      <p className="text-sm text-slate-600">{label}</p>
      <p
        className={`font-semibold ${ready ? "text-emerald-700" : "text-amber-800"}`}
      >
        {ready ? "Disponible" : "Action requise"}
      </p>
    </div>
  );
}
function Blocker({
  title,
  href,
  label,
}: {
  title: string;
  href?: string;
  label?: string;
}) {
  return (
    <div
      role="alert"
      className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950"
    >
      <p className="font-medium">{title}</p>
      {href && (
        <Link href={href} className="mt-2 inline-block underline">
          {label}
        </Link>
      )}
    </div>
  );
}
function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase text-slate-500">{label}</dt>
      <dd className="mt-1 font-medium">{value}</dd>
    </div>
  );
}
function Money({
  label,
  value,
  prominent = false,
}: {
  label: string;
  value: string;
  prominent?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border p-4 ${prominent ? "border-emerald-400 bg-emerald-50" : ""}`}
    >
      <p className="text-sm text-slate-600">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
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
function ClauseInput({
  definition,
  value,
  onChange,
}: {
  definition: ParameterDefinition;
  value: string;
  onChange: (value: string) => void;
}) {
  const numeric = ["DURATION_DAYS", "DURATION_MONTHS", "MONEY_MINOR"].includes(
    definition.type,
  );
  const suffix =
    definition.type === "DURATION_DAYS"
      ? "jours"
      : definition.type === "DURATION_MONTHS"
        ? "mois"
        : definition.type === "MONEY_MINOR"
          ? "cents CAD"
          : "";
  return (
    <Field
      label={`${CLAUSE_PARAMETER_LABELS[definition.key as keyof typeof CLAUSE_PARAMETER_LABELS] ?? definition.key}${definition.required ? " *" : " (optionnel)"}`}
    >
      <div className="flex items-center gap-2">
        <input
          type={numeric ? "number" : "text"}
          min={numeric ? 0 : undefined}
          step={numeric ? 1 : undefined}
          required={definition.required}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="w-full rounded border p-2"
        />
        {suffix && (
          <span className="whitespace-nowrap text-xs text-slate-500">
            {suffix}
          </span>
        )}
      </div>
    </Field>
  );
}
function StatePanel({
  title,
  detail,
  action,
}: {
  title: string;
  detail: string;
  action?: ReactNode;
}) {
  return (
    <main className="mx-auto max-w-2xl p-6">
      <section className="rounded-xl border bg-white p-6">
        <h1 className="text-xl font-semibold">{title}</h1>
        <p className="mt-2 text-slate-600">{detail}</p>
        {action && <div className="mt-4">{action}</div>}
      </section>
    </main>
  );
}
