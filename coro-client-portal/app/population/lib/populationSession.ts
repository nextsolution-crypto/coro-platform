import type {
  PopulationPreferredLanguage,
  RegisterPopulationSubscriberResult,
} from "./publicPopulationApi";

const SESSION_PREFIX = "coro.population.workflow.v1";

type PopulationWorkflowSessionBase = {
  version: 1;
  publicSlug: string;
  subscriberId: string;
  preferredLanguage: PopulationPreferredLanguage;
};

export type PendingPopulationWorkflowSession = PopulationWorkflowSessionBase & {
  state: "PENDING";
  verification: {
    channel: "SMS" | "EMAIL";
    expiresAt: string;
  };
};

export type AuthenticatedPopulationWorkflowSession = PopulationWorkflowSessionBase & {
  state: "AUTHENTICATED";
  accessToken: string;
  accessTokenExpiresAt: string;
  locationConfigured?: boolean;
  locationResolvedAt?: string | null;
};

export type PopulationWorkflowSession =
  | PendingPopulationWorkflowSession
  | AuthenticatedPopulationWorkflowSession;

function sessionKey(publicSlug: string) {
  return `${SESSION_PREFIX}:${publicSlug}`;
}

export function configurePopulationLocationSession(
  session: AuthenticatedPopulationWorkflowSession,
  resolvedAt: string,
) {
  const updated: AuthenticatedPopulationWorkflowSession = {
    ...session,
    locationConfigured: true,
    locationResolvedAt: resolvedAt,
  };
  writePopulationWorkflowSession(updated);
  return updated;
}

export function savePopulationWorkflowSession(
  publicSlug: string,
  result: RegisterPopulationSubscriberResult,
) {
  const session: PendingPopulationWorkflowSession = {
    version: 1,
    publicSlug,
    subscriberId: result.subscriber.id,
    preferredLanguage: result.subscriber.preferredLanguage,
    state: "PENDING",
    verification: {
      channel: result.verificationChannel,
      expiresAt: result.verificationExpiresAt,
    },
  };

  try {
    window.sessionStorage.setItem(sessionKey(publicSlug), JSON.stringify(session));
  } catch {
    // The current screen still works when browser session storage is unavailable.
  }

  return session;
}

export function updatePopulationVerificationExpiry(
  session: PendingPopulationWorkflowSession,
  expiresAt: string,
) {
  const updated: PendingPopulationWorkflowSession = {
    ...session,
    verification: { ...session.verification, expiresAt },
  };
  writePopulationWorkflowSession(updated);
  return updated;
}

export function authenticatePopulationWorkflowSession(
  session: PendingPopulationWorkflowSession,
  accessToken: string,
  accessTokenExpiresInSeconds: number,
) {
  const authenticated: AuthenticatedPopulationWorkflowSession = {
    version: 1,
    publicSlug: session.publicSlug,
    subscriberId: session.subscriberId,
    preferredLanguage: session.preferredLanguage,
    state: "AUTHENTICATED",
    accessToken,
    accessTokenExpiresAt: new Date(
      Date.now() + accessTokenExpiresInSeconds * 1000,
    ).toISOString(),
  };
  writePopulationWorkflowSession(authenticated);
  return authenticated;
}

function writePopulationWorkflowSession(session: PopulationWorkflowSession) {
  try {
    window.sessionStorage.setItem(
      sessionKey(session.publicSlug),
      JSON.stringify(session),
    );
  } catch {
    // The in-memory workflow remains usable when session storage is unavailable.
  }
}

export function clearPopulationWorkflowSession(publicSlug: string) {
  try {
    window.sessionStorage.removeItem(sessionKey(publicSlug));
  } catch {
    // Nothing else in the browser session is touched.
  }
}

export function readPopulationWorkflowSession(publicSlug: string) {
  try {
    const raw = window.sessionStorage.getItem(sessionKey(publicSlug));
    if (!raw) return null;

    const value = JSON.parse(raw) as Partial<PopulationWorkflowSession>;
    if (
      value.version !== 1 ||
      value.publicSlug !== publicSlug ||
      typeof value.subscriberId !== "string" ||
      (value.preferredLanguage !== "FR" && value.preferredLanguage !== "EN") ||
      (value.state !== "PENDING" && value.state !== "AUTHENTICATED")
    ) {
      clearPopulationWorkflowSession(publicSlug);
      return null;
    }

    if (value.state === "PENDING") {
      const pending = value as Partial<PendingPopulationWorkflowSession>;
      if (
        (pending.verification?.channel !== "SMS" &&
          pending.verification?.channel !== "EMAIL") ||
        typeof pending.verification?.expiresAt !== "string"
      ) {
        clearPopulationWorkflowSession(publicSlug);
        return null;
      }
    }

    if (value.state === "AUTHENTICATED") {
      const authenticated = value as Partial<AuthenticatedPopulationWorkflowSession>;
      if (
        typeof authenticated.accessToken !== "string" ||
        typeof authenticated.accessTokenExpiresAt !== "string" ||
        Date.parse(authenticated.accessTokenExpiresAt) <= Date.now()
      ) {
        clearPopulationWorkflowSession(publicSlug);
        return null;
      }
    }

    return value as PopulationWorkflowSession;
  } catch {
    clearPopulationWorkflowSession(publicSlug);
    return null;
  }
}
