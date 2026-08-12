'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';
import api from '@/lib/api';
import AppLayout from '@/components/layout/AppLayout';
import { formatPhone } from '@/lib/formatPhone';

interface Client {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  province?: string;
  logoBase64?: string;
  contactFirstName?: string;
  contactLastName?: string;
  contactEmail?: string;
  contactPhone?: string;
  buildings: any[];
  projects: any[];
}

export default function ClientDetailPage() {
  const router   = useRouter();
  const params   = useParams();
  const clientId = params.id as string;
  const { isAuthenticated, initAuth } = useAuthStore();

  const [client,      setClient]      = useState<Client | null>(null);
  const [loading,     setLoading]     = useState(true);
  const [saving,      setSaving]      = useState(false);
  const [saved,       setSaved]       = useState(false);
  const [form,        setForm]        = useState<any>({});
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
        name:               res.data.name               || '',
        email:              res.data.email              || '',
        phone:              res.data.phone              || '',
        address:            res.data.address            || '',
        city:               res.data.city               || '',
        province:           res.data.province           || '',
        contactFirstName:   res.data.contactFirstName   || '',
        contactLastName:    res.data.contactLastName    || '',
        contactEmail:       res.data.contactEmail       || '',
        contactPhone:       res.data.contactPhone       || '',
      });
      if (res.data.logoBase64) setLogoPreview(res.data.logoBase64);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put(`/clients/${clientId}`, form);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) { console.error(err); }
    finally { setSaving(false); }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { alert('Le logo doit faire moins de 2MB'); return; }
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const base64 = ev.target?.result as string;
      setLogoPreview(base64);
      try { await api.put(`/clients/${clientId}/logo`, { logoBase64: base64 }); }
      catch (err) { console.error(err); }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = async () => {
    setLogoPreview(null);
    try { await api.put(`/clients/${clientId}/logo`, { logoBase64: null }); }
    catch (err) { console.error(err); }
  };

  const inputStyle = {
    border: '1px solid #CED4DA',
    color: '#2C3E50',
    backgroundColor: '#FFFFFF',
  };

  const fields = [
    { label: 'Nom du client *', key: 'name', required: true },
    { label: 'Courriel général', key: 'email' },
    { label: 'Téléphone général', key: 'phone' },
    { label: 'Adresse', key: 'address' },
    { label: 'Ville', key: 'city' },
    { label: 'Province', key: 'province' },
  ];

  const contactFields = [
    { label: 'Prénom du contact *', key: 'contactFirstName', required: true },
    { label: 'Nom du contact *', key: 'contactLastName', required: true },
    { label: 'Courriel du contact *', key: 'contactEmail', required: true },
    { label: 'Téléphone du contact', key: 'contactPhone' },
  ];

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center"
      style={{ backgroundColor: '#F8F9FA' }}>
      <p className="text-sm animate-pulse" style={{ color: '#ADB5BD' }}>Chargement...</p>
    </div>
  );

  if (!client) return (
    <div className="min-h-screen flex items-center justify-center"
      style={{ backgroundColor: '#F8F9FA' }}>
      <p className="text-sm" style={{ color: '#ADB5BD' }}>Client introuvable</p>
    </div>
  );

  return (
    <AppLayout>
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-8">
        <div className="min-w-0">
          <button
            onClick={() => router.push('/clients')}
            className="text-sm mb-3 flex items-center gap-1 transition-colors"
            style={{ color: '#6C757D' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#2C3E50')}
            onMouseLeave={e => (e.currentTarget.style.color = '#6C757D')}
          >
            ← Retour aux clients
          </button>
          <h2 className="text-2xl font-semibold break-words" style={{ color: '#2C3E50' }}>
            {client.name}
          </h2>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
          <button
            onClick={() => router.push(`/clients/${clientId}/portfolio`)}
            className="w-full sm:w-auto justify-center text-sm font-medium px-4 py-2.5 rounded transition-colors flex items-center gap-2"
            style={{ border: '1px solid #DEE2E6', color: '#6C757D' }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F8F9FA'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            📅 Portefeuille
          </button>

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full sm:w-auto text-white font-medium px-6 py-2.5 rounded transition-colors disabled:opacity-50"
            style={{ backgroundColor: saved ? '#27AE60' : '#C0392B' }}
            onMouseEnter={e => {
              if (!saving) e.currentTarget.style.backgroundColor = saved ? '#1E8449' : '#A93226';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.backgroundColor = saved ? '#27AE60' : '#C0392B';
            }}
          >
            {saving ? 'Sauvegarde...' : saved ? '✓ Sauvegardé !' : 'Sauvegarder'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Colonne gauche */}
        <div className="lg:col-span-1 space-y-4">

          {/* Logo */}
          <div className="rounded-md p-4 sm:p-6"
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E9ECEF',
              boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
            }}>
            <h3 className="font-semibold mb-4" style={{ color: '#2C3E50' }}>
              Logo du client
            </h3>
            <div className="flex flex-col items-center gap-4">
              {logoPreview ? (
                <div className="relative">
                  <div className="w-32 h-32 rounded-md overflow-hidden flex items-center
                    justify-center bg-white"
                    style={{ border: '1px solid #E9ECEF' }}>
                    <img src={logoPreview} alt="Logo"
                      className="w-full h-full object-contain p-2" />
                  </div>
                  <button
                    onClick={handleRemoveLogo}
                    className="absolute -top-2 -right-2 text-white rounded-full w-6 h-6
                      flex items-center justify-center text-xs"
                    style={{ backgroundColor: '#C0392B' }}
                  >✕</button>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="w-32 h-32 rounded-md flex flex-col items-center
                    justify-center cursor-pointer transition-colors"
                  style={{ border: '2px dashed #CED4DA', backgroundColor: '#F8F9FA' }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = '#C0392B'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = '#CED4DA'}
                >
                  <span className="text-3xl mb-2">🏢</span>
                  <span className="text-xs text-center" style={{ color: '#ADB5BD' }}>
                    Cliquer pour ajouter
                  </span>
                </div>
              )}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full text-sm py-2 rounded font-medium transition-colors"
                style={{
                  border: '1px solid #DEE2E6',
                  color: '#6C757D',
                  backgroundColor: '#F8F9FA',
                }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#E9ECEF'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = '#F8F9FA'}
              >
                {logoPreview ? 'Changer le logo' : 'Ajouter un logo'}
              </button>
              <p className="text-xs text-center" style={{ color: '#CED4DA' }}>
                PNG, JPG, SVG — Max 2MB
              </p>
              <input ref={fileInputRef} type="file" accept="image/*"
                onChange={handleLogoUpload} className="hidden" />
            </div>
          </div>

          {/* Stats */}
          <div className="rounded-md p-4 sm:p-6"
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E9ECEF',
              boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
            }}>
            <h3 className="font-semibold mb-4" style={{ color: '#2C3E50' }}>
              Statistiques
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm" style={{ color: '#6C757D' }}>Bâtiments</span>
                <span className="font-bold" style={{ color: '#C0392B' }}>
                  {client.buildings?.length || 0}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm" style={{ color: '#6C757D' }}>Projets</span>
                <span className="font-bold" style={{ color: '#2980B9' }}>
                  {client.projects?.length || 0}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Colonne droite */}
        <div className="lg:col-span-2 space-y-4">

          {/* Formulaire */}
          <div className="rounded-md p-4 sm:p-6"
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E9ECEF',
              boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
            }}>
            <h3 className="font-semibold mb-6" style={{ color: '#2C3E50' }}>
              Informations du client
            </h3>
            <div className="space-y-4">
              {fields.map(field => (
                <div key={field.key}>
                  <label className="block text-sm font-medium mb-1.5"
                    style={{ color: '#495057' }}>
                    {field.label}
                  </label>
                  <input
                    type="text"
                    value={form[field.key] || ''}
                    onChange={e => setForm({ ...form, [field.key]: e.target.value })}
                    required={field.required}
                    className="w-full rounded px-4 py-2.5 text-sm focus:outline-none"
                    style={inputStyle}
                    onFocus={e => e.target.style.borderColor = '#C0392B'}
                    onBlur={e => {
                      e.target.style.borderColor = '#CED4DA';
                      if (field.key === 'phone') {
                        setForm({ ...form, phone: formatPhone(e.target.value) });
                      }
                    }}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Contact principal */}
          <div className="rounded-md p-4 sm:p-6"
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E9ECEF',
              boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
            }}>
            <h3 className="font-semibold mb-2" style={{ color: '#2C3E50' }}>
              👤 Contact principal
            </h3>
            <p className="text-xs mb-4" style={{ color: '#6C757D' }}>
              Cette personne a accès au portail client CORO (vue corporative — tous les bâtiments).
            </p>
            <div className="space-y-4">
              {contactFields.map(field => (
                <div key={field.key}>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: '#495057' }}>
                    {field.label}
                  </label>
                  <input
                    type={field.key === 'contactEmail' ? 'email' : 'text'}
                    value={form[field.key] || ''}
                    onChange={e => setForm({ ...form, [field.key]: e.target.value })}
                    required={field.required}
                    className="w-full rounded px-4 py-2.5 text-sm focus:outline-none"
                    style={inputStyle}
                    onFocus={e => e.target.style.borderColor = '#C0392B'}
                    onBlur={e => {
                      e.target.style.borderColor = '#CED4DA';
                      if (field.key === 'contactPhone') {
                        setForm((prev: any) => ({ ...prev, contactPhone: formatPhone(e.target.value) }));
                      }
                    }}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Bâtiments associés */}
          {client.buildings?.length > 0 && (
            <div className="rounded-md p-4 sm:p-6"
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #E9ECEF',
                boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
              }}>
              <h3 className="font-semibold mb-4" style={{ color: '#2C3E50' }}>
                Bâtiments associés
              </h3>
              <div className="space-y-2">
                {client.buildings.map((building: any) => (
                  <div
                    key={building.id}
                    onClick={() => router.push('/buildings')}
                    className="flex items-start justify-between gap-3 rounded px-3 sm:px-4 py-3 cursor-pointer transition-all"
                    style={{
                      backgroundColor: '#F8F9FA',
                      border: '1px solid #E9ECEF',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.backgroundColor = '#FDEDEC';
                      e.currentTarget.style.borderColor = '#F1948A';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.backgroundColor = '#F8F9FA';
                      e.currentTarget.style.borderColor = '#E9ECEF';
                    }}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium break-words" style={{ color: '#2C3E50' }}>
                        {building.name}
                      </p>
                      <p className="text-xs break-words" style={{ color: '#6C757D' }}>
                        {building.address}, {building.city}
                      </p>
                    </div>
                    <span className="flex-shrink-0" style={{ color: '#C0392B' }}>→</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}