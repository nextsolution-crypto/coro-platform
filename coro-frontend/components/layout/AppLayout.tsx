'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';
import { useState, useEffect, useRef, useSyncExternalStore } from 'react';
import api from '@/lib/api';
import { useToast } from '@/hooks/useToast';
import ToastContainer from '@/components/ui/ToastContainer';
import { useTheme } from '@/design-system/theme/ThemeProvider';
import { createPalette } from '@/design-system/glass-palette';
import { GlassNavIcon, GlassIcon } from '@/design-system/glass-icons';
import { LegacyIsland } from '@/design-system/LegacyIsland';
import { User, Timer, BarChart3 } from 'lucide-react';
import { usePlatformAuthority } from '@/hooks/usePlatformAuthority';
import { resolveActiveNavigationPath } from './active-navigation';
import {
  clampSidebarWidth,
  getGlassSidebarWidthServerSnapshot,
  getGlassSidebarWidthSnapshot,
  LEGACY_SIDEBAR_DEFAULT_WIDTH,
  setGlassSidebarWidthPreference,
  SIDEBAR_MAX_WIDTH,
  SIDEBAR_MIN_WIDTH,
  subscribeToGlassSidebarWidth,
} from './sidebar-width';
import {
  getScrollTopForVisibleItem,
  persistSidebarScrollPosition,
  readSidebarScrollPosition,
} from './sidebar-scroll';

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
      { label: 'Planification d’équipe', path: '/planning', icon: '🗓' },
    ],
  },
  {
    label: 'Portefeuille',
    items: [
      { label: 'Clients',    path: '/clients',              icon: '👥' },
      { label: 'Bâtiments', path: '/buildings',             icon: '🏗' },
      { label: 'Carte',     path: '/buildings/map',          icon: '🗺️' },
      { label: 'Conformité', path: '/buildings/compliance', icon: '✅' },
    ],
  },
  {
    label: 'Ressources',
    items: [
      { label: 'Bibliothèque', path: '/library',   icon: '📚' },
      { label: 'Manuel d’utilisation', path: '/manual', icon: '📖' },
      { label: 'Paramètres',   path: '/settings',  icon: '⚙️' },
    ],
  },
];

const ADMIN_GROUP = {
  label: 'Administration',
  items: [
    { label: 'Réservations',         path: '/bookings',                     icon: '📅' },
    { label: 'Équipe',               path: '/settings/users',               icon: '👤' },
    { label: 'Recommandations',      path: '/referrals',                    icon: '🎁' },
    { label: 'Portefeuille mandats', path: '/admin/mandates',               icon: '📁' },
    { label: 'Capacity Planning',    path: '/admin/capacity',               icon: '⚡' },
    { label: 'Rendement équipe',      path: '/dashboard/rendement',          icon: '📊' },
    { label: 'Modèles de tâches',    path: '/settings/task-templates',      icon: '✅' },
    { label: 'Types d’activités',     path: '/settings/activity-types',      icon: '◆' },
    { label: 'Catégories timelog',   path: '/settings/timelog-categories',  icon: '🏷' },
    { label: 'Nous écrire',          path: '/settings/feedback',            icon: '💬' },
  ],
};

const SUPER_ADMIN_PLATFORM_GROUP = {
  label: 'Super Admin',
  items: [
    { label: 'Control Center', path: '/admin/control-center', icon: '◉' },
    { label: 'Metering', path: '/admin/metering', icon: '∑' },
    { label: 'CORO AI · Assistant Web', path: '/admin/web-ai', icon: 'AI' },
  ],
};

const SUPER_ADMIN_COMMERCIAL_GROUP = {
  label: 'Commercial',
  items: [
    { label: 'Tableau commercial', path: '/admin/commercial', icon: '◉' },
    { label: 'Préparer une offre', path: '/admin/commercial/journey', icon: '∆' },
    { label: 'Dossiers commerciaux', path: '/admin/commercial/prospects', icon: '○' },
    { label: 'Contrats', path: '/admin/commercial/contracts', icon: '▧' },
  ],
};

const SUPER_ADMIN_COMMERCIAL_ADMIN_GROUP = {
  label: 'Administration commerciale',
  items: [
    { label: 'Organisations',    path: '/admin/organizations', icon: 'ðŸ¢' },
    { label: 'Catalogue et tarifs', path: '/admin/product-catalog', icon: '◫' },
    { label: 'Contenus et clauses', path: '/admin/commercial/content', icon: '▤' },
    { label: 'Émetteur légal', path: '/admin/commercial/legal-issuer', icon: '§' },
  ],
};

const SUPER_ADMIN_COMMERCIAL_ADVANCED_GROUP = {
  label: 'Outils avancés',
  items: [
    { label: 'Simulateur avancé', path: '/admin/commercial/simulator', icon: '∴' },
    { label: 'Création technique Proposal', path: '/admin/commercial/proposals/new', icon: '◇' },
    { label: 'Entitlements', path: '/admin/commercial/entitlements', icon: '✓' },
    { label: 'Réconciliation', path: '/admin/commercial/reconciliation', icon: '⇄' },
    { label: 'Configuration tarifaire', path: '/admin/commercial/configuration', icon: '⚙' },
    { label: 'Hypothèses de coûts', path: '/admin/commercial/assumptions/cost', icon: '¤' },
    { label: 'Hypothèses de valeur', path: '/admin/commercial/assumptions/value', icon: '≈' },
    { label: 'Clauses commerciales', path: '/admin/commercial/clauses', icon: '¶' },
    { label: 'Propositions', path: '/admin/commercial/proposals', icon: '◇' },
  ],
};

const SUPER_ADMIN_OTHER_GROUP = {
  label: 'Plateforme',
  items: [
    {
      label: 'Permissions plateforme',
      path: '/admin/platform-permission-grants',
      icon: '⚿',
    },
    { label: 'Rapports REX', path: '/admin/rex-reports', icon: '📄' },
    { label: 'Recommandations', path: '/admin/referrals',     icon: '🎁' },
    { label: 'Carte globale',    path: '/admin/map',           icon: 'ðŸŒ' },
    { label: 'Health Score',    path: '/admin/health',         icon: '🏥' },
    { label: 'Tous les projets', path: '/admin/projects',      icon: '📁' },
    { label: 'Procédures',      path: '/admin/procedures',     icon: '📋' },
    { label: 'Tâches globales', path: '/admin/task-templates', icon: '✅' },
    { label: 'Feedbacks',       path: '/admin/feedback',       icon: '💬' },
    { label: 'Changelog',       path: '/admin/changelog',      icon: '📝' },
    { label: 'Blogue',          path: '/blog',                 icon: '✍️' },
  ],
};

const NAVIGATION_ALIASES = [
  { path: '/projects', matchPaths: ['/editor', '/configurator'] },
  { path: '/admin/commercial/journey', matchPaths: ['/admin/commercial/configurator'] },
  { path: '/admin/commercial/prospects', matchPaths: ['/admin/commercial/dossier'] },
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
  const platform = usePlatformAuthority(Boolean(user));
  const { toasts, showToast, removeToast } = useToast();
  // Génération d'interface : 'legacy' (défaut, rendu strictement inchangé) ou 'glass'.
  const { ui, routeMode } = useTheme();
  const glass = ui === 'glass';
  const p = createPalette(glass);
  // Glass : hauteur réelle de la barre du haut (le 57 px codé en dur du Legacy ne correspond pas à son rendu).
  const topbarRef = useRef<HTMLDivElement>(null);
  const [topbarH, setTopbarH] = useState(57);
  useEffect(() => {
    const el = topbarRef.current;
    if (!glass || !el) return;
    const update = () => setTopbarH(Math.round(el.getBoundingClientRect().height));
    update();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [glass]);
  const barH = glass ? topbarH : 57;

  useEffect(() => {
    const handler = (e: Event) => {
      const { message, type } = (e as CustomEvent).detail;
      showToast(message, type);
    };
    window.addEventListener('coro:toast', handler);
    return () => window.removeEventListener('coro:toast', handler);
  }, [showToast]);

  const [updates, setUpdates]               = useState<UpcomingUpdate[]>([]);
  const [showNotif, setShowNotif]           = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [pendingApprovals, setPendingApprovals] = useState<any[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [legacySidebarWidth, setLegacySidebarWidth] = useState(
    LEGACY_SIDEBAR_DEFAULT_WIDTH,
  );
  const glassSidebarWidth = useSyncExternalStore(
    subscribeToGlassSidebarWidth,
    getGlassSidebarWidthSnapshot,
    getGlassSidebarWidthServerSnapshot,
  );
  const [isDesktop, setIsDesktop] = useState(false);
  const isResizing = useRef(false);
  const sidebarRef = useRef<HTMLElement>(null);
  const activeNavigationRef = useRef<HTMLButtonElement>(null);

  const startResize = (e: React.MouseEvent) => {
    isResizing.current = true;
    document.addEventListener('mousemove', handleResize);
    document.addEventListener('mouseup', stopResize);
    e.preventDefault();
  };

  const handleResize = (e: MouseEvent) => {
    if (!isResizing.current) return;
    const newWidth = clampSidebarWidth(e.clientX);
    if (glass) {
      setGlassSidebarWidthPreference(newWidth);
    } else {
      setLegacySidebarWidth(newWidth);
    }
  };

  const stopResize = () => {
    isResizing.current = false;
    document.removeEventListener('mousemove', handleResize);
    document.removeEventListener('mouseup', stopResize);
  };

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
  const canReviewApprovals = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const [updatesRes, approvalsRes, unreadRes] = await Promise.all([
          api.get('/projects/upcoming-updates'),
          canReviewApprovals
            ? api.get('/projects/pending-approval')
            : Promise.resolve({ data: [] }),
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
  }, [canReviewApprovals]);

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

  // ── Responsive : détecter le breakpoint desktop ──
  useEffect(() => {
    const mediaQuery = window.matchMedia('(min-width: 1024px)');

    const updateViewport = () => {
      setIsDesktop(mediaQuery.matches);
    };

    updateViewport();
    mediaQuery.addEventListener('change', updateViewport);

    return () => {
      mediaQuery.removeEventListener('change', updateViewport);
    };
  }, []);

  // ── Responsive : fermer le menu mobile à chaque navigation ──
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  // ── Responsive : bloquer le scroll de fond lorsque le menu mobile est ouvert ──
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;

    if (sidebarOpen) {
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [sidebarOpen]);

  // ── Glass : tiroir mobile modal (verrouillage complet, Échap, piège de focus, retour du focus) ──
  // Les défauts corrigés ici existent aussi en Legacy (mesurés) ; ils ne sont corrigés qu'en Glass.
  const toggleRef = useRef<HTMLButtonElement>(null);
  const drawerMode = glass && !isDesktop;
  const drawerOpen = drawerMode && sidebarOpen;
  const wasDrawerOpen = useRef(false);

  useEffect(() => {
    if (!drawerOpen) return;
    // <html> a overflow-x: hidden (globals.css), donc c'est lui qui défile : body seul ne suffit pas.
    const html = document.documentElement;
    const previous = html.style.overflow;
    html.style.overflow = 'hidden';
    return () => { html.style.overflow = previous; };
  }, [drawerOpen]);

  useEffect(() => {
    if (!drawerOpen) return;
    sidebarRef.current?.focus();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setSidebarOpen(false);
        return;
      }
      if (e.key !== 'Tab') return;
      const aside = sidebarRef.current;
      if (!aside) return;
      const inDrawer = Array.from(aside.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), a[href]'));
      const cycle = [...inDrawer, toggleRef.current].filter((el): el is HTMLElement => !!el && el.getClientRects().length > 0);
      if (cycle.length === 0) return;
      e.preventDefault();
      const index = cycle.indexOf(document.activeElement as HTMLElement);
      const next = e.shiftKey
        ? (index <= 0 ? cycle.length - 1 : index - 1)
        : (index === -1 || index === cycle.length - 1 ? 0 : index + 1);
      cycle[next].focus();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [drawerOpen]);

  useEffect(() => {
    if (drawerOpen) { wasDrawerOpen.current = true; return; }
    if (wasDrawerOpen.current) {
      wasDrawerOpen.current = false;
      if (drawerMode) toggleRef.current?.focus();
    }
  }, [drawerOpen, drawerMode]);

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

  const activeNavigationPath = resolveActiveNavigationPath(pathname, [
    ...NAV_GROUPS.flatMap(group => group.items),
    ...ADMIN_GROUP.items,
    ...SUPER_ADMIN_PLATFORM_GROUP.items,
    ...SUPER_ADMIN_COMMERCIAL_GROUP.items,
    ...SUPER_ADMIN_COMMERCIAL_ADMIN_GROUP.items,
    ...SUPER_ADMIN_COMMERCIAL_ADVANCED_GROUP.items,
    ...(platform.isFounder ? SUPER_ADMIN_OTHER_GROUP.items : []),
    ...NAVIGATION_ALIASES,
  ]);

  const isActive = (path: string) => path === activeNavigationPath;

  // La barre latérale est un conteneur de défilement indépendant. Sa position
  // est conservée dans l'onglet courant, y compris après F5, sans déplacer la page.
  useEffect(() => {
    if (!isDesktop) return;
    const sidebar = sidebarRef.current;
    if (!sidebar) return;
    sidebar.scrollTop = readSidebarScrollPosition();
  }, [isDesktop]);

  // Après une navigation (y compris précédent/suivant), ne défile que si la
  // destination canonique est hors champ et seulement de la distance nécessaire.
  useEffect(() => {
    if (!isDesktop || !activeNavigationPath) return;
    const frame = window.requestAnimationFrame(() => {
      const sidebar = sidebarRef.current;
      const activeDestination = activeNavigationRef.current;
      if (!sidebar || !activeDestination) return;

      sidebar.scrollTop = getScrollTopForVisibleItem(
        sidebar.scrollTop,
        sidebar.getBoundingClientRect(),
        activeDestination.getBoundingClientRect(),
      );
    });
    return () => window.cancelAnimationFrame(frame);
  }, [activeNavigationPath, isDesktop, platform.loading]);

  const renderNavItem = (item: { label: string; path: string; icon: string }) => {
    const active = isActive(item.path);
    return (
      <button
        key={item.path}
        ref={active ? activeNavigationRef : undefined}
        aria-current={active ? 'page' : undefined}
        onClick={() => { router.push(item.path); setSidebarOpen(false); }}
        className={`w-full text-left px-3 py-2 rounded text-sm transition-colors flex items-center gap-2.5${glass ? ' min-h-[44px] lg:min-h-0' : ''}`}
        style={{
          backgroundColor: active ? p.bg('#FDEDEC') : 'transparent',
          color: active ? p.text('#C0392B') : p.text('#495057'),
          border: active ? `1px solid ${p.line('#F1948A')}` : '1px solid transparent',
          fontWeight: active ? '600' : '500',
          ...(glass && active ? { boxShadow: 'inset 3px 0 0 var(--cg-accent), 0 8px 20px -12px var(--cg-glow-accent)' } : {}),
        }}
        onMouseEnter={e => { if (!active) { e.currentTarget.style.backgroundColor = p.bg('#F8F9FA'); e.currentTarget.style.color = p.text('#2C3E50'); } }}
        onMouseLeave={e => { if (!active) { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = p.text('#495057'); } }}
      >
        {glass ? <GlassNavIcon path={item.path} /> : <span style={{ fontSize: '14px', flexShrink: 0 }}>{item.icon}</span>}
        <span style={{ whiteSpace: 'nowrap' }}>{item.label}</span>
      </button>
    );
  };

  return (
    <div className={glass ? 'min-h-screen cg-canvas' : 'min-h-screen'} style={glass ? undefined : { backgroundColor: '#F8F9FA' }}>

      {/* ── Topbar ── */}
      <div
        ref={topbarRef}
        className={`flex items-center justify-between px-3 sm:px-4 lg:px-6 py-3 sticky top-0 z-40${glass ? ' cg-chrome' : ''}`}
        style={{
          backgroundColor: p.bg('#FFFFFF'),
          borderBottom: `1px solid ${p.line('#DEE2E6')}`,
          boxShadow: glass ? undefined : '0 1px 4px rgba(0,0,0,0.06)',
        }}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            ref={toggleRef}
            type="button"
            aria-controls={glass ? 'coro-sidebar' : undefined}
            onClick={() => setSidebarOpen(prev => !prev)}
            className="lg:hidden min-h-[44px] min-w-[44px] w-11 h-11 rounded flex items-center justify-center flex-shrink-0 transition-colors"
            style={{
              color: p.text('#2C3E50'),
              border: `1px solid ${p.line('#DEE2E6')}`,
              backgroundColor: p.bg('#FFFFFF'),
            }}
            aria-label={sidebarOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
            aria-expanded={sidebarOpen}
          >
            <span style={{ fontSize: '20px', lineHeight: 1 }}>
              {glass ? <GlassIcon name={sidebarOpen ? 'close' : 'menu'} size={22} /> : (sidebarOpen ? '×' : '☰')}
            </span>
          </button>

          <h1
            className="text-xl sm:text-2xl font-bold tracking-tight cursor-pointer flex-shrink-0"
            style={{ color: p.text('#2C3E50') }}
            onClick={() => router.push('/dashboard')}
          >
            CO<span style={{ color: p.text('#C0392B') }}>RO</span>
          </h1>
          {glass && (
            <p
              className="hidden lg:block text-xs font-medium uppercase leading-tight pl-3 ml-1"
              style={{ color: 'var(--cg-text-secondary)', borderLeft: '1px solid var(--cg-border-default)', letterSpacing: '0.04em' }}
            >
              Bâtiments plus sûrs.<br />Organisations plus résilientes.
            </p>
          )}
        </div>

        <div className="flex items-center gap-1.5 sm:gap-3">
          {/* ── Cloche notifications ── */}
          <div ref={notifRef} className="relative">
            <button
              onClick={() => setShowNotif(!showNotif)}
              className={`relative p-2 rounded transition-colors${glass ? ' min-w-[44px] min-h-[44px] lg:min-w-0 lg:min-h-0 inline-flex items-center justify-center' : ''}`}
              style={{ color: p.text('#6C757D') }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = p.bg('#F8F9FA')}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
              title="Notifications"
            >
              {glass ? <GlassIcon name="bell" size={20} /> : <span style={{ fontSize: '18px' }}>🔔</span>}
              {totalCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 text-white text-xs font-bold rounded-full flex items-center justify-center"
                  style={{
                    backgroundColor: pendingApprovals.length > 0 || urgentCount > 0 ? p.bg('#C0392B') : p.bg('#F39C12'),
                    fontSize: '10px',
                    // Glass uniquement : l'état « avis » (ambre) passe en texte foncé (6,65:1 au lieu de 2,19:1 en blanc).
                    // L'état urgent garde le blanc sur le rouge d'urgence (5,44:1). Legacy : inchangé.
                    ...(glass && !(pendingApprovals.length > 0 || urgentCount > 0)
                      ? { backgroundColor: 'var(--cg-notice-bg)', color: 'var(--cg-notice-fg)' }
                      : {}),
                  }}>
                  {totalCount}
                </span>
              )}
            </button>

            {showNotif && (
              <div className={`absolute right-0 top-full mt-2 w-[calc(100vw-1.5rem)] sm:w-96 max-w-[24rem] rounded-md shadow-lg z-50${glass ? ' cg-panel' : ''}`}
                style={{ backgroundColor: p.panel('#FFFFFF'), border: `1px solid ${p.line('#E9ECEF')}`, boxShadow: glass ? 'var(--cg-shadow-3)' : '0 8px 24px rgba(0,0,0,0.12)' }}>
                <div className="px-4 py-3" style={{ borderBottom: `1px solid ${p.line('#E9ECEF')}` }}>
                  <p className="font-semibold text-sm" style={{ color: p.text('#2C3E50') }}>Notifications</p>
                  <p className="text-xs mt-0.5" style={{ color: p.text('#ADB5BD') }}>Approbations et documents à renouveler</p>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {pendingApprovals.length > 0 && (
                    <div>
                      <p className="px-4 py-2 text-xs font-semibold uppercase tracking-wide"
                        style={{ backgroundColor: p.bg('#FDEDEC'), color: p.text('#C0392B') }}>
                        ✓ Approbations en attente ({pendingApprovals.length})
                      </p>
                      {pendingApprovals.map(approval => (
                        <div key={approval.id}
                          onClick={() => { router.push(`/projects/${approval.id}`); setShowNotif(false); }}
                          className="px-4 py-3 cursor-pointer transition-colors"
                          style={{ borderBottom: `1px solid ${p.line('#F8F9FA')}` }}
                          onMouseEnter={e => e.currentTarget.style.backgroundColor = p.bg('#FDEDEC')}
                          onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-0.5">
                                <span className="text-xs font-bold px-1.5 py-0.5 rounded text-white" style={{ backgroundColor: p.bg('#C0392B') }}>{approval.documentType}</span>
                                <span className="text-xs font-medium truncate" style={{ color: p.text('#2C3E50') }}>{approval.name}</span>
                              </div>
                              <p className="text-xs" style={{ color: p.text('#6C757D') }}>Soumis par {approval.submittedBy?.firstName} {approval.submittedBy?.lastName}</p>
                            </div>
                            <span className="text-xs font-medium flex-shrink-0" style={{ color: p.text('#C0392B') }}>À réviser →</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {updates.length === 0 && pendingApprovals.length === 0 ? (
                    <div className="px-4 py-6 text-center">
                      <p className="text-sm" style={{ color: p.text('#ADB5BD') }}>✓ Tout est à jour</p>
                    </div>
                  ) : updates.map(u => (
                    <div key={u.id}
                      onClick={() => { router.push(`/projects/${u.id}`); setShowNotif(false); }}
                      className="px-4 py-3 cursor-pointer transition-colors"
                      style={{ borderBottom: `1px solid ${p.line('#F8F9FA')}` }}
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = p.bg('#F8F9FA')}
                      onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-xs font-bold px-1.5 py-0.5 rounded"
                              style={{ backgroundColor: u.level === 'URGENT' ? p.bg('#FDEDEC') : p.bg('#FEF9E7'), color: u.level === 'URGENT' ? p.text('#C0392B') : p.text('#F39C12') }}>
                              {u.documentType}
                            </span>
                            <span className="text-xs font-medium truncate" style={{ color: p.text('#2C3E50') }}>{u.name}</span>
                          </div>
                          <p className="text-xs truncate" style={{ color: p.text('#6C757D') }}>{u.clientName} — {u.buildingName}</p>
                        </div>
                        <div className="flex-shrink-0 text-right">
                          <p className="text-xs font-bold" style={{ color: u.level === 'URGENT' ? p.text('#C0392B') : p.text('#F39C12') }}>{u.monthsAgo} mois</p>
                          <p className="text-xs" style={{ color: p.text('#ADB5BD') }}>{u.level === 'URGENT' ? '⚠ À renouveler' : '○ Bientôt'}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="px-4 py-2.5 flex items-center justify-between" style={{ borderTop: `1px solid ${p.line('#E9ECEF')}` }}>
                  <button onClick={() => { router.push('/notifications'); setShowNotif(false); }}
                    className="text-xs font-medium" style={{ color: p.text('#C0392B') }}>
                    Toutes les notifications →
                  </button>
                  <button onClick={() => { router.push('/dashboard'); setShowNotif(false); }}
                    className="text-xs" style={{ color: p.text('#6C757D') }}>
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
                className="flex min-h-[44px] min-w-[44px] items-center justify-center gap-2 rounded px-1.5 py-1.5 transition-colors sm:px-3 lg:min-h-0 lg:min-w-0"
                style={{ border: '1px solid transparent' }}
                onMouseEnter={e => { e.currentTarget.style.backgroundColor = p.bg('#F8F9FA'); e.currentTarget.style.borderColor = p.line('#DEE2E6'); }}
                onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.borderColor = 'transparent'; }}>
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold"
                  style={{ backgroundColor: p.bg('#C0392B') }}>
                  {user.firstName?.[0]}{user.lastName?.[0]}
                </div>
                <span className="hidden md:inline text-sm font-medium" style={{ color: p.text('#495057') }}>{user.firstName} {user.lastName}</span>
                <span className="hidden sm:inline" style={{ color: p.text('#ADB5BD'), fontSize: '10px' }}>{glass ? <GlassIcon name="chevron" size={14} /> : '▼'}</span>
              </button>

              {showProfileMenu && (
                <div className={`absolute right-0 top-full mt-2 w-56 max-w-[calc(100vw-1.5rem)] rounded-md shadow-lg z-50${glass ? ' cg-panel' : ''}`}
                  style={{ backgroundColor: p.panel('#FFFFFF'), border: `1px solid ${p.line('#E9ECEF')}`, boxShadow: glass ? 'var(--cg-shadow-3)' : '0 8px 24px rgba(0,0,0,0.12)' }}>
                  <div className="px-4 py-3" style={{ borderBottom: `1px solid ${p.line('#E9ECEF')}` }}>
                    <p className="text-xs font-semibold" style={{ color: p.text('#2C3E50') }}>{user.firstName} {user.lastName}</p>
                    <p className="text-xs mt-0.5" style={{ color: p.text('#ADB5BD') }}>{user.email}</p>
                  </div>
                  <div className="py-1">
                    {[
                      { label: '👤 Mon profil', text: 'Mon profil', Icon: User, path: '/profile' },
                      { label: '⏱ Mon rendement', text: 'Mon rendement', Icon: Timer, path: '/profile/rendement' },
                      ...((user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') ? [{ label: '📊 Rendement équipe', text: 'Rendement équipe', Icon: BarChart3, path: '/dashboard/rendement' }] : []),
                    ].map(item => (
                      <button key={item.path}
                        onClick={() => { router.push(item.path); setShowProfileMenu(false); }}
                        className="w-full text-left px-4 py-2 text-sm transition-colors"
                        style={{ color: p.text('#495057') }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = p.bg('#F8F9FA')}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                        {glass ? <span className="flex items-center gap-2"><item.Icon size={16} strokeWidth={1.8} aria-hidden="true" />{item.text}</span> : item.label}
                      </button>
                    ))}
                    <div style={{ borderTop: `1px solid ${p.line('#E9ECEF')}`, margin: '4px 0' }} />
                    <button onClick={() => { handleLogout(); setShowProfileMenu(false); }}
                      className="w-full text-left px-4 py-2 text-sm transition-colors"
                      style={{ color: p.text('#C0392B') }}
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = p.bg('#FDEDEC')}
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

      <div className="flex min-w-0 overflow-hidden" style={glass ? { overflow: 'clip' } : undefined}>
        {/* ── Overlay mobile ── */}
        {sidebarOpen && (
          <button
            type="button"
            aria-label="Fermer le menu"
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-x-0 bottom-0 top-[57px] z-40 bg-black/30 lg:hidden"
            style={glass ? { top: barH } : undefined}
            tabIndex={glass ? -1 : undefined}
            aria-hidden={glass ? true : undefined}
          />
        )}

        {/* ── Sidebar ── */}
        <aside
          ref={sidebarRef}
          onScroll={event => {
            if (isDesktop) persistSidebarScrollPosition(event.currentTarget.scrollTop);
          }}
          {...(glass ? {
            id: 'coro-sidebar',
            'aria-label': 'Navigation principale',
            inert: drawerMode && !sidebarOpen,
            ...(drawerOpen ? { role: 'dialog', 'aria-modal': true, tabIndex: -1 } : {}),
          } : {})}
          className={`fixed lg:sticky left-0 top-[57px] z-50 lg:z-20 p-3 overflow-y-auto transition-transform duration-200 ease-out lg:translate-x-0 lg:self-start${glass ? ' cg-chrome' : ''} ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
          style={{
            backgroundColor: p.bg('#FFFFFF'),
            borderRight: `1px solid ${p.line('#DEE2E6')}`,
            ...(glass ? { top: barH, overscrollBehavior: 'contain' as const, outline: 'none' } : {}),
            height: `calc(100dvh - ${barH}px)`,
            maxHeight: `calc(100dvh - ${barH}px)`,
            width: isDesktop
              ? `${glass ? glassSidebarWidth : legacySidebarWidth}px`
              : 'min(86vw, 320px)',
            minWidth: isDesktop ? `${SIDEBAR_MIN_WIDTH}px` : 'min(86vw, 320px)',
            maxWidth: isDesktop ? `${SIDEBAR_MAX_WIDTH}px` : '320px',
            flexShrink: 0,
            boxShadow:
              !isDesktop && sidebarOpen
                ? '8px 0 24px rgba(0,0,0,0.14)'
                : 'none',
          }}
        >

          {/* Recherche globale */}
          <div ref={searchRef} className="relative mb-3">
            <div className="relative">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs" style={{ color: p.text('#ADB5BD') }}>{glass ? <GlassIcon name="search" size={14} /> : '🔍'}</span>
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onFocus={() => { if (searchResults.length > 0) setShowSearch(true); }}
                placeholder="Rechercher..."
                className={`w-full pl-7 pr-3 py-2.5 text-base lg:text-xs rounded focus:outline-none${glass ? ' cg-input' : ''}`}
                style={{
                  border: `1px solid ${p.line('#DEE2E6')}`,
                  backgroundColor: p.bg('#F8F9FA'),
                  color: p.text('#2C3E50'),
                  ...(glass ? { paddingLeft: '1.75rem', paddingRight: '0.75rem' } : {}),
                }}
                onFocusCapture={e => e.target.style.borderColor = p.line('#C0392B')}
                onBlurCapture={e => e.target.style.borderColor = p.line('#DEE2E6')}
              />
              {searchLoading && (
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs animate-pulse" style={{ color: p.text('#ADB5BD') }}>⏳</span>
              )}
            </div>

            {/* Résultats de recherche */}
            {showSearch && searchResults.length > 0 && (
              <div className={`absolute top-full left-0 right-0 mt-1 rounded-md shadow-lg z-50${glass ? ' cg-panel' : ''}`}
                style={{ backgroundColor: p.panel('#FFFFFF'), border: `1px solid ${p.line('#E9ECEF')}`, boxShadow: glass ? 'var(--cg-shadow-3)' : '0 8px 24px rgba(0,0,0,0.12)' }}>
                {searchResults.map(result => (
                  <div key={`${result.type}-${result.id}`}
                    onClick={() => handleSearchSelect(result)}
                    className="flex items-center gap-2 px-3 py-2.5 cursor-pointer transition-colors"
                    style={{ borderBottom: `1px solid ${p.line('#F8F9FA')}` }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = p.bg('#F8F9FA')}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                    <span style={{ fontSize: '13px', flexShrink: 0 }}>{typeIcon[result.type]}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate" style={{ color: p.text('#2C3E50') }}>{result.name}</p>
                      {result.subtitle && (
                        <p className="text-xs truncate" style={{ color: p.text('#ADB5BD') }}>{result.subtitle}</p>
                      )}
                    </div>
                    <span className="text-xs px-1.5 py-0.5 rounded flex-shrink-0"
                      style={{ backgroundColor: p.bg('#F8F9FA'), color: p.text('#ADB5BD') }}>
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
                    style={{ color: p.text('#ADB5BD') }}>
                    {group.label}
                  </p>
                )}
                <div className="space-y-0.5">
                  {group.items.map(item => renderNavItem(item))}
                </div>
              </div>
            ))}

            {(user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN') && (
              <div>
                <div className="mx-1 mb-3" style={{ borderTop: `1px solid ${p.line('#E9ECEF')}` }} />
                <p className="px-3 text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: p.text('#ADB5BD') }}>
                  {ADMIN_GROUP.label}
                </p>
                <div className="space-y-0.5">
                  {ADMIN_GROUP.items.map(item => renderNavItem(item))}
                </div>
              </div>
            )}

            {platform.hasAnyPlatformAccess && (
              <div>
                <div className="mx-1 mb-3" style={{ borderTop: `1px solid ${p.line('#E9ECEF')}` }} />
                <p className="px-3 text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: p.text('#ADB5BD') }}>
                  {SUPER_ADMIN_PLATFORM_GROUP.label}
                </p>
                <div className="space-y-0.5">
                  {SUPER_ADMIN_PLATFORM_GROUP.items.map(item => renderNavItem(item))}
                </div>
                {[SUPER_ADMIN_COMMERCIAL_GROUP, SUPER_ADMIN_COMMERCIAL_ADMIN_GROUP, SUPER_ADMIN_COMMERCIAL_ADVANCED_GROUP, ...(platform.isFounder ? [SUPER_ADMIN_OTHER_GROUP] : [])].map(group => (
                  <div key={group.label} className="mt-4">
                    <p className="px-3 text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: p.text('#ADB5BD') }}>
                      {group.label}
                    </p>
                    <div className="space-y-0.5">
                      {group.items.map(item => renderNavItem(item))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </nav>
        {/* ── Poignée redimensionnement ── */}
          <div
            onMouseDown={startResize}
            className="hidden lg:block absolute top-0 right-0 w-1 h-full cursor-col-resize"
            style={{ backgroundColor: 'transparent' }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = p.bg('#C0392B')}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
          />
        </aside>

        {/* ── Contenu ── */}
        <main className="flex-1 w-full min-w-0 p-4 sm:p-6 lg:p-8" inert={drawerOpen ? true : undefined}>
          {glass && routeMode === 'island' ? <LegacyIsland>{children}</LegacyIsland> : children}
        </main>
      </div>
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  );
}
