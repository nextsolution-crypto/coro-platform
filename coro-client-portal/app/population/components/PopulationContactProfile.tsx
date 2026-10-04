"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { CheckCircle2, Mail, MessageSquare, RefreshCw, X } from "lucide-react";
import {
  cancelPopulationContactChange,
  initiatePopulationContactChange,
  PublicPopulationApiError,
  resendPopulationContactChange,
  verifyPopulationContactChange,
  type PopulationContactChangeErrorCode,
  type PopulationContactType,
  type PopulationSubscriberProfile,
  type PublicPopulationProgram,
} from "../lib/publicPopulationApi";
import {
  clearPopulationContactChangeSession,
  readPopulationContactChangeSession,
  savePopulationContactChangeSession,
  type AuthenticatedPopulationWorkflowSession,
  type PopulationContactChangeSession,
} from "../lib/populationSession";
import styles from "./PopulationPublicShell.module.css";

type Language = "fr" | "en";

const copy = {
  fr: {
    communications: "Communications",
    phone: "Téléphone",
    email: "Courriel",
    verified: "Coordonnée vérifiée",
    verificationRequired: "Vérification requise",
    available: "Disponible pour les communications",
    unavailable: "Communication actuellement indisponible",
    suppressed: "Numéro vérifié, mais les SMS sont désactivés pour ce numéro.",
    programDisabled: "Ce canal n’est pas offert par ce programme.",
    localDisabled: "Ce canal est désactivé pour votre inscription.",
    notConfigured: "Aucune coordonnée configurée",
    add: "Ajouter",
    change: "Modifier",
    destinationPhone: "Nouveau numéro de téléphone",
    destinationEmail: "Nouvelle adresse courriel",
    continue: "Continuer",
    sending: "Envoi…",
    consentTitle: "Consentement aux SMS",
    consentCheck:
      "J’accepte de recevoir les communications SMS décrites ci-dessus.",
    consentUnavailable:
      "Le texte de consentement actuel n’est pas disponible. Le numéro ne peut pas être modifié maintenant.",
    otpTitle: "Vérifier la nouvelle coordonnée",
    otpIntro: "Entrez le code à 6 chiffres envoyé à",
    otp: "Code de vérification",
    verify: "Vérifier",
    verifying: "Vérification…",
    resend: "Renvoyer le code",
    resending: "Envoi…",
    cancel: "Annuler la demande",
    cancelling: "Annulation…",
    validFor: "Code valide pendant",
    sent: "Un nouveau code a été envoyé.",
    success: "La coordonnée a été vérifiée et mise à jour.",
    cancelled: "La demande de modification a été annulée.",
    generic:
      "La demande n’a pas pu être confirmée. Votre profil a été actualisé; vérifiez son état avant de réessayer.",
    invalidDestination: "Vérifiez la coordonnée saisie.",
    noChange: "Cette coordonnée est déjà associée à votre inscription.",
    conflict:
      "Cette coordonnée ne peut pas être utilisée pour cette inscription.",
    invalidOtp: "Le code est invalide. Vérifiez-le et réessayez.",
    expired: "Le code a expiré. Recommencez la modification.",
    exhausted:
      "Le nombre maximal de tentatives est atteint. Recommencez la modification.",
    superseded: "Cette demande de modification n’est plus active.",
    deliveryFailed: "Nous n’avons pas pu envoyer le code de vérification.",
    unavailableError: "Cette modification n’est pas disponible actuellement.",
    consentRequired: "Vous devez accepter le consentement SMS actuel.",
    consentStale:
      "Le consentement a changé. Relisez-le et confirmez-le de nouveau.",
    suppressedError: "Les SMS ne sont pas disponibles pour ce numéro.",
    sessionExpired: "Votre accès a expiré. Demandez un nouveau code d’accès.",
  },
  en: {
    communications: "Communications",
    phone: "Phone",
    email: "Email",
    verified: "Verified contact",
    verificationRequired: "Verification required",
    available: "Available for communications",
    unavailable: "Communication currently unavailable",
    suppressed: "The number is verified, but SMS is disabled for this number.",
    programDisabled: "This channel is not offered by this program.",
    localDisabled: "This channel is disabled for your subscription.",
    notConfigured: "No contact configured",
    add: "Add",
    change: "Change",
    destinationPhone: "New phone number",
    destinationEmail: "New email address",
    continue: "Continue",
    sending: "Sending…",
    consentTitle: "SMS consent",
    consentCheck: "I agree to receive the SMS communications described above.",
    consentUnavailable:
      "The current consent notice is unavailable. The phone number cannot be changed now.",
    otpTitle: "Verify the new contact",
    otpIntro: "Enter the 6-digit code sent to",
    otp: "Verification code",
    verify: "Verify",
    verifying: "Verifying…",
    resend: "Resend code",
    resending: "Sending…",
    cancel: "Cancel request",
    cancelling: "Cancelling…",
    validFor: "Code valid for",
    sent: "A new code was sent.",
    success: "The contact was verified and updated.",
    cancelled: "The change request was cancelled.",
    generic:
      "The request could not be confirmed. Your profile was refreshed; check its state before trying again.",
    invalidDestination: "Check the contact information entered.",
    noChange: "This contact is already associated with your subscription.",
    conflict: "This contact cannot be used for this subscription.",
    invalidOtp: "The code is invalid. Check it and try again.",
    expired: "The code expired. Start the change again.",
    exhausted:
      "The maximum number of attempts was reached. Start the change again.",
    superseded: "This change request is no longer active.",
    deliveryFailed: "We could not send the verification code.",
    unavailableError: "This change is currently unavailable.",
    consentRequired: "You must accept the current SMS consent notice.",
    consentStale: "The consent notice changed. Review and accept it again.",
    suppressedError: "SMS is not available for this number.",
    sessionExpired: "Your access expired. Request a new access code.",
  },
} as const;

function countdown(expiresAt: string, now: number) {
  const seconds = Math.max(0, Math.ceil((Date.parse(expiresAt) - now) / 1000));
  return `${Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`;
}

export default function PopulationContactProfile({
  publicSlug,
  program,
  language,
  workflow,
  profile,
  onRefresh,
  onProgramRefresh,
  onSessionExpired,
}: {
  publicSlug: string;
  program: PublicPopulationProgram;
  language: Language;
  workflow: AuthenticatedPopulationWorkflowSession;
  profile: PopulationSubscriberProfile;
  onRefresh: () => Promise<void>;
  onProgramRefresh: () => Promise<void>;
  onSessionExpired: () => void;
}) {
  const t = copy[language];
  const [editing, setEditing] = useState<PopulationContactType | null>(null);
  const [destination, setDestination] = useState("");
  const [consent, setConsent] = useState(false);
  const [active, setActive] = useState<PopulationContactChangeSession | null>(
    () => readPopulationContactChangeSession(publicSlug, workflow.subscriberId),
  );
  const [otp, setOtp] = useState("");
  const [busy, setBusy] = useState<
    "initiate" | "verify" | "resend" | "cancel" | null
  >(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const errorRef = useRef<HTMLDivElement>(null);
  const disclosure =
    language === "en"
      ? program.consentTextEN || program.consentTextFR
      : program.consentTextFR;

  useEffect(() => {
    if (!active) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [active]);

  const terminal = (message: string) => {
    clearPopulationContactChangeSession(publicSlug);
    setActive(null);
    setEditing(null);
    setDestination("");
    setConsent(false);
    setOtp("");
    setNotice(message);
    void onRefresh();
  };

  const handleError = async (caught: unknown) => {
    const apiError = caught instanceof PublicPopulationApiError ? caught : null;
    const reason = apiError?.reason as
      | PopulationContactChangeErrorCode
      | undefined;
    if (
      reason === "CONTACT_CHANGE_NOT_AUTHORIZED" ||
      apiError?.status === 401 ||
      apiError?.status === 403
    ) {
      clearPopulationContactChangeSession(publicSlug);
      onSessionExpired();
      return;
    }
    const messages: Partial<Record<PopulationContactChangeErrorCode, string>> =
      {
        CONTACT_CHANGE_INVALID_DESTINATION: t.invalidDestination,
        CONTACT_CHANGE_NO_CHANGE: t.noChange,
        CONTACT_CHANGE_CONFLICT: t.conflict,
        CONTACT_CHANGE_INVALID_OTP: t.invalidOtp,
        CONTACT_CHANGE_EXPIRED: t.expired,
        CONTACT_CHANGE_ATTEMPTS_EXHAUSTED: t.exhausted,
        CONTACT_CHANGE_CANCELLED: t.cancelled,
        CONTACT_CHANGE_SUPERSEDED: t.superseded,
        CONTACT_CHANGE_DELIVERY_FAILED: t.deliveryFailed,
        CONTACT_CHANGE_UNAVAILABLE: t.unavailableError,
        CONTACT_CHANGE_INVALID_CHALLENGE: t.unavailableError,
        CONTACT_CHANGE_RESEND_UNAVAILABLE: t.unavailableError,
        CONTACT_CHANGE_CONSENT_REQUIRED: t.consentRequired,
        CONTACT_CHANGE_CONSENT_STALE: t.consentStale,
        CONTACT_CHANGE_CHANNEL_DISABLED: t.unavailableError,
        CONTACT_CHANGE_DESTINATION_SUPPRESSED: t.suppressedError,
      };
    const terminalReasons: PopulationContactChangeErrorCode[] = [
      "CONTACT_CHANGE_EXPIRED",
      "CONTACT_CHANGE_ATTEMPTS_EXHAUSTED",
      "CONTACT_CHANGE_CANCELLED",
      "CONTACT_CHANGE_SUPERSEDED",
      "CONTACT_CHANGE_DELIVERY_FAILED",
    ];
    if (reason && terminalReasons.includes(reason))
      clearPopulationContactChangeSession(publicSlug);
    if (reason === "CONTACT_CHANGE_CONSENT_STALE") {
      clearPopulationContactChangeSession(publicSlug);
      setActive(null);
      setEditing("PHONE");
      setConsent(false);
      await Promise.all([onProgramRefresh(), onRefresh()]);
    } else if (reason && terminalReasons.includes(reason)) {
      setActive(null);
      setEditing(null);
      await onRefresh();
    } else if (!reason) {
      clearPopulationContactChangeSession(publicSlug);
      setActive(null);
      setEditing(null);
      await onRefresh();
    }
    setError((reason && messages[reason]) || t.generic);
    setOtp("");
    window.requestAnimationFrame(() => errorRef.current?.focus());
  };

  const initiate = async (event: FormEvent) => {
    event.preventDefault();
    if (!editing || !destination.trim() || busy) return;
    if (
      editing === "PHONE" &&
      (!consent || !disclosure || !program.consentVersion)
    )
      return;
    setBusy("initiate");
    setError(null);
    setNotice(null);
    try {
      const result = await initiatePopulationContactChange(
        publicSlug,
        workflow.subscriberId,
        editing,
        {
          accessToken: workflow.accessToken,
          ...(editing === "PHONE"
            ? {
                phone: destination.trim(),
                smsConsent: consent,
                consentVersion: program.consentVersion!,
              }
            : { email: destination.trim() }),
        },
      );
      if (!result.challengeToken) throw new Error("Missing challenge token");
      const session = savePopulationContactChangeSession({
        version: 1,
        publicSlug,
        subscriberId: workflow.subscriberId,
        type: editing,
        challengeToken: result.challengeToken,
        maskedProposedDestination: result.maskedProposedDestination,
        expiresAt: result.expiresAt,
      });
      setActive(session);
      setDestination("");
      setConsent(false);
      setOtp("");
      setNow(Date.now());
    } catch (caught) {
      await handleError(caught);
    } finally {
      setBusy(null);
    }
  };

  const verify = async (event: FormEvent) => {
    event.preventDefault();
    if (!active || !/^\d{6}$/.test(otp) || busy) return;
    setBusy("verify");
    setError(null);
    try {
      const result = await verifyPopulationContactChange(
        publicSlug,
        workflow.subscriberId,
        active.type,
        {
          accessToken: workflow.accessToken,
          challengeToken: active.challengeToken,
          code: otp,
        },
      );
      if (result.status === "APPLIED") terminal(t.success);
      else throw new Error("Unexpected contact state");
    } catch (caught) {
      await handleError(caught);
    } finally {
      setBusy(null);
    }
  };

  const resend = async () => {
    if (!active || busy) return;
    setBusy("resend");
    setError(null);
    setNotice(null);
    try {
      const result = await resendPopulationContactChange(
        publicSlug,
        workflow.subscriberId,
        active.type,
        {
          accessToken: workflow.accessToken,
          challengeToken: active.challengeToken,
        },
      );
      const updated = savePopulationContactChangeSession({
        ...active,
        expiresAt: result.expiresAt,
        maskedProposedDestination: result.maskedProposedDestination,
      });
      setActive(updated);
      setOtp("");
      setNow(Date.now());
      setNotice(t.sent);
    } catch (caught) {
      await handleError(caught);
    } finally {
      setBusy(null);
    }
  };

  const cancel = async () => {
    if (!active || busy) return;
    setBusy("cancel");
    setError(null);
    try {
      await cancelPopulationContactChange(
        publicSlug,
        workflow.subscriberId,
        active.type,
        {
          accessToken: workflow.accessToken,
          challengeToken: active.challengeToken,
        },
      );
      terminal(t.cancelled);
    } catch (caught) {
      await handleError(caught);
    } finally {
      setBusy(null);
    }
  };

  const channelCard = (type: PopulationContactType) => {
    const channel =
      type === "PHONE"
        ? profile.communications.phone
        : profile.communications.email;
    const label = type === "PHONE" ? t.phone : t.email;
    const Icon = type === "PHONE" ? MessageSquare : Mail;
    let detail: string = channel.effectivelyAvailable
      ? t.available
      : t.unavailable;
    if (type === "PHONE" && profile.communications.phone.suppressed)
      detail = t.suppressed;
    else if (!channel.programEnabled) detail = t.programDisabled;
    else if (!channel.localEnabled && channel.verified)
      detail = t.localDisabled;
    return (
      <article className={styles.communicationCard} key={type}>
        <div className={styles.communicationHeading}>
          <Icon size={20} aria-hidden="true" />
          <h3>{label}</h3>
        </div>
        <p className={styles.maskedDestination}>
          {channel.maskedDestination || t.notConfigured}
        </p>
        <p
          className={
            channel.verified
              ? styles.profileSuccess
              : styles.communicationWarning
          }
        >
          {channel.verified ? (
            <>
              <CheckCircle2 size={17} aria-hidden="true" />
              {t.verified}
            </>
          ) : (
            t.verificationRequired
          )}
        </p>
        <p className={styles.communicationDetail}>{detail}</p>
        {channel.actionRequired && (
          <p className={styles.communicationWarning}>
            {t.verificationRequired}
          </p>
        )}
        <button
          type="button"
          className={`${styles.button} ${styles.secondary}`}
          disabled={!channel.programEnabled || Boolean(active)}
          onClick={() => {
            setEditing(type);
            setError(null);
            setNotice(null);
          }}
        >
          {channel.exists ? t.change : t.add} {label.toLowerCase()}
        </button>
      </article>
    );
  };

  const secondsLeft = active
    ? Math.max(0, Math.ceil((Date.parse(active.expiresAt) - now) / 1000))
    : 0;
  return (
    <section
      className={styles.communicationsSection}
      aria-labelledby="population-communications-title"
    >
      <h2 id="population-communications-title">{t.communications}</h2>
      {notice && (
        <p className={styles.formNotice} role="status">
          {notice}
        </p>
      )}
      <div
        ref={errorRef}
        className={styles.formError}
        role="alert"
        aria-live="assertive"
        tabIndex={-1}
      >
        {error}
      </div>
      {!editing && !active && (
        <div className={styles.communicationGrid}>
          {channelCard("PHONE")}
          {channelCard("EMAIL")}
        </div>
      )}
      {editing && !active && (
        <form className={styles.contactChangeForm} onSubmit={initiate}>
          <button
            type="button"
            className={styles.closeButton}
            onClick={() => {
              setEditing(null);
              setDestination("");
              setConsent(false);
            }}
            aria-label={t.cancel}
          >
            <X size={20} />
          </button>
          <h3>
            {editing === "PHONE" ? t.destinationPhone : t.destinationEmail}
          </h3>
          <label className={styles.field}>
            <span>
              {editing === "PHONE" ? t.destinationPhone : t.destinationEmail}
            </span>
            <input
              autoFocus
              type={editing === "PHONE" ? "tel" : "email"}
              inputMode={editing === "PHONE" ? "tel" : "email"}
              autoComplete={editing === "PHONE" ? "tel" : "email"}
              value={destination}
              onChange={(event) => setDestination(event.target.value)}
              required
            />
          </label>
          {editing === "PHONE" && (
            <div className={styles.consentBlock}>
              <h4>{t.consentTitle}</h4>
              {disclosure && program.consentVersion ? (
                <>
                  <p>{disclosure}</p>
                  <label className={styles.consentCheck}>
                    <input
                      type="checkbox"
                      checked={consent}
                      onChange={(event) => setConsent(event.target.checked)}
                    />
                    <span>{t.consentCheck}</span>
                  </label>
                </>
              ) : (
                <p className={styles.communicationWarning}>
                  {t.consentUnavailable}
                </p>
              )}
            </div>
          )}
          <button
            className={`${styles.button} ${styles.primary} ${styles.submitButton}`}
            disabled={
              Boolean(busy) ||
              !destination.trim() ||
              (editing === "PHONE" &&
                (!consent || !disclosure || !program.consentVersion))
            }
          >
            {busy === "initiate" ? t.sending : t.continue}
          </button>
        </form>
      )}
      {active && (
        <div
          className={styles.contactChangeForm}
          role="region"
          aria-labelledby="contact-change-otp-title"
        >
          <h3 id="contact-change-otp-title">{t.otpTitle}</h3>
          <p>
            {t.otpIntro} <strong>{active.maskedProposedDestination}</strong>.
          </p>
          <form onSubmit={verify}>
            <label
              className={styles.otpLabel}
              htmlFor="population-contact-change-code"
            >
              {t.otp}
            </label>
            <input
              id="population-contact-change-code"
              className={styles.otpInput}
              value={otp}
              onChange={(event) =>
                setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))
              }
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              autoFocus
            />
            <p className={secondsLeft ? styles.otpTimer : styles.expiredTimer}>
              {secondsLeft
                ? `${t.validFor} ${countdown(active.expiresAt, now)}`
                : t.expired}
            </p>
            <button
              className={`${styles.button} ${styles.primary} ${styles.submitButton}`}
              disabled={Boolean(busy) || !secondsLeft || !/^\d{6}$/.test(otp)}
            >
              {busy === "verify" ? t.verifying : t.verify}
            </button>
          </form>
          <div className={styles.contactChangeActions}>
            <button
              type="button"
              className={styles.resendButton}
              onClick={resend}
              disabled={Boolean(busy) || !secondsLeft}
            >
              <RefreshCw size={17} />
              {busy === "resend" ? t.resending : t.resend}
            </button>
            <button
              type="button"
              className={styles.resendButton}
              onClick={cancel}
              disabled={Boolean(busy)}
            >
              {busy === "cancel" ? t.cancelling : t.cancel}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
