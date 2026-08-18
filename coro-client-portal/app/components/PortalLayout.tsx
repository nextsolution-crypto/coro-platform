'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { getUser, clearAuth } from '../store/auth';
import {
  LayoutDashboard,
  FileText,
  Calendar,
  LogOut,
  Menu,
  X,
  User,
} from 'lucide-react';

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const [user, setUser] = useState<any>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const u = getUser();

    if (!u) {
      router.replace('/login');
      return;
    }

    setUser(u);
  }, [router]);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  const handleLogout = () => {
    clearAuth();
    router.replace('/login');
  };

  const navItems = [
    {
      label: 'Tableau de bord',
      path: '/dashboard',
      icon: LayoutDashboard,
    },
    {
      label: 'Documents',
      path: '/documents',
      icon: FileText,
    },
    {
      label: 'Activités',
      path: '/activities',
      icon: Calendar,
    },
    {
      label: 'Réservations',
      path: '/bookings',
      icon: Calendar,
    },
    {
      label: 'Mon profil',
      path: '/profile',
      icon: User,
    },
  ];

  const isActive = (path: string) =>
    pathname === path || pathname.startsWith(`${path}/`);

  if (!user) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#F8F9FA',
          padding: 24,
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: 14,
            color: '#ADB5BD',
          }}
        >
          Chargement...
        </p>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#F8F9FA',
      }}
    >
      {/* ── Topbar ── */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 100,
          backgroundColor: '#FFFFFF',
          borderBottom: '1px solid #E9ECEF',
          boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: '0 auto',
            padding: '0 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            minHeight: 64,
            gap: 12,
          }}
        >
          {/* Logo */}
          <button
            type="button"
            onClick={() => router.push('/dashboard')}
            aria-label="Retour au tableau de bord"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              minWidth: 0,
              border: 'none',
              backgroundColor: 'transparent',
              cursor: 'pointer',
              padding: 0,
              textAlign: 'left',
            }}
          >
            <span
              style={{
                fontSize: 24,
                fontWeight: 900,
                color: '#2C3E50',
                letterSpacing: '-1px',
                flexShrink: 0,
              }}
            >
              CO<span style={{ color: '#C0392B' }}>RO</span>
            </span>

            <span
              className="hidden sm:inline"
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: '#6C757D',
                backgroundColor: '#F8F9FA',
                border: '1px solid #E9ECEF',
                padding: '3px 8px',
                borderRadius: 4,
                whiteSpace: 'nowrap',
              }}
            >
              Portail Client
            </span>
          </button>

          {/* Navigation desktop / tablette */}
          <nav
            className="hidden md:flex"
            style={{
              alignItems: 'center',
              gap: 4,
            }}
            aria-label="Navigation principale"
          >
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);

              return (
                <button
                  key={item.path}
                  type="button"
                  onClick={() => router.push(item.path)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    minHeight: 40,
                    padding: '8px 12px',
                    borderRadius: 6,
                    fontSize: 14,
                    fontWeight: 500,
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    backgroundColor: active ? '#FDEDEC' : 'transparent',
                    color: active ? '#C0392B' : '#6C757D',
                    whiteSpace: 'nowrap',
                  }}
                  onMouseEnter={(e) => {
                    if (!active) {
                      e.currentTarget.style.backgroundColor = '#F8F9FA';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!active) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  <Icon size={16} />
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Actions droite */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              flexShrink: 0,
            }}
          >
            {/* Nom client */}
            <div
              className="hidden lg:block"
              style={{
                textAlign: 'right',
                minWidth: 0,
              }}
            >
              <p
                style={{
                  margin: 0,
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#2C3E50',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxWidth: 180,
                }}
              >
                {user.firstName} {user.lastName}
              </p>

              <p
                style={{
                  margin: 0,
                  marginTop: 2,
                  fontSize: 11,
                  color: '#ADB5BD',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxWidth: 180,
                }}
              >
                {user.clientName}
              </p>
            </div>

            {/* Avatar */}
            <div
              title={`${user.firstName || ''} ${user.lastName || ''}`.trim()}
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                backgroundColor: '#C0392B',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFFFFF',
                fontSize: 13,
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              {user.firstName?.[0]}
              {user.lastName?.[0]}
            </div>

            {/* Déconnexion desktop */}
            <button
              type="button"
              onClick={handleLogout}
              className="hidden md:flex"
              style={{
                alignItems: 'center',
                gap: 6,
                minHeight: 40,
                padding: '8px 12px',
                borderRadius: 6,
                border: '1px solid #E9ECEF',
                backgroundColor: 'transparent',
                color: '#6C757D',
                fontSize: 13,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#FDEDEC';
                e.currentTarget.style.color = '#C0392B';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = '#6C757D';
              }}
            >
              <LogOut size={14} />
              <span className="hidden lg:inline">Déconnexion</span>
            </button>

            {/* Hamburger mobile */}
            <button
              type="button"
              onClick={() => setMenuOpen((prev) => !prev)}
              className="md:hidden"
              aria-label={menuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
              aria-expanded={menuOpen}
              style={{
                width: 44,
                height: 44,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#2C3E50',
                borderRadius: 8,
                flexShrink: 0,
              }}
            >
              {menuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Menu mobile */}
        {menuOpen && (
          <div
            className="md:hidden"
            style={{
              borderTop: '1px solid #E9ECEF',
              backgroundColor: '#FFFFFF',
              padding: '8px 0 12px',
              boxShadow: '0 8px 20px rgba(0,0,0,0.06)',
            }}
          >
            <div
              style={{
                padding: '12px 20px',
                borderBottom: '1px solid #F1F3F5',
                marginBottom: 4,
              }}
            >
              <p
                style={{
                  margin: 0,
                  fontSize: 14,
                  fontWeight: 700,
                  color: '#2C3E50',
                }}
              >
                {user.firstName} {user.lastName}
              </p>

              <p
                style={{
                  margin: '3px 0 0',
                  fontSize: 12,
                  color: '#ADB5BD',
                }}
              >
                {user.clientName}
              </p>
            </div>

            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);

              return (
                <button
                  key={item.path}
                  type="button"
                  onClick={() => {
                    router.push(item.path);
                    setMenuOpen(false);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    width: '100%',
                    minHeight: 48,
                    padding: '12px 20px',
                    fontSize: 15,
                    fontWeight: 500,
                    border: 'none',
                    cursor: 'pointer',
                    textAlign: 'left',
                    backgroundColor: active ? '#FDEDEC' : 'transparent',
                    color: active ? '#C0392B' : '#495057',
                  }}
                >
                  <Icon size={19} />
                  {item.label}
                </button>
              );
            })}

            <div
              style={{
                borderTop: '1px solid #E9ECEF',
                margin: '6px 0',
              }}
            />

            <button
              type="button"
              onClick={handleLogout}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                width: '100%',
                minHeight: 48,
                padding: '12px 20px',
                fontSize: 15,
                fontWeight: 500,
                border: 'none',
                cursor: 'pointer',
                color: '#C0392B',
                backgroundColor: 'transparent',
                textAlign: 'left',
              }}
            >
              <LogOut size={19} />
              Déconnexion
            </button>
          </div>
        )}
      </header>

      {/* ── Contenu ── */}
      <main
        style={{
          maxWidth: 1200,
          margin: '0 auto',
          width: '100%',
          padding: 'clamp(20px, 4vw, 32px) 16px',
        }}
      >
        {children}
      </main>
    </div>
  );
}