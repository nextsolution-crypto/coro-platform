'use client';
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { getUser } from '../../../../store/auth';
import PortalLayout from '../../../../components/PortalLayout';
import { FileText, CheckSquare, Square, Download, Clock } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002/api';

const clientFetch = async (path: string, method = 'GET', body?: any) => {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('coro_client_token')}` },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error('Erreur réseau');
  return res.json();
};

const INCIDENT_LABELS: Record<string, string> = {
  SMOKE_DISCOVERY: 'Découverte de fumée', FIRE_ALERT: 'Alerte incendie',
  FIRE_ALARM: 'Alarme incendie', GAS_LEAK: 'Fuite de gaz',
  ACTIVE_THREAT: 'Menace active / Confinement', MEDICAL: 'Urgence médicale',
  TOXIC_GAS: 'Gaz toxique', SUSPICIOUS_PACKAGE: 'Colis suspect',
  POWER_OUTAGE: 'Coupure de courant', HAZMAT: 'Matières dangereuses',
  BOMB_THREAT: 'Alerte à la bombe', LITHIUM_BATTERY: 'Batterie lithium-ion',
  FLOODING: 'Inondations', VIOLENT_WINDS: 'Vents violents', OTHER: 'Autre incident',
};

function getDuration(start: string, end?: string | null): string {
  const ms = (end ? new Date(end) : new Date()).getTime() - new Date(start).getTime();
  const min = Math.floor(ms / 60000);
  if (min < 60) return `${min} min`;
  return `${Math.floor(min / 60)}h ${min % 60}min`;
}

function SectionCard({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{ backgroundColor: '#FFFFFF', borderRadius: 12, border: '1px solid #E9ECEF', overflow: 'hidden', marginBottom: 16 }}>
      <div style={{ padding: '12px 20px', borderBottom: '1px solid #E9ECEF', display: 'flex', alignItems: 'center', gap: 8 }}>
        {icon}<h2 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#2C3E50' }}>{title}</h2>
      </div>
      <div style={{ padding: '16px 20px' }}>{children}</div>
    </div>
  );
}

export default function IncidentDetailPage() {
  const router  = useRouter();
  const params  = useParams();
  const buildingId  = params.buildingId  as string;
  const incidentId  = params.incidentId  as string;

  const [incident, setIncident] = useState<any>(null);
  const [loading, setLoading]   = useState(true);
  const [rex, setRex]           = useState({ rexWentWell: '', rexToImprove: '', rexRecommendations: '', rexCorrectiveActions: '' });
  const [savingRex, setSavingRex] = useState(false);
  const [rexSaved, setRexSaved]   = useState(false);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    const u = getUser();
    if (!u) { router.replace('/login'); return; }
    clientFetch(`/client-portal/incidents/${incidentId}/detail`)
      .then(inc => {
        setIncident(inc);
        setRex({
          rexWentWell:          inc.rexWentWell          || '',
          rexToImprove:         inc.rexToImprove         || '',
          rexRecommendations:   inc.rexRecommendations   || '',
          rexCorrectiveActions: inc.rexCorrectiveActions || '',
        });
      }).catch(console.error).finally(() => setLoading(false));
  }, [incidentId]);

  const handleSaveRex = async () => {
    setSavingRex(true);
    try {
      await clientFetch(`/client-portal/incidents/${incidentId}/rex`, 'PUT', {
        ...rex, rexCompletedAt: new Date().toISOString(),
      });
      setRexSaved(true);
      setTimeout(() => setRexSaved(false), 3000);
    } catch (e) { console.error(e); }
    finally { setSavingRex(false); }
  };

  const handleExportPdf = async () => {
    if (!incident) return;
    setGenerating(true);
    try {
      const coordSteps  = (incident.tasks || []).filter((t: any) => t.isCoordinatorStep);
      const completed   = coordSteps.filter((t: any) => t.status === 'COMPLETED').length;
      const pct         = coordSteps.length > 0 ? Math.round((completed / coordSteps.length) * 100) : 0;
      const duration    = getDuration(incident.triggeredAt, incident.resolvedAt);
      const teamSnap    = (incident.teamSnapshot as any[]) || [];
      const occupantSnap = (incident.occupantsSnapshot as any[]) || [];

      const html = `
<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, Arial, sans-serif; color: #2C3E50; font-size: 12px; line-height: 1.5; }
  .header { background: #2C3E50; color: white; padding: 24px 32px; display: flex; justify-content: space-between; align-items: center; }
  .header-logo { font-size: 28px; font-weight: 900; letter-spacing: -1px; }
  .header-logo span { color: #C0392B; }
  .header-sub { color: rgba(255,255,255,0.7); font-size: 11px; text-align: right; }
  .alert-bar { background: #FDEDEC; border-left: 6px solid #C0392B; padding: 16px 32px; }
  .alert-type { font-size: 20px; font-weight: 800; color: #C0392B; }
  .alert-meta { color: #6C757D; font-size: 11px; margin-top: 4px; }
  .content { padding: 24px 32px; }
  .section { margin-bottom: 24px; border: 1px solid #E9ECEF; border-radius: 8px; overflow: hidden; page-break-inside: avoid; }
  .section-header { background: #F8F9FA; padding: 10px 16px; border-bottom: 1px solid #E9ECEF; font-weight: 700; font-size: 12px; color: #2C3E50; text-transform: uppercase; letter-spacing: 0.05em; }
  .section-body { padding: 14px 16px; }
  .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .info-block { background: #F8F9FA; padding: 10px 14px; border-radius: 6px; }
  .info-label { font-size: 10px; font-weight: 700; color: #ADB5BD; text-transform: uppercase; margin-bottom: 2px; }
  .info-value { font-size: 13px; font-weight: 600; color: #2C3E50; }
  .timeline-row { display: flex; gap: 12px; padding: 7px 0; border-bottom: 1px solid #F8F9FA; }
  .timeline-time { font-size: 11px; color: #ADB5BD; min-width: 45px; text-align: right; padding-top: 1px; }
  .timeline-text { font-size: 12px; color: #2C3E50; flex: 1; }
  .step-row { display: flex; align-items: flex-start; gap: 8px; padding: 6px 0; border-bottom: 1px solid #F8F9FA; }
  .step-check { font-size: 14px; min-width: 16px; }
  .step-text { font-size: 12px; color: #2C3E50; flex: 1; }
  .step-done { text-decoration: line-through; color: #ADB5BD; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 700; }
  .badge-green { background: #EAFAF1; color: #27AE60; }
  .badge-red { background: #FDEDEC; color: #C0392B; }
  .badge-orange { background: #FEF9E7; color: #E67E22; }
  .progress-bar-bg { height: 8px; background: #F1F3F5; border-radius: 4px; margin: 8px 0; }
  .progress-bar { height: 8px; background: ${pct === 100 ? '#27AE60' : '#C0392B'}; border-radius: 4px; width: ${pct}%; }
  .rex-field { margin-bottom: 14px; }
  .rex-label { font-size: 11px; font-weight: 700; color: #ADB5BD; text-transform: uppercase; margin-bottom: 4px; }
  .rex-text { font-size: 12px; color: #2C3E50; white-space: pre-wrap; background: #F8F9FA; padding: 10px 12px; border-radius: 6px; min-height: 36px; }
  .signature-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 12px; }
  .sig-box { border-top: 2px solid #E9ECEF; padding-top: 8px; }
  .sig-label { font-size: 10px; color: #ADB5BD; text-transform: uppercase; }
  .sig-name { font-size: 12px; font-weight: 600; color: #2C3E50; margin-top: 24px; }
  .footer { background: #F8F9FA; border-top: 1px solid #E9ECEF; padding: 12px 32px; display: flex; justify-content: space-between; font-size: 10px; color: #ADB5BD; }
  .conformite-bar { background: #EBF5FB; padding: 8px 32px; font-size: 10px; color: #2980B9; }
</style>
</head>
<body>

<div class="header">
  <div>
    <div class="header-logo">CO<span>RO</span></div>
    <div style="color:rgba(255,255,255,0.7);font-size:11px;margin-top:4px;">Rapport d'intervention — Sentinelle</div>
  </div>
  <div class="header-sub">
    <div style="font-size:12px;color:white;">N° ${incidentId.substring(0, 8).toUpperCase()}</div>
    <div>Généré le ${new Date().toLocaleDateString('fr-CA', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
    <div>Conforme CNPI 2020 · ISO 22301 · CNESST</div>
  </div>
</div>

<div class="alert-bar">
  <div class="alert-type">🚨 ${INCIDENT_LABELS[incident.type] || incident.type}</div>
  <div class="alert-meta">
    Statut : <strong>${incident.status === 'RESOLVED' ? 'RÉSOLU' : incident.status === 'CONTAINED' ? 'CONTENU' : 'EN COURS'}</strong>
    &nbsp;·&nbsp; Durée totale : <strong>${duration}</strong>
    &nbsp;·&nbsp; Déclenché par : <strong>${incident.triggeredBy}</strong>
    ${incident.assemblyPoint ? `&nbsp;·&nbsp; Point de rassemblement : <strong>${incident.assemblyPoint}</strong>` : ''}
  </div>
</div>

<div class="conformite-bar">
  📋 Conservation obligatoire : 36 mois (ISO 22301) · 24 mois exercices (CNPI 2020) · 5 ans si blessés (CNESST) · Archivé automatiquement par CORO Sentinelle
</div>

<div class="content">

  <!-- SECTION 1 : Identification -->
  <div class="section">
    <div class="section-header">1. Identification de l'incident</div>
    <div class="section-body">
      <div class="grid-2">
        <div class="info-block">
          <div class="info-label">Date et heure de déclenchement</div>
          <div class="info-value">${new Date(incident.triggeredAt).toLocaleString('fr-CA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
        </div>
        <div class="info-block">
          <div class="info-label">Heure de résolution</div>
          <div class="info-value">${incident.resolvedAt ? new Date(incident.resolvedAt).toLocaleString('fr-CA', { hour: '2-digit', minute: '2-digit' }) : 'Non résolu'}</div>
        </div>
        <div class="info-block">
          <div class="info-label">Type d'incident</div>
          <div class="info-value">${INCIDENT_LABELS[incident.type] || incident.type}</div>
        </div>
        <div class="info-block">
          <div class="info-label">Procédure activée</div>
          <div class="info-value">${incident.procedureCode || '—'}</div>
        </div>
        ${incident.assemblyPoint ? `
        <div class="info-block">
          <div class="info-label">Point de rassemblement</div>
          <div class="info-value">${incident.assemblyPoint}</div>
        </div>` : ''}
        <div class="info-block">
          <div class="info-label">Durée totale de l'intervention</div>
          <div class="info-value">${duration}</div>
        </div>
      </div>
    </div>
  </div>

  <!-- SECTION 2 : Chronologie -->
  <div class="section">
    <div class="section-header">2. Chronologie horodatée</div>
    <div class="section-body">
      ${(incident.logs || []).map((log: any) => `
        <div class="timeline-row">
          <div class="timeline-time">${new Date(log.timestamp).toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit' })}</div>
          <div class="timeline-text">
            ${log.action}
            ${log.actor ? `<span style="color:#ADB5BD;font-size:11px;"> — ${log.actor}</span>` : ''}
            ${log.details ? `<br><span style="color:#6C757D;font-size:11px;">${log.details}</span>` : ''}
          </div>
          ${log.isAutomatic ? `<span style="font-size:9px;color:#DEE2E6;">auto</span>` : ''}
        </div>
      `).join('')}
    </div>
  </div>

  <!-- SECTION 3 : Occupants -->
  <div class="section">
    <div class="section-header">3. Occupants au moment du déclenchement</div>
    <div class="section-body">
      <div class="grid-2">
        <div class="info-block">
          <div class="info-label">Total occupants présents</div>
          <div class="info-value" style="font-size:20px;font-weight:900;color:#C0392B;">${occupantSnap.length}</div>
        </div>
        <div class="info-block">
          <div class="info-label">Membres d'urgence mobilisés</div>
          <div class="info-value" style="font-size:20px;font-weight:900;color:#2C3E50;">${teamSnap.length}</div>
        </div>
      </div>
    </div>
  </div>

  <!-- SECTION 4 : Équipe d'urgence -->
  <div class="section">
    <div class="section-header">4. Équipe d'urgence mobilisée</div>
    <div class="section-body">
      ${teamSnap.length === 0 ? '<p style="color:#ADB5BD;">Aucun membre d\'urgence présent au déclenchement.</p>' :
        teamSnap.map((m: any) => `
          <div style="display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:1px solid #F8F9FA;">
            <span style="font-size:12px;font-weight:600;color:#2C3E50;">${m.firstName} ${m.lastName}</span>
            ${m.roles?.map((r: any) => `<span class="badge badge-red">${r.role}</span>`).join('') || ''}
          </div>
        `).join('')}
    </div>
  </div>

  <!-- SECTION 5 : Procédure -->
  <div class="section">
    <div class="section-header">5. Déroulement de l'intervention — Procédure ${incident.procedureCode || ''}</div>
    <div class="section-body">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:10px;">
        <span style="font-size:13px;font-weight:700;color:${pct === 100 ? '#27AE60' : '#C0392B'};">${completed} / ${coordSteps.length} étapes complétées (${pct}%)</span>
        <span class="badge ${pct === 100 ? 'badge-green' : 'badge-red'}">${pct === 100 ? 'Complète' : 'Partielle'}</span>
      </div>
      <div class="progress-bar-bg"><div class="progress-bar"></div></div>
      ${coordSteps.map((t: any, idx: number) => `
        <div class="step-row">
          <span class="step-check">${t.status === 'COMPLETED' ? '✅' : '⬜'}</span>
          <span class="step-text ${t.status === 'COMPLETED' ? 'step-done' : ''}">
            <strong>${idx + 1}.</strong> ${t.stepText || t.title}
          </span>
        </div>
      `).join('')}
    </div>
  </div>

  <!-- SECTION 6 : REX -->
  <div class="section">
    <div class="section-header">6. Retour d'expérience (REX)</div>
    <div class="section-body">
      <div class="rex-field">
        <div class="rex-label">✅ Ce qui a bien fonctionné</div>
        <div class="rex-text">${rex.rexWentWell || '—'}</div>
      </div>
      <div class="rex-field">
        <div class="rex-label">⚠️ Points à améliorer</div>
        <div class="rex-text">${rex.rexToImprove || '—'}</div>
      </div>
      <div class="rex-field">
        <div class="rex-label">💡 Recommandations</div>
        <div class="rex-text">${rex.rexRecommendations || '—'}</div>
      </div>
      <div class="rex-field">
        <div class="rex-label">🔧 Actions correctives proposées</div>
        <div class="rex-text">${rex.rexCorrectiveActions || '—'}</div>
      </div>
    </div>
  </div>

  <!-- SECTION 7 : Notes de clôture et signatures -->
  <div class="section">
    <div class="section-header">7. Clôture et signatures</div>
    <div class="section-body">
      ${incident.closingNotes ? `
        <div style="background:#F8F9FA;padding:12px 14px;border-radius:6px;margin-bottom:16px;">
          <div style="font-size:10px;font-weight:700;color:#ADB5BD;text-transform:uppercase;margin-bottom:4px;">Notes de clôture</div>
          <div style="font-size:12px;color:#2C3E50;">${incident.closingNotes}</div>
        </div>
      ` : ''}
      <div class="signature-grid">
        <div class="sig-box">
          <div class="sig-label">Coordonnateur d'urgence</div>
          <div class="sig-name">${incident.triggeredBy}</div>
        </div>
        <div class="sig-box">
          <div class="sig-label">Responsable du bâtiment</div>
          <div class="sig-name">&nbsp;</div>
        </div>
      </div>
    </div>
  </div>

</div>

<div class="footer">
  <span>CORO Sentinelle — Rapport d'intervention N° ${incidentId.substring(0, 8).toUpperCase()}</span>
  <span>Généré le ${new Date().toLocaleDateString('fr-CA')} — getcoro.io</span>
</div>

</body>
</html>`;

      const blob = new Blob([html], { type: 'text/html' });
      const url  = URL.createObjectURL(blob);
      const win  = window.open(url, '_blank');
      if (win) {
        win.onload = () => { win.print(); URL.revokeObjectURL(url); };
      }
    } finally { setGenerating(false); }
  };

  if (loading) return (
    <PortalLayout>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
        <p className="animate-pulse" style={{ color: '#ADB5BD', fontSize: 14 }}>Chargement...</p>
      </div>
    </PortalLayout>
  );

  if (!incident) return (
    <PortalLayout>
      <div style={{ padding: 48, textAlign: 'center' }}>
        <p style={{ color: '#ADB5BD' }}>Incident introuvable.</p>
      </div>
    </PortalLayout>
  );

  const coordSteps = (incident.tasks || []).filter((t: any) => t.isCoordinatorStep);
  const completed  = coordSteps.filter((t: any) => t.status === 'COMPLETED').length;
  const pct        = coordSteps.length > 0 ? Math.round((completed / coordSteps.length) * 100) : 0;
  const teamSnap   = (incident.teamSnapshot as any[]) || [];

  return (
    <PortalLayout>
      <header style={{ marginBottom: 24 }}>
        <button type="button" onClick={() => router.push(`/sentinelle/${buildingId}/incidents`)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#ADB5BD', padding: 0, marginBottom: 8 }}>
          ← Retour à l'historique
        </button>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <p style={{ margin: '0 0 4px', fontSize: 12, fontWeight: 700, color: '#ADB5BD', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              CORO Sentinelle · N° {incidentId.substring(0, 8).toUpperCase()}
            </p>
            <h1 style={{ margin: 0, fontSize: 'clamp(18px, 4vw, 24px)', fontWeight: 800, color: '#2C3E50' }}>
              {INCIDENT_LABELS[incident.type] || incident.type}
            </h1>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: '#6C757D' }}>
              {new Date(incident.triggeredAt).toLocaleString('fr-CA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              {incident.resolvedAt && ` — Durée : ${getDuration(incident.triggeredAt, incident.resolvedAt)}`}
            </p>
          </div>
          <button type="button" onClick={handleExportPdf} disabled={generating}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', borderRadius: 8, border: 'none', backgroundColor: '#2C3E50', color: '#FFFFFF', fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: generating ? 0.7 : 1 }}>
            <Download size={15} /> {generating ? 'Génération...' : 'Exporter le rapport PDF'}
          </button>
        </div>
      </header>

      {/* Identification */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 16 }}>
        {[
          { label: 'Type', value: INCIDENT_LABELS[incident.type] || incident.type },
          { label: 'Procédure activée', value: incident.procedureCode || '—' },
          { label: 'Point de rassemblement', value: incident.assemblyPoint || '—' },
          { label: 'Déclenché par', value: incident.triggeredBy },
          { label: 'Durée', value: getDuration(incident.triggeredAt, incident.resolvedAt) },
          { label: 'Membres mobilisés', value: `${teamSnap.length}` },
        ].map(item => (
          <div key={item.label} style={{ backgroundColor: '#FFFFFF', borderRadius: 10, border: '1px solid #E9ECEF', padding: '12px 14px' }}>
            <p style={{ margin: '0 0 3px', fontSize: 10, fontWeight: 700, color: '#ADB5BD', textTransform: 'uppercase' }}>{item.label}</p>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#2C3E50' }}>{item.value}</p>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(340px, 100%), 1fr))', gap: 16 }}>

        {/* Procédure */}
        <div>
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: 12, border: '1px solid #E9ECEF', overflow: 'hidden', marginBottom: 16 }}>
            <div style={{ padding: '12px 20px', borderBottom: '1px solid #E9ECEF', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h2 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#2C3E50', display: 'flex', alignItems: 'center', gap: 6 }}>
                <CheckSquare size={14} color="#C0392B" /> Procédure {incident.procedureCode}
              </h2>
              <span style={{ fontSize: 12, fontWeight: 700, color: pct === 100 ? '#27AE60' : '#C0392B' }}>
                {completed}/{coordSteps.length} ({pct}%)
              </span>
            </div>
            <div style={{ height: 4, backgroundColor: '#F1F3F5' }}>
              <div style={{ height: '100%', width: `${pct}%`, backgroundColor: pct === 100 ? '#27AE60' : '#C0392B' }} />
            </div>
            <div style={{ maxHeight: 320, overflowY: 'auto' }}>
              {coordSteps.map((t: any, i: number) => (
                <div key={t.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '9px 16px', borderBottom: i < coordSteps.length - 1 ? '1px solid #F8F9FA' : 'none' }}>
                  {t.status === 'COMPLETED' ? <CheckSquare size={14} color="#27AE60" style={{ flexShrink: 0, marginTop: 1 }} /> : <Square size={14} color="#DEE2E6" style={{ flexShrink: 0, marginTop: 1 }} />}
                  <span style={{ fontSize: 12, color: t.status === 'COMPLETED' ? '#ADB5BD' : '#2C3E50', textDecoration: t.status === 'COMPLETED' ? 'line-through' : 'none', lineHeight: 1.5 }}>
                    <span style={{ color: '#ADB5BD', marginRight: 4 }}>{i + 1}.</span>{t.stepText || t.title}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Équipe mobilisée */}
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: 12, border: '1px solid #E9ECEF', overflow: 'hidden' }}>
            <div style={{ padding: '12px 20px', borderBottom: '1px solid #E9ECEF' }}>
              <h2 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#2C3E50' }}>Équipe mobilisée ({teamSnap.length})</h2>
            </div>
            <div style={{ padding: '12px 16px' }}>
              {teamSnap.length === 0 ? (
                <p style={{ color: '#ADB5BD', fontSize: 13 }}>Aucun membre d'urgence présent.</p>
              ) : teamSnap.map((m: any) => (
                <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', borderBottom: '1px solid #F8F9FA' }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#2C3E50', flex: 1 }}>{m.firstName} {m.lastName}</span>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {m.roles?.map((r: any) => (
                      <span key={r.role} style={{ fontSize: 10, fontWeight: 700, color: '#C0392B', backgroundColor: '#FDEDEC', padding: '2px 6px', borderRadius: 4 }}>{r.role}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Journal + REX */}
        <div>
          {/* Journal */}
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: 12, border: '1px solid #E9ECEF', overflow: 'hidden', marginBottom: 16 }}>
            <div style={{ padding: '12px 20px', borderBottom: '1px solid #E9ECEF' }}>
              <h2 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#2C3E50', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Clock size={14} color="#6C757D" /> Journal chronologique
              </h2>
            </div>
            <div style={{ maxHeight: 300, overflowY: 'auto' }}>
              {(incident.logs || []).map((log: any, i: number) => (
                <div key={log.id} style={{ display: 'flex', gap: 10, padding: '8px 16px', borderBottom: '1px solid #F8F9FA' }}>
                  <span style={{ flexShrink: 0, fontSize: 11, color: '#ADB5BD', minWidth: 42, textAlign: 'right' }}>
                    {new Date(log.timestamp).toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontSize: 12, color: '#2C3E50', fontWeight: log.isAutomatic ? 400 : 600 }}>{log.action}</p>
                    {log.actor && <p style={{ margin: '1px 0 0', fontSize: 11, color: '#ADB5BD' }}>{log.actor}</p>}
                    {log.details && <p style={{ margin: '2px 0 0', fontSize: 11, color: '#6C757D' }}>{log.details}</p>}
                  </div>
                  {log.isAutomatic && <span style={{ fontSize: 10, color: '#DEE2E6', flexShrink: 0 }}>auto</span>}
                </div>
              ))}
            </div>
          </div>

          {/* REX */}
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: 12, border: '1px solid #E9ECEF', overflow: 'hidden' }}>
            <div style={{ padding: '12px 20px', borderBottom: '1px solid #E9ECEF', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#2C3E50' }}>📋 Retour d'expérience (REX)</h2>
              <span style={{ fontSize: 11, color: '#ADB5BD' }}>Obligatoire — ISO 22301</span>
            </div>
            <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                { key: 'rexWentWell',          label: '✅ Ce qui a bien fonctionné' },
                { key: 'rexToImprove',         label: '⚠️ Points à améliorer' },
                { key: 'rexRecommendations',   label: '💡 Recommandations' },
                { key: 'rexCorrectiveActions', label: '🔧 Actions correctives proposées' },
              ].map(f => (
                <div key={f.key}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#6C757D', marginBottom: 4, textTransform: 'uppercase' }}>{f.label}</label>
                  <textarea value={(rex as any)[f.key]} rows={2} placeholder="..."
                    onChange={e => setRex(prev => ({ ...prev, [f.key]: e.target.value }))}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #E9ECEF', fontSize: 13, resize: 'none', boxSizing: 'border-box' }} />
                </div>
              ))}
              <button type="button" onClick={handleSaveRex} disabled={savingRex}
                style={{ padding: '10px 20px', borderRadius: 8, border: 'none', backgroundColor: rexSaved ? '#27AE60' : '#2C3E50', color: '#FFFFFF', fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: savingRex ? 0.7 : 1 }}>
                {rexSaved ? '✅ REX sauvegardé' : savingRex ? 'Sauvegarde...' : 'Sauvegarder le REX'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Notes de clôture */}
      {incident.closingNotes && (
        <div style={{ marginTop: 16, padding: '14px 20px', backgroundColor: '#EAFAF1', borderRadius: 10, border: '1px solid #A9DFBF' }}>
          <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 700, color: '#27AE60', textTransform: 'uppercase' }}>Notes de clôture</p>
          <p style={{ margin: 0, fontSize: 13, color: '#2C3E50' }}>{incident.closingNotes}</p>
        </div>
      )}
    </PortalLayout>
  );
}