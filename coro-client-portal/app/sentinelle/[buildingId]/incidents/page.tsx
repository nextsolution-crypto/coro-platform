'use client';
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { getUser } from '../../../store/auth';
import PortalLayout from '../../../components/PortalLayout';
import { FileText, Clock, CheckSquare, AlertTriangle } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002/api';

const clientFetch = async (path: string) => {
  const res = await fetch(`${API}${path}`, {
    headers: { Authorization: `Bearer ${localStorage.getItem('coro_client_token')}` },
  });
  if (!res.ok) throw new Error('Erreur réseau');
  return res.json();
};

const INCIDENT_LABELS: Record<string, string> = {
  SMOKE_DISCOVERY: 'Découverte de fumée', FIRE_ALERT: 'Alerte incendie',
  FIRE_ALARM: 'Alarme incendie', GAS_LEAK: 'Fuite de gaz',
  ACTIVE_THREAT: 'Menace active', MEDICAL: 'Urgence médicale',
  TOXIC_GAS: 'Gaz toxique', SUSPICIOUS_PACKAGE: 'Colis suspect',
  POWER_OUTAGE: 'Coupure de courant', HAZMAT: 'Matières dangereuses',
  BOMB_THREAT: 'Alerte à la bombe', LITHIUM_BATTERY: 'Batterie lithium',
  FLOODING: 'Inondations', VIOLENT_WINDS: 'Vents violents', OTHER: 'Autre',
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  ACTIVE:    { label: 'En cours',  color: '#C0392B', bg: '#FDEDEC' },
  CONTAINED: { label: 'Contenu',   color: '#E67E22', bg: '#FEF9E7' },
  RESOLVED:  { label: 'Résolu',    color: '#27AE60', bg: '#EAFAF1' },
};

function getDuration(start: string, end?: string | null): string {
  const ms = (end ? new Date(end) : new Date()).getTime() - new Date(start).getTime();
  const min = Math.floor(ms / 60000);
  if (min < 60) return `${min} min`;
  return `${Math.floor(min / 60)}h ${min % 60}min`;
}

export default function IncidentHistoryPage() {
  const router = useRouter();
  const params = useParams();
  const buildingId = params.buildingId as string;

  const [incidents, setIncidents] = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [filter, setFilter]       = useState<'all' | 'RESOLVED' | 'ACTIVE'>('all');

  useEffect(() => {
    const u = getUser();
    if (!u) { router.replace('/login'); return; }
    clientFetch(`/client-portal/incidents/buildings/${buildingId}/history`)
      .then(setIncidents).catch(console.error).finally(() => setLoading(false));
  }, [buildingId]);

  const filtered = filter === 'all' ? incidents : incidents.filter(i => i.status === filter);

  if (loading) return (
    <PortalLayout>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
        <p className="animate-pulse" style={{ color: '#ADB5BD', fontSize: 14 }}>Chargement...</p>
      </div>
    </PortalLayout>
  );

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
              <FileText size={22} color="#6C757D" /> Historique des incidents
            </h1>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {(['all', 'RESOLVED', 'ACTIVE'] as const).map(f => (
              <button key={f} type="button" onClick={() => setFilter(f)}
                style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                  borderColor: filter === f ? '#2C3E50' : '#E9ECEF',
                  backgroundColor: filter === f ? '#2C3E50' : '#FFFFFF',
                  color: filter === f ? '#FFFFFF' : '#6C757D' }}>
                {f === 'all' ? 'Tous' : f === 'RESOLVED' ? 'Résolus' : 'En cours'}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Note conservation réglementaire */}
      <div style={{ marginBottom: 16, padding: '10px 16px', borderRadius: 8, backgroundColor: '#EBF5FB', border: '1px solid #AED6F1', fontSize: 12, color: '#2980B9' }}>
        📋 <strong>Conservation réglementaire :</strong> Incidents conservés 36 mois (ISO 22301) · Incidents avec blessés : 5 ans (CNESST) · Exercices : 24 mois (CNPI 2020)
      </div>

      {filtered.length === 0 ? (
        <div style={{ padding: 48, textAlign: 'center', backgroundColor: '#FFFFFF', borderRadius: 12, border: '1px solid #E9ECEF' }}>
          <AlertTriangle size={36} color="#DEE2E6" style={{ margin: '0 auto 16px' }} />
          <p style={{ margin: 0, color: '#ADB5BD', fontSize: 14 }}>Aucun incident enregistré.</p>
        </div>
      ) : (
        <section style={{ backgroundColor: '#FFFFFF', borderRadius: 12, border: '1px solid #E9ECEF', overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid #E9ECEF', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#2C3E50' }}>
              {filtered.length} incident{filtered.length > 1 ? 's' : ''}
            </h2>
          </div>
          {filtered.map((inc, i) => {
            const scfg = STATUS_CONFIG[inc.status] || STATUS_CONFIG.RESOLVED;
            const coordSteps = (inc.tasks || []).filter((t: any) => t.isCoordinatorStep);
            const completed  = coordSteps.filter((t: any) => t.status === 'COMPLETED').length;
            const pct        = coordSteps.length > 0 ? Math.round((completed / coordSteps.length) * 100) : null;
            const hasRex     = !!(inc.rexWentWell || inc.rexToImprove || inc.rexRecommendations);

            return (
              <div key={inc.id} style={{ padding: '16px 20px', borderBottom: i < filtered.length - 1 ? '1px solid #F1F3F5' : 'none', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', cursor: 'pointer' }}
                onClick={() => router.push(`/sentinelle/${buildingId}/incidents/${inc.id}`)}>
                {/* Date */}
                <div style={{ flexShrink: 0, width: 56, textAlign: 'center' }}>
                  <p style={{ margin: 0, fontSize: 18, fontWeight: 900, color: '#2C3E50', lineHeight: 1 }}>
                    {new Date(inc.triggeredAt).getDate()}
                  </p>
                  <p style={{ margin: '2px 0 0', fontSize: 10, color: '#ADB5BD', textTransform: 'uppercase' }}>
                    {new Date(inc.triggeredAt).toLocaleDateString('fr-CA', { month: 'short' })}
                  </p>
                  <p style={{ margin: '1px 0 0', fontSize: 10, color: '#ADB5BD' }}>
                    {new Date(inc.triggeredAt).getFullYear()}
                  </p>
                </div>

                {/* Infos principales */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#2C3E50' }}>
                      {INCIDENT_LABELS[inc.type] || inc.type}
                    </span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: scfg.color, backgroundColor: scfg.bg, padding: '2px 7px', borderRadius: 4 }}>
                      {scfg.label}
                    </span>
                    {hasRex && <span style={{ fontSize: 11, fontWeight: 600, color: '#27AE60', backgroundColor: '#EAFAF1', padding: '2px 7px', borderRadius: 4 }}>REX ✓</span>}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 12, color: '#ADB5BD', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Clock size={11} /> {new Date(inc.triggeredAt).toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit' })}
                      {inc.resolvedAt && ` — durée : ${getDuration(inc.triggeredAt, inc.resolvedAt)}`}
                    </span>
                    {inc.procedureCode && (
                      <span style={{ fontSize: 12, color: '#ADB5BD' }}>Procédure {inc.procedureCode}</span>
                    )}
                    {pct !== null && (
                      <span style={{ fontSize: 12, color: '#ADB5BD', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <CheckSquare size={11} /> {completed}/{coordSteps.length} étapes ({pct}%)
                      </span>
                    )}
                  </div>
                </div>

                {/* Flèche */}
                <span style={{ color: '#ADB5BD', fontSize: 18, flexShrink: 0 }}>→</span>
              </div>
            );
          })}
        </section>
      )}
    </PortalLayout>
  );
}