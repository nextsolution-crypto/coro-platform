const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002/api";

export type PublicPopulationProgram = {
  site?: {
    name: string;
    address: string;
    city: string;
    province: string;
    postalCode: string | null;
  };
  publicSlug: string;
  nameFR: string;
  nameEN: string | null;
  descriptionFR: string | null;
  descriptionEN: string | null;
  publicPhone: string | null;
  publicEmail: string | null;
  websiteUrl: string | null;
  registrationEnabled: boolean;
  smsEnabled: boolean;
  emailEnabled: boolean;
  privacyTextFR: string | null;
  privacyTextEN: string | null;
  consentTextFR: string | null;
  consentTextEN: string | null;
  consentVersion: string | null;
};

export type PopulationPreferredLanguage = "FR" | "EN";

export type RegisterPopulationSubscriberInput = {
  phone?: string;
  email?: string;
  preferredLanguage: PopulationPreferredLanguage;
  consentVersion: string;
};

export type RegisterPopulationSubscriberResult = {
  subscriber: {
    id: string;
    status: "PENDING_VERIFICATION";
    preferredLanguage: PopulationPreferredLanguage;
    createdAt: string;
  };
  verificationRequired: true;
  verificationChannel: "SMS" | "EMAIL";
  verificationExpiresAt: string;
};

export type VerifyPopulationSubscriberResult = {
  verified: true;
  status: "ACTIVE";
  accessToken: string;
  accessTokenExpiresInSeconds: number;
};

export type ResendPopulationVerificationResult = {
  verificationRequired: true;
  verificationChannel: "SMS" | "EMAIL";
  verificationExpiresAt: string;
};

export type PublicPopulationErrorReason =
  | "INVALID_CODE"
  | "EXPIRED_CODE"
  | "TOO_MANY_ATTEMPTS"
  | "NO_ACTIVE_CODE"
  | "ALREADY_VERIFIED"
  | "RESEND_COOLDOWN"
  | "TOO_MANY_CODES"
  | "INVALID_ADDRESS"
  | "ADDRESS_NOT_FOUND"
  | "AMBIGUOUS_ADDRESS"
  | "LOCATION_UNAVAILABLE"
  | "ACCESS_INVALID"
  | "RESOLUTION_INVALID"
  | "RESOLUTION_STALE";

export type CanadianProvinceCode =
  | "AB" | "BC" | "MB" | "NB" | "NL" | "NS" | "NT"
  | "NU" | "ON" | "PE" | "QC" | "SK" | "YT";

export type ResolvePopulationLocationResult = {
  location: {
    addressLine?: string;
    city?: string;
    province?: string;
    postalCode?: string;
    country: "CA";
  };
  resolutionToken: string;
  expiresAt: string;
};

export type ConfirmPopulationLocationResult = {
  confirmed: true;
  locationConfigured: true;
  resolvedAt: string;
};

export class PublicPopulationApiError extends Error {
  constructor(
    public readonly status: number | null,
    public readonly reason?: PublicPopulationErrorReason,
  ) {
    super("Public Population API request failed");
    this.name = "PublicPopulationApiError";
  }
}

function classifyPublicError(message: unknown): PublicPopulationErrorReason | undefined {
  if (typeof message !== "string") return undefined;
  if (message.includes("Code de vérification invalide")) return "INVALID_CODE";
  if (message.includes("code de vérification est expiré")) return "EXPIRED_CODE";
  if (message.includes("nombre maximal de tentatives")) return "TOO_MANY_ATTEMPTS";
  if (message.includes("Aucune vérification active")) return "NO_ACTIVE_CODE";
  if (message.includes("déjà vérifié")) return "ALREADY_VERIFIED";
  if (message.includes("attendre avant de demander")) return "RESEND_COOLDOWN";
  if (message.includes("Trop de codes de vérification")) return "TOO_MANY_CODES";
  if (message.includes("Adresse invalide")) return "INVALID_ADDRESS";
  if (message.includes("Adresse introuvable")) return "ADDRESS_NOT_FOUND";
  if (message.includes("Adresse ambiguë")) return "AMBIGUOUS_ADDRESS";
  if (message.includes("Résolution de localisation temporairement indisponible")) return "LOCATION_UNAVAILABLE";
  if (message.includes("Jeton d’accès invalide") || message.includes("Accès citoyen invalide")) return "ACCESS_INVALID";
  if (message.includes("Jeton de résolution de localisation invalide")) return "RESOLUTION_INVALID";
  if (message.includes("confirmation de localisation est obsolète")) return "RESOLUTION_STALE";
  return undefined;
}

async function publicRequest<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...init?.headers },
      cache: "no-store",
    });
  } catch {
    throw new PublicPopulationApiError(null);
  }
  if (!response.ok) {
    let reason: PublicPopulationErrorReason | undefined;
    try {
      const body = (await response.json()) as { message?: unknown };
      reason = classifyPublicError(body.message);
    } catch {
      reason = undefined;
    }
    throw new PublicPopulationApiError(response.status, reason);
  }
  try {
    return (await response.json()) as T;
  } catch {
    throw new PublicPopulationApiError(response.status);
  }
}

export function getPublicPopulationProgram(
  publicSlug: string,
  signal?: AbortSignal,
) {
  return publicRequest<PublicPopulationProgram>(
    `/population/public/${encodeURIComponent(publicSlug)}`,
    { method: "GET", signal },
  );
}

export function registerPopulationSubscriber(
  publicSlug: string,
  input: RegisterPopulationSubscriberInput,
) {
  return publicRequest<RegisterPopulationSubscriberResult>(
    `/population/public/${encodeURIComponent(publicSlug)}/register`,
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );
}

export function verifyPopulationSubscriber(
  publicSlug: string,
  subscriberId: string,
  input: { channel: "SMS" | "EMAIL"; code: string },
) {
  return publicRequest<VerifyPopulationSubscriberResult>(
    `/population/public/${encodeURIComponent(publicSlug)}/subscribers/${encodeURIComponent(subscriberId)}/verify`,
    { method: "POST", body: JSON.stringify(input) },
  );
}

export function resendPopulationVerification(
  publicSlug: string,
  subscriberId: string,
  input: { channel: "SMS" | "EMAIL" },
) {
  return publicRequest<ResendPopulationVerificationResult>(
    `/population/public/${encodeURIComponent(publicSlug)}/subscribers/${encodeURIComponent(subscriberId)}/resend-verification`,
    { method: "POST", body: JSON.stringify(input) },
  );
}

export function resolvePopulationLocation(
  publicSlug: string,
  subscriberId: string,
  input: {
    accessToken: string;
    addressLine: string;
    city: string;
    province: CanadianProvinceCode;
    postalCode?: string;
  },
) {
  return publicRequest<ResolvePopulationLocationResult>(
    `/population/public/${encodeURIComponent(publicSlug)}/subscribers/${encodeURIComponent(subscriberId)}/location/resolve`,
    { method: "POST", body: JSON.stringify(input) },
  );
}

export function confirmPopulationLocation(
  publicSlug: string,
  subscriberId: string,
  input: { accessToken: string; resolutionToken: string },
) {
  return publicRequest<ConfirmPopulationLocationResult>(
    `/population/public/${encodeURIComponent(publicSlug)}/subscribers/${encodeURIComponent(subscriberId)}/location/confirm`,
    { method: "POST", body: JSON.stringify(input) },
  );
}
