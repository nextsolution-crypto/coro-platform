'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import AppLayout from '@/components/layout/AppLayout';
import { useAuthStore } from '@/stores/auth.store';
import { formatDateTime, PRIORITY_LABELS, SUPPORT_STATUS, SUPPORT_TYPE_LABELS, type SupportTicketSummary } from '@/lib/support';

const input = { border: '1px solid #DEE2E6', borderRadius: 4, padding: '7px 10px', fontSize: 13, color: '#2C3E50', backgroundColor: '#FFFFFF' } as const;

/**
 * Console de support. Super admin : file de l'équipe CORO (et, en consultation, les files des firmes).
 * Administrateur d'une firme : questions posées par ses clients dans le portail.
 */
export default function SupportConsolePage() {
  const { user } = useAuthStore();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const [scope, setScope] = useState<'CORO' | 'ADVISOR'>('CORO');
  const [status, setStatus] = useState('OPEN');
  const [type, setType] = useState('');
  const [tickets, setTickets] = useState<SupportTicketSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ status, ...(type ? { type } : {}), ...(isSuperAdmin ? { scope } : {}) });
      const res = await api.get(`/support/console/tickets?${params.toString()}`);
      setTickets(res.data || []);
      setError('');
    } catch {
      setError('Accès réservé aux administrateurs.');
    } finally {
      setLoading(false);
    }
  }, [status, type, scope, isSuperAdmin]);

  useEffect(() => { if (user) void load(); }, [user, load]);

  const overdue = tickets.filter(t => t.overdue).length;

  return (
    <AppLayout>
      <div style={{ display: 'grid', gap: 16 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: '#2C3E50' }}>Demandes de support</h1>
          <p style={{ margin: '4px 0 0', fontSize: 14, color: '#6C757D' }}>
            {isSuperAdmin
              ? 'Bugs, accès et suggestions de tous les utilisateurs. Les questions des clients sur leurs plans vont à leur firme-conseil.'
              : 'Questions posées par vos clients dans le portail. Les bugs et les accès sont traités par l’équipe CORO.'}
          </p>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
          {isSuperAdmin && (
            <div role="tablist" style={{ display: 'flex', gap: 4 }}>
              {(['CORO', 'ADVISOR'] as const).map(value => (
                <button key={value} role="tab" aria-selected={scope === value} type="button" onClick={() => setScope(value)}
                  style={{ ...input, cursor: 'pointer', fontWeight: 700, borderColor: scope === value ? '#C0392B' : '#DEE2E6', color: scope === value ? '#C0392B' : '#2C3E50' }}>
                  {value === 'CORO' ? 'Équipe CORO' : 'Files des firmes (lecture)'}
                </button>
              ))}
            </div>
          )}
          <select style={input} value={status} onChange={e => setStatus(e.target.value)} aria-label="Statut">
            <option value="OPEN">Ouvertes</option>
            <option value="ALL">Toutes</option>
            {Object.entries(SUPPORT_STATUS).map(([value, s]) => <option key={value} value={value}>{s.label}</option>)}
          </select>
          <select style={input} value={type} onChange={e => setType(e.target.value)} aria-label="Type">
            <option value="">Tous les types</option>
            {Object.entries(SUPPORT_TYPE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          {overdue > 0 && <span style={{ fontSize: 13, fontWeight: 700, color: '#C0392B' }}>{overdue} en retard sur le délai de réponse</span>}
        </div>

        {error && <p style={{ color: '#C0392B' }}>{error}</p>}
        {loading ? <p style={{ color: '#6C757D' }}>Chargement…</p> : tickets.length === 0 ? (
          <p style={{ color: '#6C757D', fontSize: 14 }}>Aucune demande dans cette vue.</p>
        ) : (
          <div style={{ overflowX: 'auto', backgroundColor: '#FFFFFF', border: '1px solid #E9ECEF', borderRadius: 6 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ textAlign: 'left', color: '#6C757D', backgroundColor: '#F8F9FA' }}>
                  {['Priorité', 'Demande', ...(isSuperAdmin ? ['Organisation'] : []), 'Type', 'Statut', 'Réponse attendue', 'Mise à jour'].map(h => (
                    <th key={h} style={{ padding: '10px 12px', fontWeight: 700 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tickets.map(ticket => {
                  const s = SUPPORT_STATUS[ticket.status] ?? SUPPORT_STATUS.NEW;
                  const p = PRIORITY_LABELS[ticket.priority];
                  return (
                    <tr key={ticket.id} style={{ borderTop: '1px solid #F1F3F5' }}>
                      <td style={{ padding: '10px 12px', color: p?.color, fontWeight: 700, whiteSpace: 'nowrap' }}>● {p?.label}</td>
                      <td style={{ padding: '10px 12px' }}>
                        <Link href={`/support/console/${ticket.id}`} style={{ color: '#2C3E50', fontWeight: 700 }}>{ticket.subject}</Link>
                        <span style={{ display: 'block', fontSize: 12, color: '#ADB5BD' }}>
                          {ticket.reference} · {ticket.channel === 'CLIENT_PORTAL' ? 'Portail client' : 'App conseiller'}
                          {ticket.duplicateCount ? ` · demandée ${ticket.duplicateCount + 1} fois` : ''}
                        </span>
                      </td>
                      {isSuperAdmin && <td style={{ padding: '10px 12px', color: '#6C757D' }}>{ticket.organizationName ?? '—'}</td>}
                      <td style={{ padding: '10px 12px', color: '#6C757D' }}>{SUPPORT_TYPE_LABELS[ticket.type] ?? ticket.type}</td>
                      <td style={{ padding: '10px 12px' }}><span style={{ fontWeight: 700, color: s.color, backgroundColor: s.bg, padding: '2px 8px', borderRadius: 4, whiteSpace: 'nowrap' }}>{s.label}</span></td>
                      <td style={{ padding: '10px 12px', whiteSpace: 'nowrap', color: ticket.overdue ? '#C0392B' : '#6C757D', fontWeight: ticket.overdue ? 700 : 400 }}>
                        {ticket.firstRespondedAt ? 'Répondu' : `${formatDateTime(ticket.firstResponseDueAt)}${ticket.overdue ? ' — en retard' : ''}`}
                      </td>
                      <td style={{ padding: '10px 12px', whiteSpace: 'nowrap', color: '#6C757D' }}>{formatDateTime(ticket.updatedAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
