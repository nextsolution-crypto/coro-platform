'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiGet, getUser } from '../store/auth';
import PortalLayout from '../components/PortalLayout';
import { Bell, FileText, CheckCircle, Clock } from 'lucide-react';

const TYPE_CONFIG: Record<string, { icon: any; color: string; bg: string; border: string }> = {
  TO_SIGN:      { icon: CheckCircle, color: '#8E44AD', bg: '#F4ECF7', border: '#D2B4DE' },
  NEW_DOCUMENT: { icon: FileText,    color: '#27AE60', bg: '#EAFAF1', border: '#A9DFBF' },
  STALE:        { icon: Clock,       color: '#F39C12', bg: '#FEF9E7', border: '#FAD7A0' },
};

export default function NotificationsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const currentUser = getUser();
    if (!currentUser) { router.replace('/login'); return; }
    setUser(currentUser);
    fetchNotifications();
  }, [router]);

  const fetchNotifications = async () => {
    try {
      const res = await apiGet('/client-portal/notifications');
      setNotifications(res || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !user) {
    return (
      <PortalLayout>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
          <p className="animate-pulse" style={{ margin: 0, color: '#ADB5BD', fontSize: 14 }}>Chargement...</p>
        </div>
      </PortalLayout>
    );
  }

  const high   = notifications.filter(n => n.priority === 'HIGH');
  const medium = notifications.filter(n => n.priority === 'MEDIUM');
  const low    = notifications.filter(n => n.priority === 'LOW');

  return (
    <PortalLayout>
      {/* En-tête */}
      <header style={{ marginBottom: 28 }}>
        <p style={{ margin: '0 0 4px', fontSize: 12, fontWeight: 700, color: '#ADB5BD', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Notifications
        </p>
        <h1 style={{ margin: 0, fontSize: 'clamp(24px, 5vw, 28px)', lineHeight: 1.2, fontWeight: 800, color: '#2C3E50' }}>
          {notifications.length === 0 ? 'Tout est à jour' : `${notifications.length} notification${notifications.length > 1 ? 's' : ''}`}
        </h1>
      </header>

      {notifications.length === 0 ? (
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: 12, border: '1px solid #E9ECEF', padding: 64, textAlign: 'center' }}>
          <Bell size={40} color="#DEE2E6" style={{ margin: '0 auto 16px' }} />
          <p style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 600, color: '#6C757D' }}>Aucune notification</p>
          <p style={{ margin: 0, fontSize: 14, color: '#ADB5BD' }}>Tous vos documents sont à jour.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

          {/* Priorité haute */}
          {high.length > 0 && (
            <section>
              <p style={{ margin: '0 0 12px', fontSize: 12, fontWeight: 700, color: '#C0392B', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                🔴 Action requise ({high.length})
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {high.map(n => <NotifCard key={n.id} notif={n} onClick={() => router.push(`/documents/${n.projectId}`)} />)}
              </div>
            </section>
          )}

          {/* Priorité moyenne */}
          {medium.length > 0 && (
            <section>
              <p style={{ margin: '0 0 12px', fontSize: 12, fontWeight: 700, color: '#27AE60', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                🟢 Nouveautés ({medium.length})
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {medium.map(n => <NotifCard key={n.id} notif={n} onClick={() => router.push(`/documents/${n.projectId}`)} />)}
              </div>
            </section>
          )}

          {/* Priorité basse */}
          {low.length > 0 && (
            <section>
              <p style={{ margin: '0 0 12px', fontSize: 12, fontWeight: 700, color: '#F39C12', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                🟡 Informations ({low.length})
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {low.map(n => <NotifCard key={n.id} notif={n} onClick={() => router.push(`/documents/${n.projectId}`)} />)}
              </div>
            </section>
          )}
        </div>
      )}
    </PortalLayout>
  );
}

function NotifCard({ notif, onClick }: { notif: any; onClick: () => void }) {
  const cfg = TYPE_CONFIG[notif.type] || TYPE_CONFIG.STALE;
  const Icon = cfg.icon;
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: '100%', textAlign: 'left', cursor: 'pointer',
        backgroundColor: cfg.bg, borderRadius: 10,
        border: `1px solid ${cfg.border}`, padding: '16px 20px',
        display: 'flex', alignItems: 'flex-start', gap: 14,
        transition: 'transform 0.15s, box-shadow 0.15s',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'translateY(-1px)';
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      <div style={{
        width: 38, height: 38, borderRadius: '50%',
        backgroundColor: '#FFFFFF', display: 'flex',
        alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <Icon size={18} color={cfg.color} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 700, color: '#2C3E50' }}>
          {notif.title}
        </p>
        <p style={{ margin: '0 0 4px', fontSize: 13, color: '#495057', lineHeight: 1.4 }}>
          {notif.message}
        </p>
        {notif.building && (
          <p style={{ margin: 0, fontSize: 12, color: '#ADB5BD' }}>
            🏢 {notif.building}
          </p>
        )}
      </div>
      <span style={{ fontSize: 15, color: cfg.color, flexShrink: 0, marginTop: 2 }}>→</span>
    </button>
  );
}