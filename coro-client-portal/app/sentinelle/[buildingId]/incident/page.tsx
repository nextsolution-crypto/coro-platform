'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { apiGet, apiPost, getUser } from '../../../store/auth';
import PortalLayout from '../../../components/PortalLayout';
import { AlertTriangle, CheckCircle, Clock, RefreshCw, Shield, FileText } from 'lucide-react';

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
  { value: 'FIRE',       label: '🔥 Incendie' },
  { value: 'EVACUATION', label: '🚪 Évacuation' },
  { value: 'MEDICAL',    label: '🏥 Urgence médicale' },
  { value: 'SECURITY',   label: '🔒 Sécurité' },
  { value: 'HAZMAT',     label: '☢️ Matières dangereuses' },
  { value: 'LOCKDOWN',   label: '🔐 Confinement' },
  { value: 'OTHER',      label: '⚠️ Autre' },
];

const ROLE_LABELS: Record<string, string> = {
  COORDINATOR:     'Coordonnateur',
  EPI:             'EPI',
  ASSEMBLY_WARDEN: 'Resp. rassemblement',
  SEARCHER:        'Chercheur',
  EXIT_WARDEN:     'Surveillant sortie',
  PNA_ESCORT:      'Accompagnateur PNA',
  FIRST_AIDER:     'Secouriste',
};

const TASK_STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  PENDING:      { label: 'En attente',     color: '#6C757D', bg: '#F8F9FA' },
  ACKNOWLEDGED: { label: 'Pris en charge', color: '#2980B9', bg: '#EBF5FB' },
  IN_PROGRESS:  { label: 'En cours',       color: '#E67E22', bg: '#FEF9E7' },
  COMPLETED:    { label: 'Complété',        color: '#27AE60', bg: '#EAFAF1' },
  CANCELLED:    { label: 'Annulé',          color: '#ADB5BD', bg: '#F8F9FA' },
};

export default function IncidentPage() {
  const router = useRouter();
  const params = useParams();
  const buildingId = params.buildingId as string;

  const [user, setUser]               = useState<any>(null);
  const [incident, setIncident]       = useState<any>(null);
  const [loading, setLoading]         = useState(true);
  const [triggering, setTriggering]   = useState(false);
  const [resolving, setResolving]     = useState(false);
  const [logText, setLogText]         = useState('');
  const [addingLog, setAddingLog]     = useState(false);
  const [closingNotes, setClosingNotes] = useState('');
  const [showResolve, setShowResolve] = useState(false);
  const [selectedType, setSelectedType] = useState('FIRE');
  const [description, setDescription] = useState('');

  useEffect(() => {
    const u = getUser();
    if (!u) { router.replace('/login'); return; }
    setUser(u);
    fetchIncident();
  }, [buildingId]);

  const fetchIncident = useCallback(async () => {
    try {
      const res = await clientFetch(`/client-portal/incidents/buildings/${buildingId}/active`);
      setIncident(res);
    } catch { setIncident(null); }
    finally { setLoading(false); }
  }, [buildingId]);

  // Auto-refresh 15s pendant un incident actif
  useEffect(() => {
    if (!incident) return;
    const interval = setInterval(fetchIncident, 15000);
    return () => clearInterval(interval);
  }, [incident, fetchIncident]);

  const handleTrigger = async () => {
    if (!confirm(`⚠️ Déclencher un incident de type "${INCIDENT_TYPES.find(t => t.value === selectedType)?.label}" ?\n\nL'équipe d'urgence sera immédiatement mobilisée.`)) return;
    setTriggering(true);
    try {
      await clientFetch('/client-portal/incidents/trigger', 'POST', {
        buildingId,
        type:        selectedType,
        triggeredBy: `${user?.firstName} ${user?.lastName}`,
        description: description || null,
      });
      setDescription('');
      await fetchIncident();
    } catch (err) { alert('Erreur lors du déclenchement.'); }
    finally { setTriggering(false); }
  };

  const handleAcknowledge = async (taskId: string) => {
    try {
      await clientFetch(`/client-portal/incidents/tasks/${taskId}/acknowledge`, 'PUT');
      await fetchIncident();
    } catch (err) { console.error(err); }
  };

  const handleComplete = async (taskId: string) => {
    try {
      await clientFetch(`/client-portal/incidents/tasks/${taskId}/complete`, 'PUT');
      await fetchIncident();
    } catch (err) { console.error(err); }
  };

  const handleAddLog = async () => {
    if (!logText.trim() || !incident) return;
    setAddingLog(true);
    try {
      await clientFetch(`/client-portal/incidents/${incident.id}/logs`, 'POST', {
        action: logText,
        actor:  `${user?.firstName} ${user?.lastName}`,
      });
      setLogText('');
      await fetchIncident();
    } catch (err) { console.error(err); }
    finally { setAddingLog(false); }
  };

  const handleContain = async () => {
    if (!incident) return;
    try {
      await clientFetch(`/client-portal/incidents/${incident.id}/contain`, 'PUT');
      await fetchIncident();
    } catch (err) { console.error(err); }
  };

  const handleResolve = async () => {
    if (!incident) return;
    setResolving(true);
    try {
      await clientFetch(`/client-portal/incidents/${incident.id}/resolve`, 'PUT', { closingNotes });
      setShowResolve(false);
      setClosingNotes('');
      await fetchIncident();
    } catch (err) { console.error(err); }
    finally { setResolving(false); }
  };

  if (loading) return (
    <PortalLayout>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
        <p className="animate-pulse" style={{ color: '#ADB5BD', fontSize: 14 }}>Chargement...</p>
      </div>
    </PortalLayout>
  );

  const statusColor = incident?.status === 'ACTIVE' ? '#C0392B' : incident?.status === 'CONTAINED' ? '#E67E22' : '#27AE60';

  return (
    <PortalLayout>
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
          {incident && (
            <button type="button" onClick={fetchIncident}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, border: '1px solid #E9ECEF', backgroundColor: '#F8F9FA', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#2C3E50' }}>
              <RefreshCw size={13} /> Actualiser
            </button>
          )}
        </div>
      </header>

      {/* ── Pas d'incident actif ── */}
      {!incident && (
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: 12, border: '1px solid #E9ECEF', padding: 32 }}>
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <Shield size={40} color="#DEE2E6" style={{ margin: '0 auto 16px' }} />
            <p style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 700, color: '#2C3E50' }}>Aucun incident actif</p>
            <p style={{ margin: 0, fontSize: 14, color: '#ADB5BD' }}>Déclenchez un incident pour mobiliser l'équipe d'urgence.</p>
          </div>

          {/* Formulaire déclenchement */}
          <div style={{ maxWidth: 480, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#6C757D', marginBottom: 6, textTransform: 'uppercase' }}>Type d'incident</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 8 }}>
                {INCIDENT_TYPES.map(t => (
                  <button key={t.value} type="button" onClick={() => setSelectedType(t.value)}
                    style={{ padding: '10px 12px', borderRadius: 8, border: '2px solid', cursor: 'pointer', fontSize: 13, fontWeight: 600, textAlign: 'left',
                      borderColor: selectedType === t.value ? '#E67E22' : '#E9ECEF',
                      backgroundColor: selectedType === t.value ? '#FEF9E7' : '#F8F9FA',
                      color: selectedType === t.value ? '#E67E22' : '#6C757D' }}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#6C757D', marginBottom: 6, textTransform: 'uppercase' }}>Description (optionnel)</label>
              <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} placeholder="Ex: Alarme incendie déclenchée au 3e étage..."
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #E9ECEF', fontSize: 14, resize: 'none', boxSizing: 'border-box' }} />
            </div>
            <button type="button" onClick={handleTrigger} disabled={triggering}
              style={{ padding: '14px', borderRadius: 8, border: 'none', backgroundColor: '#C0392B', color: '#FFFFFF', fontSize: 15, fontWeight: 700, cursor: 'pointer', opacity: triggering ? 0.7 : 1 }}>
              {triggering ? 'Déclenchement...' : '🚨 Déclencher l\'incident'}
            </button>
          </div>
        </div>
      )}

      {/* ── Incident actif ── */}
      {incident && (
        <>
          {/* Bandeau statut */}
          <div style={{ marginBottom: 20, padding: '16px 20px', borderRadius: 12, border: `2px solid ${statusColor}`, backgroundColor: incident.status === 'ACTIVE' ? '#FDEDEC' : incident.status === 'CONTAINED' ? '#FEF9E7' : '#EAFAF1', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <AlertTriangle size={24} color={statusColor} />
              <div>
                <p style={{ margin: 0, fontSize: 18, fontWeight: 900, color: statusColor }}>
                  {incident.status === 'ACTIVE' ? '🔴 INCIDENT EN COURS' : incident.status === 'CONTAINED' ? '🟠 CONTENU' : '🟢 RÉSOLU'}
                </p>
                <p style={{ margin: '2px 0 0', fontSize: 13, color: '#6C757D' }}>
                  {INCIDENT_TYPES.find(t => t.value === incident.type)?.label} · Déclenché par {incident.triggeredBy} · {new Date(incident.triggeredAt).toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {incident.status === 'ACTIVE' && (
                <button type="button" onClick={handleContain}
                  style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid #E67E22', backgroundColor: '#FEF9E7', cursor: 'pointer', fontSize: 12, fontWeight: 700, color: '#E67E22' }}>
                  Contenir
                </button>
              )}
              {(incident.status === 'ACTIVE' || incident.status === 'CONTAINED') && (
                <button type="button" onClick={() => setShowResolve(true)}
                  style={{ padding: '8px 14px', borderRadius: 8, border: 'none', backgroundColor: '#27AE60', cursor: 'pointer', fontSize: 12, fontWeight: 700, color: '#FFFFFF' }}>
                  ✅ Résoudre
                </button>
              )}
            </div>
          </div>

          {/* Formulaire résolution */}
          {showResolve && (
            <div style={{ marginBottom: 20, padding: 20, backgroundColor: '#FFFFFF', borderRadius: 12, border: '2px solid #27AE60' }}>
              <p style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 700, color: '#2C3E50' }}>✅ Clôturer l'incident</p>
              <textarea value={closingNotes} onChange={e => setClosingNotes(e.target.value)} rows={3} placeholder="Notes de clôture (bilan, actions prises, recommandations)..."
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #E9ECEF', fontSize: 14, resize: 'none', boxSizing: 'border-box', marginBottom: 10 }} />
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" onClick={handleResolve} disabled={resolving}
                  style={{ padding: '10px 20px', borderRadius: 8, border: 'none', backgroundColor: '#27AE60', color: '#FFFFFF', fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: resolving ? 0.7 : 1 }}>
                  {resolving ? 'Clôture...' : 'Confirmer la clôture'}
                </button>
                <button type="button" onClick={() => setShowResolve(false)}
                  style={{ padding: '10px 20px', borderRadius: 8, border: '1px solid #E9ECEF', backgroundColor: '#FFFFFF', color: '#6C757D', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                  Annuler
                </button>
              </div>
            </div>
          )}

          {/* Tâches équipe */}
          <section style={{ backgroundColor: '#FFFFFF', borderRadius: 12, border: '1px solid #E9ECEF', overflow: 'hidden', marginBottom: 20 }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid #E9ECEF' }}>
              <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#2C3E50' }}>
                Équipe mobilisée — {incident.tasks?.length || 0} tâche{incident.tasks?.length !== 1 ? 's' : ''}
              </h2>
            </div>
            {incident.tasks?.length === 0 ? (
              <div style={{ padding: 32, textAlign: 'center' }}>
                <p style={{ margin: 0, color: '#ADB5BD', fontSize: 14 }}>Aucun membre d'urgence présent au moment du déclenchement.</p>
              </div>
            ) : incident.tasks?.map((task: any, i: number) => {
              const scfg = TASK_STATUS_CONFIG[task.status] || TASK_STATUS_CONFIG.PENDING;
              return (
                <div key={task.id} style={{ padding: '14px 20px', borderBottom: i < incident.tasks.length - 1 ? '1px solid #F1F3F5' : 'none', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#C0392B', backgroundColor: '#FDEDEC', padding: '2px 7px', borderRadius: 4 }}>
                        {ROLE_LABELS[task.role] || task.role}
                      </span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#2C3E50' }}>
                        {task.employee?.firstName} {task.employee?.lastName}
                      </span>
                    </div>
                    <p style={{ margin: 0, fontSize: 13, color: '#6C757D' }}>{task.title}</p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: scfg.color, backgroundColor: scfg.bg, padding: '3px 8px', borderRadius: 4 }}>
                      {scfg.label}
                    </span>
                    {task.status === 'PENDING' && (
                      <button type="button" onClick={() => handleAcknowledge(task.id)}
                        style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #AED6F1', backgroundColor: '#EBF5FB', cursor: 'pointer', fontSize: 11, fontWeight: 700, color: '#2980B9' }}>
                        Prise en charge
                      </button>
                    )}
                    {(task.status === 'ACKNOWLEDGED' || task.status === 'IN_PROGRESS') && (
                      <button type="button" onClick={() => handleComplete(task.id)}
                        style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #A9DFBF', backgroundColor: '#EAFAF1', cursor: 'pointer', fontSize: 11, fontWeight: 700, color: '#27AE60' }}>
                        ✓ Complété
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </section>

          {/* Journal chronologique */}
          <section style={{ backgroundColor: '#FFFFFF', borderRadius: 12, border: '1px solid #E9ECEF', overflow: 'hidden', marginBottom: 20 }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid #E9ECEF' }}>
              <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#2C3E50', display: 'flex', alignItems: 'center', gap: 8 }}>
                <FileText size={15} color="#6C757D" /> Journal chronologique
              </h2>
            </div>
            <div style={{ maxHeight: 300, overflowY: 'auto' }}>
              {incident.logs?.map((log: any, i: number) => (
                <div key={log.id} style={{ padding: '10px 20px', borderBottom: i < incident.logs.length - 1 ? '1px solid #F1F3F5' : 'none', display: 'flex', gap: 12 }}>
                  <div style={{ flexShrink: 0, width: 48, textAlign: 'right' }}>
                    <p style={{ margin: 0, fontSize: 11, color: '#ADB5BD' }}>
                      {new Date(log.timestamp).toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontSize: 13, color: '#2C3E50', fontWeight: log.isAutomatic ? 400 : 600 }}>
                      {log.action}
                    </p>
                    {log.actor && <p style={{ margin: '2px 0 0', fontSize: 11, color: '#ADB5BD' }}>{log.actor}</p>}
                    {log.details && <p style={{ margin: '2px 0 0', fontSize: 12, color: '#6C757D' }}>{log.details}</p>}
                  </div>
                  {log.isAutomatic && (
                    <span style={{ fontSize: 10, color: '#ADB5BD', flexShrink: 0 }}>auto</span>
                  )}
                </div>
              ))}
            </div>
            {/* Ajouter entrée manuelle */}
            {(incident.status === 'ACTIVE' || incident.status === 'CONTAINED') && (
              <div style={{ padding: '12px 20px', borderTop: '1px solid #E9ECEF', display: 'flex', gap: 8 }}>
                <input type="text" value={logText} onChange={e => setLogText(e.target.value)}
                  placeholder="Ajouter une entrée au journal..."
                  onKeyDown={e => e.key === 'Enter' && handleAddLog()}
                  style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: '1px solid #E9ECEF', fontSize: 13, outline: 'none' }} />
                <button type="button" onClick={handleAddLog} disabled={addingLog || !logText.trim()}
                  style={{ padding: '8px 14px', borderRadius: 8, border: 'none', backgroundColor: '#2C3E50', color: '#FFFFFF', fontSize: 12, fontWeight: 700, cursor: 'pointer', opacity: addingLog || !logText.trim() ? 0.5 : 1 }}>
                  Ajouter
                </button>
              </div>
            )}
          </section>
        </>
      )}
    </PortalLayout>
  );
}