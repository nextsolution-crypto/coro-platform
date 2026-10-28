"use client";

import { useEffect, useRef, useState } from "react";
import { publicApiUrl } from "@/lib/site/api";

type Language = "fr-CA" | "en-CA";
type RequestType = "DEMO" | "QUOTE" | "CONTACT" | "PARTNERSHIP";

const TEXT = {
  "fr-CA": {
    title: "Parler à l’équipe CORO",
    optional: "Cette démarche est facultative. Vous pouvez continuer sans transmettre vos coordonnées.",
    name: "Nom", organization: "Organisation", email: "Courriel professionnel", role: "Fonction (facultatif)", sector: "Secteur (facultatif)", buildings: "Nombre de bâtiments (facultatif)", users: "Utilisateurs estimés (facultatif)", need: "Besoin principal (facultatif)", timeline: "Échéancier (facultatif)", type: "Type de demande", modules: "Modules d’intérêt (facultatif, séparés par des virgules)",
    demo: "Démonstration", quote: "Devis", contact: "Contact", partnership: "Partenariat",
    consent: "J’accepte que ces renseignements soient transmis à CORO uniquement pour traiter ma demande. Politique de confidentialité.",
    marketing: "Je souhaite aussi recevoir des communications marketing de CORO (facultatif).",
    send: "Transmettre la demande", sending: "Transmission…", cancel: "Annuler", success: "Votre demande a été enregistrée.", error: "La demande n’a pas été transmise. Aucun succès n’a été enregistré. Réessayez plus tard.", invalid: "Vérifiez les champs obligatoires et votre consentement.",
  },
  "en-CA": {
    title: "Talk to the CORO team",
    optional: "This step is optional. You can continue without sharing contact details.",
    name: "Name", organization: "Organization", email: "Work email", role: "Role (optional)", sector: "Sector (optional)", buildings: "Number of buildings (optional)", users: "Estimated users (optional)", need: "Primary need (optional)", timeline: "Timeline (optional)", type: "Request type", modules: "Modules of interest (optional, comma-separated)",
    demo: "Demo", quote: "Quote", contact: "Contact", partnership: "Partnership",
    consent: "I agree that this information may be sent to CORO solely to process my request. Privacy policy.",
    marketing: "I also want to receive CORO marketing communications (optional).",
    send: "Send request", sending: "Sending…", cancel: "Cancel", success: "Your request was recorded.", error: "The request was not sent. No success was recorded. Please try again later.", invalid: "Check the required fields and your consent.",
  },
} as const;

export default function WebAICommercialQualification({ language, onCancel }: { language: Language; onCancel: () => void }) {
  const t = TEXT[language];
  const key = useRef<string>(crypto.randomUUID());
  const titleRef = useRef<HTMLHeadingElement>(null);
  const [state, setState] = useState({ requestType: "DEMO" as RequestType, contactName: "", organizationName: "", contactTitle: "", email: "", sector: "", buildingCount: "", estimatedUsers: "", primaryNeed: "", interestedModules: "", timeline: "", consentToProcess: false, marketingConsent: false });
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");

  useEffect(() => { titleRef.current?.focus(); }, []);

  const update = (name: keyof typeof state, value: string | boolean) => setState((current) => ({ ...current, [name]: value }));
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!event.currentTarget.checkValidity() || !state.consentToProcess) { setStatus("error"); return; }
    setStatus("sending");
    try {
      const response = await fetch(publicApiUrl("chat/v1/commercial-requests"), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
        idempotencyKey: key.current,
        requestType: state.requestType,
        contactName: state.contactName,
        organizationName: state.organizationName,
        ...(state.contactTitle ? { contactTitle: state.contactTitle } : {}),
        email: state.email,
        ...(state.sector ? { sector: state.sector } : {}),
        ...(state.buildingCount ? { buildingCount: Number(state.buildingCount) } : {}),
        ...(state.estimatedUsers ? { estimatedUsers: Number(state.estimatedUsers) } : {}),
        ...(state.primaryNeed ? { primaryNeed: state.primaryNeed } : {}),
        interestedModules: state.interestedModules.split(",").map((value) => value.trim()).filter(Boolean),
        ...(state.timeline ? { timeline: state.timeline } : {}),
        preferredLanguage: language,
        consentToProcess: state.consentToProcess,
        consentTextVersion: "web-ai-commercial-v1",
        consentAction: "CHECKBOX_AND_SUBMIT",
        marketingConsent: state.marketingConsent,
      }) });
      const result = await response.json() as { success?: unknown };
      if (!response.ok || result.success !== true) throw new Error("NOT_SUBMITTED");
      setStatus("success");
    } catch { setStatus("error"); }
  };

  if (status === "success") return <section role="status" style={{ padding: 12, background: "#EAF7EF", borderBottom: "1px solid #A9DFBF", color: "#1E8449", fontSize: 12 }}>{t.success}</section>;
  const input = { width: "100%", minWidth: 0, boxSizing: "border-box" as const, padding: "8px 10px", border: "1px solid #D5B45B", borderRadius: 6, fontSize: 12 };
  return <section aria-labelledby="web-ai-commercial-title" style={{ padding: 12, background: "#FEF9E7", borderBottom: "1px solid #FAD7A0", maxHeight: 390, overflowY: "auto" }}>
    <h3 ref={titleRef} tabIndex={-1} id="web-ai-commercial-title" style={{ margin: 0, color: "#7D6608", fontSize: 14 }}>{t.title}</h3>
    <p style={{ margin: "4px 0 10px", color: "#7D6608", fontSize: 11 }}>{t.optional}</p>
    <form onSubmit={submit} noValidate style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 180px), 1fr))", gap: 8 }}>
      <input aria-label={t.name} placeholder={`${t.name} *`} value={state.contactName} onChange={(e) => update("contactName", e.target.value)} style={input} required maxLength={160} />
      <input aria-label={t.organization} placeholder={`${t.organization} *`} value={state.organizationName} onChange={(e) => update("organizationName", e.target.value)} style={input} required maxLength={200} />
      <input aria-label={t.email} placeholder={`${t.email} *`} type="email" value={state.email} onChange={(e) => update("email", e.target.value)} style={{ ...input, gridColumn: "1 / -1" }} required maxLength={254} />
      <input aria-label={t.role} placeholder={t.role} value={state.contactTitle} onChange={(e) => update("contactTitle", e.target.value)} style={input} maxLength={160} />
      <input aria-label={t.sector} placeholder={t.sector} value={state.sector} onChange={(e) => update("sector", e.target.value)} style={input} maxLength={80} />
      <input aria-label={t.buildings} placeholder={t.buildings} type="number" min="1" value={state.buildingCount} onChange={(e) => update("buildingCount", e.target.value)} style={input} />
      <input aria-label={t.users} placeholder={t.users} type="number" min="1" value={state.estimatedUsers} onChange={(e) => update("estimatedUsers", e.target.value)} style={input} />
      <select aria-label={t.type} value={state.requestType} onChange={(e) => update("requestType", e.target.value)} style={input}><option value="DEMO">{t.demo}</option><option value="QUOTE">{t.quote}</option><option value="CONTACT">{t.contact}</option><option value="PARTNERSHIP">{t.partnership}</option></select>
      <input aria-label={t.timeline} placeholder={t.timeline} value={state.timeline} onChange={(e) => update("timeline", e.target.value)} style={input} maxLength={80} />
      <input aria-label={t.modules} placeholder={t.modules} value={state.interestedModules} onChange={(e) => update("interestedModules", e.target.value)} style={{ ...input, gridColumn: "1 / -1" }} />
      <textarea aria-label={t.need} placeholder={t.need} value={state.primaryNeed} onChange={(e) => update("primaryNeed", e.target.value)} style={{ ...input, gridColumn: "1 / -1", resize: "vertical" }} maxLength={500} />
      <label style={{ gridColumn: "1 / -1", display: "flex", gap: 7, fontSize: 11, color: "#7D6608" }}><input type="checkbox" checked={state.consentToProcess} onChange={(e) => update("consentToProcess", e.target.checked)} />{t.consent}</label>
      <label style={{ gridColumn: "1 / -1", display: "flex", gap: 7, fontSize: 11, color: "#7D6608" }}><input type="checkbox" checked={state.marketingConsent} onChange={(e) => update("marketingConsent", e.target.checked)} />{t.marketing}</label>
      {status === "error" && <p role="alert" style={{ gridColumn: "1 / -1", margin: 0, color: "#C0392B", fontSize: 11 }}>{state.consentToProcess ? t.error : t.invalid}</p>}
      <button type="button" onClick={onCancel} style={{ padding: 8, border: "1px solid #D5B45B", borderRadius: 6, background: "white" }}>{t.cancel}</button>
      <button type="submit" disabled={status === "sending"} style={{ padding: 8, border: 0, borderRadius: 6, background: "#C0392B", color: "white", fontWeight: 700 }}>{status === "sending" ? t.sending : t.send}</button>
    </form>
  </section>;
}
