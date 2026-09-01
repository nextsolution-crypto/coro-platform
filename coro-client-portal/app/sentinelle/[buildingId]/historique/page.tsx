'use client';
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { apiGet, getUser } from '../../../store/auth';
import PortalLayout from '../../../components/PortalLayout';
import { Download, Filter, Users, Clock } from 'lucide-react';

const TYPE_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  EMPLOYE:     { label: 'Employé',     color: '#2980B9', bg: '#EBF5FB' },
  VISITEUR:    { label: 'Visiteur',    color: '#8E44AD', bg: '#F5EEF8' },
  CONTRACTEUR: { label: 'Contracteur', color: '#E67E22', bg: '#FEF5E7' },
};

export default function HistoriquePage() {
  const router = useRouter();
  const params = useParams();
  const buildingId = params.buildingId as string;

  const [user, setUser] = useState<any>(null);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>('all');

  const today = new Date().toISOString().split('T')[0];
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const [from, setFrom] = useState(thirtyDaysAgo);
  const [to, setTo] = useState(today);

  useEffect(() => {
    const currentUser = getUser();
    if (!currentUser) { router.replace('/login'); return; }
    setUser(currentUser);
    fetchHistory();
  }, [buildingId]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await apiGet(`/occupancy/buildings/${buildingId}/history?from=${from}&to=${to}`);
      setData(res);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleExportCSV = () => {
    if (!data?.records) return;
    const headers = ['Prénom', 'Nom', 'Type', 'Entreprise', 'Raison', 'Étage', 'Arrivée', 'Départ', 'Durée (min)'];
    const rows = data.records.map((r: any) => {
      const duration = r.checkedOutAt
        ? Math.round((new Date(r.checkedOutAt).getTime() - new Date(r.checkedInAt).getTime()) / 60000)
        : '';
      return [
        r.firstName, r.lastName, TYPE_LABELS[r.type]?.label || r.type,
        r.company || '', r.reason || '', r.floor || '',
        new Date(r.checkedInAt).toLocaleString('fr-CA'),
        r.checkedOutAt ? new Date(r.checkedOutAt).toLocaleString('fr-CA') : 'Présent',
        duration,
      ];
    });
    const csv = [headers, ...rows].map(r => r.join(';')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `registre_presences_${from}_${to}.csv`;
    link.click();
  };

  const filteredRecords = data?.records?.filter((r: any) =>
    filterType === 'all' || r.type === filterType
  ) || [];

  const avgDurationMin = data?.avgDurationMs
    ? Math.round(data.avgDurationMs / 60000)
    : 0;

  if (loading) {
    return (
      <PortalLayout>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
          <p className="animate-pulse" style={{ color: '#ADB5BD', fontSize: 14 }}>Chargement...</p>
        </div>
      </PortalLayout>
    );
  }

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
            <h1 style={{ margin: 0, fontSize: 'clamp(20px, 5vw, 26px)', fontWeight: 800, color: '#2C3E50' }}>Historique des présences</h1>
          </div>
          <button type="button" onClick={handleExportCSV}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', borderRadius: 8, border: '1px solid #E9ECEF', backgroundColor: '#FFFFFF', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#2C3E50' }}>
            <Download size={14} /> Exporter CSV
          </button>
        </div>
      </header>

      {/* Filtres date */}
      <div style={{ marginBottom: 20, padding: '16px 20px', backgroundColor: '#FFFFFF', borderRadius: 12, border: '1px solid #E9ECEF', display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#6C757D', marginBottom: 4, textTransform: 'uppercase' }}>Du</label>
          <input type="date" value={from} onChange={e => setFrom(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #E9ECEF', fontSize: 14 }} />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#6C757D', marginBottom: 4, textTransform: 'uppercase' }}>Au</label>
          <input type="date" value={to} onChange={e => setTo(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #E9ECEF', fontSize: 14 }} />
        </div>
        <button type="button" onClick={fetchHistory}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 8, border: 'none', backgroundColor: '#2C3E50', color: '#FFFFFF', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
          <Filter size={14} /> Filtrer
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 20 }}>
        <div style={{ backgroundColor: '#2C3E50', borderRadius: 12, padding: '16px', textAlign: 'center' }}>
          <Users size={18} color="#FFFFFF" style={{ margin: '0 auto 6px' }} />
          <p style={{ margin: 0, fontSize: 28, fontWeight: 900, color: '#FFFFFF', lineHeight: 1 }}>{data?.total || 0}</p>
          <p style={{ margin: '4px 0 0', fontSize: 11, color: '#ADB5BD' }}>entrées totales</p>
        </div>
        {Object.entries(TYPE_LABELS).map(([type, cfg]) => (
          <div key={type} style={{ backgroundColor: '#FFFFFF', borderRadius: 12, padding: '16px', textAlign: 'center', border: '1px solid #E9ECEF' }}>
            <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, color: cfg.color, textTransform: 'uppercase' }}>{cfg.label}s</p>
            <p style={{ margin: 0, fontSize: 28, fontWeight: 900, color: cfg.color, lineHeight: 1 }}>{data?.byType?.[type] || 0}</p>
          </div>
        ))}
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: 12, padding: '16px', textAlign: 'center', border: '1px solid #E9ECEF' }}>
          <Clock size={18} color="#6C757D" style={{ margin: '0 auto 6px' }} />
          <p style={{ margin: 0, fontSize: 28, fontWeight: 900, color: '#6C757D', lineHeight: 1 }}>{avgDurationMin}</p>
          <p style={{ margin: '4px 0 0', fontSize: 11, color: '#ADB5BD' }}>min. moy.</p>
        </div>
      </div>

      {/* Filtre type */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {[{ key: 'all', label: 'Tous' }, { key: 'EMPLOYE', label: 'Employés' }, { key: 'VISITEUR', label: 'Visiteurs' }, { key: 'CONTRACTEUR', label: 'Contracteurs' }].map(f => (
          <button key={f.key} type="button" onClick={() => setFilterType(f.key)}
            style={{ padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', border: '1px solid', borderColor: filterType === f.key ? '#2C3E50' : '#E9ECEF', backgroundColor: filterType === f.key ? '#2C3E50' : '#FFFFFF', color: filterType === f.key ? '#FFFFFF' : '#6C757D' }}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Liste */}
      <section style={{ backgroundColor: '#FFFFFF', borderRadius: 12, border: '1px solid #E9ECEF', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #E9ECEF', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#2C3E50' }}>Registre détaillé</h2>
          <span style={{ fontSize: 12, color: '#ADB5BD' }}>{filteredRecords.length} entrée{filteredRecords.length !== 1 ? 's' : ''}</span>
        </div>
        {filteredRecords.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center' }}>
            <p style={{ margin: 0, color: '#ADB5BD', fontSize: 14 }}>Aucune entrée pour cette période.</p>
          </div>
        ) : (
          filteredRecords.map((r: any, i: number) => {
            const cfg = TYPE_LABELS[r.type] || TYPE_LABELS.VISITEUR;
            const entree = new Date(r.checkedInAt).toLocaleString('fr-CA', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
            const sortie = r.checkedOutAt ? new Date(r.checkedOutAt).toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit' }) : null;
            const duration = r.checkedOutAt
              ? Math.round((new Date(r.checkedOutAt).getTime() - new Date(r.checkedInAt).getTime()) / 60000)
              : null;
            return (
              <div key={r.id} style={{ padding: '12px 20px', borderBottom: i < filteredRecords.length - 1 ? '1px solid #F1F3F5' : 'none', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 14, fontWeight: 800, color: cfg.color }}>
                  {r.firstName.charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#2C3E50' }}>{r.firstName} {r.lastName}</p>
                  <p style={{ margin: '2px 0 0', fontSize: 11, color: '#ADB5BD', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {cfg.label}{r.company ? ` · ${r.company}` : ''}{r.floor ? ` · Étage ${r.floor}` : ''}
                  </p>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <p style={{ margin: 0, fontSize: 12, color: '#2C3E50', fontWeight: 600 }}>↓ {entree}</p>
                  {sortie ? (
                    <p style={{ margin: '2px 0 0', fontSize: 11, color: '#ADB5BD' }}>↑ {sortie} · {duration} min</p>
                  ) : (
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 6, backgroundColor: '#EAFAF1', color: '#27AE60' }}>Présent</span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </section>

      {/* Lien rapports évacuation */}
      <div style={{ marginTop: 16, textAlign: 'right' }}>
        <button type="button" onClick={() => router.push(`/sentinelle/${buildingId}/rapports`)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#C0392B', fontWeight: 600 }}>
          Rapports d&apos;évacuation →
        </button>
      </div>
    </PortalLayout>
  );
}