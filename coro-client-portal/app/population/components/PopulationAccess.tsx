"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2, Mail, MapPin, MessageSquare } from "lucide-react";
import {
  getPopulationSubscriberProfile,
  PublicPopulationApiError,
  requestPopulationAccess,
  updatePopulationSubscriberLanguage,
  verifyPopulationAccess,
  type PopulationSubscriberProfile,
  type PublicPopulationProgram,
} from "../lib/publicPopulationApi";
import {
  clearPopulationWorkflowSession,
  readPopulationWorkflowSession,
  saveAuthenticatedPopulationWorkflowSession,
  updateAuthenticatedPopulationLanguage,
  type AuthenticatedPopulationWorkflowSession,
} from "../lib/populationSession";
import PopulationLocation from "./PopulationLocation";
import styles from "./PopulationPublicShell.module.css";

type Language = "fr" | "en";
type Channel = "SMS" | "EMAIL";

const copy = {
  fr: {
    title: "Accéder à mon inscription", intro: "Recevez un code de vérification pour accéder à votre inscription.",
    email: "Courriel", sms: "SMS", destinationEmail: "Adresse courriel", destinationSms: "Numéro de téléphone",
    send: "Recevoir mon code", sending: "Envoi…", generic: "Si une inscription admissible correspond aux renseignements fournis, un code d’accès sera transmis.",
    requestError: "La demande n’a pas pu être effectuée. Vérifiez votre connexion et réessayez.", verifyTitle: "Vérifiez votre accès",
    verifyIntro: "Entrez le code à 6 chiffres reçu par le canal sélectionné.", code: "Code d’accès", validFor: "Code valide pendant",
    expired: "Ce code est expiré. Revenez en arrière pour demander un nouveau code.", verify: "Vérifier mon accès", verifying: "Vérification…",
    invalid: "Code d’accès invalide ou expiré.", back: "Retour", newCode: "Demander un nouveau code", profile: "Mon inscription",
    status: "Statut", active: "Inscription active", communications: "Communications", enabled: "activé", notConfigured: "non configuré",
    alertArea: "Secteur d’alerte", areaConfigured: "Secteur d’alerte configuré", language: "Langue", french: "Français", english: "Anglais",
    configure: "Configurer mon secteur d’alerte", changeLanguage: "Modifier la langue", loading: "Chargement de votre inscription…",
    profileError: "Votre session n’est plus valide. Demandez un nouveau code d’accès.", retryAccess: "Accéder à mon inscription",
  },
  en: {
    title: "Access my subscription", intro: "Receive a verification code to access your subscription.",
    email: "Email", sms: "SMS", destinationEmail: "Email address", destinationSms: "Phone number",
    send: "Send my code", sending: "Sending…", generic: "If an eligible subscription matches the information provided, an access code will be sent.",
    requestError: "The request could not be completed. Check your connection and try again.", verifyTitle: "Verify your access",
    verifyIntro: "Enter the 6-digit code received through the selected channel.", code: "Access code", validFor: "Code valid for",
    expired: "This code has expired. Go back to request a new code.", verify: "Verify my access", verifying: "Verifying…",
    invalid: "Invalid or expired access code.", back: "Back", newCode: "Request a new code", profile: "My subscription",
    status: "Status", active: "Subscription active", communications: "Communications", enabled: "enabled", notConfigured: "not configured",
    alertArea: "Alert area", areaConfigured: "Alert area configured", language: "Language", french: "French", english: "English",
    configure: "Configure my alert area", changeLanguage: "Change language", loading: "Loading your subscription…",
    profileError: "Your session is no longer valid. Request a new access code.", retryAccess: "Access my subscription",
  },
} as const;

function duration(seconds: number) {
  return `${Math.floor(seconds / 60).toString().padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`;
}

export default function PopulationAccess({ publicSlug, program, language, onBack, onLanguageChange }: {
  publicSlug: string; program: PublicPopulationProgram; language: Language; onBack: () => void; onLanguageChange: (language: Language) => void;
}) {
  const t = copy[language];
  const restored = readPopulationWorkflowSession(publicSlug);
  const initialAuth = restored?.state === "AUTHENTICATED" ? restored : null;
  const defaultChannel: Channel = program.emailEnabled ? "EMAIL" : "SMS";
  const [channel, setChannel] = useState<Channel>(defaultChannel);
  const [destination, setDestination] = useState("");
  const [requestToken, setRequestToken] = useState<string | null>(null);
  const [requestExpiresAt, setRequestExpiresAt] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [workflow, setWorkflow] = useState<AuthenticatedPopulationWorkflowSession | null>(initialAuth);
  const [profile, setProfile] = useState<PopulationSubscriberProfile | null>(null);
  const [locationOpen, setLocationOpen] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const inFlight = useRef(false);
  const errorRef = useRef<HTMLDivElement>(null);

  const loadProfile = useCallback(async (session: AuthenticatedPopulationWorkflowSession) => {
    try {
      const result = await getPopulationSubscriberProfile(publicSlug, session.subscriberId, session.accessToken);
      setProfile(result);
      const updated = { ...session, preferredLanguage: result.preferredLanguage, locationConfigured: result.locationConfigured, locationResolvedAt: result.locationResolvedAt };
      setWorkflow(updateAuthenticatedPopulationLanguage(updated, result.preferredLanguage));
      onLanguageChange(result.preferredLanguage === "EN" ? "en" : "fr");
      setError(null);
    } catch (caught) {
      const apiError = caught instanceof PublicPopulationApiError ? caught : null;
      if (apiError?.status === 400 || apiError?.status === 401 || apiError?.status === 403) {
        clearPopulationWorkflowSession(publicSlug);
        setWorkflow(null);
        setProfile(null);
      }
      setError(t.profileError);
    }
  }, [onLanguageChange, publicSlug, t.profileError]);

  useEffect(() => { if (workflow) void loadProfile(workflow); }, []); // Restore a valid authenticated browser session once.
  useEffect(() => {
    if (!requestExpiresAt) return;
    const timer = window.setInterval(() => {
      const current = Date.now();
      setNow(current);
      if (Date.parse(requestExpiresAt) <= current) {
        setRequestToken(null);
        setRequestExpiresAt(null);
        setCode("");
        setNotice(null);
        setError(t.expired);
      }
    }, 1000);
    return () => window.clearInterval(timer);
  }, [requestExpiresAt, t.expired]);
  useEffect(() => {
    if (!workflow) return;
    const remaining = Date.parse(workflow.accessTokenExpiresAt) - Date.now();
    if (remaining <= 0) {
      clearPopulationWorkflowSession(publicSlug);
      setWorkflow(null);
      setProfile(null);
      setError(t.profileError);
      return;
    }
    const timer = window.setTimeout(() => {
      clearPopulationWorkflowSession(publicSlug);
      setWorkflow(null);
      setProfile(null);
      setError(t.profileError);
    }, remaining);
    return () => window.clearTimeout(timer);
  }, [publicSlug, t.profileError, workflow]);

  const request = async (event: FormEvent) => {
    event.preventDefault();
    if (!destination.trim() || inFlight.current) return;
    inFlight.current = true; setBusy(true); setError(null); setNotice(null);
    try {
      const result = await requestPopulationAccess(publicSlug, { channel, destination: destination.trim() });
      setDestination("");
      setRequestToken(result.accessRequestToken);
      setRequestExpiresAt(result.expiresAt);
      setNow(Date.now());
      setNotice(t.generic);
    } catch {
      setError(t.requestError);
      window.requestAnimationFrame(() => errorRef.current?.focus());
    } finally { inFlight.current = false; setBusy(false); }
  };

  const verify = async (event: FormEvent) => {
    event.preventDefault();
    if (!requestToken || !/^\d{6}$/.test(code) || inFlight.current) return;
    inFlight.current = true; setBusy(true); setError(null);
    try {
      const result = await verifyPopulationAccess(publicSlug, { accessRequestToken: requestToken, code });
      setCode(""); setRequestToken(null); setRequestExpiresAt(null);
      const session = saveAuthenticatedPopulationWorkflowSession({
        publicSlug, subscriberId: result.subscriberId, preferredLanguage: language === "fr" ? "FR" : "EN",
        accessToken: result.accessToken, accessTokenExpiresInSeconds: result.accessTokenExpiresInSeconds,
      });
      setWorkflow(session);
      await loadProfile(session);
    } catch (caught) {
      const apiError = caught instanceof PublicPopulationApiError ? caught : null;
      setError(apiError?.status === 400 ? t.invalid : t.requestError);
      setCode("");
      window.requestAnimationFrame(() => errorRef.current?.focus());
    } finally { inFlight.current = false; setBusy(false); }
  };

  if (workflow && locationOpen) return <PopulationLocation workflow={workflow} language={language} onWorkflowChange={(next) => { setWorkflow(next); }} onCancel={() => setLocationOpen(false)} onDefer={() => setLocationOpen(false)} onFinish={() => { setLocationOpen(false); void loadProfile(workflow); }} onSessionExpired={() => { clearPopulationWorkflowSession(publicSlug); setWorkflow(null); setProfile(null); setLocationOpen(false); }} />;

  if (workflow) {
    if (!profile) return <main className={styles.formMain}><section className={styles.profileSection}><p>{error || t.loading}</p>{error && <button className={`${styles.button} ${styles.primary}`} onClick={() => { setError(null); void loadProfile(workflow); }}>{t.retryAccess}</button>}</section></main>;
    const changeLanguage = async () => {
      const next = profile.preferredLanguage === "FR" ? "EN" : "FR";
      try {
        await updatePopulationSubscriberLanguage(publicSlug, workflow.subscriberId, workflow.accessToken, next);
        const updated = updateAuthenticatedPopulationLanguage(workflow, next);
        setWorkflow(updated); setProfile({ ...profile, preferredLanguage: next }); onLanguageChange(next === "EN" ? "en" : "fr");
      } catch { setError(t.profileError); }
    };
    return <main className={styles.formMain}><section className={styles.profileSection}>
      <h1>{t.profile}</h1>
      <div className={styles.profileRows}>
        <div><h2>{t.status}</h2><p className={styles.profileSuccess}><CheckCircle2 size={18} />{t.active}</p></div>
        <div><h2>{t.communications}</h2><p>{t.email}: {profile.channels.email.enabled ? `${t.enabled} — ${profile.channels.email.destination}` : t.notConfigured}</p><p>{t.sms}: {profile.channels.sms.enabled ? `${t.enabled} — ${profile.channels.sms.destination}` : t.notConfigured}</p></div>
        <div><h2>{t.alertArea}</h2><p>{profile.locationConfigured ? <><CheckCircle2 size={18} />{t.areaConfigured}</> : t.notConfigured}</p></div>
        <div><h2>{t.language}</h2><p>{profile.preferredLanguage === "FR" ? t.french : t.english}</p></div>
      </div>
      <div ref={errorRef} className={styles.formError} role="alert">{error}</div>
      <div className={styles.postVerificationActions}><button className={`${styles.button} ${styles.primary}`} onClick={() => setLocationOpen(true)}><MapPin size={18} />{t.configure}</button><button className={`${styles.button} ${styles.secondary}`} onClick={changeLanguage}>{t.changeLanguage}</button></div>
    </section></main>;
  }

  const secondsLeft = requestExpiresAt ? Math.max(0, Math.ceil((Date.parse(requestExpiresAt) - now) / 1000)) : 0;
  if (requestToken) return <main className={styles.formMain}><section className={styles.otpSection}>
    <button className={styles.backButton} type="button" onClick={() => { setRequestToken(null); setRequestExpiresAt(null); setCode(""); setNotice(null); }}><ArrowLeft size={17} />{t.newCode}</button>
    <h1>{t.verifyTitle}</h1><p className={styles.formIntro}>{t.verifyIntro}</p><p className={styles.channelNotice}>{notice}</p>
    <form onSubmit={verify}><label className={styles.otpLabel} htmlFor="population-access-code">{t.code}</label><input id="population-access-code" className={styles.otpInput} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" maxLength={6} autoFocus />
      <p className={secondsLeft ? styles.otpTimer : styles.expiredTimer}>{secondsLeft ? `${t.validFor} ${duration(secondsLeft)}` : t.expired}</p><div ref={errorRef} className={styles.formError} role="alert" aria-live="assertive" tabIndex={-1}>{error}</div><button className={`${styles.button} ${styles.primary} ${styles.submitButton}`} disabled={busy || !secondsLeft || !/^\d{6}$/.test(code)}>{busy ? t.verifying : t.verify}<ArrowRight size={17} /></button></form>
  </section></main>;

  return <main className={styles.formMain}><button className={styles.backButton} onClick={onBack}><ArrowLeft size={17} />{t.back}</button><section className={styles.formSection}><h1>{t.title}</h1><p className={styles.formIntro}>{t.intro}</p>
    <form onSubmit={request} noValidate><div className={styles.channelSelector}>
      {program.emailEnabled && <button type="button" aria-pressed={channel === "EMAIL"} onClick={() => { setChannel("EMAIL"); setDestination(""); }}><Mail size={18} />{t.email}</button>}
      {program.smsEnabled && <button type="button" aria-pressed={channel === "SMS"} onClick={() => { setChannel("SMS"); setDestination(""); }}><MessageSquare size={18} />{t.sms}</button>}
    </div><label className={styles.field}><span>{channel === "EMAIL" ? t.destinationEmail : t.destinationSms}</span><input type={channel === "EMAIL" ? "email" : "tel"} inputMode={channel === "EMAIL" ? "email" : "tel"} autoComplete={channel === "EMAIL" ? "email" : "tel"} value={destination} onChange={(event) => setDestination(event.target.value)} required /></label>
      <div ref={errorRef} className={styles.formError} role="alert" aria-live="assertive" tabIndex={-1}>{error}</div><button className={`${styles.button} ${styles.primary} ${styles.submitButton}`} disabled={busy || !destination.trim()}>{busy ? t.sending : t.send}<ArrowRight size={17} /></button></form></section></main>;
}
