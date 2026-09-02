'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';
import api from '@/lib/api';
import AppLayout from '@/components/layout/AppLayout';
import { toast } from '@/lib/toast';
import { PageTitle } from '@/components/ui/Typography';

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
  const [clients, setClients]     = useState<Client[]>([]);
  const [loading, setLoading]     = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [addressPaste, setAddressPaste] = useState('');
  const [form, setForm] = useState({
    name: '', email: '', phone: '', address: '', city: '', province: '',
    contactFirstName: '', contactLastName: '', contactEmail: '', contactPhone: '',
  });

  const formatPhone = (value: string): string => {
    const digits = value.replace(/\D/g, '');
    if (digits.length === 11 && digits.startsWith('1')) {
      const d = digits.substring(1);
      return `1 (${d.substring(0, 3)}) ${d.substring(3, 6)}-${d.substring(6)}`;
    }
    if (digits.length === 10) {
      return `(${digits.substring(0, 3)}) ${digits.substring(3, 6)}-${digits.substring(6)}`;
    }
    const d = digits.substring(0, 11);
    if (d.length === 0) return '';
    if (d.startsWith('1')) {
      if (d.length <= 1) return '1';
      if (d.length <= 4) return `1 (${d.substring(1)}`;
      if (d.length <= 7) return `1 (${d.substring(1, 4)}) ${d.substring(4)}`;
      if (d.length <= 11) return `1 (${d.substring(1, 4)}) ${d.substring(4, 7)}-${d.substring(7)}`;
    }
    if (d.length <= 3) return `(${d}`;
    if (d.length <= 6) return `(${d.substring(0, 3)}) ${d.substring(3)}`;
    return `(${d.substring(0, 3)}) ${d.substring(3, 6)}-${d.substring(6, 10)}`;
  };

  const parsePastedAddress = (raw: string): { address: string; city: string; province: string } | null => {
    const parts = raw.split(',').map(p => p.trim()).filter(Boolean);
    if (parts.length < 2) return null;
    const address = parts[0] || '';
    const city = parts[1] || '';
    let province = '';
    if (parts[2]) {
      const match = parts[2].match(/^([A-Za-zÀ-ÿ]+)\s*([A-Za-z]\d[A-Za-z]\s*\d[A-Za-z]\d)?$/);
      if (match) province = match[1] || '';
      else province = parts[2];
    }
    const provinceMap: Record<string, string> = {
      'qc': 'QC', 'québec': 'QC', 'quebec': 'QC',
      'on': 'ON', 'ontario': 'ON',
      'ab': 'AB', 'alberta': 'AB',
    };
    const normalizedProvince = provinceMap[province.toLowerCase()] || province;
    return { address, city, province: normalizedProvince };
  };

  const handleAddressPaste = (value: string) => {
    setAddressPaste(value);
    const parsed = parsePastedAddress(value);
    if (parsed) {
      setForm(prev => ({
        ...prev,
        address: parsed.address || prev.address,
        city: parsed.city || prev.city,
        province: parsed.province || prev.province,
      }));
    }
  };

  useEffect(() => {
    if (!isAuthenticated) { router.push('/login'); return; }
    fetchClients();
  }, [isAuthenticated]);

  const fetchClients = async () => {
    try {
      const res = await api.get('/clients');
      setClients(res.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/clients/${id}`);
      fetchClients();
      toast('Client supprimé.');
    } catch (err) {
      toast('Erreur lors de la suppression du client.', 'error');
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/clients', form);
      setShowModal(false);
      setForm({ name: '', email: '', phone: '', address: '', city: '', province: '', contactFirstName: '', contactLastName: '', contactEmail: '', contactPhone: '' });
      setAddressPaste('');
      fetchClients();
      toast('Client créé avec succès.');
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Erreur lors de la création du client.';
      toast(Array.isArray(message) ? message[0] : message, 'error');
    }
  };

  return (
    <AppLayout>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <PageTitle subtitle={`${clients.length} client${clients.length !== 1 ? 's' : ''}`}>
            Clients
          </PageTitle>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="w-full sm:w-auto text-white text-sm font-medium px-4 py-2 rounded"
          style={{ backgroundColor: '#C0392B' }}
          onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#A93226')}
          onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#C0392B')}
        >
          + Nouveau client
        </button>
      </div>

      {/* Liste */}
      {loading ? (
        <div className="text-center py-12">
          <p className="text-sm animate-pulse" style={{ color: '#ADB5BD' }}>Chargement...</p>
        </div>
      ) : clients.length === 0 ? (
        <div className="rounded-md p-12 text-center"
          style={{ backgroundColor: '#FFFFFF', border: '1px solid #E9ECEF' }}>
          <p className="text-5xl mb-4">👥</p>
          <p className="font-semibold mb-2" style={{ color: '#2C3E50' }}>
            Aucun client pour l'instant
          </p>
          <p className="text-sm mb-6" style={{ color: '#ADB5BD' }}>
            Commencez par ajouter votre premier client — il sera associé à vos bâtiments et projets.
          </p>
          <button
            onClick={() => setShowModal(true)}
            className="text-white text-sm font-medium px-6 py-2.5 rounded"
            style={{ backgroundColor: '#C0392B' }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#A93226')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#C0392B')}
          >
            + Créer le premier client
          </button>
        </div>
      ) : (
        <div className="grid gap-3">
          {clients.map(client => (
            <div
              key={client.id}
              onClick={() => router.push(`/clients/${client.id}`)}
              className="rounded-md p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 cursor-pointer transition-all"
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #E9ECEF',
                boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
                e.currentTarget.style.borderColor = '#CED4DA';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.05)';
                e.currentTarget.style.borderColor = '#E9ECEF';
              }}
            >
              <div className="flex-1 min-w-0 w-full">
                <h3 className="font-semibold" style={{ color: '#2C3E50' }}>
                  {client.name}
                </h3>
                <div className="flex flex-col sm:flex-row sm:flex-wrap gap-1 sm:gap-3 mt-1 min-w-0">
                  {client.email && (
                    <span className="text-sm break-all" style={{ color: '#6C757D' }}>
                      {client.email}
                    </span>
                  )}
                  {client.city && (
                    <span className="text-sm" style={{ color: '#6C757D' }}>
                      {client.city}{client.province ? `, ${client.province}` : ''}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between sm:justify-end gap-4 sm:gap-6 w-full sm:w-auto pt-3 sm:pt-0 border-t sm:border-t-0 border-[#F1F3F5]">
                <div className="text-center">
                  <p className="font-bold" style={{ color: '#C0392B' }}>
                    {client._count?.buildings || 0}
                  </p>
                  <p className="text-xs" style={{ color: '#ADB5BD' }}>Bâtiments</p>
                </div>
                <div className="text-center">
                  <p className="font-bold" style={{ color: '#2980B9' }}>
                    {client._count?.projects || 0}
                  </p>
                  <p className="text-xs" style={{ color: '#ADB5BD' }}>Projets</p>
                </div>
                <button
                  onClick={e => { e.stopPropagation(); if (confirm(`Supprimer le client "${client.name}" ?`)) handleDelete(client.id); }}
                  className="p-2 rounded transition-colors"
                  style={{ color: '#ADB5BD' }}
                  onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#FDEDEC'; e.currentTarget.style.color = '#C0392B'; }}
                  onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#ADB5BD'; }}
                  title="Supprimer le client"
                >
                  🗑
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <div className="w-full max-w-md max-h-[calc(100vh-2rem)] overflow-y-auto rounded-md p-5 sm:p-8"
            style={{
              backgroundColor: '#FFFFFF',
              boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
            }}>
            <h3 className="font-semibold text-lg mb-6" style={{ color: '#2C3E50' }}>
              Nouveau client
            </h3>
            <form onSubmit={handleCreate} className="space-y-4">

              {/* Nom */}
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: '#495057' }}>Nom *</label>
                <input type="text" required value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  className="w-full rounded px-4 py-2.5 text-sm focus:outline-none"
                  style={{ border: '1px solid #CED4DA', color: '#2C3E50' }}
                  onFocus={e => e.target.style.borderColor = '#C0392B'}
                  onBlur={e => e.target.style.borderColor = '#CED4DA'} />
              </div>

              {/* Séparateur contact principal */}
              <div style={{ borderTop: '1px solid #E9ECEF', paddingTop: 16, marginTop: 8 }}>
                <p className="text-sm font-semibold mb-1" style={{ color: '#2C3E50' }}>
                  👤 Contact principal (représentant du client)
                </p>
                <p className="text-xs mb-3" style={{ color: '#6C757D' }}>
                  Cette personne recevra automatiquement un accès au portail client CORO (vue corporative — tous les bâtiments).
                </p>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="block text-sm font-medium mb-1.5" style={{ color: '#495057' }}>Prénom *</label>
                    <input type="text" required value={form.contactFirstName}
                      onChange={e => setForm({ ...form, contactFirstName: e.target.value })}
                      placeholder="Ex: Marie"
                      className="w-full rounded px-4 py-2.5 text-sm focus:outline-none"
                      style={{ border: '1px solid #CED4DA', color: '#2C3E50' }}
                      onFocus={e => e.target.style.borderColor = '#C0392B'}
                      onBlur={e => e.target.style.borderColor = '#CED4DA'} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5" style={{ color: '#495057' }}>Nom *</label>
                    <input type="text" required value={form.contactLastName}
                      onChange={e => setForm({ ...form, contactLastName: e.target.value })}
                      placeholder="Ex: Tremblay"
                      className="w-full rounded px-4 py-2.5 text-sm focus:outline-none"
                      style={{ border: '1px solid #CED4DA', color: '#2C3E50' }}
                      onFocus={e => e.target.style.borderColor = '#C0392B'}
                      onBlur={e => e.target.style.borderColor = '#CED4DA'} />
                  </div>
                </div>
                <div className="mb-3">
                  <label className="block text-sm font-medium mb-1.5" style={{ color: '#495057' }}>Courriel professionnel *</label>
                  <input type="email" required value={form.contactEmail}
                    onChange={e => setForm({ ...form, contactEmail: e.target.value })}
                    placeholder="Ex: marie.tremblay@client.com"
                    className="w-full rounded px-4 py-2.5 text-sm focus:outline-none"
                    style={{ border: '1px solid #CED4DA', color: '#2C3E50' }}
                    onFocus={e => e.target.style.borderColor = '#C0392B'}
                    onBlur={e => e.target.style.borderColor = '#CED4DA'} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: '#495057' }}>Téléphone</label>
                  <input type="text" value={form.contactPhone}
                    onChange={e => setForm({ ...form, contactPhone: e.target.value })}
                    placeholder="(514) 555-0100"
                    className="w-full rounded px-4 py-2.5 text-sm focus:outline-none"
                    style={{ border: '1px solid #CED4DA', color: '#2C3E50' }}
                    onFocus={e => e.target.style.borderColor = '#C0392B'}
                    onBlur={e => {
                      e.target.style.borderColor = '#CED4DA';
                      setForm(prev => ({ ...prev, contactPhone: formatPhone(prev.contactPhone) }));
                    }} />
                </div>
              </div>

              {/* Séparateur coordonnées organisation */}
              <div style={{ borderTop: '1px solid #E9ECEF', paddingTop: 16, marginTop: 8 }}>
                <p className="text-sm font-semibold mb-3" style={{ color: '#2C3E50' }}>
                  🏢 Coordonnées de l'organisation (optionnel)
                </p>
              </div>

              {/* Courriel */}
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: '#495057' }}>Courriel général</label>
                <input type="text" value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  className="w-full rounded px-4 py-2.5 text-sm focus:outline-none"
                  style={{ border: '1px solid #CED4DA', color: '#2C3E50' }}
                  onFocus={e => e.target.style.borderColor = '#C0392B'}
                  onBlur={e => e.target.style.borderColor = '#CED4DA'} />
              </div>

              {/* Téléphone */}
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: '#495057' }}>Téléphone</label>
                <input type="text" value={form.phone}
                  onChange={e => setForm({ ...form, phone: e.target.value })}
                  placeholder="(450) 567-1256"
                  className="w-full rounded px-4 py-2.5 text-sm focus:outline-none"
                  style={{ border: '1px solid #CED4DA', color: '#2C3E50' }}
                  onFocus={e => e.target.style.borderColor = '#C0392B'}
                  onBlur={e => {
                    e.target.style.borderColor = '#CED4DA';
                    setForm(prev => ({ ...prev, phone: formatPhone(prev.phone) }));
                  }} />
              </div>

              {/* Adresse — coller depuis Google Maps */}
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: '#495057' }}>
                  Coller une adresse complète (optionnel)
                </label>
                <p className="text-xs mb-1.5" style={{ color: '#ADB5BD' }}>
                  Copiez l'adresse depuis Google Maps — les champs s'auto-complètent.
                </p>
                <input type="text" value={addressPaste}
                  onChange={e => handleAddressPaste(e.target.value)}
                  placeholder="Ex: 630 Boul. René-Lévesque O, Montréal, QC H3B 1S6, Canada"
                  className="w-full rounded px-4 py-2.5 text-sm focus:outline-none"
                  style={{ border: '1px solid #CED4DA', color: '#2C3E50' }}
                  onFocus={e => e.target.style.borderColor = '#C0392B'}
                  onBlur={e => e.target.style.borderColor = '#CED4DA'} />
              </div>

              {/* Adresse */}
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: '#495057' }}>Adresse</label>
                <input type="text" value={form.address}
                  onChange={e => setForm({ ...form, address: e.target.value })}
                  className="w-full rounded px-4 py-2.5 text-sm focus:outline-none"
                  style={{ border: '1px solid #CED4DA', color: '#2C3E50' }}
                  onFocus={e => e.target.style.borderColor = '#C0392B'}
                  onBlur={e => e.target.style.borderColor = '#CED4DA'} />
              </div>

              {/* Ville / Province */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: '#495057' }}>Ville</label>
                  <input type="text" value={form.city}
                    onChange={e => setForm({ ...form, city: e.target.value })}
                    className="w-full rounded px-4 py-2.5 text-sm focus:outline-none"
                    style={{ border: '1px solid #CED4DA', color: '#2C3E50' }}
                    onFocus={e => e.target.style.borderColor = '#C0392B'}
                    onBlur={e => e.target.style.borderColor = '#CED4DA'} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: '#495057' }}>Province</label>
                  <input type="text" value={form.province}
                    onChange={e => setForm({ ...form, province: e.target.value })}
                    placeholder="QC"
                    className="w-full rounded px-4 py-2.5 text-sm focus:outline-none"
                    style={{ border: '1px solid #CED4DA', color: '#2C3E50' }}
                    onFocus={e => e.target.style.borderColor = '#C0392B'}
                    onBlur={e => e.target.style.borderColor = '#CED4DA'} />
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 font-medium py-2.5 rounded text-sm"
                  style={{ border: '1px solid #DEE2E6', color: '#6C757D' }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F8F9FA'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 text-white font-medium py-2.5 rounded text-sm"
                  style={{ backgroundColor: '#C0392B' }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#A93226')}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#C0392B')}
                >
                  Créer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}