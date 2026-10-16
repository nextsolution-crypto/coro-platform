export type FinancialLanguage = "fr" | "en";

const SUPPORTED_CURRENCIES = new Set(["CAD", "USD", "EUR"]);

const localeFor = (language: FinancialLanguage) =>
  language === "en" ? "en-CA" : "fr-CA";

const normalizedCurrency = (currency: string | null | undefined) =>
  currency?.trim().toUpperCase() || null;

export const financialCurrencyLabel = (
  currency: string | null | undefined,
  language: FinancialLanguage = "fr",
) => {
  const normalized = normalizedCurrency(currency);
  if (!normalized || normalized === "UNKNOWN") {
    return language === "en" ? "Unknown currency" : "Devise inconnue";
  }
  if (!SUPPORTED_CURRENCIES.has(normalized)) {
    return language === "en"
      ? `Unsupported currency (${normalized})`
      : `Devise non prise en charge (${normalized})`;
  }
  return normalized;
};

export const formatFinancialAmount = (
  value: string | null,
  currency: string | null | undefined,
  language: FinancialLanguage = "fr",
) => {
  if (value === null) {
    return language === "en" ? "Not available" : "Non disponible";
  }

  const amount = Number(value);
  if (!Number.isFinite(amount)) {
    return language === "en" ? "Not available" : "Non disponible";
  }

  const normalized = normalizedCurrency(currency);
  if (normalized && SUPPORTED_CURRENCIES.has(normalized)) {
    return new Intl.NumberFormat(localeFor(language), {
      style: "currency",
      currency: normalized,
    }).format(amount);
  }

  const renderedAmount = new Intl.NumberFormat(localeFor(language), {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
  return `${renderedAmount} — ${financialCurrencyLabel(normalized, language)}`;
};
