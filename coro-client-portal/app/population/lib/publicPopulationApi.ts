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
  smsConsent?: boolean;
};

export type RegisterPopulationSubscriberResult = {
  accepted: true;
  message: string;
  accessRequestToken: string;
  expiresAt: string;
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
  deliveryStatus: "SENT" | "FAILED";
};

export type RequestPopulationAccessResult = {
  accepted: true;
  message: string;
  accessRequestToken: string;
  expiresAt: string;
};

export type VerifyPopulationAccessResult = {
  verified: true;
  subscriberId: string;
  accessToken: string;
  accessTokenExpiresInSeconds: number;
};

export type PopulationSubscriberProfile = {
  id: string;
  status: "PENDING_VERIFICATION" | "ACTIVE" | "UNSUBSCRIBED";
  preferredLanguage: PopulationPreferredLanguage;
  channels: {
    sms: { available: boolean; enabled: boolean; destination: string | null };
    email: { available: boolean; enabled: boolean; destination: string | null };
  };
  communications: {
    phone: PopulationCommunicationChannel & { suppressed: boolean };
    email: PopulationCommunicationChannel;
  };
  verifiedAt: string | null;
  unsubscribedAt: string | null;
  locationConfigured: boolean;
  locationResolvedAt: string | null;
};

export type PopulationCommunicationChannel = {
  exists: boolean;
  maskedDestination: string | null;
  verified: boolean;
  localEnabled: boolean;
  programEnabled: boolean;
  effectivelyAvailable: boolean;
  actionRequired: boolean;
};

export type PopulationContactType = "PHONE" | "EMAIL";
export type PopulationContactChangeStatus =
  | "DELIVERY_PENDING"
  | "OTP_REQUIRED"
  | "APPLIED"
  | "CANCELLED"
  | "EXPIRED"
  | "ATTEMPTS_EXHAUSTED"
  | "SUPERSEDED"
  | "DELIVERY_FAILED";
export type PopulationContactChangeResult = {
  challengeToken?: string;
  contactType: PopulationContactType;
  purpose: "ADD" | "CHANGE";
  status: PopulationContactChangeStatus;
  maskedProposedDestination: string | null;
  expiresAt: string;
  applied: boolean;
};

export type PopulationContactChangeErrorCode =
  | "CONTACT_CHANGE_UNAVAILABLE"
  | "CONTACT_CHANGE_INVALID_DESTINATION"
  | "CONTACT_CHANGE_NO_CHANGE"
  | "CONTACT_CHANGE_CONFLICT"
  | "CONTACT_CHANGE_NOT_AUTHORIZED"
  | "CONTACT_CHANGE_INVALID_CHALLENGE"
  | "CONTACT_CHANGE_EXPIRED"
  | "CONTACT_CHANGE_INVALID_OTP"
  | "CONTACT_CHANGE_ATTEMPTS_EXHAUSTED"
  | "CONTACT_CHANGE_CANCELLED"
  | "CONTACT_CHANGE_SUPERSEDED"
  | "CONTACT_CHANGE_DELIVERY_FAILED"
  | "CONTACT_CHANGE_RESEND_UNAVAILABLE"
  | "CONTACT_CHANGE_CONSENT_REQUIRED"
  | "CONTACT_CHANGE_CONSENT_STALE"
  | "CONTACT_CHANGE_CHANNEL_DISABLED"
  | "CONTACT_CHANGE_DESTINATION_SUPPRESSED";

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
  | "RESOLUTION_STALE"
  | PopulationContactChangeErrorCode;

export type CanadianProvinceCode =
  | "AB"
  | "BC"
  | "MB"
  | "NB"
  | "NL"
  | "NS"
  | "NT"
  | "NU"
  | "ON"
  | "PE"
  | "QC"
  | "SK"
  | "YT";

export type ResolvedPopulationLocationResult = {
  status: "RESOLVED";
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

export type PopulationLocationSelectionResult = {
  status: "SELECTION_REQUIRED";
  candidates: Array<{
    label: string;
    locality: string;
    selectionToken: string;
  }>;
  expiresAt: string;
};

export type ResolvePopulationLocationResult =
  | ResolvedPopulationLocationResult
  | PopulationLocationSelectionResult;

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

function classifyPublicError(
  message: unknown,
): PublicPopulationErrorReason | undefined {
  if (typeof message !== "string") return undefined;
  if (message.includes("Code de vérification invalide")) return "INVALID_CODE";
  if (message.includes("code de vérification est expiré"))
    return "EXPIRED_CODE";
  if (message.includes("nombre maximal de tentatives"))
    return "TOO_MANY_ATTEMPTS";
  if (message.includes("Aucune vérification active")) return "NO_ACTIVE_CODE";
  if (message.includes("déjà vérifié")) return "ALREADY_VERIFIED";
  if (message.includes("n’est pas en attente de vérification"))
    return "ALREADY_VERIFIED";
  if (message.includes("attendre avant de demander")) return "RESEND_COOLDOWN";
  if (message.includes("Trop de codes de vérification"))
    return "TOO_MANY_CODES";
  if (message.includes("Adresse invalide")) return "INVALID_ADDRESS";
  if (message.includes("Adresse introuvable")) return "ADDRESS_NOT_FOUND";
  if (message.includes("Adresse ambiguë")) return "AMBIGUOUS_ADDRESS";
  if (
    message.includes("Résolution de localisation temporairement indisponible")
  )
    return "LOCATION_UNAVAILABLE";
  if (
    message.includes("Jeton d’accès invalide") ||
    message.includes("Accès citoyen invalide")
  )
    return "ACCESS_INVALID";
  if (message.includes("Jeton de résolution de localisation invalide"))
    return "RESOLUTION_INVALID";
  if (message.includes("confirmation de localisation est obsolète"))
    return "RESOLUTION_STALE";
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
      const body = (await response.json()) as {
        message?: unknown;
        code?: unknown;
      };
      reason =
        typeof body.code === "string" && body.code.startsWith("CONTACT_CHANGE_")
          ? (body.code as PopulationContactChangeErrorCode)
          : classifyPublicError(body.message);
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

export function requestPopulationAccess(
  publicSlug: string,
  input: { channel: "SMS" | "EMAIL"; destination: string },
) {
  return publicRequest<RequestPopulationAccessResult>(
    `/population/public/${encodeURIComponent(publicSlug)}/access/request`,
    { method: "POST", body: JSON.stringify(input) },
  );
}

export function verifyPopulationAccess(
  publicSlug: string,
  input: { accessRequestToken: string; code: string },
) {
  return publicRequest<VerifyPopulationAccessResult>(
    `/population/public/${encodeURIComponent(publicSlug)}/access/verify`,
    { method: "POST", body: JSON.stringify(input) },
  );
}

export function getPopulationSubscriberProfile(
  publicSlug: string,
  subscriberId: string,
  accessToken: string,
) {
  return publicRequest<PopulationSubscriberProfile>(
    `/population/public/${encodeURIComponent(publicSlug)}/subscribers/${encodeURIComponent(subscriberId)}/profile`,
    { method: "POST", body: JSON.stringify({ accessToken }) },
  );
}

function contactChangePath(
  publicSlug: string,
  subscriberId: string,
  type: PopulationContactType,
  action: string,
) {
  return `/population/public/${encodeURIComponent(publicSlug)}/subscribers/${encodeURIComponent(subscriberId)}/contact/${type.toLowerCase()}/${action}`;
}

export function initiatePopulationContactChange(
  publicSlug: string,
  subscriberId: string,
  type: PopulationContactType,
  input: {
    accessToken: string;
    phone?: string;
    email?: string;
    smsConsent?: boolean;
    consentVersion?: string;
  },
) {
  return publicRequest<PopulationContactChangeResult>(
    contactChangePath(publicSlug, subscriberId, type, "initiate"),
    { method: "POST", body: JSON.stringify(input) },
  );
}

export function verifyPopulationContactChange(
  publicSlug: string,
  subscriberId: string,
  type: PopulationContactType,
  input: { accessToken: string; challengeToken: string; code: string },
) {
  return publicRequest<PopulationContactChangeResult>(
    contactChangePath(publicSlug, subscriberId, type, "verify"),
    { method: "POST", body: JSON.stringify(input) },
  );
}

export function resendPopulationContactChange(
  publicSlug: string,
  subscriberId: string,
  type: PopulationContactType,
  input: { accessToken: string; challengeToken: string },
) {
  return publicRequest<PopulationContactChangeResult>(
    contactChangePath(publicSlug, subscriberId, type, "resend"),
    { method: "POST", body: JSON.stringify(input) },
  );
}

export function cancelPopulationContactChange(
  publicSlug: string,
  subscriberId: string,
  type: PopulationContactType,
  input: { accessToken: string; challengeToken: string },
) {
  return publicRequest<PopulationContactChangeResult>(
    contactChangePath(publicSlug, subscriberId, type, "cancel"),
    { method: "POST", body: JSON.stringify(input) },
  );
}

export function updatePopulationSubscriberLanguage(
  publicSlug: string,
  subscriberId: string,
  accessToken: string,
  preferredLanguage: PopulationPreferredLanguage,
) {
  return publicRequest<{
    updated: boolean;
    preferredLanguage: PopulationPreferredLanguage;
  }>(
    `/population/public/${encodeURIComponent(publicSlug)}/subscribers/${encodeURIComponent(subscriberId)}/preferences`,
    {
      method: "POST",
      body: JSON.stringify({ accessToken, preferredLanguage }),
    },
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

export function selectPopulationLocation(
  publicSlug: string,
  subscriberId: string,
  input: { accessToken: string; selectionToken: string },
) {
  return publicRequest<ResolvedPopulationLocationResult>(
    `/population/public/${encodeURIComponent(publicSlug)}/subscribers/${encodeURIComponent(subscriberId)}/location/select`,
    { method: "POST", body: JSON.stringify(input) },
  );
}
