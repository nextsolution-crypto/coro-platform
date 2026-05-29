'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';
import api from '@/lib/api';

interface Building {
  id: string;
  name: string;
  address: string;
  city: string;
  province: string;
  floors?: number;
  buildingType?: string;
  client: { id: string; name: string };
  _count?: { projects: number };
}

interface Client {
  id: string;
  name: string;
}

export default function BuildingsPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    name: '', address: '', city: '', province: '',
    postalCode: '', floors: '', buildingType: '', clientId: '',
  });

  const buildingTypes = [
    'Tour à bureaux', 'Immeuble résidentiel', 'Industriel',
    'Commercial', 'Institutionnel', 'Hôtel', 'Centre commercial', 'Autre',
  ];

  useEffect(() => {
    if (!isAuthenticated) { router.push('/login'); return; }
    fetchData();
  }, [isAuthenticated]);

  const fetchData = async () => {
    try {
      const [buildingsRes, clientsRes] = await Promise.all([
        api.get('/buildings'),
        api.get('/clients'),
      ]);
      setBuildings(buildingsRes.data);
      setClients(clientsRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/buildings', {
        ...form,
        floors: form.floors ? parseInt(form.floors) : undefined,
      });
      setShowModal(false);
      setForm({
        name: '', address: '', city: '', province: '',
        postalCode: '', floors: '', buildingType: '', clientId: '',
      });
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const navItems = [
    { label: 'Dashboard', path: '/dashboard' },
    { label: 'Projets', path: '/projects' },
    { label: 'Clients', path: '/clients' },
    { label: 'Batiments', path: '/buildings', active: true },
    { label: 'Bibliotheque', path: '/library' },
    { label: 'Parametres', path: '/settings' },
  ];

  return (
    <div className="min-h-screen bg-gray-950">
      <div className="bg-gray-900 border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white cursor-pointer" onClick={() => router.push('/dashboard')}>
          CO<span className="text-orange-500">RO</span>
        </h1>
        <button
          onClick={() => { useAuthStore.getState().logout(); router.push('/login'); }}
          className="text-gray-400 hover:text-white text-sm">
          Deconnexion
        </button>
      </div>

      <div className="flex">
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

        <div className="flex-1 p-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-semibold text-white">Batiments</h2>
              <p className="text-gray-400 mt-1">
                {buildings.length} batiment{buildings.length !== 1 ? 's' : ''}
              </p>
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="bg-orange-500 hover:bg-orange-600 text-white font-medium px-4 py-2 rounded-lg transition-colors">
              + Nouveau batiment
            </button>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <p className="text-gray-500">Chargement...</p>
            </div>
          ) : buildings.length === 0 ? (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center">
              <p className="text-gray-500 mb-4">Aucun batiment pour linstant</p>
              <button
                onClick={() => setShowModal(true)}
                className="bg-orange-500 hover:bg-orange-600 text-white font-medium px-4 py-2 rounded-lg">
                Creer le premier batiment
              </button>
            </div>
          ) : (
            <div className="grid gap-4">
              {buildings.map((building) => (
                <div
                  key={building.id}
                  className="bg-gray-900 border border-gray-800 rounded-xl p-6 flex items-center justify-between hover:border-gray-700 transition-colors cursor-pointer">
                  <div>
                    <h3 className="text-white font-semibold">{building.name}</h3>
                    <p className="text-gray-400 text-sm mt-1">
                      {building.address}, {building.city}, {building.province}
                    </p>
                    <div className="flex gap-3 mt-2">
                      {building.buildingType && (
                        <span className="bg-gray-800 text-gray-300 text-xs px-2 py-1 rounded">
                          {building.buildingType}
                        </span>
                      )}
                      {building.floors && (
                        <span className="bg-gray-800 text-gray-300 text-xs px-2 py-1 rounded">
                          {building.floors} etages
                        </span>
                      )}
                      <span className="bg-orange-500/10 text-orange-400 text-xs px-2 py-1 rounded">
                        {building.client.name}
                      </span>
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="text-white font-bold">{building._count?.projects || 0}</p>
                    <p className="text-gray-500 text-xs">Projets</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 w-full max-w-lg max-h-screen overflow-y-auto">
            <h3 className="text-white font-semibold text-lg mb-6">Nouveau batiment</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Client *</label>
                <select
                  value={form.clientId}
                  onChange={(e) => setForm({ ...form, clientId: e.target.value })}
                  required
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-orange-500">
                  <option value="">Selectionner un client</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Nom du batiment *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                  placeholder="Ex: Tour ABC"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-orange-500"/>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Type de batiment</label>
                <select
                  value={form.buildingType}
                  onChange={(e) => setForm({ ...form, buildingType: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-orange-500">
                  <option value="">Selectionner un type</option>
                  {buildingTypes.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Adresse *</label>
                <input
                  type="text"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  required
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-orange-500"/>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Ville *</label>
                  <input
                    type="text"
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    required
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-orange-500"/>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Province *</label>
                  <input
                    type="text"
                    value={form.province}
                    onChange={(e) => setForm({ ...form, province: e.target.value })}
                    required
                    placeholder="QC"
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-orange-500"/>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Code postal</label>
                  <input
                    type="text"
                    value={form.postalCode}
                    onChange={(e) => setForm({ ...form, postalCode: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-orange-500"/>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Nombre detages</label>
                  <input
                    type="number"
                    value={form.floors}
                    onChange={(e) => setForm({ ...form, floors: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-orange-500"/>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 bg-gray-800 hover:bg-gray-700 text-white font-medium py-2.5 rounded-lg">
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-medium py-2.5 rounded-lg">
                  Creer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}