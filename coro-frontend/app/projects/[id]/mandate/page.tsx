'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ExternalLink, Save } from 'lucide-react';
import api from '@/lib/api';
import AppLayout from '@/components/layout/AppLayout';
import TaskListsTab from './TaskListsTab';
import CommentsTab from './CommentsTab';
import TimesheetTab from './TimesheetTab';

const TABS = [
  { id: 'fiche', label: '📋 Fiche & Offre' },
  { id: 'tasks', label: '✅ Tâches' },
  { id: 'comments', label: '💬 Commentaires' },
  { id: 'timesheet', label: '⏱ Feuille de temps' },
];

const ACTIVITY_CATALOG = [
  { type: 'creation_document', label: 'Création ou mise à jour de document (PMU/PSI/PUE/PGC...)', duration: 'Variable', mode: 'presentiel' },
  { type: 'formation_equipe_urgence', label: 'Formation pour équipe d\'urgence', duration: '2h30 – 3h00', mode: 'presentiel' },
  { type: 'formation_equipe_urgence_exercice', label: 'Formation pour équipe d\'urgence + exercice simulé', duration: '3h00 – 3h30', mode: 'presentiel' },
  { type: 'formation_travail_chaud', label: 'Formation travail à chaud', duration: '2h00', mode: 'presentiel' },
  { type: 'formation_coordonnateur', label: 'Formation aux coordonnateurs d\'urgence', duration: '2h00', mode: 'presentiel' },
  { type: 'formation_epi', label: 'Formation équipe de première intervention (EPI)', duration: '2h00', mode: 'presentiel' },
  { type: 'formation_communication', label: 'Formation communication d\'urgence', duration: '2h00', mode: 'presentiel' },
  { type: 'formation_comportement', label: 'Formation comportement et attitude en situation d\'urgence', duration: '2h00', mode: 'presentiel' },
  { type: 'formation_locataires', label: 'Formation aux locataires', duration: '1h00', mode: 'teams' },
  { type: 'exercice_table', label: 'Exercice de table', duration: '2h00', mode: 'teams' },
  { type: 'exercice_evacuation', label: 'Exercice d\'évacuation annuel', duration: '3h00', mode: 'presentiel' },
];

export default function MandatePage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const [project, setProject] = useState<any>(null);
  const [mandate, setMandate] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState('fiche');
  const [selectedServices, setSelectedServices] = useState<{ type: string; isRecurring: boolean }[]>([]);
  const [generatingActivities, setGeneratingActivities] = useState(false);
  const [activitiesGenerated, setActivitiesGenerated] = useState(false);

  const [form, setForm] = useState({
    description: '',
    montantVendu: '',
    tauxHoraire: '',
    heuresBudgetees: '',
    lienDrive: '',
    ownerId: '',
    typeMandat: '',
    typeDelai: 'STANDARD',
    dateDebutDelai: '',
    alerteActive: true,
  });
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [showTypeMandatPopup, setShowTypeMandatPopup] = useState(false);

  useEffect(() => { fetchData(); }, [projectId]);

  const fetchData = async () => {
    try {
      const [projectRes, mandateRes, activitiesRes, teamRes] = await Promise.all([
        api.get(`/projects/${projectId}`),
        api.get(`/projects/${projectId}/mandate`).catch(() => ({ data: null })),
        api.get(`/projects/${projectId}/activities`).catch(() => ({ data: [] })),
        api.get('/users/organization').catch(() => ({ data: [] })),
      ]);
      setTeamMembers(teamRes.data || []);
      setProject(projectRes.data);
      const m = mandateRes.data;
      setMandate(m);
      if (m) {
        setForm({
          description: m.description || '',
          montantVendu: m.montantVendu?.toString() || '',
          tauxHoraire: m.tauxHoraire?.toString() || '',
          heuresBudgetees: m.heuresBudgetees?.toString() || '',
          lienDrive: m.lienDrive || '',
          ownerId: m.ownerId || '',
          typeMandat: m.typeMandat || '',
          typeDelai: m.typeDelai || 'STANDARD',
          dateDebutDelai: m.dateDebutDelai ? new Date(m.dateDebutDelai).toISOString().split('T')[0] : '',
          alerteActive: m.alerteActive !== false,
        });
        // Popup migration si typeMandat pas encore défini
        if (!m.typeMandat || m.typeMandat === '') setShowTypeMandatPopup(true);
      }
      const mandateActivities = (activitiesRes.data || []).filter((a: any) => a.sourceMandate);
      setSelectedServices(mandateActivities.map((a: any) => ({ type: a.type, isRecurring: a.isRecurring })));
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put(`/projects/${projectId}/mandate`, form);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      fetchData();
    } catch (err) { console.error(err); }
    finally { setSaving(false); }
  };

  const handleGenerateActivities = async () => {
    if (selectedServices.length === 0) return;
    setGeneratingActivities(true);
    try {
      await api.post(`/projects/${projectId}/activities/from-mandate`, {
        services: selectedServices,
      });
      setActivitiesGenerated(true);
      setTimeout(() => setActivitiesGenerated(false), 3000);
    } catch (err) { console.error(err); }
    finally { setGeneratingActivities(false); }
  };

  const montant = parseFloat(form.montantVendu) || 0;
  const taux = parseFloat(form.tauxHoraire) || 0;
  const budget = parseFloat(form.heuresBudgetees) || 0;
  const heuresReelles = mandate?.heuresReelles || 0;
  const coutReel = heuresReelles * taux;
  const margeEstimee = montant - coutReel;
  const margePct = montant > 0 ? Math.round((margeEstimee / montant) * 100) : 0;
  const heuresRestantes = budget - heuresReelles;
  const budgetPct = budget > 0 ? Math.min(Math.round((heuresReelles / budget) * 100), 100) : 0;

  const inputCls = "w-full px-3 py-2.5 text-sm rounded focus:outline-none";
  const inputSty = { border: '1px solid #CED4DA', color: '#2C3E50', backgroundColor: '#FFFFFF' };

  // Calcul délai livraison
  const today = new Date();
  const dateLimite = mandate?.dateLimite ? new Date(mandate.dateLimite) : null;
  const diffDays = dateLimite ? Math.ceil((dateLimite.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) : null;
  const delaiLevel = diffDays === null ? null
    : diffDays < 0 ? 'DEPASSE'
    : diffDays <= 3 ? 'CRITIQUE'
    : diffDays <= 7 ? 'URGENT'
    : diffDays <= 14 ? 'ATTENTION'
    : 'OK';
  const delaiColors: Record<string, { bg: string; text: string; border: string }> = {
    DEPASSE:  { bg: '#FDEDEC', text: '#C0392B', border: '#F1948A' },
    CRITIQUE: { bg: '#FDEDEC', text: '#C0392B', border: '#F1948A' },
    URGENT:   { bg: '#FEF9E7', text: '#E67E22', border: '#FAD7A0' },
    ATTENTION:{ bg: '#FEF9E7', text: '#F39C12', border: '#FAD7A0' },
    OK:       { bg: '#EAFAF1', text: '#27AE60', border: '#A9DFBF' },
  };

  if (loading) return (
    <AppLayout>
      {/* Popup migration type de mandat */}
      {showTypeMandatPopup && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="w-full max-w-md rounded-md p-8"
            style={{ backgroundColor: '#FFFFFF', boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
            <div className="text-center mb-6">
              <span style={{ fontSize: '36px' }}>⚙️</span>
              <h3 className="font-bold text-lg mt-3 mb-2" style={{ color: '#2C3E50' }}>
                Configuration requise
              </h3>
              <p className="text-sm" style={{ color: '#6C757D' }}>
                Ce mandat n'a pas encore été configuré. Choisissez le type pour activer le suivi des délais de livraison.
              </p>
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => {
                  setForm(f => ({ ...f, typeMandat: 'FORFAITAIRE' }));
                  setShowTypeMandatPopup(false);
                }}
                className="flex-1 py-4 rounded-md font-semibold text-sm transition-colors"
                style={{ backgroundColor: '#FDEDEC', color: '#C0392B', border: '2px solid #F1948A' }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F1948A'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = '#FDEDEC'}>
                <div className="text-2xl mb-2">📅</div>
                Forfaitaire
                <p className="text-xs font-normal mt-1" style={{ color: '#6C757D' }}>
                  Délai calculé automatiquement
                </p>
              </button>
              <button
                onClick={() => {
                  setForm(f => ({ ...f, typeMandat: 'ANNUEL' }));
                  setShowTypeMandatPopup(false);
                }}
                className="flex-1 py-4 rounded-md font-semibold text-sm transition-colors"
                style={{ backgroundColor: '#EBF5FB', color: '#2980B9', border: '2px solid #AED6F1' }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#AED6F1'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = '#EBF5FB'}>
                <div className="text-2xl mb-2">🔄</div>
                Annuel récurrent
                <p className="text-xs font-normal mt-1" style={{ color: '#6C757D' }}>
                  Pas de délai de livraison
                </p>
              </button>
            </div>
            <button
              onClick={() => setShowTypeMandatPopup(false)}
              className="w-full mt-4 text-xs py-2 rounded transition-colors"
              style={{ color: '#ADB5BD' }}
              onMouseEnter={e => e.currentTarget.style.color = '#6C757D'}
              onMouseLeave={e => e.currentTarget.style.color = '#ADB5BD'}>
              Ignorer pour l'instant
            </button>
          </div>
        </div>
      )}
      <div className="flex items-center justify-center py-24">
        <p className="text-sm animate-pulse" style={{ color: '#ADB5BD' }}>Chargement...</p>
      </div>
    </AppLayout>
  );

  return (
    <AppLayout>
      <button onClick={() => router.push(`/projects/${projectId}`)}
        className="text-sm mb-4 flex items-center gap-1 transition-colors"
        style={{ color: '#6C757D' }}
        onMouseEnter={e => e.currentTarget.style.color = '#2C3E50'}
        onMouseLeave={e => e.currentTarget.style.color = '#6C757D'}>
        ← Retour au projet
      </button>

      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: '#ADB5BD' }}>
            {project?.documentType} · {project?.client?.name}
          </p>
          <h1 className="text-2xl font-black" style={{ color: '#2C3E50' }}>{project?.name}</h1>
          <div className="h-1 w-16 mt-2" style={{ backgroundColor: '#C0392B' }} />
        </div>
        {activeTab === 'fiche' && (
          <div className="flex items-center gap-3">
            {activitiesGenerated && (
              <span className="text-xs px-3 py-1.5 rounded font-medium"
                style={{ backgroundColor: '#EAFAF1', color: '#27AE60', border: '1px solid #A9DFBF' }}>
                ✓ Activités générées
              </span>
            )}
            <button onClick={handleSave} disabled={saving}
              className="text-white text-sm font-medium px-4 py-2 rounded flex items-center gap-2 disabled:opacity-50"
              style={{ backgroundColor: saved ? '#27AE60' : '#C0392B' }}
              onMouseEnter={e => { if (!saving) e.currentTarget.style.backgroundColor = saved ? '#1E8449' : '#A93226'; }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = saved ? '#27AE60' : '#C0392B'; }}>
              <Save size={14} />
              {saving ? 'Sauvegarde...' : saved ? '✓ Sauvegardé' : 'Sauvegarder'}
            </button>
            {selectedServices.length > 0 && (
              <p className="text-xs mt-1" style={{ color: '#F39C12' }}>
                ⚠ Cliquez sur "Générer les activités" pour sauvegarder les services cochés
              </p>
            )}
          </div>
        )}
      </div>

      <div className="flex gap-2 mb-6 pb-4" style={{ borderBottom: '1px solid #E9ECEF' }}>
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className="px-4 py-2 rounded text-sm font-medium transition-colors"
            style={{
              backgroundColor: activeTab === tab.id ? '#C0392B' : '#F8F9FA',
              color: activeTab === tab.id ? '#FFFFFF' : '#6C757D',
              border: activeTab === tab.id ? '1px solid #C0392B' : '1px solid #DEE2E6',
            }}>
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'fiche' && (
        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2 space-y-6">

            {/* Description */}
            <div className="rounded-md p-6" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E9ECEF' }}>
              <h2 className="font-semibold mb-4" style={{ color: '#2C3E50' }}>📄 Description du mandat</h2>
              <p className="text-xs mb-2" style={{ color: '#6C757D' }}>
                Briefing pour le conseiller — contexte, particularités, informations importantes
              </p>
              <textarea value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                rows={8}
                placeholder="Ex: Client multi-locataires avec 3 bâtiments distincts. Contact principal : Marie Tremblay..."
                className="w-full px-3 py-2.5 text-sm rounded resize-vertical focus:outline-none"
                style={{ border: '1px solid #CED4DA', color: '#2C3E50', backgroundColor: '#FFFFFF', minHeight: '160px' }}
                onFocus={e => e.target.style.borderColor = '#C0392B'}
                onBlur={e => e.target.style.borderColor = '#CED4DA'} />
            </div>

            {/* Offre de service */}
            <div className="rounded-md p-6" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E9ECEF' }}>
              <h2 className="font-semibold mb-4" style={{ color: '#2C3E50' }}>💼 Offre de service</h2>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: '#6C757D' }}>Montant vendu ($)</label>
                  <input type="number" value={form.montantVendu}
                    onChange={e => setForm({ ...form, montantVendu: e.target.value })}
                    placeholder="0.00" min="0" step="0.01"
                    className={inputCls} style={inputSty}
                    onFocus={e => e.target.style.borderColor = '#C0392B'}
                    onBlur={e => e.target.style.borderColor = '#CED4DA'} />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: '#6C757D' }}>Taux horaire ($/h)</label>
                  <input type="number" value={form.tauxHoraire}
                    onChange={e => setForm({ ...form, tauxHoraire: e.target.value })}
                    placeholder="0.00" min="0" step="0.01"
                    className={inputCls} style={inputSty}
                    onFocus={e => e.target.style.borderColor = '#C0392B'}
                    onBlur={e => e.target.style.borderColor = '#CED4DA'} />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: '#6C757D' }}>Heures budgétées</label>
                  <input type="number" value={form.heuresBudgetees}
                    onChange={e => setForm({ ...form, heuresBudgetees: e.target.value })}
                    placeholder="0" min="0" step="0.5"
                    className={inputCls} style={inputSty}
                    onFocus={e => e.target.style.borderColor = '#C0392B'}
                    onBlur={e => e.target.style.borderColor = '#CED4DA'} />
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: '#6C757D' }}>Lien Google Drive</label>
                <div className="flex gap-2">
                  <input type="url" value={form.lienDrive}
                    onChange={e => setForm({ ...form, lienDrive: e.target.value })}
                    placeholder="https://drive.google.com/drive/folders/..."
                    className={`flex-1 ${inputCls}`} style={inputSty}
                    onFocus={e => e.target.style.borderColor = '#C0392B'}
                    onBlur={e => e.target.style.borderColor = '#CED4DA'} />
                  {form.lienDrive && (
                    <a href={form.lienDrive} target="_blank" rel="noopener noreferrer"
                      className="px-3 py-2.5 rounded flex items-center gap-1 text-sm transition-colors"
                      style={{ border: '1px solid #AED6F1', color: '#2980B9' }}
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = '#EBF5FB'}
                      onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                      <ExternalLink size={14} /> Ouvrir
                    </a>
                  )}
                </div>
              </div>

              {/* Propriétaire du mandat */}
              <div className="mt-4">
                <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: '#6C757D' }}>
                  Conseiller responsable du mandat
                </label>
                <select value={form.ownerId}
                  onChange={e => setForm({ ...form, ownerId: e.target.value })}
                  className="w-full px-3 py-2.5 text-sm rounded"
                  style={{ border: '1px solid #CED4DA', color: '#2C3E50', backgroundColor: '#FFFFFF' }}>
                  <option value="">— Non assigné —</option>
                  {teamMembers.map((m: any) => (
                    <option key={m.id} value={m.id}>
                      {m.firstName} {m.lastName}
                    </option>
                  ))}
                </select>
              </div>

              {/* Services vendus */}
              <div className="mt-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-sm" style={{ color: '#2C3E50' }}>
                    Services vendus
                    {selectedServices.length > 0 && (
                      <span className="ml-2 text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{ backgroundColor: '#EAFAF1', color: '#27AE60' }}>
                        {selectedServices.length} sélectionné{selectedServices.length > 1 ? 's' : ''}
                      </span>
                    )}
                  </h3>
                  <button onClick={handleGenerateActivities}
                    disabled={generatingActivities || selectedServices.length === 0}
                    className="text-xs font-medium px-3 py-1.5 rounded flex items-center gap-1.5 disabled:opacity-50"
                    style={{ backgroundColor: '#C0392B', color: '#FFFFFF' }}
                    onMouseEnter={e => { if (selectedServices.length > 0) e.currentTarget.style.backgroundColor = '#A93226'; }}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = '#C0392B'}>
                    {generatingActivities ? '⏳ Génération...' : '⚡ Générer les activités'}
                  </button>
                </div>
                <p className="text-xs mb-3" style={{ color: '#ADB5BD' }}>
                  Cochez les services inclus dans l'offre. Choisissez si c'est une fois ou récurrent annuellement.
                </p>
                <div className="space-y-2">
                  {ACTIVITY_CATALOG.map(activity => {
                    const selected = selectedServices.find(s => s.type === activity.type);
                    return (
                      <div key={activity.type}
                        className="flex items-center justify-between p-3 rounded transition-colors"
                        style={{
                          backgroundColor: selected ? '#EAFAF1' : '#F8F9FA',
                          border: `1px solid ${selected ? '#A9DFBF' : '#E9ECEF'}`,
                        }}>
                        <label className="flex items-center gap-3 cursor-pointer flex-1">
                          <input type="checkbox"
                            checked={!!selected}
                            onChange={e => {
                              if (e.target.checked) {
                                setSelectedServices([...selectedServices, { type: activity.type, isRecurring: false }]);
                              } else {
                                setSelectedServices(selectedServices.filter(s => s.type !== activity.type));
                              }
                            }}
                            style={{ accentColor: '#27AE60', width: '16px', height: '16px', flexShrink: 0 }} />
                          <div>
                            <p className="text-sm font-medium" style={{ color: '#2C3E50' }}>{activity.label}</p>
                            <p className="text-xs" style={{ color: '#ADB5BD' }}>
                              ⏱ {activity.duration} · {activity.mode === 'teams' ? '💻 Teams' : '📍 Présentiel'}
                            </p>
                          </div>
                        </label>
                        {selected && (
                          <div className="flex gap-2 ml-4 flex-shrink-0">
                            {[
                              { key: 'once', label: '1× Une fois', isRecurring: false },
                              { key: 'recurring', label: '↺ Récurrent', isRecurring: true },
                            ].map(opt => (
                              <button key={opt.key}
                                onClick={() => setSelectedServices(selectedServices.map(s =>
                                  s.type === activity.type ? { ...s, isRecurring: opt.isRecurring } : s
                                ))}
                                className="text-xs px-2.5 py-1 rounded font-medium transition-colors"
                                style={{
                                  backgroundColor: selected.isRecurring === opt.isRecurring ? '#2980B9' : '#F8F9FA',
                                  color: selected.isRecurring === opt.isRecurring ? '#FFFFFF' : '#6C757D',
                                  border: `1px solid ${selected.isRecurring === opt.isRecurring ? '#2980B9' : '#DEE2E6'}`,
                                }}>
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Colonne droite */}
          <div className="space-y-4">
            <div className="rounded-md p-5" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E9ECEF' }}>
              <p className="text-xs font-bold uppercase tracking-wide mb-3" style={{ color: '#ADB5BD' }}>Budget heures</p>
              <div className="flex items-end gap-1 mb-2">
                <span className="text-3xl font-black"
                  style={{ color: budgetPct > 90 ? '#C0392B' : budgetPct > 70 ? '#F39C12' : '#27AE60' }}>
                  {heuresReelles}h
                </span>
                <span className="text-sm mb-1" style={{ color: '#ADB5BD' }}>/ {budget}h</span>
              </div>
              <div className="w-full h-2 rounded-full mb-2" style={{ backgroundColor: '#E9ECEF' }}>
                <div className="h-2 rounded-full transition-all" style={{
                  width: `${budgetPct}%`,
                  backgroundColor: budgetPct > 90 ? '#C0392B' : budgetPct > 70 ? '#F39C12' : '#27AE60',
                }} />
              </div>
              <p className="text-xs" style={{ color: heuresRestantes < 0 ? '#C0392B' : '#6C757D' }}>
                {heuresRestantes >= 0 ? `${heuresRestantes}h restantes` : `${Math.abs(heuresRestantes)}h dépassées`}
              </p>
            </div>

            <div className="rounded-md p-5" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E9ECEF' }}>
              <p className="text-xs font-bold uppercase tracking-wide mb-3" style={{ color: '#ADB5BD' }}>Rentabilité estimée</p>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-xs" style={{ color: '#6C757D' }}>Montant vendu</span>
                  <span className="text-sm font-bold" style={{ color: '#2C3E50' }}>
                    {montant > 0 ? `${montant.toFixed(2)} $` : '—'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs" style={{ color: '#6C757D' }}>Coût réel ({heuresReelles}h × {taux}$)</span>
                  <span className="text-sm font-bold" style={{ color: '#2C3E50' }}>
                    {coutReel > 0 ? `${coutReel.toFixed(2)} $` : '—'}
                  </span>
                </div>
                <div className="h-px" style={{ backgroundColor: '#E9ECEF' }} />
                <div className="flex justify-between">
                  <span className="text-xs font-semibold" style={{ color: '#6C757D' }}>Marge estimée</span>
                  <span className="text-sm font-black" style={{ color: margeEstimee >= 0 ? '#27AE60' : '#C0392B' }}>
                    {montant > 0 ? `${margeEstimee.toFixed(2)} $ (${margePct}%)` : '—'}
                  </span>
                </div>
              </div>
            </div>

            {/* Bloc délai de livraison */}
            <div className="rounded-md p-5" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E9ECEF' }}>
              <p className="text-xs font-bold uppercase tracking-wide mb-3" style={{ color: '#ADB5BD' }}>
                ⏱ Délai de livraison
              </p>

              {/* Type de mandat */}
              <div className="mb-3">
                <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: '#6C757D' }}>
                  Type de mandat
                </label>
                <div className="flex gap-2">
                  {[
                    { value: 'FORFAITAIRE', label: '📅 Forfaitaire' },
                    { value: 'ANNUEL', label: '🔄 Annuel' },
                  ].map(opt => (
                    <button key={opt.value}
                      onClick={() => setForm(f => ({ ...f, typeMandat: opt.value }))}
                      className="flex-1 py-2 rounded text-xs font-medium transition-colors"
                      style={{
                        backgroundColor: form.typeMandat === opt.value ? '#2C3E50' : '#F8F9FA',
                        color: form.typeMandat === opt.value ? '#FFFFFF' : '#6C757D',
                        border: `1px solid ${form.typeMandat === opt.value ? '#2C3E50' : '#DEE2E6'}`,
                      }}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {form.typeMandat === 'FORFAITAIRE' && (
                <>
                  {/* Type délai */}
                  <div className="mb-3">
                    <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: '#6C757D' }}>
                      Type de document
                    </label>
                    <div className="flex gap-2">
                      {[
                        { value: 'STANDARD', label: 'PMU/PSI/PCA' },
                        { value: 'EVACUATION', label: 'Plan évacuation' },
                      ].map(opt => (
                        <button key={opt.value}
                          onClick={() => setForm(f => ({ ...f, typeDelai: opt.value }))}
                          className="flex-1 py-1.5 rounded text-xs font-medium transition-colors"
                          style={{
                            backgroundColor: form.typeDelai === opt.value ? '#C0392B' : '#F8F9FA',
                            color: form.typeDelai === opt.value ? '#FFFFFF' : '#6C757D',
                            border: `1px solid ${form.typeDelai === opt.value ? '#C0392B' : '#DEE2E6'}`,
                          }}>
                          {opt.label}
                        </button>
                      ))}
                    </div>
                    <p className="text-xs mt-1" style={{ color: '#ADB5BD' }}>
                      {form.typeDelai === 'EVACUATION' ? '15 jours max' : parseFloat(form.heuresBudgetees) > 30 ? '90 jours max' : '21 jours max'}
                    </p>
                  </div>

                  {/* Date de début */}
                  <div className="mb-3">
                    <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: '#6C757D' }}>
                      Date visite/relevé technique
                    </label>
                    <input type="date"
                      value={form.dateDebutDelai}
                      onChange={e => setForm(f => ({ ...f, dateDebutDelai: e.target.value }))}
                      className="w-full px-3 py-2 text-sm rounded focus:outline-none"
                      style={{ border: '1px solid #CED4DA', color: '#2C3E50' }}
                      onFocus={e => e.target.style.borderColor = '#C0392B'}
                      onBlur={e => e.target.style.borderColor = '#CED4DA'} />
                    <p className="text-xs mt-1" style={{ color: '#ADB5BD' }}>
                      Le délai démarre automatiquement à cette date
                    </p>
                  </div>

                  {/* Alerte active */}
                  <label className="flex items-center gap-2 mb-3 cursor-pointer">
                    <input type="checkbox"
                      checked={form.alerteActive}
                      onChange={e => setForm(f => ({ ...f, alerteActive: e.target.checked }))}
                      style={{ accentColor: '#C0392B', width: '14px', height: '14px' }} />
                    <span className="text-xs" style={{ color: '#6C757D' }}>Alertes actives</span>
                  </label>

                  {/* Affichage du délai calculé */}
                  {mandate?.dateLimite && delaiLevel && (
                    <div className="rounded p-3 mt-2"
                      style={{
                        backgroundColor: delaiColors[delaiLevel]?.bg,
                        border: `1px solid ${delaiColors[delaiLevel]?.border}`,
                      }}>
                      <p className="text-xs font-bold mb-1" style={{ color: delaiColors[delaiLevel]?.text }}>
                        {delaiLevel === 'DEPASSE' ? `🔴 Dépassé depuis ${Math.abs(diffDays!)} jour(s)` :
                         delaiLevel === 'CRITIQUE' ? `🔴 Expire dans ${diffDays} jour(s)` :
                         delaiLevel === 'URGENT' ? `🟠 Expire dans ${diffDays} jour(s)` :
                         delaiLevel === 'ATTENTION' ? `🟡 Expire dans ${diffDays} jour(s)` :
                         `✅ ${diffDays} jour(s) restants`}
                      </p>
                      <p className="text-xs" style={{ color: '#6C757D' }}>
                        Date limite : {new Date(mandate.dateLimite).toLocaleDateString('fr-CA', { day: 'numeric', month: 'long', year: 'numeric' })}
                        {mandate.delaiJours && ` (${mandate.delaiJours} jours)`}
                      </p>
                    </div>
                  )}
                </>
              )}

              {form.typeMandat === 'ANNUEL' && (
                <div className="rounded p-3 mt-1"
                  style={{ backgroundColor: '#EBF5FB', border: '1px solid #AED6F1' }}>
                  <p className="text-xs" style={{ color: '#2980B9' }}>
                    🔄 Mandat annuel récurrent — aucun délai de livraison applicable.
                  </p>
                </div>
              )}
            </div>

            <div className="rounded-md p-5" style={{ backgroundColor: '#F8F9FA', border: '1px solid #E9ECEF' }}>
              <p className="text-xs font-bold uppercase tracking-wide mb-3" style={{ color: '#ADB5BD' }}>Infos projet</p>
              <div className="space-y-2">
                {[
                  { label: 'Client', value: project?.client?.name },
                  { label: 'Bâtiment', value: project?.building?.name },
                  { label: 'Type', value: project?.documentType },
                  { label: 'Année', value: project?.year },
                ].map(info => (
                  <div key={info.label} className="flex justify-between">
                    <span className="text-xs" style={{ color: '#ADB5BD' }}>{info.label}</span>
                    <span className="text-xs font-medium" style={{ color: '#2C3E50' }}>{info.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'tasks' && (
        <TaskListsTab projectId={projectId} teamMembers={teamMembers} />
      )}

      {activeTab === 'comments' && (
        <CommentsTab projectId={projectId} />
      )}

      {activeTab === 'timesheet' && (
        <TimesheetTab projectId={projectId} mandate={mandate} />
      )}

    </AppLayout>
  );
}