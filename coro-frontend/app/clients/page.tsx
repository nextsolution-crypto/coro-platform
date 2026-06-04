'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';
import api from '@/lib/api';
import AppLayout from '@/components/layout/AppLayout';

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
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/clients', form);
      setShowModal(false);
      setForm({ name: '', email: '', phone: '', address: '', city: '', province: '' });
      fetchClients();
    } catch (err) { console.error(err); }
  };

  const fields = [
    { label: 'Nom *',      key: 'name',     required: true },
    { label: 'Courriel',   key: 'email' },
    { label: 'Téléphone',  key: 'phone' },
    { label: 'Adresse',    key: 'address' },
    { label: 'Ville',      key: 'city' },
    { label: 'Province',   key: 'province' },
  ];

  return (
    <AppLayout>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-semibold" style={{ color: '#2C3E50' }}>Clients</h2>
          <p className="text-sm mt-1" style={{ color: '#6C757D' }}>
            {clients.length} client{clients.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="text-white text-sm font-medium px-4 py-2 rounded"
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
          <p className="text-sm mb-4" style={{ color: '#ADB5BD' }}>
            Aucun client pour l'instant
          </p>
          <button
            onClick={() => setShowModal(true)}
            className="text-white text-sm font-medium px-4 py-2 rounded"
            style={{ backgroundColor: '#C0392B' }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#A93226')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#C0392B')}
          >
            Créer le premier client
          </button>
        </div>
      ) : (
        <div className="grid gap-3">
          {clients.map(client => (
            <div
              key={client.id}
              onClick={() => router.push(`/clients/${client.id}`)}
              className="rounded-md p-5 flex items-center justify-between cursor-pointer transition-all"
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
              <div>
                <h3 className="font-semibold" style={{ color: '#2C3E50' }}>
                  {client.name}
                </h3>
                <div className="flex gap-3 mt-1">
                  {client.email && (
                    <span className="text-sm" style={{ color: '#6C757D' }}>
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
              <div className="flex gap-6 text-center">
                <div>
                  <p className="font-bold" style={{ color: '#C0392B' }}>
                    {client._count?.buildings || 0}
                  </p>
                  <p className="text-xs" style={{ color: '#ADB5BD' }}>Bâtiments</p>
                </div>
                <div>
                  <p className="font-bold" style={{ color: '#2980B9' }}>
                    {client._count?.projects || 0}
                  </p>
                  <p className="text-xs" style={{ color: '#ADB5BD' }}>Projets</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <div className="w-full max-w-md rounded-md p-8"
            style={{
              backgroundColor: '#FFFFFF',
              boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
            }}>
            <h3 className="font-semibold text-lg mb-6" style={{ color: '#2C3E50' }}>
              Nouveau client
            </h3>
            <form onSubmit={handleCreate} className="space-y-4">
              {fields.map(field => (
                <div key={field.key}>
                  <label className="block text-sm font-medium mb-1.5"
                    style={{ color: '#495057' }}>
                    {field.label}
                  </label>
                  <input
                    type="text"
                    value={(form as any)[field.key]}
                    onChange={e => setForm({ ...form, [field.key]: e.target.value })}
                    required={field.required}
                    className="w-full rounded px-4 py-2.5 text-sm focus:outline-none"
                    style={{ border: '1px solid #CED4DA', color: '#2C3E50' }}
                    onFocus={e => e.target.style.borderColor = '#C0392B'}
                    onBlur={e => e.target.style.borderColor = '#CED4DA'}
                  />
                </div>
              ))}
              <div className="flex gap-3 pt-2">
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