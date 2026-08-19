'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getUser, apiGet } from '../store/auth';
import PortalLayout from '../components/PortalLayout';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  'http://localhost:3002/api';

const ACTIVITY_TYPES = [
  {
    value: 'exercice',
    label: "🚨 Exercice d'évacuation",
    duration: 180,
  },
  {
    value: 'formation',
    label: '📚 Formation',
    duration: 120,
  },
  {
    value: 'visite',
    label: '🏢 Visite de suivi',
    duration: 60,
  },
  {
    value: 'revision',
    label: '📄 Révision documentaire',
    duration: 90,
  },
  {
    value: 'autre',
    label: '📅 Autre activité',
    duration: 60,
  },
];

const STATUS_CONFIG: Record<
  string,
  {
    label: string;
    color: string;
    bg: string;
    border: string;
    icon: string;
  }
> = {
  DEMANDEE: {
    label: 'Demandée',
    color: '#2980B9',
    bg: '#EBF5FB',
    border: '#AED6F1',
    icon: '⏳',
  },
  CONFIRMEE: {
    label: 'Confirmée',
    color: '#27AE60',
    bg: '#EAFAF1',
    border: '#A9DFBF',
    icon: '✅',
  },
  REPORTEE: {
    label: 'Reportée',
    color: '#F39C12',
    bg: '#FEF9E7',
    border: '#FAD7A0',
    icon: '📅',
  },
  REASSIGNEE: {
    label: 'Réassignée',
    color: '#8E44AD',
    bg: '#F4ECF7',
    border: '#D2B4DE',
    icon: '👤',
  },
  REFUSEE: {
    label: 'Refusée',
    color: '#C0392B',
    bg: '#FDEDEC',
    border: '#F1948A',
    icon: '❌',
  },
  COMPLETEE: {
    label: 'Complétée',
    color: '#27AE60',
    bg: '#EAFAF1',
    border: '#A9DFBF',
    icon: '✓',
  },
  ANNULEE: {
    label: 'Annulée',
    color: '#6C757D',
    bg: '#F8F9FA',
    border: '#DEE2E6',
    icon: '✕',
  },
};

export default function BookingsPage() {
  const router = useRouter();

  const [user, setUser] = useState<any>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const [form, setForm] = useState({
    projectId: '',
    activityType: 'exercice',
    requestedDate: '',
    requestedTime: '09:00',
    duration: 180,
    participants: '',
    comment: '',
  });

  useEffect(() => {
    const currentUser = getUser();

    if (!currentUser) {
      router.replace('/login');
      return;
    }

    setUser(currentUser);
    fetchData();
  }, [router]);

  const fetchData = async () => {
    try {
      const [projectsRes, bookingsRes] =
        await Promise.all([
          apiGet('/client-portal/projects'),
          apiGet('/client-portal/bookings'),
        ]);

      setProjects(
        (projectsRes || []).filter(
          (p: any) =>
            p.status === 'VALIDATED' ||
            p.status === 'EXPORTED'
        )
      );

      setBookings(bookingsRes || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleActivityChange = (type: string) => {
    const activity = ACTIVITY_TYPES.find(
      a => a.value === type
    );

    setForm(f => ({
      ...f,
      activityType: type,
      duration: activity?.duration || 60,
    }));
  };

  const handleSubmit = async () => {
    if (
      !form.projectId ||
      !form.requestedDate ||
      !form.requestedTime ||
      submitting
    ) {
      return;
    }

    setSubmitting(true);

    try {
      const requestedDate = new Date(
        `${form.requestedDate}T${form.requestedTime}:00`
      );

      const token = localStorage.getItem(
        'coro_client_token'
      );

      const res = await fetch(
        `${API_URL}/client-portal/projects/${form.projectId}/bookings`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            activityType: form.activityType,
            requestedDate:
              requestedDate.toISOString(),
            duration: form.duration,
            participants: form.participants
              ? parseInt(form.participants, 10)
              : undefined,
            comment:
              form.comment.trim() || undefined,
          }),
        }
      );

      if (!res.ok) {
        throw new Error(
          'Erreur lors de la réservation'
        );
      }

      setSuccess(true);
      setShowForm(false);

      setForm({
        projectId: '',
        activityType: 'exercice',
        requestedDate: '',
        requestedTime: '09:00',
        duration: 180,
        participants: '',
        comment: '',
      });

      await fetchData();

      setTimeout(() => {
        setSuccess(false);
      }, 5000);
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async (
    bookingId: string
  ) => {
    if (!confirm('Annuler cette réservation ?')) {
      return;
    }

    try {
      const token = localStorage.getItem(
        'coro_client_token'
      );

      const res = await fetch(
        `${API_URL}/bookings/${bookingId}/cancel`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            cancelledBy: 'client',
          }),
        }
      );

      if (!res.ok) {
        throw new Error(
          "Erreur lors de l'annulation"
        );
      }

      await fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const minDate = new Date();
  minDate.setDate(minDate.getDate() + 1);

  const minDateStr =
    minDate.toISOString().split('T')[0];

  const canSubmit =
    !!form.projectId &&
    !!form.requestedDate &&
    !!form.requestedTime &&
    !submitting;

  if (loading || !user) {
    return (
      <PortalLayout>
        <div
          className="
            flex
            items-center
            justify-center
            min-h-[300px]
            px-4
          "
        >
          <p
            className="animate-pulse text-sm"
            style={{ color: '#ADB5BD' }}
          >
            Chargement...
          </p>
        </div>
      </PortalLayout>
    );
  }

  return (
    <PortalLayout>
      <div className="w-full max-w-5xl mx-auto">

      {/* ═══════════════════════════════════
          EN-TÊTE
      ═══════════════════════════════════ */}

      <header className="mb-8 sm:mb-10" style={{ marginBottom: 36 }}>
        <p
          className="
            mb-1
            text-xs
            font-bold
            uppercase
            tracking-[0.08em]
          "
          style={{ color: '#ADB5BD' }}
        >
          Réservations
        </p>

        <div
          className="
            flex
            flex-col
            sm:flex-row
            sm:items-center
            sm:justify-between
            gap-4
          "
        >
          <h1
            className="
              m-0
              text-[24px]
              sm:text-[30px]
              lg:text-[32px]
              font-extrabold
              leading-tight
              break-words
            "
            style={{ color: '#2C3E50' }}
          >
            Planifier une activité
          </h1>

          {projects.length > 0 && (
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="
                w-full
                sm:w-auto
                min-h-[46px]
                px-5
                py-2.5
                rounded-lg
                text-sm
                font-bold
                transition-colors
                flex-shrink-0
              "
              style={{
                backgroundColor: '#C0392B',
                color: '#FFFFFF',
                border: 'none',
                cursor: 'pointer',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.backgroundColor =
                  '#A93226';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.backgroundColor =
                  '#C0392B';
              }}
            >
              + Nouvelle réservation
            </button>
          )}
        </div>
      </header>


      {/* ═══════════════════════════════════
          SUCCÈS
      ═══════════════════════════════════ */}

      {success && (
        <div
          className="
            rounded-lg
            p-4
            sm:px-5
            mb-7
          "
          style={{
            backgroundColor: '#EAFAF1',
            border: '1px solid #A9DFBF',
          }}
          aria-live="polite"
        >
          <p
            className="
              m-0
              text-sm
              leading-relaxed
              font-bold
            "
            style={{ color: '#27AE60' }}
          >
            ✅ Demande envoyée ! Votre
            conseiller vous contactera pour
            confirmer.
          </p>
        </div>
      )}


      {/* ═══════════════════════════════════
          FORMULAIRE
      ═══════════════════════════════════ */}

      {showForm && (
        <section
          className="
            rounded-2xl
            p-5
            sm:p-7
            lg:p-8
            mb-8
            min-w-0
            max-w-4xl
            mx-auto
          "
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E9ECEF',
            boxShadow:
              '0 10px 30px rgba(0,0,0,0.08)',
          }}
        >
          <h2
            className="
              m-0
              mb-6
              sm:mb-7
              text-lg
              font-bold
            "
            style={{ color: '#2C3E50' }}
          >
            Nouvelle demande de réservation
          </h2>

          <div className="grid gap-6 sm:gap-7">

            {/* PROJET */}

            <div className="min-w-0">
              <label
                htmlFor="booking-project"
                className="
                  block
                  text-[13px]
                  font-semibold
                  mb-2.5
                "
                style={{ color: '#495057' }}
              >
                Projet concerné *
              </label>

              <select
                id="booking-project"
                value={form.projectId}
                onChange={e =>
                  setForm(f => ({
                    ...f,
                    projectId: e.target.value,
                  }))
                }
                className="
                  w-full
                  min-w-0
                  min-h-[46px]
                  px-3
                  py-2.5
                  rounded-lg
                  text-base
                  bg-white
                  outline-none
                "
                style={{
                  border: '1px solid #DEE2E6',
                  color: '#2C3E50',
                }}
              >
                <option value="">
                  Sélectionner un projet...
                </option>

                {projects.map(p => (
                  <option
                    key={p.id}
                    value={p.id}
                  >
                    {p.name}
                    {p.building?.name
                      ? ` — ${p.building.name}`
                      : ''}
                  </option>
                ))}
              </select>
            </div>


            {/* TYPE ACTIVITÉ */}

            <div>
              <label
                className="
                  block
                  text-[13px]
                  font-semibold
                  mb-1.5
                "
                style={{ color: '#495057' }}
              >
                Type d'activité *
              </label>

              <div
                className="
                  grid
                  grid-cols-1
                  min-[420px]:grid-cols-2
                  lg:grid-cols-3
                  gap-3
                "
              >
                {ACTIVITY_TYPES.map(a => {
                  const selected =
                    form.activityType === a.value;

                  return (
                    <button
                      key={a.value}
                      type="button"
                      onClick={() =>
                        handleActivityChange(
                          a.value
                        )
                      }
                      aria-pressed={selected}
                      className="
                        min-h-[60px]
                        px-4
                        py-3
                        rounded-lg
                        text-left
                        transition-colors
                      "
                      style={{
                        border: `2px solid ${
                          selected
                            ? '#C0392B'
                            : '#DEE2E6'
                        }`,
                        backgroundColor: selected
                          ? '#FDEDEC'
                          : '#FFFFFF',
                        color: selected
                          ? '#C0392B'
                          : '#495057',
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      <span
                        className="
                          block
                          leading-snug
                          break-words
                        "
                      >
                        {a.label}
                      </span>

                      <span
                        className="
                          block
                          text-[11px]
                          mt-1
                        "
                        style={{
                          color: '#ADB5BD',
                        }}
                      >
                        {a.duration / 60}h
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>


            {/* DATE + HEURE */}

            <div
              className="
                grid
                grid-cols-1
                sm:grid-cols-2
                gap-4
              "
            >
              <div className="min-w-0">
                <label
                  htmlFor="booking-date"
                  className="
                    block
                    text-[13px]
                    font-semibold
                    mb-1.5
                  "
                  style={{
                    color: '#495057',
                  }}
                >
                  Date souhaitée *
                </label>

                <input
                  id="booking-date"
                  type="date"
                  value={form.requestedDate}
                  min={minDateStr}
                  onChange={e =>
                    setForm(f => ({
                      ...f,
                      requestedDate:
                        e.target.value,
                    }))
                  }
                  className="
                    w-full
                    min-w-0
                    min-h-[46px]
                    px-3
                    py-2.5
                    rounded-lg
                    text-base
                    outline-none
                  "
                  style={{
                    border:
                      '1px solid #DEE2E6',
                    color: '#2C3E50',
                    backgroundColor: '#FFFFFF',
                  }}
                />
              </div>

              <div className="min-w-0">
                <label
                  htmlFor="booking-time"
                  className="
                    block
                    text-[13px]
                    font-semibold
                    mb-1.5
                  "
                  style={{
                    color: '#495057',
                  }}
                >
                  Heure souhaitée *
                </label>

                <input
                  id="booking-time"
                  type="time"
                  value={form.requestedTime}
                  onChange={e =>
                    setForm(f => ({
                      ...f,
                      requestedTime:
                        e.target.value,
                    }))
                  }
                  className="
                    w-full
                    min-w-0
                    min-h-[46px]
                    px-3
                    py-2.5
                    rounded-lg
                    text-base
                    outline-none
                  "
                  style={{
                    border:
                      '1px solid #DEE2E6',
                    color: '#2C3E50',
                    backgroundColor: '#FFFFFF',
                  }}
                />
              </div>
            </div>


            {/* DURÉE + PARTICIPANTS */}

            <div
              className="
                grid
                grid-cols-1
                sm:grid-cols-2
                gap-4
              "
            >
              <div className="min-w-0">
                <label
                  htmlFor="booking-duration"
                  className="
                    block
                    text-[13px]
                    font-semibold
                    mb-1.5
                  "
                  style={{
                    color: '#495057',
                  }}
                >
                  Durée (minutes)
                </label>

                <input
                  id="booking-duration"
                  type="number"
                  value={form.duration}
                  min={30}
                  step={30}
                  inputMode="numeric"
                  onChange={e => {
                    const value =
                      parseInt(
                        e.target.value,
                        10
                      );

                    setForm(f => ({
                      ...f,
                      duration:
                        Number.isNaN(value)
                          ? 30
                          : value,
                    }));
                  }}
                  className="
                    w-full
                    min-w-0
                    min-h-[46px]
                    px-3
                    py-2.5
                    rounded-lg
                    text-base
                    outline-none
                  "
                  style={{
                    border:
                      '1px solid #DEE2E6',
                    color: '#2C3E50',
                    backgroundColor: '#FFFFFF',
                  }}
                />
              </div>

              <div className="min-w-0">
                <label
                  htmlFor="booking-participants"
                  className="
                    block
                    text-[13px]
                    font-semibold
                    mb-1.5
                    leading-snug
                  "
                  style={{
                    color: '#495057',
                  }}
                >
                  Nb. participants (optionnel)
                </label>

                <input
                  id="booking-participants"
                  type="number"
                  value={form.participants}
                  min={1}
                  inputMode="numeric"
                  onChange={e =>
                    setForm(f => ({
                      ...f,
                      participants:
                        e.target.value,
                    }))
                  }
                  placeholder="Ex: 45"
                  className="
                    w-full
                    min-w-0
                    min-h-[46px]
                    px-3
                    py-2.5
                    rounded-lg
                    text-base
                    outline-none
                  "
                  style={{
                    border:
                      '1px solid #DEE2E6',
                    color: '#2C3E50',
                    backgroundColor: '#FFFFFF',
                  }}
                />
              </div>
            </div>


            {/* COMMENTAIRE */}

            <div className="min-w-0">
              <label
                htmlFor="booking-comment"
                className="
                  block
                  text-[13px]
                  font-semibold
                  mb-1.5
                "
                style={{ color: '#495057' }}
              >
                Commentaire (optionnel)
              </label>

              <textarea
                id="booking-comment"
                value={form.comment}
                onChange={e =>
                  setForm(f => ({
                    ...f,
                    comment: e.target.value,
                  }))
                }
                placeholder="Ex: Exercice surprise, 3e étage seulement..."
                rows={3}
                className="
                  w-full
                  min-w-0
                  min-h-[96px]
                  px-3.5
                  py-3
                  rounded-lg
                  text-base
                  leading-relaxed
                  resize-y
                  outline-none
                "
                style={{
                  border:
                    '1px solid #DEE2E6',
                  color: '#2C3E50',
                  backgroundColor: '#FFFFFF',
                }}
              />
            </div>


            {/* ACTIONS */}

            <div
              className="
                grid
                grid-cols-1
                sm:grid-cols-2
                gap-3
                pt-2
              "
            >
              <button
                type="button"
                onClick={() =>
                  setShowForm(false)
                }
                disabled={submitting}
                className="
                  min-h-[48px]
                  px-4
                  py-3
                  rounded-lg
                  text-sm
                  font-semibold
                  transition-colors
                  disabled:opacity-50
                "
                style={{
                  border:
                    '1px solid #DEE2E6',
                  backgroundColor: '#FFFFFF',
                  color: '#6C757D',
                  cursor: submitting
                    ? 'not-allowed'
                    : 'pointer',
                }}
              >
                Annuler
              </button>

              <button
                type="button"
                onClick={handleSubmit}
                disabled={!canSubmit}
                className="
                  min-h-[48px]
                  px-4
                  py-3
                  rounded-lg
                  text-sm
                  font-bold
                  transition-colors
                "
                style={{
                  backgroundColor: canSubmit
                    ? '#C0392B'
                    : '#ADB5BD',
                  color: '#FFFFFF',
                  border: 'none',
                  cursor: canSubmit
                    ? 'pointer'
                    : 'not-allowed',
                }}
              >
                {submitting
                  ? 'Envoi...'
                  : '📅 Envoyer la demande'}
              </button>
            </div>

          </div>
        </section>
      )}


      {/* ═══════════════════════════════════
          AUCUNE RÉSERVATION
      ═══════════════════════════════════ */}

      {bookings.length === 0 && !showForm ? (
        <section
          className="
            rounded-2xl
            px-4
            py-12
            sm:py-16
            lg:py-16
            text-center
          "
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E9ECEF',
          }}
        >
          <p className="text-5xl mb-4">
            📅
          </p>

          <p
            className="
              mb-2
              text-base
              font-bold
            "
            style={{ color: '#2C3E50' }}
          >
            Aucune réservation
          </p>

          <p
            className="
              mb-6
              text-sm
              leading-relaxed
            "
            style={{ color: '#ADB5BD' }}
          >
            Planifiez votre prochain exercice
            ou formation.
          </p>

          {projects.length > 0 && (
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="
                w-full
                sm:w-auto
                min-h-[46px]
                px-6
                py-3
                rounded-lg
                text-sm
                font-bold
                transition-colors
              "
              style={{
                backgroundColor: '#C0392B',
                color: '#FFFFFF',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              + Nouvelle réservation
            </button>
          )}

          {projects.length === 0 && (
            <p
              className="
                m-0
                text-[13px]
                leading-relaxed
              "
              style={{ color: '#ADB5BD' }}
            >
              Aucun document validé
              disponible pour la réservation.
            </p>
          )}
        </section>
      ) : (

        /* ═══════════════════════════════════
           LISTE DES RÉSERVATIONS
        ═══════════════════════════════════ */

        <div className="flex flex-col gap-5 sm:gap-6" style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>

          {bookings.map((booking: any) => {
            const sc =
              STATUS_CONFIG[booking.status] ||
              STATUS_CONFIG.DEMANDEE;

            const activity =
              ACTIVITY_TYPES.find(
                a =>
                  a.value ===
                  booking.activityType
              );

            const canCancel = [
              'DEMANDEE',
              'CONFIRMEE',
            ].includes(booking.status);

            return (
              <article
                key={booking.id}
                className="min-w-0"
                style={{
                  backgroundColor: '#FFFFFF',
                  border: `1px solid ${sc.border}`,
                  borderRadius: 14,
                  padding: '24px',
                  boxShadow: '0 8px 24px rgba(44,62,80,0.07)',
                  overflow: 'hidden',
                }}
              >

                {/* EN-TÊTE CARTE */}

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: 20,
                    flexWrap: 'wrap',
                    marginBottom: 22,
                  }}
                >
                  <div className="min-w-0 flex-1" style={{ flex: '1 1 420px', minWidth: 0 }}>

                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: 10,
                        marginBottom: 8,
                      }}
                    >
                      <span
                        className="
                          text-xs
                          font-bold
                          px-2.5
                          py-1
                          rounded-full
                          whitespace-nowrap
                        "
                        style={{
                          backgroundColor: sc.bg,
                          color: sc.color,
                          border: `1px solid ${sc.border}`,
                        }}
                      >
                        {sc.icon} {sc.label}
                      </span>

                      <span
                        className="
                          text-[13px]
                          font-bold
                          leading-snug
                          break-words
                          min-w-0
                        "
                        style={{
                          color: '#2C3E50',
                          fontSize: 16,
                          fontWeight: 750,
                        }}
                      >
                        {activity?.label ||
                          booking.activityType}
                      </span>
                    </div>

                    <p
                      className="
                        m-0
                        text-[13px]
                        leading-relaxed
                        break-words
                      "
                      style={{
                        color: '#6C757D',
                        fontSize: 14,
                        lineHeight: 1.55,
                      }}
                    >
                      {booking.project?.name || 'Projet'}

                      {booking.project?.building
                        ?.name && (
                        <>
                          {' '}
                          —{' '}
                          {
                            booking.project
                              .building.name
                          }
                        </>
                      )}
                    </p>
                  </div>

                  {canCancel && (
                    <button
                      type="button"
                      onClick={() =>
                        handleCancel(
                          booking.id
                        )
                      }
                      className="transition-colors"
                      style={{
                        border: '1px solid #E6B0AA',
                        backgroundColor: '#FFFFFF',
                        color: '#C0392B',
                        cursor: 'pointer',
                        minHeight: 42,
                        padding: '10px 16px',
                        borderRadius: 8,
                        fontSize: 13,
                        fontWeight: 650,
                        flex: '0 0 auto',
                      }}
                    >
                      Annuler
                    </button>
                  )}
                </div>


                {/* DÉTAILS */}

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                    gap: 14,
                    paddingTop: 18,
                    borderTop: '1px solid #EEF1F3',
                  }}
                >

                  {/* DATE DEMANDÉE */}

                  <div
                    className="
                      rounded-md
                      px-4
                      py-3.5
                      min-w-0
                    "
                    style={{
                      backgroundColor: '#F8F9FA',
                      border: '1px solid #E9ECEF',
                      borderRadius: 9,
                      padding: '14px 16px',
                      minHeight: 72,
                    }}
                  >
                    <p
                      className="
                        mb-0.5
                        text-[11px]
                      "
                      style={{
                        color: '#8A949E',
                        fontSize: 11,
                        lineHeight: 1.3,
                      }}
                    >
                      Date demandée
                    </p>

                    <p
                      className="
                        m-0
                        text-[13px]
                        font-semibold
                        leading-snug
                        break-words
                      "
                      style={{
                        color: '#2C3E50',
                      }}
                    >
                      {new Date(
                        booking.requestedDate
                      ).toLocaleDateString(
                        'fr-CA',
                        {
                          weekday: 'short',
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        }
                      )}
                    </p>
                  </div>


                  {/* DATE REPORTÉE */}

                  {booking.reportedDate && (
                    <div
                      className="
                        rounded-md
                        px-3
                        py-2.5
                        min-w-0
                      "
                      style={{
                        backgroundColor: '#FEF9E7',
                        border: '1px solid #FAD7A0',
                        borderRadius: 9,
                        padding: '14px 16px',
                        minHeight: 72,
                      }}
                    >
                      <p
                        className="
                          mb-0.5
                          text-[11px]
                        "
                        style={{
                          color: '#F39C12',
                        }}
                      >
                        Nouvelle date
                      </p>

                      <p
                        className="
                          m-0
                          text-[13px]
                          font-semibold
                          leading-snug
                          break-words
                        "
                        style={{
                          color: '#F39C12',
                        }}
                      >
                        {new Date(
                          booking.reportedDate
                        ).toLocaleDateString(
                          'fr-CA',
                          {
                            weekday:
                              'short',
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          }
                        )}
                      </p>
                    </div>
                  )}


                  {/* DURÉE */}

                  <div
                    className="
                      rounded-md
                      px-4
                      py-3.5
                      min-w-0
                    "
                    style={{
                      backgroundColor: '#F8F9FA',
                      border: '1px solid #E9ECEF',
                      borderRadius: 9,
                      padding: '14px 16px',
                      minHeight: 72,
                    }}
                  >
                    <p
                      className="
                        mb-0.5
                        text-[11px]
                      "
                      style={{
                        color: '#8A949E',
                        fontSize: 11,
                        lineHeight: 1.3,
                      }}
                    >
                      Durée
                    </p>

                    <p
                      className="
                        m-0
                        text-[13px]
                        font-semibold
                      "
                      style={{
                        color: '#2C3E50',
                      }}
                    >
                      {booking.duration} min
                    </p>
                  </div>


                  {/* CONSEILLER */}

                  <div
                    className="
                      rounded-md
                      px-4
                      py-3.5
                      min-w-0
                    "
                    style={{
                      backgroundColor: '#F8F9FA',
                      border: '1px solid #E9ECEF',
                      borderRadius: 9,
                      padding: '14px 16px',
                      minHeight: 72,
                    }}
                  >
                    <p
                      className="
                        mb-0.5
                        text-[11px]
                      "
                      style={{
                        color: '#8A949E',
                        fontSize: 11,
                        lineHeight: 1.3,
                      }}
                    >
                      Conseiller
                    </p>

                    <p
                      className="
                        m-0
                        text-[13px]
                        font-semibold
                        leading-snug
                        break-words
                      "
                      style={{
                        color: '#2C3E50',
                      }}
                    >
                      {booking.assignedUser
                        ? `${booking.assignedUser.firstName || ''} ${booking.assignedUser.lastName || ''}`.trim() ||
                          'À confirmer'
                        : 'À confirmer'}
                    </p>
                  </div>

                </div>


                {/* REFUS */}

                {booking.refuseReason && (
                  <div
                    className="
                      mt-5
                      px-4
                      py-3.5
                      rounded-md
                    "
                    style={{
                      backgroundColor: '#FDEDEC',
                      border: '1px solid #F1948A',
                      marginTop: 18,
                      padding: '14px 16px',
                      borderRadius: 9,
                    }}
                  >
                    <p
                      className="
                        m-0
                        text-[13px]
                        leading-relaxed
                        break-words
                      "
                      style={{
                        color: '#C0392B',
                      }}
                    >
                      <strong>Motif :</strong>{' '}
                      {booking.refuseReason}
                    </p>
                  </div>
                )}

              </article>
            );
          })}

        </div>
      )}

      </div>
    </PortalLayout>
  );
}