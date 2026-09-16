'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { apiGet, getUser } from '../../../store/auth';
import PortalLayout from '../../../components/PortalLayout';
import { AlertTriangle, FileText, RefreshCw, Shield, CheckSquare, Square, Plus, QrCode, Copy, Mail, Check } from 'lucide-react';

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
  PRE_ALERT: { label: 'PRÉ-ALERTE',     color: '#B9770E', bg: '#FEF9E7', border: '#F9E79F' },
  ACTIVE:    { label: 'EN COURS',       color: '#C0392B', bg: '#FDEDEC', border: '#F1948A' },
  CONTAINED: { label: 'CONTENU',        color: '#E67E22', bg: '#FEF9E7', border: '#F9E79F' },
  RESOLVED:  { label: 'RÉSOLU',         color: '#27AE60', bg: '#EAFAF1', border: '#A9DFBF' },
  CANCELLED: { label: 'ANNULÉ',         color: '#6C757D', bg: '#F8F9FA', border: '#DEE2E6' },
};

// Doit correspondre à ALARM_ESCALATION_WINDOW_MS côté backend (incident.service.ts)
const ALARM_ESCALATION_WINDOW_SECONDS = 45;

function PreAlertCountdown({ triggeredAt }: { triggeredAt: string }) {
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    const compute = () => {
      const elapsed = (Date.now() - new Date(triggeredAt).getTime()) / 1000;
      setRemaining(Math.max(0, Math.round(ALARM_ESCALATION_WINDOW_SECONDS - elapsed)));
    };
    compute();
    const interval = setInterval(compute, 1000);
    return () => clearInterval(interval);
  }, [triggeredAt]);

  if (remaining <= 0) {
    return <span>Escalade automatique en cours…</span>;
  }
  return <span>Escalade automatique dans {remaining}s si aucune action</span>;
}

function IncidentAccessQr({ token }: { token: string }) {
  const [qrDataUrl, setQrDataUrl] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const QRCode = (await import('qrcode')).default;
        const url = await QRCode.toDataURL(`${window.location.origin}/intervention/${token}`, {
          width: 140,
          margin: 1,
          color: { dark: '#2C3E50', light: '#FFFFFF' },
        });
        if (!cancelled) setQrDataUrl(url);
      } catch (err) {
        console.error('[CORO Incident Access QR]', err);
      }
    })();
    return () => { cancelled = true; };
  }, [token]);

  if (!qrDataUrl) return (
    <div style={{ width: 140, height: 140, borderRadius: 8, backgroundColor: '#F1F3F5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: '#ADB5BD', fontSize: 11 }}>...</p>
    </div>
  );

  return <img src={qrDataUrl} alt="QR fiche d'intervention" style={{ width: 140, height: 140, borderRadius: 8, border: '1px solid #E9ECEF', display: 'block' }} />;
}

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
  const [showAccessPanel, setShowAccessPanel] = useState<string | null>(null);
  const [accessEmails, setAccessEmails]   = useState<Record<string, string>>({});
  const [sendingAccess, setSendingAccess] = useState<string | null>(null);
  const [accessSent, setAccessSent]       = useState<string | null>(null);
  const [linkCopied, setLinkCopied]       = useState<string | null>(null);
  const [resolvingPreAlert, setResolvingPreAlert] = useState<string | null>(null);

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
    // Poll plus fréquemment pendant une pré-alerte, pour refléter rapidement
    // une confirmation/annulation faite par un autre coordonnateur, ou
    // l'escalade automatique côté serveur.
    const hasPreAlert = incidents.some(i => i.status === 'PRE_ALERT');
    const interval = setInterval(fetchIncidents, hasPreAlert ? 5000 : 15000);
    return () => clearInterval(interval);
  }, [incidents, fetchIncidents]);

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

  const handleConfirmPreAlert = async (incidentId: string) => {
    setResolvingPreAlert(incidentId);
    try {
      await clientFetch(`/client-portal/incidents/${incidentId}/confirm-pre-alert`, 'PUT');
      await fetchIncidents();
    } catch { alert('Erreur — cette pré-alerte a peut-être déjà été traitée.'); }
    finally { setResolvingPreAlert(null); }
  };

  const handleCancelPreAlert = async (incidentId: string) => {
    if (!confirm("Annuler cette pré-alerte ?\n\nAucune notification ne sera envoyée — à utiliser si c'est un test ou un faux déclenchement du panneau d'alarme.")) return;
    setResolvingPreAlert(incidentId);
    try {
      await clientFetch(`/client-portal/incidents/${incidentId}/cancel-pre-alert`, 'PUT');
      await fetchIncidents();
    } catch { alert('Erreur — cette pré-alerte a peut-être déjà été traitée.'); }
    finally { setResolvingPreAlert(null); }
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

  const getInterventionLink = (token: string) => `${window.location.origin}/intervention/${token}`;

  const handleCopyLink = async (token: string) => {
    try {
      await navigator.clipboard.writeText(getInterventionLink(token));
      setLinkCopied(token);
      setTimeout(() => setLinkCopied(null), 2000);
    } catch { console.error('Erreur copie du lien'); }
  };

  const handleSendAccess = async (incidentId: string) => {
    const raw = accessEmails[incidentId] || '';
    const emails = raw.split(/[,;\s]+/).map(e => e.trim()).filter(Boolean);
    if (emails.length === 0) return;
    setSendingAccess(incidentId);
    try {
      await clientFetch(`/client-portal/incidents/${incidentId}/send-access`, 'POST', { emails });
      setAccessSent(incidentId);
      setAccessEmails(prev => ({ ...prev, [incidentId]: '' }));
      setTimeout(() => setAccessSent(null), 3000);
    } catch { alert('Erreur lors de l\'envoi.'); }
    finally { setSendingAccess(null); }
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
                {incident.publicAccessToken && incident.status !== 'RESOLVED' && incident.status !== 'PRE_ALERT' && (
                  <button type="button" onClick={() => setShowAccessPanel(showAccessPanel === incident.id ? null : incident.id)}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 6, border: '1px solid #2C3E50', backgroundColor: '#FFFFFF', cursor: 'pointer', fontSize: 12, fontWeight: 700, color: '#2C3E50' }}>
                    <QrCode size={13} /> Fiche d'intervention
                  </button>
                )}
                {incident.status === 'ACTIVE' && (
                  <button type="button" onClick={() => handleContain(incident.id)}
                    style={{ padding: '7px 12px', borderRadius: 6, border: '1px solid #F9E79F', backgroundColor: '#FEF9E7', cursor: 'pointer', fontSize: 12, fontWeight: 700, color: '#E67E22' }}>
                    Contenir
                  </button>
                )}
                {incident.status !== 'RESOLVED' && incident.status !== 'PRE_ALERT' && incident.status !== 'CANCELLED' && (
                  <button type="button" onClick={() => setShowResolve(showResolve === incident.id ? null : incident.id)}
                    style={{ padding: '7px 12px', borderRadius: 6, border: 'none', backgroundColor: '#27AE60', cursor: 'pointer', fontSize: 12, fontWeight: 700, color: '#FFFFFF' }}>
                    ✅ Résoudre
                  </button>
                )}
              </div>
            </div>

            {/* Bandeau pré-alerte — signal du panneau d'alarme en attente de confirmation */}
            {incident.status === 'PRE_ALERT' && (
              <div style={{ padding: '16px 20px', backgroundColor: '#FEF9E7', borderBottom: '2px solid #F9E79F' }}>
                <p style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 700, color: '#B9770E' }}>
                  🔔 Signal reçu du panneau d'alarme — pas encore confirmé
                </p>
                <p style={{ margin: '0 0 14px', fontSize: 12, color: '#8A6119' }}>
                  Les notifications (SMS/courriel à l'équipe d'urgence et aux occupants) n'ont pas encore été envoyées.
                  {' '}<PreAlertCountdown triggeredAt={incident.triggeredAt} />
                </p>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button type="button" onClick={() => handleConfirmPreAlert(incident.id)} disabled={resolvingPreAlert === incident.id}
                    style={{ padding: '9px 16px', borderRadius: 6, border: 'none', backgroundColor: '#C0392B', color: '#FFFFFF', fontSize: 13, fontWeight: 700, cursor: resolvingPreAlert === incident.id ? 'not-allowed' : 'pointer', opacity: resolvingPreAlert === incident.id ? 0.7 : 1 }}>
                    🚨 Confirmer — envoyer les notifications maintenant
                  </button>
                  <button type="button" onClick={() => handleCancelPreAlert(incident.id)} disabled={resolvingPreAlert === incident.id}
                    style={{ padding: '9px 16px', borderRadius: 6, border: '1px solid #DEE2E6', backgroundColor: '#FFFFFF', color: '#6C757D', fontSize: 13, fontWeight: 700, cursor: resolvingPreAlert === incident.id ? 'not-allowed' : 'pointer' }}>
                    Annuler (faux déclenchement)
                  </button>
                </div>
              </div>
            )}

            {/* Fiche d'intervention — QR + envoi par courriel */}
            {showAccessPanel === incident.id && incident.publicAccessToken && (
              <div style={{ padding: '18px 20px', backgroundColor: '#F8F9FA', borderBottom: '1px solid #E9ECEF', display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                <div style={{ flexShrink: 0 }}>
                  <IncidentAccessQr token={incident.publicAccessToken} />
                </div>
                <div style={{ flex: 1, minWidth: 240 }}>
                  <p style={{ margin: '0 0 10px', fontSize: 12, color: '#6C757D', lineHeight: 1.5 }}>
                    Ce lien donne accès à la fiche d'intervention du bâtiment (sans compte). Il reste valide tant que l'incident n'est pas résolu.
                  </p>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                    <button type="button" onClick={() => handleCopyLink(incident.publicAccessToken)}
                      style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 6, border: '1px solid #E9ECEF', backgroundColor: '#FFFFFF', cursor: 'pointer', fontSize: 12, fontWeight: 700, color: '#2C3E50' }}>
                      {linkCopied === incident.publicAccessToken ? <><Check size={13} color="#27AE60" /> Copié</> : <><Copy size={13} /> Copier le lien</>}
                    </button>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input type="text" placeholder="courriel1@exemple.com, courriel2@exemple.com"
                      value={accessEmails[incident.id] || ''}
                      onChange={e => setAccessEmails(prev => ({ ...prev, [incident.id]: e.target.value }))}
                      onKeyDown={e => e.key === 'Enter' && handleSendAccess(incident.id)}
                      style={{ flex: 1, padding: '8px 12px', borderRadius: 6, border: '1px solid #E9ECEF', fontSize: 13, outline: 'none' }} />
                    <button type="button" onClick={() => handleSendAccess(incident.id)} disabled={sendingAccess === incident.id}
                      style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 6, border: 'none', backgroundColor: accessSent === incident.id ? '#27AE60' : '#2C3E50', color: '#FFFFFF', fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' as const }}>
                      {accessSent === incident.id ? <><Check size={13} /> Envoyé</> : <><Mail size={13} /> {sendingAccess === incident.id ? 'Envoi...' : 'Envoyer'}</>}
                    </button>
                  </div>
                </div>
              </div>
            )}

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