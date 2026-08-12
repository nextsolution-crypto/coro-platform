'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiGet, getUser } from '../store/auth';
import PortalLayout from '../components/PortalLayout';
import { Calendar, MapPin, Monitor } from 'lucide-react';

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  a_faire:  { label: 'À faire',  color: '#2980B9', bg: '#EBF5FB', border: '#AED6F1' },
  fait:     { label: 'Fait',     color: '#27AE60', bg: '#EAFAF1', border: '#A9DFBF' },
  reporte:  { label: 'Reporté',  color: '#E67E22', bg: '#FEF9E7', border: '#FAD7A0' },
  annule:   { label: 'Annulé',   color: '#95A5A6', bg: '#F8F9FA', border: '#DEE2E6' },
  termine:  { label: 'Terminé',  color: '#1A5276', bg: '#D6EAF8', border: '#AED6F1' },
};

export default function ActivitiesPage() {
  const router = useRouter();
  const user = getUser();
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');

  useEffect(() => {
    if (!user) { router.push('/login'); return; }
    fetchActivities();
  }, []);

  const fetchActivities = async () => {
    try {
      const res = await apiGet('/client-portal/activities');
      setActivities(res || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = activities.filter(a => {
    if (filterStatus && a.status !== filterStatus) return false;
    return true;
  });

  const upcoming = filtered.filter(a => {
    if (!a.scheduledDate) return false;
    return new Date(a.scheduledDate) >= new Date() && a.status !== 'fait' && a.status !== 'termine';
  });

  const past = filtered.filter(a => {
    if (!a.scheduledDate) return true;
    return new Date(a.scheduledDate) < new Date() || a.status === 'fait' || a.status === 'termine';
  });

  if (loading) return (
    <PortalLayout>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
        <p style={{ color: '#ADB5BD', fontSize: 14 }} className="animate-pulse">Chargement...</p>
      </div>
    </PortalLayout>
  );

  const ActivityCard = ({ a }: { a: any }) => {
    const status = STATUS_CONFIG[a.status] || STATUS_CONFIG['a_faire'];
    const date = a.scheduledDate ? new Date(a.scheduledDate) : null;
    return (
      <div style={{
        backgroundColor: '#FFFFFF', borderRadius: 12, border: '1px solid #E9ECEF',
        padding: '20px 24px', display: 'flex', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap',
      }}>
        {/* Date */}
        {date && (
          <div style={{
            width: 52, height: 52, borderRadius: 10, backgroundColor: '#EBF5FB',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <p style={{ fontSize: 18, fontWeight: 900, color: '#2980B9', lineHeight: 1 }}>
              {date.getDate()}
            </p>
            <p style={{ fontSize: 10, color: '#2980B9', textTransform: 'uppercase', fontWeight: 600 }}>
              {date.toLocaleDateString('fr-CA', { month: 'short' })}
            </p>
          </div>
        )}

        {/* Infos */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 15, fontWeight: 700, color: '#2C3E50', marginBottom: 4 }}>
            {a.customLabel || a.label}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <p style={{ fontSize: 13, color: '#6C757D', display: 'flex', alignItems: 'center', gap: 4 }}>
              {a.mode === 'teams'
                ? <><Monitor size={13} /> Réunion Teams</>
                : <><MapPin size={13} /> Présentiel</>
              }
            </p>
            {a.duration && (
              <p style={{ fontSize: 13, color: '#ADB5BD' }}>⏱ {a.duration}</p>
            )}
            <p style={{ fontSize: 13, color: '#ADB5BD' }}>
              {a.project?.building?.name || a.project?.name}
            </p>
          </div>
        </div>

        {/* Statut */}
        <span style={{
          fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 10,
          backgroundColor: status.bg, color: status.color, border: `1px solid ${status.border}`,
          flexShrink: 0,
        }}>
          {status.label}
        </span>
      </div>
    );
  };

  return (
    <PortalLayout>
      <div style={{ marginBottom: 32 }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: '#ADB5BD', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
          Activités
        </p>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: '#2C3E50' }}>
          Calendrier des activités
        </h1>
      </div>

      {/* Filtre */}
      <div style={{ marginBottom: 24 }}>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          style={{
            padding: '10px 16px', borderRadius: 6, border: '1px solid #DEE2E6',
            fontSize: 14, color: '#2C3E50', backgroundColor: '#FFFFFF', outline: 'none',
          }}>
          <option value="">Tous les statuts</option>
          {Object.entries(STATUS_CONFIG).map(([key, val]) => (
            <option key={key} value={key}>{val.label}</option>
          ))}
        </select>
      </div>

      {/* À venir */}
      {upcoming.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#2C3E50', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Calendar size={18} color="#2980B9" /> À venir ({upcoming.length})
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {upcoming.map(a => <ActivityCard key={a.id} a={a} />)}
          </div>
        </div>
      )}

      {/* Passées */}
      {past.length > 0 && (
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#2C3E50', marginBottom: 16 }}>
            Historique ({past.length})
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {past.map(a => <ActivityCard key={a.id} a={a} />)}
          </div>
        </div>
      )}

      {filtered.length === 0 && (
        <div style={{
          backgroundColor: '#FFFFFF', borderRadius: 12, border: '1px solid #E9ECEF',
          padding: 64, textAlign: 'center',
        }}>
          <Calendar size={48} color="#DEE2E6" style={{ margin: '0 auto 16px' }} />
          <p style={{ color: '#ADB5BD', fontSize: 15 }}>Aucune activité planifiée.</p>
        </div>
      )}
    </PortalLayout>
  );
}