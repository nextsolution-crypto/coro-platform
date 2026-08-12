'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { getUser, clearAuth } from '../store/auth';
import { LayoutDashboard, FileText, Calendar, LogOut, Menu, X, User } from 'lucide-react';

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const u = getUser();
    if (!u) {
      router.push('/login');
      return;
    }
    setUser(u);
  }, []);

  const handleLogout = () => {
    clearAuth();
    router.push('/login');
  };

  const navItems = [
    { label: 'Tableau de bord', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Documents', path: '/documents', icon: FileText },
    { label: 'Activités', path: '/activities', icon: Calendar },
    { label: 'Mon profil', path: '/profile', icon: User },
  ];

  const isActive = (path: string) => pathname === path || pathname.startsWith(path + '/');

  if (!user) return null;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F8F9FA' }}>

      {/* ── Topbar ── */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 100,
        backgroundColor: '#FFFFFF', borderBottom: '1px solid #E9ECEF',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        padding: '0 24px',
      }}>
        <div style={{
          maxWidth: 1200, margin: '0 auto',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          height: 64,
        }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 24, fontWeight: 900, color: '#2C3E50', letterSpacing: '-1px' }}>
              CO<span style={{ color: '#C0392B' }}>RO</span>
            </span>
            <span style={{
              fontSize: 12, fontWeight: 600, color: '#6C757D',
              backgroundColor: '#F8F9FA', border: '1px solid #E9ECEF',
              padding: '2px 8px', borderRadius: 4,
            }}>
              Portail Client
            </span>
          </div>

          {/* Nav desktop */}
          <nav style={{ display: 'flex', alignItems: 'center', gap: 4 }} className="hidden md:flex">
            {navItems.map(item => {
              const Icon = item.icon;
              const active = isActive(item.path);
              return (
                <button key={item.path}
                  onClick={() => router.push(item.path)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '8px 14px', borderRadius: 6, fontSize: 14, fontWeight: 500,
                    border: 'none', cursor: 'pointer', transition: 'all 0.2s',
                    backgroundColor: active ? '#FDEDEC' : 'transparent',
                    color: active ? '#C0392B' : '#6C757D',
                  }}
                  onMouseEnter={e => { if (!active) e.currentTarget.style.backgroundColor = '#F8F9FA'; }}
                  onMouseLeave={e => { if (!active) e.currentTarget.style.backgroundColor = 'transparent'; }}>
                  <Icon size={16} />
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Droite */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* Nom client */}
            <div className="hidden md:block" style={{ textAlign: 'right' }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#2C3E50' }}>
                {user.firstName} {user.lastName}
              </p>
              <p style={{ fontSize: 11, color: '#ADB5BD' }}>{user.clientName}</p>
            </div>

            {/* Avatar */}
            <div style={{
              width: 36, height: 36, borderRadius: '50%',
              backgroundColor: '#C0392B', display: 'flex', alignItems: 'center',
              justifyContent: 'center', color: '#FFFFFF', fontSize: 13, fontWeight: 700,
              flexShrink: 0,
            }}>
              {user.firstName?.[0]}{user.lastName?.[0]}
            </div>

            {/* Déconnexion desktop */}
            <button
              onClick={handleLogout}
              className="hidden md:flex"
              style={{
                alignItems: 'center', gap: 6, padding: '8px 12px', borderRadius: 6,
                border: '1px solid #E9ECEF', backgroundColor: 'transparent',
                color: '#6C757D', fontSize: 13, cursor: 'pointer',
              }}
              onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#FDEDEC'; e.currentTarget.style.color = '#C0392B'; }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#6C757D'; }}>
              <LogOut size={14} />
              Déconnexion
            </button>

            {/* Hamburger mobile */}
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="md:hidden"
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#2C3E50' }}>
              {menuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Menu mobile */}
        {menuOpen && (
          <div style={{
            borderTop: '1px solid #E9ECEF', padding: '16px 0',
            backgroundColor: '#FFFFFF',
          }}>
            {navItems.map(item => {
              const Icon = item.icon;
              const active = isActive(item.path);
              return (
                <button key={item.path}
                  onClick={() => { router.push(item.path); setMenuOpen(false); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    width: '100%', padding: '12px 24px', fontSize: 15, fontWeight: 500,
                    border: 'none', cursor: 'pointer', textAlign: 'left',
                    backgroundColor: active ? '#FDEDEC' : 'transparent',
                    color: active ? '#C0392B' : '#495057',
                  }}>
                  <Icon size={18} />
                  {item.label}
                </button>
              );
            })}
            <div style={{ borderTop: '1px solid #E9ECEF', margin: '8px 0' }} />
            <button
              onClick={handleLogout}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                width: '100%', padding: '12px 24px', fontSize: 15, fontWeight: 500,
                border: 'none', cursor: 'pointer', color: '#C0392B', backgroundColor: 'transparent',
              }}>
              <LogOut size={18} />
              Déconnexion
            </button>
          </div>
        )}
      </div>

      {/* ── Contenu ── */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px' }}>
        {children}
      </div>
    </div>
  );
}