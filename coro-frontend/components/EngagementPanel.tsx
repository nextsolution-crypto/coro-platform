'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';

interface EngagementData {
  totalOpens: number;
  totalViews: number;
  totalDownloads: number;
  firstOpenedAt: string | null;
  lastOpenedAt: string | null;
  totalDurationSeconds: number;
  dominantDevice: string | null;
  daysSinceFirstOpen: number | null;
  status: 'not_opened' | 'opened' | 'viewed' | 'downloaded';
}

export default function EngagementPanel({ projectId }: { projectId: string }) {
  const [data, setData] = useState<EngagementData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEngagement();
  }, [projectId]);

  const fetchEngagement = async () => {
    try {
      const res = await api.get(`/client-portal/projects/${projectId}/engagement`);
      setData(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const deviceIcon = (device: string | null) => {
    if (device === 'mobile') return '📱';
    if (device === 'tablet') return '📟';
    return '🖥️';
  };

  const statusConfig = {
    not_opened: { label: 'Pas encore ouvert', color: '#ADB5BD', bg: '#F8F9FA', border: '#DEE2E6', icon: '○' },
    opened:     { label: 'Ouvert', color: '#2980B9', bg: '#EBF5FB', border: '#AED6F1', icon: '👁' },
    viewed:     { label: 'Consulté', color: '#F39C12', bg: '#FEF9E7', border: '#FAD7A0', icon: '📖' },
    downloaded: { label: 'Téléchargé', color: '#27AE60', bg: '#EAFAF1', border: '#A9DFBF', icon: '✓' },
  };

  const sc = data ? statusConfig[data.status] : statusConfig.not_opened;

  return (
    <div className="rounded-md p-6 mb-6"
      style={{ backgroundColor: '#FFFFFF', border: '1px solid #E9ECEF', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold" style={{ color: '#2C3E50' }}>📊 Engagement client</h3>
        <button onClick={fetchEngagement} className="text-xs px-2 py-1 rounded" style={{ border: '1px solid #DEE2E6', color: '#ADB5BD' }}>
          ↻ Actualiser
        </button>
      </div>

      {loading ? (
        <p className="text-sm animate-pulse text-center py-4" style={{ color: '#ADB5BD' }}>Chargement...</p>
      ) : !data ? (
        <p className="text-sm text-center py-4" style={{ color: '#ADB5BD' }}>Données non disponibles</p>
      ) : (
        <>
          {/* Statut global */}
          <div className="flex items-center gap-3 p-3 rounded-md mb-4"
            style={{ backgroundColor: sc.bg, border: `1px solid ${sc.border}` }}>
            <span style={{ fontSize: 20 }}>{sc.icon}</span>
            <div>
              <p className="text-sm font-bold" style={{ color: sc.color }}>{sc.label}</p>
              {data.firstOpenedAt && (
                <p className="text-xs" style={{ color: '#6C757D' }}>
                  Premier accès le {new Date(data.firstOpenedAt).toLocaleDateString('fr-CA', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </p>
              )}
              {!data.firstOpenedAt && (
                <p className="text-xs" style={{ color: '#ADB5BD' }}>Le client n'a pas encore ouvert le document</p>
              )}
            </div>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-4 gap-3 mb-4">
            {[
              { label: 'Ouvertures', value: data.totalOpens, color: '#2980B9' },
              { label: 'Consultations', value: data.totalViews, color: '#F39C12' },
              { label: 'Téléchargements', value: data.totalDownloads, color: '#27AE60' },
              { label: 'Jours depuis export', value: data.daysSinceFirstOpen ?? '—', color: '#8E44AD' },
            ].map(kpi => (
              <div key={kpi.label} className="rounded-md p-3 text-center"
                style={{ backgroundColor: '#F8F9FA', border: '1px solid #E9ECEF' }}>
                <p className="text-2xl font-black" style={{ color: kpi.color }}>{kpi.value}</p>
                <p className="text-xs mt-1" style={{ color: '#ADB5BD' }}>{kpi.label}</p>
              </div>
            ))}
          </div>

          {/* Détails */}
          {data.totalOpens > 0 && (
            <div className="grid grid-cols-2 gap-3">
              {data.dominantDevice && (
                <div className="rounded-md p-3"
                  style={{ backgroundColor: '#F8F9FA', border: '1px solid #E9ECEF' }}>
                  <p className="text-xs" style={{ color: '#ADB5BD' }}>Appareil principal</p>
                  <p className="text-sm font-semibold mt-1" style={{ color: '#2C3E50' }}>
                    {deviceIcon(data.dominantDevice)} {data.dominantDevice === 'mobile' ? 'Mobile' : data.dominantDevice === 'tablet' ? 'Tablette' : 'Ordinateur'}
                  </p>
                </div>
              )}
              {data.lastOpenedAt && (
                <div className="rounded-md p-3"
                  style={{ backgroundColor: '#F8F9FA', border: '1px solid #E9ECEF' }}>
                  <p className="text-xs" style={{ color: '#ADB5BD' }}>Dernier accès</p>
                  <p className="text-sm font-semibold mt-1" style={{ color: '#2C3E50' }}>
                    {new Date(data.lastOpenedAt).toLocaleDateString('fr-CA', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              )}
            </div>
          )}

          {data.status === 'not_opened' && (
            <div className="rounded-md p-3 mt-2"
              style={{ backgroundColor: '#FEF9E7', border: '1px solid #FAD7A0' }}>
              <p className="text-xs" style={{ color: '#F39C12' }}>
                💡 Le client n'a pas encore consulté le document. Pensez à lui envoyer un rappel ou à utiliser un magic link.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}