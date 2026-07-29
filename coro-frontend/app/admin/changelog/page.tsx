'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';
import api from '@/lib/api';
import AppLayout from '@/components/layout/AppLayout';

interface ChangelogEntry {
  id: string;
  title: string;
  description: string;
  entryDate: string;
}

export default function ChangelogAdminPage() {
  const router = useRouter();
  const { user, isAuthenticated, initAuth } = useAuthStore();

  const [entries, setEntries] = useState<ChangelogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', entryDate: new Date().toISOString().split('T')[0] });

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
      const res = await api.get('/changelog');
      setEntries(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      await api.post('/changelog', form);
      setShowModal(false);
      setForm({ title: '', description: '', entryDate: new Date().toISOString().split('T')[0] });
      fetchData();
    } catch (err) {
      console.error(err);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/changelog/${id}`);
      fetchData();
    } catch (err) { console.error(err); }
  };

  const formatDate = (iso: string) => {
    const date = new Date(iso);
    return date.toLocaleDateString('fr-CA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    });
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
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-semibold" style={{ color: '#2C3E50' }}>
            Changelog
          </h2>
          <p className="text-sm mt-1" style={{ color: '#6C757D' }}>
            Historique des fonctionnalités ajoutées à CORO
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="text-white text-sm font-medium px-4 py-2 rounded transition-colors"
          style={{ backgroundColor: '#C0392B' }}
          onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#A93226')}
          onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#C0392B')}
        >
          + Nouvelle entrée
        </button>
      </div>

      {entries.length === 0 ? (
        <div className="rounded-md p-12 text-center" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E9ECEF' }}>
          <p className="text-sm" style={{ color: '#ADB5BD' }}>Aucune entrée pour l'instant</p>
        </div>
      ) : (
        <div className="space-y-3">
          {entries.map(entry => (
            <div key={entry.id} className="rounded-md p-5 group"
              style={{ backgroundColor: '#FFFFFF', border: '1px solid #E9ECEF', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold" style={{ color: '#2C3E50' }}>{entry.title}</h3>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="text-xs" style={{ color: '#ADB5BD' }}>{formatDate(entry.entryDate)}</span>
                  <button
                    onClick={() => handleDelete(entry.id)}
                    className="text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ color: '#C0392B' }}
                  >
                    Supprimer
                  </button>
                </div>
              </div>
              <p className="text-sm whitespace-pre-line" style={{ color: '#495057' }}>
                {entry.description}
              </p>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <div className="w-full max-w-lg rounded-md p-8"
            style={{ backgroundColor: '#FFFFFF', boxShadow: '0 8px 32px rgba(0,0,0,0.15)' }}>
            <h3 className="font-semibold text-lg mb-6" style={{ color: '#2C3E50' }}>
              Nouvelle entrée de changelog
            </h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: '#495057' }}>Date *</label>
                <input type="date" required value={form.entryDate}
                  onChange={e => setForm({ ...form, entryDate: e.target.value })}
                  className="w-full rounded px-4 py-2.5 text-sm focus:outline-none"
                  style={{ border: '1px solid #CED4DA', color: '#2C3E50' }} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: '#495057' }}>Titre *</label>
                <input type="text" required value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })}
                  placeholder="Ex: Fondation multi-tenant"
                  className="w-full rounded px-4 py-2.5 text-sm focus:outline-none"
                  style={{ border: '1px solid #CED4DA', color: '#2C3E50' }} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: '#495057' }}>Description *</label>
                <textarea required value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  rows={6}
                  placeholder="Décrit ce qui a changé, en langage clair..."
                  className="w-full rounded px-4 py-2.5 text-sm focus:outline-none resize-vertical"
                  style={{ border: '1px solid #CED4DA', color: '#2C3E50' }} />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 font-medium py-2.5 rounded text-sm transition-colors"
                  style={{ border: '1px solid #DEE2E6', color: '#6C757D' }}>
                  Annuler
                </button>
                <button type="submit" disabled={creating}
                  className="flex-1 text-white font-medium py-2.5 rounded text-sm disabled:opacity-50"
                  style={{ backgroundColor: '#C0392B' }}>
                  {creating ? 'Ajout...' : 'Ajouter'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
