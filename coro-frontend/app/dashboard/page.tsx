'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';

export default function DashboardPage() {
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  if (!user) return null;

  const navItems = [
    { label: 'Dashboard', path: '/dashboard', active: true },
    { label: 'Projets', path: '/projects' },
    { label: 'Clients', path: '/clients' },
    { label: 'Bâtiments', path: '/buildings' },
    { label: 'Bibliothèque', path: '/library' },
    { label: 'Paramètres', path: '/settings' },
  ];

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Topbar */}
      <div className="bg-gray-900 border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">
          CO<span className="text-orange-500">RO</span>
        </h1>
        <div className="flex items-center gap-4">
          <span className="text-gray-400 text-sm">{user.firstName} {user.lastName}</span>
          <button onClick={handleLogout}
            className="text-gray-400 hover:text-white text-sm transition-colors">
            Déconnexion
          </button>
        </div>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <div className="w-64 min-h-screen bg-gray-900 border-r border-gray-800 p-4">
          <nav className="space-y-1">
            {navItems.map((item) => (
              <button
                key={item.label}
                onClick={() => router.push(item.path)}
                className={`w-full text-left px-4 py-2.5 rounded-lg text-sm cursor-pointer transition-colors ${
                  item.active
                    ? 'bg-orange-500/10 text-orange-400 font-medium'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`}>
                {item.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Contenu principal */}
        <div className="flex-1 p-8">
          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-white">
              Bonjour, {user.firstName} 👋
            </h2>
            <p className="text-gray-400 mt-1">Bienvenue sur la plateforme CORO</p>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-4 gap-4 mb-8">
            {[
              { label: 'Projets actifs', value: '0' },
              { label: 'Documents générés', value: '0' },
              { label: 'Validations en attente', value: '0' },
              { label: 'Exports PDF', value: '0' },
            ].map((kpi) => (
              <div key={kpi.label} className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                <p className="text-gray-400 text-sm">{kpi.label}</p>
                <p className="text-3xl font-bold text-white mt-2">{kpi.value}</p>
              </div>
            ))}
          </div>

          {/* Projets récents */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h3 className="text-white font-semibold mb-4">Projets récents</h3>
            <div className="text-center py-12">
              <p className="text-gray-500 text-sm">Aucun projet pour l'instant</p>
              <button
                onClick={() => router.push('/projects')}
                className="mt-4 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
                Créer un projet
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}