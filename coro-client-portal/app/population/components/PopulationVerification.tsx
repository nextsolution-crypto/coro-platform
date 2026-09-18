"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2, MapPin, RefreshCw } from "lucide-react";
import {
  PublicPopulationApiError,
  resendPopulationVerification,
  verifyPopulationSubscriber,
} from "../lib/publicPopulationApi";
import {
  authenticatePopulationWorkflowSession,
  clearPopulationWorkflowSession,
  updatePopulationVerificationExpiry,
  type PendingPopulationWorkflowSession,
  type PopulationWorkflowSession,
} from "../lib/populationSession";
import styles from "./PopulationPublicShell.module.css";

type Language = "fr" | "en";

const text = {
  fr: {
    title: "Vérifiez votre inscription",
    sms: "Nous avons envoyé un code à 6 chiffres par message texte.",
    email: "Nous avons envoyé un code à 6 chiffres par courriel.",
    code: "Code de vérification",
    timer: "Code valide pendant",
    expired: "Ce code est expiré. Demandez-en un nouveau pour continuer.",
    verify: "Vérifier mon inscription",
    verifying: "Vérification…",
    noCode: "Vous n’avez pas reçu le code?",
    resend: "Renvoyer un code",
    resending: "Envoi…",
    resendIn: "Nouveau code disponible dans",
    resent: "Un nouveau code a été envoyé.",
    invalid: "Le code est invalide. Vérifiez les 6 chiffres et réessayez.",
    attempts: "Ce code ne peut plus être utilisé. Demandez-en un nouveau.",
    used: "Ce code n’est plus actif. Demandez-en un nouveau.",
    cooldown: "Veuillez attendre avant de demander un nouveau code.",
    tooMany: "Trop de codes ont été demandés. Réessayez plus tard.",
    unavailable: "Ce programme n’est plus disponible.",
    network: "La vérification n’a pas pu être effectuée. Vérifiez votre connexion et réessayez.",
    back: "Retour",
    confirmed: "Inscription confirmée",
    confirmedText: "Vous pouvez maintenant configurer votre secteur d’alerte afin que Sentinelle Population puisse déterminer si une communication concerne votre emplacement.",
    optional: "La localisation est facultative. Elle sert uniquement au ciblage géographique des alertes.",
    configure: "Configurer mon secteur d’alerte",
    later: "Plus tard",
    locationTitle: "Configuration du secteur d’alerte",
    locationPlaceholder: "Cette étape sera disponible dans le prochain lot.",
  },
  en: {
    title: "Verify your registration",
    sms: "We sent a 6-digit code by text message.",
    email: "We sent a 6-digit code by email.",
    code: "Verification code",
    timer: "Code valid for",
    expired: "This code has expired. Request a new one to continue.",
    verify: "Verify my registration",
    verifying: "Verifying…",
    noCode: "Didn’t receive the code?",
    resend: "Send a new code",
    resending: "Sending…",
    resendIn: "New code available in",
    resent: "A new code has been sent.",
    invalid: "The code is invalid. Check all 6 digits and try again.",
    attempts: "This code can no longer be used. Request a new one.",
    used: "This code is no longer active. Request a new one.",
    cooldown: "Please wait before requesting a new code.",
    tooMany: "Too many codes have been requested. Try again later.",
    unavailable: "This program is no longer available.",
    network: "Verification could not be completed. Check your connection and try again.",
    back: "Back",
    confirmed: "Registration confirmed",
    confirmedText: "You can now configure your alert area so Sentinelle Population can determine whether a communication concerns your location.",
    optional: "Location is optional. It is used only for geographic alert targeting.",
    configure: "Configure my alert area",
    later: "Later",
    locationTitle: "Alert area configuration",
    locationPlaceholder: "This step will be available in the next release.",
  },
} as const;

function formatDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, "0");
  const remaining = (seconds % 60).toString().padStart(2, "0");
  return `${minutes}:${remaining}`;
}

function initialCooldown(expiresAt: string) {
  const expires = Date.parse(expiresAt);
  return Number.isFinite(expires) ? expires - 9 * 60 * 1000 : Date.now();
}

export default function PopulationVerification({
  workflow,
  language,
  onWorkflowChange,
  onBack,
}: {
  workflow: PopulationWorkflowSession;
  language: Language;
  onWorkflowChange: (workflow: PopulationWorkflowSession) => void;
  onBack: () => void;
}) {
  const t = text[language];
  const [code, setCode] = useState("");
  const [now, setNow] = useState(Date.now());
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [forcedExpired, setForcedExpired] = useState(false);
  const [cooldownUntil, setCooldownUntil] = useState(
    workflow.state === "PENDING"
      ? initialCooldown(workflow.verification.expiresAt)
      : Date.now(),
  );
  const [locationPlaceholder, setLocationPlaceholder] = useState(false);
  const codeRef = useRef<HTMLInputElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  const verifyInFlight = useRef(false);
  const resendInFlight = useRef(false);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (workflow.state !== "AUTHENTICATED") return;
    const remaining = Date.parse(workflow.accessTokenExpiresAt) - Date.now();
    if (remaining <= 0) {
      clearPopulationWorkflowSession(workflow.publicSlug);
      onBack();
      return;
    }
    const timer = window.setTimeout(() => {
      clearPopulationWorkflowSession(workflow.publicSlug);
      onBack();
    }, remaining);
    return () => window.clearTimeout(timer);
  }, [onBack, workflow]);

  if (workflow.state === "AUTHENTICATED") {
    return (
      <main className={styles.formMain}>
        <section className={styles.confirmation}>
          <span className={styles.confirmationIcon}>
            {locationPlaceholder ? <MapPin size={27} /> : <CheckCircle2 size={27} />}
          </span>
          <h1>{locationPlaceholder ? t.locationTitle : t.confirmed}</h1>
          <p>{locationPlaceholder ? t.locationPlaceholder : t.confirmedText}</p>
          {!locationPlaceholder && <p className={styles.optionalNotice}>{t.optional}</p>}
          {locationPlaceholder ? (
            <button className={styles.backButton} type="button" onClick={() => setLocationPlaceholder(false)}>
              <ArrowLeft size={17} />{t.back}
            </button>
          ) : (
            <div className={styles.postVerificationActions}>
              <button className={`${styles.button} ${styles.primary}`} type="button" onClick={() => setLocationPlaceholder(true)}>
                <MapPin size={18} />{t.configure}<ArrowRight size={17} />
              </button>
              <button className={`${styles.button} ${styles.secondary}`} type="button" onClick={onBack}>
                {t.later}
              </button>
            </div>
          )}
        </section>
      </main>
    );
  }

  const expiresAt = Date.parse(workflow.verification.expiresAt);
  const secondsLeft = Math.max(0, Math.ceil((expiresAt - now) / 1000));
  const cooldownLeft = Math.max(0, Math.ceil((cooldownUntil - now) / 1000));
  const expired = forcedExpired || secondsLeft === 0;
  const complete = /^\d{6}$/.test(code);

  const focusError = () => window.requestAnimationFrame(() => errorRef.current?.focus());

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!complete || expired || verifyInFlight.current) return;
    verifyInFlight.current = true;
    setVerifying(true);
    setError(null);
    setNotice(null);
    try {
      const result = await verifyPopulationSubscriber(
        workflow.publicSlug,
        workflow.subscriberId,
        { channel: workflow.verification.channel, code },
      );
      setCode("");
      onWorkflowChange(
        authenticatePopulationWorkflowSession(
          workflow,
          result.accessToken,
          result.accessTokenExpiresInSeconds,
        ),
      );
    } catch (caught: unknown) {
      const apiError = caught instanceof PublicPopulationApiError ? caught : null;
      if (apiError?.reason === "INVALID_CODE") {
        setError(t.invalid);
        setCode("");
        window.requestAnimationFrame(() => codeRef.current?.focus());
      } else if (apiError?.reason === "EXPIRED_CODE") {
        setError(t.expired);
        setCode("");
        setForcedExpired(true);
      } else if (apiError?.reason === "TOO_MANY_ATTEMPTS") {
        setError(t.attempts);
        setCode("");
        setForcedExpired(true);
      } else if (apiError?.reason === "NO_ACTIVE_CODE" || apiError?.reason === "ALREADY_VERIFIED") {
        setError(t.used);
        setCode("");
        setForcedExpired(true);
      } else if (apiError?.status === 404) {
        setError(t.unavailable);
      } else {
        setError(t.network);
      }
      focusError();
    } finally {
      verifyInFlight.current = false;
      setVerifying(false);
    }
  };

  const resend = async () => {
    if (cooldownLeft > 0 || resendInFlight.current) return;
    resendInFlight.current = true;
    setResending(true);
    setError(null);
    setNotice(null);
    try {
      const result = await resendPopulationVerification(
        workflow.publicSlug,
        workflow.subscriberId,
        { channel: workflow.verification.channel },
      );
      const updated = updatePopulationVerificationExpiry(
        workflow,
        result.verificationExpiresAt,
      );
      onWorkflowChange(updated);
      setCode("");
      setForcedExpired(false);
      setCooldownUntil(Date.now() + 60 * 1000);
      setNotice(t.resent);
      window.requestAnimationFrame(() => codeRef.current?.focus());
    } catch (caught: unknown) {
      const apiError = caught instanceof PublicPopulationApiError ? caught : null;
      if (apiError?.reason === "RESEND_COOLDOWN") setError(t.cooldown);
      else if (apiError?.reason === "TOO_MANY_CODES") setError(t.tooMany);
      else if (apiError?.status === 404) setError(t.unavailable);
      else setError(t.network);
      focusError();
    } finally {
      resendInFlight.current = false;
      setResending(false);
    }
  };

  return (
    <main className={styles.formMain}>
      <section className={styles.otpSection}>
        <h1>{t.title}</h1>
        <p className={styles.formIntro}>
          {workflow.verification.channel === "SMS" ? t.sms : t.email}
        </p>
        <form onSubmit={submit}>
          <label className={styles.otpLabel} htmlFor="population-verification-code">{t.code}</label>
          <input
            ref={codeRef}
            id="population-verification-code"
            className={styles.otpInput}
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            enterKeyHint="done"
            maxLength={6}
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
            aria-invalid={!!error}
            autoFocus
          />
          <p className={expired ? styles.expiredTimer : styles.otpTimer}>
            {expired ? t.expired : `${t.timer} ${formatDuration(secondsLeft)}`}
          </p>
          <div ref={errorRef} className={styles.formError} role="alert" aria-live="assertive" tabIndex={-1}>{error}</div>
          <div className={styles.formNotice} role="status" aria-live="polite">{notice}</div>
          <button className={`${styles.button} ${styles.primary} ${styles.submitButton}`} type="submit" disabled={!complete || expired || verifying}>
            {verifying ? t.verifying : t.verify}<ArrowRight size={17} />
          </button>
        </form>
        <div className={styles.resendBlock}>
          <p>{t.noCode}</p>
          <button className={styles.resendButton} type="button" onClick={resend} disabled={resending || cooldownLeft > 0}>
            <RefreshCw size={16} />
            {resending ? t.resending : cooldownLeft > 0 ? `${t.resendIn} ${formatDuration(cooldownLeft)}` : t.resend}
          </button>
        </div>
      </section>
    </main>
  );
}
