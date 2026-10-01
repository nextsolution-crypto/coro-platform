export const COMMERCIAL_REVENUE_CATEGORIES = [
  "SAAS",
  "IMPLEMENTATION",
  "PROFESSIONAL_SERVICE",
  "OTHER_RECURRING",
  "OTHER_ONE_TIME",
] as const;

export type CommercialRevenueCategory =
  (typeof COMMERCIAL_REVENUE_CATEGORIES)[number];

const LABELS: Record<CommercialRevenueCategory, { fr: string; en: string }> = {
  SAAS: { fr: "SaaS / logiciel récurrent", en: "SaaS / recurring software" },
  IMPLEMENTATION: { fr: "Implantation / mise en œuvre", en: "Implementation" },
  PROFESSIONAL_SERVICE: { fr: "Services professionnels", en: "Professional services" },
  OTHER_RECURRING: { fr: "Autre revenu récurrent", en: "Other recurring revenue" },
  OTHER_ONE_TIME: { fr: "Autre revenu ponctuel", en: "Other one-time revenue" },
};

export function revenueCategoryLabel(
  category: CommercialRevenueCategory | null | undefined,
  language: "fr" | "en" = "fr",
): string {
  return category
    ? LABELS[category][language]
    : language === "fr"
      ? "Historique non classé"
      : "Unclassified legacy";
}
