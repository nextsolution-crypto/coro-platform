'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';
import api from '@/lib/api';
import type { MyAssignment, MyAssignmentsResponse } from './types';
import { dateKey, formatClock, formatDay } from './time';
import styles from './planning.module.css';

export default function MyAssignmentsPanel({ refreshKey, onChanged }: {
  refreshKey: number; onChanged: () => void;
}) {
  const [data, setData] = useState<MyAssignmentsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [refusing, setRefusing] = useState<MyAssignment | null>(null);
  const [reason, setReason] = useState('');
  const [busyId, setBusyId] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api.get<MyAssignmentsResponse>('/planning/my-assignments')
      .then(response => { if (!cancelled) setData(response.data); })
      .catch(() => { if (!cancelled) setError('Impossible de charger vos affectations.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [refreshKey]);

  const respond = async (item: MyAssignment, status: 'ACCEPTED' | 'DECLINED') => {
    setBusyId(item.assignmentId); setError(''); setMessage('');
    try {
      await api.post(`/bookings/${item.bookingId}/assignments/${item.assignmentId}/respond`, {
        status, ...(status === 'DECLINED' && reason.trim() ? { declineReason: reason.trim() } : {}),
      });
      setData(current => current ? { ...current, pendingCount: current.pendingCount - 1,
        items: current.items.filter(row => row.assignmentId !== item.assignmentId) } : current);
      setMessage(status === 'ACCEPTED' ? 'Vous avez accepté cette affectation.' : 'Vous avez refusé cette affectation.');
      setRefusing(null); setReason(''); onChanged();
    } catch (cause) {
      const value = axios.isAxiosError(cause) ? cause.response?.data?.message : null;
      setError(Array.isArray(value) ? value.join(' ') : value || 'Cette affectation ne peut plus être traitée.');
      onChanged();
    } finally { setBusyId(''); }
  };

  const count = data?.pendingCount ?? 0;
  return <section className={styles.myAssignments} aria-label="Mes affectations">
    <button type="button" className={`${styles.summaryCard} ${count ? styles.summaryCardActive : ''}`}
      onClick={() => setOpen(value => !value)} aria-expanded={open} aria-controls="my-assignments-panel">
      <strong>{loading ? '…' : count}</strong><span>Mes affectations à confirmer{count > 0 && <em>À traiter</em>}</span>
    </button>
    {message && <p className={styles.success} role="status">{message}</p>}
    {error && <p className={styles.error} role="alert">{error}</p>}
    {open && <div id="my-assignments-panel" className={styles.actionList}>
      <div className={styles.actionListHeader}><h2>Mes affectations à confirmer</h2>
        <button type="button" onClick={() => setOpen(false)} aria-label="Fermer mes affectations">×</button></div>
      {!loading && !data?.items.length && <p className={styles.compactEmpty}>✓ Aucune affectation en attente.</p>}
      <ul>{data?.items.map(item => <li key={item.assignmentId} className={styles.assignmentCard}>
        <div className={styles.actionContent}><div className={styles.actionTitle}><strong>{item.title}</strong><em>{item.role}</em></div>
          {item.activityType !== item.title && <span>{item.activityType}</span>}
          <span>{item.client}{item.building ? ` · ${item.building}` : ''}</span><span>{item.project}</span>
          <span>{formatDay(dateKey(new Date(item.effectiveStartUtc), item.timeZone))} · {formatClock(item.effectiveStartUtc, item.timeZone)} · {item.durationMinutes} minutes</span>
          <span>En attente de votre confirmation</span></div>
        <div className={styles.actionButtons}><button type="button" className={styles.primaryButton}
          disabled={Boolean(busyId)} onClick={() => respond(item, 'ACCEPTED')}>Accepter</button>
          <button type="button" className={styles.inlineButton} disabled={Boolean(busyId)}
            onClick={() => { setRefusing(item); setReason(''); }}>Refuser</button></div>
      </li>)}</ul>
    </div>}
    {refusing && <section className={styles.confirmPanel} role="alertdialog" aria-label="Confirmer le refus">
      <h3>Refuser cette affectation ?</h3><p>L’affectation restera dans l’historique et le planificateur devra la remplacer si nécessaire.</p>
      <label>Motif facultatif<textarea rows={3} maxLength={2000} value={reason} onChange={event => setReason(event.target.value)} /></label>
      <div className={styles.formActions}><button type="button" disabled={Boolean(busyId)} onClick={() => setRefusing(null)}>Retour</button>
        <button type="button" className={styles.dangerButton} disabled={Boolean(busyId)}
          onClick={() => respond(refusing, 'DECLINED')}>{busyId ? 'Refus…' : 'Refuser'}</button></div>
    </section>}
  </section>;
}
