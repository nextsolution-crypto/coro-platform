const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002/api";

export type PublicPopulationProgram = {
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

export class PublicPopulationApiError extends Error {
  constructor(public readonly status: number | null) {
    super("Public Population API request failed");
    this.name = "PublicPopulationApiError";
  }
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
  if (!response.ok) throw new PublicPopulationApiError(response.status);
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
