'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';
import api from '@/lib/api';
import AppLayout from '@/components/layout/AppLayout';

interface TeamUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  isActive: boolean;
  createdAt: string;
}

const roleLabels: Record<string, string> = {
  SUPER_ADMIN: 'Super-admin',
  ADMIN: 'Administrateur',
  OPERATOR: 'Opérateur',
};

export default function TeamUsersPage() {
  const router = useRouter();
  const { user, isAuthenticated, initAuth } = useAuthStore();

  const [users, setUsers] = useState<TeamUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [maxUsers, setMaxUsers] = useState<number | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', password: '', role: 'OPERATOR',
  });

  useEffect(() => { initAuth(); }, []);

  useEffect(() => {
    if (isAuthenticated) {
      if (user?.role !== 'ADMIN' && user?.role !== 'SUPER_ADMIN') {
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
      const [usersRes, orgRes] = await Promise.all([
        api.get('/users/organization'),
        api.get('/organizations/me/info'),
      ]);
      setUsers(usersRes.data);

      const limits: Record<string, number | null> = {
        ESSAI_GRATUIT: 1, STANDARD: null, ENTREPRISE: null,
      };
      setMaxUsers(limits[orgRes.data.licenseType] ?? null);
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
      await api.post('/users/organization', form);
      setShowModal(false);
      setForm({ firstName: '', lastName: '', email: '', password: '', role: 'OPERATOR' });
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors de la création.');
    } finally {
      setCreating(false);
    }
  };

  const handleToggleActive = async (userId: string, isActive: boolean) => {
    try {
      await api.put(`/users/organization/${userId}/active`, { isActive });
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
            Membres de l'équipe
          </h2>
          <p className="text-sm mt-1" style={{ color: '#6C757D' }}>
            {users.length} / {maxUsers === null ? 'illimité' : maxUsers} membre{users.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          disabled={maxUsers !== null && users.length >= maxUsers}
          title={maxUsers !== null && users.length >= maxUsers ? `Limite de ${maxUsers} membre(s) atteinte pour votre licence` : ''}
          className="w-full sm:w-auto text-white text-sm font-medium px-4 py-2 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ backgroundColor: '#C0392B' }}
          onMouseEnter={e => { if (!(maxUsers !== null && users.length >= maxUsers)) e.currentTarget.style.backgroundColor = '#A93226'; }}
          onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#C0392B')}
        >
          + Ajouter un membre
        </button>
      </div>

      {maxUsers !== null && users.length >= maxUsers && (
        <div className="rounded-md p-4 mb-6 flex items-start gap-3"
          style={{ backgroundColor: '#FEF9E7', border: '1px solid #FAD7A0' }}>
          <span style={{ color: '#F39C12', fontSize: '18px' }}>⚠</span>
          <p className="text-sm" style={{ color: '#7D6608' }}>
            Vous avez atteint la limite de membres pour votre licence actuelle. Contactez CORO pour mettre à niveau votre abonnement.
          </p>
        </div>
      )}

      {/* MOBILE — cartes */}
      <div className="md:hidden space-y-3">
        {users.map(u => (
          <div
            key={u.id}
            className="rounded-md p-4"
            style={{ backgroundColor: '#FFFFFF', border: '1px solid #E9ECEF' }}
          >
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="min-w-0">
                <p className="font-semibold text-sm break-words" style={{ color: '#2C3E50' }}>
                  {u.firstName} {u.lastName}
                  {u.id === user?.id && (
                    <span className="ml-2 text-xs font-normal" style={{ color: '#ADB5BD' }}>
                      (vous)
                    </span>
                  )}
                </p>
                <p className="text-xs mt-1 break-all" style={{ color: '#6C757D' }}>
                  {u.email}
                </p>
              </div>

              <span
                className="text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap flex-shrink-0"
                style={
                  u.isActive
                    ? { backgroundColor: '#EAFAF1', color: '#27AE60', border: '1px solid #A9DFBF' }
                    : { backgroundColor: '#FDEDEC', color: '#C0392B', border: '1px solid #F1948A' }
                }
              >
                {u.isActive ? 'Actif' : 'Désactivé'}
              </span>
            </div>

            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-wide" style={{ color: '#ADB5BD' }}>
                  Rôle
                </p>
                <p className="text-xs font-medium mt-0.5" style={{ color: '#495057' }}>
                  {roleLabels[u.role] || u.role}
                </p>
              </div>

              {u.id !== user?.id && (
                <button
                  onClick={() => handleToggleActive(u.id, !u.isActive)}
                  className="text-xs font-medium px-3 py-2 rounded transition-colors whitespace-nowrap"
                  style={{
                    border: `1px solid ${u.isActive ? '#DEE2E6' : '#A9DFBF'}`,
                    color: u.isActive ? '#6C757D' : '#27AE60',
                  }}
                >
                  {u.isActive ? 'Désactiver' : 'Réactiver'}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* TABLETTE + DESKTOP — tableau */}
      <div className="hidden md:block rounded-md overflow-x-auto" style={{ border: '1px solid #E9ECEF' }}>
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr style={{ backgroundColor: '#F8F9FA' }}>
              {['Nom', 'Courriel', 'Rôle', 'Statut', ''].map(col => (
                <th
                  key={col}
                  className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide whitespace-nowrap"
                  style={{ color: '#6C757D', borderBottom: '1px solid #E9ECEF' }}
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.map((u, idx) => (
              <tr key={u.id} style={{ backgroundColor: idx % 2 === 0 ? '#FFFFFF' : '#F8F9FA' }}>
                <td className="px-4 py-3 whitespace-nowrap" style={{ color: '#2C3E50', fontWeight: 600 }}>
                  {u.firstName} {u.lastName}
                  {u.id === user?.id && (
                    <span className="ml-2 text-xs" style={{ color: '#ADB5BD' }}>(vous)</span>
                  )}
                </td>

                <td className="px-4 py-3" style={{ color: '#495057' }}>
                  {u.email}
                </td>

                <td className="px-4 py-3 whitespace-nowrap" style={{ color: '#6C757D' }}>
                  {roleLabels[u.role] || u.role}
                </td>

                <td className="px-4 py-3 whitespace-nowrap">
                  <span
                    className="text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap inline-flex"
                    style={
                      u.isActive
                        ? { backgroundColor: '#EAFAF1', color: '#27AE60', border: '1px solid #A9DFBF' }
                        : { backgroundColor: '#FDEDEC', color: '#C0392B', border: '1px solid #F1948A' }
                    }
                  >
                    {u.isActive ? 'Actif' : 'Désactivé'}
                  </span>
                </td>

                <td className="px-4 py-3 text-right whitespace-nowrap">
                  {u.id !== user?.id && (
                    <button
                      onClick={() => handleToggleActive(u.id, !u.isActive)}
                      className="text-xs font-medium px-3 py-1.5 rounded transition-colors whitespace-nowrap"
                      style={{
                        border: `1px solid ${u.isActive ? '#DEE2E6' : '#A9DFBF'}`,
                        color: u.isActive ? '#6C757D' : '#27AE60',
                      }}
                    >
                      {u.isActive ? 'Désactiver' : 'Réactiver'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <div className="w-full max-w-md max-h-[calc(100vh-2rem)] overflow-y-auto rounded-md p-5 sm:p-8"
            style={{ backgroundColor: '#FFFFFF', boxShadow: '0 8px 32px rgba(0,0,0,0.15)' }}>
            <h3 className="font-semibold text-lg mb-6" style={{ color: '#2C3E50' }}>
              Ajouter un membre
            </h3>

            {error && (
              <div className="rounded p-3 mb-4 text-sm" style={{ backgroundColor: '#FDEDEC', color: '#C0392B', border: '1px solid #F1948A' }}>
                {error}
              </div>
            )}

            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: '#495057' }}>Prénom *</label>
                  <input type="text" required value={form.firstName}
                    onChange={e => setForm({ ...form, firstName: e.target.value })}
                    className="w-full rounded px-4 py-2.5 text-sm focus:outline-none"
                    style={{ border: '1px solid #CED4DA', color: '#2C3E50' }} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: '#495057' }}>Nom *</label>
                  <input type="text" required value={form.lastName}
                    onChange={e => setForm({ ...form, lastName: e.target.value })}
                    className="w-full rounded px-4 py-2.5 text-sm focus:outline-none"
                    style={{ border: '1px solid #CED4DA', color: '#2C3E50' }} />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: '#495057' }}>Courriel *</label>
                <input type="email" required value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  className="w-full rounded px-4 py-2.5 text-sm focus:outline-none"
                  style={{ border: '1px solid #CED4DA', color: '#2C3E50' }} />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: '#495057' }}>Mot de passe temporaire *</label>
                <input type="text" required value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  placeholder="À transmettre au membre"
                  className="w-full rounded px-4 py-2.5 text-sm focus:outline-none"
                  style={{ border: '1px solid #CED4DA', color: '#2C3E50' }} />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: '#495057' }}>Rôle</label>
                <select value={form.role}
                  onChange={e => setForm({ ...form, role: e.target.value })}
                  className="w-full rounded px-4 py-2.5 text-sm focus:outline-none"
                  style={{ border: '1px solid #CED4DA', color: '#2C3E50' }}>
                  <option value="OPERATOR">Opérateur</option>
                  <option value="ADMIN">Administrateur</option>
                </select>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 font-medium py-2.5 rounded text-sm transition-colors"
                  style={{ border: '1px solid #DEE2E6', color: '#6C757D' }}>
                  Annuler
                </button>
                <button type="submit" disabled={creating}
                  className="flex-1 text-white font-medium py-2.5 rounded text-sm disabled:opacity-50"
                  style={{ backgroundColor: '#C0392B' }}>
                  {creating ? 'Création...' : 'Ajouter'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}