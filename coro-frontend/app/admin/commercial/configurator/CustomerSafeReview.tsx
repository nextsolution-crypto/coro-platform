import type { CustomerSafeProjection } from "./configurator-types";

const money = (value: string | null, currency: string) =>
  value == null
    ? "—"
    : new Intl.NumberFormat("fr-CA", { style: "currency", currency }).format(
        Number(value) / 100,
      );

export function CustomerSafeReview({
  preview,
  onClose,
}: {
  preview: CustomerSafeProjection;
  onClose?: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/50 p-4 sm:p-8"
      role="dialog"
      aria-modal="true"
      aria-labelledby="customer-preview-title"
    >
      <section className="mx-auto max-w-5xl rounded-xl border border-emerald-200 bg-white p-5 shadow-xl">
        <div className="rounded bg-amber-50 p-3 text-sm text-amber-900">
          Aperçu client non contractuel. L’offre commerciale est créée
          uniquement lors de la conversion en proposition.
        </div>
        <div className="mt-4 flex items-start justify-between gap-4">
          <div>
            <h2 id="customer-preview-title" className="text-xl font-semibold">
              Aperçu de l’offre
            </h2>
            <p>{preview.customer.displayName}</p>
          </div>
          <div className="flex items-center gap-3">
            {preview.reference && (
              <b>
                {preview.reference} · v{preview.revision}
              </b>
            )}
            {onClose && (
              <button
                type="button"
                className="rounded border px-3 py-1"
                onClick={onClose}
              >
                Fermer
              </button>
            )}
          </div>
        </div>
        <p className="mt-3 text-sm text-slate-600">
          {preview.solutions.map((item) => item.labelFr).join(" · ")}
        </p>
        {preview.inputs.length > 0 && (
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {preview.inputs.map((input) => (
              <p
                key={`${input.labelFr}-${input.value}`}
                className="rounded border p-3 text-sm"
              >
                <b>{input.labelFr}</b> {input.value} {input.unit}
              </p>
            ))}
          </div>
        )}
        <div className="mt-3 text-sm text-slate-600">
          <p>
            Validité : {preview.validity.validFrom?.slice(0, 10) ?? "—"} au{" "}
            {preview.validity.validUntil?.slice(0, 10) ?? "—"}
          </p>
          {preview.commercialTerms.contextFr && (
            <p className="mt-2 whitespace-pre-wrap">
              {preview.commercialTerms.contextFr}
            </p>
          )}
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b">
                <th className="py-2">Composant</th>
                <th>Quantité</th>
                <th>Cadence</th>
                <th>Prix offert</th>
              </tr>
            </thead>
            <tbody>
              {preview.lines.map((line, index) => (
                <tr key={`${line.labelFr}-${index}`} className="border-b">
                  <td className="py-2">
                    <b>{line.labelFr}</b>
                    {line.descriptionFr && (
                      <small className="block text-slate-500">
                        {line.descriptionFr}
                      </small>
                    )}
                  </td>
                  <td>
                    {line.quantity ?? "—"} {line.quantityLabelFr}
                  </td>
                  <td>{line.cadenceFr}</td>
                  <td>
                    {money(line.offeredExtendedAmountMinor, preview.currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-4">
          <Total
            label="Frais ponctuels"
            value={preview.totals.oneTimeMinor}
            currency={preview.currency}
          />
          {preview.totals.monthlyRecurringMinor !== null && (
            <Total
              label="Mensuel"
              value={preview.totals.monthlyRecurringMinor}
              currency={preview.currency}
            />
          )}
          <Total
            label="Équivalent annuel récurrent"
            value={preview.totals.annualRecurringEquivalentMinor}
            currency={preview.currency}
          />
          <Total
            label="Première année"
            value={preview.totals.firstYearMinor}
            currency={preview.currency}
          />
        </div>
        {preview.valueAnalysis && (
          <div className="mt-4 rounded bg-amber-50 p-4">
            <b>Valeur estimée</b>
            <p>
              {money(
                preview.valueAnalysis.estimatedCapacityValueMinor,
                preview.currency,
              )}
            </p>
            <small>{preview.valueAnalysis.disclaimerFr}</small>
          </div>
        )}
        {preview.commercialTerms.termsFr && (
          <div className="mt-4 rounded border p-4">
            <b>Conditions commerciales</b>
            <p className="mt-2 whitespace-pre-wrap">
              {preview.commercialTerms.termsFr}
            </p>
          </div>
        )}
        <div className="mt-4 border-t pt-3 text-sm text-slate-600">
          <b>{preview.issuer.brandName}</b>
          {[
            preview.issuer.legalName,
            preview.issuer.address,
            preview.issuer.email,
            preview.issuer.phone,
            preview.issuer.website,
          ]
            .filter((value): value is string => Boolean(value))
            .map((value) => (
              <span key={value} className="ml-2">
                {value}
              </span>
            ))}
        </div>
      </section>
    </div>
  );
}

function Total({
  label,
  value,
  currency,
}: {
  label: string;
  value: string | null;
  currency: string;
}) {
  return (
    <div className="rounded border p-3">
      <small className="text-slate-500">{label}</small>
      <strong className="block">{money(value, currency)}</strong>
    </div>
  );
}
