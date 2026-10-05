import type { CustomerSafeProjection } from "./configurator-types";

const money = (value: string | null, currency: string) =>
  value == null
    ? "—"
    : new Intl.NumberFormat("fr-CA", { style: "currency", currency }).format(
        Number(value) / 100,
      );

export function CustomerSafeReview({
  preview,
}: {
  preview: CustomerSafeProjection;
}) {
  return (
    <section className="rounded-xl border border-emerald-200 bg-white p-5">
      <div className="rounded bg-amber-50 p-3 text-sm text-amber-900">
        Aperçu client non contractuel. L’offre commerciale est créée uniquement
        lors de la conversion en proposition.
      </div>
      <div className="mt-4 flex items-start justify-between">
        <div>
          <h2 className="text-xl font-semibold">Aperçu de l’offre</h2>
          <p>{preview.customer.displayName}</p>
        </div>
        {preview.reference && (
          <b>
            {preview.reference} · v{preview.revision}
          </b>
        )}
      </div>
      <p className="mt-3 text-sm text-slate-600">
        {preview.solutions.map((item) => item.labelFr).join(" · ")}
      </p>
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
        <Total
          label="Mensuel"
          value={preview.totals.monthlyRecurringMinor}
          currency={preview.currency}
        />
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
