import type {
  PopulationPreferredLanguage,
  RegisterPopulationSubscriberResult,
} from "./publicPopulationApi";

const SESSION_PREFIX = "coro.population.workflow.v1";
const CONTACT_CHANGE_PREFIX = "coro.population.contactChange.v1";

export type PopulationContactChangeSession = {
  version: 1;
  publicSlug: string;
  subscriberId: string;
  type: "PHONE" | "EMAIL";
  challengeToken: string;
  maskedProposedDestination: string | null;
  expiresAt: string;
};

type PopulationWorkflowSessionBase = {
  version: 1;
  publicSlug: string;
  preferredLanguage: PopulationPreferredLanguage;
  smsSubscribed?: boolean;
};

export type PendingPopulationWorkflowSession = PopulationWorkflowSessionBase & {
  state: "PENDING";
  verification: {
    channel: "SMS" | "EMAIL";
    expiresAt: string;
    accessRequestToken: string;
  };
};

export type AuthenticatedPopulationWorkflowSession =
  PopulationWorkflowSessionBase & {
    state: "AUTHENTICATED";
    subscriberId: string;
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

function contactChangeKey(publicSlug: string) {
  return `${CONTACT_CHANGE_PREFIX}:${publicSlug}`;
}

export function savePopulationContactChangeSession(
  session: PopulationContactChangeSession,
) {
  try {
    window.sessionStorage.setItem(
      contactChangeKey(session.publicSlug),
      JSON.stringify(session),
    );
  } catch {
    // The in-memory workflow remains usable when session storage is unavailable.
  }
  return session;
}

export function clearPopulationContactChangeSession(publicSlug: string) {
  try {
    window.sessionStorage.removeItem(contactChangeKey(publicSlug));
  } catch {
    // No other browser session state is affected.
  }
}

export function readPopulationContactChangeSession(
  publicSlug: string,
  subscriberId: string,
) {
  try {
    const raw = window.sessionStorage.getItem(contactChangeKey(publicSlug));
    if (!raw) return null;
    const value = JSON.parse(raw) as Partial<PopulationContactChangeSession>;
    if (
      value.version !== 1 ||
      value.publicSlug !== publicSlug ||
      value.subscriberId !== subscriberId ||
      (value.type !== "PHONE" && value.type !== "EMAIL") ||
      typeof value.challengeToken !== "string" ||
      typeof value.expiresAt !== "string" ||
      (value.maskedProposedDestination !== null &&
        typeof value.maskedProposedDestination !== "string") ||
      Date.parse(value.expiresAt) <= Date.now()
    ) {
      clearPopulationContactChangeSession(publicSlug);
      return null;
    }
    return value as PopulationContactChangeSession;
  } catch {
    clearPopulationContactChangeSession(publicSlug);
    return null;
  }
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

export function updateAuthenticatedPopulationLanguage(
  session: AuthenticatedPopulationWorkflowSession,
  preferredLanguage: PopulationPreferredLanguage,
) {
  const updated = { ...session, preferredLanguage };
  writePopulationWorkflowSession(updated);
  return updated;
}

export function savePopulationWorkflowSession(
  publicSlug: string,
  result: RegisterPopulationSubscriberResult,
  preferredLanguage: PopulationPreferredLanguage,
  channel: "SMS" | "EMAIL",
  smsSubscribed: boolean,
) {
  const session: PendingPopulationWorkflowSession = {
    version: 1,
    publicSlug,
    preferredLanguage,
    smsSubscribed,
    state: "PENDING",
    verification: {
      channel,
      expiresAt: result.expiresAt,
      accessRequestToken: result.accessRequestToken,
    },
  };

  try {
    window.sessionStorage.setItem(
      sessionKey(publicSlug),
      JSON.stringify(session),
    );
  } catch {
    // The current screen still works when browser session storage is unavailable.
  }

  return session;
}

export function updatePopulationVerificationExpiry(
  session: PendingPopulationWorkflowSession,
  expiresAt: string,
  accessRequestToken: string,
) {
  const updated: PendingPopulationWorkflowSession = {
    ...session,
    verification: { ...session.verification, expiresAt, accessRequestToken },
  };
  writePopulationWorkflowSession(updated);
  return updated;
}

export function authenticatePopulationWorkflowSession(
  session: PendingPopulationWorkflowSession,
  accessToken: string,
  accessTokenExpiresInSeconds: number,
  subscriberId: string,
) {
  return saveAuthenticatedPopulationWorkflowSession({
    publicSlug: session.publicSlug,
    subscriberId,
    preferredLanguage: session.preferredLanguage,
    smsSubscribed: session.smsSubscribed,
    accessToken,
    accessTokenExpiresInSeconds,
  });
}

export function saveAuthenticatedPopulationWorkflowSession(data: {
  publicSlug: string;
  subscriberId: string;
  preferredLanguage: PopulationPreferredLanguage;
  smsSubscribed?: boolean;
  accessToken: string;
  accessTokenExpiresInSeconds: number;
  locationConfigured?: boolean;
  locationResolvedAt?: string | null;
}) {
  const authenticated: AuthenticatedPopulationWorkflowSession = {
    version: 1,
    publicSlug: data.publicSlug,
    subscriberId: data.subscriberId,
    preferredLanguage: data.preferredLanguage,
    smsSubscribed: data.smsSubscribed,
    state: "AUTHENTICATED",
    accessToken: data.accessToken,
    accessTokenExpiresAt: new Date(
      Date.now() + data.accessTokenExpiresInSeconds * 1000,
    ).toISOString(),
    locationConfigured: data.locationConfigured,
    locationResolvedAt: data.locationResolvedAt,
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
        typeof pending.verification?.expiresAt !== "string" ||
        typeof pending.verification?.accessRequestToken !== "string"
      ) {
        clearPopulationWorkflowSession(publicSlug);
        return null;
      }
    }

    if (value.state === "AUTHENTICATED") {
      const authenticated =
        value as Partial<AuthenticatedPopulationWorkflowSession>;
      if (
        typeof authenticated.accessToken !== "string" ||
        typeof authenticated.subscriberId !== "string" ||
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
