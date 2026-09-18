"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  BellRing,
  CheckCircle2,
  Globe2,
  LogIn,
  Mail,
  MessageSquare,
  Phone,
  RefreshCw,
  ShieldCheck,
  UserPlus,
} from "lucide-react";
import {
  getPublicPopulationProgram,
  PublicPopulationApiError,
  type PublicPopulationProgram,
} from "../lib/publicPopulationApi";
import PopulationRegistration from "./PopulationRegistration";
import PopulationAccess from "./PopulationAccess";
import { clearPopulationWorkflowSession, readPopulationWorkflowSession } from "../lib/populationSession";
import styles from "./PopulationPublicShell.module.css";

type Language = "fr" | "en";
type View = "home" | "register" | "access";
type Status = "loading" | "ready" | "not-found" | "error";
const text = {
  fr: {
    brand: "Sentinelle Population",
    eyebrow: "Programme d’alerte locale",
    promise:
      "Recevez les alertes importantes qui peuvent concerner votre secteur.",
    sms: "Alertes par SMS",
    email: "Alertes par courriel",
    register: "M’inscrire aux alertes",
    access: "Accéder à mon inscription",
    closed:
      "Les nouvelles inscriptions sont actuellement fermées. Les personnes déjà inscrites peuvent toujours accéder à leur inscription.",
    why: "Pourquoi s’inscrire?",
    benefits: [
      "Recevoir rapidement une alerte.",
      "Obtenir les consignes de protection.",
      "Recevoir les mises à jour et la fin d’alerte.",
    ],
    privacy: "Confidentialité",
    privacySummary:
      "La localisation peut servir à déterminer si votre secteur est concerné par une alerte. Votre position individuelle n’est pas affichée aux exploitants sur leur carte opérationnelle.",
    more: "En savoir plus",
    privacyFact:
      "L’adresse saisie pour configurer votre secteur d’alerte n’est pas conservée. CORO conserve uniquement les données nécessaires au ciblage des alertes. Votre position individuelle n’est pas affichée aux exploitants sur la carte opérationnelle.",
    contact: "Contact du programme",
    powered: "Propulsé par CORO",
    loading: "Chargement du programme d’alerte",
    unavailable: "Ce programme d’alerte n’est pas disponible.",
    unavailableHelp:
      "Vérifiez le lien ou communiquez avec l’organisation qui vous l’a transmis.",
    network: "Impossible de charger le programme.",
    networkHelp: "Vérifiez votre connexion, puis réessayez.",
    retry: "Réessayer",
    nextRegister: "Inscription aux alertes",
    nextAccess: "Accès à mon inscription",
    nextMessage: "Cette étape sera disponible dans le prochain lot.",
    back: "Retour à l’information du programme",
  },
  en: {
    brand: "Sentinelle Population",
    eyebrow: "Local alert program",
    promise: "Receive important alerts that may affect your area.",
    sms: "SMS alerts",
    email: "Email alerts",
    register: "Sign up for alerts",
    access: "Access my subscription",
    closed:
      "New registrations are currently closed. Existing subscribers can still access their subscription.",
    why: "Why sign up?",
    benefits: [
      "Receive alerts quickly.",
      "Get protective instructions.",
      "Receive updates and the all-clear.",
    ],
    privacy: "Privacy",
    privacySummary:
      "Location may be used to determine whether your area is affected by an alert. Your individual position is not shown to operators on their operational map.",
    more: "Learn more",
    privacyFact:
      "The address entered to configure your alert area is not retained. CORO retains only the data needed to target alerts. Your individual position is not shown to operators on the operational map.",
    contact: "Program contact",
    powered: "Powered by CORO",
    loading: "Loading alert program",
    unavailable: "This alert program is not available.",
    unavailableHelp:
      "Check the link or contact the organization that shared it with you.",
    network: "Unable to load the program.",
    networkHelp: "Check your connection and try again.",
    retry: "Try again",
    nextRegister: "Alert registration",
    nextAccess: "Subscription access",
    nextMessage: "This step will be available in the next release.",
    back: "Back to program information",
  },
} as const;

function safeWebsite(value: string | null) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:"
      ? url.href
      : null;
  } catch {
    return null;
  }
}

export default function PopulationPublicShell({
  publicSlug,
}: {
  publicSlug: string;
}) {
  const [language, setLanguage] = useState<Language>("fr");
  const [view, setView] = useState<View>("home");
  const [status, setStatus] = useState<Status>("loading");
  const [program, setProgram] = useState<PublicPopulationProgram | null>(null);
  const t = text[language];
  const load = useCallback(
    (signal?: AbortSignal) => {
      setStatus("loading");
      getPublicPopulationProgram(publicSlug, signal)
        .then((data) => {
          setProgram(data);
          setStatus("ready");
        })
        .catch((error: unknown) => {
          if (signal?.aborted) return;
          setStatus(
            error instanceof PublicPopulationApiError && error.status === 404
              ? "not-found"
              : "error",
          );
        });
    },
    [publicSlug],
  );
  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);
  useEffect(() => {
    const workflow = readPopulationWorkflowSession(publicSlug);
    if (!workflow) return;
    setLanguage(workflow.preferredLanguage === "EN" ? "en" : "fr");
    setView(workflow.state === "AUTHENTICATED" ? "access" : "register");
  }, [publicSlug]);
  const languages = (
    <div
      className={styles.languages}
      aria-label={language === "fr" ? "Choix de langue" : "Language selection"}
    >
      <button
        type="button"
        aria-pressed={language === "fr"}
        onClick={() => setLanguage("fr")}
      >
        FR
      </button>
      <button
        type="button"
        aria-pressed={language === "en"}
        onClick={() => setLanguage("en")}
      >
        EN
      </button>
    </div>
  );
  if (status === "loading")
    return (
      <main className={styles.state} aria-busy="true" aria-label={t.loading}>
        <div className={styles.skeleton}>
          <div className={styles.line} style={{ width: "34%" }} />
          <div className={styles.line} style={{ width: "88%", height: 46 }} />
          <div className={styles.line} style={{ width: "72%" }} />
          <div
            className={styles.line}
            style={{ width: "100%", height: 50, marginTop: 28 }}
          />
        </div>
      </main>
    );
  if (status === "not-found" || status === "error" || !program) {
    const missing = status === "not-found";
    return (
      <main className={styles.state}>
        <div className={styles.stateContent}>
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              marginBottom: 28,
            }}
          >
            {languages}
          </div>
          <div className={styles.stateIcon}>
            <AlertCircle size={26} />
          </div>
          <h1>{missing ? t.unavailable : t.network}</h1>
          <p>{missing ? t.unavailableHelp : t.networkHelp}</p>
          {!missing && (
            <button
              className={styles.retry}
              type="button"
              onClick={() => load()}
            >
              <RefreshCw size={17} />
              {t.retry}
            </button>
          )}
        </div>
      </main>
    );
  }
  const programName =
    language === "en" ? program.nameEN || program.nameFR : program.nameFR;
  const siteName = program.site?.name || programName;
  const description =
    language === "en"
      ? program.descriptionEN || program.descriptionFR
      : program.descriptionFR;
  const privacy =
    language === "en"
      ? program.privacyTextEN || program.privacyTextFR
      : program.privacyTextFR;
  const website = safeWebsite(program.websiteUrl);
  const openAccess = () => {
    const workflow = readPopulationWorkflowSession(publicSlug);
    if (workflow?.state === "PENDING") clearPopulationWorkflowSession(publicSlug);
    setView("access");
  };
  const header = (
    <header className={styles.header}>
      <div className={styles.bar}>
        <div className={styles.brand}>
          <span className={styles.mark}>
            <BellRing size={17} />
          </span>
          {t.brand}
        </div>
        {languages}
      </div>
    </header>
  );
  if (view === "register")
    return (
      <div className={styles.page}>
        {header}
        <PopulationRegistration
          publicSlug={publicSlug}
          program={program}
          language={language}
          onBack={() => setView("home")}
          onAccess={openAccess}
        />
        <footer className={styles.footer}>
          <div className={styles.footerInner}>{t.powered}</div>
        </footer>
      </div>
    );
  if (view === "access")
    return (
      <div className={styles.page}>
        {header}
        <PopulationAccess
          publicSlug={publicSlug}
          program={program}
          language={language}
          onLanguageChange={setLanguage}
          onBack={() => setView("home")}
        />
        <footer className={styles.footer}>
          <div className={styles.footerInner}>{t.powered}</div>
        </footer>
      </div>
    );
  return (
    <div className={styles.page}>
      {header}
      <main className={styles.main}>
        <section className={styles.hero}>
          <p className={styles.eyebrow}>
            {t.brand} · {t.powered}
          </p>
          <h1 className={styles.title}>{siteName}</h1>
          {program.site && (
            <address className={styles.siteAddress}>
              <span>{program.site.address}</span>
              <span>
                {program.site.city}, {program.site.province}
                {program.site.postalCode ? ` ${program.site.postalCode}` : ""}
              </span>
            </address>
          )}
          <p className={styles.promise}>{t.promise}</p>
          {description && <p className={styles.description}>{description}</p>}
          <div
            className={styles.channels}
            aria-label={
              language === "fr" ? "Canaux disponibles" : "Available channels"
            }
          >
            {program.smsEnabled && (
              <span className={styles.channel}>
                <MessageSquare size={17} />
                {t.sms}
              </span>
            )}
            {program.emailEnabled && (
              <span className={styles.channel}>
                <Mail size={17} />
                {t.email}
              </span>
            )}
          </div>
          {!program.registrationEnabled && (
            <p className={styles.closed}>{t.closed}</p>
          )}
          <div className={styles.actions}>
            <button
              className={`${styles.button} ${styles.primary}`}
              type="button"
              disabled={!program.registrationEnabled}
              onClick={() => {
                if (program.registrationEnabled) setView("register");
              }}
            >
              <UserPlus size={18} />
              {t.register}
              <ArrowRight size={17} />
            </button>
            <button
              className={`${styles.button} ${styles.secondary}`}
              type="button"
              onClick={openAccess}
            >
              <LogIn size={18} />
              {t.access}
            </button>
          </div>
        </section>
        <section className={styles.section}>
          <h2>{t.why}</h2>
          <ul className={styles.benefits}>
            {t.benefits.map((item) => (
              <li key={item}>
                <CheckCircle2 size={20} color="#176b4d" aria-hidden="true" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>
        <section className={styles.section}>
          <h2>{t.privacy}</h2>
          <p className={styles.privacy}>{t.privacySummary}</p>
          <details className={styles.details}>
            <summary>
              <ShieldCheck size={18} style={{ marginRight: 8 }} />
              {t.more}
            </summary>
            <p>{t.privacyFact}</p>
            {privacy && <p>{privacy}</p>}
          </details>
        </section>
        {(program.publicPhone || program.publicEmail || website) && (
          <section className={styles.section}>
            <h2>{t.contact}</h2>
            <div className={styles.contact}>
              {program.publicPhone && (
                <a href={`tel:${program.publicPhone}`}>
                  <Phone size={17} />
                  {program.publicPhone}
                </a>
              )}
              {program.publicEmail && (
                <a href={`mailto:${program.publicEmail}`}>
                  <Mail size={17} />
                  {program.publicEmail}
                </a>
              )}
              {website && (
                <a href={website} target="_blank" rel="noopener noreferrer">
                  <Globe2 size={17} />
                  {program.websiteUrl}
                </a>
              )}
            </div>
          </section>
        )}
      </main>
      <footer className={styles.footer}>
        <div className={styles.footerInner}>{t.powered}</div>
      </footer>
    </div>
  );
}
