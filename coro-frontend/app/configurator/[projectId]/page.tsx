'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';
import api from '@/lib/api';

interface SchemaField {
  key: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'boolean' | 'checkbox_group';
  options?: string[];
  checkboxOptions?: string[];
}

interface Field {
  key: string;
  label: string;
  type: 'boolean' | 'text' | 'number' | 'select' | 'dynamic_list' | 'checkbox_group';
  options?: string[];
  checkboxOptions?: string[];
  schema?: SchemaField[];
}

interface Section {
  id: string;
  title: string;
  icon: string;
  fields: Field[];
}

interface ValidationResult {
  type: 'INFO' | 'RECOMMANDATION' | 'AVERTISSEMENT' | 'ERREUR' | 'CRITIQUE';
  code: string;
  message: string;
  reference?: string;
}

interface AnalysisResult {
  rolesActives: string[];
  rolesRecommandes: string[];
  proceduresActives: string[];
  sectionsDocument: string[];
  validations: ValidationResult[];
  score: number;
}

const validationColors: Record<string, string> = {
  INFO: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  RECOMMANDATION: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  AVERTISSEMENT: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  ERREUR: 'bg-red-500/10 text-red-400 border-red-500/20',
  CRITIQUE: 'bg-red-700/20 text-red-300 border-red-700/30',
};

const validationIcons: Record<string, string> = {
  INFO: 'ℹ',
  RECOMMANDATION: '💡',
  AVERTISSEMENT: '⚠',
  ERREUR: '✖',
  CRITIQUE: '🚨',
};

// Composant liste dynamique
function DynamicListEditor({ field, items, onChange }: {
  field: Field;
  items: any[];
  onChange: (items: any[]) => void;
}) {
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const schema = field.schema || [];

  const initItem = () => {
    const item: Record<string, any> = {};
    schema.forEach(f => {
      if (f.type === 'boolean') item[f.key] = false;
      else if (f.type === 'number') item[f.key] = 0;
      else item[f.key] = '';
    });
    return item;
  };

  const handleAdd = () => {
    const newItem = initItem();
    const newItems = [...items, newItem];
    onChange(newItems);
    setExpandedIdx(newItems.length - 1);
  };

  const handleUpdate = (idx: number, key: string, value: any) => {
    const updated = [...items];
    updated[idx] = { ...updated[idx], [key]: value };
    onChange(updated);
  };

  const handleDelete = (idx: number) => {
    const updated = items.filter((_, i) => i !== idx);
    onChange(updated);
    if (expandedIdx === idx) setExpandedIdx(null);
    else if (expandedIdx !== null && expandedIdx > idx) setExpandedIdx(expandedIdx - 1);
  };

  const getSummary = (item: any) => {
    return schema
      .filter(sf => item[sf.key] && item[sf.key] !== '' && item[sf.key] !== false && item[sf.key] !== 0)
      .map(sf => {
        if (sf.type === 'boolean') return item[sf.key] ? sf.label : null;
        return item[sf.key];
      })
      .filter(Boolean)
      .join(' — ');
  };

  return (
    <div className="space-y-2">
      {items.map((item, idx) => (
        <div key={idx} className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
              <span className="bg-orange-500/20 text-orange-400 text-xs font-bold w-6 h-6 rounded flex items-center justify-center">
                {idx + 1}
              </span>
              <span className="text-gray-300 text-sm truncate max-w-xs">
                {getSummary(item) || 'Nouveau (cliquer pour modifier)'}
              </span>
            </div>
            <div className="flex gap-3 flex-shrink-0">
              <button
                onClick={() => setExpandedIdx(expandedIdx === idx ? null : idx)}
                className="text-xs text-blue-400 hover:text-blue-300 transition-colors">
                {expandedIdx === idx ? 'Fermer' : 'Modifier'}
              </button>
              <button
                onClick={() => handleDelete(idx)}
                className="text-xs text-red-400 hover:text-red-300 transition-colors">
                Supprimer
              </button>
            </div>
          </div>

          {expandedIdx === idx && (
            <div className="border-t border-gray-700 px-4 py-4 space-y-3 bg-gray-850">
              {schema.map(sf => (
                <div key={sf.key}>
                  <label className="text-xs text-gray-400 mb-1.5 block">{sf.label}</label>
                  {sf.type === 'select' && (
                    <select
                      value={item[sf.key] || ''}
                      onChange={e => handleUpdate(idx, sf.key, e.target.value)}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500">
                      <option value="">Selectionner...</option>
                      {sf.options?.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  )}
                  {sf.type === 'text' && (
                    <input
                      type="text"
                      value={item[sf.key] || ''}
                      onChange={e => handleUpdate(idx, sf.key, e.target.value)}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500"
                      placeholder="Entrer une valeur..."/>
                  )}
                  {sf.type === 'number' && (
                    <input
                      type="number"
                      value={item[sf.key] || ''}
                      onChange={e => handleUpdate(idx, sf.key, parseInt(e.target.value) || 0)}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500"/>
                  )}
                  {sf.type === 'boolean' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleUpdate(idx, sf.key, true)}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                          item[sf.key] === true
                            ? 'bg-green-500/20 text-green-400 border border-green-500/40'
                            : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}>
                        Oui
                      </button>
                      <button
                        onClick={() => handleUpdate(idx, sf.key, false)}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                          item[sf.key] === false
                            ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                            : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}>
                        Non
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}

      <button
        onClick={handleAdd}
        className="w-full border-2 border-dashed border-orange-500/30 text-orange-400 hover:bg-orange-500/5 hover:border-orange-500/50 text-sm py-3 rounded-lg transition-all flex items-center justify-center gap-2">
        <span className="text-lg">+</span>
        <span>Ajouter un element</span>
      </button>
    </div>
  );
}

// Composant checkbox group
function CheckboxGroupField({ field, value, onChange }: {
  field: Field;
  value: string[];
  onChange: (value: string[]) => void;
}) {
  const toggle = (opt: string) => {
    if (value.includes(opt)) {
      onChange(value.filter(v => v !== opt));
    } else {
      onChange([...value, opt]);
    }
  };

  return (
    <div className="grid grid-cols-2 gap-2">
      {field.checkboxOptions?.map(opt => (
        <label
          key={opt}
          className={`flex items-center gap-2.5 p-2.5 rounded-lg cursor-pointer transition-colors ${
            value.includes(opt)
              ? 'bg-orange-500/15 border border-orange-500/30'
              : 'bg-gray-800 border border-gray-700 hover:bg-gray-750'
          }`}>
          <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
            value.includes(opt) ? 'bg-orange-500 border-orange-500' : 'border-gray-500'
          }`}>
            {value.includes(opt) && <span className="text-white text-xs font-bold">✓</span>}
          </div>
          <span className={`text-xs ${value.includes(opt) ? 'text-orange-300' : 'text-gray-300'}`}>
            {opt}
          </span>
        </label>
      ))}
    </div>
  );
}

export default function ConfiguratorPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.projectId as string;
  const { isAuthenticated, initAuth } = useAuthStore();

  const [sections, setSections] = useState<Section[]>([]);
  const [activeSection, setActiveSection] = useState(0);
  const [config, setConfig] = useState<Record<string, any>>({});
  const [lists, setLists] = useState<Record<string, any[]>>({});
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [projectName, setProjectName] = useState('');

  useEffect(() => {
    initAuth();
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchData();
    } else {
      const token = localStorage.getItem('coro_token');
      if (!token) router.push('/login');
    }
  }, [isAuthenticated]);

  const fetchData = async () => {
    try {
      const [questionsRes, projectRes] = await Promise.all([
        api.get('/configurator/questions'),
        api.get(`/projects/${projectId}`),
      ]);
      setSections(questionsRes.data.sections);
      setProjectName(projectRes.data.name);

      const defaults: Record<string, any> = {};
      const defaultLists: Record<string, any[]> = {};
      questionsRes.data.sections.forEach((s: Section) => {
        s.fields.forEach((f: Field) => {
          if (f.type === 'boolean') defaults[f.key] = false;
          else if (f.type === 'number') defaults[f.key] = 0;
          else if (f.type === 'text') defaults[f.key] = '';
          else if (f.type === 'select') defaults[f.key] = '';
          else if (f.type === 'checkbox_group') defaults[f.key] = [];
          else if (f.type === 'dynamic_list') defaultLists[f.key] = [];
        });
      });
      setConfig(defaults);
      setLists(defaultLists);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const triggerAnalysis = async (newConfig: Record<string, any>, newLists: Record<string, any[]>) => {
    setAnalyzing(true);
    try {
      const payload = { ...newConfig, ...newLists };
      const res = await api.post('/configurator/analyze', payload);
      setAnalysis(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setAnalyzing(false);
    }
  };

  const updateConfig = (key: string, value: any) => {
    const newConfig = { ...config, [key]: value };
    setConfig(newConfig);
    triggerAnalysis(newConfig, lists);
  };

  const updateList = (key: string, items: any[]) => {
    const newLists = { ...lists, [key]: items };
    setLists(newLists);
    triggerAnalysis(config, newLists);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.post(`/configurator/save/${projectId}`, { ...config, ...lists });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const isFieldVisible = (field: Field): boolean => {
    if (field.key === 'zoneConfinement' || field.key === 'zoneRafraichissement') return config['certBOMA'] === true;
    if (field.key === 'certBOMANiveau') return config['certBOMA'] === true;
    if (field.key === 'certLEEDNiveau') return config['certLEED'] === true;
    if (field.key === 'nbLocataires') return config['multiLocataires'] === true;
    if (field.key === 'panneauAnnonciateurLieu') return config['panneauAnnonciateurDistance'] === true;
    if (['centraleSurveillance', 'centraleTelephone', 'centraleCodeClient'].includes(field.key)) return config['teleSurveillance'] === true;
    if (['nbAscenseurs', 'typeAscenseur', 'salleAscenseur', 'ascenseurPompier', 'rappelAscenseursLieu', 'telephoneAscenseurs', 'fonctionneSecours'].includes(field.key)) return config['ascenseurs'] === true;
    if (field.key === 'ascenseurPompierLequel') return config['ascenseurPompier'] === true;
    if (['gicleursSystemes', 'salleGicleurs', 'pompeIncendie', 'gapmUsgpm', 'boyauIncendie', 'boyauCabinet', 'priseRefoulement', 'raccordPompier', 'raccordPompierLieu', 'bornesFontaine', 'bornesFontaineLieu', 'vannesIsolement', 'vannesIsolementLieu'].includes(field.key)) return config['gicleurs'] === true;
    if (field.key === 'extincteursList') return config['extincteurPortatif'] === true;
    if (field.key === 'systemeExtinctionFixeLieu') return config['systemeExtinctionFixe'] === true;
    if (field.key === 'systemePreActionLieu') return config['systemePreAction'] === true;
    if (field.key === 'systemeHalogenLieu') return config['systemeHalogen'] === true;
    if (field.key === 'systemeCO2Lieu') return config['systemeCO2'] === true;
    if (['cvacType', 'cvacLocalisation'].includes(field.key)) return config['cvac'] === true;
    if (field.key === 'desenfumageLieu') return config['desenfumage'] === true;
    if (['nbGeneratrices', 'generatriceNom', 'generatriceLieu', 'generatriceCarburant', 'autonomieGeneratrice', 'capaciteReservoir', 'generatriceEquipements'].includes(field.key)) return config['generatrice'] === true;
    if (field.key === 'gazNaturelLieu') return config['gazNaturel'] === true;
    if (field.key === 'propaneLieu') return config['propane'] === true;
    if (['detecteurCOSeuil1', 'detecteurCOSeuil2', 'detecteurCOLieu'].includes(field.key)) return config['detecteurCO'] === true;
    if (field.key === 'detecteurGazNaturelLieu') return config['detecteurGazNaturel'] === true;
    if (['detecteurAmmoniacSeuil1', 'detecteurAmmoniacSeuil2'].includes(field.key)) return config['detecteurAmmoniac'] === true;
    if (field.key === 'matieresList') return config['matieresDangereuses'] === true;
    if (field.key === 'trousseDeversementLieu') return config['trousseDeversement'] === true;
    if (['chariotsElevateursBatterie', 'chariotsElevateursLieu'].includes(field.key)) return config['chariotsElevateurs'] === true;
    if (field.key === 'mezzanineLieu') return config['mezzanine'] === true;
    if (field.key === 'procesDangereuxDesc') return config['procesDangereux'] === true;
    if (field.key === 'espaceClosLieu') return config['espaceClos'] === true;
    if (['systemePhonicType', 'messagesAutomatises'].includes(field.key)) return config['systemePhonic'] === true;
    if (field.key === 'nbRadios') return config['radiosCommunication'] === true;
    return true;
  };

  const currentSection = sections[activeSection];

  const visibleFields = currentSection ? currentSection.fields.filter(isFieldVisible) : [];
  const completedFields = visibleFields.filter(f => {
    if (f.type === 'dynamic_list') return (lists[f.key] || []).length > 0;
    if (f.type === 'checkbox_group') return (config[f.key] || []).length > 0;
    if (f.type === 'boolean') return config[f.key] === true;
    return config[f.key] !== '' && config[f.key] !== 0;
  }).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <p className="text-gray-400">Chargement du configurateur...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Topbar */}
      <div className="bg-gray-900 border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-white cursor-pointer" onClick={() => router.push('/dashboard')}>
            CO<span className="text-orange-500">RO</span>
          </h1>
          <span className="text-gray-600">|</span>
          <span className="text-gray-300 text-sm">Configurateur</span>
          <span className="text-gray-600">|</span>
          <span className="text-orange-400 text-sm font-medium">{projectName}</span>
        </div>
        <div className="flex items-center gap-3">
          {analysis && (
            <div className="flex items-center gap-2 bg-gray-800 px-3 py-1.5 rounded-lg">
              <span className="text-gray-400 text-xs">Conformite</span>
              <span className={`font-bold text-base ${
                analysis.score >= 80 ? 'text-green-400' :
                analysis.score >= 60 ? 'text-yellow-400' : 'text-red-400'}`}>
                {analysis.score}/100
              </span>
            </div>
          )}
          <button
            onClick={() => router.push(`/projects/${projectId}`)}
            className="bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium px-4 py-2 rounded-lg text-sm transition-colors">
            Retour au projet
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-medium px-4 py-2 rounded-lg text-sm transition-colors">
            {saving ? 'Sauvegarde...' : saved ? '✓ Sauvegarde!' : 'Sauvegarder'}
          </button>
        </div>
      </div>

      <div className="flex h-[calc(100vh-65px)]">

        {/* Sidebar navigation */}
        <div className="w-56 bg-gray-900 border-r border-gray-800 overflow-y-auto flex-shrink-0">
          <div className="p-3">
            {sections.map((section, idx) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(idx)}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-xs mb-1 transition-colors flex items-center gap-2 ${
                  activeSection === idx
                    ? 'bg-orange-500/15 text-orange-400 font-medium border border-orange-500/20'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}>
                <span>{section.icon}</span>
                <span>{section.title}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Formulaire principal */}
        <div className="flex-1 overflow-y-auto p-6">
          {currentSection && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{currentSection.icon}</span>
                  <div>
                    <h2 className="text-xl font-semibold text-white">{currentSection.title}</h2>
                    <p className="text-gray-500 text-sm">
                      Section {activeSection + 1} / {sections.length}
                      {visibleFields.length > 0 && (
                        <span className="ml-2 text-orange-400">
                          {completedFields}/{visibleFields.length} completes
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid gap-3 max-w-2xl">
                {visibleFields.map((field) => (
                  <div key={field.key}
                    className="bg-gray-900 border border-gray-800 rounded-xl p-4 hover:border-gray-700 transition-colors">
                    <label className="block text-sm text-gray-300 mb-2.5">{field.label}</label>

                    {field.type === 'boolean' && (
                      <div className="flex gap-3">
                        <button onClick={() => updateConfig(field.key, true)}
                          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                            config[field.key] === true
                              ? 'bg-green-500/20 text-green-400 border border-green-500/40'
                              : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
                          Oui
                        </button>
                        <button onClick={() => updateConfig(field.key, false)}
                          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                            config[field.key] === false
                              ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                              : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
                          Non
                        </button>
                      </div>
                    )}

                    {field.type === 'select' && (
                      <select
                        value={config[field.key] || ''}
                        onChange={(e) => updateConfig(field.key, e.target.value)}
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-orange-500">
                        <option value="">Selectionner...</option>
                        {field.options?.map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    )}

                    {field.type === 'text' && (
                      <input type="text"
                        value={config[field.key] || ''}
                        onChange={(e) => updateConfig(field.key, e.target.value)}
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-orange-500"
                        placeholder="Entrer une valeur..."/>
                    )}

                    {field.type === 'number' && (
                      <input type="number"
                        value={config[field.key] || ''}
                        onChange={(e) => updateConfig(field.key, parseInt(e.target.value) || 0)}
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-orange-500"/>
                    )}

                    {field.type === 'checkbox_group' && (
                      <CheckboxGroupField
                        field={field}
                        value={config[field.key] || []}
                        onChange={(val) => updateConfig(field.key, val)}/>
                    )}

                    {field.type === 'dynamic_list' && (
                      <DynamicListEditor
                        field={field}
                        items={lists[field.key] || []}
                        onChange={(items) => updateList(field.key, items)}/>
                    )}
                  </div>
                ))}
              </div>

              {/* Navigation */}
              <div className="flex gap-3 mt-6 max-w-2xl">
                {activeSection > 0 && (
                  <button onClick={() => setActiveSection(activeSection - 1)}
                    className="flex-1 bg-gray-800 hover:bg-gray-700 text-white font-medium py-3 rounded-xl transition-colors">
                    ← Precedent
                  </button>
                )}
                {activeSection < sections.length - 1 && (
                  <button onClick={() => setActiveSection(activeSection + 1)}
                    className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-medium py-3 rounded-xl transition-colors">
                    Suivant →
                  </button>
                )}
                {activeSection === sections.length - 1 && (
                  <button onClick={handleSave}
                    className="flex-1 bg-green-500 hover:bg-green-600 text-white font-medium py-3 rounded-xl transition-colors">
                    Terminer la configuration
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Panneau analyse droite */}
        <div className="w-80 bg-gray-900 border-l border-gray-800 overflow-y-auto flex-shrink-0">
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold text-sm">Analyse en temps reel</h3>
              {analyzing && (
                <span className="text-orange-400 text-xs animate-pulse">Analyse...</span>
              )}
            </div>

            {!analysis ? (
              <p className="text-gray-600 text-xs text-center py-8">
                Repondez aux questions pour voir l analyse
              </p>
            ) : (
              <div className="space-y-4">
                {/* Score */}
                <div className="bg-gray-800 rounded-xl p-4">
                  <p className="text-gray-400 text-xs mb-2">Score de conformite</p>
                  <div className="flex items-end gap-2">
                    <span className={`text-3xl font-bold ${
                      analysis.score >= 80 ? 'text-green-400' :
                      analysis.score >= 60 ? 'text-yellow-400' : 'text-red-400'}`}>
                      {analysis.score}
                    </span>
                    <span className="text-gray-500 text-sm mb-1">/100</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-1.5 mt-2">
                    <div className={`h-1.5 rounded-full transition-all ${
                      analysis.score >= 80 ? 'bg-green-500' :
                      analysis.score >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`}
                      style={{ width: `${analysis.score}%` }}>
                    </div>
                  </div>
                </div>

                {/* Roles actives */}
                {analysis.rolesActives.length > 0 && (
                  <div>
                    <p className="text-gray-400 text-xs mb-2 font-medium">
                      Roles actives ({analysis.rolesActives.length})
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {analysis.rolesActives.map((role) => (
                        <span key={role} className="bg-orange-500/15 text-orange-400 text-xs px-2 py-1 rounded font-mono">
                          {role}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Roles recommandes */}
                {analysis.rolesRecommandes.length > 0 && (
                  <div>
                    <p className="text-gray-400 text-xs mb-2 font-medium">
                      Roles recommandes ({analysis.rolesRecommandes.length})
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {analysis.rolesRecommandes.map((role) => (
                        <span key={role} className="bg-gray-700 text-gray-300 text-xs px-2 py-1 rounded font-mono">
                          {role}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Procedures */}
                {analysis.proceduresActives.length > 0 && (
                  <div>
                    <p className="text-gray-400 text-xs mb-2 font-medium">
                      Procedures ({analysis.proceduresActives.length})
                    </p>
                    <div className="space-y-1">
                      {analysis.proceduresActives.slice(0, 8).map((proc) => (
                        <div key={proc} className="bg-gray-800 rounded px-2 py-1">
                          <span className="text-gray-300 text-xs font-mono">{proc}</span>
                        </div>
                      ))}
                      {analysis.proceduresActives.length > 8 && (
                        <p className="text-gray-600 text-xs">+{analysis.proceduresActives.length - 8} autres...</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Validations */}
                {analysis.validations.length > 0 && (
                  <div>
                    <p className="text-gray-400 text-xs mb-2 font-medium">
                      Validations ({analysis.validations.length})
                    </p>
                    <div className="space-y-2">
                      {analysis.validations.map((v, idx) => (
                        <div key={idx} className={`border rounded-lg p-2.5 ${validationColors[v.type]}`}>
                          <div className="flex items-start gap-2">
                            <span className="text-sm flex-shrink-0">{validationIcons[v.type]}</span>
                            <div>
                              <p className="text-xs font-medium">{v.type}</p>
                              <p className="text-xs mt-0.5 opacity-90">{v.message}</p>
                              {v.reference && (
                                <p className="text-xs mt-1 opacity-60 font-mono">{v.reference}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Sections document */}
                {analysis.sectionsDocument.length > 0 && (
                  <div>
                    <p className="text-gray-400 text-xs mb-2 font-medium">
                      Sections document ({analysis.sectionsDocument.length})
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {analysis.sectionsDocument.map((s) => (
                        <span key={s} className="bg-teal-500/10 text-teal-400 text-xs px-1.5 py-0.5 rounded font-mono">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}