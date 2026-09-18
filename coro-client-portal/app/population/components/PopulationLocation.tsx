"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2, MapPin, RefreshCw, ShieldCheck } from "lucide-react";
import {
  confirmPopulationLocation,
  PublicPopulationApiError,
  resolvePopulationLocation,
  type CanadianProvinceCode,
  type ResolvePopulationLocationResult,
} from "../lib/publicPopulationApi";
import {
  clearPopulationWorkflowSession,
  configurePopulationLocationSession,
  type AuthenticatedPopulationWorkflowSession,
} from "../lib/populationSession";
import styles from "./PopulationPublicShell.module.css";

type Language = "fr" | "en";
type Step = "form" | "confirm" | "unavailable" | "success";

const provinces: Array<{ code: CanadianProvinceCode; fr: string; en: string }> = [
  { code: "AB", fr: "Alberta", en: "Alberta" },
  { code: "BC", fr: "Colombie-Britannique", en: "British Columbia" },
  { code: "MB", fr: "Manitoba", en: "Manitoba" },
  { code: "NB", fr: "Nouveau-Brunswick", en: "New Brunswick" },
  { code: "NL", fr: "Terre-Neuve-et-Labrador", en: "Newfoundland and Labrador" },
  { code: "NS", fr: "Nouvelle-Écosse", en: "Nova Scotia" },
  { code: "NT", fr: "Territoires du Nord-Ouest", en: "Northwest Territories" },
  { code: "NU", fr: "Nunavut", en: "Nunavut" },
  { code: "ON", fr: "Ontario", en: "Ontario" },
  { code: "PE", fr: "Île-du-Prince-Édouard", en: "Prince Edward Island" },
  { code: "QC", fr: "Québec", en: "Quebec" },
  { code: "SK", fr: "Saskatchewan", en: "Saskatchewan" },
  { code: "YT", fr: "Yukon", en: "Yukon" },
];

const copy = {
  fr: {
    title: "Configurer mon secteur d’alerte",
    intro: "Indiquez l’adresse du lieu pour lequel vous souhaitez recevoir des alertes. Elle sera utilisée pour déterminer si ce secteur est concerné par une situation d’urgence.",
    optional: "Cette étape est facultative.",
    privacy: "L’adresse saisie est utilisée temporairement pour déterminer votre emplacement. Elle n’est pas conservée par CORO. Seules les coordonnées nécessaires au ciblage géographique sont conservées. Votre position individuelle n’est pas affichée aux exploitants sur leur carte opérationnelle.",
    address: "Adresse",
    city: "Ville",
    province: "Province ou territoire",
    postalCode: "Code postal (facultatif)",
    selectProvince: "Sélectionner",
    required: "Ce champ est requis.",
    postalInvalid: "Entrez un code postal canadien valide.",
    resolve: "Vérifier mon emplacement",
    resolving: "Vérification…",
    confirmTitle: "Confirmez votre secteur d’alerte",
    confirm: "Confirmer ce secteur",
    confirming: "Confirmation…",
    edit: "Modifier l’adresse",
    country: "Canada",
    invalid: "Vérifiez les renseignements et réessayez.",
    notFound: "Nous n’avons pas pu confirmer cette adresse. Vérifiez les renseignements et réessayez.",
    ambiguous: "Plusieurs emplacements peuvent correspondre. Précisez l’adresse.",
    unavailable: "La configuration du secteur d’alerte est temporairement indisponible. Votre inscription demeure active. Vous pourrez compléter cette étape plus tard.",
    retry: "Réessayer",
    later: "Plus tard",
    expired: "Cette vérification a expiré. Veuillez vérifier de nouveau l’adresse.",
    stale: "Cette vérification n’est plus valide. Veuillez vérifier de nouveau l’adresse.",
    session: "Votre session a expiré. Revenez à l’accès à votre inscription pour continuer.",
    access: "Revenir à l’accès",
    generic: "L’emplacement n’a pas pu être vérifié. Réessayez.",
    success: "Secteur d’alerte configuré",
    successText: "Votre inscription est active. Sentinelle Population pourra maintenant déterminer si votre secteur est concerné par une alerte.",
    finish: "Terminer",
    back: "Retour",
  },
  en: {
    title: "Configure my alert area",
    intro: "Enter the address of the place for which you want to receive alerts. It will be used to determine whether that area is affected by an emergency.",
    optional: "This step is optional.",
    privacy: "The address you enter is used temporarily to determine your location. It is not retained by CORO. Only the coordinates required for geographic targeting are retained. Your individual position is not shown to operators on their operational map.",
    address: "Address",
    city: "City",
    province: "Province or territory",
    postalCode: "Postal code (optional)",
    selectProvince: "Select",
    required: "This field is required.",
    postalInvalid: "Enter a valid Canadian postal code.",
    resolve: "Verify my location",
    resolving: "Verifying…",
    confirmTitle: "Confirm your alert area",
    confirm: "Confirm this area",
    confirming: "Confirming…",
    edit: "Edit address",
    country: "Canada",
    invalid: "Check the information and try again.",
    notFound: "We could not confirm this address. Check the information and try again.",
    ambiguous: "Several locations may match. Provide a more specific address.",
    unavailable: "Alert area configuration is temporarily unavailable. Your registration remains active. You can complete this step later.",
    retry: "Try again",
    later: "Later",
    expired: "This verification has expired. Verify the address again.",
    stale: "This verification is no longer valid. Verify the address again.",
    session: "Your session has expired. Return to subscription access to continue.",
    access: "Return to access",
    generic: "The location could not be verified. Try again.",
    success: "Alert area configured",
    successText: "Your registration is active. Sentinelle Population can now determine whether your area is affected by an alert.",
    finish: "Finish",
    back: "Back",
  },
} as const;

const postalPattern = /^[ABCEGHJ-NPRSTVXY]\d[ABCEGHJ-NPRSTV-Z][ -]?\d[ABCEGHJ-NPRSTV-Z]\d$/i;

export default function PopulationLocation({
  workflow,
  language,
  onWorkflowChange,
  onCancel,
  onDefer,
  onFinish,
  onSessionExpired,
}: {
  workflow: AuthenticatedPopulationWorkflowSession;
  language: Language;
  onWorkflowChange: (workflow: AuthenticatedPopulationWorkflowSession) => void;
  onCancel: () => void;
  onDefer: () => void;
  onFinish: () => void;
  onSessionExpired: () => void;
}) {
  const t = copy[language];
  const [step, setStep] = useState<Step>(workflow.locationConfigured ? "success" : "form");
  const [addressLine, setAddressLine] = useState("");
  const [city, setCity] = useState("");
  const [province, setProvince] = useState<CanadianProvinceCode | "">("");
  const [postalCode, setPostalCode] = useState("");
  const [resolution, setResolution] = useState<ResolvePopulationLocationResult | null>(null);
  const [resolving, setResolving] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [sessionExpired, setSessionExpired] = useState(false);
  const addressRef = useRef<HTMLInputElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  const resolveInFlight = useRef(false);
  const confirmInFlight = useRef(false);

  useEffect(() => {
    if (!resolution) return;
    const remaining = Date.parse(resolution.expiresAt) - Date.now();
    if (remaining <= 0) {
      setResolution(null);
      setStep("form");
      setError(t.expired);
      return;
    }
    const timer = window.setTimeout(() => {
      setResolution(null);
      setStep("form");
      setError(t.expired);
      window.requestAnimationFrame(() => addressRef.current?.focus());
    }, remaining);
    return () => window.clearTimeout(timer);
  }, [resolution, t.expired]);

  const focusError = () => window.requestAnimationFrame(() => errorRef.current?.focus());
  const expireSession = () => {
    setResolution(null);
    clearPopulationWorkflowSession(workflow.publicSlug);
    setSessionExpired(true);
    setError(t.session);
    focusError();
  };

  const resolve = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (resolveInFlight.current) return;
    const nextErrors: Record<string, string> = {};
    if (!addressLine.trim()) nextErrors.addressLine = t.required;
    if (!city.trim()) nextErrors.city = t.required;
    if (!province) nextErrors.province = t.required;
    if (postalCode.trim() && !postalPattern.test(postalCode.trim())) nextErrors.postalCode = t.postalInvalid;
    setFieldErrors(nextErrors);
    setError(null);
    if (Object.keys(nextErrors).length || !province) {
      addressRef.current?.focus();
      return;
    }
    resolveInFlight.current = true;
    setResolving(true);
    try {
      const result = await resolvePopulationLocation(workflow.publicSlug, workflow.subscriberId, {
        accessToken: workflow.accessToken,
        addressLine: addressLine.trim(),
        city: city.trim(),
        province,
        ...(postalCode.trim() ? { postalCode: postalCode.trim() } : {}),
      });
      setAddressLine("");
      setCity("");
      setProvince("");
      setPostalCode("");
      setResolution(result);
      setStep("confirm");
    } catch (caught: unknown) {
      const apiError = caught instanceof PublicPopulationApiError ? caught : null;
      if (apiError?.reason === "ACCESS_INVALID" || apiError?.status === 401 || apiError?.status === 403) expireSession();
      else if (apiError?.reason === "ADDRESS_NOT_FOUND") setError(t.notFound);
      else if (apiError?.reason === "AMBIGUOUS_ADDRESS") setError(t.ambiguous);
      else if (apiError?.reason === "INVALID_ADDRESS" || apiError?.status === 400) setError(t.invalid);
      else if (apiError?.reason === "LOCATION_UNAVAILABLE" || apiError?.status === 503) {
        setStep("unavailable");
        setError(null);
      } else setError(t.generic);
      focusError();
    } finally {
      resolveInFlight.current = false;
      setResolving(false);
    }
  };

  const confirm = async () => {
    if (!resolution || confirmInFlight.current) return;
    if (Date.parse(resolution.expiresAt) <= Date.now()) {
      setResolution(null);
      setStep("form");
      setError(t.expired);
      return;
    }
    confirmInFlight.current = true;
    setConfirming(true);
    setError(null);
    try {
      const result = await confirmPopulationLocation(workflow.publicSlug, workflow.subscriberId, {
        accessToken: workflow.accessToken,
        resolutionToken: resolution.resolutionToken,
      });
      setResolution(null);
      const updated = configurePopulationLocationSession(workflow, result.resolvedAt);
      onWorkflowChange(updated);
      setStep("success");
    } catch (caught: unknown) {
      const apiError = caught instanceof PublicPopulationApiError ? caught : null;
      if (apiError?.reason === "ACCESS_INVALID" || apiError?.status === 401 || apiError?.status === 403) expireSession();
      else if (apiError?.reason === "RESOLUTION_INVALID") {
        setResolution(null);
        setStep("form");
        setError(t.expired);
      } else if (apiError?.reason === "RESOLUTION_STALE" || apiError?.status === 409) {
        setResolution(null);
        setStep("form");
        setError(t.stale);
      } else if (apiError?.status === 503) {
        setResolution(null);
        setStep("unavailable");
      } else setError(t.generic);
      focusError();
    } finally {
      confirmInFlight.current = false;
      setConfirming(false);
    }
  };

  if (step === "success") return (
    <main className={styles.formMain}><section className={styles.confirmation}>
      <span className={styles.confirmationIcon}><CheckCircle2 size={27} /></span>
      <h1>{t.success}</h1><p>{t.successText}</p>
      <button className={`${styles.button} ${styles.primary}`} type="button" onClick={onFinish}>{t.finish}</button>
    </section></main>
  );

  if (step === "unavailable") return (
    <main className={styles.formMain}><section className={styles.confirmation}>
      <span className={styles.confirmationIcon}><MapPin size={27} /></span>
      <h1>{t.title}</h1><p>{t.unavailable}</p>
      <div className={styles.postVerificationActions}>
        <button className={`${styles.button} ${styles.primary}`} type="button" onClick={() => setStep("form")}><RefreshCw size={17} />{t.retry}</button>
        <button className={`${styles.button} ${styles.secondary}`} type="button" onClick={onDefer}>{t.later}</button>
      </div>
    </section></main>
  );

  if (step === "confirm" && resolution) {
    const location = resolution.location;
    return (
      <main className={styles.formMain}><section className={styles.locationSection}>
        <h1>{t.confirmTitle}</h1>
        <address className={styles.normalizedAddress}>
          {location.addressLine && <span>{location.addressLine}</span>}
          <span>{[location.city, location.province].filter(Boolean).join(", ")}{location.postalCode ? ` ${location.postalCode}` : ""}</span>
          <span>{t.country}</span>
        </address>
        <div ref={errorRef} className={styles.formError} role="alert" aria-live="assertive" tabIndex={-1}>{error}</div>
        <div className={styles.postVerificationActions}>
          <button className={`${styles.button} ${styles.primary}`} type="button" onClick={confirm} disabled={confirming}>{confirming ? t.confirming : t.confirm}<ArrowRight size={17} /></button>
          <button className={`${styles.button} ${styles.secondary}`} type="button" onClick={() => { setResolution(null); setStep("form"); }} disabled={confirming}>{t.edit}</button>
        </div>
      </section></main>
    );
  }

  return (
    <main className={styles.formMain}><section className={styles.locationSection}>
      <button className={styles.backButton} type="button" onClick={onCancel}><ArrowLeft size={17} />{t.back}</button>
      <h1>{t.title}</h1><p className={styles.formIntro}>{t.intro}</p>
      <p className={styles.optionalNotice}>{t.optional}</p>
      <div className={styles.locationPrivacy}><ShieldCheck size={20} /><p>{t.privacy}</p></div>
      <form className={styles.locationForm} onSubmit={resolve} noValidate>
        <label className={styles.field}><span>{t.address}</span><input ref={addressRef} value={addressLine} onChange={(event) => setAddressLine(event.target.value)} autoComplete="street-address" maxLength={200} aria-invalid={!!fieldErrors.addressLine} />{fieldErrors.addressLine && <small className={styles.fieldError}>{fieldErrors.addressLine}</small>}</label>
        <label className={styles.field}><span>{t.city}</span><input value={city} onChange={(event) => setCity(event.target.value)} autoComplete="address-level2" maxLength={100} aria-invalid={!!fieldErrors.city} />{fieldErrors.city && <small className={styles.fieldError}>{fieldErrors.city}</small>}</label>
        <label className={styles.field}><span>{t.province}</span><select value={province} onChange={(event) => setProvince(event.target.value as CanadianProvinceCode | "")} autoComplete="address-level1" aria-invalid={!!fieldErrors.province}><option value="">{t.selectProvince}</option>{provinces.map((item) => <option key={item.code} value={item.code}>{language === "fr" ? item.fr : item.en}</option>)}</select>{fieldErrors.province && <small className={styles.fieldError}>{fieldErrors.province}</small>}</label>
        <label className={styles.field}><span>{t.postalCode}</span><input value={postalCode} onChange={(event) => setPostalCode(event.target.value)} autoComplete="postal-code" maxLength={7} aria-invalid={!!fieldErrors.postalCode} />{fieldErrors.postalCode && <small className={styles.fieldError}>{fieldErrors.postalCode}</small>}</label>
        <div ref={errorRef} className={styles.formError} role="alert" aria-live="assertive" tabIndex={-1}>{error}</div>
        {sessionExpired && <button className={`${styles.button} ${styles.secondary} ${styles.submitButton}`} type="button" onClick={onSessionExpired}>{t.access}</button>}
        <button className={`${styles.button} ${styles.primary} ${styles.submitButton}`} type="submit" disabled={resolving || sessionExpired}>{resolving ? t.resolving : t.resolve}<ArrowRight size={17} /></button>
      </form>
    </section></main>
  );
}
