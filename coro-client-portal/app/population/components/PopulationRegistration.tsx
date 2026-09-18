"use client";

import {
  FormEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { ArrowLeft, ArrowRight, CheckCircle2, Mail, MessageSquare } from "lucide-react";
import {
  PublicPopulationApiError,
  registerPopulationSubscriber,
  type PublicPopulationProgram,
} from "../lib/publicPopulationApi";
import {
  readPopulationWorkflowSession,
  savePopulationWorkflowSession,
  type PopulationWorkflowSession,
} from "../lib/populationSession";
import styles from "./PopulationPublicShell.module.css";

type Language = "fr" | "en";

const copy = {
  fr: {
    title: "S’inscrire aux alertes",
    intro: "Choisissez comment vous souhaitez recevoir les alertes importantes de ce programme.",
    phone: "Téléphone",
    phoneHint: "Numéro pouvant recevoir des messages texte.",
    email: "Courriel",
    emailHint: "Adresse courriel utilisée pour recevoir les alertes.",
    required: "Fournissez au moins un numéro de téléphone ou un courriel valide.",
    invalidPhone: "Entrez un numéro de téléphone valide.",
    invalidEmail: "Entrez une adresse courriel valide.",
    verificationSms: "Le premier code de vérification sera envoyé par SMS.",
    verificationEmail: "Le premier code de vérification sera envoyé par courriel.",
    consentTitle: "Consentement",
    privacy: "Confidentialité",
    consentCheck: "J’accepte le consentement présenté ci-dessus.",
    consentMissing: "Vous devez accepter le consentement pour continuer.",
    consentUnavailable: "L’inscription est temporairement indisponible parce que le consentement du programme n’est pas configuré.",
    submit: "Créer mon inscription",
    submitting: "Création de l’inscription…",
    back: "Retour",
    error: "L’inscription n’a pas pu être créée. Vérifiez les renseignements et réessayez.",
    closed: "Les nouvelles inscriptions sont actuellement fermées.",
    sent: "Code de vérification envoyé",
    sentSms: "Un code à 6 chiffres a été envoyé par SMS.",
    sentEmail: "Un code à 6 chiffres a été envoyé par courriel.",
    continue: "Continuer",
    continueNote: "La saisie du code sera disponible à la prochaine étape.",
  },
  en: {
    title: "Sign up for alerts",
    intro: "Choose how you would like to receive important alerts from this program.",
    phone: "Phone",
    phoneHint: "A number that can receive text messages.",
    email: "Email",
    emailHint: "The email address used to receive alerts.",
    required: "Provide at least one valid phone number or email address.",
    invalidPhone: "Enter a valid phone number.",
    invalidEmail: "Enter a valid email address.",
    verificationSms: "The first verification code will be sent by SMS.",
    verificationEmail: "The first verification code will be sent by email.",
    consentTitle: "Consent",
    privacy: "Privacy",
    consentCheck: "I agree to the consent presented above.",
    consentMissing: "You must agree to the consent to continue.",
    consentUnavailable: "Registration is temporarily unavailable because the program consent is not configured.",
    submit: "Create my registration",
    submitting: "Creating registration…",
    back: "Back",
    error: "Registration could not be created. Check the information and try again.",
    closed: "New registrations are currently closed.",
    sent: "Verification code sent",
    sentSms: "A 6-digit code was sent by SMS.",
    sentEmail: "A 6-digit code was sent by email.",
    continue: "Continue",
    continueNote: "Code entry will be available in the next step.",
  },
} as const;

function isValidPhone(value: string) {
  const compact = value.replace(/[\s().+-]/g, "");
  return compact.length >= 7 && compact.length <= 20 && /^\d+$/.test(compact);
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export default function PopulationRegistration({
  publicSlug,
  program,
  language,
  onBack,
}: {
  publicSlug: string;
  program: PublicPopulationProgram;
  language: Language;
  onBack: () => void;
}) {
  const t = copy[language];
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [consented, setConsented] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [workflow, setWorkflow] = useState<PopulationWorkflowSession | null>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const consentRef = useRef<HTMLInputElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  const inFlightRef = useRef(false);

  useEffect(() => {
    setWorkflow(readPopulationWorkflowSession(publicSlug));
  }, [publicSlug]);

  const consentText =
    language === "en"
      ? program.consentTextEN || program.consentTextFR
      : program.consentTextFR;
  const privacyText =
    language === "en"
      ? program.privacyTextEN || program.privacyTextFR
      : program.privacyTextFR;

  if (workflow) {
    const sentBySms = workflow.verification.channel === "SMS";
    return (
      <main className={styles.formMain}>
        <section className={styles.confirmation}>
          <span className={styles.confirmationIcon}><CheckCircle2 size={27} /></span>
          <h1>{t.sent}</h1>
          <p>{sentBySms ? t.sentSms : t.sentEmail}</p>
          <p className={styles.muted}>{t.continueNote}</p>
          <button className={`${styles.button} ${styles.primary}`} type="button" disabled>
            {t.continue}<ArrowRight size={17} />
          </button>
          <button className={styles.backButton} type="button" onClick={onBack}>
            <ArrowLeft size={17} />{t.back}
          </button>
        </section>
      </main>
    );
  }

  const phoneValid = !phone.trim() || isValidPhone(phone.trim());
  const trimmedEmail = email.trim();
  const emailValid = !trimmedEmail || isValidEmail(trimmedEmail);
  const hasDestination =
    (program.smsEnabled && !!phone.trim() && phoneValid) ||
    (program.emailEnabled && !!trimmedEmail && emailValid);
  const canSubmit =
    program.registrationEnabled &&
    !!program.consentVersion &&
    hasDestination &&
    phoneValid &&
    emailValid &&
    consented &&
    !submitting;
  const firstChannel = program.smsEnabled && phone.trim() ? "SMS" : "EMAIL";

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (inFlightRef.current) return;

    const nextErrors: Record<string, string> = {};
    if (phone.trim() && !phoneValid) nextErrors.phone = t.invalidPhone;
    if (trimmedEmail && !emailValid) nextErrors.email = t.invalidEmail;
    if (!hasDestination) nextErrors.destination = t.required;
    if (!consented) nextErrors.consent = t.consentMissing;
    setFieldErrors(nextErrors);
    setError(null);

    if (Object.keys(nextErrors).length || !program.consentVersion) {
      if (nextErrors.phone || nextErrors.destination) phoneRef.current?.focus();
      else if (nextErrors.email) emailRef.current?.focus();
      else consentRef.current?.focus();
      return;
    }

    inFlightRef.current = true;
    setSubmitting(true);
    try {
      const result = await registerPopulationSubscriber(publicSlug, {
        ...(program.smsEnabled && phone.trim() ? { phone: phone.trim() } : {}),
        ...(program.emailEnabled && trimmedEmail ? { email: trimmedEmail } : {}),
        preferredLanguage: language === "fr" ? "FR" : "EN",
        consentVersion: program.consentVersion,
      });
      setPhone("");
      setEmail("");
      setConsented(false);
      setWorkflow(savePopulationWorkflowSession(publicSlug, result));
    } catch (caught: unknown) {
      setError(
        caught instanceof PublicPopulationApiError && caught.status === 400
          ? program.registrationEnabled
            ? t.error
            : t.closed
          : t.error,
      );
      window.requestAnimationFrame(() => errorRef.current?.focus());
    } finally {
      inFlightRef.current = false;
      setSubmitting(false);
    }
  };

  return (
    <main className={styles.formMain}>
      <button className={styles.backButton} type="button" onClick={onBack}>
        <ArrowLeft size={17} />{t.back}
      </button>
      <section className={styles.formSection}>
        <h1>{t.title}</h1>
        <p className={styles.formIntro}>{t.intro}</p>
        <form onSubmit={submit} noValidate>
          <div className={styles.fields}>
            {program.smsEnabled && (
              <label className={styles.field}>
                <span><MessageSquare size={17} />{t.phone}</span>
                <input ref={phoneRef} type="tel" inputMode="tel" autoComplete="tel" value={phone} onChange={(event) => setPhone(event.target.value)} onBlur={() => setFieldErrors((current) => ({ ...current, phone: phone.trim() && !isValidPhone(phone.trim()) ? t.invalidPhone : "" }))} aria-invalid={!!fieldErrors.phone} aria-describedby="population-phone-help population-phone-error" />
                <small id="population-phone-help">{t.phoneHint}</small>
                {fieldErrors.phone && <small id="population-phone-error" className={styles.fieldError}>{fieldErrors.phone}</small>}
              </label>
            )}
            {program.emailEnabled && (
              <label className={styles.field}>
                <span><Mail size={17} />{t.email}</span>
                <input ref={emailRef} type="email" inputMode="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} onBlur={() => setFieldErrors((current) => ({ ...current, email: email.trim() && !isValidEmail(email.trim()) ? t.invalidEmail : "" }))} aria-invalid={!!fieldErrors.email} aria-describedby="population-email-help population-email-error" />
                <small id="population-email-help">{t.emailHint}</small>
                {fieldErrors.email && <small id="population-email-error" className={styles.fieldError}>{fieldErrors.email}</small>}
              </label>
            )}
          </div>
          {fieldErrors.destination && <p className={styles.fieldError}>{fieldErrors.destination}</p>}
          {hasDestination && <p className={styles.channelNotice}>{firstChannel === "SMS" ? t.verificationSms : t.verificationEmail}</p>}
          <div className={styles.consentBlock}>
            <h2>{t.consentTitle}</h2>
            {consentText ? <p>{consentText}</p> : <p className={styles.fieldError}>{t.consentUnavailable}</p>}
            {privacyText && <details className={styles.details}><summary>{t.privacy}</summary><p>{privacyText}</p></details>}
            <label className={styles.consentCheck}>
              <input ref={consentRef} type="checkbox" checked={consented} onChange={(event) => setConsented(event.target.checked)} aria-invalid={!!fieldErrors.consent} />
              <span>{t.consentCheck}</span>
            </label>
            {fieldErrors.consent && <p className={styles.fieldError}>{fieldErrors.consent}</p>}
          </div>
          <div ref={errorRef} className={styles.formError} role="alert" aria-live="polite" tabIndex={-1}>{error}</div>
          <button className={`${styles.button} ${styles.primary} ${styles.submitButton}`} type="submit" disabled={!canSubmit}>
            {submitting ? t.submitting : t.submit}<ArrowRight size={17} />
          </button>
        </form>
      </section>
    </main>
  );
}
