'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';

const navItems = [
  { label: 'Dashboard',    path: '/dashboard' },
  { label: 'Projets',      path: '/projects' },
  { label: 'Clients',      path: '/clients' },
  { label: 'Bâtiments',    path: '/buildings' },
  { label: 'Bibliothèque', path: '/library' },
  { label: 'Paramètres',   path: '/settings' },
];

const adminNavItems = [
  { label: 'Équipe', path: '/settings/users' },
];

const superAdminNavItems = [
  { label: 'Organisations', path: '/admin/organizations' },
  { label: 'Tous les projets', path: '/admin/projects' },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

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
          {user && (
            <span className="text-sm font-medium" style={{ color: '#495057' }}>
              {user.firstName} {user.lastName}
            </span>
          )}
          <button
            onClick={handleLogout}
            className="text-sm px-3 py-1.5 rounded transition-colors"
            style={{ color: '#6C757D', border: '1px solid #DEE2E6' }}
            onMouseEnter={e => {
              (e.currentTarget).style.backgroundColor = '#F8F9FA';
              (e.currentTarget).style.color = '#2C3E50';
            }}
            onMouseLeave={e => {
              (e.currentTarget).style.backgroundColor = 'transparent';
              (e.currentTarget).style.color = '#6C757D';
            }}
          >
            Déconnexion
          </button>
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
                  className="w-full text-left px-4 py-2.5 rounded text-sm
                    transition-colors font-medium"
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