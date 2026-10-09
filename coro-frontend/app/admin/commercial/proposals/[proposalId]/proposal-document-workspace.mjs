export const TEMPLATE_SCOPES = Object.freeze({
  CORO_PROFESSIONAL: "CORO_PROFESSIONAL",
  SENTINELLE_POPULATION_STANDALONE: "SENTINELLE_POPULATION_STANDALONE",
  PROFESSIONAL_SERVICES: "PROFESSIONAL_SERVICES",
  COMBINED_OFFER: "COMBINED_OFFER",
});

export const CLAUSE_PARAMETER_LABELS = Object.freeze({
  offerValidityDays: "Durée de validité de l’offre",
  paymentDeadlineDays: "Délai de paiement",
  subscriptionTermMonths: "Durée de l’abonnement",
  renewalNoticeDays: "Préavis de renouvellement",
  implementationSchedule: "Échéancier d’implantation",
  additionalServiceRateMinor: "Tarif des services additionnels",
  delayThresholdDays: "Seuil de retard",
  penaltyAmountMinor: "Montant de pénalité",
  applicableJurisdiction: "Juridiction applicable",
});

export function applicableApprovedClauses(clauses, templateCode, now) {
  const scope = TEMPLATE_SCOPES[templateCode];
  const at = now instanceof Date ? now : new Date(now);
  return clauses.filter((clause) => {
    const effective = clause.effectiveAt ? new Date(clause.effectiveAt) : null;
    const scopes = clause.applicabilities.map((item) => item.scope);
    return (
      (!effective || effective <= at) &&
      (scopes.includes("ALL_OFFERS") || scopes.includes(scope))
    );
  });
}

export function typedClauseParameters(clauses, values) {
  const result = {};
  for (const clause of clauses) {
    for (const definition of clause.parameterSchema ?? []) {
      const raw = values[definition.key];
      if (raw === undefined || raw === "") continue;
      result[definition.key] = [
        "DURATION_DAYS",
        "DURATION_MONTHS",
        "MONEY_MINOR",
      ].includes(definition.type)
        ? Number(raw)
        : raw;
    }
  }
  return result;
}

export function missingRequiredClauseParameters(clauses, values) {
  return clauses.flatMap((clause) =>
    (clause.parameterSchema ?? [])
      .filter((definition) => definition.required && !values[definition.key])
      .map((definition) => definition.key),
  );
}

export function hasVerifiedIssuer(issuers) {
  return issuers.some((issuer) =>
    issuer.versions.some((version) => version.status === "VERIFIED"),
  );
}

export function approvedContentForLines(contents, lines) {
  const approved = contents.flatMap((content) =>
    content.versions
      .filter((version) => version.status === "APPROVED")
      .flatMap((version) =>
        version.bindings.map((binding) => ({
          ...binding,
          contentCode: content.code,
          versionId: version.id,
        })),
      ),
  );
  return lines.map((line) => ({
    line,
    bindings: approved.filter(
      (binding) =>
        binding.targetType === "COMPONENT" &&
        binding.targetCode === line.componentCode,
    ),
  }));
}
