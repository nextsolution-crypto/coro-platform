'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';
import api from '@/lib/api';
import AppLayout from '@/components/layout/AppLayout';
import { ArrowLeft, Building2, MapPin, Layers, Edit2, FolderOpen, Plus, Calendar } from 'lucide-react';

interface Building {
  id: string;
  name: string;
  address: string;
  city: string;
  province: string;
  postalCode?: string;
  floors?: number;
  buildingType?: string;
  photoBase64?: string;
  responsableNom?: string;
  responsableTitre?: string;
  client: { id: string; name: string };
}

interface Project {
  id: string;
  name: string;
  documentType: string;
  year: number;
  status: string;
  updatedAt: string;
}

const statusColors: Record<string, { bg: string; color: string; label: string }> = {
  DRAFT:     { bg: '#FEF9E7', color: '#F39C12', label: 'Brouillon' },
  ACTIVE:    { bg: '#EAFAF1', color: '#27AE60', label: 'Actif' },
  ARCHIVED:  { bg: '#F8F9FA', color: '#ADB5BD', label: 'Archivé' },
};

export default function BuildingDetailPage() {
  const router = useRouter();
  const params = useParams();
  const buildingId = params.id as string;
  const { isAuthenticated } = useAuthStore();

  const [building, setBuilding]   = useState<Building | null>(null);
  const [projects, setProjects]   = useState<Project[]>([]);
  const [loading, setLoading]     = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [form, setForm] = useState({
    name: '', address: '', city: '', province: '',
    postalCode: '', floors: '', buildingType: '', photoBase64: '',
    responsableNom: '', responsableTitre: '',
  });
  const [projectForm, setProjectForm] = useState({
    name: '', documentType: 'PMU', year: new Date().getFullYear().toString(),
  });

  const buildingTypes = [
    'Tour à bureaux', 'Immeuble résidentiel', 'Industriel',
    'Commercial', 'Institutionnel', 'Hôtel', 'Centre commercial', 'Autre',
  ];

  const documentTypes = ['PMU', 'PSI', 'PCA', 'PGC', 'PRA', 'PUE'];

  useEffect(() => {
    if (!isAuthenticated) { router.push('/login'); return; }
    fetchData();
  }, [isAuthenticated, buildingId]);

  const fetchData = async () => {
    try {
      const [br, pr] = await Promise.all([
        api.get(`/buildings/${buildingId}`),
        api.get(`/buildings/${buildingId}/projects`),
      ]);
      setBuilding(br.data);
      setProjects(pr.data);
      setForm({
        name:             br.data.name || '',
        address:          br.data.address || '',
        city:              br.data.city || '',
        province:          br.data.province || '',
        postalCode:        br.data.postalCode || '',
        floors:            br.data.floors?.toString() || '',
        buildingType:      br.data.buildingType || '',
        photoBase64:       br.data.photoBase64 || '',
        responsableNom:    br.data.responsableNom || '',
        responsableTitre:  br.data.responsableTitre || '',
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.patch(`/buildings/${buildingId}`, {
        ...form,
        floors: form.floors ? parseInt(form.floors) : undefined,
      });
      setShowEditModal(false);
      fetchData();
    } catch (err) { console.error(err); }
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
      setForm({ ...form, photoBase64: reader.result as string });
    };
    reader.readAsDataURL(file);
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.post('/projects', {
        ...projectForm,
        year: parseInt(projectForm.year),
        buildingId,
      });
      setShowProjectModal(false);
      setProjectForm({ name: '', documentType: 'PMU', year: new Date().getFullYear().toString() });
      router.push(`/projects/${res.data.id}`);
    } catch (err) { console.error(err); }
  };

  const inputStyle = {
    border: '1px solid #CED4DA',
    color: '#2C3E50',
    backgroundColor: '#FFFFFF',
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-24">
          <p className="text-sm animate-pulse" style={{ color: '#ADB5BD' }}>Chargement...</p>
        </div>
      </AppLayout>
    );
  }

  if (!building) {
    return (
      <AppLayout>
        <div className="text-center py-24">
          <p style={{ color: '#6C757D' }}>Bâtiment introuvable.</p>
          <button onClick={() => router.push('/buildings')}
            className="mt-4 text-sm underline" style={{ color: '#C0392B' }}>
            Retour aux bâtiments
          </button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>

      {/* Retour */}
      <button
        onClick={() => router.push('/buildings')}
        className="flex items-center gap-2 text-sm mb-6 transition-colors"
        style={{ color: '#6C757D' }}
        onMouseEnter={e => e.currentTarget.style.color = '#2C3E50'}
        onMouseLeave={e => e.currentTarget.style.color = '#6C757D'}
      >
        <ArrowLeft size={16} />
        Retour aux bâtiments
      </button>

      {/* Carte bâtiment */}
      <div className="rounded-md p-6 mb-6"
        style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #E9ECEF',
          boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
        }}>
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            {/* Icône */}
            <div className="w-12 h-12 rounded-md flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: '#FDEDEC' }}>
              <Building2 size={22} style={{ color: '#C0392B' }} />
            </div>
            {/* Infos */}
            <div>
              <h2 className="text-xl font-bold" style={{ color: '#2C3E50' }}>
                {building.name}
              </h2>
              <div className="flex items-center gap-1.5 mt-1">
                <MapPin size={13} style={{ color: '#ADB5BD' }} />
                <p className="text-sm" style={{ color: '#6C757D' }}>
                  {building.address}, {building.city}, {building.province}
                  {building.postalCode && ` ${building.postalCode}`}
                </p>
              </div>
              <div className="flex gap-2 mt-3 flex-wrap">
                {building.buildingType && (
                  <span className="text-xs px-2.5 py-1 rounded-full font-medium"
                    style={{ backgroundColor: '#F8F9FA', color: '#495057', border: '1px solid #DEE2E6' }}>
                    {building.buildingType}
                  </span>
                )}
                {building.floors && (
                  <span className="text-xs px-2.5 py-1 rounded-full font-medium flex items-center gap-1"
                    style={{ backgroundColor: '#F8F9FA', color: '#495057', border: '1px solid #DEE2E6' }}>
                    <Layers size={11} />
                    {building.floors} étages
                  </span>
                )}
                <span className="text-xs px-2.5 py-1 rounded-full font-medium"
                  style={{ backgroundColor: '#FDEDEC', color: '#C0392B', border: '1px solid #F1948A' }}>
                  {building.client.name}
                </span>
              </div>
            </div>
          </div>

          {/* Bouton modifier */}
          <button
            onClick={() => setShowEditModal(true)}
            className="flex items-center gap-2 text-sm font-medium px-3 py-2 rounded transition-colors"
            style={{ border: '1px solid #DEE2E6', color: '#6C757D' }}
            onMouseEnter={e => {
              e.currentTarget.style.backgroundColor = '#F8F9FA';
              e.currentTarget.style.color = '#2C3E50';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = '#6C757D';
            }}
          >
            <Edit2 size={14} />
            Modifier
          </button>
        </div>
      </div>

      {/* Section projets */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold" style={{ color: '#2C3E50' }}>Projets</h3>
          <p className="text-xs mt-0.5" style={{ color: '#ADB5BD' }}>
            {projects.length} projet{projects.length !== 1 ? 's' : ''} associé{projects.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => setShowProjectModal(true)}
          className="flex items-center gap-2 text-white text-sm font-medium px-4 py-2 rounded transition-colors"
          style={{ backgroundColor: '#C0392B' }}
          onMouseEnter={e => e.currentTarget.style.backgroundColor = '#A93226'}
          onMouseLeave={e => e.currentTarget.style.backgroundColor = '#C0392B'}
        >
          <Plus size={15} />
          Nouveau projet
        </button>
      </div>

      {/* Liste projets */}
      {projects.length === 0 ? (
        <div className="rounded-md p-12 text-center"
          style={{ backgroundColor: '#FFFFFF', border: '2px dashed #DEE2E6' }}>
          <FolderOpen size={32} className="mx-auto mb-3" style={{ color: '#ADB5BD' }} />
          <p className="text-sm font-medium" style={{ color: '#6C757D' }}>
            Aucun projet pour ce bâtiment
          </p>
          <p className="text-xs mt-1 mb-4" style={{ color: '#ADB5BD' }}>
            Créez un projet pour commencer à générer des documents d'urgence
          </p>
          <button
            onClick={() => setShowProjectModal(true)}
            className="flex items-center gap-2 text-white text-sm font-medium px-4 py-2 rounded mx-auto transition-colors"
            style={{ backgroundColor: '#C0392B' }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#A93226'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = '#C0392B'}
          >
            <Plus size={15} />
            Créer un projet
          </button>
        </div>
      ) : (
        <div className="grid gap-3">
          {projects.map(project => {
            const status = statusColors[project.status] || statusColors.DRAFT;
            return (
              <div
                key={project.id}
                onClick={() => router.push(`/projects/${project.id}`)}
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
                <div className="flex items-center gap-4">
                  {/* Badge type document */}
                  <div className="w-12 h-12 rounded-md flex items-center justify-center flex-shrink-0 font-bold text-sm"
                    style={{ backgroundColor: '#FDEDEC', color: '#C0392B' }}>
                    {project.documentType}
                  </div>
                  <div>
                    <h4 className="font-semibold" style={{ color: '#2C3E50' }}>
                      {project.name}
                    </h4>
                    <div className="flex items-center gap-2 mt-1">
                      <Calendar size={12} style={{ color: '#ADB5BD' }} />
                      <span className="text-xs" style={{ color: '#ADB5BD' }}>
                        {project.year}
                      </span>
                      <span style={{ color: '#DEE2E6' }}>•</span>
                      <span className="text-xs" style={{ color: '#ADB5BD' }}>
                        Modifié le {new Date(project.updatedAt).toLocaleDateString('fr-CA')}
                      </span>
                    </div>
                  </div>
                </div>
                <span className="text-xs font-medium px-2.5 py-1 rounded-full"
                  style={{ backgroundColor: status.bg, color: status.color }}>
                  {status.label}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal modification bâtiment */}
      {showEditModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <div className="w-full max-w-lg rounded-md p-8 overflow-y-auto max-h-[90vh]"
            style={{ backgroundColor: '#FFFFFF', boxShadow: '0 8px 32px rgba(0,0,0,0.15)' }}>
            <h3 className="font-semibold text-lg mb-6" style={{ color: '#2C3E50' }}>
              Modifier le bâtiment
            </h3>
            <form onSubmit={handleUpdate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: '#495057' }}>
                  Nom du bâtiment *
                </label>
                <input type="text" value={form.name} required
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  className="w-full rounded px-4 py-2.5 text-sm focus:outline-none"
                  style={inputStyle}
                  onFocus={e => e.target.style.borderColor = '#C0392B'}
                  onBlur={e => e.target.style.borderColor = '#CED4DA'}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: '#495057' }}>
                  Type de bâtiment
                </label>
                <select value={form.buildingType}
                  onChange={e => setForm({ ...form, buildingType: e.target.value })}
                  className="w-full rounded px-4 py-2.5 text-sm focus:outline-none"
                  style={inputStyle}
                  onFocus={e => e.target.style.borderColor = '#C0392B'}
                  onBlur={e => e.target.style.borderColor = '#CED4DA'}
                >
                  <option value="">Sélectionner un type</option>
                  {buildingTypes.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: '#495057' }}>
                    Nom du responsable
                  </label>
                  <input type="text" value={form.responsableNom}
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
                  <input type="text" value={form.responsableTitre}
                    onChange={e => setForm({ ...form, responsableTitre: e.target.value })}
                    placeholder="Ex: Directeur de la sécurité"
                    className="w-full rounded px-4 py-2.5 text-sm focus:outline-none"
                    style={inputStyle}
                    onFocus={e => e.target.style.borderColor = '#C0392B'}
                    onBlur={e => e.target.style.borderColor = '#CED4DA'}
                  />
                </div>
              </div>
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
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: '#495057' }}>
                  Adresse *
                </label>
                <input type="text" value={form.address} required
                  onChange={e => setForm({ ...form, address: e.target.value })}
                  className="w-full rounded px-4 py-2.5 text-sm focus:outline-none"
                  style={inputStyle}
                  onFocus={e => e.target.style.borderColor = '#C0392B'}
                  onBlur={e => e.target.style.borderColor = '#CED4DA'}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: '#495057' }}>
                    Ville *
                  </label>
                  <input type="text" value={form.city} required
                    onChange={e => setForm({ ...form, city: e.target.value })}
                    className="w-full rounded px-4 py-2.5 text-sm focus:outline-none"
                    style={inputStyle}
                    onFocus={e => e.target.style.borderColor = '#C0392B'}
                    onBlur={e => e.target.style.borderColor = '#CED4DA'}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: '#495057' }}>
                    Province *
                  </label>
                  <input type="text" value={form.province} required
                    onChange={e => setForm({ ...form, province: e.target.value })}
                    className="w-full rounded px-4 py-2.5 text-sm focus:outline-none"
                    style={inputStyle}
                    onFocus={e => e.target.style.borderColor = '#C0392B'}
                    onBlur={e => e.target.style.borderColor = '#CED4DA'}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: '#495057' }}>
                    Code postal
                  </label>
                  <input type="text" value={form.postalCode}
                    onChange={e => setForm({ ...form, postalCode: e.target.value })}
                    className="w-full rounded px-4 py-2.5 text-sm focus:outline-none"
                    style={inputStyle}
                    onFocus={e => e.target.style.borderColor = '#C0392B'}
                    onBlur={e => e.target.style.borderColor = '#CED4DA'}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: '#495057' }}>
                    Nombre d'étages
                  </label>
                  <input type="number" value={form.floors}
                    onChange={e => setForm({ ...form, floors: e.target.value })}
                    className="w-full rounded px-4 py-2.5 text-sm focus:outline-none"
                    style={inputStyle}
                    onFocus={e => e.target.style.borderColor = '#C0392B'}
                    onBlur={e => e.target.style.borderColor = '#CED4DA'}
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowEditModal(false)}
                  className="flex-1 font-medium py-2.5 rounded text-sm"
                  style={{ border: '1px solid #DEE2E6', color: '#6C757D' }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F8F9FA'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  Annuler
                </button>
                <button type="submit"
                  className="flex-1 text-white font-medium py-2.5 rounded text-sm"
                  style={{ backgroundColor: '#C0392B' }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = '#A93226'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = '#C0392B'}
                >
                  Sauvegarder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal nouveau projet */}
      {showProjectModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <div className="w-full max-w-md rounded-md p-8"
            style={{ backgroundColor: '#FFFFFF', boxShadow: '0 8px 32px rgba(0,0,0,0.15)' }}>
            <h3 className="font-semibold text-lg mb-6" style={{ color: '#2C3E50' }}>
              Nouveau projet
            </h3>
            <form onSubmit={handleCreateProject} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: '#495057' }}>
                  Nom du projet *
                </label>
                <input type="text" value={projectForm.name} required
                  onChange={e => setProjectForm({ ...projectForm, name: e.target.value })}
                  placeholder="Ex: PMU Tour ABC 2026"
                  className="w-full rounded px-4 py-2.5 text-sm focus:outline-none"
                  style={inputStyle}
                  onFocus={e => e.target.style.borderColor = '#C0392B'}
                  onBlur={e => e.target.style.borderColor = '#CED4DA'}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: '#495057' }}>
                  Type de document *
                </label>
                <select value={projectForm.documentType}
                  onChange={e => setProjectForm({ ...projectForm, documentType: e.target.value })}
                  className="w-full rounded px-4 py-2.5 text-sm focus:outline-none"
                  style={inputStyle}
                  onFocus={e => e.target.style.borderColor = '#C0392B'}
                  onBlur={e => e.target.style.borderColor = '#CED4DA'}
                >
                  {documentTypes.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: '#495057' }}>
                  Année *
                </label>
                <input type="number" value={projectForm.year} required
                  onChange={e => setProjectForm({ ...projectForm, year: e.target.value })}
                  className="w-full rounded px-4 py-2.5 text-sm focus:outline-none"
                  style={inputStyle}
                  onFocus={e => e.target.style.borderColor = '#C0392B'}
                  onBlur={e => e.target.style.borderColor = '#CED4DA'}
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowProjectModal(false)}
                  className="flex-1 font-medium py-2.5 rounded text-sm"
                  style={{ border: '1px solid #DEE2E6', color: '#6C757D' }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F8F9FA'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  Annuler
                </button>
                <button type="submit"
                  className="flex-1 text-white font-medium py-2.5 rounded text-sm"
                  style={{ backgroundColor: '#C0392B' }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = '#A93226'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = '#C0392B'}
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