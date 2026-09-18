import type {
  PopulationPreferredLanguage,
  RegisterPopulationSubscriberResult,
} from "./publicPopulationApi";

const SESSION_PREFIX = "coro.population.workflow.v1";

export type PopulationWorkflowSession = {
  version: 1;
  publicSlug: string;
  subscriberId: string;
  preferredLanguage: PopulationPreferredLanguage;
  verification: {
    state: "PENDING";
    channel: "SMS" | "EMAIL";
    expiresAt: string;
  };
};

function sessionKey(publicSlug: string) {
  return `${SESSION_PREFIX}:${publicSlug}`;
}

export function savePopulationWorkflowSession(
  publicSlug: string,
  result: RegisterPopulationSubscriberResult,
) {
  const session: PopulationWorkflowSession = {
    version: 1,
    publicSlug,
    subscriberId: result.subscriber.id,
    preferredLanguage: result.subscriber.preferredLanguage,
    verification: {
      state: "PENDING",
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
      value.verification?.state !== "PENDING" ||
      (value.verification.channel !== "SMS" &&
        value.verification.channel !== "EMAIL") ||
      typeof value.verification.expiresAt !== "string"
    ) {
      return null;
    }

    return value as PopulationWorkflowSession;
  } catch {
    return null;
  }
}
