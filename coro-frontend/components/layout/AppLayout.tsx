'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';
import { useState, useEffect, useRef } from 'react';
import api from '@/lib/api';

const navItems = [
  { label: 'Dashboard',    path: '/dashboard' },
  { label: 'Projets',      path: '/projects' },
  { label: 'Clients',      path: '/clients' },
  { label: 'Bâtiments',    path: '/buildings' },
  { label: 'Conformité',   path: '/buildings/compliance' },
  { label: 'Activités',    path: '/activities/portfolio' },
  { label: 'Bibliothèque', path: '/library' },
  { label: 'Paramètres',   path: '/settings' },
];

const adminNavItems = [
  { label: 'Équipe', path: '/settings/users' },
  { label: 'Rendement', path: '/dashboard/rendement' },
  { label: 'Templates de tâches', path: '/settings/task-templates' },
  { label: 'Nous écrire', path: '/settings/feedback' },
];

const superAdminNavItems = [
  { label: 'Organisations', path: '/admin/organizations' },
  { label: 'Tous les projets', path: '/admin/projects' },
  { label: 'Procédures', path: '/admin/procedures' },
  { label: 'Templates de tâches', path: '/admin/task-templates' },
  { label: 'Feedbacks', path: '/admin/feedback' },
  { label: 'Changelog', path: '/admin/changelog' },
];

interface UpcomingUpdate {
  id: string;
  name: string;
  documentType: string;
  clientName: string;
  buildingName: string;
  lastUpdated: string;
  monthsAgo: number;
  level: 'URGENT' | 'AVERTISSEMENT';
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuthStore();

  const [updates, setUpdates] = useState<UpcomingUpdate[]>([]);
  const [showNotif, setShowNotif] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const [pendingApprovals, setPendingApprovals] = useState<any[]>([]);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const [updatesRes, approvalsRes] = await Promise.all([
          api.get('/projects/upcoming-updates'),
          api.get('/projects/pending-approval'),
        ]);
        setUpdates(updatesRes.data || []);
        setPendingApprovals(approvalsRes.data || []);
      } catch {
        setUpdates([]);
        setPendingApprovals([]);
      }
    };
    fetchNotifications();
  }, []);

  // Fermer le panneau si clic en dehors
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotif(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const urgentCount = updates.filter(u => u.level === 'URGENT').length;
  const totalCount = updates.length;

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F8F9FA' }}>

      {/* Topbar */}
      <div className="flex items-center justify-between px-6 py-4 sticky top-0 z-40"
        style={{
          backgroundColor: '#FFFFFF',
          borderBottom: '1px solid #DEE2E6',
          boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        }}>
        <h1
          className="text-2xl font-bold tracking-tight cursor-pointer"
          style={{ color: '#2C3E50' }}
          onClick={() => router.push('/dashboard')}
        >
          CO<span style={{ color: '#C0392B' }}>RO</span>
        </h1>
        <div className="flex items-center gap-4">

          {/* Cloche notifications */}
          <div ref={notifRef} className="relative">
            <button
              onClick={() => setShowNotif(!showNotif)}
              className="relative p-2 rounded transition-colors"
              style={{ color: '#6C757D' }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F8F9FA'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
              title="Mises à jour à venir"
            >
              <span style={{ fontSize: '18px' }}>🔔</span>
              {(totalCount + pendingApprovals.length) > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 text-white text-xs font-bold rounded-full flex items-center justify-center"
                  style={{ backgroundColor: pendingApprovals.length > 0 ? '#C0392B' : urgentCount > 0 ? '#C0392B' : '#F39C12', fontSize: '10px' }}>
                  {totalCount + pendingApprovals.length}
                </span>
              )}
            </button>

            {/* Panneau notifications */}
            {showNotif && (
              <div className="absolute right-0 top-full mt-2 w-96 rounded-md shadow-lg z-50"
                style={{ backgroundColor: '#FFFFFF', border: '1px solid #E9ECEF', boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }}>
                <div className="px-4 py-3" style={{ borderBottom: '1px solid #E9ECEF' }}>
                  <p className="font-semibold text-sm" style={{ color: '#2C3E50' }}>Mises à jour à venir</p>
                  <p className="text-xs mt-0.5" style={{ color: '#ADB5BD' }}>
                    Documents approchant ou dépassant 12 mois
                  </p>
                </div>

                <div className="max-h-80 overflow-y-auto">
                  {/* Approbations en attente */}
                  {pendingApprovals.length > 0 && (
                    <div>
                      <p className="px-4 py-2 text-xs font-semibold uppercase tracking-wide"
                        style={{ backgroundColor: '#FDEDEC', color: '#C0392B' }}>
                        ✓ Approbations en attente ({pendingApprovals.length})
                      </p>
                      {pendingApprovals.map(p => (
                        <div key={p.id}
                          onClick={() => { router.push(`/projects/${p.id}`); setShowNotif(false); }}
                          className="px-4 py-3 cursor-pointer transition-colors"
                          style={{ borderBottom: '1px solid #F8F9FA' }}
                          onMouseEnter={e => e.currentTarget.style.backgroundColor = '#FDEDEC'}
                          onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-0.5">
                                <span className="text-xs font-bold px-1.5 py-0.5 rounded text-white"
                                  style={{ backgroundColor: '#C0392B' }}>
                                  {p.documentType}
                                </span>
                                <span className="text-xs font-medium truncate" style={{ color: '#2C3E50' }}>
                                  {p.name}
                                </span>
                              </div>
                              <p className="text-xs" style={{ color: '#6C757D' }}>
                                Soumis par {p.submittedBy?.firstName} {p.submittedBy?.lastName}
                              </p>
                            </div>
                            <span className="text-xs font-medium flex-shrink-0"
                              style={{ color: '#C0392B' }}>
                              À réviser →
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {updates.length === 0 && pendingApprovals.length === 0 ? (
                    <div className="px-4 py-6 text-center">
                      <p className="text-sm" style={{ color: '#ADB5BD' }}>✓ Tous les documents sont à jour</p>
                    </div>
                  ) : (
                    updates.map(u => (
                      <div key={u.id}
                        onClick={() => { router.push(`/projects/${u.id}`); setShowNotif(false); }}
                        className="px-4 py-3 cursor-pointer transition-colors"
                        style={{ borderBottom: '1px solid #F8F9FA' }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F8F9FA'}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="text-xs font-bold px-1.5 py-0.5 rounded"
                                style={{
                                  backgroundColor: u.level === 'URGENT' ? '#FDEDEC' : '#FEF9E7',
                                  color: u.level === 'URGENT' ? '#C0392B' : '#F39C12',
                                }}>
                                {u.documentType}
                              </span>
                              <span className="text-xs font-medium truncate" style={{ color: '#2C3E50' }}>
                                {u.name}
                              </span>
                            </div>
                            <p className="text-xs truncate" style={{ color: '#6C757D' }}>
                              {u.clientName} — {u.buildingName}
                            </p>
                          </div>
                          <div className="flex-shrink-0 text-right">
                            <p className="text-xs font-bold"
                              style={{ color: u.level === 'URGENT' ? '#C0392B' : '#F39C12' }}>
                              {u.monthsAgo} mois
                            </p>
                            <p className="text-xs" style={{ color: '#ADB5BD' }}>
                              {u.level === 'URGENT' ? '⚠ À renouveler' : '○ Bientôt'}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {updates.length > 0 && (
                  <div className="px-4 py-2.5" style={{ borderTop: '1px solid #E9ECEF' }}>
                    <button
                      onClick={() => { router.push('/dashboard'); setShowNotif(false); }}
                      className="text-xs font-medium w-full text-center transition-colors"
                      style={{ color: '#C0392B' }}
                    >
                      Voir toutes les mises à jour →
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {user && (
            <div className="relative">
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="flex items-center gap-2 px-3 py-1.5 rounded transition-colors"
                style={{ border: '1px solid transparent' }}
                onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#F8F9FA'; e.currentTarget.style.borderColor = '#DEE2E6'; }}
                onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.borderColor = 'transparent'; }}>
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold"
                  style={{ backgroundColor: '#C0392B' }}>
                  {user.firstName?.[0]}{user.lastName?.[0]}
                </div>
                <span className="text-sm font-medium" style={{ color: '#495057' }}>
                  {user.firstName} {user.lastName}
                </span>
                <span style={{ color: '#ADB5BD', fontSize: '10px' }}>▼</span>
              </button>

              {showProfileMenu && (
                <div className="absolute right-0 top-full mt-2 w-48 rounded-md shadow-lg z-50"
                  style={{ backgroundColor: '#FFFFFF', border: '1px solid #E9ECEF', boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }}>
                  <div className="px-4 py-3" style={{ borderBottom: '1px solid #E9ECEF' }}>
                    <p className="text-xs font-semibold" style={{ color: '#2C3E50' }}>{user.firstName} {user.lastName}</p>
                    <p className="text-xs mt-0.5" style={{ color: '#ADB5BD' }}>{user.email}</p>
                  </div>
                  <div className="py-1">
                    <button onClick={() => { router.push('/profile'); setShowProfileMenu(false); }}
                      className="w-full text-left px-4 py-2 text-sm transition-colors"
                      style={{ color: '#495057' }}
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F8F9FA'}
                      onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                      👤 Mon profil
                    </button>
                    {(user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') && (
                      <button onClick={() => { router.push('/dashboard/rendement'); setShowProfileMenu(false); }}
                        className="w-full text-left px-4 py-2 text-sm transition-colors"
                        style={{ color: '#495057' }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F8F9FA'}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                        📊 Rendement équipe
                      </button>
                    )}
                    <button onClick={() => { router.push('/profile/rendement'); setShowProfileMenu(false); }}
                      className="w-full text-left px-4 py-2 text-sm transition-colors"
                      style={{ color: '#495057' }}
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F8F9FA'}
                      onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                      ⏱ Mon rendement
                    </button>
                    <div style={{ borderTop: '1px solid #E9ECEF', margin: '4px 0' }} />
                    <button onClick={() => { handleLogout(); setShowProfileMenu(false); }}
                      className="w-full text-left px-4 py-2 text-sm transition-colors"
                      style={{ color: '#C0392B' }}
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = '#FDEDEC'}
                      onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                      Déconnexion
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <div className="w-56 min-h-screen p-4 sticky top-[57px] self-start"
          style={{
            backgroundColor: '#FFFFFF',
            borderRight: '1px solid #DEE2E6',
          }}>
          <nav className="space-y-0.5 mt-2">
            {navItems.map(item => {
              const isActive = pathname === item.path ||
                (item.path !== '/dashboard' && pathname.startsWith(item.path));
              return (
                <button
                  key={item.label}
                  onClick={() => router.push(item.path)}
                  className="w-full text-left px-4 py-2.5 rounded text-sm transition-colors font-medium"
                  style={{
                    backgroundColor: isActive ? '#FDEDEC' : 'transparent',
                    color: isActive ? '#C0392B' : '#495057',
                    border: isActive ? '1px solid #F1948A' : '1px solid transparent',
                  }}
                  onMouseEnter={e => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = '#F8F9FA';
                      e.currentTarget.style.color = '#2C3E50';
                    }
                  }}
                  onMouseLeave={e => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.color = '#495057';
                    }
                  }}
                >
                  {item.label}
                </button>
              );
            })}

            {(user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN') && (
              <>
                <div className="my-3 mx-2" style={{ borderTop: '1px solid #E9ECEF' }} />
                <p className="px-4 text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: '#ADB5BD' }}>
                  Administration
                </p>
                {adminNavItems.map(item => {
                  const isActive = pathname.startsWith(item.path);
                  return (
                    <button
                      key={item.label}
                      onClick={() => router.push(item.path)}
                      className="w-full text-left px-4 py-2.5 rounded text-sm transition-colors font-medium"
                      style={{
                        backgroundColor: isActive ? '#FDEDEC' : 'transparent',
                        color: isActive ? '#C0392B' : '#495057',
                        border: isActive ? '1px solid #F1948A' : '1px solid transparent',
                      }}
                      onMouseEnter={e => {
                        if (!isActive) {
                          e.currentTarget.style.backgroundColor = '#F8F9FA';
                          e.currentTarget.style.color = '#2C3E50';
                        }
                      }}
                      onMouseLeave={e => {
                        if (!isActive) {
                          e.currentTarget.style.backgroundColor = 'transparent';
                          e.currentTarget.style.color = '#495057';
                        }
                      }}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </>
            )}

            {user?.role === 'SUPER_ADMIN' && (
              <>
                <div className="my-3 mx-2" style={{ borderTop: '1px solid #E9ECEF' }} />
                <p className="px-4 text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: '#ADB5BD' }}>
                  Super-admin
                </p>
                {superAdminNavItems.map(item => {
                  const isActive = pathname.startsWith(item.path);
                  return (
                    <button
                      key={item.label}
                      onClick={() => router.push(item.path)}
                      className="w-full text-left px-4 py-2.5 rounded text-sm transition-colors font-medium"
                      style={{
                        backgroundColor: isActive ? '#FDEDEC' : 'transparent',
                        color: isActive ? '#C0392B' : '#495057',
                        border: isActive ? '1px solid #F1948A' : '1px solid transparent',
                      }}
                      onMouseEnter={e => {
                        if (!isActive) {
                          e.currentTarget.style.backgroundColor = '#F8F9FA';
                          e.currentTarget.style.color = '#2C3E50';
                        }
                      }}
                      onMouseLeave={e => {
                        if (!isActive) {
                          e.currentTarget.style.backgroundColor = 'transparent';
                          e.currentTarget.style.color = '#495057';
                        }
                      }}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </>
            )}
          </nav>
        </div>

        {/* Contenu */}
        <div className="flex-1 p-8 min-w-0">
          {children}
        </div>
      </div>
    </div>
  );
}
