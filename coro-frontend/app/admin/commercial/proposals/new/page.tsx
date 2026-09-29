"use client";

import { useMemo, useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import api from "@/lib/api";

const steps = [
  "Target",
  "PriceBook",
  "Capabilities",
  "Quantities",
  "Population Complexity",
  "Pricing",
  "Adjustments",
  "Terms",
  "Exclusivity",
  "Commitments",
  "Value Analysis",
  "Review",
  "PDF",
  "Send",
  "Acceptance",
  "Contract",
];
type Totals = {
  oneTimeTotalMinor: string | null;
  recurringMonthlyCadenceMinor: string | null;
  recurringAnnualCadenceMinor: string | null;
  estimatedUsageTotalMinor: string | null;
  firstYearCommitmentMinor: string | null;
};
type Summary = {
  oneTime: string;
  monthly: string;
  annual: string;
  usage: string;
  firstYear: string;
};
const cad = (minor: string | null | undefined) =>
  minor == null
    ? "—"
    : `${BigInt(minor) / BigInt(100)},${(BigInt(minor) % BigInt(100)).toString().padStart(2, "0")} $ CAD`;

export default function NewProposalPage() {
  const [step, setStep] = useState(0),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const [target, setTarget] = useState<"ORGANIZATION" | "PROSPECT">(
      "ORGANIZATION",
    ),
    [targetId, setTargetId] = useState(""),
    [reference, setReference] = useState(""),
    [title, setTitle] = useState("");
  const [proposalId, setProposalId] = useState(""),
    [revisionId, setRevisionId] = useState(""),
    [lockVersion, setLockVersion] = useState(0),
    [documentId, setDocumentId] = useState(""),
    [contractId, setContractId] = useState("");
  const [pdfIdempotencyKey, setPdfIdempotencyKey] = useState(() =>
    crypto.randomUUID(),
  );
  const [priceBookVersionId, setPriceBookVersionId] = useState(""),
    [relationship, setRelationship] = useState<"DIRECT" | "PARTNER">("DIRECT"),
    [recipient, setRecipient] = useState("");
  const [capabilityId, setCapabilityId] = useState(""),
    [componentName, setComponentName] = useState("Compliance Operations"),
    [quantity, setQuantity] = useState("1"),
    [amountMinor, setAmountMinor] = useState("");
  const [pricingModel, setPricingModel] = useState<
      "PER_SEAT" | "PER_SITE" | "FLAT" | "CUSTOM"
    >("PER_SEAT"),
    [discount, setDiscount] = useState(""),
    [context, setContext] = useState(""),
    [terms, setTerms] = useState("");
  const [internalUse, setInternalUse] = useState(false),
    [distributable, setDistributable] = useState(false),
    [distributionLimit, setDistributionLimit] = useState("");
  const [exclusivityFee, setExclusivityFee] = useState(""),
    [territory, setTerritory] = useState("Canada"),
    [sectors, setSectors] = useState("PUBLIC,INDUSTRIAL"),
    [commitmentSites, setCommitmentSites] = useState("");
  const [populationProfileId, setPopulationProfileId] = useState("");
  const [mandates, setMandates] = useState(""),
    [hours, setHours] = useState(""),
    [rateMinor, setRateMinor] = useState(""),
    [gainBasisPoints, setGainBasisPoints] = useState("");
  const [totals, setTotals] = useState<Totals>(),
    [reason, setReason] = useState("Validation commerciale"),
    [acceptedBy, setAcceptedBy] = useState(""),
    [contractReference, setContractReference] = useState("");
  const summary = useMemo<Summary>(
    () => ({
      oneTime: cad(totals?.oneTimeTotalMinor),
      monthly: cad(totals?.recurringMonthlyCadenceMinor),
      annual: cad(totals?.recurringAnnualCadenceMinor),
      usage: cad(totals?.estimatedUsageTotalMinor),
      firstYear: cad(totals?.firstYearCommitmentMinor),
    }),
    [totals],
  );
  async function run(action: () => Promise<void>) {
    setBusy(true);
    setMessage("");
    try {
      await action();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Action impossible");
    } finally {
      setBusy(false);
    }
  }
  const createProposal = () =>
    run(async () => {
      const { data } = await api.post("/admin/v1/commercial/proposals", {
        reference,
        title,
        [target === "ORGANIZATION" ? "organizationId" : "prospectId"]: targetId,
      });
      setProposalId(data.id);
      setStep(1);
    });
  const createRevision = () =>
    run(async () => {
      const { data } = await api.post(
        `/admin/v1/commercial/proposals/${proposalId}/revisions`,
        {
          sourcePriceBookVersionId: priceBookVersionId,
          relationship,
          preferredLanguage: "FR",
          recipientLegalName: recipient,
          recipientDisplayName: recipient,
          recipientCountry: "CA",
        },
      );
      setRevisionId(data.id);
      setLockVersion(data.lockVersion);
      setStep(2);
    });
  const configure = () =>
    run(async () => {
      const lines: Array<Record<string, unknown>> = [
        {
          source: "CUSTOM_COMPONENT",
          capabilityId,
          componentCode: "PRIMARY_CAPABILITY",
          componentNameFR: componentName,
          pricingModel,
          chargeType: pricingModel === "FLAT" ? "ONE_TIME" : "RECURRING",
          billingPeriod: pricingModel === "FLAT" ? undefined : "MONTH",
          metric:
            pricingModel === "PER_SITE"
              ? "SITE"
              : pricingModel === "PER_SEAT"
                ? "SEAT"
                : "FIXED",
          quantity: ["FLAT", "CUSTOM"].includes(pricingModel)
            ? undefined
            : quantity,
          quantityUnit: pricingModel === "PER_SITE" ? "SITE" : "SEAT",
          amountMinor,
          requestedStatus: pricingModel === "CUSTOM" ? "MANUAL" : "CALCULATED",
          internalUse,
          distributable,
          distributionLimit:
            distributable && distributionLimit ? distributionLimit : undefined,
          distributionMetric:
            distributable && distributionLimit ? "SITE" : undefined,
          justification: "Configuration commerciale explicite",
          displayOrder: 1,
          tiers: [],
          adjustments: [],
        },
      ];
      if (exclusivityFee)
        lines.push({
          source: "EXCLUSIVITY_FEE",
          componentCode: "EXCLUSIVITY_FEE",
          componentNameFR: "Frais d’exclusivité",
          pricingModel: "FLAT",
          chargeType: "ONE_TIME",
          metric: "FIXED",
          amountMinor: exclusivityFee,
          requestedStatus: "MANUAL",
          internalUse: false,
          distributable: false,
          justification: "Frais d’exclusivité explicitement accepté",
          displayOrder: 2,
          tiers: [],
          adjustments: [],
        });
      const { data } = await api.put(
        `/admin/v1/commercial/proposals/${proposalId}/revisions/${revisionId}/configure`,
        {
          contextFR: context,
          termsFR: terms,
          includeEstimatedUsageInFirstYear: false,
          inputs: [
            {
              code: "PROFESSIONALS",
              category: "QUANTITY",
              valueType: "INTEGER",
              integerValue: quantity,
              source: "DECLARED",
              labelFR: "Professionnels",
              unit: "SEAT",
              displayOrder: 1,
            },
          ],
          lines,
          globalAdjustments: discount
            ? [
                {
                  scope: "GLOBAL",
                  adjustmentType: "PERCENT_DISCOUNT",
                  discountBasisPoints: Number(discount),
                  justification: "Remise commerciale approuvée",
                  displayOrder: 1,
                },
              ]
            : [],
          exclusivities: exclusivityFee
            ? [
                {
                  territoryType: "ISO_COUNTRY",
                  territoryCode: "CA",
                  territoryLabel: territory,
                  startsAt: new Date().toISOString(),
                  hasEconomicImpact: true,
                  economicComponentCode: "EXCLUSIVITY_FEE",
                  sectors: sectors
                    .split(",")
                    .filter(Boolean)
                    .map((code) => ({
                      sectorCode: code.trim(),
                      sectorLabel: code.trim(),
                    })),
                  capabilityIds: capabilityId ? [capabilityId] : [],
                },
              ]
            : [],
          commitments: commitmentSites
            ? [
                {
                  type: "MINIMUM_SITES",
                  period: "YEAR",
                  quantity: commitmentSites,
                  description: `${commitmentSites} sites`,
                },
              ]
            : [],
        },
      );
      setTotals(data.totals);
      setLockVersion((value) => value + 1);
      setMessage("Snapshot recalculé côté serveur.");
    });
  const transition = (
    action: string,
    next: number,
    extra: Record<string, unknown> = {},
  ) =>
    run(async () => {
      const { data } = await api.post(
        `/admin/v1/commercial/proposals/${proposalId}/revisions/${revisionId}/${action}`,
        { reason, lockVersion, ...extra },
      );
      setLockVersion(data.lockVersion);
      setStep(next);
    });
  const generatePdf = () =>
    run(async () => {
      const { data } = await api.post(
        `/admin/v1/commercial/proposals/${proposalId}/revisions/${revisionId}/generate-pdf`,
        { language: "FR", idempotencyKey: pdfIdempotencyKey },
      );
      setDocumentId(data.id);
      setStep(13);
      setPdfIdempotencyKey(crypto.randomUUID());
      setMessage(`PDF privé finalisé · SHA-256 ${data.sha256}`);
    });
  const snapshotPopulation = () =>
    run(async () => {
      const { data } = await api.post(
        `/admin/v1/commercial/proposals/${proposalId}/revisions/${revisionId}/snapshot-population`,
        { facilityProfileId: populationProfileId },
      );
      setMessage(
        `Snapshot Population OBSERVED_SNAPSHOT: ${data.inputCodes.join(", ")}`,
      );
    });
  const saveValueAnalysis = () =>
    run(async () => {
      await api.put(
        `/admin/v1/commercial/proposals/${proposalId}/revisions/${revisionId}/value-analysis`,
        {
          mandatesPerYear: mandates,
          averageHoursPerMandate: hours,
          billableRateMinorPerHour: rateMinor,
          productivityGainBasisPoints: Number(gainBasisPoints),
          disclaimerFR:
            "Estimation indicative distincte du prix et fondée sur les hypothèses déclarées.",
        },
      );
      setMessage("Valeur estimée enregistrée séparément du prix.");
    });
  const createContract = () =>
    run(async () => {
      const { data } = await api.post(
        `/admin/v1/commercial/proposals/${proposalId}/revisions/${revisionId}/create-contract`,
        { reason, reference: contractReference, title },
      );
      setContractId(data.id);
      setMessage(`Contrat créé: ${data.id}`);
    });
  return (
    <AppLayout>
      <main className="mx-auto max-w-7xl p-6">
        <p className="text-sm font-semibold uppercase tracking-wider text-emerald-700">
          Commercial Configurator
        </p>
        <h1 className="text-3xl font-semibold">Nouvelle proposition</h1>
        <div className="mt-6 flex gap-2 overflow-x-auto pb-3">
          {steps.map((label, index) => (
            <button
              key={label}
              disabled={!proposalId || index > step + 1}
              onClick={() => setStep(index)}
              className={`whitespace-nowrap rounded-full px-3 py-2 text-xs ${index === step ? "bg-emerald-700 text-white" : index < step ? "bg-emerald-50 text-emerald-800" : "bg-slate-100 text-slate-500"}`}
            >
              {index + 1}. {label}
            </button>
          ))}
        </div>
        {message && (
          <p
            role="status"
            className="my-4 rounded border border-emerald-200 bg-emerald-50 p-3 text-sm"
          >
            {message}
          </p>
        )}
        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
          <section className="rounded-xl border bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold">{steps[step]}</h2>
            {step === 0 && (
              <div className="mt-5 grid gap-4">
                <div className="flex gap-3">
                  <button
                    onClick={() => setTarget("ORGANIZATION")}
                    className="rounded border p-3"
                  >
                    Organisation CORO
                  </button>
                  <button
                    onClick={() => setTarget("PROSPECT")}
                    className="rounded border p-3"
                  >
                    Prospect
                  </button>
                </div>
                <Field
                  label="Identifiant cible"
                  value={targetId}
                  set={setTargetId}
                />
                <Field label="Référence" value={reference} set={setReference} />
                <Field label="Titre" value={title} set={setTitle} />
                <Action
                  busy={busy}
                  label="Créer et continuer"
                  onClick={createProposal}
                />
              </div>
            )}
            {step === 1 && (
              <div className="mt-5 grid gap-4">
                <Field
                  label="PriceBookVersion ID"
                  value={priceBookVersionId}
                  set={setPriceBookVersionId}
                />
                <Field
                  label="Destinataire"
                  value={recipient}
                  set={setRecipient}
                />
                <label>
                  Relation
                  <select
                    value={relationship}
                    onChange={(event) =>
                      setRelationship(
                        event.target.value as "DIRECT" | "PARTNER",
                      )
                    }
                    className="mt-1 w-full rounded border p-3"
                  >
                    <option>DIRECT</option>
                    <option>PARTNER</option>
                  </select>
                </label>
                <Action
                  busy={busy}
                  label="Créer la révision"
                  onClick={createRevision}
                />
              </div>
            )}
            {step >= 2 && step <= 10 && (
              <div className="mt-5 grid gap-4">
                <p className="rounded bg-blue-50 p-4 text-sm">
                  DECLARED, OBSERVED_SNAPSHOT et MANUAL_ASSUMPTION restent
                  distincts. Aucun prix n’est calculé dans React.
                </p>
                <Field
                  label="Capability ID"
                  value={capabilityId}
                  set={setCapabilityId}
                />
                <Field
                  label="Solution proposée"
                  value={componentName}
                  set={setComponentName}
                />
                <Field
                  label="Quantité déclarée"
                  value={quantity}
                  set={setQuantity}
                />
                <Field
                  label="Montant catalogue (minor units CAD)"
                  value={amountMinor}
                  set={setAmountMinor}
                />
                <label>
                  Modèle
                  <select
                    value={pricingModel}
                    onChange={(event) =>
                      setPricingModel(event.target.value as typeof pricingModel)
                    }
                    className="mt-1 w-full rounded border p-3"
                  >
                    <option>PER_SEAT</option>
                    <option>PER_SITE</option>
                    <option>FLAT</option>
                    <option>CUSTOM</option>
                  </select>
                </label>
                <Field
                  label="Remise globale (basis points)"
                  value={discount}
                  set={setDiscount}
                />
                <Field
                  label="Contexte et besoins"
                  value={context}
                  set={setContext}
                />
                <Field label="Conditions" value={terms} set={setTerms} />
                {relationship === "PARTNER" && (
                  <div className="rounded border p-4">
                    <label>
                      <input
                        type="checkbox"
                        checked={internalUse}
                        onChange={(event) =>
                          setInternalUse(event.target.checked)
                        }
                      />{" "}
                      Usage interne Partner
                    </label>
                    <br />
                    <label>
                      <input
                        type="checkbox"
                        checked={distributable}
                        onChange={(event) =>
                          setDistributable(event.target.checked)
                        }
                      />{" "}
                      Distribuable
                    </label>
                    {distributable && (
                      <Field
                        label="Limite de distribution (sites)"
                        value={distributionLimit}
                        set={setDistributionLimit}
                      />
                    )}
                  </div>
                )}
                {step === 4 && (
                  <div className="rounded border border-blue-300 bg-blue-50 p-4">
                    <h3 className="font-semibold">
                      Copie explicite depuis Sentinelle Population
                    </h3>
                    <Field
                      label="RueFacilityProfile ID"
                      value={populationProfileId}
                      set={setPopulationProfileId}
                    />
                    <Action
                      busy={busy}
                      label="Créer le snapshot OBSERVED_SNAPSHOT"
                      onClick={snapshotPopulation}
                    />
                    <p className="mt-2 text-xs">
                      Copie ponctuelle en lecture seule; aucune liaison
                      dynamique avec Population.
                    </p>
                  </div>
                )}
                <Field
                  label="Frais d’exclusivité (minor units)"
                  value={exclusivityFee}
                  set={setExclusivityFee}
                />
                {exclusivityFee && (
                  <>
                    <Field
                      label="Territoire"
                      value={territory}
                      set={setTerritory}
                    />
                    <Field
                      label="Secteurs séparés par virgule"
                      value={sectors}
                      set={setSectors}
                    />
                  </>
                )}
                <Field
                  label="Engagement minimum de sites"
                  value={commitmentSites}
                  set={setCommitmentSites}
                />
                {step === 10 && (
                  <div className="rounded border border-amber-300 bg-amber-50 p-4">
                    <h3 className="font-semibold">
                      Valeur estimée — indépendante du prix
                    </h3>
                    <Field
                      label="Mandats par année"
                      value={mandates}
                      set={setMandates}
                    />
                    <Field
                      label="Heures moyennes par mandat"
                      value={hours}
                      set={setHours}
                    />
                    <Field
                      label="Taux facturable (minor units/heure)"
                      value={rateMinor}
                      set={setRateMinor}
                    />
                    <Field
                      label="Gain de productivité (basis points)"
                      value={gainBasisPoints}
                      set={setGainBasisPoints}
                    />
                    <Action
                      busy={busy}
                      label="Enregistrer la Value Analysis"
                      onClick={saveValueAnalysis}
                    />
                  </div>
                )}
                <div className="flex gap-3">
                  <Action
                    busy={busy}
                    label="Enregistrer et recalculer côté serveur"
                    onClick={configure}
                  />
                  <button
                    onClick={() => setStep(Math.min(11, step + 1))}
                    className="rounded border px-4 py-2"
                  >
                    Continuer
                  </button>
                </div>
              </div>
            )}
            {step >= 11 && (
              <div className="mt-6 space-y-4">
                <CommercialSummary recipient={recipient} summary={summary} />
                {step === 11 && (
                  <Action
                    busy={busy}
                    label="Marquer READY"
                    onClick={() => transition("mark-ready", 12)}
                  />
                )}{" "}
                {step === 12 && (
                  <Action
                    busy={busy}
                    label="Générer le PDF privé FR"
                    onClick={generatePdf}
                  />
                )}{" "}
                {step === 13 && (
                  <Action
                    busy={busy}
                    label="Marquer envoyé"
                    onClick={() =>
                      transition("mark-sent", 14, {
                        sentDocumentId: documentId,
                      })
                    }
                  />
                )}{" "}
                {step === 14 && (
                  <>
                    <Field
                      label="Accepté par"
                      value={acceptedBy}
                      set={setAcceptedBy}
                    />
                    <Action
                      busy={busy}
                      label="Accepter administrativement"
                      onClick={() =>
                        transition("accept", 15, { acceptedByName: acceptedBy })
                      }
                    />
                  </>
                )}{" "}
                {step === 15 && (
                  <>
                    <Field
                      label="Référence contrat"
                      value={contractReference}
                      set={setContractReference}
                    />
                    <Action
                      busy={busy}
                      label="Créer le contrat sans recalcul"
                      onClick={createContract}
                    />
                    {contractId && <p>Contract ID: {contractId}</p>}
                  </>
                )}
              </div>
            )}
          </section>
          <aside className="rounded-xl border bg-white p-5">
            <h2 className="font-semibold">Pourquoi ce montant?</h2>
            <p className="mt-3 text-sm">
              Quantité × tarif catalogue, puis remise globale et ajustement
              composant. Les résultats et explications viennent exclusivement du
              moteur serveur.
            </p>
            <hr className="my-4" />
            <Field
              label="Raison administrative"
              value={reason}
              set={setReason}
            />
            <p className="mt-4 text-xs text-slate-500">
              Le PRIX, la VALEUR ESTIMÉE et les observations restent séparés.
              Aucun entitlement n’est provisionné.
            </p>
          </aside>
        </div>
      </main>
    </AppLayout>
  );
}
function Field({
  label,
  value,
  set,
}: {
  label: string;
  value: string;
  set: (value: string) => void;
}) {
  return (
    <label>
      {label}
      <input
        value={value}
        onChange={(event) => set(event.target.value)}
        className="mt-1 w-full rounded border p-3"
      />
    </label>
  );
}
function Action({
  busy,
  label,
  onClick,
}: {
  busy: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      disabled={busy}
      onClick={onClick}
      className="rounded bg-emerald-700 px-4 py-3 font-semibold text-white disabled:opacity-50"
    >
      {busy ? "Traitement…" : label}
    </button>
  );
}
function CommercialSummary({
  recipient,
  summary,
}: {
  recipient: string;
  summary: Summary;
}) {
  return (
    <>
      <div className="rounded-xl bg-slate-900 p-6 text-white">
        <h3 className="text-lg font-semibold">PROPOSITION</h3>
        <p>{recipient}</p>
        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <dt>Implantation</dt>
          <dd>{summary.oneTime}</dd>
          <dt>Récurrent mensuel</dt>
          <dd>{summary.monthly}</dd>
          <dt>Récurrent annuel</dt>
          <dd>{summary.annual}</dd>
          <dt>Usage estimé</dt>
          <dd>{summary.usage}</dd>
          <dt>Engagement première année</dt>
          <dd>{summary.firstYear}</dd>
        </dl>
      </div>
      <div className="rounded-xl border-l-4 border-amber-500 bg-amber-50 p-5">
        <b>VALEUR OPÉRATIONNELLE ESTIMÉE</b>
        <p>Non configurée</p>
        <small>
          Cette estimation est distincte du PRIX et ne le modifie jamais.
        </small>
      </div>
    </>
  );
}
