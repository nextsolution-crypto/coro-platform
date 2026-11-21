// Résultat d'un déclenchement du bouton panique.
//
// Règle de sécurité : l'écran n'annonce un succès que si le serveur a
// répondu 2xx ET déclare avoir contacté au moins une personne. Tout autre
// cas (erreur HTTP, session expirée, réseau, délai dépassé, réponse
// illisible, zéro contact) est un échec non confirmé : l'interface doit
// alors renvoyer immédiatement vers le 911.

export const PANIC_REQUEST_TIMEOUT_MS = 15_000;

export type PanicFailureReason =
  | "SESSION"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "SERVER"
  | "NETWORK"
  | "TIMEOUT"
  | "NO_CONTACT"
  | "INVALID_RESPONSE";

export type PanicOutcome =
  | {
      kind: "CONFIRMED";
      notifiedCount: number;
      address: string | null;
      panicAlertId?: string;
      coordinatorName?: string | null;
      occupantCount?: number;
    }
  | { kind: "UNCONFIRMED"; reason: PanicFailureReason; status: number | null };

type FetchLike = (
  input: string,
  init: { method: string; headers: Record<string, string>; body: string; signal: AbortSignal },
) => Promise<{ ok: boolean; status: number; json: () => Promise<unknown> }>;

export function interpretPanicResponse(
  status: number,
  ok: boolean,
  body: unknown,
): PanicOutcome {
  if (!ok) {
    if (status === 401) return { kind: "UNCONFIRMED", reason: "SESSION", status };
    if (status === 403) return { kind: "UNCONFIRMED", reason: "FORBIDDEN", status };
    if (status === 404) return { kind: "UNCONFIRMED", reason: "NOT_FOUND", status };
    return { kind: "UNCONFIRMED", reason: "SERVER", status };
  }
  if (!body || typeof body !== "object") {
    return { kind: "UNCONFIRMED", reason: "INVALID_RESPONSE", status };
  }
  const record = body as Record<string, unknown>;
  const count = record.notifiedCount;
  if (typeof count !== "number" || !Number.isInteger(count) || count < 0) {
    return { kind: "UNCONFIRMED", reason: "INVALID_RESPONSE", status };
  }
  if (count < 1) return { kind: "UNCONFIRMED", reason: "NO_CONTACT", status };
  const address = typeof record.address === "string" && record.address.trim() ? record.address : null;
  const outcome: PanicOutcome = { kind: "CONFIRMED", notifiedCount: count, address };
  if (typeof record.panicAlertId === "string" && record.panicAlertId) outcome.panicAlertId = record.panicAlertId;
  if (typeof record.coordinatorName === "string" && record.coordinatorName) outcome.coordinatorName = record.coordinatorName;
  if (typeof record.occupantCount === "number" && Number.isInteger(record.occupantCount) && record.occupantCount > 0) {
    outcome.occupantCount = record.occupantCount;
  }
  return outcome;
}

export async function requestPanic(options: {
  fetchImpl: FetchLike;
  apiUrl: string;
  buildingId: string;
  token: string | null;
  payload: Record<string, unknown>;
  timeoutMs?: number;
}): Promise<PanicOutcome> {
  if (!options.token) return { kind: "UNCONFIRMED", reason: "SESSION", status: null };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? PANIC_REQUEST_TIMEOUT_MS);
  try {
    const res = await options.fetchImpl(
      `${options.apiUrl}/client-portal/buildings/${encodeURIComponent(options.buildingId)}/panic`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${options.token}` },
        body: JSON.stringify(options.payload),
        signal: controller.signal,
      },
    );
    let body: unknown = null;
    try {
      body = await res.json();
    } catch {
      body = null;
    }
    return interpretPanicResponse(res.status, res.ok, body);
  } catch (error) {
    if (controller.signal.aborted) return { kind: "UNCONFIRMED", reason: "TIMEOUT", status: null };
    void error;
    return { kind: "UNCONFIRMED", reason: "NETWORK", status: null };
  } finally {
    clearTimeout(timer);
  }
}

export function panicFailureCode(outcome: Extract<PanicOutcome, { kind: "UNCONFIRMED" }>): string {
  return outcome.status ? `${outcome.reason} · HTTP ${outcome.status}` : outcome.reason;
}
