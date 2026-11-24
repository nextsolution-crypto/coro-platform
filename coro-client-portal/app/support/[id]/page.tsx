"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import PortalLayout from "../../components/PortalLayout";
import { apiDownload, apiGet, apiPost, apiUpload } from "../../store/auth";
import { ACCEPT, CLIENT_STATUS, formatDateTime, MAX_BYTES, type SupportTicket } from "../support-shared";

const card = { backgroundColor: "#FFFFFF", border: "1px solid #E9ECEF", borderRadius: 6 } as const;
const field = { border: "1px solid #DEE2E6", borderRadius: 4, padding: "8px 10px", fontSize: 14, color: "#2C3E50", backgroundColor: "#FFFFFF" } as const;

/** Fil d'une demande du portail : le client lit, répond, joint une capture, ferme ou rouvre. */
export default function ClientSupportTicketPage() {
  const params = useParams();
  const id = params?.id as string;
  const [ticket, setTicket] = useState<SupportTicket | null>(null);
  const [reply, setReply] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setTicket(await apiGet(`/client-portal/support/tickets/${id}`));
      setError("");
    } catch {
      setError("Demande introuvable.");
    }
  }, [id]);

  useEffect(() => { void load(); }, [load]);

  const send = async () => {
    if (!ticket || (!reply.trim() && !file)) return;
    if (file && file.size > MAX_BYTES) { setError("Pièce jointe : PDF ou JPG, 25 Mo maximum."); return; }
    setBusy(true);
    setError("");
    try {
      let messageId: string | undefined;
      if (reply.trim()) messageId = (await apiPost(`/client-portal/support/tickets/${ticket.id}/messages`, { body: reply.trim() }))?.id;
      if (file) {
        const form = new FormData();
        form.append("file", file);
        await apiUpload(`/client-portal/support/tickets/${ticket.id}/attachments${messageId ? `?messageId=${messageId}` : ""}`, form);
      }
      setReply("");
      setFile(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Envoi impossible pour le moment.");
    } finally {
      setBusy(false);
    }
  };

  const act = async (action: "close" | "reopen") => {
    if (!ticket) return;
    setBusy(true);
    try {
      setTicket(await apiPost(`/client-portal/support/tickets/${ticket.id}/${action}`, {}));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action impossible.");
    } finally {
      setBusy(false);
    }
  };

  const download = async (attachmentId: string, fileName: string) => {
    if (!ticket) return;
    try {
      const { blob } = await apiDownload(`/client-portal/support/tickets/${ticket.id}/attachments/${attachmentId}`);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } catch {
      setError("Téléchargement impossible pour le moment (fichier peut-être en cours d’analyse antivirus).");
    }
  };

  if (!ticket) {
    return <PortalLayout><p style={{ color: error ? "#C0392B" : "#6C757D" }}>{error || "Chargement…"}</p></PortalLayout>;
  }
  const status = CLIENT_STATUS[ticket.status] ?? CLIENT_STATUS.NEW;
  const closed = ticket.status === "CLOSED";

  return (
    <PortalLayout>
      <div style={{ maxWidth: 880, display: "grid", gap: 16 }}>
        <Link href="/support" style={{ color: "#6C757D", fontSize: 13 }}>← Aide et support</Link>
        <div style={{ ...card, padding: 20, display: "grid", gap: 6 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ fontWeight: 800, color: "#ADB5BD", fontSize: 13 }}>{ticket.reference}</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: status.color, backgroundColor: status.bg, padding: "2px 8px", borderRadius: 4 }}>{status.label}</span>
            <span style={{ fontSize: 12, color: "#6C757D" }}>{ticket.queue === "CORO" ? "Traitée par l’équipe CORO" : "Traitée par votre firme-conseil"}</span>
          </div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "#2C3E50" }}>{ticket.subject}</h1>
          <p style={{ margin: 0, fontSize: 13, color: "#6C757D" }}>
            Envoyée le {formatDateTime(ticket.createdAt)} ·{" "}
            {ticket.firstRespondedAt ? `première réponse le ${formatDateTime(ticket.firstRespondedAt)}` : `première réponse attendue sous ${ticket.firstResponseTarget}`}
          </p>
        </div>

        {ticket.messages.map((message) => {
          const files = ticket.attachments.filter((a) => a.messageId === message.id);
          const system = message.authorKind === "SYSTEM";
          return (
            <div key={message.id} style={{ ...card, padding: system ? "8px 14px" : 16, backgroundColor: system ? "#F8F9FA" : message.authorKind === "AGENT" ? "#F4F8FB" : "#FFFFFF" }}>
              <p style={{ margin: 0, fontSize: 12, color: "#6C757D" }}>
                <strong style={{ color: "#2C3E50" }}>{message.authorName || "CORO"}</strong>{message.authorKind === "AGENT" ? " · Support" : ""} · {formatDateTime(message.createdAt)}
              </p>
              <p style={{ margin: "6px 0 0", fontSize: system ? 13 : 14, color: system ? "#6C757D" : "#2C3E50", whiteSpace: "pre-wrap" }}>{message.body}</p>
              {files.map((f) => (
                <button key={f.id} type="button" disabled={!f.downloadable} onClick={() => void download(f.id, f.fileName)}
                  style={{ marginTop: 8, marginRight: 8, fontSize: 12, color: f.downloadable ? "#2980B9" : "#ADB5BD", background: "none", border: "none", padding: 0, cursor: f.downloadable ? "pointer" : "default" }}>
                  📎 {f.fileName}{f.scanStatus === "PENDING" ? " — analyse antivirus en cours" : !f.downloadable ? " — bloqué" : ""}
                </button>
              ))}
            </div>
          );
        })}
        {ticket.attachments.filter((a) => !a.messageId).map((f) => (
          <button key={f.id} type="button" disabled={!f.downloadable} onClick={() => void download(f.id, f.fileName)}
            style={{ justifySelf: "start", fontSize: 12, color: f.downloadable ? "#2980B9" : "#ADB5BD", background: "none", border: "none", padding: 0, cursor: "pointer" }}>
            📎 {f.fileName}{f.scanStatus === "PENDING" ? " — analyse antivirus en cours" : !f.downloadable ? " — bloqué" : ""}
          </button>
        ))}

        {error && <p style={{ margin: 0, color: "#C0392B", fontSize: 13 }}>{error}</p>}

        {closed ? (
          <div style={{ ...card, padding: 16, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 14, color: "#6C757D" }}>Cette demande est fermée.</span>
            <button type="button" disabled={busy} style={{ ...field, cursor: "pointer" }} onClick={() => void act("reopen")}>Rouvrir</button>
          </div>
        ) : (
          <div style={{ ...card, padding: 16, display: "grid", gap: 10 }}>
            <textarea style={{ ...field, minHeight: 110, resize: "vertical" }} placeholder="Votre réponse…" value={reply} maxLength={8000} onChange={(e) => setReply(e.target.value)} />
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", justifyContent: "space-between" }}>
              <label style={{ fontSize: 13, color: "#6C757D" }}>
                <input type="file" accept={ACCEPT} onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
                <span style={{ display: "block", fontSize: 11, color: "#ADB5BD" }}>PDF ou JPG, 25 Mo maximum</span>
              </label>
              <div style={{ display: "flex", gap: 8 }}>
                <button type="button" disabled={busy} style={{ ...field, cursor: "pointer" }} onClick={() => void act("close")}>Ma demande est réglée</button>
                <button type="button" disabled={busy || (!reply.trim() && !file)} onClick={() => void send()}
                  style={{ backgroundColor: "#C0392B", color: "#FFFFFF", border: "none", borderRadius: 4, padding: "9px 18px", fontWeight: 700, cursor: "pointer", opacity: busy ? 0.6 : 1 }}>
                  {busy ? "Envoi…" : "Envoyer"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </PortalLayout>
  );
}
