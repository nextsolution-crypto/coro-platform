"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import PortalLayout from "../components/PortalLayout";
import { apiGet, apiPost, apiUpload } from "../store/auth";
import { ACCEPT, CLIENT_IMPACTS, CLIENT_STATUS, CLIENT_SUPPORT_TYPES, clientContext, formatDateTime, MAX_BYTES, type SupportSummary } from "./support-shared";

const card = { backgroundColor: "#FFFFFF", border: "1px solid #E9ECEF", borderRadius: 6 } as const;
const field = { border: "1px solid #DEE2E6", borderRadius: 4, padding: "9px 11px", fontSize: 14, color: "#2C3E50", backgroundColor: "#FFFFFF", width: "100%" } as const;

/** Aide et support du portail client : nouvelle demande et suivi. */
export default function ClientSupportPage() {
  const router = useRouter();
  const [tickets, setTickets] = useState<SupportSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [type, setType] = useState("");
  const [impact, setImpact] = useState("DISRUPTIVE");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    apiGet("/client-portal/support/tickets")
      .then((data) => { setTickets(data || []); setShowForm((data || []).length === 0); })
      .catch(() => setError("Impossible de charger vos demandes."))
      .finally(() => setLoading(false));
  }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!type) { setError("Choisissez le type de demande."); return; }
    if (subject.trim().length < 3) { setError("Le sujet est trop court."); return; }
    if (message.trim().length < 10) { setError("Décrivez la situation en quelques mots (10 caractères au moins)."); return; }
    if (file && file.size > MAX_BYTES) { setError("Pièce jointe : PDF ou JPG, 25 Mo maximum."); return; }
    setSending(true);
    setError("");
    try {
      const created = await apiPost("/client-portal/support/tickets", {
        type,
        impact: type === "SUGGESTION" ? "MINOR" : impact,
        subject: subject.trim(),
        message: message.trim(),
        context: clientContext(),
      });
      if (file) {
        const form = new FormData();
        form.append("file", file);
        await apiUpload(`/client-portal/support/tickets/${created.id}/attachments`, form).catch(() => undefined);
      }
      router.push(`/support/${created.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Envoi impossible pour le moment.");
      setSending(false);
    }
  };

  return (
    <PortalLayout>
      <div style={{ maxWidth: 880, display: "grid", gap: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "end", gap: 12, flexWrap: "wrap" }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: "#2C3E50" }}>Aide et support</h1>
            <p style={{ margin: "4px 0 0", fontSize: 14, color: "#6C757D" }}>
              Une question sur vos plans va à votre firme-conseil ; un problème technique va à l’équipe CORO. Chaque demande a un numéro et un suivi.
            </p>
          </div>
          {!showForm && (
            <button type="button" onClick={() => setShowForm(true)}
              style={{ backgroundColor: "#C0392B", color: "#FFFFFF", border: "none", borderRadius: 4, padding: "10px 18px", fontWeight: 700, cursor: "pointer" }}>
              Nouvelle demande
            </button>
          )}
        </div>

        <p style={{ margin: 0, fontSize: 13, color: "#C0392B", fontWeight: 700 }}>
          Urgence réelle dans un bâtiment : composez le 911 et utilisez le bouton URGENCE. Ce formulaire n’est pas surveillé en continu.
        </p>

        {showForm && (
          <form onSubmit={submit} style={{ ...card, padding: 20, display: "grid", gap: 16 }}>
            <fieldset style={{ border: "none", padding: 0, margin: 0 }}>
              <legend style={{ fontSize: 14, fontWeight: 700, color: "#2C3E50", marginBottom: 8 }}>Type de demande</legend>
              <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))" }}>
                {CLIENT_SUPPORT_TYPES.map((option) => (
                  <button key={option.value} type="button" aria-pressed={type === option.value} onClick={() => setType(option.value)}
                    style={{ textAlign: "left", padding: 12, borderRadius: 6, cursor: "pointer", border: `2px solid ${type === option.value ? "#C0392B" : "#E9ECEF"}`, backgroundColor: type === option.value ? "#FDEDEC" : "#FFFFFF" }}>
                    <span style={{ display: "block", fontSize: 14, fontWeight: 700, color: "#2C3E50" }}>{option.label}</span>
                    <span style={{ display: "block", fontSize: 12, color: "#6C757D", marginTop: 2 }}>{option.hint}</span>
                  </button>
                ))}
              </div>
            </fieldset>

            {type && type !== "SUGGESTION" && (
              <fieldset style={{ border: "none", padding: 0, margin: 0, display: "grid", gap: 6 }}>
                <legend style={{ fontSize: 14, fontWeight: 700, color: "#2C3E50", marginBottom: 6 }}>Impact</legend>
                {CLIENT_IMPACTS.map((option) => (
                  <label key={option.value} style={{ display: "flex", gap: 8, alignItems: "baseline", fontSize: 14, color: "#2C3E50", cursor: "pointer" }}>
                    <input type="radio" name="impact" value={option.value} checked={impact === option.value} onChange={() => setImpact(option.value)} />
                    <span><strong>{option.label}</strong> <span style={{ color: "#6C757D", fontSize: 13 }}>— {option.hint}</span></span>
                  </label>
                ))}
              </fieldset>
            )}

            <label style={{ display: "grid", gap: 6, fontSize: 14, fontWeight: 700, color: "#2C3E50" }}>Sujet
              <input style={field} maxLength={140} value={subject} onChange={(e) => setSubject(e.target.value)} />
            </label>
            <label style={{ display: "grid", gap: 6, fontSize: 14, fontWeight: 700, color: "#2C3E50" }}>Description
              <textarea style={{ ...field, minHeight: 140, resize: "vertical" }} maxLength={8000} value={message} onChange={(e) => setMessage(e.target.value)}
                placeholder="Ce que vous faisiez, ce qui s’est passé, ce que vous attendiez." />
            </label>
            <label style={{ display: "grid", gap: 4, fontSize: 13, color: "#6C757D" }}>Capture d’écran ou document (facultatif)
              <input type="file" accept={ACCEPT} onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
              <span style={{ fontSize: 11, color: "#ADB5BD" }}>PDF ou JPG, 25 Mo maximum.</span>
            </label>

            {error && <p style={{ margin: 0, color: "#C0392B", fontSize: 13 }}>{error}</p>}
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              {tickets.length > 0 && <button type="button" onClick={() => setShowForm(false)} style={{ ...field, width: "auto", cursor: "pointer" }}>Annuler</button>}
              <button type="submit" disabled={sending}
                style={{ backgroundColor: "#C0392B", color: "#FFFFFF", border: "none", borderRadius: 4, padding: "10px 18px", fontWeight: 700, cursor: "pointer", opacity: sending ? 0.6 : 1 }}>
                {sending ? "Envoi…" : "Envoyer la demande"}
              </button>
            </div>
          </form>
        )}

        <section style={{ display: "grid", gap: 8 }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "#2C3E50" }}>Mes demandes</h2>
          {loading ? <p style={{ color: "#6C757D" }}>Chargement…</p> : tickets.length === 0 ? (
            <p style={{ color: "#6C757D", fontSize: 14 }}>Aucune demande pour le moment.</p>
          ) : tickets.map((ticket) => {
            const status = CLIENT_STATUS[ticket.status] ?? CLIENT_STATUS.NEW;
            return (
              <Link key={ticket.id} href={`/support/${ticket.id}`}
                style={{ ...card, padding: "12px 16px", display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", textDecoration: "none" }}>
                <span style={{ minWidth: 0 }}>
                  <span style={{ display: "block", fontSize: 12, color: "#ADB5BD", fontWeight: 700 }}>{ticket.reference} · {ticket.queue === "CORO" ? "Équipe CORO" : "Votre firme-conseil"}</span>
                  <span style={{ display: "block", fontSize: 14, fontWeight: 700, color: "#2C3E50", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ticket.subject}</span>
                  <span style={{ display: "block", fontSize: 12, color: "#6C757D" }}>Mise à jour le {formatDateTime(ticket.updatedAt)}</span>
                </span>
                <span style={{ flexShrink: 0, fontSize: 12, fontWeight: 700, color: status.color, backgroundColor: status.bg, padding: "3px 8px", borderRadius: 4 }}>{status.label}</span>
              </Link>
            );
          })}
        </section>
      </div>
    </PortalLayout>
  );
}
