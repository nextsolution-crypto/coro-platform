'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';
import api from '@/lib/api';
import AppLayout from '@/components/layout/AppLayout';
import { Trash2 } from 'lucide-react';

interface Feedback {
  id: string;
  category: string;
  message: string;
  status: string;
  createdAt: string;
  user: {
    firstName: string;
    lastName: string;
    email: string;
  };
  organization: {
    name: string;
  };
}

const CATEGORY_LABELS: Record<
  string,
  { label: string; color: string; bg: string }
> = {
  BUG: {
    label: '🐛 Bug',
    color: '#C0392B',
    bg: '#FDEDEC',
  },
  SUGGESTION: {
    label: '💡 Suggestion',
    color: '#F39C12',
    bg: '#FEF9E7',
  },
  QUESTION: {
    label: '❓ Question',
    color: '#2980B9',
    bg: '#EBF5FB',
  },
  AUTRE: {
    label: '💬 Autre',
    color: '#6C757D',
    bg: '#F8F9FA',
  },
};

const STATUS_OPTIONS = [
  {
    value: 'NOUVEAU',
    label: 'Nouveau',
    color: '#C0392B',
  },
  {
    value: 'LU',
    label: 'Lu',
    color: '#6C757D',
  },
  {
    value: 'EN_COURS',
    label: 'En cours',
    color: '#F39C12',
  },
  {
    value: 'RESOLU',
    label: 'Résolu',
    color: '#27AE60',
  },
];

export default function FeedbackAdminPage() {
  const router = useRouter();
  const { user, isAuthenticated, initAuth } = useAuthStore();

  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('TOUS');

  useEffect(() => {
    initAuth();
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      if (user?.role !== 'SUPER_ADMIN') {
        router.push('/dashboard');
        return;
      }

      fetchData();
    } else {
      const token = localStorage.getItem('coro_token');

      if (!token) {
        router.push('/login');
      }
    }
  }, [isAuthenticated, user]);

  const fetchData = async () => {
    try {
      const res = await api.get('/feedback');
      setFeedbacks(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (
    id: string,
    status: string
  ) => {
    try {
      await api.put(`/feedback/${id}/status`, {
        status,
      });

      setFeedbacks(prev =>
        prev.map(f =>
          f.id === id
            ? {
                ...f,
                status,
              }
            : f
        )
      );
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer ce feedback ?')) {
      return;
    }

    try {
      await api.delete(`/feedback/${id}`);

      setFeedbacks(prev =>
        prev.filter(f => f.id !== id)
      );
    } catch (err) {
      console.error(err);
    }
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('fr-CA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  const filtered =
    filter === 'TOUS'
      ? feedbacks
      : feedbacks.filter(f => f.status === filter);

  const counts = {
    TOUS: feedbacks.length,
    NOUVEAU: feedbacks.filter(
      f => f.status === 'NOUVEAU'
    ).length,
    EN_COURS: feedbacks.filter(
      f => f.status === 'EN_COURS'
    ).length,
    RESOLU: feedbacks.filter(
      f => f.status === 'RESOLU'
    ).length,
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="text-center py-12">
          <p
            className="text-sm animate-pulse"
            style={{ color: '#ADB5BD' }}
          >
            Chargement...
          </p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      {/* Header */}
      <div className="mb-6">
        <h2
          className="text-2xl font-semibold"
          style={{ color: '#2C3E50' }}
        >
          Feedbacks reçus
        </h2>

        <p
          className="text-sm mt-1"
          style={{ color: '#6C757D' }}
        >
          {feedbacks.length} message
          {feedbacks.length !== 1 ? 's' : ''} au total
        </p>
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap gap-2 mb-6">
        {[
          {
            key: 'TOUS',
            label: `Tous (${counts.TOUS})`,
          },
          {
            key: 'NOUVEAU',
            label: `Nouveaux (${counts.NOUVEAU})`,
          },
          {
            key: 'EN_COURS',
            label: `En cours (${counts.EN_COURS})`,
          },
          {
            key: 'RESOLU',
            label: `Résolus (${counts.RESOLU})`,
          },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className="px-3 py-1.5 text-sm rounded-full font-medium transition-colors whitespace-nowrap"
            style={{
              backgroundColor:
                filter === tab.key
                  ? '#2C3E50'
                  : '#F8F9FA',
              color:
                filter === tab.key
                  ? '#FFFFFF'
                  : '#6C757D',
              border: `1px solid ${
                filter === tab.key
                  ? '#2C3E50'
                  : '#DEE2E6'
              }`,
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Liste */}
      {filtered.length === 0 ? (
        <div
          className="rounded-md p-8 sm:p-12 text-center"
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E9ECEF',
          }}
        >
          <p
            className="text-sm"
            style={{ color: '#ADB5BD' }}
          >
            Aucun feedback dans cette catégorie.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(fb => {
            const cat =
              CATEGORY_LABELS[fb.category] ||
              CATEGORY_LABELS.AUTRE;

            const statusOpt =
              STATUS_OPTIONS.find(
                s => s.value === fb.status
              ) || STATUS_OPTIONS[0];

            return (
              <div
                key={fb.id}
                className="rounded-md p-4 sm:p-5"
                style={{
                  backgroundColor: '#FFFFFF',
                  border: `1px solid ${
                    fb.status === 'NOUVEAU'
                      ? '#F1948A'
                      : '#E9ECEF'
                  }`,
                  boxShadow:
                    '0 1px 4px rgba(0,0,0,0.05)',
                }}
              >
                {/* Header carte */}
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3 mb-3">

                  {/* Identité */}
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span
                        className="text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap"
                        style={{
                          backgroundColor: cat.bg,
                          color: cat.color,
                        }}
                      >
                        {cat.label}
                      </span>

                      <span
                        className="text-sm font-medium break-words"
                        style={{ color: '#2C3E50' }}
                      >
                        {fb.user.firstName}{' '}
                        {fb.user.lastName}
                      </span>
                    </div>

                    <p
                      className="text-xs break-words"
                      style={{ color: '#ADB5BD' }}
                    >
                      {fb.organization.name}
                    </p>

                    {/* Date mobile/tablette */}
                    <p
                      className="lg:hidden text-xs mt-1"
                      style={{ color: '#ADB5BD' }}
                    >
                      {formatDate(fb.createdAt)}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap items-center justify-between lg:justify-end gap-2 sm:gap-3">

                    {/* Date desktop */}
                    <span
                      className="hidden lg:inline text-xs whitespace-nowrap"
                      style={{ color: '#ADB5BD' }}
                    >
                      {formatDate(fb.createdAt)}
                    </span>

                    <select
                      value={fb.status}
                      onChange={e =>
                        handleStatusChange(
                          fb.id,
                          e.target.value
                        )
                      }
                      className="text-xs px-2 py-1.5 rounded focus:outline-none whitespace-nowrap"
                      style={{
                        border: `1px solid ${statusOpt.color}`,
                        color: statusOpt.color,
                        backgroundColor: '#FFFFFF',
                      }}
                    >
                      {STATUS_OPTIONS.map(s => (
                        <option
                          key={s.value}
                          value={s.value}
                        >
                          {s.label}
                        </option>
                      ))}
                    </select>

                    <button
                      onClick={() =>
                        handleDelete(fb.id)
                      }
                      className="p-2 rounded transition-colors flex-shrink-0"
                      style={{
                        color: '#ADB5BD',
                        border: '1px solid #E9ECEF',
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.color =
                          '#C0392B';
                        e.currentTarget.style.backgroundColor =
                          '#FDEDEC';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.color =
                          '#ADB5BD';
                        e.currentTarget.style.backgroundColor =
                          'transparent';
                      }}
                      title="Supprimer le feedback"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Message */}
                <p
                  className="text-sm whitespace-pre-line break-words"
                  style={{
                    color: '#495057',
                    lineHeight: 1.6,
                  }}
                >
                  {fb.message}
                </p>

                {/* Email */}
                <p
                  className="text-xs mt-2 break-all"
                  style={{ color: '#ADB5BD' }}
                >
                  {fb.user.email}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </AppLayout>
  );
}