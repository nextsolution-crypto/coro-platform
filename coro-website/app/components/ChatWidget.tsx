"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { publicApiUrl } from "@/lib/site/api";

type Language = "fr-CA" | "en-CA";
interface Citation {
  sourceId: string;
  title: string;
  url: string;
  version: number;
}
interface SuggestedLink {
  label: string;
  url: string;
}
interface Message {
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
  links?: SuggestedLink[];
  questions?: string[];
}
interface IntelligentResponse {
  sessionId: string;
  message: string;
  status:
    | "SUPPORTED"
    | "PARTIALLY_SUPPORTED"
    | "INSUFFICIENT_INFORMATION"
    | "SERVICE_UNAVAILABLE";
  citations: Citation[];
  suggestedLinks: SuggestedLink[];
  suggestedQuestions: string[];
}

const INTELLIGENT_ASSISTANT_ENABLED =
  process.env.NEXT_PUBLIC_WEB_AI_INTELLIGENT_ASSISTANT_ENABLED === "true";
const COPY = {
  "fr-CA": {
    welcome:
      "Bonjour ! Je suis CORO AI. Je peux vous aider à découvrir CORO, comprendre nos solutions et trouver les informations pertinentes. Comment puis-je vous aider ?",
    suggestions: [
      "Qu'est-ce que CORO ?",
      "Comment CORO Knowledge fonctionne-t-il ?",
      "Quels documents sont disponibles ?",
      "Comment CORO protège-t-il les personnes ?",
    ],
    open: "Ouvrir CORO AI",
    close: "Fermer CORO AI",
    title: "CORO AI",
    online: "Assistant documentaire public",
    loading: "Recherche dans les sources CORO…",
    placeholder: "Posez une question sur CORO…",
    send: "Envoyer",
    newConversation: "Nouvelle conversation",
    sources: "Sources officielles",
    explore: "À explorer",
    unavailable:
      "L'assistant documentaire est temporairement indisponible. Le site CORO demeure accessible.",
    contactPrompt: "Transmettez volontairement votre demande à l'équipe CORO.",
    emailPlaceholder: "votre@courriel.com",
    consent:
      "J'accepte que mon courriel et un bref résumé de ma demande soient transmis à l'équipe CORO.",
    sending: "Envoi…",
    sent: "Votre demande a été transmise à l'équipe CORO.",
    contactError:
      "La demande n'a pas été envoyée. Réessayez ou écrivez à info@getcoro.io.",
    proactive:
      "Besoin d’aide pour trouver une information officielle sur CORO ?",
    grounded: "Réponses fondées sur les sources publiques CORO",
    legacy: "Assistant public CORO",
  },
  "en-CA": {
    welcome:
      "Hello! I'm CORO AI. I can help you explore CORO, understand our solutions and find relevant information. How can I help you?",
    suggestions: [
      "What is CORO?",
      "How does CORO Knowledge work?",
      "Which documents are available?",
      "How does CORO help protect people?",
    ],
    open: "Open CORO AI",
    close: "Close CORO AI",
    title: "CORO AI",
    online: "Public document assistant",
    loading: "Searching CORO sources…",
    placeholder: "Ask a question about CORO…",
    send: "Send",
    newConversation: "New conversation",
    sources: "Official sources",
    explore: "Explore",
    unavailable:
      "The document assistant is temporarily unavailable. The CORO website remains accessible.",
    contactPrompt: "Voluntarily send your request to the CORO team.",
    emailPlaceholder: "you@example.com",
    consent:
      "I agree that my email and a short summary of my request may be sent to the CORO team.",
    sending: "Sending…",
    sent: "Your request was sent to the CORO team.",
    contactError:
      "The request was not sent. Try again or email info@getcoro.io.",
    proactive: "Need help finding official information about CORO?",
    grounded: "Answers grounded in CORO public sources",
    legacy: "CORO public assistant",
  },
} as const;

function languageFromLocation(): Language {
  if (typeof window === "undefined") return "fr-CA";
  return new URLSearchParams(window.location.search).get("lang") === "en"
    ? "en-CA"
    : "fr-CA";
}
function welcome(language: Language): Message {
  return { role: "assistant", content: COPY[language].welcome };
}
function subscribeToLanguage(change: () => void) {
  window.addEventListener("popstate", change);
  return () => window.removeEventListener("popstate", change);
}
function languageServerSnapshot(): Language {
  return "fr-CA";
}
export default function ChatWidget() {
  const language = useSyncExternalStore(
    subscribeToLanguage,
    languageFromLocation,
    languageServerSnapshot,
  );
  const [open, setOpen] = useState(false);
  const [hasOpened, setHasOpened] = useState(false);
  const [showProactive, setShowProactive] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string>();
  const [contactSuggested, setContactSuggested] = useState(false);
  const [visitorEmail, setVisitorEmail] = useState("");
  const [contactConsent, setContactConsent] = useState(false);
  const [contactSending, setContactSending] = useState(false);
  const [contactSent, setContactSent] = useState(false);
  const [contactError, setContactError] = useState("");
  const contactRequestIdRef = useRef<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const copy = COPY[language];
  const displayedMessages = messages.length ? messages : [welcome(language)];

  useEffect(() => {
    if (hasOpened) return;
    const timer = window.setTimeout(() => setShowProactive(true), 30_000);
    return () => window.clearTimeout(timer);
  }, [hasOpened]);
  useEffect(() => {
    if (open) messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);
  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  const resetConversation = () => {
    setSessionId(undefined);
    setMessages([]);
    setContactSuggested(false);
    setContactSent(false);
    setContactConsent(false);
    setContactError("");
    contactRequestIdRef.current = null;
    inputRef.current?.focus();
  };
  const sendContactRequest = async () => {
    if (!visitorEmail.trim() || !contactConsent || contactSending) return;
    setContactSending(true);
    setContactError("");
    contactRequestIdRef.current ??= crypto.randomUUID();
    try {
      const summary = messages
        .filter((message) => message.role === "user")
        .slice(-3)
        .map((message) => message.content)
        .join("\n")
        .slice(0, 1_500);
      const response = await fetch(publicApiUrl("chat/notify"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: visitorEmail.trim(),
          summary,
          consent: true,
          requestId: contactRequestIdRef.current,
        }),
      });
      const result: unknown = await response.json();
      if (
        !response.ok ||
        !result ||
        typeof result !== "object" ||
        (result as { success?: unknown }).success !== true
      )
        throw new Error("CONTACT_NOT_SENT");
      setContactSent(true);
      contactRequestIdRef.current = null;
    } catch {
      setContactError(copy.contactError);
    } finally {
      setContactSending(false);
    }
  };
  const sendMessage = async (override?: string) => {
    const text = (override ?? input).trim();
    if (!text || loading) return;
    const history = messages
      .slice(-10)
      .map((message) => ({
        role: message.role,
        content: message.content.slice(0, 2_000),
      }));
    setInput("");
    setMessages((current) => [...current, { role: "user", content: text }]);
    setLoading(true);
    try {
      if (INTELLIGENT_ASSISTANT_ENABLED) {
        const response = await fetch(publicApiUrl("chat/v1/public-assistant"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: text,
            language,
            ...(sessionId ? { sessionId } : {}),
            pageContext: { pathname: window.location.pathname },
          }),
        });
        if (!response.ok) throw new Error("PUBLIC_ASSISTANT_UNAVAILABLE");
        const result = (await response.json()) as IntelligentResponse;
        if (!result.sessionId || typeof result.message !== "string")
          throw new Error("INVALID_PUBLIC_ASSISTANT_RESPONSE");
        setSessionId(result.sessionId);
        setMessages((current) => [
          ...current,
          {
            role: "assistant",
            content: result.message,
            citations: result.citations,
            links: result.suggestedLinks,
            questions: result.suggestedQuestions,
          },
        ]);
        return;
      }
      const response = await fetch(publicApiUrl("chat/vitrine"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, history }),
      });
      if (!response.ok) throw new Error("CHAT_UNAVAILABLE");
      const result = (await response.json()) as {
        reply?: unknown;
        contactSuggested?: unknown;
        transferToAgent?: unknown;
      };
      if (typeof result.reply !== "string")
        throw new Error("INVALID_CHAT_RESPONSE");
      setMessages((current) => [
        ...current,
        { role: "assistant", content: result.reply as string },
      ]);
      if (result.contactSuggested ?? result.transferToAgent)
        setContactSuggested(true);
    } catch {
      setMessages((current) => [
        ...current,
        { role: "assistant", content: copy.unavailable },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {showProactive && !open && (
        <div
          style={{
            position: "fixed",
            bottom: "calc(92px + var(--coro-cookie-offset, 0px))",
            left: 24,
            maxWidth: 260,
            zIndex: 9997,
            padding: "12px 38px 12px 16px",
            border: "1px solid #E9ECEF",
            borderRadius: 12,
            background: "#FFF",
            boxShadow: "0 4px 20px rgba(0,0,0,.12)",
            color: "#2C3E50",
            fontSize: 13,
          }}
        >
          <button
            type="button"
            onClick={() => setShowProactive(false)}
            aria-label={copy.close}
            style={{
              position: "absolute",
              top: 5,
              right: 7,
              border: 0,
              background: "transparent",
              cursor: "pointer",
              color: "#6C757D",
            }}
          >
            ×
          </button>
          {copy.proactive}
        </div>
      )}
      <button
        type="button"
        onClick={() => {
          setOpen((current) => !current);
          setHasOpened(true);
          setShowProactive(false);
        }}
        aria-label={open ? copy.close : copy.open}
        aria-expanded={open}
        aria-controls="coro-ai-dialog"
        style={{
          position: "fixed",
          bottom: "calc(24px + var(--coro-cookie-offset, 0px))",
          left: 24,
          width: 56,
          height: 56,
          borderRadius: "50%",
          border: 0,
          zIndex: 9999,
          background: "#C0392B",
          color: "#FFF",
          boxShadow: "0 4px 20px rgba(192,57,43,.4)",
          cursor: "pointer",
          fontSize: 22,
        }}
      >
        {open ? "×" : "◆"}
      </button>
      {open && (
        <div
          id="coro-ai-dialog"
          role="dialog"
          aria-modal="false"
          aria-labelledby="coro-ai-title"
          style={{
            position: "fixed",
            bottom: 92,
            left: 24,
            width: 390,
            maxWidth: "100vw",
            height: 600,
            background: "#FFF",
            borderRadius: 16,
            boxShadow: "0 8px 40px rgba(0,0,0,.18)",
            display: "flex",
            flexDirection: "column",
            zIndex: 9998,
            overflow: "hidden",
            fontFamily: "var(--font-inter), sans-serif",
          }}
        >
          <header
            style={{
              background: "#2C3E50",
              padding: "12px 16px",
              display: "flex",
              gap: 12,
              alignItems: "center",
              flexShrink: 0,
            }}
          >
            <div
              aria-hidden="true"
              style={{
                width: 40,
                height: 40,
                borderRadius: "50%",
                background: "#C0392B",
                color: "#FFF",
                display: "grid",
                placeItems: "center",
                fontWeight: 900,
              }}
            >
              C
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p
                id="coro-ai-title"
                style={{
                  margin: 0,
                  color: "#FFF",
                  fontWeight: 700,
                  fontSize: 14,
                }}
              >
                {copy.title}
              </p>
              <p style={{ margin: 0, color: "#D5DBDB", fontSize: 11 }}>
                {loading ? copy.loading : copy.online}
              </p>
            </div>
            <button
              type="button"
              onClick={resetConversation}
              style={{
                border: "1px solid #85929E",
                borderRadius: 6,
                background: "transparent",
                color: "#FFF",
                padding: "6px 8px",
                fontSize: 11,
                cursor: "pointer",
              }}
            >
              {copy.newConversation}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label={copy.close}
              style={{
                border: 0,
                background: "transparent",
                color: "#FFF",
                fontSize: 20,
                cursor: "pointer",
              }}
            >
              ×
            </button>
          </header>
          {contactSuggested && (
            <section
              style={{
                padding: 12,
                background: "#FEF9E7",
                borderBottom: "1px solid #FAD7A0",
              }}
            >
              <p style={{ margin: "0 0 8px", color: "#7D6608", fontSize: 12 }}>
                {copy.contactPrompt}
              </p>
              {!contactSent ? (
                <>
                  <div style={{ display: "flex", gap: 8 }}>
                    <input
                      type="email"
                      value={visitorEmail}
                      onChange={(event) => setVisitorEmail(event.target.value)}
                      placeholder={copy.emailPlaceholder}
                      aria-label={copy.emailPlaceholder}
                      style={{
                        minWidth: 0,
                        flex: 1,
                        padding: "8px 10px",
                        border: "1px solid #D5B45B",
                        borderRadius: 6,
                      }}
                    />
                    <button
                      type="button"
                      onClick={sendContactRequest}
                      disabled={
                        !visitorEmail.trim() ||
                        !contactConsent ||
                        contactSending
                      }
                      style={{
                        border: 0,
                        borderRadius: 6,
                        padding: "8px 12px",
                        background: "#C0392B",
                        color: "#FFF",
                        fontWeight: 700,
                      }}
                    >
                      {contactSending ? copy.sending : copy.send}
                    </button>
                  </div>
                  <label
                    style={{
                      display: "flex",
                      gap: 8,
                      marginTop: 8,
                      color: "#7D6608",
                      fontSize: 11,
                      lineHeight: 1.4,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={contactConsent}
                      onChange={(event) =>
                        setContactConsent(event.target.checked)
                      }
                    />
                    {copy.consent}
                  </label>
                  {contactError && (
                    <p
                      role="alert"
                      style={{
                        margin: "7px 0 0",
                        color: "#C0392B",
                        fontSize: 11,
                      }}
                    >
                      {contactError}
                    </p>
                  )}
                </>
              ) : (
                <p
                  role="status"
                  style={{ margin: 0, color: "#1E8449", fontSize: 12 }}
                >
                  {copy.sent}
                </p>
              )}
            </section>
          )}
          <div
            aria-live="polite"
            aria-busy={loading}
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "16px 14px 8px",
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
          {displayedMessages.map((message, index) => (
              <article
                key={`${message.role}-${index}`}
                style={{
                  alignSelf:
                    message.role === "user" ? "flex-end" : "flex-start",
                  maxWidth: "88%",
                }}
              >
                <div
                  style={{
                    padding: "10px 13px",
                    borderRadius:
                      message.role === "user"
                        ? "16px 16px 4px 16px"
                        : "16px 16px 16px 4px",
                    background: message.role === "user" ? "#C0392B" : "#F1F3F5",
                    color: message.role === "user" ? "#FFF" : "#2C3E50",
                    fontSize: 13,
                    lineHeight: 1.55,
                    whiteSpace: "pre-wrap",
                    overflowWrap: "anywhere",
                  }}
                >
                  {message.content}
                </div>
                {message.citations?.length ? (
                  <div style={{ marginTop: 7, paddingLeft: 6 }}>
                    <strong style={{ fontSize: 11, color: "#566573" }}>
                      {copy.sources}
                    </strong>
                    <ul style={{ margin: "4px 0 0", paddingLeft: 16 }}>
                      {message.citations.map((citation) => (
                        <li
                          key={`${citation.sourceId}-${citation.version}`}
                          style={{ fontSize: 11, marginBottom: 3 }}
                        >
                          <a
                            href={citation.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: "#9B2C20" }}
                          >
                            {citation.title} · v{citation.version}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {message.links?.length ? (
                  <nav
                    aria-label={copy.explore}
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 6,
                      marginTop: 7,
                    }}
                  >
                    {message.links.map((link) => (
                      <a
                        key={link.url}
                        href={link.url}
                        style={{
                          border: "1px solid #D5D8DC",
                          borderRadius: 16,
                          padding: "5px 9px",
                          color: "#2C3E50",
                          fontSize: 11,
                          textDecoration: "none",
                        }}
                      >
                        {link.label}
                      </a>
                    ))}
                  </nav>
                ) : null}
                {message.questions?.length ? (
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 6,
                      marginTop: 7,
                    }}
                  >
                    {message.questions.map((question) => (
                      <button
                        type="button"
                        key={question}
                        onClick={() => void sendMessage(question)}
                        style={{
                          border: "1px solid #D5D8DC",
                          borderRadius: 16,
                          padding: "5px 9px",
                          background: "#FFF",
                          color: "#2C3E50",
                          fontSize: 11,
                          cursor: "pointer",
                        }}
                      >
                        {question}
                      </button>
                    ))}
                  </div>
                ) : null}
              </article>
            ))}
          {messages.length === 0 && !loading && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                {copy.suggestions.map((question) => (
                  <button
                    type="button"
                    key={question}
                    onClick={() => void sendMessage(question)}
                    style={{
                      padding: "7px 11px",
                      borderRadius: 18,
                      border: "1px solid #D5D8DC",
                      background: "#FFF",
                      color: "#2C3E50",
                      fontSize: 11,
                      cursor: "pointer",
                    }}
                  >
                    {question}
                  </button>
                ))}
              </div>
            )}
            {loading && (
              <p
                role="status"
                style={{ margin: 0, color: "#6C757D", fontSize: 12 }}
              >
                {copy.loading}
              </p>
            )}
            <div ref={messagesEndRef} />
          </div>
          <div
            style={{
              padding: "10px 12px",
              borderTop: "1px solid #E9ECEF",
              display: "flex",
              gap: 8,
            }}
          >
            <input
              ref={inputRef}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void sendMessage();
                }
              }}
              maxLength={2_000}
              placeholder={copy.placeholder}
              aria-label={copy.placeholder}
              disabled={loading}
              style={{
                minWidth: 0,
                flex: 1,
                border: "1px solid #D5D8DC",
                borderRadius: 20,
                padding: "9px 14px",
                color: "#2C3E50",
                background: "#F8F9FA",
              }}
            />
            <button
              type="button"
              onClick={() => void sendMessage()}
              disabled={loading || !input.trim()}
              aria-label={copy.send}
              style={{
                width: 40,
                height: 40,
                borderRadius: "50%",
                border: 0,
                background: input.trim() ? "#C0392B" : "#D5D8DC",
                color: "#FFF",
                cursor: input.trim() ? "pointer" : "default",
              }}
            >
              →
            </button>
          </div>
          <p
            style={{
              margin: 0,
              padding: "4px 12px 8px",
              color: "#6C757D",
              background: "#FFF",
              textAlign: "center",
              fontSize: 10,
            }}
          >
            {INTELLIGENT_ASSISTANT_ENABLED ? copy.grounded : copy.legacy}
          </p>
        </div>
      )}
      <style>{`
        @media (max-width: 767px) {
          #coro-ai-dialog {
            inset: auto auto var(--coro-cookie-offset, 0px) 0 !important;
            width: 100vw !important;
            height: calc(100dvh - var(--coro-cookie-offset, 0px)) !important;
            border-radius: 0 !important;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          #coro-ai-dialog * { scroll-behavior: auto !important; animation: none !important; transition: none !important; }
        }
      `}</style>
    </>
  );
}
