'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiGet, apiPost, getUser } from '../store/auth';
import PortalLayout from '../components/PortalLayout';
import {
  Calendar,
  MapPin,
  Monitor,
} from 'lucide-react';

const STATUS_CONFIG: Record<
  string,
  {
    label: string;
    color: string;
    bg: string;
    border: string;
  }
> = {
  a_faire: {
    label: 'À faire',
    color: '#2980B9',
    bg: '#EBF5FB',
    border: '#AED6F1',
  },

  fait: {
    label: 'Fait',
    color: '#27AE60',
    bg: '#EAFAF1',
    border: '#A9DFBF',
  },

  reporte: {
    label: 'Reporté',
    color: '#E67E22',
    bg: '#FEF9E7',
    border: '#FAD7A0',
  },

  annule: {
    label: 'Annulé',
    color: '#95A5A6',
    bg: '#F8F9FA',
    border: '#DEE2E6',
  },

  termine: {
    label: 'Terminé',
    color: '#1A5276',
    bg: '#D6EAF8',
    border: '#AED6F1',
  },
};

// Libellés client des états de réservation (codes internes du serveur).
const BOOKING_LABELS: Record<string, string> = {
  DEMANDEE: 'Demande envoyée — en attente de confirmation',
  CONFIRMEE: 'Rendez-vous confirmé',
  REASSIGNEE: 'Rendez-vous confirmé',
  REPORTEE: 'Rendez-vous reporté',
  REFUSEE: 'Demande refusée',
  COMPLETEE: 'Réalisée',
  ANNULEE: 'Rendez-vous annulé',
};

// « 3h00 », « 1h30 » ou « 2h » → minutes ; 60 par défaut.
function durationMinutes(value: unknown): number {
  const match = typeof value === 'string' ? /^(\d+)\s*h\s*(\d{0,2})/i.exec(value.trim()) : null;
  return match ? Number(match[1]) * 60 + Number(match[2] || 0) : 60;
}

function bookingErrorMessage(error: unknown): string {
  const raw = error instanceof Error ? error.message : '';
  if (/capacit|disponible/i.test(raw)) return 'Aucun conseiller n’est disponible à ce moment. Proposez un autre créneau.';
  if (/admissible/i.test(raw)) return 'Cette activité ne peut pas encore être réservée. Contactez votre conseiller.';
  return raw || 'La demande n’a pas pu être envoyée. Réessayez.';
}

export default function ActivitiesPage() {
  const router = useRouter();

  const [user, setUser] = useState<any>(null);
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [planningId, setPlanningId] = useState<string | null>(null);
  const [requestedDate, setRequestedDate] = useState('');
  const [planningError, setPlanningError] = useState('');

  const planActivity = async (activity: any) => {
    if (!requestedDate) { setPlanningError('Choisissez une date et une heure.'); return; }
    try {
      setPlanningError('');
      // La durée est celle de l'activité prévue par le conseiller : le client choisit seulement le créneau.
      await apiPost(`/client-portal/activities/${activity.id}/bookings`, {
        requestedLocalDateTime: requestedDate, duration: durationMinutes(activity.duration),
      });
      setPlanningId(null);
      await fetchActivities();
    } catch (error) {
      setPlanningError(bookingErrorMessage(error));
    }
  };

  useEffect(() => {
    const currentUser = getUser();

    if (!currentUser) {
      router.replace('/login');
      return;
    }

    setUser(currentUser);
    fetchActivities();
  }, [router]);

  const fetchActivities = async () => {
    setLoadError('');
    setLoading(true);
    try {
      const res = await apiGet('/client-portal/activities');
      setActivities(res || []);
    } catch (err) {
      console.error(err);
      setLoadError('Impossible de charger les activités. Réessayez après avoir vérifié votre connexion.');
    } finally {
      setLoading(false);
    }
  };

  const filtered = activities.filter((a) => {
    if (filterStatus && a.status !== filterStatus) {
      return false;
    }

    return true;
  });

  const isOpen = (a: any) => !['fait', 'termine', 'annule'].includes(a.status);
  // Activités sans date que le client peut réserver lui-même.
  const toPlan = filtered.filter((a) => !a.scheduledDate && isOpen(a) && a.clientBookable && !a.bookings?.[0]);
  const upcoming = filtered.filter((a) => {
    if (!a.scheduledDate) {
      return false;
    }

    return (
      new Date(a.scheduledDate) >= new Date() &&
      a.status !== 'fait' &&
      a.status !== 'termine'
    );
  });

  const past = filtered.filter((a) => {
    if (toPlan.includes(a)) return false;
    if (!a.scheduledDate) {
      return true;
    }

    return (
      new Date(a.scheduledDate) < new Date() ||
      a.status === 'fait' ||
      a.status === 'termine'
    );
  });

  if (loading || !user) {
    return (
      <PortalLayout>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 300,
            padding: 24,
          }}
        >
          <p
            className="animate-pulse"
            style={{
              margin: 0,
              color: '#ADB5BD',
              fontSize: 14,
            }}
          >
            Chargement...
          </p>
        </div>
      </PortalLayout>
    );
  }

  const ActivityCard = ({ a }: { a: any }) => {
    const status =
      STATUS_CONFIG[a.status] || STATUS_CONFIG.a_faire;

    const date = a.scheduledDate
      ? new Date(a.scheduledDate)
      : null;

    return (
      <article
        style={{
          minWidth: 0,
          backgroundColor: '#FFFFFF',
          borderRadius: 12,
          border: '1px solid #E9ECEF',
          padding: 'clamp(16px, 4vw, 24px)',
          display: 'flex',
          alignItems: 'flex-start',
          gap: 16,
          flexWrap: 'wrap',
        }}
      >
        {/* Date */}
        {date && (
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 10,
              backgroundColor: '#EBF5FB',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <p
              style={{
                margin: 0,
                fontSize: 18,
                fontWeight: 900,
                color: '#2980B9',
                lineHeight: 1,
              }}
            >
              {date.getDate()}
            </p>

            <p
              style={{
                margin: '4px 0 0',
                fontSize: 10,
                color: '#2980B9',
                textTransform: 'uppercase',
                fontWeight: 600,
                lineHeight: 1,
              }}
            >
              {date.toLocaleDateString('fr-CA', {
                month: 'short',
              })}
            </p>
          </div>
        )}

        {/* Infos */}
        <div
          style={{
            flex: 1,
            minWidth: 0,
          }}
        >
          <p
            style={{
              margin: '0 0 6px',
              fontSize: 15,
              fontWeight: 700,
              color: '#2C3E50',
              lineHeight: 1.4,
              overflowWrap: 'anywhere',
            }}
          >
            {a.customLabel || a.label}
          </p>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px 14px',
              flexWrap: 'wrap',
              minWidth: 0,
            }}
          >
            <p
              style={{
                margin: 0,
                fontSize: 13,
                color: '#6C757D',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                whiteSpace: 'nowrap',
              }}
            >
              {a.mode === 'teams' ? (
                <>
                  <Monitor size={13} />
                  Réunion Teams
                </>
              ) : (
                <>
                  <MapPin size={13} />
                  Présentiel
                </>
              )}
            </p>

            {a.duration && (
              <p
                style={{
                  margin: 0,
                  fontSize: 13,
                  color: '#ADB5BD',
                  whiteSpace: 'nowrap',
                }}
              >
                ⏱ {a.duration}
              </p>
            )}

            <p
              style={{
                margin: 0,
                minWidth: 0,
                maxWidth: '100%',
                fontSize: 13,
                color: '#ADB5BD',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {a.project?.building?.name ||
                a.project?.name ||
                '—'}
            </p>
          </div>
        </div>

        {/* Statut */}
        <span
          style={{
            fontSize: 12,
            fontWeight: 600,
            padding: '5px 10px',
            borderRadius: 10,
            backgroundColor: status.bg,
            color: status.color,
            border: `1px solid ${status.border}`,
            flexShrink: 0,
            whiteSpace: 'nowrap',
          }}
        >
          {status.label}
        </span>
        {a.bookings?.[0] ? (
          <span style={{ fontSize: 13, color: '#2C3E50', fontWeight: 600 }}>
            {BOOKING_LABELS[a.bookings[0].status] ?? 'Rendez-vous en cours de traitement'}
          </span>
        ) : a.clientVisible && a.clientBookable && !['fait', 'termine', 'annule'].includes(a.status) ? (
          <div style={{ flexBasis: '100%' }}>
            {planningId !== a.id ? (
              <button type="button" onClick={() => { setPlanningId(a.id); setPlanningError(''); setRequestedDate(''); }}
                style={{ backgroundColor: '#C0392B', color: '#FFFFFF', border: 'none', borderRadius: 4, padding: '8px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                Choisir une date
              </button>
            ) : (
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end', marginTop: 4 }}>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, color: '#6C757D' }}>
                  Date et heure souhaitées (heure du bâtiment)
                  <input aria-label="Date souhaitée" type="datetime-local" value={requestedDate} onChange={e => setRequestedDate(e.target.value)}
                    style={{ padding: '7px 10px', border: '1px solid #CED4DA', borderRadius: 4, fontSize: 14 }} />
                </label>
                <span style={{ fontSize: 12, color: '#6C757D', paddingBottom: 9 }}>Durée prévue : {a.duration || '1 h'}</span>
                <button type="button" onClick={() => planActivity(a)}
                  style={{ backgroundColor: '#C0392B', color: '#FFFFFF', border: 'none', borderRadius: 4, padding: '8px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                  Envoyer la demande
                </button>
                <button type="button" onClick={() => setPlanningId(null)}
                  style={{ background: 'none', border: '1px solid #CED4DA', borderRadius: 4, padding: '8px 14px', fontSize: 13, color: '#6C757D', cursor: 'pointer' }}>
                  Annuler
                </button>
                {planningError && <span role="alert" style={{ flexBasis: '100%', fontSize: 13, color: '#C0392B' }}>{planningError}</span>}
              </div>
            )}
          </div>
        ) : null}
      </article>
    );
  };

  return (
    <PortalLayout>
      {/* En-tête */}
      <header
        style={{
          marginBottom: 28,
        }}
      >
        <p
          style={{
            margin: '0 0 4px',
            fontSize: 12,
            fontWeight: 700,
            color: '#ADB5BD',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
          }}
        >
          Activités
        </p>

        <h1
            className="coro-title"
          style={{
            margin: 0,
            fontSize: 'clamp(24px, 5vw, 28px)',
            lineHeight: 1.2,
            fontWeight: 800,
            color: '#2C3E50',
          }}
        >
          Calendrier des activités
        </h1>
      </header>

      {loadError && (
        <div role="alert" style={{ marginBottom: 20, padding: 16, border: '1px solid #F1948A', borderRadius: 10, background: '#FDEDEC', color: '#922B21' }}>
          <p style={{ margin: '0 0 10px' }}>{loadError}</p>
          <button type="button" onClick={() => void fetchActivities()} style={{ minHeight: 44, padding: '8px 14px' }}>Réessayer</button>
        </div>
      )}

      {/* Filtre */}
      <div
        style={{
          marginBottom: 24,
          width: '100%',
          maxWidth: 320,
        }}
      >
        <label
          htmlFor="activity-status"
          style={{
            display: 'block',
            marginBottom: 6,
            fontSize: 12,
            fontWeight: 600,
            color: '#6C757D',
          }}
        >
          Filtrer par statut
        </label>

        <select
          id="activity-status"
          value={filterStatus}
          onChange={(e) =>
            setFilterStatus(e.target.value)
          }
          style={{
            width: '100%',
            minHeight: 46,
            padding: '10px 14px',
            borderRadius: 7,
            border: '1px solid #DEE2E6',
            fontSize: 16,
            color: '#2C3E50',
            backgroundColor: '#FFFFFF',
            outline: 'none',
          }}
        >
          <option value="">Tous les statuts</option>

          {Object.entries(STATUS_CONFIG).map(
            ([key, val]) => (
              <option key={key} value={key}>
                {val.label}
              </option>
            )
          )}
        </select>
      </div>

      {/* À venir */}
      {upcoming.length > 0 && (
        <section
          style={{
            marginBottom: 32,
          }}
        >
          <h2
            style={{
              margin: '0 0 16px',
              fontSize: 16,
              fontWeight: 700,
              color: '#2C3E50',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <Calendar
              size={18}
              color="#2980B9"
            />
            À venir ({upcoming.length})
          </h2>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}
          >
            {upcoming.map((a) => (
              <ActivityCard
                key={a.id}
                a={a}
              />
            ))}
          </div>
        </section>
      )}

      {/* À planifier */}
      {toPlan.length > 0 && (
        <section style={{ marginBottom: 32 }}>
          <h2 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 700, color: '#2C3E50' }}>
            À planifier ({toPlan.length})
          </h2>
          <p style={{ margin: '0 0 16px', fontSize: 13, color: '#6C757D' }}>
            Proposez une date : votre conseiller la confirmera.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {toPlan.map((a) => (
              <ActivityCard key={a.id} a={a} />
            ))}
          </div>
        </section>
      )}

      {/* Historique */}
      {past.length > 0 && (
        <section>
          <h2
            style={{
              margin: '0 0 16px',
              fontSize: 16,
              fontWeight: 700,
              color: '#2C3E50',
            }}
          >
            Autres activités ({past.length})
          </h2>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}
          >
            {past.map((a) => (
              <ActivityCard
                key={a.id}
                a={a}
              />
            ))}
          </div>
        </section>
      )}

      {/* Aucun résultat */}
      {filtered.length === 0 && (
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 12,
            border: '1px solid #E9ECEF',
            padding: 'clamp(40px, 10vw, 64px) 20px',
            textAlign: 'center',
          }}
        >
          <Calendar
            size={48}
            color="#DEE2E6"
            style={{
              margin: '0 auto 16px',
            }}
          />

          <p
            style={{
              margin: 0,
              color: '#ADB5BD',
              fontSize: 15,
            }}
          >
            Aucune activité planifiée.
          </p>
        </div>
      )}
    </PortalLayout>
  );
}
