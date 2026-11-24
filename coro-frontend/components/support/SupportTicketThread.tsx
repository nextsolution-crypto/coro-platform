'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import {
  formatDateTime,
  formatSize,
  PRIORITY_LABELS,
  SUPPORT_MAX_BYTES,
  SUPPORT_STATUS,
  SUPPORT_TYPE_LABELS,
  type SupportTicketView,
} from '@/lib/support';

const card = { backgroundColor: '#FFFFFF', border: '1px solid #E9ECEF', borderRadius: 6 } as const;
const input = { border: '1px solid #DEE2E6', borderRadius: 4, padding: '8px 10px', fontSize: 14, color: '#2C3E50', backgroundColor: '#FFFFFF' } as const;

interface Agent { id: string; firstName: string; lastName: string }

/** Fil d'une demande : lecture, réponse, pièces jointes ; panneau de gestion pour l'agent. */
export default function SupportTicketThread({ ticketId, backHref }: { ticketId: string; backHref: string }) {
  const [ticket, setTicket] = useState<SupportTicketView | null>(null);
  const [error, setError] = useState('');
  const [reply, setReply] = useState('');
  const [internal, setInternal] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [duplicateRef, setDuplicateRef] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await api.get(`/support/tickets/${ticketId}`);
      setTicket(res.data);
      setError('');
    } catch {
      setError('Demande introuvable ou accès refusé.');
    }
  }, [ticketId]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    if (ticket?.isAgent && agents.length === 0) {
      api.get('/support/console/agents').then(res => setAgents(res.data || [])).catch(() => undefined);
    }
  }, [ticket?.isAgent, agents.length]);

  const send = async () => {
    if (!ticket || (!reply.trim() && !file)) return;
    if (file && file.size > SUPPORT_MAX_BYTES) { setError('Pièce jointe : PDF ou JPG, 25 Mo maximum.'); return; }
    setBusy(true);
    setError('');
    try {
      let messageId: string | undefined;
      if (reply.trim()) {
        const res = await api.post(`/support/tickets/${ticket.id}/messages`, { body: reply.trim(), internal });
        messageId = res.data?.id;
      }
      if (file) {
        const form = new FormData();
        form.append('file', file);
        await api.post(`/support/tickets/${ticket.id}/attachments${messageId ? `?messageId=${messageId}` : ''}`, form);
      }
      setReply('');
      setFile(null);
      setInternal(false);
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Envoi impossible pour le moment.');
    } finally {
      setBusy(false);
    }
  };

  const agentUpdate = async (patch: Record<string, unknown>) => {
    if (!ticket) return;
    setBusy(true);
    setError('');
    try {
      const res = await api.patch(`/support/tickets/${ticket.id}`, patch);
      setTicket(res.data);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Mise à jour impossible.');
    } finally {
      setBusy(false);
    }
  };

  const markDuplicate = async () => {
    const reference = duplicateRef.trim().toUpperCase();
    if (!reference) return;
    try {
      const res = await api.get('/support/console/tickets?status=ALL');
      const parent = (res.data || []).find((t: { reference: string; id: string }) => t.reference === reference);
      if (!parent) { setError(`Demande ${reference} introuvable dans votre file.`); return; }
      await agentUpdate({ duplicateOfId: parent.id });
      setDuplicateRef('');
    } catch {
      setError('Regroupement impossible.');
    }
  };

  const requesterAction = async (action: 'close' | 'reopen') => {
    if (!ticket) return;
    setBusy(true);
    try {
      const res = await api.post(`/support/tickets/${ticket.id}/${action}`);
      setTicket(res.data);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Action impossible.');
    } finally {
      setBusy(false);
    }
  };

  const download = async (attachmentId: string, fileName: string) => {
    if (!ticket) return;
    try {
      const res = await api.get(`/support/tickets/${ticket.id}/attachments/${attachmentId}`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } catch (err: any) {
      setError(err?.response?.status === 409 ? 'Fichier en cours d’analyse antivirus. Réessayez dans quelques minutes.' : 'Téléchargement impossible.');
    }
  };

  if (error && !ticket) return <p style={{ color: '#C0392B' }}>{error}</p>;
  if (!ticket) return <p style={{ color: '#6C757D' }}>Chargement…</p>;

  const status = SUPPORT_STATUS[ticket.status] ?? SUPPORT_STATUS.NEW;
  const priority = PRIORITY_LABELS[ticket.priority];
  const closed = ticket.status === 'CLOSED';

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <Link href={backHref} style={{ color: '#6C757D', fontSize: 13 }}>← Retour</Link>

      <div style={{ ...card, padding: 20, display: 'grid', gap: 8 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
          <span style={{ fontWeight: 800, color: '#ADB5BD', fontSize: 13 }}>{ticket.reference}</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: status.color, backgroundColor: status.bg, padding: '2px 8px', borderRadius: 4 }}>{status.label}</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: priority?.color }}>● {priority?.label}</span>
          <span style={{ fontSize: 12, color: '#6C757D' }}>{SUPPORT_TYPE_LABELS[ticket.type] ?? ticket.type}</span>
          <span style={{ fontSize: 12, color: '#6C757D' }}>{ticket.queue === 'CORO' ? 'Équipe CORO' : 'Firme-conseil'}</span>
        </div>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#2C3E50' }}>{ticket.subject}</h1>
        <p style={{ margin: 0, fontSize: 13, color: ticket.overdue ? '#C0392B' : '#6C757D' }}>
          Ouverte le {formatDateTime(ticket.createdAt)} ·{' '}
          {ticket.firstRespondedAt
            ? `première réponse le ${formatDateTime(ticket.firstRespondedAt)}`
            : `première réponse attendue sous ${ticket.firstResponseTarget} (avant le ${formatDateTime(ticket.firstResponseDueAt)})${ticket.overdue ? ' — délai dépassé' : ''}`}
        </p>
        {ticket.isAgent && ticket.context && (ticket.context.page || ticket.context.userAgent) && (
          <p style={{ margin: 0, fontSize: 12, color: '#ADB5BD' }}>
            Contexte : {ticket.context.page || '—'} · {ticket.context.viewport || ''} · {ticket.context.userAgent || ''}
          </p>
        )}
      </div>

      {ticket.isAgent && (
        <div style={{ ...card, padding: 16, display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'end' }}>
          <label style={{ display: 'grid', gap: 4, fontSize: 12, color: '#6C757D' }}>Statut
            <select style={input} value={ticket.status} disabled={busy} onChange={e => void agentUpdate({ status: e.target.value })}>
              {Object.entries(SUPPORT_STATUS).map(([value, s]) => <option key={value} value={value}>{s.label}</option>)}
            </select>
          </label>
          <label style={{ display: 'grid', gap: 4, fontSize: 12, color: '#6C757D' }}>Priorité
            <select style={input} value={ticket.priority} disabled={busy} onChange={e => void agentUpdate({ priority: Number(e.target.value) })}>
              {[1, 2, 3].map(p => <option key={p} value={p}>{PRIORITY_LABELS[p].label}</option>)}
            </select>
          </label>
          <label style={{ display: 'grid', gap: 4, fontSize: 12, color: '#6C757D' }}>Assignée à
            <select style={input} value={ticket.assignedUserId ?? ''} disabled={busy} onChange={e => void agentUpdate({ assignedUserId: e.target.value || null })}>
              <option value="">Personne</option>
              {agents.map(a => <option key={a.id} value={a.id}>{a.firstName} {a.lastName}</option>)}
            </select>
          </label>
          {ticket.channel === 'CLIENT_PORTAL' && (
            <button type="button" disabled={busy} style={{ ...input, cursor: 'pointer' }}
              onClick={() => void agentUpdate({ queue: ticket.queue === 'CORO' ? 'ADVISOR' : 'CORO' })}>
              {ticket.queue === 'CORO' ? 'Transférer à la firme-conseil' : 'Transférer à l’équipe CORO'}
            </button>
          )}
          <div style={{ display: 'flex', gap: 6, alignItems: 'end' }}>
            <label style={{ display: 'grid', gap: 4, fontSize: 12, color: '#6C757D' }}>Doublon de
              <input style={{ ...input, width: 120 }} placeholder="CORO-0012" value={duplicateRef} onChange={e => setDuplicateRef(e.target.value)} />
            </label>
            <button type="button" disabled={busy || !duplicateRef.trim()} style={{ ...input, cursor: 'pointer' }} onClick={() => void markDuplicate()}>Regrouper</button>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gap: 10 }}>
        {ticket.messages.map(message => {
          const files = ticket.attachments.filter(a => a.messageId === message.id);
          const system = message.authorKind === 'SYSTEM';
          return (
            <div key={message.id} style={{
              ...card,
              padding: system ? '8px 14px' : 16,
              backgroundColor: message.internal ? '#FEF9E7' : system ? '#F8F9FA' : message.authorKind === 'AGENT' ? '#F4F8FB' : '#FFFFFF',
              borderColor: message.internal ? '#F7DC6F' : '#E9ECEF',
            }}>
              <p style={{ margin: 0, fontSize: 12, color: '#6C757D' }}>
                <strong style={{ color: '#2C3E50' }}>{message.authorName || 'CORO'}</strong>
                {message.authorKind === 'AGENT' ? ' · Support' : ''}{message.internal ? ' · Note interne (invisible du demandeur)' : ''} · {formatDateTime(message.createdAt)}
              </p>
              <p style={{ margin: '6px 0 0', fontSize: system ? 13 : 14, color: system ? '#6C757D' : '#2C3E50', whiteSpace: 'pre-wrap' }}>{message.body}</p>
              {files.map(f => (
                <button key={f.id} type="button" onClick={() => void download(f.id, f.fileName)} disabled={!f.downloadable}
                  style={{ marginTop: 8, marginRight: 8, fontSize: 12, color: f.downloadable ? '#2980B9' : '#ADB5BD', background: 'none', border: 'none', cursor: f.downloadable ? 'pointer' : 'default', padding: 0 }}>
                  📎 {f.fileName} ({formatSize(f.size)}){f.scanStatus === 'PENDING' ? ' — analyse antivirus en cours' : !f.downloadable ? ' — bloqué' : ''}
                </button>
              ))}
            </div>
          );
        })}
        {ticket.attachments.filter(a => !a.messageId).map(f => (
          <button key={f.id} type="button" onClick={() => void download(f.id, f.fileName)} disabled={!f.downloadable}
            style={{ justifySelf: 'start', fontSize: 12, color: f.downloadable ? '#2980B9' : '#ADB5BD', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
            📎 {f.fileName} ({formatSize(f.size)}){f.scanStatus === 'PENDING' ? ' — analyse antivirus en cours' : !f.downloadable ? ' — bloqué' : ''}
          </button>
        ))}
      </div>

      {error && <p style={{ margin: 0, color: '#C0392B', fontSize: 13 }}>{error}</p>}

      {closed && !ticket.isAgent ? (
        <div style={{ ...card, padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 14, color: '#6C757D' }}>Cette demande est fermée.</span>
          {ticket.isRequester && <button type="button" disabled={busy} style={{ ...input, cursor: 'pointer' }} onClick={() => void requesterAction('reopen')}>Rouvrir</button>}
        </div>
      ) : (
        <div style={{ ...card, padding: 16, display: 'grid', gap: 10 }}>
          <textarea style={{ ...input, minHeight: 110, resize: 'vertical' }} placeholder="Votre réponse…" value={reply} maxLength={8000} onChange={e => setReply(e.target.value)} />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
              <label style={{ fontSize: 13, color: '#6C757D' }}>
                <input type="file" accept=".pdf,.jpg,.jpeg,application/pdf,image/jpeg" onChange={e => setFile(e.target.files?.[0] ?? null)} />
                <span style={{ display: 'block', fontSize: 11, color: '#ADB5BD' }}>Capture ou document : PDF ou JPG, 25 Mo maximum</span>
              </label>
              {ticket.isAgent && (
                <label style={{ fontSize: 13, color: '#6C757D', display: 'flex', gap: 6, alignItems: 'center' }}>
                  <input type="checkbox" checked={internal} onChange={e => setInternal(e.target.checked)} /> Note interne
                </label>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {ticket.isRequester && !closed && (
                <button type="button" disabled={busy} style={{ ...input, cursor: 'pointer' }} onClick={() => void requesterAction('close')}>Ma demande est réglée</button>
              )}
              <button type="button" disabled={busy || (!reply.trim() && !file)} onClick={() => void send()}
                style={{ backgroundColor: '#C0392B', color: '#FFFFFF', border: 'none', borderRadius: 4, padding: '9px 18px', fontWeight: 700, cursor: 'pointer', opacity: busy ? 0.6 : 1 }}>
                {busy ? 'Envoi…' : internal ? 'Ajouter la note' : 'Envoyer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
