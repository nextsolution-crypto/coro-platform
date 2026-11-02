export interface IncidentHistoryItem {
  id: string;
  status: string;
  type: string;
  triggeredAt: string;
  resolvedAt?: string | null;
  procedureCode?: string | null;
  isExercise: boolean;
  hasRex: boolean;
  coordinatorStepsTotal: number;
  coordinatorStepsCompleted: number;
}

export interface IncidentHistoryResponse {
  items: IncidentHistoryItem[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
  counts: {
    all: number;
    open: number;
    byStatus: Record<string, number>;
    exercises: number;
    real: number;
  };
}

export type HistoryErrorKind = "forbidden" | "session" | "technical";
export interface HistoryError { kind: HistoryErrorKind; message: string }
export interface IncidentHistoryState {
  phase: "loading" | "ready" | "error";
  result: IncidentHistoryResponse | null;
  error: HistoryError | null;
  requestId: number;
  stale: boolean;
}

export type IncidentHistoryAction =
  | { type: "start"; requestId: number; preserveData: boolean }
  | { type: "success"; requestId: number; result: IncidentHistoryResponse }
  | { type: "failure"; requestId: number; error: HistoryError };

export function createInitialHistoryState(requestId = 0): IncidentHistoryState {
  return { phase: "loading", result: null, error: null, requestId, stale: false };
}

export function reduceHistoryState(state: IncidentHistoryState, action: IncidentHistoryAction): IncidentHistoryState {
  if (action.type !== "start" && action.requestId !== state.requestId) return state;
  if (action.type === "start") {
    return { phase: "loading", result: action.preserveData ? state.result : null, error: null, requestId: action.requestId, stale: false };
  }
  if (action.type === "success") {
    return { phase: "ready", result: action.result, error: null, requestId: action.requestId, stale: false };
  }
  return { ...state, phase: "error", error: action.error, stale: Boolean(state.result) };
}

export function getHistoryError(error: unknown): HistoryError {
  const status = typeof error === "object" && error !== null && "status" in error
    ? Number((error as { status: unknown }).status)
    : undefined;
  if (status === 401) return { kind: "session", message: "Votre session a expiré. Reconnectez-vous." };
  if (status === 403) return { kind: "forbidden", message: "Vous n’avez pas l’autorisation de consulter cet historique." };
  return { kind: "technical", message: "Impossible de charger l’historique des incidents." };
}

export function parseIncidentHistory(data: unknown): IncidentHistoryResponse {
  if (
    typeof data !== "object" || data === null ||
    !("items" in data) || !Array.isArray((data as IncidentHistoryResponse).items) ||
    !("pagination" in data) || !("counts" in data)
  ) throw new Error("Invalid incident history response");
  return data as IncidentHistoryResponse;
}
