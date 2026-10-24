export interface IncidentHistoryItem {
  id: string;
  status: string;
  type: string;
  triggeredAt: string;
  resolvedAt?: string | null;
  procedureCode?: string | null;
  rexWentWell?: string | null;
  rexToImprove?: string | null;
  rexRecommendations?: string | null;
  tasks?: Array<{
    isCoordinatorStep?: boolean;
    status?: string;
  }>;
}

export type HistoryErrorKind = "forbidden" | "session" | "technical";

export interface HistoryError {
  kind: HistoryErrorKind;
  message: string;
}

export interface IncidentHistoryState {
  phase: "loading" | "ready" | "error";
  incidents: IncidentHistoryItem[] | null;
  error: HistoryError | null;
  requestId: number;
  stale: boolean;
}

export type IncidentHistoryAction =
  | {
      type: "start";
      requestId: number;
      preserveData: boolean;
    }
  | {
      type: "success";
      requestId: number;
      incidents: IncidentHistoryItem[];
    }
  | {
      type: "failure";
      requestId: number;
      error: HistoryError;
    };

export function createInitialHistoryState(requestId = 0): IncidentHistoryState {
  return {
    phase: "loading",
    incidents: null,
    error: null,
    requestId,
    stale: false,
  };
}

export function reduceHistoryState(
  state: IncidentHistoryState,
  action: IncidentHistoryAction,
): IncidentHistoryState {
  if (action.type !== "start" && action.requestId !== state.requestId) {
    return state;
  }

  if (action.type === "start") {
    return {
      phase: "loading",
      incidents: action.preserveData ? state.incidents : null,
      error: null,
      requestId: action.requestId,
      stale: false,
    };
  }

  if (action.type === "success") {
    return {
      phase: "ready",
      incidents: action.incidents,
      error: null,
      requestId: action.requestId,
      stale: false,
    };
  }

  return {
    ...state,
    phase: "error",
    error: action.error,
    stale: Boolean(state.incidents),
  };
}

export function getHistoryError(error: unknown): HistoryError {
  const status =
    typeof error === "object" && error !== null && "status" in error
      ? Number((error as { status: unknown }).status)
      : undefined;

  if (status === 401) {
    return {
      kind: "session",
      message: "Votre session a expiré. Reconnectez-vous.",
    };
  }

  if (status === 403) {
    return {
      kind: "forbidden",
      message: "Vous n’avez pas l’autorisation de consulter cet historique.",
    };
  }

  return {
    kind: "technical",
    message: "Impossible de charger l’historique des incidents.",
  };
}

export function parseIncidentHistory(data: unknown): IncidentHistoryItem[] {
  if (!Array.isArray(data)) {
    throw new Error("Invalid incident history response");
  }

  return data as IncidentHistoryItem[];
}

export function filterIncidentHistory(
  incidents: IncidentHistoryItem[],
  filter: "all" | "RESOLVED" | "ACTIVE",
): IncidentHistoryItem[] {
  return filter === "all"
    ? incidents
    : incidents.filter((incident) => incident.status === filter);
}
