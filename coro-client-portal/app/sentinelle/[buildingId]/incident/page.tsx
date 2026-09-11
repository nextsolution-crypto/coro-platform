'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { apiGet, getUser } from '../../../store/auth';
import PortalLayout from '../../../components/PortalLayout';
import { AlertTriangle, FileText, RefreshCw, Shield, CheckSquare, Square, Plus } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002/api';

const clientFetch = async (path: string, method = 'GET', body?: any) => {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${localStorage.getItem('coro_client_token')}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error('Erreur réseau');
  return res.json();
};

const INCIDENT_TYPES = [
  { value: 'SMOKE_DISCOVERY',    label: '🔥 Découverte de fumée',         color: '#E67E22' },
  { value: 'FIRE_ALERT',         label: '🚨 Alerte incendie',              color: '#E67E22' },
  { value: 'FIRE_ALARM',         label: '🔴 Alarme incendie générale',     color: '#C0392B' },
  { value: 'GAS_LEAK',           label: '💨 Fuite de gaz',                 color: '#8E44AD' },
  { value: 'ACTIVE_THREAT',      label: '🔐 Menace active / Confinement',  color: '#2C3E50' },
  { value: 'MEDICAL',            label: '🏥 Urgence médicale',             color: '#27AE60' },
  { value: 'TOXIC_GAS',          label: '☢️ Gaz toxique',                  color: '#8E44AD' },
  { value: 'SUSPICIOUS_PACKAGE', label: '📦 Colis suspect',                color: '#F39C12' },
  { value: 'POWER_OUTAGE',       label: '⚡ Coupure de courant',            color: '#6C757D' },
  { value: 'HAZMAT',             label: '⚠️ Matières dangereuses',          color: '#E67E22' },
  { value: 'BOMB_THREAT',        label: '💣 Alerte à la bombe',            color: '#C0392B' },
  { value: 'LITHIUM_BATTERY',    label: '🔋 Batterie lithium-ion',          color: '#E67E22' },
  { value: 'FLOODING',           label: '🌊 Inondations',                  color: '#2980B9' },
  { value: 'VIOLENT_WINDS',      label: '🌪️ Vents violents',               color: '#2980B9' },
  { value: 'OTHER',              label: '⚠️ Autre incident',               color: '#6C757D' },
];

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  ACTIVE:    { label: 'EN COURS',       color: '#C0392B', bg: '#FDEDEC', border: '#F1948A' },
  CONTAINED: { label: 'CONTENU',        color: '#E67E22', bg: '#FEF9E7', border: '#F9E79F' },
  RESOLVED:  { label: 'RÉSOLU',         color: '#27AE60', bg: '#EAFAF1', border: '#A9DFBF' },
};

export default function IncidentPage() {
  const router = useRouter();
  const params = useParams();
  const buildingId = params.buildingId as string;

  const [user, setUser]                   = useState<any>(null);
  const [incidents, setIncidents]         = useState<any[]>([]);
  const [loading, setLoading]             = useState(true);
  const [triggering, setTriggering]       = useState(false);
  const [logText, setLogText]             = useState<Record<string, string>>({});
  const [addingLog, setAddingLog]         = useState<string | null>(null);
  const [closingNotes, setClosingNotes]   = useState<Record<string, string>>({});
  const [showResolve, setShowResolve]     = useState<string | null>(null);
  const [selectedType, setSelectedType]   = useState('FIRE_ALERT');
  const [description, setDescription]    = useState('');
  const [showTrigger, setShowTrigger]     = useState(false);
  const [isExercise, setIsExercise]       = useState(false);

  useEffect(() => {
    const u = getUser();
    if (!u) { router.replace('/login'); return; }
    setUser(u);
    fetchIncidents();
  }, [buildingId]);

  const fetchIncidents = useCallback(async () => {
    try {
      const res = await clientFetch(`/client-portal/incidents/buildings/${buildingId}/active-all`);
      setIncidents(Array.isArray(res) ? res : res ? [res] : []);
    } catch { setIncidents([]); }
    finally { setLoading(false); }
  }, [buildingId]);

  useEffect(() => {
    if (incidents.length === 0) return;
    const interval = setInterval(fetchIncidents, 15000);
    return () => clearInterval(interval);
  }, [incidents.length, fetchIncidents]);

  const handleTrigger = async () => {
    if (!confirm(`Déclencher : ${INCIDENT_TYPES.find(t => t.value === selectedType)?.label} ?\n\nLe coordonnateur et l'équipe d'urgence seront notifiés immédiatement.`)) return;
    setTriggering(true);
    try {
      await clientFetch('/client-portal/incidents/trigger', 'POST', {
        buildingId, type: selectedType,
        triggeredBy: `${user?.firstName} ${user?.lastName}`,
        description: description || null,
        isExercise,
      });
      setDescription(''); setShowTrigger(false);
      await fetchIncidents();
    } catch { alert('Erreur lors du déclenchement.'); }
    finally { setTriggering(false); }
  };

  const handleToggleStep = async (taskId: string, currentStatus: string, incidentId: string) => {
    try {
      if (currentStatus === 'COMPLETED') {
        await clientFetch(`/client-portal/incidents/tasks/${taskId}/uncomplete`, 'PUT');
      } else {
        await clientFetch(`/client-portal/incidents/tasks/${taskId}/acknowledge`, 'PUT');
      }
      setIncidents(prev => prev.map(inc => inc.id !== incidentId ? inc : {
        ...inc,
        tasks: inc.tasks.map((t: any) => t.id !== taskId ? t :
          { ...t, status: currentStatus === 'COMPLETED' ? 'PENDING' : 'COMPLETED' }
        ),
      }));
    } catch { console.error('Erreur toggle étape'); }
  };

  const handleAddLog = async (incidentId: string) => {
    const text = logText[incidentId]?.trim();
    if (!text) return;
    setAddingLog(incidentId);
    try {
      const newLog = await clientFetch(`/client-portal/incidents/${incidentId}/logs`, 'POST', {
        action: text, actor: `${user?.firstName} ${user?.lastName}`,
      });
      setLogText(prev => ({ ...prev, [incidentId]: '' }));
      setIncidents(prev => prev.map(inc => inc.id !== incidentId ? inc : {
        ...inc, logs: [...(inc.logs || []), newLog],
      }));
    } catch { console.error('Erreur log'); }
    finally { setAddingLog(null); }
  };

  const handleContain = async (incidentId: string) => {
    try {
      await clientFetch(`/client-portal/incidents/${incidentId}/contain`, 'PUT');
      await fetchIncidents();
    } catch { console.error('Erreur contain'); }
  };

  const handleResolve = async (incidentId: string) => {
    try {
      await clientFetch(`/client-portal/incidents/${incidentId}/resolve`, 'PUT', {
        closingNotes: closingNotes[incidentId] || null,
      });
      setShowResolve(null);
      await fetchIncidents();
    } catch { console.error('Erreur resolve'); }
  };

  if (loading) return (
    <PortalLayout>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
        <p className="animate-pulse" style={{ color: '#ADB5BD', fontSize: 14 }}>Chargement...</p>
      </div>
    </PortalLayout>
  );

  const activeIncidents = incidents.filter(i => i.status !== 'RESOLVED');

  return (
    <PortalLayout>
      {/* ── En-tête ── */}
      <header style={{ marginBottom: 24 }}>
        <button type="button" onClick={() => router.push(`/sentinelle/${buildingId}`)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#ADB5BD', padding: 0, marginBottom: 8 }}>
          ← Retour au registre
        </button>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <p style={{ margin: '0 0 4px', fontSize: 12, fontWeight: 700, color: '#ADB5BD', textTransform: 'uppercase', letterSpacing: '0.08em' }}>CORO Sentinelle</p>
            <h1 style={{ margin: 0, fontSize: 'clamp(20px, 5vw, 26px)', fontWeight: 800, color: '#2C3E50', display: 'flex', alignItems: 'center', gap: 8 }}>
              <AlertTriangle size={22} color="#E67E22" /> Module Incident
            </h1>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {activeIncidents.length > 0 && (
              <button type="button" onClick={fetchIncidents}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, border: '1px solid #E9ECEF', backgroundColor: '#F8F9FA', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#2C3E50' }}>
                <RefreshCw size={13} /> Actualiser
              </button>
            )}
            <button type="button" onClick={() => setShowTrigger(!showTrigger)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, border: 'none', backgroundColor: '#C0392B', cursor: 'pointer', fontSize: 13, fontWeight: 700, color: '#FFFFFF' }}>
              <Plus size={14} /> Nouvel incident
            </button>
          </div>
        </div>
      </header>

      {/* ── Formulaire déclenchement ── */}
      {showTrigger && (
        <div style={{ marginBottom: 20, padding: 24, backgroundColor: '#FFFFFF', borderRadius: 12, border: '2px solid #C0392B' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700, color: '#2C3E50' }}>Déclenchement d'incident</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8, marginBottom: 16 }}>
            {INCIDENT_TYPES.map(t => (
              <button key={t.value} type="button" onClick={() => setSelectedType(t.value)}
                style={{ padding: '10px 12px', borderRadius: 8, border: '2px solid', cursor: 'pointer', fontSize: 12, fontWeight: 600, textAlign: 'left',
                  borderColor: selectedType === t.value ? t.color : '#E9ECEF',
                  backgroundColor: selectedType === t.value ? '#FEF9E7' : '#F8F9FA',
                  color: selectedType === t.value ? t.color : '#6C757D' }}>
                {t.label}
              </button>
            ))}
          </div>
          <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2}
            placeholder="Description complémentaire (optionnel)..."
            style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #E9ECEF', fontSize: 14, resize: 'none', boxSizing: 'border-box', marginBottom: 12 }} />
          {/* Toggle mode exercice */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 8, backgroundColor: isExercise ? '#FEF9E7' : '#F8F9FA', border: `1px solid ${isExercise ? '#F59E0B' : '#E9ECEF'}`, marginBottom: 12 }}>
            <button type="button" onClick={() => setIsExercise(!isExercise)}
              style={{ width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer', position: 'relative', backgroundColor: isExercise ? '#E67E22' : '#DEE2E6', transition: 'background 0.2s', flexShrink: 0 }}>
              <span style={{ position: 'absolute', top: 2, left: isExercise ? 22 : 2, width: 20, height: 20, borderRadius: '50%', backgroundColor: '#FFFFFF', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
            </button>
            <div>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: isExercise ? '#E67E22' : '#6C757D' }}>
                {isExercise ? '🎯 Mode EXERCICE activé' : 'Mode exercice'}
              </p>
              <p style={{ margin: '2px 0 0', fontSize: 11, color: '#ADB5BD' }}>
                {isExercise ? 'Les occupants ne seront PAS notifiés. Courriels/SMS préfixés [EXERCICE].' : 'Activer pour une simulation sans notifier les occupants.'}
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" onClick={handleTrigger} disabled={triggering}
              style={{ padding: '12px 24px', borderRadius: 8, border: 'none', backgroundColor: isExercise ? '#E67E22' : '#C0392B', color: '#FFFFFF', fontSize: 14, fontWeight: 700, cursor: 'pointer', opacity: triggering ? 0.7 : 1 }}>
              {triggering ? 'Déclenchement...' : isExercise ? '🎯 Lancer l\'exercice' : '🚨 Déclencher'}
            </button>
            <button type="button" onClick={() => setShowTrigger(false)}
              style={{ padding: '12px 20px', borderRadius: 8, border: '1px solid #E9ECEF', backgroundColor: '#FFFFFF', color: '#6C757D', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* ── Pas d'incident actif ── */}
      {activeIncidents.length === 0 && !showTrigger && (
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: 12, border: '1px solid #E9ECEF', padding: 48, textAlign: 'center' }}>
          <Shield size={40} color="#DEE2E6" style={{ margin: '0 auto 16px' }} />
          <p style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 700, color: '#2C3E50' }}>Aucun incident actif</p>
          <p style={{ margin: '0 0 20px', fontSize: 14, color: '#ADB5BD' }}>Cliquez sur « Nouvel incident » pour mobiliser l'équipe d'urgence.</p>
        </div>
      )}

      {/* ── Liste des incidents actifs ── */}
      {activeIncidents.map(incident => {
        const typeInfo = INCIDENT_TYPES.find(t => t.value === incident.type);
        const scfg = STATUS_CONFIG[incident.status] || STATUS_CONFIG.ACTIVE;
        const coordSteps = (incident.tasks || []).filter((t: any) => t.isCoordinatorStep);
        const completedSteps = coordSteps.filter((t: any) => t.status === 'COMPLETED').length;
        const progress = coordSteps.length > 0 ? Math.round((completedSteps / coordSteps.length) * 100) : 0;

        return (
          <div key={incident.id} style={{ marginBottom: 24, border: `2px solid ${scfg.border}`, borderRadius: 12, overflow: 'hidden' }}>

            {/* Bandeau statut */}
            <div style={{ backgroundColor: scfg.bg, padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <AlertTriangle size={20} color={scfg.color} />
                <div>
                  <p style={{ margin: 0, fontSize: 16, fontWeight: 900, color: scfg.color }}>
                    {incident.isExercise && <span style={{ fontSize: 12, backgroundColor: '#E67E22', color: '#FFFFFF', padding: '2px 8px', borderRadius: 4, marginRight: 8 }}>🎯 EXERCICE</span>}
                    {scfg.label} — {typeInfo?.label || incident.type}
                  </p>
                  <p style={{ margin: '2px 0 0', fontSize: 12, color: '#6C757D' }}>
                    Déclenché par {incident.triggeredBy} · {new Date(incident.triggeredAt).toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit' })}
                    {incident.assemblyPoint && ` · 🏁 ${incident.assemblyPoint}`}
                  </p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {incident.status === 'ACTIVE' && (
                  <button type="button" onClick={() => handleContain(incident.id)}
                    style={{ padding: '7px 12px', borderRadius: 6, border: '1px solid #F9E79F', backgroundColor: '#FEF9E7', cursor: 'pointer', fontSize: 12, fontWeight: 700, color: '#E67E22' }}>
                    Contenir
                  </button>
                )}
                {incident.status !== 'RESOLVED' && (
                  <button type="button" onClick={() => setShowResolve(showResolve === incident.id ? null : incident.id)}
                    style={{ padding: '7px 12px', borderRadius: 6, border: 'none', backgroundColor: '#27AE60', cursor: 'pointer', fontSize: 12, fontWeight: 700, color: '#FFFFFF' }}>
                    ✅ Résoudre
                  </button>
                )}
              </div>
            </div>

            {/* Formulaire résolution */}
            {showResolve === incident.id && (
              <div style={{ padding: '14px 20px', backgroundColor: '#EAFAF1', borderBottom: '1px solid #A9DFBF' }}>
                <textarea value={closingNotes[incident.id] || ''} rows={2} placeholder="Notes de clôture..."
                  onChange={e => setClosingNotes(prev => ({ ...prev, [incident.id]: e.target.value }))}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #A9DFBF', fontSize: 13, resize: 'none', boxSizing: 'border-box', marginBottom: 8 }} />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="button" onClick={() => handleResolve(incident.id)}
                    style={{ padding: '8px 16px', borderRadius: 6, border: 'none', backgroundColor: '#27AE60', color: '#FFFFFF', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                    Confirmer la clôture
                  </button>
                  <button type="button" onClick={() => setShowResolve(null)}
                    style={{ padding: '8px 14px', borderRadius: 6, border: '1px solid #E9ECEF', backgroundColor: '#FFFFFF', color: '#6C757D', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                    Annuler
                  </button>
                </div>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(340px, 100%), 1fr))', gap: 0 }}>

              {/* Checklist coordonnateur */}
              <div style={{ borderRight: '1px solid #F1F3F5' }}>
                <div style={{ padding: '14px 20px', borderBottom: '1px solid #F1F3F5', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <h2 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#2C3E50', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <CheckSquare size={14} color="#C0392B" />
                    Procédure coordonnateur
                    {incident.procedureCode && <span style={{ fontSize: 11, fontWeight: 600, color: '#ADB5BD' }}>({incident.procedureCode})</span>}
                  </h2>
                  {coordSteps.length > 0 && (
                    <span style={{ fontSize: 12, fontWeight: 700, color: progress === 100 ? '#27AE60' : '#6C757D' }}>
                      {completedSteps}/{coordSteps.length}
                    </span>
                  )}
                </div>

                {/* Barre de progression */}
                {coordSteps.length > 0 && (
                  <div style={{ height: 4, backgroundColor: '#F1F3F5', margin: '0' }}>
                    <div style={{ height: '100%', width: `${progress}%`, backgroundColor: progress === 100 ? '#27AE60' : '#C0392B', transition: 'width 0.3s ease' }} />
                  </div>
                )}

                <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                  {coordSteps.length === 0 ? (
                    <div style={{ padding: 24, textAlign: 'center' }}>
                      <p style={{ margin: 0, color: '#ADB5BD', fontSize: 13 }}>Aucune procédure liée à ce type d'incident.</p>
                    </div>
                  ) : coordSteps.map((task: any, i: number) => {
                    const done = task.status === 'COMPLETED';
                    return (
                      <button key={task.id} type="button"
                        onClick={() => incident.status !== 'RESOLVED' && handleToggleStep(task.id, task.status, incident.id)}
                        disabled={incident.status === 'RESOLVED'}
                        style={{ display: 'flex', alignItems: 'flex-start', gap: 10, width: '100%', padding: '11px 20px',
                          borderBottom: i < coordSteps.length - 1 ? '1px solid #F8F9FA' : 'none',
                          border: 'none', backgroundColor: done ? '#F8FFF8' : '#FFFFFF',
                          cursor: incident.status === 'RESOLVED' ? 'default' : 'pointer', textAlign: 'left' }}>
                        {done
                          ? <CheckSquare size={16} color="#27AE60" style={{ flexShrink: 0, marginTop: 1 }} />
                          : <Square size={16} color="#DEE2E6" style={{ flexShrink: 0, marginTop: 1 }} />}
                        <span style={{ fontSize: 13, color: done ? '#ADB5BD' : '#2C3E50', lineHeight: 1.5,
                          textDecoration: done ? 'line-through' : 'none' }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: '#ADB5BD', marginRight: 6 }}>{i + 1}.</span>
                          {task.stepText || task.title}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Tâches membres — accusés de réception */}
              {(incident.tasks || []).filter((t: any) => !t.isCoordinatorStep).length > 0 && (
                <div style={{ borderRight: '1px solid #F1F3F5', borderTop: '1px solid #F1F3F5' }}>
                  <div style={{ padding: '12px 20px', borderBottom: '1px solid #F1F3F5' }}>
                    <h2 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#2C3E50' }}>Équipe mobilisée — Accusés de réception</h2>
                  </div>
                  {(incident.tasks || []).filter((t: any) => !t.isCoordinatorStep).map((task: any) => (
                    <div key={task.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 20px', borderBottom: '1px solid #F8F9FA', gap: 8 }}>
                      <span style={{ fontSize: 13, color: '#2C3E50', fontWeight: 500 }}>
                        {task.employee ? `${task.employee.firstName} ${task.employee.lastName}` : task.title}
                      </span>
                      {task.status === 'ACKNOWLEDGED' ? (
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#27AE60', backgroundColor: '#EAFAF1', padding: '3px 8px', borderRadius: 4, whiteSpace: 'nowrap' as const }}>
                          ✅ {task.acknowledgedAt ? new Date(task.acknowledgedAt).toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit' }) : 'Confirmé'}
                        </span>
                      ) : (
                        <span style={{ fontSize: 11, color: '#ADB5BD' }}>En attente…</span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Journal */}
              <div>
                <div style={{ padding: '14px 20px', borderBottom: '1px solid #F1F3F5' }}>
                  <h2 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#2C3E50', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <FileText size={14} color="#6C757D" /> Journal chronologique
                  </h2>
                </div>
                <div style={{ maxHeight: 340, overflowY: 'auto' }}>
                  {(incident.logs || []).map((log: any, i: number) => (
                    <div key={log.id} style={{ display: 'flex', gap: 10, padding: '9px 20px', borderBottom: '1px solid #F8F9FA' }}>
                      <span style={{ flexShrink: 0, fontSize: 11, color: '#ADB5BD', minWidth: 42, textAlign: 'right', paddingTop: 1 }}>
                        {new Date(log.timestamp).toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <div style={{ flex: 1 }}>
                        <p style={{ margin: 0, fontSize: 13, color: '#2C3E50', fontWeight: log.isAutomatic ? 400 : 600 }}>{log.action}</p>
                        {log.actor && <p style={{ margin: '1px 0 0', fontSize: 11, color: '#ADB5BD' }}>{log.actor}</p>}
                        {log.details && <p style={{ margin: '2px 0 0', fontSize: 12, color: '#6C757D' }}>{log.details}</p>}
                      </div>
                      {log.isAutomatic && <span style={{ fontSize: 10, color: '#DEE2E6', flexShrink: 0 }}>auto</span>}
                    </div>
                  ))}
                </div>
                {incident.status !== 'RESOLVED' && (
                  <div style={{ padding: '10px 16px', borderTop: '1px solid #F1F3F5', display: 'flex', gap: 8 }}>
                    <input type="text" value={logText[incident.id] || ''} placeholder="Ajouter au journal..."
                      onChange={e => setLogText(prev => ({ ...prev, [incident.id]: e.target.value }))}
                      onKeyDown={e => e.key === 'Enter' && handleAddLog(incident.id)}
                      style={{ flex: 1, padding: '7px 10px', borderRadius: 6, border: '1px solid #E9ECEF', fontSize: 13, outline: 'none' }} />
                    <button type="button" onClick={() => handleAddLog(incident.id)}
                      disabled={addingLog === incident.id || !logText[incident.id]?.trim()}
                      style={{ padding: '7px 12px', borderRadius: 6, border: 'none', backgroundColor: '#2C3E50', color: '#FFFFFF', fontSize: 12, fontWeight: 700, cursor: 'pointer', opacity: !logText[incident.id]?.trim() ? 0.4 : 1 }}>
                      +
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </PortalLayout>
  );
}