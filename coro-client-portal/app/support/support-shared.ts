/** Centre d'aide du portail : libellés partagés. */
export type SupportSummary = {
  id: string; reference: string; type: string; priority: number; status: string; queue: string; subject: string;
  createdAt: string; updatedAt: string; firstResponseDueAt: string; firstRespondedAt: string | null; firstResponseTarget: string;
};
export type SupportMessage = { id: string; authorKind: string; authorName: string; body: string; createdAt: string };
export type SupportAttachment = { id: string; fileName: string; size: number; messageId: string | null; scanStatus: string | null; downloadable: boolean };
export type SupportTicket = SupportSummary & { isRequester: boolean; messages: SupportMessage[]; attachments: SupportAttachment[] };

export const CLIENT_SUPPORT_TYPES = [
  { value: "QUESTION", label: "Question sur mes plans ou mes bâtiments", hint: "Envoyée à votre firme-conseil." },
  { value: "BUG", label: "Un problème dans CORO", hint: "Quelque chose ne fonctionne pas. Traité par l’équipe CORO." },
  { value: "ACCESS", label: "Accès ou compte", hint: "Connexion, invitation, droits. Traité par l’équipe CORO." },
  { value: "SUGGESTION", label: "Proposer une amélioration", hint: "Une idée pour CORO. Lue par l’équipe CORO." },
] as const;

export const CLIENT_IMPACTS = [
  { value: "BLOCKING", label: "Bloquant", hint: "Je ne peux plus utiliser CORO. Réponse sous 4 h ouvrables." },
  { value: "DISRUPTIVE", label: "Gênant", hint: "Je peux contourner. Réponse sous 1 jour ouvrable." },
  { value: "MINOR", label: "Mineur", hint: "Détail ou confort. Réponse sous 3 jours ouvrables." },
] as const;

export const CLIENT_STATUS: Record<string, { label: string; color: string; bg: string }> = {
  NEW: { label: "Reçue", color: "#2980B9", bg: "#EBF5FB" },
  IN_PROGRESS: { label: "En cours", color: "#B9770E", bg: "#FEF9E7" },
  WAITING_REQUESTER: { label: "Réponse attendue de vous", color: "#8E44AD", bg: "#F5EEF8" },
  RESOLVED: { label: "Résolue", color: "#1E8449", bg: "#EAFAF1" },
  CLOSED: { label: "Fermée", color: "#6C757D", bg: "#F1F3F5" },
};

export const MAX_BYTES = 25 * 1024 * 1024;
export const ACCEPT = ".pdf,.jpg,.jpeg,application/pdf,image/jpeg";

export function formatDateTime(value: string) {
  return new Date(value).toLocaleString("fr-CA", { dateStyle: "medium", timeStyle: "short" });
}

export function clientContext(): Record<string, string> {
  if (typeof window === "undefined") return {};
  let page = "";
  try {
    const referrer = document.referrer ? new URL(document.referrer) : null;
    page = referrer && referrer.origin === window.location.origin ? referrer.pathname : "";
  } catch {
    page = "";
  }
  return { page, userAgent: navigator.userAgent, viewport: `${window.innerWidth}x${window.innerHeight}`, language: navigator.language, appVersion: "portail-client" };
}
