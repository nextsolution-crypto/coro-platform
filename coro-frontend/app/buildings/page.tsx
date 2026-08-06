'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';
import api from '@/lib/api';
import AppLayout from '@/components/layout/AppLayout';

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

interface Client { id: string; name: string; }

const buildingTypes = [
  'Tour à bureaux', 'Immeuble résidentiel', 'Industriel',
  'Commercial', 'Institutionnel', 'Hôtel', 'Centre commercial', 'Autre',
];

// ── Parsing intelligent d'adresse collée (format Google Maps) ──
// Ex: "630 Boulevard René-Lévesque O, Montréal, QC H3B 1S6, Canada"
function parsePastedAddress(raw: string): { address: string; city: string; province: string; postalCode: string } | null {
  const parts = raw.split(',').map(p => p.trim()).filter(Boolean);
  if (parts.length < 2) return null;

  const address = parts[0] || '';
  const city = parts[1] || '';

  // Le 3e segment contient généralement "QC H3B 1S6" ou juste "QC"
  let province = '';
  let postalCode = '';
  if (parts[2]) {
    const match = parts[2].match(/^([A-Za-zÀ-ÿ]+)\s*([A-Za-z]\d[A-Za-z]\s*\d[A-Za-z]\d)?$/);
    if (match) {
      province = match[1] || '';
      postalCode = (match[2] || '').toUpperCase().replace(/\s+/g, ' ').trim();
    } else {
      province = parts[2];
    }
  }

  const provinceMap: Record<string, string> = {
    'qc': 'QC', 'québec': 'QC', 'quebec': 'QC',
    'on': 'ON', 'ontario': 'ON',
    'ab': 'AB', 'alberta': 'AB',
  };
  const normalizedProvince = provinceMap[province.toLowerCase()] || province;

  return { address, city, province: normalizedProvince, postalCode };
}

export default function BuildingsPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [buildings, setBuildings]   = useState<Building[]>([]);
  const [clients, setClients]       = useState<Client[]>([]);
  const [loading, setLoading]       = useState(true);
  const [showModal, setShowModal]   = useState(false);
  const [form, setForm] = useState({
    name: '', address: '', city: '', province: '',
    postalCode: '', floors: '', buildingType: '', clientId: '',
    responsableNom: '', responsableTitre: '', photoBase64: '',
  });
  const [addressPaste, setAddressPaste] = useState('');

  useEffect(() => {
    if (!isAuthenticated) { router.push('/login'); return; }
    fetchData();
  }, [isAuthenticated]);

  const fetchData = async () => {
    try {
      const [br, cr] = await Promise.all([
        api.get('/buildings'),
        api.get('/clients'),
      ]);
      setBuildings(br.data);
      setClients(cr.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/buildings/${id}`);
      fetchData();
    } catch (err) {
      console.error(err);
      alert('Erreur lors de la suppression.');
    }
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
        postalCode: parsed.postalCode || prev.postalCode,
      }));
    }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      alert('La photo ne doit pas dépasser 10MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setForm(prev => ({ ...prev, photoBase64: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/buildings', {
        ...form,
        floors: form.floors ? parseInt(form.floors) : undefined,
      });
      setShowModal(false);
      setForm({ name: '', address: '', city: '', province: '', postalCode: '', floors: '', buildingType: '', clientId: '', responsableNom: '', responsableTitre: '', photoBase64: '' });
      setAddressPaste('');
      fetchData();
    } catch (err) { console.error(err); }
  };

  const inputStyle = {
    border: '1px solid #CED4DA',
    color: '#2C3E50',
    backgroundColor: '#FFFFFF',
  };

  return (
    <AppLayout>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-semibold" style={{ color: '#2C3E50' }}>
            Bâtiments
          </h2>
          <p className="text-sm mt-1" style={{ color: '#6C757D' }}>
            {buildings.length} bâtiment{buildings.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="text-white text-sm font-medium px-4 py-2 rounded"
          style={{ backgroundColor: '#C0392B' }}
          onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#A93226')}
          onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#C0392B')}
        >
          + Nouveau bâtiment
        </button>
      </div>

      {/* Liste */}
      {loading ? (
        <div className="text-center py-12">
          <p className="text-sm animate-pulse" style={{ color: '#ADB5BD' }}>
            Chargement...
          </p>
        </div>
      ) : buildings.length === 0 ? (
        <div className="rounded-md p-12 text-center"
          style={{ backgroundColor: '#FFFFFF', border: '1px solid #E9ECEF' }}>
          <p className="text-5xl mb-4">🏗</p>
          <p className="font-semibold mb-2" style={{ color: '#2C3E50' }}>
            Aucun bâtiment pour l'instant
          </p>
          <p className="text-sm mb-6" style={{ color: '#ADB5BD' }}>
            {clients.length === 0
              ? 'Vous devez d\'abord créer un client avant d\'ajouter un bâtiment.'
              : 'Ajoutez un bâtiment pour pouvoir créer des projets de documents d\'urgence.'}
          </p>
          {clients.length === 0 ? (
            <button
              onClick={() => router.push('/clients')}
              className="text-white text-sm font-medium px-6 py-2.5 rounded"
              style={{ backgroundColor: '#2980B9' }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#2471A3')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#2980B9')}
            >
              → Créer un client d'abord
            </button>
          ) : (
            <button
              onClick={() => setShowModal(true)}
              className="text-white text-sm font-medium px-6 py-2.5 rounded"
              style={{ backgroundColor: '#C0392B' }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#A93226')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#C0392B')}
            >
              + Créer le premier bâtiment
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-3">
          {buildings.map(building => (
            <div
              key={building.id}
              onClick={() => router.push(`/buildings/${building.id}`)}
              className="rounded-md p-5 flex items-center justify-between
                cursor-pointer transition-all"
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
                  {building.name}
                </h3>
                <p className="text-sm mt-1" style={{ color: '#6C757D' }}>
                  {building.address}, {building.city}, {building.province}
                </p>
                <div className="flex gap-2 mt-2 flex-wrap">
                  {building.buildingType && (
                    <span className="text-xs px-2 py-1 rounded-full font-medium"
                      style={{
                        backgroundColor: '#F8F9FA',
                        color: '#495057',
                        border: '1px solid #DEE2E6',
                      }}>
                      {building.buildingType}
                    </span>
                  )}
                  {building.floors && (
                    <span className="text-xs px-2 py-1 rounded-full font-medium"
                      style={{
                        backgroundColor: '#F8F9FA',
                        color: '#495057',
                        border: '1px solid #DEE2E6',
                      }}>
                      {building.floors} étages
                    </span>
                  )}
                  <span className="text-xs px-2 py-1 rounded-full font-medium"
                    style={{
                      backgroundColor: '#FDEDEC',
                      color: '#C0392B',
                      border: '1px solid #F1948A',
                    }}>
                    {building.client.name}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <p className="font-bold text-lg" style={{ color: '#2980B9' }}>
                    {building._count?.projects || 0}
                  </p>
                  <p className="text-xs" style={{ color: '#ADB5BD' }}>Projets</p>
                </div>
                <button
                  onClick={e => { e.stopPropagation(); if (confirm(`Supprimer le bâtiment "${building.name}" ?`)) handleDelete(building.id); }}
                  className="p-2 rounded transition-colors"
                  style={{ color: '#ADB5BD' }}
                  onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#FDEDEC'; e.currentTarget.style.color = '#C0392B'; }}
                  onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#ADB5BD'; }}
                  title="Supprimer le bâtiment"
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
          <div className="w-full max-w-lg rounded-md p-8 overflow-y-auto max-h-[90vh]"
            style={{
              backgroundColor: '#FFFFFF',
              boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
            }}>
            <h3 className="font-semibold text-lg mb-6" style={{ color: '#2C3E50' }}>
              Nouveau bâtiment
            </h3>
            <form onSubmit={handleCreate} className="space-y-4">

              {/* Client */}
              <div>
                <label className="block text-sm font-medium mb-1.5"
                  style={{ color: '#495057' }}>Client *</label>
                <select
                  value={form.clientId}
                  onChange={e => setForm({ ...form, clientId: e.target.value })}
                  required
                  className="w-full rounded px-4 py-2.5 text-sm focus:outline-none"
                  style={inputStyle}
                  onFocus={e => e.target.style.borderColor = '#C0392B'}
                  onBlur={e => e.target.style.borderColor = '#CED4DA'}
                >
                  <option value="">Sélectionner un client</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* Nom */}
              <div>
                <label className="block text-sm font-medium mb-1.5"
                  style={{ color: '#495057' }}>Nom du bâtiment *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  required
                  placeholder="Ex: Tour ABC"
                  className="w-full rounded px-4 py-2.5 text-sm focus:outline-none"
                  style={inputStyle}
                  onFocus={e => e.target.style.borderColor = '#C0392B'}
                  onBlur={e => e.target.style.borderColor = '#CED4DA'}
                />
              </div>

              {/* Type */}
              <div>
                <label className="block text-sm font-medium mb-1.5"
                  style={{ color: '#495057' }}>Type de bâtiment</label>
                <select
                  value={form.buildingType}
                  onChange={e => setForm({ ...form, buildingType: e.target.value })}
                  className="w-full rounded px-4 py-2.5 text-sm focus:outline-none"
                  style={inputStyle}
                  onFocus={e => e.target.style.borderColor = '#C0392B'}
                  onBlur={e => e.target.style.borderColor = '#CED4DA'}
                >
                  <option value="">Sélectionner un type</option>
                  {buildingTypes.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              {/* Collage adresse intelligent */}
              <div>
                <label className="block text-sm font-medium mb-1.5"
                  style={{ color: '#495057' }}>
                  Coller une adresse complète (optionnel)
                </label>
                <p className="text-xs mb-1.5" style={{ color: '#ADB5BD' }}>
                  Copiez l'adresse depuis Google Maps — les champs ci-dessous se rempliront automatiquement.
                </p>
                <input
                  type="text"
                  value={addressPaste}
                  onChange={e => handleAddressPaste(e.target.value)}
                  placeholder="Ex: 630 Boulevard René-Lévesque O, Montréal, QC H3B 1S6, Canada"
                  className="w-full rounded px-4 py-2.5 text-sm focus:outline-none"
                  style={inputStyle}
                  onFocus={e => e.target.style.borderColor = '#C0392B'}
                  onBlur={e => e.target.style.borderColor = '#CED4DA'}
                />
              </div>

              {/* Adresse */}
              <div>
                <label className="block text-sm font-medium mb-1.5"
                  style={{ color: '#495057' }}>Adresse *</label>
                <input
                  type="text"
                  value={form.address}
                  onChange={e => setForm({ ...form, address: e.target.value })}
                  required
                  className="w-full rounded px-4 py-2.5 text-sm focus:outline-none"
                  style={inputStyle}
                  onFocus={e => e.target.style.borderColor = '#C0392B'}
                  onBlur={e => e.target.style.borderColor = '#CED4DA'}
                />
              </div>

              {/* Ville / Province */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1.5"
                    style={{ color: '#495057' }}>Ville *</label>
                  <input
                    type="text"
                    value={form.city}
                    onChange={e => setForm({ ...form, city: e.target.value })}
                    required
                    className="w-full rounded px-4 py-2.5 text-sm focus:outline-none"
                    style={inputStyle}
                    onFocus={e => e.target.style.borderColor = '#C0392B'}
                    onBlur={e => e.target.style.borderColor = '#CED4DA'}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5"
                    style={{ color: '#495057' }}>Province *</label>
                  <input
                    type="text"
                    value={form.province}
                    onChange={e => setForm({ ...form, province: e.target.value })}
                    required
                    placeholder="QC"
                    className="w-full rounded px-4 py-2.5 text-sm focus:outline-none"
                    style={inputStyle}
                    onFocus={e => e.target.style.borderColor = '#C0392B'}
                    onBlur={e => e.target.style.borderColor = '#CED4DA'}
                  />
                </div>
              </div>

              {/* Code postal / Étages */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1.5"
                    style={{ color: '#495057' }}>Code postal</label>
                  <input
                    type="text"
                    value={form.postalCode}
                    onChange={e => setForm({ ...form, postalCode: e.target.value })}
                    className="w-full rounded px-4 py-2.5 text-sm focus:outline-none"
                    style={inputStyle}
                    onFocus={e => e.target.style.borderColor = '#C0392B'}
                    onBlur={e => e.target.style.borderColor = '#CED4DA'}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5"
                    style={{ color: '#495057' }}>Nombre d'étages</label>
                  <input
                    type="number"
                    value={form.floors}
                    onChange={e => setForm({ ...form, floors: e.target.value })}
                    className="w-full rounded px-4 py-2.5 text-sm focus:outline-none"
                    style={inputStyle}
                    onFocus={e => e.target.style.borderColor = '#C0392B'}
                    onBlur={e => e.target.style.borderColor = '#CED4DA'}
                  />
                </div>
              </div>

              {/* Responsable */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: '#495057' }}>
                    Nom du responsable
                  </label>
                  <input
                    type="text"
                    value={form.responsableNom}
                    onChange={e => setForm({ ...form, responsableNom: e.target.value })}
                    placeholder="Ex: Jean Tremblay"
                    className="w-full rounded px-4 py-2.5 text-sm focus:outline-none"
                    style={inputStyle}
                    onFocus={e => e.target.style.borderColor = '#C0392B'}
                    onBlur={e => e.target.style.borderColor = '#CED4DA'}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: '#495057' }}>
                    Titre du responsable
                  </label>
                  <input
                    type="text"
                    value={form.responsableTitre}
                    onChange={e => setForm({ ...form, responsableTitre: e.target.value })}
                    placeholder="Ex: Directeur de la sécurité"
                    className="w-full rounded px-4 py-2.5 text-sm focus:outline-none"
                    style={inputStyle}
                    onFocus={e => e.target.style.borderColor = '#C0392B'}
                    onBlur={e => e.target.style.borderColor = '#CED4DA'}
                  />
                </div>
              </div>

              {/* Photo */}
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: '#495057' }}>
                  Photo du bâtiment
                </label>
                <p className="text-xs mb-2" style={{ color: '#ADB5BD' }}>
                  Cette photo sera utilisée comme page de couverture des documents générés.
                </p>
                {form.photoBase64 && (
                  <div className="mb-3 rounded overflow-hidden" style={{ border: '1px solid #DEE2E6' }}>
                    <img src={form.photoBase64} alt="Aperçu du bâtiment"
                      className="w-full h-32 object-cover" />
                  </div>
                )}
                <label
                  className="flex items-center justify-center gap-2 text-sm font-medium py-2.5 rounded cursor-pointer transition-colors"
                  style={{ border: '1px dashed #CED4DA', color: '#6C757D' }}
                  onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#F8F9FA'; e.currentTarget.style.color = '#2C3E50'; }}
                  onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#6C757D'; }}
                >
                  {form.photoBase64 ? 'Changer la photo' : 'Téléverser une photo'}
                  <input type="file" accept="image/jpeg,image/jpg,image/png"
                    onChange={handlePhotoChange} className="hidden" />
                </label>
                <p className="text-xs mt-1.5" style={{ color: '#ADB5BD' }}>
                  JPG ou PNG — Max 10MB
                </p>
              </div>

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