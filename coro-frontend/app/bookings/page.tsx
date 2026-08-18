'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import AppLayout from '@/components/layout/AppLayout';

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; icon: string }> = {
  DEMANDEE:   { label: 'Demandée',   color: '#2980B9', bg: '#EBF5FB', border: '#AED6F1', icon: '⏳' },
  CONFIRMEE:  { label: 'Confirmée',  color: '#27AE60', bg: '#EAFAF1', border: '#A9DFBF', icon: '✅' },
  REPORTEE:   { label: 'Reportée',   color: '#F39C12', bg: '#FEF9E7', border: '#FAD7A0', icon: '📅' },
  REASSIGNEE: { label: 'Réassignée', color: '#8E44AD', bg: '#F4ECF7', border: '#D2B4DE', icon: '👤' },
  REFUSEE:    { label: 'Refusée',    color: '#C0392B', bg: '#FDEDEC', border: '#F1948A', icon: '❌' },
  COMPLETEE:  { label: 'Complétée',  color: '#27AE60', bg: '#EAFAF1', border: '#A9DFBF', icon: '✓' },
  ANNULEE:    { label: 'Annulée',    color: '#6C757D', bg: '#F8F9FA', border: '#DEE2E6', icon: '✕' },
};

const ACTIVITY_LABELS: Record<string, string> = {
  exercice:  '🚨 Exercice d\'évacuation',
  formation: '📚 Formation',
  visite:    '🏢 Visite de suivi',
  revision:  '📄 Révision documentaire',
  autre:     '📅 Autre activité',
};

export default function BookingsPage() {
  const router = useRouter();
  const [bookings, setBookings] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');
  const [search, setSearch] = useState('');

  // Modals
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showRefuseModal, setShowRefuseModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [refuseReason, setRefuseReason] = useState('');
  const [reportedDate, setReportedDate] = useState('');
  const [reportedTime, setReportedTime] = useState('09:00');
  const [newUserId, setNewUserId] = useState('');
  const [processing, setProcessing] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [bookingsRes, usersRes] = await Promise.all([
        api.get('/bookings/organization'),
        api.get('/settings/users').catch(() => ({ data: [] })),
      ]);
      setBookings(bookingsRes.data || []);
      setUsers(usersRes.data || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleAction = async (action: string) => {
    if (!selectedBooking) return;
    setProcessing(true);
    try {
      let body: any = { status: action };
      if (action === 'REFUSEE') body.refuseReason = refuseReason;
      if (action === 'REPORTEE') body.reportedDate = new Date(`${reportedDate}T${reportedTime}:00`).toISOString();
      if (action === 'REASSIGNEE') body.newUserId = newUserId;

      await api.put(`/bookings/${selectedBooking.id}/status`, body);
      setSuccessMsg('Réservation mise à jour avec succès.');
      setTimeout(() => setSuccessMsg(''), 4000);
      closeAllModals();
      await fetchData();
    } catch (err) { console.error(err); }
    finally { setProcessing(false); }
  };

  const closeAllModals = () => {
    setShowConfirmModal(false);
    setShowRefuseModal(false);
    setShowReportModal(false);
    setShowReassignModal(false);
    setSelectedBooking(null);
    setRefuseReason('');
    setReportedDate('');
    setReportedTime('09:00');
    setNewUserId('');
  };

  const openModal = (booking: any, type: 'confirm' | 'refuse' | 'report' | 'reassign') => {
    setSelectedBooking(booking);
    if (type === 'confirm') setShowConfirmModal(true);
    if (type === 'refuse') setShowRefuseModal(true);
    if (type === 'report') setShowReportModal(true);
    if (type === 'reassign') setShowReassignModal(true);
  };

  const filtered = bookings.filter(b => {
    if (filterStatus && b.status !== filterStatus) return false;
    if (filterType && b.activityType !== filterType) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!b.project?.name?.toLowerCase().includes(q) &&
          !b.clientUser?.firstName?.toLowerCase().includes(q) &&
          !b.clientUser?.lastName?.toLowerCase().includes(q) &&
          !b.project?.client?.name?.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const demandees = bookings.filter(b => b.status === 'DEMANDEE').length;
  const confirmees = bookings.filter(b => b.status === 'CONFIRMEE').length;
  const completees = bookings.filter(b => b.status === 'COMPLETEE').length;

  const minDate = new Date();
  minDate.setDate(minDate.getDate() + 1);
  const minDateStr = minDate.toISOString().split('T')[0];

  const sel = {border:'1px solid #DEE2E6',color:'#2C3E50',backgroundColor:'#FFFFFF',width:'100%',minHeight:46,padding:'10px 12px',borderRadius:7,fontSize:16};
  const inp = {border:'1px solid #DEE2E6',color:'#2C3E50',width:'100%',minHeight:46,padding:'10px 12px',borderRadius:7,fontSize:16};
  const lbl = {display:'block' as const,fontSize:13,fontWeight:600,color:'#495057',marginBottom:6};

  if (loading) return (
    <AppLayout>
      <div className="flex items-center justify-center py-24">
        <p className="text-sm animate-pulse" style={{ color: '#ADB5BD' }}>Chargement...</p>
      </div>
    </AppLayout>
  );

  return (
    <AppLayout>
      {/* En-tête */}
      <div className="mb-5 sm:mb-6">
        <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: '#ADB5BD' }}>Portail client</p>
        <h1 className="text-xl sm:text-2xl font-black uppercase" style={{ color: '#2C3E50' }}>Réservations</h1>
        <div className="h-1 w-16 mt-2" style={{ backgroundColor: '#C0392B' }} />
      </div>

      {/* Message succès */}
      {successMsg && (
        <div className="rounded-md p-4 mb-5 sm:mb-6 flex items-start gap-3"
          style={{ backgroundColor: '#EAFAF1', border: '1px solid #A9DFBF' }}>
          <span style={{ color: '#27AE60', fontSize: 20 }}>✓</span>
          <p className="text-sm font-medium" style={{ color: '#27AE60' }}>{successMsg}</p>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-1 min-[430px]:grid-cols-3 gap-3 sm:gap-4 mb-5 sm:mb-6">
        {[
          { label: 'En attente', value: demandees, color: '#2980B9', bg: '#EBF5FB', border: '#AED6F1' },
          { label: 'Confirmées', value: confirmees, color: '#27AE60', bg: '#EAFAF1', border: '#A9DFBF' },
          { label: 'Complétées', value: completees, color: '#6C757D', bg: '#F8F9FA', border: '#DEE2E6' },
        ].map(kpi => (
          <div key={kpi.label} className="rounded-md p-4 sm:p-5 cursor-pointer min-h-[92px] flex flex-col justify-center"
            style={{ backgroundColor: kpi.bg, border: `1px solid ${kpi.border}` }}
            onClick={() => setFilterStatus(kpi.label === 'En attente' ? 'DEMANDEE' : kpi.label === 'Confirmées' ? 'CONFIRMEE' : 'COMPLETEE')}>
            <p className="text-xs font-medium mb-1" style={{ color: kpi.color }}>{kpi.label}</p>
            <p className="text-2xl sm:text-3xl font-black" style={{ color: kpi.color }}>{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Alerte demandes en attente */}
      {demandees > 0 && (
        <div className="rounded-md p-4 mb-5 sm:mb-6 flex items-start gap-3"
          style={{ backgroundColor: '#FEF9E7', border: '1px solid #FAD7A0' }}>
          <span style={{ fontSize: 20 }}>⏳</span>
          <p className="text-sm" style={{ color: '#F39C12' }}>
            <strong>{demandees} demande{demandees > 1 ? 's' : ''}</strong> en attente de votre réponse.
            Répondez dans les 48h pour une expérience client optimale.
          </p>
        </div>
      )}

      {/* Filtres */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5 sm:mb-6">
        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="🔍 Rechercher client, projet..."
          className="px-3 py-3 text-base sm:text-sm rounded min-h-11"
          style={{ border: '1px solid #DEE2E6', color: '#2C3E50', backgroundColor: '#FFFFFF' }} />
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="px-3 py-3 text-base sm:text-sm rounded min-h-11"
          style={{ border: '1px solid #DEE2E6', color: '#2C3E50', backgroundColor: '#FFFFFF' }}>
          <option value="">Tous les statuts</option>
          {Object.entries(STATUS_CONFIG).map(([k, v]) => (
            <option key={k} value={k}>{v.icon} {v.label}</option>
          ))}
        </select>
        <select value={filterType} onChange={e => setFilterType(e.target.value)}
          className="px-3 py-3 text-base sm:text-sm rounded min-h-11"
          style={{ border: '1px solid #DEE2E6', color: '#2C3E50', backgroundColor: '#FFFFFF' }}>
          <option value="">Tous les types</option>
          {Object.entries(ACTIVITY_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>

      {/* Liste des réservations */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 rounded-md"
          style={{ backgroundColor: '#FFFFFF', border: '1px solid #E9ECEF' }}>
          <p style={{ fontSize: 48, margin: '0 0 12px' }}>📅</p>
          <p className="text-sm font-medium mb-2" style={{ color: '#2C3E50' }}>Aucune réservation trouvée</p>
          <p className="text-xs" style={{ color: '#ADB5BD' }}>Les demandes de réservation de vos clients apparaîtront ici.</p>
        </div>
      ) : (
        <div className="space-y-3 sm:space-y-4">
          {filtered.map((booking: any) => {
            const sc = STATUS_CONFIG[booking.status] || STATUS_CONFIG.DEMANDEE;
            const isPending = booking.status === 'DEMANDEE';
            const isConfirmed = booking.status === 'CONFIRMEE';

            return (
              <div key={booking.id} className="rounded-md"
                style={{ backgroundColor: '#FFFFFF', border: `1px solid ${isPending ? '#FAD7A0' : sc.border}`, boxShadow: isPending ? '0 2px 8px rgba(243,156,18,0.1)' : '0 1px 4px rgba(0,0,0,0.05)' }}>

                {/* En-tête carte */}
                <div className="p-4 sm:p-5">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className="text-xs font-bold px-2 py-1 rounded"
                          style={{ backgroundColor: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}>
                          {sc.icon} {sc.label}
                        </span>
                        {isPending && (
                          <span className="text-xs font-bold px-2 py-1 rounded animate-pulse whitespace-nowrap"
                            style={{ backgroundColor: '#FEF9E7', color: '#F39C12', border: '1px solid #FAD7A0' }}>
                            Action requise
                          </span>
                        )}
                      </div>
                      <h3 className="font-bold text-base mb-1" style={{ color: '#2C3E50' }}>
                        {ACTIVITY_LABELS[booking.activityType] || booking.activityType}
                      </h3>
                      <p className="text-sm break-words" style={{ color: '#6C757D' }}>
                        {booking.project?.name} — {booking.project?.building?.name}
                      </p>
                    </div>

                    {/* Actions rapides */}
                    {isPending && (
                      <div className="grid grid-cols-2 sm:flex gap-2 w-full sm:w-auto sm:flex-wrap sm:flex-shrink-0">
                        <button onClick={() => openModal(booking, 'confirm')}
                          className="text-sm font-bold px-3 sm:px-4 py-2.5 rounded text-white transition-colors min-h-11 w-full sm:w-auto"
                          style={{ backgroundColor: '#27AE60' }}
                          onMouseEnter={e => e.currentTarget.style.backgroundColor = '#1E8449'}
                          onMouseLeave={e => e.currentTarget.style.backgroundColor = '#27AE60'}>
                          ✓ Confirmer
                        </button>
                        <button onClick={() => openModal(booking, 'report')}
                          className="text-sm font-medium px-3 sm:px-4 py-2.5 rounded transition-colors min-h-11 w-full sm:w-auto"
                          style={{ border: '1px solid #FAD7A0', color: '#F39C12' }}
                          onMouseEnter={e => e.currentTarget.style.backgroundColor = '#FEF9E7'}
                          onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                          📅 Reporter
                        </button>
                        <button onClick={() => openModal(booking, 'reassign')}
                          className="text-sm font-medium px-3 sm:px-4 py-2.5 rounded transition-colors min-h-11 w-full sm:w-auto"
                          style={{ border: '1px solid #D2B4DE', color: '#8E44AD' }}
                          onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F4ECF7'}
                          onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                          👤 Réassigner
                        </button>
                        <button onClick={() => openModal(booking, 'refuse')}
                          className="text-sm font-medium px-3 sm:px-4 py-2.5 rounded transition-colors min-h-11 w-full sm:w-auto"
                          style={{ border: '1px solid #F1948A', color: '#C0392B' }}
                          onMouseEnter={e => e.currentTarget.style.backgroundColor = '#FDEDEC'}
                          onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                          ✕ Refuser
                        </button>
                      </div>
                    )}

                    {isConfirmed && (
                      <div className="grid grid-cols-1 min-[430px]:grid-cols-2 sm:flex gap-2 w-full sm:w-auto sm:flex-shrink-0">
                        <button onClick={() => api.put(`/bookings/${booking.id}/status`, { status: 'COMPLETEE' }).then(fetchData)}
                          className="text-sm font-medium px-3 sm:px-4 py-2.5 rounded transition-colors min-h-11 w-full sm:w-auto"
                          style={{ border: '1px solid #A9DFBF', color: '#27AE60' }}
                          onMouseEnter={e => e.currentTarget.style.backgroundColor = '#EAFAF1'}
                          onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                          ✓ Marquer complétée
                        </button>
                        <button onClick={() => openModal(booking, 'report')}
                          className="text-sm font-medium px-3 sm:px-4 py-2.5 rounded transition-colors min-h-11 w-full sm:w-auto"
                          style={{ border: '1px solid #FAD7A0', color: '#F39C12' }}
                          onMouseEnter={e => e.currentTarget.style.backgroundColor = '#FEF9E7'}
                          onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                          📅 Reporter
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Métriques */}
                  <div className="grid grid-cols-1 min-[430px]:grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="rounded px-3 py-2 min-w-0" style={{ backgroundColor: '#F8F9FA', border: '1px solid #E9ECEF' }}>
                      <p className="text-xs mb-1" style={{ color: '#ADB5BD' }}>Date demandée</p>
                      <p className="text-sm font-semibold break-words" style={{ color: '#2C3E50' }}>
                        {new Date(booking.requestedDate).toLocaleDateString('fr-CA', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    {booking.reportedDate && (
                      <div className="rounded px-3 py-2 min-w-0" style={{ backgroundColor: '#FEF9E7', border: '1px solid #FAD7A0' }}>
                        <p className="text-xs mb-1" style={{ color: '#F39C12' }}>Nouvelle date</p>
                        <p className="text-sm font-semibold" style={{ color: '#F39C12' }}>
                          {new Date(booking.reportedDate).toLocaleDateString('fr-CA', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    )}
                    <div className="rounded px-3 py-2 min-w-0" style={{ backgroundColor: '#F8F9FA', border: '1px solid #E9ECEF' }}>
                      <p className="text-xs mb-1" style={{ color: '#ADB5BD' }}>Durée</p>
                      <p className="text-sm font-semibold break-words" style={{ color: '#2C3E50' }}>{booking.duration} min</p>
                    </div>
                    <div className="rounded px-3 py-2 min-w-0" style={{ backgroundColor: '#F8F9FA', border: '1px solid #E9ECEF' }}>
                      <p className="text-xs mb-1" style={{ color: '#ADB5BD' }}>Demandé par</p>
                      <p className="text-sm font-semibold break-words" style={{ color: '#2C3E50' }}>
                        {booking.clientUser?.firstName} {booking.clientUser?.lastName}
                      </p>
                      <p className="text-xs break-all" style={{ color: '#ADB5BD' }}>{booking.clientUser?.email}</p>
                    </div>
                  </div>

                  {/* Infos optionnelles */}
                  {(booking.participants || booking.comment) && (
                    <div className="mt-3 flex flex-wrap gap-3">
                      {booking.participants && (
                        <span className="text-xs px-2 py-1 rounded" style={{ backgroundColor: '#EBF5FB', color: '#2980B9', border: '1px solid #AED6F1' }}>
                          👥 {booking.participants} participants
                        </span>
                      )}
                      {booking.comment && (
                        <p className="text-xs italic w-full" style={{ color: '#6C757D' }}>
                          « {booking.comment} »
                        </p>
                      )}
                    </div>
                  )}

                  {booking.refuseReason && (
                    <div className="mt-3 p-3 rounded" style={{ backgroundColor: '#FDEDEC', border: '1px solid #F1948A' }}>
                      <p className="text-xs" style={{ color: '#C0392B' }}>Motif de refus : {booking.refuseReason}</p>
                    </div>
                  )}

                  {/* Conseiller assigné */}
                  <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <p className="text-xs" style={{ color: '#ADB5BD' }}>
                      Conseiller : <strong style={{ color: '#6C757D' }}>{booking.assignedUser?.firstName} {booking.assignedUser?.lastName}</strong>
                    </p>
                    <button onClick={() => router.push(`/projects/${booking.project?.id}`)}
                      className="text-xs px-3 py-2.5 rounded transition-colors min-h-11 w-full sm:w-auto"
                      style={{ border: '1px solid #DEE2E6', color: '#6C757D' }}
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F8F9FA'}
                      onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                      Voir le projet →
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── MODALS ── */}

      {/* Confirmer */}
      {showConfirmModal && selectedBooking && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-3 sm:p-4 overflow-y-auto"
          style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
          onClick={() => !processing && closeAllModals()}>
          <div onClick={e => e.stopPropagation()}
            className="w-full max-w-md max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-md p-4 sm:p-6"
            style={{ backgroundColor: '#FFFFFF', boxShadow: '0 8px 32px rgba(0,0,0,0.15)' }}>
            <h3 className="font-bold text-lg mb-2" style={{ color: '#27AE60' }}>✓ Confirmer la réservation</h3>
            <p className="text-sm mb-4" style={{ color: '#6C757D' }}>
              Vous confirmez la demande de <strong>{selectedBooking.clientUser?.firstName} {selectedBooking.clientUser?.lastName}</strong> pour un <strong>{ACTIVITY_LABELS[selectedBooking.activityType]}</strong> le{' '}
              <strong>{new Date(selectedBooking.requestedDate).toLocaleDateString('fr-CA', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</strong>.
            </p>
            <p className="text-xs mb-6" style={{ color: '#ADB5BD' }}>Le client recevra automatiquement un courriel de confirmation.</p>
            <div className="flex flex-col-reverse sm:flex-row gap-3">
              <button onClick={closeAllModals} disabled={processing}
                className="flex-1 min-h-11 py-3 rounded font-medium text-sm"
                style={{ border: '1px solid #DEE2E6', color: '#6C757D' }}>Annuler</button>
              <button onClick={() => handleAction('CONFIRMEE')} disabled={processing}
                className="flex-1 min-h-11 py-3 rounded font-bold text-sm text-white disabled:opacity-50"
                style={{ backgroundColor: '#27AE60' }}>
                {processing ? 'Confirmation...' : '✓ Confirmer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Refuser */}
      {showRefuseModal && selectedBooking && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-3 sm:p-4 overflow-y-auto"
          style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
          onClick={() => !processing && closeAllModals()}>
          <div onClick={e => e.stopPropagation()}
            className="w-full max-w-md max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-md p-4 sm:p-6"
            style={{ backgroundColor: '#FFFFFF', boxShadow: '0 8px 32px rgba(0,0,0,0.15)' }}>
            <h3 className="font-bold text-lg mb-2" style={{ color: '#C0392B' }}>✕ Refuser la demande</h3>
            <p className="text-sm mb-4" style={{ color: '#6C757D' }}>Expliquez la raison du refus. Le client sera notifié automatiquement.</p>
            <div className="mb-5 sm:mb-6">
              <label style={lbl}>Motif du refus *</label>
              <textarea value={refuseReason} onChange={e => setRefuseReason(e.target.value)}
                placeholder="Ex: Agenda complet pour cette période. Veuillez proposer une date après le 15 septembre."
                rows={4}
                style={{ ...inp, resize: 'vertical' as const }} />
            </div>
            <div className="flex flex-col-reverse sm:flex-row gap-3">
              <button onClick={closeAllModals} disabled={processing}
                className="flex-1 min-h-11 py-3 rounded font-medium text-sm"
                style={{ border: '1px solid #DEE2E6', color: '#6C757D' }}>Annuler</button>
              <button onClick={() => handleAction('REFUSEE')} disabled={processing || !refuseReason.trim()}
                className="flex-1 min-h-11 py-3 rounded font-bold text-sm text-white disabled:opacity-50"
                style={{ backgroundColor: '#C0392B' }}>
                {processing ? 'Envoi...' : '✕ Refuser'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reporter */}
      {showReportModal && selectedBooking && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-3 sm:p-4 overflow-y-auto"
          style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
          onClick={() => !processing && closeAllModals()}>
          <div onClick={e => e.stopPropagation()}
            className="w-full max-w-md max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-md p-4 sm:p-6"
            style={{ backgroundColor: '#FFFFFF', boxShadow: '0 8px 32px rgba(0,0,0,0.15)' }}>
            <h3 className="font-bold text-lg mb-2" style={{ color: '#F39C12' }}>📅 Reporter la réservation</h3>
            <p className="text-sm mb-4" style={{ color: '#6C757D' }}>Proposez une nouvelle date au client. Il sera notifié automatiquement.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              <div>
                <label style={lbl}>Nouvelle date *</label>
                <input type="date" value={reportedDate} min={minDateStr}
                  onChange={e => setReportedDate(e.target.value)} style={inp} />
              </div>
              <div>
                <label style={lbl}>Heure *</label>
                <input type="time" value={reportedTime}
                  onChange={e => setReportedTime(e.target.value)} style={inp} />
              </div>
            </div>
            <div className="flex flex-col-reverse sm:flex-row gap-3">
              <button onClick={closeAllModals} disabled={processing}
                className="flex-1 min-h-11 py-3 rounded font-medium text-sm"
                style={{ border: '1px solid #DEE2E6', color: '#6C757D' }}>Annuler</button>
              <button onClick={() => handleAction('REPORTEE')} disabled={processing || !reportedDate}
                className="flex-1 min-h-11 py-3 rounded font-bold text-sm text-white disabled:opacity-50"
                style={{ backgroundColor: '#F39C12' }}>
                {processing ? 'Envoi...' : '📅 Reporter'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Réassigner */}
      {showReassignModal && selectedBooking && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-3 sm:p-4 overflow-y-auto"
          style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
          onClick={() => !processing && closeAllModals()}>
          <div onClick={e => e.stopPropagation()}
            className="w-full max-w-md max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-md p-4 sm:p-6"
            style={{ backgroundColor: '#FFFFFF', boxShadow: '0 8px 32px rgba(0,0,0,0.15)' }}>
            <h3 className="font-bold text-lg mb-2" style={{ color: '#8E44AD' }}>👤 Réassigner la réservation</h3>
            <p className="text-sm mb-4" style={{ color: '#6C757D' }}>Assignez cette demande à un autre membre de votre équipe. Le client sera notifié du changement.</p>
            <div className="mb-5 sm:mb-6">
              <label style={lbl}>Nouveau conseiller *</label>
              <select value={newUserId} onChange={e => setNewUserId(e.target.value)} style={sel}>
                <option value="">Sélectionner un conseiller...</option>
                {users.map((u: any) => (
                  <option key={u.id} value={u.id}>{u.firstName} {u.lastName} — {u.email}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col-reverse sm:flex-row gap-3">
              <button onClick={closeAllModals} disabled={processing}
                className="flex-1 min-h-11 py-3 rounded font-medium text-sm"
                style={{ border: '1px solid #DEE2E6', color: '#6C757D' }}>Annuler</button>
              <button onClick={() => handleAction('REASSIGNEE')} disabled={processing || !newUserId}
                className="flex-1 min-h-11 py-3 rounded font-bold text-sm text-white disabled:opacity-50"
                style={{ backgroundColor: '#8E44AD' }}>
                {processing ? 'Réassignation...' : '👤 Réassigner'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}