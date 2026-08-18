'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getUser, apiGet, apiPost } from '../store/auth';
import PortalLayout from '../components/PortalLayout';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002/api';

const ACTIVITY_TYPES = [
  { value: 'exercice', label: '🚨 Exercice d\'évacuation', duration: 180 },
  { value: 'formation', label: '📚 Formation', duration: 120 },
  { value: 'visite', label: '🏢 Visite de suivi', duration: 60 },
  { value: 'revision', label: '📄 Révision documentaire', duration: 90 },
  { value: 'autre', label: '📅 Autre activité', duration: 60 },
];

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; icon: string }> = {
  DEMANDEE:   { label: 'Demandée',   color: '#2980B9', bg: '#EBF5FB', border: '#AED6F1', icon: '⏳' },
  CONFIRMEE:  { label: 'Confirmée',  color: '#27AE60', bg: '#EAFAF1', border: '#A9DFBF', icon: '✅' },
  REPORTEE:   { label: 'Reportée',   color: '#F39C12', bg: '#FEF9E7', border: '#FAD7A0', icon: '📅' },
  REASSIGNEE: { label: 'Réassignée', color: '#8E44AD', bg: '#F4ECF7', border: '#D2B4DE', icon: '👤' },
  REFUSEE:    { label: 'Refusée',    color: '#C0392B', bg: '#FDEDEC', border: '#F1948A', icon: '❌' },
  COMPLETEE:  { label: 'Complétée',  color: '#27AE60', bg: '#EAFAF1', border: '#A9DFBF', icon: '✓' },
  ANNULEE:    { label: 'Annulée',    color: '#6C757D', bg: '#F8F9FA', border: '#DEE2E6', icon: '✕' },
};

export default function BookingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const [form, setForm] = useState({
    projectId: '',
    activityType: 'exercice',
    requestedDate: '',
    requestedTime: '09:00',
    duration: 180,
    participants: '',
    comment: '',
  });

  useEffect(() => {
    const currentUser = getUser();
    if (!currentUser) { router.replace('/login'); return; }
    setUser(currentUser);
    fetchData();
  }, [router]);

  const fetchData = async () => {
    try {
      const [projectsRes, bookingsRes] = await Promise.all([
        apiGet('/client-portal/projects'),
        apiGet('/client-portal/bookings'),
      ]);
      setProjects((projectsRes || []).filter((p: any) => p.status === 'VALIDATED' || p.status === 'EXPORTED'));
      setBookings(bookingsRes || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleActivityChange = (type: string) => {
    const activity = ACTIVITY_TYPES.find(a => a.value === type);
    setForm(f => ({ ...f, activityType: type, duration: activity?.duration || 60 }));
  };

  const handleSubmit = async () => {
    if (!form.projectId || !form.requestedDate || !form.requestedTime) return;
    setSubmitting(true);
    try {
      const requestedDate = new Date(`${form.requestedDate}T${form.requestedTime}:00`);
      const token = localStorage.getItem('coro_client_token');
      const res = await fetch(`${API_URL}/client-portal/projects/${form.projectId}/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          activityType: form.activityType,
          requestedDate: requestedDate.toISOString(),
          duration: form.duration,
          participants: form.participants ? parseInt(form.participants) : undefined,
          comment: form.comment || undefined,
        }),
      });
      if (!res.ok) throw new Error('Erreur');
      setSuccess(true);
      setShowForm(false);
      setForm({ projectId: '', activityType: 'exercice', requestedDate: '', requestedTime: '09:00', duration: 180, participants: '', comment: '' });
      await fetchData();
      setTimeout(() => setSuccess(false), 5000);
    } catch (err) { console.error(err); }
    finally { setSubmitting(false); }
  };

  const handleCancel = async (bookingId: string) => {
    if (!confirm('Annuler cette réservation ?')) return;
    try {
      const token = localStorage.getItem('coro_client_token');
      await fetch(`${API_URL}/bookings/${bookingId}/cancel`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ cancelledBy: 'client' }),
      });
      await fetchData();
    } catch (err) { console.error(err); }
  };

  const minDate = new Date();
  minDate.setDate(minDate.getDate() + 1);
  const minDateStr = minDate.toISOString().split('T')[0];

  if (loading || !user) return (
    <PortalLayout>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
        <p className="animate-pulse" style={{ color: '#ADB5BD', fontSize: 14 }}>Chargement...</p>
      </div>
    </PortalLayout>
  );

  return (
    <PortalLayout>
      <header style={{ marginBottom: 28 }}>
        <p style={{ margin: '0 0 4px', fontSize: 12, fontWeight: 700, color: '#ADB5BD', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Réservations
        </p>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <h1 style={{ margin: 0, fontSize: 'clamp(22px, 5vw, 28px)', fontWeight: 800, color: '#2C3E50' }}>
            Planifier une activité
          </h1>
          {projects.length > 0 && (
            <button onClick={() => setShowForm(true)}
              style={{ minHeight: 44, padding: '10px 20px', borderRadius: 8, backgroundColor: '#C0392B', color: '#FFFFFF', border: 'none', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
              + Nouvelle réservation
            </button>
          )}
        </div>
      </header>

      {success && (
        <div style={{ backgroundColor: '#EAFAF1', border: '1px solid #A9DFBF', borderRadius: 10, padding: '16px 20px', marginBottom: 20 }}>
          <p style={{ margin: 0, color: '#27AE60', fontWeight: 700 }}>✅ Demande envoyée ! Votre conseiller vous contactera pour confirmer.</p>
        </div>
      )}

      {/* Formulaire de réservation */}
      {showForm && (
        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E9ECEF', borderRadius: 12, padding: 'clamp(20px, 5vw, 32px)', marginBottom: 24, boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}>
          <h2 style={{ margin: '0 0 24px', fontSize: 18, fontWeight: 700, color: '#2C3E50' }}>Nouvelle demande de réservation</h2>

          <div style={{ display: 'grid', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#495057', marginBottom: 6 }}>Projet concerné *</label>
              <select value={form.projectId} onChange={e => setForm(f => ({ ...f, projectId: e.target.value }))}
                style={{ width: '100%', minHeight: 46, padding: '10px 12px', borderRadius: 7, border: '1px solid #DEE2E6', fontSize: 16, color: '#2C3E50', backgroundColor: '#FFFFFF' }}>
                <option value="">Sélectionner un projet...</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name} — {p.building?.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#495057', marginBottom: 6 }}>Type d'activité *</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 8 }}>
                {ACTIVITY_TYPES.map(a => (
                  <button key={a.value} type="button" onClick={() => handleActivityChange(a.value)}
                    style={{ minHeight: 46, padding: '10px 12px', borderRadius: 8, border: `2px solid ${form.activityType === a.value ? '#C0392B' : '#DEE2E6'}`, backgroundColor: form.activityType === a.value ? '#FDEDEC' : '#FFFFFF', color: form.activityType === a.value ? '#C0392B' : '#495057', fontSize: 13, fontWeight: 600, cursor: 'pointer', textAlign: 'left' }}>
                    {a.label}
                    <span style={{ display: 'block', fontSize: 11, color: '#ADB5BD', marginTop: 2 }}>{a.duration / 60}h</span>
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#495057', marginBottom: 6 }}>Date souhaitée *</label>
                <input type="date" value={form.requestedDate} min={minDateStr}
                  onChange={e => setForm(f => ({ ...f, requestedDate: e.target.value }))}
                  style={{ width: '100%', minHeight: 46, padding: '10px 12px', borderRadius: 7, border: '1px solid #DEE2E6', fontSize: 16, color: '#2C3E50' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#495057', marginBottom: 6 }}>Heure souhaitée *</label>
                <input type="time" value={form.requestedTime}
                  onChange={e => setForm(f => ({ ...f, requestedTime: e.target.value }))}
                  style={{ width: '100%', minHeight: 46, padding: '10px 12px', borderRadius: 7, border: '1px solid #DEE2E6', fontSize: 16, color: '#2C3E50' }} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#495057', marginBottom: 6 }}>Durée (minutes)</label>
                <input type="number" value={form.duration} min={30} step={30}
                  onChange={e => setForm(f => ({ ...f, duration: parseInt(e.target.value) }))}
                  style={{ width: '100%', minHeight: 46, padding: '10px 12px', borderRadius: 7, border: '1px solid #DEE2E6', fontSize: 16, color: '#2C3E50' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#495057', marginBottom: 6 }}>Nb. participants (optionnel)</label>
                <input type="number" value={form.participants} min={1}
                  onChange={e => setForm(f => ({ ...f, participants: e.target.value }))}
                  placeholder="Ex: 45"
                  style={{ width: '100%', minHeight: 46, padding: '10px 12px', borderRadius: 7, border: '1px solid #DEE2E6', fontSize: 16, color: '#2C3E50' }} />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#495057', marginBottom: 6 }}>Commentaire (optionnel)</label>
              <textarea value={form.comment} onChange={e => setForm(f => ({ ...f, comment: e.target.value }))}
                placeholder="Ex: Exercice surprise, 3e étage seulement..."
                rows={3}
                style={{ width: '100%', padding: '12px 14px', borderRadius: 7, border: '1px solid #DEE2E6', fontSize: 16, color: '#2C3E50', resize: 'vertical' }} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <button type="button" onClick={() => setShowForm(false)}
                style={{ minHeight: 48, padding: 12, borderRadius: 8, border: '1px solid #DEE2E6', backgroundColor: '#FFFFFF', color: '#6C757D', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                Annuler
              </button>
              <button type="button" onClick={handleSubmit}
                disabled={submitting || !form.projectId || !form.requestedDate || !form.requestedTime}
                style={{ minHeight: 48, padding: 12, borderRadius: 8, backgroundColor: submitting || !form.projectId || !form.requestedDate ? '#ADB5BD' : '#C0392B', color: '#FFFFFF', border: 'none', fontSize: 14, fontWeight: 700, cursor: submitting ? 'not-allowed' : 'pointer' }}>
                {submitting ? 'Envoi...' : '📅 Envoyer la demande'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Liste des réservations */}
      {bookings.length === 0 && !showForm ? (
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: 12, border: '1px solid #E9ECEF', padding: 'clamp(40px, 10vw, 64px) 20px', textAlign: 'center' }}>
          <p style={{ fontSize: 48, margin: '0 0 16px' }}>📅</p>
          <p style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 700, color: '#2C3E50' }}>Aucune réservation</p>
          <p style={{ margin: '0 0 24px', fontSize: 14, color: '#ADB5BD' }}>Planifiez votre prochain exercice ou formation.</p>
          {projects.length > 0 && (
            <button onClick={() => setShowForm(true)}
              style={{ minHeight: 46, padding: '12px 24px', borderRadius: 8, backgroundColor: '#C0392B', color: '#FFFFFF', border: 'none', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
              + Nouvelle réservation
            </button>
          )}
          {projects.length === 0 && (
            <p style={{ margin: 0, fontSize: 13, color: '#ADB5BD' }}>Aucun document validé disponible pour la réservation.</p>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {bookings.map((booking: any) => {
            const sc = STATUS_CONFIG[booking.status] || STATUS_CONFIG.DEMANDEE;
            const activity = ACTIVITY_TYPES.find(a => a.value === booking.activityType);
            const canCancel = ['DEMANDEE', 'CONFIRMEE'].includes(booking.status);
            return (
              <div key={booking.id} style={{ backgroundColor: '#FFFFFF', borderRadius: 12, border: `1px solid ${sc.border}`, padding: 'clamp(16px, 4vw, 24px)' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 12 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: 10, backgroundColor: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}>
                        {sc.icon} {sc.label}
                      </span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#2C3E50' }}>{activity?.label || booking.activityType}</span>
                    </div>
                    <p style={{ margin: 0, fontSize: 13, color: '#6C757D' }}>
                      {booking.project?.name} — {booking.project?.building?.name}
                    </p>
                  </div>
                  {canCancel && (
                    <button onClick={() => handleCancel(booking.id)}
                      style={{ minHeight: 36, padding: '6px 12px', borderRadius: 6, border: '1px solid #DEE2E6', backgroundColor: '#FFFFFF', color: '#C0392B', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                      Annuler
                    </button>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8 }}>
                  <div style={{ backgroundColor: '#F8F9FA', borderRadius: 6, padding: '8px 12px' }}>
                    <p style={{ margin: '0 0 2px', fontSize: 11, color: '#ADB5BD' }}>Date demandée</p>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#2C3E50' }}>
                      {new Date(booking.requestedDate).toLocaleDateString('fr-CA', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  {booking.reportedDate && (
                    <div style={{ backgroundColor: '#FEF9E7', borderRadius: 6, padding: '8px 12px' }}>
                      <p style={{ margin: '0 0 2px', fontSize: 11, color: '#F39C12' }}>Nouvelle date</p>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#F39C12' }}>
                        {new Date(booking.reportedDate).toLocaleDateString('fr-CA', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  )}
                  <div style={{ backgroundColor: '#F8F9FA', borderRadius: 6, padding: '8px 12px' }}>
                    <p style={{ margin: '0 0 2px', fontSize: 11, color: '#ADB5BD' }}>Durée</p>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#2C3E50' }}>{booking.duration} min</p>
                  </div>
                  <div style={{ backgroundColor: '#F8F9FA', borderRadius: 6, padding: '8px 12px' }}>
                    <p style={{ margin: '0 0 2px', fontSize: 11, color: '#ADB5BD' }}>Conseiller</p>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#2C3E50' }}>
                      {booking.assignedUser?.firstName} {booking.assignedUser?.lastName}
                    </p>
                  </div>
                </div>

                {booking.refuseReason && (
                  <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 6, backgroundColor: '#FDEDEC', border: '1px solid #F1948A' }}>
                    <p style={{ margin: 0, fontSize: 13, color: '#C0392B' }}>Motif : {booking.refuseReason}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </PortalLayout>
  );
}