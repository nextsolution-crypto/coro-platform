'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import AppLayout from '@/components/layout/AppLayout';
import {
  formatDateTime,
  SUPPORT_IMPACT_OPTIONS,
  SUPPORT_MAX_BYTES,
  SUPPORT_STATUS,
  SUPPORT_TYPE_LABELS,
  SUPPORT_TYPE_OPTIONS,
  supportContext,
  type SupportTicketSummary,
} from '@/lib/support';

const card = { backgroundColor: '#FFFFFF', border: '1px solid #E9ECEF', borderRadius: 6 } as const;
const input = { border: '1px solid #DEE2E6', borderRadius: 4, padding: '9px 11px', fontSize: 14, color: '#2C3E50', backgroundColor: '#FFFFFF', width: '100%' } as const;

/** Centre d'aide de l'app conseiller : nouvelle demande et suivi de mes demandes. */
export default function SupportPage() {
  const router = useRouter();
  const [tickets, setTickets] = useState<SupportTicketSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [type, setType] = useState('');
  const [impact, setImpact] = useState('DISRUPTIVE');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/support/tickets')
      .then(res => { setTickets(res.data || []); setShowForm((res.data || []).length === 0); })
      .catch(() => setError('Impossible de charger vos demandes.'))
      .finally(() => setLoading(false));
  }, []);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!type) { setError('Choisissez le type de demande.'); return; }
    if (subject.trim().length < 3) { setError('Le sujet est trop court.'); return; }
    if (message.trim().length < 10) { setError('Décrivez la situation en quelques mots (10 caractères au moins).'); return; }
    if (file && file.size > SUPPORT_MAX_BYTES) { setError('Pièce jointe : PDF ou JPG, 25 Mo maximum.'); return; }
    setSending(true);
    setError('');
    try {
      const res = await api.post('/support/tickets', {
        type,
        impact: type === 'SUGGESTION' ? 'MINOR' : impact,
        subject: subject.trim(),
        message: message.trim(),
        context: supportContext(),
      });
      if (file) {
        const form = new FormData();
        form.append('file', file);
        await api.post(`/support/tickets/${res.data.id}/attachments`, form).catch(() => undefined);
      }
      router.push(`/support/${res.data.id}`);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Envoi impossible pour le moment.');
      setSending(false);
    }
  };

  return (
    <AppLayout>
      <div style={{ maxWidth: 900, display: 'grid', gap: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: '#2C3E50' }}>Centre d’aide</h1>
            <p style={{ margin: '4px 0 0', fontSize: 14, color: '#6C757D' }}>Signalez un bug, posez une question ou proposez une amélioration. Chaque demande reçoit un numéro et un suivi.</p>
          </div>
          {!showForm && (
            <button type="button" onClick={() => setShowForm(true)}
              style={{ backgroundColor: '#C0392B', color: '#FFFFFF', border: 'none', borderRadius: 4, padding: '10px 18px', fontWeight: 700, cursor: 'pointer' }}>
              Nouvelle demande
            </button>
          )}
        </div>

        {showForm && (
          <form onSubmit={submit} style={{ ...card, padding: 20, display: 'grid', gap: 16 }}>
            <fieldset style={{ border: 'none', padding: 0, margin: 0, display: 'grid', gap: 8 }}>
              <legend style={{ fontSize: 14, fontWeight: 700, color: '#2C3E50', marginBottom: 8 }}>Type de demande</legend>
              <div style={{ display: 'grid', gap: 8, gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
                {SUPPORT_TYPE_OPTIONS.map(option => (
                  <button key={option.value} type="button" onClick={() => setType(option.value)} aria-pressed={type === option.value}
                    style={{ textAlign: 'left', padding: 12, borderRadius: 6, cursor: 'pointer', border: `2px solid ${type === option.value ? '#C0392B' : '#E9ECEF'}`, backgroundColor: type === option.value ? '#FDEDEC' : '#FFFFFF' }}>
                    <span style={{ display: 'block', fontSize: 14, fontWeight: 700, color: '#2C3E50' }}>{option.label}</span>
                    <span style={{ display: 'block', fontSize: 12, color: '#6C757D', marginTop: 2 }}>{option.hint}</span>
                  </button>
                ))}
              </div>
            </fieldset>

            {type && type !== 'SUGGESTION' && (
              <fieldset style={{ border: 'none', padding: 0, margin: 0, display: 'grid', gap: 6 }}>
                <legend style={{ fontSize: 14, fontWeight: 700, color: '#2C3E50', marginBottom: 6 }}>Impact sur votre travail</legend>
                {SUPPORT_IMPACT_OPTIONS.map(option => (
                  <label key={option.value} style={{ display: 'flex', gap: 8, alignItems: 'baseline', fontSize: 14, color: '#2C3E50', cursor: 'pointer' }}>
                    <input type="radio" name="impact" value={option.value} checked={impact === option.value} onChange={() => setImpact(option.value)} />
                    <span><strong>{option.label}</strong> <span style={{ color: '#6C757D', fontSize: 13 }}>— {option.hint}</span></span>
                  </label>
                ))}
              </fieldset>
            )}
            {type === 'SUGGESTION' && (
              <p style={{ margin: 0, fontSize: 13, color: '#6C757D' }}>Chaque suggestion est lue et regroupée avec les demandes semblables. Réponse sous 3 jours ouvrables.</p>
            )}

            <label style={{ display: 'grid', gap: 6, fontSize: 14, fontWeight: 700, color: '#2C3E50' }}>Sujet
              <input style={input} maxLength={140} value={subject} onChange={e => setSubject(e.target.value)} placeholder="Ex. : l’export PDF du PSI échoue" />
            </label>
            <label style={{ display: 'grid', gap: 6, fontSize: 14, fontWeight: 700, color: '#2C3E50' }}>Description
              <textarea style={{ ...input, minHeight: 140, resize: 'vertical' }} maxLength={8000} value={message} onChange={e => setMessage(e.target.value)}
                placeholder="Ce que vous faisiez, ce qui s’est passé, ce que vous attendiez." />
            </label>
            <label style={{ display: 'grid', gap: 4, fontSize: 13, color: '#6C757D' }}>Capture d’écran ou document (facultatif)
              <input type="file" accept=".pdf,.jpg,.jpeg,application/pdf,image/jpeg" onChange={e => setFile(e.target.files?.[0] ?? null)} />
              <span style={{ fontSize: 11, color: '#ADB5BD' }}>PDF ou JPG, 25 Mo maximum. La page d’où vous venez et votre navigateur sont joints automatiquement pour aider le diagnostic.</span>
            </label>

            {error && <p style={{ margin: 0, color: '#C0392B', fontSize: 13 }}>{error}</p>}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              {tickets.length > 0 && (
                <button type="button" onClick={() => setShowForm(false)} style={{ ...input, width: 'auto', cursor: 'pointer' }}>Annuler</button>
              )}
              <button type="submit" disabled={sending}
                style={{ backgroundColor: '#C0392B', color: '#FFFFFF', border: 'none', borderRadius: 4, padding: '10px 18px', fontWeight: 700, cursor: 'pointer', opacity: sending ? 0.6 : 1 }}>
                {sending ? 'Envoi…' : 'Envoyer la demande'}
              </button>
            </div>
          </form>
        )}

        <section style={{ display: 'grid', gap: 8 }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#2C3E50' }}>Mes demandes</h2>
          {loading ? <p style={{ color: '#6C757D' }}>Chargement…</p> : tickets.length === 0 ? (
            <p style={{ color: '#6C757D', fontSize: 14 }}>Aucune demande pour le moment.</p>
          ) : tickets.map(ticket => {
            const status = SUPPORT_STATUS[ticket.status] ?? SUPPORT_STATUS.NEW;
            return (
              <Link key={ticket.id} href={`/support/${ticket.id}`} style={{ ...card, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', textDecoration: 'none' }}>
                <span style={{ minWidth: 0 }}>
                  <span style={{ display: 'block', fontSize: 12, color: '#ADB5BD', fontWeight: 700 }}>{ticket.reference} · {SUPPORT_TYPE_LABELS[ticket.type] ?? ticket.type}</span>
                  <span style={{ display: 'block', fontSize: 14, fontWeight: 700, color: '#2C3E50', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ticket.subject}</span>
                  <span style={{ display: 'block', fontSize: 12, color: '#6C757D' }}>Mise à jour le {formatDateTime(ticket.updatedAt)}</span>
                </span>
                <span style={{ flexShrink: 0, fontSize: 12, fontWeight: 700, color: status.color, backgroundColor: status.bg, padding: '3px 8px', borderRadius: 4 }}>
                  {ticket.status === 'WAITING_REQUESTER' ? 'Réponse attendue de vous' : status.label}
                </span>
              </Link>
            );
          })}
        </section>
      </div>
    </AppLayout>
  );
}
