'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';
import api from '@/lib/api';

interface Client {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  province?: string;
  logoBase64?: string;
  buildings: any[];
  projects: any[];
}

export default function ClientDetailPage() {
  const router = useRouter();
  const params = useParams();
  const clientId = params.id as string;
  const { isAuthenticated, initAuth } = useAuthStore();
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState<any>({});
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const navItems = [
    { label: 'Dashboard', path: '/dashboard' },
    { label: 'Projets', path: '/projects' },
    { label: 'Clients', path: '/clients', active: true },
    { label: 'Batiments', path: '/buildings' },
    { label: 'Bibliotheque', path: '/library' },
    { label: 'Parametres', path: '/settings' },
  ];

  useEffect(() => { initAuth(); }, []);

  useEffect(() => {
    if (isAuthenticated) fetchClient();
    else {
      const token = localStorage.getItem('coro_token');
      if (!token) router.push('/login');
    }
  }, [isAuthenticated]);

  const fetchClient = async () => {
    try {
      const res = await api.get(`/clients/${clientId}`);
      setClient(res.data);
      setForm({
        name: res.data.name || '',
        email: res.data.email || '',
        phone: res.data.phone || '',
        address: res.data.address || '',
        city: res.data.city || '',
        province: res.data.province || '',
      });
      if (res.data.logoBase64) setLogoPreview(res.data.logoBase64);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put(`/clients/${clientId}`, form);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert('Le logo doit faire moins de 2MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (ev) => {
      const base64 = ev.target?.result as string;
      setLogoPreview(base64);
      try {
        await api.put(`/clients/${clientId}/logo`, { logoBase64: base64 });
      } catch (err) {
        console.error(err);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = async () => {
    setLogoPreview(null);
    try {
      await api.put(`/clients/${clientId}/logo`, { logoBase64: null });
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <p className="text-gray-400">Chargement...</p>
    </div>
  );

  if (!client) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <p className="text-gray-400">Client introuvable</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-950">
      <div className="bg-gray-900 border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white cursor-pointer" onClick={() => router.push('/dashboard')}>
          CO<span className="text-orange-500">RO</span>
        </h1>
        <button onClick={() => { useAuthStore.getState().logout(); router.push('/login'); }}
          className="text-gray-400 hover:text-white text-sm">Deconnexion</button>
      </div>

      <div className="flex">
        <div className="w-64 min-h-screen bg-gray-900 border-r border-gray-800 p-4">
          <nav className="space-y-1">
            {navItems.map((item) => (
              <button key={item.label} onClick={() => router.push(item.path)}
                className={`w-full text-left px-4 py-2.5 rounded-lg text-sm cursor-pointer transition-colors ${
                  item.active ? 'bg-orange-500/10 text-orange-400 font-medium'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}>
                {item.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="flex-1 p-8 max-w-4xl">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <button onClick={() => router.push('/clients')}
                className="text-gray-500 hover:text-gray-300 text-sm mb-3 flex items-center gap-1">
                ← Retour aux clients
              </button>
              <h2 className="text-2xl font-semibold text-white">{client.name}</h2>
            </div>
            <button onClick={handleSave} disabled={saving}
              className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-medium px-6 py-2.5 rounded-lg transition-colors">
              {saving ? 'Sauvegarde...' : saved ? '✓ Sauvegarde!' : 'Sauvegarder'}
            </button>
          </div>

          <div className="grid grid-cols-3 gap-6">
            {/* Logo client */}
            <div className="col-span-1">
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                <h3 className="text-white font-semibold mb-4">Logo du client</h3>

                <div className="flex flex-col items-center gap-4">
                  {logoPreview ? (
                    <div className="relative">
                      <div className="w-32 h-32 rounded-xl overflow-hidden bg-white flex items-center justify-center border border-gray-700">
                        <img src={logoPreview} alt="Logo client"
                          className="w-full h-full object-contain p-2"/>
                      </div>
                      <button onClick={handleRemoveLogo}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600">
                        ✕
                      </button>
                    </div>
                  ) : (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="w-32 h-32 rounded-xl border-2 border-dashed border-gray-700 flex flex-col items-center justify-center cursor-pointer hover:border-orange-500/50 transition-colors">
                      <span className="text-3xl mb-2">🏢</span>
                      <span className="text-gray-500 text-xs text-center">Cliquer pour ajouter</span>
                    </div>
                  )}

                  <button onClick={() => fileInputRef.current?.click()}
                    className="w-full bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm py-2 rounded-lg transition-colors">
                    {logoPreview ? 'Changer le logo' : 'Ajouter un logo'}
                  </button>

                  <p className="text-gray-600 text-xs text-center">
                    PNG, JPG, SVG<br/>Max 2MB
                  </p>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"/>
                </div>
              </div>

              {/* Stats */}
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mt-4">
                <h3 className="text-white font-semibold mb-4">Statistiques</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-400 text-sm">Batiments</span>
                    <span className="text-white font-bold">{client.buildings?.length || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400 text-sm">Projets</span>
                    <span className="text-white font-bold">{client.projects?.length || 0}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Formulaire info client */}
            <div className="col-span-2">
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                <h3 className="text-white font-semibold mb-6">Informations du client</h3>
                <div className="space-y-4">
                  {[
                    { label: 'Nom du client *', key: 'name', required: true },
                    { label: 'Courriel', key: 'email' },
                    { label: 'Telephone', key: 'phone' },
                    { label: 'Adresse', key: 'address' },
                    { label: 'Ville', key: 'city' },
                    { label: 'Province', key: 'province' },
                  ].map((field) => (
                    <div key={field.key}>
                      <label className="block text-sm text-gray-400 mb-1">{field.label}</label>
                      <input
                        type="text"
                        value={form[field.key] || ''}
                        onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-orange-500 transition-colors"/>
                    </div>
                  ))}
                </div>
              </div>

              {/* Batiments associes */}
              {client.buildings?.length > 0 && (
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mt-4">
                  <h3 className="text-white font-semibold mb-4">Batiments associes</h3>
                  <div className="space-y-2">
                    {client.buildings.map((building: any) => (
                      <div key={building.id}
                        onClick={() => router.push('/buildings')}
                        className="flex items-center justify-between bg-gray-800 rounded-lg px-4 py-3 cursor-pointer hover:bg-gray-750 transition-colors">
                        <div>
                          <p className="text-white text-sm font-medium">{building.name}</p>
                          <p className="text-gray-400 text-xs">{building.address}, {building.city}</p>
                        </div>
                        <span className="text-gray-500 text-xs">→</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}