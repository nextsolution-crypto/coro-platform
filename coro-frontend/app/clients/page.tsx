'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';
import api from '@/lib/api';

interface Client {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  city?: string;
  province?: string;
  _count?: { buildings: number; projects: number };
}

export default function ClientsPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    name: '', email: '', phone: '', address: '', city: '', province: '',
  });

  useEffect(() => {
    if (!isAuthenticated) { router.push('/login'); return; }
    fetchClients();
  }, [isAuthenticated]);

  const fetchClients = async () => {
    try {
      const res = await api.get('/clients');
      setClients(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/clients', form);
      setShowModal(false);
      setForm({ name: '', email: '', phone: '', address: '', city: '', province: '' });
      fetchClients();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Topbar */}
      <div className="bg-gray-900 border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white cursor-pointer" onClick={() => router.push('/dashboard')}>
          CO<span className="text-orange-500">RO</span>
        </h1>
        <button onClick={() => { useAuthStore.getState().logout(); router.push('/login'); }}
          className="text-gray-400 hover:text-white text-sm">Déconnexion</button>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <div className="w-64 min-h-screen bg-gray-900 border-r border-gray-800 p-4">
          <nav className="space-y-1">
            {[
              { label: 'Dashboard', path: '/dashboard' },
              { label: 'Projets', path: '/projects' },
              { label: 'Clients', path: '/clients', active: true },
              { label: 'Bâtiments', path: '/buildings' },
              { label: 'Bibliothèque', path: '/library' },
              { label: 'Paramètres', path: '/settings' },
            ].map((item) => (
              <div key={item.label} onClick={() => router.push(item.path)}
                className={`px-4 py-2.5 rounded-lg text-sm cursor-pointer transition-colors ${
                  item.active ? 'bg-orange-500/10 text-orange-400 font-medium'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}>
                {item.label}
              </div>
            ))}
          </nav>
        </div>

        {/* Contenu */}
        <div className="flex-1 p-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-semibold text-white">Clients</h2>
              <p className="text-gray-400 mt-1">{clients.length} client{clients.length !== 1 ? 's' : ''}</p>
            </div>
            <button onClick={() => setShowModal(true)}
              className="bg-orange-500 hover:bg-orange-600 text-white font-medium px-4 py-2 rounded-lg transition-colors">
              + Nouveau client
            </button>
          </div>

          {/* Liste clients */}
          {loading ? (
            <div className="text-center py-12"><p className="text-gray-500">Chargement...</p></div>
          ) : clients.length === 0 ? (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center">
              <p className="text-gray-500 mb-4">Aucun client pour l'instant</p>
              <button onClick={() => setShowModal(true)}
                className="bg-orange-500 hover:bg-orange-600 text-white font-medium px-4 py-2 rounded-lg">
                Créer le premier client
              </button>
            </div>
          ) : (
            <div className="grid gap-4">
              {clients.map((client) => (
                <div key={client.id} className="bg-gray-900 border border-gray-800 rounded-xl p-6 flex items-center justify-between hover:border-gray-700 transition-colors">
                  <div>
                    <h3 className="text-white font-semibold">{client.name}</h3>
                    <div className="flex gap-4 mt-1">
                      {client.email && <span className="text-gray-400 text-sm">{client.email}</span>}
                      {client.city && <span className="text-gray-400 text-sm">{client.city}, {client.province}</span>}
                    </div>
                  </div>
                  <div className="flex gap-6 text-center">
                    <div>
                      <p className="text-white font-bold">{client._count?.buildings || 0}</p>
                      <p className="text-gray-500 text-xs">Bâtiments</p>
                    </div>
                    <div>
                      <p className="text-white font-bold">{client._count?.projects || 0}</p>
                      <p className="text-gray-500 text-xs">Projets</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal création client */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 w-full max-w-md">
            <h3 className="text-white font-semibold text-lg mb-6">Nouveau client</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              {[
                { label: 'Nom *', key: 'name', required: true },
                { label: 'Courriel', key: 'email' },
                { label: 'Téléphone', key: 'phone' },
                { label: 'Adresse', key: 'address' },
                { label: 'Ville', key: 'city' },
                { label: 'Province', key: 'province' },
              ].map((field) => (
                <div key={field.key}>
                  <label className="block text-sm text-gray-400 mb-1">{field.label}</label>
                  <input
                    type="text"
                    value={(form as any)[field.key]}
                    onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
                    required={field.required}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-orange-500 transition-colors"
                  />
                </div>
              ))}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 bg-gray-800 hover:bg-gray-700 text-white font-medium py-2.5 rounded-lg transition-colors">
                  Annuler
                </button>
                <button type="submit"
                  className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-medium py-2.5 rounded-lg transition-colors">
                  Créer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}