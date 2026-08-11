'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';
import api from '@/lib/api';
import AppLayout from '@/components/layout/AppLayout';

interface Organization {
  id: string;
  name: string;
  isInternal: boolean;
  licenseType: string;
  isActive: boolean;
  createdAt: string;
  _count: { users: number; projects: number; clients: number; buildings: number };
}

const licenseColors: Record<string, { bg: string; text: string; border: string }> = {
  ESSAI_GRATUIT: { bg: '#F8F9FA', text: '#6C757D', border: '#DEE2E6' },
  STANDARD:      { bg: '#EBF5FB', text: '#2980B9', border: '#AED6F1' },
  ENTREPRISE:    { bg: '#F4ECF7', text: '#8E44AD', border: '#D2B4DE' },
};

const licenseLabels: Record<string, string> = {
  ESSAI_GRATUIT: 'Essai gratuit',
  STANDARD: 'Standard',
  ENTREPRISE: 'Entreprise',
};

export default function OrganizationsAdminPage() {
  const router = useRouter();
  const { user, isAuthenticated, initAuth } = useAuthStore();

  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    organizationName: '',
    licenseType: 'ESSAI_GRATUIT',
    adminEmail: '',
    adminPassword: '',
    adminFirstName: '',
    adminLastName: '',
  });

  useEffect(() => { initAuth(); }, []);

  useEffect(() => {
    if (isAuthenticated) {
      if (user?.role !== 'SUPER_ADMIN') {
        router.push('/dashboard');
        return;
      }
      fetchData();
    } else {
      const token = localStorage.getItem('coro_token');
      if (!token) router.push('/login');
    }
  }, [isAuthenticated, user]);

  const fetchData = async () => {
    try {
      const res = await api.get('/organizations');
      setOrganizations(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError('');
    try {
      await api.post('/organizations', form);
      setShowModal(false);
      setForm({
        organizationName: '', licenseType: 'ESSAI_GRATUIT',
        adminEmail: '', adminPassword: '', adminFirstName: '', adminLastName: '',
      });
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors de la création.');
    } finally {
      setCreating(false);
    }
  };

  const handleChangeLicense = async (orgId: string, licenseType: string) => {
    try {
      await api.put(`/organizations/${orgId}/license`, { licenseType });
      fetchData();
    } catch (err) { console.error(err); }
  };

  const handleToggleActive = async (orgId: string, isActive: boolean) => {
    try {
      await api.put(`/organizations/${orgId}/active`, { isActive });
      fetchData();
    } catch (err) { console.error(err); }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="text-center py-12">
          <p className="text-sm animate-pulse" style={{ color: '#ADB5BD' }}>Chargement...</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-semibold" style={{ color: '#2C3E50' }}>
            Organisations clientes
          </h2>
          <p className="text-sm mt-1" style={{ color: '#6C757D' }}>
            {organizations.length} organisation{organizations.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="w-full sm:w-auto text-white text-sm font-medium px-4 py-2 rounded transition-colors"
          style={{ backgroundColor: '#C0392B' }}
          onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#A93226')}
          onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#C0392B')}
        >
          + Nouvelle organisation
        </button>
      </div>

      <div className="grid gap-3">
        {organizations.map(org => {
          const lc = licenseColors[org.licenseType] || licenseColors.ESSAI_GRATUIT;
          return (
            <div key={org.id} className="rounded-md p-5"
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #E9ECEF',
                boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
                opacity: org.isActive ? 1 : 0.6,
              }}>
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 mb-4">
                <div className="flex flex-wrap items-center gap-2 sm:gap-3 min-w-0">
                  <h3 className="font-semibold break-words" style={{ color: '#2C3E50' }}>
                    {org.name}
                  </h3>
                  {org.isInternal && (
                    <span className="text-xs px-2 py-0.5 rounded font-medium"
                      style={{ backgroundColor: '#2C3E50', color: '#FFFFFF' }}>
                      CORO interne
                    </span>
                  )}
                  {!org.isActive && (
                    <span className="text-xs px-2 py-0.5 rounded font-medium"
                      style={{ backgroundColor: '#FDEDEC', color: '#C0392B', border: '1px solid #F1948A' }}>
                      Suspendue
                    </span>
                  )}
                </div>
                {!org.isInternal && (
                  <select
                    value={org.licenseType}
                    onChange={e => handleChangeLicense(org.id, e.target.value)}
                    className="w-full sm:w-auto text-xs px-2.5 py-2 sm:py-1.5 rounded-full font-medium focus:outline-none whitespace-nowrap"
                    style={{ backgroundColor: lc.bg, color: lc.text, border: `1px solid ${lc.border}` }}
                  >
                    <option value="ESSAI_GRATUIT">Essai gratuit</option>
                    <option value="STANDARD">Standard</option>
                    <option value="ENTREPRISE">Entreprise</option>
                  </select>
                )}
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-sm mb-4" style={{ color: '#6C757D' }}>
                <div className="rounded px-3 py-2" style={{ backgroundColor: '#F8F9FA' }}><span className="font-medium">{org._count.users}</span> utilisateur{org._count.users !== 1 ? 's' : ''}</div>
                <div className="rounded px-3 py-2" style={{ backgroundColor: '#F8F9FA' }}><span className="font-medium">{org._count.projects}</span> projet{org._count.projects !== 1 ? 's' : ''}</div>
                <div className="rounded px-3 py-2" style={{ backgroundColor: '#F8F9FA' }}><span className="font-medium">{org._count.clients}</span> client{org._count.clients !== 1 ? 's' : ''}</div>
                <div className="rounded px-3 py-2" style={{ backgroundColor: '#F8F9FA' }}><span className="font-medium">{org._count.buildings}</span> bâtiment{org._count.buildings !== 1 ? 's' : ''}</div>
              </div>

              {!org.isInternal && (
                <button
                  onClick={() => handleToggleActive(org.id, !org.isActive)}
                  className="w-full sm:w-auto text-xs font-medium px-3 py-2 sm:py-1.5 rounded transition-colors"
                  style={{
                    border: `1px solid ${org.isActive ? '#DEE2E6' : '#A9DFBF'}`,
                    color: org.isActive ? '#6C757D' : '#27AE60',
                  }}
                >
                  {org.isActive ? 'Suspendre' : 'Réactiver'}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <div className="w-full max-w-lg max-h-[calc(100vh-2rem)] overflow-y-auto rounded-md p-5 sm:p-8"
            style={{ backgroundColor: '#FFFFFF', boxShadow: '0 8px 32px rgba(0,0,0,0.15)' }}>
            <h3 className="font-semibold text-lg mb-6" style={{ color: '#2C3E50' }}>
              Nouvelle organisation cliente
            </h3>

            {error && (
              <div className="rounded p-3 mb-4 text-sm" style={{ backgroundColor: '#FDEDEC', color: '#C0392B', border: '1px solid #F1948A' }}>
                {error}
              </div>
            )}

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: '#495057' }}>
                  Nom de l'organisation *
                </label>
                <input
                  type="text" required
                  value={form.organizationName}
                  onChange={e => setForm({ ...form, organizationName: e.target.value })}
                  placeholder="Ex: Firme Sécurité ABC"
                  className="w-full rounded px-4 py-2.5 text-sm focus:outline-none"
                  style={{ border: '1px solid #CED4DA', color: '#2C3E50' }}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: '#495057' }}>
                  Niveau de licence
                </label>
                <select
                  value={form.licenseType}
                  onChange={e => setForm({ ...form, licenseType: e.target.value })}
                  className="w-full rounded px-4 py-2.5 text-sm focus:outline-none"
                  style={{ border: '1px solid #CED4DA', color: '#2C3E50' }}
                >
                  <option value="ESSAI_GRATUIT">Essai gratuit</option>
                  <option value="STANDARD">Standard</option>
                  <option value="ENTREPRISE">Entreprise</option>
                </select>
              </div>

              <div className="h-px my-2" style={{ backgroundColor: '#E9ECEF' }} />
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#ADB5BD' }}>
                Premier utilisateur (administrateur)
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: '#495057' }}>
                    Prénom *
                  </label>
                  <input
                    type="text" required
                    value={form.adminFirstName}
                    onChange={e => setForm({ ...form, adminFirstName: e.target.value })}
                    className="w-full rounded px-4 py-2.5 text-sm focus:outline-none"
                    style={{ border: '1px solid #CED4DA', color: '#2C3E50' }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: '#495057' }}>
                    Nom *
                  </label>
                  <input
                    type="text" required
                    value={form.adminLastName}
                    onChange={e => setForm({ ...form, adminLastName: e.target.value })}
                    className="w-full rounded px-4 py-2.5 text-sm focus:outline-none"
                    style={{ border: '1px solid #CED4DA', color: '#2C3E50' }}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: '#495057' }}>
                  Courriel *
                </label>
                <input
                  type="email" required
                  value={form.adminEmail}
                  onChange={e => setForm({ ...form, adminEmail: e.target.value })}
                  className="w-full rounded px-4 py-2.5 text-sm focus:outline-none"
                  style={{ border: '1px solid #CED4DA', color: '#2C3E50' }}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: '#495057' }}>
                  Mot de passe temporaire *
                </label>
                <input
                  type="text" required
                  value={form.adminPassword}
                  onChange={e => setForm({ ...form, adminPassword: e.target.value })}
                  placeholder="À transmettre au client, à changer après connexion"
                  className="w-full rounded px-4 py-2.5 text-sm focus:outline-none"
                  style={{ border: '1px solid #CED4DA', color: '#2C3E50' }}
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 font-medium py-2.5 rounded text-sm transition-colors"
                  style={{ border: '1px solid #DEE2E6', color: '#6C757D' }}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 text-white font-medium py-2.5 rounded text-sm disabled:opacity-50"
                  style={{ backgroundColor: '#C0392B' }}
                >
                  {creating ? 'Création...' : 'Créer l\'organisation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}