"use client";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002/api";

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export interface ClientUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: "CLIENT_MANAGER" | "CLIENT_CORPORATE";
  clientId: string;
  clientName: string;
  organizationId: string;
  populationPermissions: Array<
    "POPULATION_PREPARE" | "POPULATION_APPROVE" | "POPULATION_SEND"
  >;
  operationalReviewPermissions: Array<"REX_CREATE" | "REX_EDIT" | "REX_REVIEW" | "REX_FINALIZE">;
  correctiveActionPermissions: Array<"CORRECTIVE_ACTION_CREATE" | "CORRECTIVE_ACTION_EDIT" | "CORRECTIVE_ACTION_COMPLETE" | "CORRECTIVE_ACTION_VERIFY" | "CORRECTIVE_ACTION_CLOSE" | "CORRECTIVE_ACTION_REPORT_GENERATE">;
}

export function getToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  return localStorage.getItem("coro_client_token");
}

export function getUser(): ClientUser | null {
  if (typeof window === "undefined") {
    return null;
  }

  const storedUser = localStorage.getItem("coro_client_user");

  if (!storedUser) {
    return null;
  }

  try {
    return JSON.parse(storedUser) as ClientUser;
  } catch {
    clearAuth();
    return null;
  }
}

export function setAuth(token: string, user: ClientUser) {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.setItem("coro_client_token", token);

  localStorage.setItem("coro_client_user", JSON.stringify(user));
}

export function clearAuth() {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.removeItem("coro_client_token");

  localStorage.removeItem("coro_client_user");
}

export function isAuthenticated(): boolean {
  return Boolean(getToken());
}

function handleUnauthorized() {
  clearAuth();

  if (typeof window !== "undefined") {
    window.location.replace("/login");
  }
}

async function parseResponse(res: Response) {
  const contentType = res.headers.get("content-type");

  if (contentType?.includes("application/json")) {
    return res.json();
  }

  return res.text();
}

export async function apiGet(path: string) {
  const token = getToken();

  const res = await fetch(`${API_URL}${path}`, {
    method: "GET",

    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (res.status === 401) {
    handleUnauthorized();
    throw new Error("Non autorisé");
  }

  const data = await parseResponse(res);

  if (!res.ok) {
    throw new ApiError(
      typeof data === "string" ? data : data?.message || "Erreur API",
      res.status,
    );
  }

  return data;
}

export async function apiPost(path: string, body: unknown) {
  const token = getToken();
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (res.status === 401) {
    handleUnauthorized();
    throw new Error("Non autorisé");
  }
  const data = await parseResponse(res);
  if (!res.ok) {
    throw new ApiError(
      typeof data === "string" ? data : data?.message || "Erreur API",
      res.status,
    );
  }
  return data;
}

export async function apiPut(path: string, body: unknown) {
  const token = getToken();
  const res = await fetch(`${API_URL}${path}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (res.status === 401) {
    handleUnauthorized();
    throw new Error("Non autorisé");
  }
  const data = await parseResponse(res);
  if (!res.ok) {
    throw new ApiError(
      typeof data === "string" ? data : data?.message || "Erreur API",
      res.status,
    );
  }
  return data;
}

export async function apiDelete(path: string) {
  const token = getToken();
  const res = await fetch(`${API_URL}${path}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
  if (res.status === 401) { handleUnauthorized(); throw new Error("Non autorise"); }
  const data = await parseResponse(res);
  if (!res.ok) throw new ApiError(typeof data === "string" ? data : data?.message || "Erreur API", res.status);
  return data;
}

export async function apiUpload(path: string, body: FormData) {
  const token = getToken();
  const res = await fetch(`${API_URL}${path}`, { method: "POST", headers: { Authorization: `Bearer ${token}` }, body });
  if (res.status === 401) { handleUnauthorized(); throw new Error("Non autorise"); }
  const data = await parseResponse(res);
  if (!res.ok) throw new ApiError(typeof data === "string" ? data : data?.message || "Erreur API", res.status);
  return data;
}

export async function apiDownload(path: string) {
  const token = getToken();
  const res = await fetch(`${API_URL}${path}`, { headers: { Authorization: `Bearer ${token}` } });
  if (res.status === 401) { handleUnauthorized(); throw new Error("Non autorise"); }
  if (!res.ok) {
    const data = await parseResponse(res);
    throw new ApiError(typeof data === "string" ? data : data?.message || "Erreur API", res.status);
  }
  const disposition = res.headers.get("content-disposition") ?? "";
  const match = disposition.match(/filename="([^"]+)"/i);
  return { blob: await res.blob(), filename: match?.[1] ?? "rapport-evidence.pdf" };
}
