'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';
import api from '@/lib/api';
import AppLayout from '@/components/layout/AppLayout';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  projectId?: string;
  isRead: boolean;
  createdAt: string;
}

const TYPE_CONFIG: Record<string, { icon: string; color: string; bg: string }> = {
  APPROBATION_REQUISE: { icon: '📋', color: '#F39C12', bg: '#FEF9E7' },
  APPROUVE:            { icon: '✅', color: '#27AE60', bg: '#EAFAF1' },
  RETOUR_REVISION:     { icon: '🔄', color: '#C0392B', bg: '#FDEDEC' },
  DELAI_URGENT:        { icon: '⚡', color: '#E67E22', bg: '#FEF9E7' },
  DELAI_DEPASSE:       { icon: '🔴', color: '#C0392B', bg: '#FDEDEC' },
};

export default function NotificationsPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isAuthenticated) {
      fetchData();
    }
  }, [isAuthenticated]);

  const fetchData = async () => {
    try {
      const res = await api.get('/notifications');
      setNotifications(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      await api.put(`/notifications/${id}/read`);

      setNotifications(prev =>
        prev.map(n =>
          n.id === id
            ? { ...n, isRead: true }
            : n
        )
      );
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await api.put('/notifications/read-all');

      setNotifications(prev =>
        prev.map(n => ({
          ...n,
          isRead: true,
        }))
      );
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/notifications/${id}`);

      setNotifications(prev =>
        prev.filter(n => n.id !== id)
      );
    } catch (err) {
      console.error(err);
    }
  };

  const handleClick = async (notif: Notification) => {
    if (!notif.isRead) {
      await handleMarkAsRead(notif.id);
    }

    if (notif.projectId) {
      router.push(`/projects/${notif.projectId}`);
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <AppLayout>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h2
            className="text-2xl font-semibold"
            style={{ color: '#2C3E50' }}
          >
            Notifications
          </h2>

          <p
            className="text-sm mt-1"
            style={{ color: '#6C757D' }}
          >
            {unreadCount > 0
              ? `${unreadCount} non lue${unreadCount > 1 ? 's' : ''}`
              : 'Tout est lu'}
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllAsRead}
            className="w-full sm:w-auto text-sm font-medium px-4 py-2 rounded transition-colors"
            style={{
              border: '1px solid #DEE2E6',
              color: '#6C757D',
            }}
            onMouseEnter={e =>
              (e.currentTarget.style.backgroundColor = '#F8F9FA')
            }
            onMouseLeave={e =>
              (e.currentTarget.style.backgroundColor = 'transparent')
            }
          >
            Tout marquer comme lu
          </button>
        )}
      </div>

      {/* Chargement */}
      {loading ? (
        <p
          className="text-sm text-center py-12 animate-pulse"
          style={{ color: '#ADB5BD' }}
        >
          Chargement...
        </p>
      ) : notifications.length === 0 ? (

        /* Vide */
        <div
          className="rounded-md p-8 sm:p-12 text-center"
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E9ECEF',
          }}
        >
          <p className="text-4xl mb-4">
            🔔
          </p>

          <p
            className="font-semibold mb-1"
            style={{ color: '#2C3E50' }}
          >
            Aucune notification
          </p>

          <p
            className="text-sm"
            style={{ color: '#ADB5BD' }}
          >
            Vous êtes à jour !
          </p>
        </div>
      ) : (

        /* Liste */
        <div className="space-y-2">
          {notifications.map(notif => {
            const cfg =
              TYPE_CONFIG[notif.type] || {
                icon: '🔔',
                color: '#6C757D',
                bg: '#F8F9FA',
              };

            return (
              <div
                key={notif.id}
                className="rounded-md p-4 transition-all cursor-pointer"
                style={{
                  backgroundColor: notif.isRead
                    ? '#FFFFFF'
                    : cfg.bg,
                  border: `1px solid ${
                    notif.isRead
                      ? '#E9ECEF'
                      : cfg.color + '44'
                  }`,
                  opacity: notif.isRead ? 0.8 : 1,
                }}
                onClick={() => handleClick(notif)}
                onMouseEnter={e =>
                  (e.currentTarget.style.boxShadow =
                    '0 2px 8px rgba(0,0,0,0.08)')
                }
                onMouseLeave={e =>
                  (e.currentTarget.style.boxShadow = 'none')
                }
              >
                <div className="flex items-start gap-3 sm:gap-4">

                  {/* Icône */}
                  <span
                    className="flex-shrink-0"
                    style={{ fontSize: '20px' }}
                  >
                    {cfg.icon}
                  </span>

                  {/* Contenu */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2 mb-1">
                      <p
                        className="text-sm font-semibold break-words"
                        style={{ color: '#2C3E50' }}
                      >
                        {notif.title}
                      </p>

                      {!notif.isRead && (
                        <span
                          className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5"
                          style={{
                            backgroundColor: cfg.color,
                          }}
                        />
                      )}
                    </div>

                    <p
                      className="text-sm break-words"
                      style={{
                        color: '#6C757D',
                        lineHeight: 1.6,
                      }}
                    >
                      {notif.message}
                    </p>

                    <p
                      className="text-xs mt-1.5"
                      style={{ color: '#ADB5BD' }}
                    >
                      {new Date(
                        notif.createdAt
                      ).toLocaleDateString('fr-CA', {
                        day: 'numeric',
                        month: 'long',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>

                  {/* Actions desktop */}
                  <div className="hidden sm:flex items-center gap-2 flex-shrink-0">
                    {notif.projectId && (
                      <span
                        className="text-xs font-medium whitespace-nowrap"
                        style={{ color: cfg.color }}
                      >
                        Voir →
                      </span>
                    )}

                    <button
                      onClick={e => {
                        e.stopPropagation();
                        handleDelete(notif.id);
                      }}
                      className="text-xs p-1.5 rounded transition-colors"
                      style={{ color: '#ADB5BD' }}
                      onMouseEnter={e => {
                        e.currentTarget.style.color = '#C0392B';
                        e.currentTarget.style.backgroundColor = '#FDEDEC';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.color = '#ADB5BD';
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                      title="Supprimer la notification"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {/* Actions mobile */}
                <div
                  className="sm:hidden flex items-center justify-end gap-3 mt-3 pt-3"
                  style={{
                    borderTop: '1px solid rgba(0,0,0,0.05)',
                  }}
                >
                  {notif.projectId && (
                    <span
                      className="text-xs font-medium"
                      style={{ color: cfg.color }}
                    >
                      Voir le projet →
                    </span>
                  )}

                  <button
                    onClick={e => {
                      e.stopPropagation();
                      handleDelete(notif.id);
                    }}
                    className="text-xs px-2.5 py-1.5 rounded transition-colors"
                    style={{
                      color: '#C0392B',
                      border: '1px solid #F1948A',
                    }}
                  >
                    Supprimer
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </AppLayout>
  );
}