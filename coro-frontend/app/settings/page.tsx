'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';
import api from '@/lib/api';

export default function SettingsPage() {
  const router = useRouter();
  const { isAuthenticated, initAuth, user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    companyName: '',
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const navItems = [
    { label: 'Dashboard', path: '/dashboard' },
    { label: 'Projets', path: '/projects' },
    { label: 'Clients', path: '/clients' },
    { label: 'Batiments', path: '/buildings' },
    { label: 'Bibliotheque', path: '/library' },
    { label: 'Parametres', path: '/settings', active: true },
  ];

  useEffect(() => { initAuth(); }, []);

  useEffect(() => {
    if (isAuthenticated) fetchUser();
    else {
      const token = localStorage.getItem('coro_token');
      if (!token) router.push('/login');
    }
  }, [isAuthenticated]);

  const fetchUser = async () => {
    try {
      const res = await api.get('/users/me');
      setForm({
        firstName: res.data.firstName || '',
        lastName: res.data.lastName || '',
        email: res.data.email || '',
        companyName: res.data.companyName || '',
      });
      if (res.data.companyLogoB64) setLogoPreview(res.data.companyLogoB64);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/users/me', form);
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
        await api.put('/users/me/logo', { companyLogoB64: base64 });
      } catch (err) {
        console.error(err);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = async () => {
    setLogoPreview(null);
    try {
      await api.put('/users/me/logo', { companyLogoB64: null });
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <p className="text-gray-400">Chargement...</p>
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
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-semibold text-white">Parametres</h2>
              <p className="text-gray-400 mt-1">Profil et configuration de votre entreprise</p>
            </div>
            <button onClick={handleSave} disabled={saving}
              className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-medium px-6 py-2.5 rounded-lg transition-colors">
              {saving ? 'Sauvegarde...' : saved ? '✓ Sauvegarde!' : 'Sauvegarder'}
            </button>
          </div>

          <div className="grid grid-cols-3 gap-6">
            {/* Logo entreprise */}
            <div className="col-span-1">
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                <h3 className="text-white font-semibold mb-1">Logo entreprise</h3>
                <p className="text-gray-500 text-xs mb-4">Apparaitra sur tous les documents generes</p>

                <div className="flex flex-col items-center gap-4">
                  {logoPreview ? (
                    <div className="relative">
                      <div className="w-32 h-32 rounded-xl overflow-hidden bg-white flex items-center justify-center border border-gray-700">
                        <img src={logoPreview} alt="Logo entreprise"
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
                      <span className="text-3xl mb-2">🏭</span>
                      <span className="text-gray-500 text-xs text-center">Cliquer pour ajouter</span>
                    </div>
                  )}

                  <button onClick={() => fileInputRef.current?.click()}
                    className="w-full bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm py-2 rounded-lg transition-colors">
                    {logoPreview ? 'Changer le logo' : 'Ajouter un logo'}
                  </button>

                  <p className="text-gray-600 text-xs text-center">PNG, JPG, SVG<br/>Max 2MB</p>

                  <input ref={fileInputRef} type="file" accept="image/*"
                    onChange={handleLogoUpload} className="hidden"/>
                </div>
              </div>
            </div>

            {/* Infos profil et entreprise */}
            <div className="col-span-2 space-y-6">
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                <h3 className="text-white font-semibold mb-4">Informations entreprise</h3>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Nom de l entreprise</label>
                  <input type="text" value={form.companyName}
                    onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                    placeholder="Ex: GardaWorld, Sécurité Plus, etc."
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-orange-500"/>
                </div>
              </div>

              <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                <h3 className="text-white font-semibold mb-4">Profil utilisateur</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Prenom</label>
                    <input type="text" value={form.firstName}
                      onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-orange-500"/>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Nom</label>
                    <input type="text" value={form.lastName}
                      onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-orange-500"/>
                  </div>
                </div>
                <div className="mt-4">
                  <label className="block text-sm text-gray-400 mb-1">Courriel</label>
                  <input type="email" value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-orange-500"/>
                </div>
              </div>

              {/* Version CORO */}
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                <h3 className="text-white font-semibold mb-3">A propos de CORO</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-400 text-sm">Version</span>
                    <span className="text-white text-sm font-mono">1.0.0-MVP</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400 text-sm">Environnement</span>
                    <span className="text-green-400 text-sm font-mono">Local</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400 text-sm">Base de donnees</span>
                    <span className="text-green-400 text-sm font-mono">PostgreSQL ✓</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}