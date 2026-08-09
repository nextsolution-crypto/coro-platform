'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';
import { useState, useEffect, useRef } from 'react';
import api from '@/lib/api';

// ── Navigation par groupes ──────────────────────────────────
const NAV_GROUPS = [
  {
    label: null,
    items: [
      { label: 'Tableau de bord', path: '/dashboard', icon: '🏠' },
    ],
  },
  {
    label: 'Mon travail',
    items: [
      { label: 'Projets',    path: '/projects',            icon: '📁' },
      { label: 'Activités', path: '/activities/portfolio', icon: '📅' },
      { label: 'Timelog',   path: '/timelog',              icon: '⏱' },
    ],
  },
  {
    label: 'Portefeuille',
    items: [
      { label: 'Clients',    path: '/clients',              icon: '👥' },
      { label: 'Bâtiments', path: '/buildings',             icon: '🏗' },
      { label: 'Conformité', path: '/buildings/compliance', icon: '✅' },
    ],
  },
  {
    label: 'Ressources',
    items: [
      { label: 'Bibliothèque', path: '/library',   icon: '📚' },
      { label: 'Paramètres',   path: '/settings',  icon: '⚙️' },
    ],
  },
];

const ADMIN_GROUP = {
  label: 'Administration',
  items: [
    { label: 'Équipe',               path: '/settings/users',               icon: '👤' },
    { label: 'Portefeuille mandats', path: '/admin/mandates',               icon: '📁' },
    { label: 'Capacity Planning',    path: '/admin/capacity',               icon: '⚡' },
    { label: 'Rendement équipe',      path: '/dashboard/rendement',          icon: '📊' },
    { label: 'Modèles de tâches',    path: '/settings/task-templates',      icon: '✅' },
    { label: 'Catégories timelog',   path: '/settings/timelog-categories',  icon: '🏷' },
    { label: 'Nous écrire',          path: '/settings/feedback',            icon: '💬' },
  ],
};

const SUPER_ADMIN_GROUP = {
  label: 'Super Admin',
  items: [
    { label: 'Organisations',   path: '/admin/organizations',  icon: '🏢' },
    { label: 'Tous les projets', path: '/admin/projects',      icon: '📁' },
    { label: 'Procédures',      path: '/admin/procedures',     icon: '📋' },
    { label: 'Tâches globales', path: '/admin/task-templates', icon: '✅' },
    { label: 'Feedbacks',       path: '/admin/feedback',       icon: '💬' },
    { label: 'Changelog',       path: '/admin/changelog',      icon: '📝' },
  ],
};

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

interface SearchResult {
  type: 'project' | 'client' | 'building';
  id: string;
  name: string;
  subtitle?: string;
  path: string;
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuthStore();

  const [updates, setUpdates]               = useState<UpcomingUpdate[]>([]);
  const [showNotif, setShowNotif]           = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [pendingApprovals, setPendingApprovals] = useState<any[]>([]);

  // ── Recherche globale ──
  const [searchQuery, setSearchQuery]       = useState('');
  const [searchResults, setSearchResults]   = useState<SearchResult[]>([]);
  const [searchLoading, setSearchLoading]   = useState(false);
  const [showSearch, setShowSearch]         = useState(false);
  const searchRef  = useRef<HTMLDivElement>(null);
  const notifRef   = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [notifUnreadCount, setNotifUnreadCount] = useState(0);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const [updatesRes, approvalsRes, unreadRes] = await Promise.all([
          api.get('/projects/upcoming-updates'),
          api.get('/projects/pending-approval'),
          api.get('/notifications/unread-count').catch(() => ({ data: { count: 0 } })),
        ]);
        setUpdates(updatesRes.data || []);
        setPendingApprovals(approvalsRes.data || []);
        setNotifUnreadCount(unreadRes.data?.count || 0);
      } catch {
        setUpdates([]);
        setPendingApprovals([]);
      }
    };
    fetchNotifications();
    // Rafraîchir toutes les 30 secondes
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  // ── Fermer panneaux si clic extérieur ──
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setShowNotif(false);
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setShowProfileMenu(false);
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setShowSearch(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // ── Recherche globale avec debounce ──
  useEffect(() => {
    if (!searchQuery.trim()) { setSearchResults([]); setShowSearch(false); return; }
    const timer = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const res = await api.get(`/projects/search?q=${encodeURIComponent(searchQuery)}`);
        const projects  = (res.data?.projects  || []).slice(0, 4);
        const clients   = (res.data?.clients   || []).slice(0, 3);
        const buildings = (res.data?.buildings || []).slice(0, 3);

        const results: SearchResult[] = [
          ...projects.map((p: any) => ({
            type: 'project' as const,
            id: p.id,
            name: p.name,
            subtitle: `${p.documentType} · ${p.client?.name || ''}`,
            path: `/projects/${p.id}`,
          })),
          ...clients.map((c: any) => ({
            type: 'client' as const,
            id: c.id,
            name: c.name,
            subtitle: c.city || '',
            path: `/clients/${c.id}`,
          })),
          ...buildings.map((b: any) => ({
            type: 'building' as const,
            id: b.id,
            name: b.name,
            subtitle: b.address || '',
            path: `/buildings/${b.id}`,
          })),
        ];

        setSearchResults(results);
        setShowSearch(results.length > 0);
      } catch { setSearchResults([]); }
      finally { setSearchLoading(false); }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSearchSelect = (result: SearchResult) => {
    router.push(result.path);
    setSearchQuery('');
    setShowSearch(false);
  };

  const handleLogout = () => { logout(); router.push('/login'); };

  const urgentCount = updates.filter(u => u.level === 'URGENT').length;
  const totalCount  = updates.length + pendingApprovals.length + notifUnreadCount;

  const typeIcon: Record<string, string> = {
    project:  '📁',
    client:   '👥',
    building: '🏗',
  };
  const typeLabel: Record<string, string> = {
    project:  'Projet',
    client:   'Client',
    building: 'Bâtiment',
  };

  const isActive = (path: string) =>
    path === '/dashboard'
      ? pathname === path
      : pathname === path || pathname.startsWith(path + '/');

  const NavItem = ({ item }: { item: { label: string; path: string; icon: string } }) => {
    const active = isActive(item.path);
    return (
      <button
        onClick={() => router.push(item.path)}
        className="w-full text-left px-3 py-2 rounded text-sm transition-colors flex items-center gap-2.5"
        style={{
          backgroundColor: active ? '#FDEDEC' : 'transparent',
          color: active ? '#C0392B' : '#495057',
          border: active ? '1px solid #F1948A' : '1px solid transparent',
          fontWeight: active ? '600' : '500',
        }}
        onMouseEnter={e => { if (!active) { e.currentTarget.style.backgroundColor = '#F8F9FA'; e.currentTarget.style.color = '#2C3E50'; } }}
        onMouseLeave={e => { if (!active) { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#495057'; } }}
      >
        <span style={{ fontSize: '14px', flexShrink: 0 }}>{item.icon}</span>
        <span className="truncate">{item.label}</span>
      </button>
    );
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F8F9FA' }}>

      {/* ── Topbar ── */}
      <div className="flex items-center justify-between px-6 py-3 sticky top-0 z-40"
        style={{ backgroundColor: '#FFFFFF', borderBottom: '1px solid #DEE2E6', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
        <h1
          className="text-2xl font-bold tracking-tight cursor-pointer flex-shrink-0"
          style={{ color: '#2C3E50' }}
          onClick={() => router.push('/dashboard')}
        >
          CO<span style={{ color: '#C0392B' }}>RO</span>
        </h1>

        <div className="flex items-center gap-3">
          {/* ── Cloche notifications ── */}
          <div ref={notifRef} className="relative">
            <button
              onClick={() => setShowNotif(!showNotif)}
              className="relative p-2 rounded transition-colors"
              style={{ color: '#6C757D' }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F8F9FA'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
              title="Notifications"
            >
              <span style={{ fontSize: '18px' }}>🔔</span>
              {totalCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 text-white text-xs font-bold rounded-full flex items-center justify-center"
                  style={{ backgroundColor: pendingApprovals.length > 0 || urgentCount > 0 ? '#C0392B' : '#F39C12', fontSize: '10px' }}>
                  {totalCount}
                </span>
              )}
            </button>

            {showNotif && (
              <div className="absolute right-0 top-full mt-2 w-96 rounded-md shadow-lg z-50"
                style={{ backgroundColor: '#FFFFFF', border: '1px solid #E9ECEF', boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }}>
                <div className="px-4 py-3" style={{ borderBottom: '1px solid #E9ECEF' }}>
                  <p className="font-semibold text-sm" style={{ color: '#2C3E50' }}>Notifications</p>
                  <p className="text-xs mt-0.5" style={{ color: '#ADB5BD' }}>Approbations et documents à renouveler</p>
                </div>
                <div className="max-h-80 overflow-y-auto">
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
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-0.5">
                                <span className="text-xs font-bold px-1.5 py-0.5 rounded text-white" style={{ backgroundColor: '#C0392B' }}>{p.documentType}</span>
                                <span className="text-xs font-medium truncate" style={{ color: '#2C3E50' }}>{p.name}</span>
                              </div>
                              <p className="text-xs" style={{ color: '#6C757D' }}>Soumis par {p.submittedBy?.firstName} {p.submittedBy?.lastName}</p>
                            </div>
                            <span className="text-xs font-medium flex-shrink-0" style={{ color: '#C0392B' }}>À réviser →</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {updates.length === 0 && pendingApprovals.length === 0 ? (
                    <div className="px-4 py-6 text-center">
                      <p className="text-sm" style={{ color: '#ADB5BD' }}>✓ Tout est à jour</p>
                    </div>
                  ) : updates.map(u => (
                    <div key={u.id}
                      onClick={() => { router.push(`/projects/${u.id}`); setShowNotif(false); }}
                      className="px-4 py-3 cursor-pointer transition-colors"
                      style={{ borderBottom: '1px solid #F8F9FA' }}
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F8F9FA'}
                      onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-xs font-bold px-1.5 py-0.5 rounded"
                              style={{ backgroundColor: u.level === 'URGENT' ? '#FDEDEC' : '#FEF9E7', color: u.level === 'URGENT' ? '#C0392B' : '#F39C12' }}>
                              {u.documentType}
                            </span>
                            <span className="text-xs font-medium truncate" style={{ color: '#2C3E50' }}>{u.name}</span>
                          </div>
                          <p className="text-xs truncate" style={{ color: '#6C757D' }}>{u.clientName} — {u.buildingName}</p>
                        </div>
                        <div className="flex-shrink-0 text-right">
                          <p className="text-xs font-bold" style={{ color: u.level === 'URGENT' ? '#C0392B' : '#F39C12' }}>{u.monthsAgo} mois</p>
                          <p className="text-xs" style={{ color: '#ADB5BD' }}>{u.level === 'URGENT' ? '⚠ À renouveler' : '○ Bientôt'}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="px-4 py-2.5 flex items-center justify-between" style={{ borderTop: '1px solid #E9ECEF' }}>
                  <button onClick={() => { router.push('/notifications'); setShowNotif(false); }}
                    className="text-xs font-medium" style={{ color: '#C0392B' }}>
                    Toutes les notifications →
                  </button>
                  <button onClick={() => { router.push('/dashboard'); setShowNotif(false); }}
                    className="text-xs" style={{ color: '#6C757D' }}>
                    Tableau de bord
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ── Menu profil ── */}
          {user && (
            <div ref={profileRef} className="relative">
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
                <span className="text-sm font-medium" style={{ color: '#495057' }}>{user.firstName} {user.lastName}</span>
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
                    {[
                      { label: '👤 Mon profil', path: '/profile' },
                      { label: '⏱ Mon rendement', path: '/profile/rendement' },
                      ...((user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') ? [{ label: '📊 Rendement équipe', path: '/dashboard/rendement' }] : []),
                    ].map(item => (
                      <button key={item.path}
                        onClick={() => { router.push(item.path); setShowProfileMenu(false); }}
                        className="w-full text-left px-4 py-2 text-sm transition-colors"
                        style={{ color: '#495057' }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F8F9FA'}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                        {item.label}
                      </button>
                    ))}
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
        {/* ── Sidebar ── */}
        <div className="w-56 min-h-screen p-3 sticky top-[57px] self-start overflow-y-auto"
          style={{ backgroundColor: '#FFFFFF', borderRight: '1px solid #DEE2E6', maxHeight: 'calc(100vh - 57px)' }}>

          {/* Recherche globale */}
          <div ref={searchRef} className="relative mb-3">
            <div className="relative">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs" style={{ color: '#ADB5BD' }}>🔍</span>
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onFocus={() => { if (searchResults.length > 0) setShowSearch(true); }}
                placeholder="Rechercher..."
                className="w-full pl-7 pr-3 py-2 text-xs rounded focus:outline-none"
                style={{
                  border: '1px solid #DEE2E6',
                  backgroundColor: '#F8F9FA',
                  color: '#2C3E50',
                }}
                onFocusCapture={e => e.target.style.borderColor = '#C0392B'}
                onBlurCapture={e => e.target.style.borderColor = '#DEE2E6'}
              />
              {searchLoading && (
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs animate-pulse" style={{ color: '#ADB5BD' }}>⏳</span>
              )}
            </div>

            {/* Résultats de recherche */}
            {showSearch && searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 rounded-md shadow-lg z-50"
                style={{ backgroundColor: '#FFFFFF', border: '1px solid #E9ECEF', boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }}>
                {searchResults.map(result => (
                  <div key={`${result.type}-${result.id}`}
                    onClick={() => handleSearchSelect(result)}
                    className="flex items-center gap-2 px-3 py-2.5 cursor-pointer transition-colors"
                    style={{ borderBottom: '1px solid #F8F9FA' }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F8F9FA'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                    <span style={{ fontSize: '13px', flexShrink: 0 }}>{typeIcon[result.type]}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate" style={{ color: '#2C3E50' }}>{result.name}</p>
                      {result.subtitle && (
                        <p className="text-xs truncate" style={{ color: '#ADB5BD' }}>{result.subtitle}</p>
                      )}
                    </div>
                    <span className="text-xs px-1.5 py-0.5 rounded flex-shrink-0"
                      style={{ backgroundColor: '#F8F9FA', color: '#ADB5BD' }}>
                      {typeLabel[result.type]}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Groupes de navigation */}
          <nav className="space-y-4">
            {NAV_GROUPS.map((group, gIdx) => (
              <div key={gIdx}>
                {group.label && (
                  <p className="px-3 text-xs font-semibold uppercase tracking-wide mb-1"
                    style={{ color: '#ADB5BD' }}>
                    {group.label}
                  </p>
                )}
                <div className="space-y-0.5">
                  {group.items.map(item => (
                    <NavItem key={item.path} item={item} />
                  ))}
                </div>
              </div>
            ))}

            {(user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN') && (
              <div>
                <div className="mx-1 mb-3" style={{ borderTop: '1px solid #E9ECEF' }} />
                <p className="px-3 text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: '#ADB5BD' }}>
                  {ADMIN_GROUP.label}
                </p>
                <div className="space-y-0.5">
                  {ADMIN_GROUP.items.map(item => <NavItem key={item.path} item={item} />)}
                </div>
              </div>
            )}

            {user?.role === 'SUPER_ADMIN' && (
              <div>
                <div className="mx-1 mb-3" style={{ borderTop: '1px solid #E9ECEF' }} />
                <p className="px-3 text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: '#ADB5BD' }}>
                  {SUPER_ADMIN_GROUP.label}
                </p>
                <div className="space-y-0.5">
                  {SUPER_ADMIN_GROUP.items.map(item => <NavItem key={item.path} item={item} />)}
                </div>
              </div>
            )}
          </nav>
        </div>

        {/* ── Contenu ── */}
        <div className="flex-1 p-8 min-w-0">
          {children}
        </div>
      </div>
    </div>
  );
}