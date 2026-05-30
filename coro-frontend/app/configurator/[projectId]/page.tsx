'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';
import api from '@/lib/api';

interface Field {
  key: string;
  label: string;
  type: 'boolean' | 'text' | 'number' | 'select';
  options?: string[];
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

export default function ConfiguratorPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.projectId as string;
  const { isAuthenticated, initAuth } = useAuthStore();

  const [sections, setSections] = useState<Section[]>([]);
  const [activeSection, setActiveSection] = useState(0);
  const [config, setConfig] = useState<Record<string, any>>({});
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
    if (!token) {
      router.push('/login');
    }
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
      questionsRes.data.sections.forEach((s: Section) => {
        s.fields.forEach((f: Field) => {
          if (f.type === 'boolean') defaults[f.key] = false;
          if (f.type === 'number') defaults[f.key] = 0;
          if (f.type === 'text') defaults[f.key] = '';
          if (f.type === 'select') defaults[f.key] = '';
        });
      });
      setConfig(defaults);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const updateConfig = async (key: string, value: any) => {
    const newConfig = { ...config, [key]: value };
    setConfig(newConfig);
    setAnalyzing(true);
    try {
      const res = await api.post('/configurator/analyze', newConfig);
      setAnalysis(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.post(`/configurator/save/${projectId}`, config);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const currentSection = sections[activeSection];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <p className="text-gray-400">Chargement...</p>
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
            <div className="flex items-center gap-2">
              <span className="text-gray-400 text-sm">Score conformite</span>
              <span className={`font-bold text-lg ${
                analysis.score >= 80 ? 'text-green-400' :
                analysis.score >= 60 ? 'text-yellow-400' : 'text-red-400'
              }`}>{analysis.score}/100</span>
            </div>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-medium px-4 py-2 rounded-lg text-sm transition-colors">
            {saving ? 'Sauvegarde...' : saved ? '✓ Sauvegarde' : 'Sauvegarder'}
          </button>
        </div>
      </div>

      <div className="flex h-[calc(100vh-65px)]">

        {/* Sidebar navigation sections */}
        <div className="w-56 bg-gray-900 border-r border-gray-800 overflow-y-auto flex-shrink-0">
          <div className="p-3">
            {sections.map((section, idx) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(idx)}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-xs mb-1 transition-colors flex items-center gap-2 ${
                  activeSection === idx
                    ? 'bg-orange-500/15 text-orange-400 font-medium'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`}>
                <span>{section.icon}</span>
                <span>{section.title}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Formulaire section active */}
        <div className="flex-1 overflow-y-auto p-6">
          {currentSection && (
            <div>
              <div className="flex items-center gap-3 mb-6">
                <span className="text-3xl">{currentSection.icon}</span>
                <div>
                  <h2 className="text-xl font-semibold text-white">{currentSection.title}</h2>
                  <p className="text-gray-500 text-sm">
                    {activeSection + 1} / {sections.length}
                  </p>
                </div>
              </div>

              <div className="grid gap-3 max-w-2xl">
                {currentSection.fields.map((field) => (
                  <div key={field.key} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                    <label className="block text-sm text-gray-300 mb-2">{field.label}</label>

                    {field.type === 'boolean' && (
                      <div className="flex gap-3">
                        <button
                          onClick={() => updateConfig(field.key, true)}
                          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                            config[field.key] === true
                              ? 'bg-green-500/20 text-green-400 border border-green-500/40'
                              : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                          }`}>
                          Oui
                        </button>
                        <button
                          onClick={() => updateConfig(field.key, false)}
                          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                            config[field.key] === false
                              ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                              : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                          }`}>
                          Non
                        </button>
                      </div>
                    )}

                    {field.type === 'select' && (
                      <select
                        value={config[field.key] || ''}
                        onChange={(e) => updateConfig(field.key, e.target.value)}
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500">
                        <option value="">Selectionner...</option>
                        {field.options?.map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    )}

                    {field.type === 'text' && (
                      <input
                        type="text"
                        value={config[field.key] || ''}
                        onChange={(e) => updateConfig(field.key, e.target.value)}
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500"
                        placeholder="Entrer une valeur..."/>
                    )}

                    {field.type === 'number' && (
                      <input
                        type="number"
                        value={config[field.key] || ''}
                        onChange={(e) => updateConfig(field.key, parseInt(e.target.value) || 0)}
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500"/>
                    )}
                  </div>
                ))}
              </div>

              {/* Navigation */}
              <div className="flex gap-3 mt-6 max-w-2xl">
                {activeSection > 0 && (
                  <button
                    onClick={() => setActiveSection(activeSection - 1)}
                    className="flex-1 bg-gray-800 hover:bg-gray-700 text-white font-medium py-3 rounded-xl transition-colors">
                    ← Precedent
                  </button>
                )}
                {activeSection < sections.length - 1 && (
                  <button
                    onClick={() => setActiveSection(activeSection + 1)}
                    className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-medium py-3 rounded-xl transition-colors">
                    Suivant →
                  </button>
                )}
                {activeSection === sections.length - 1 && (
                  <button
                    onClick={handleSave}
                    className="flex-1 bg-green-500 hover:bg-green-600 text-white font-medium py-3 rounded-xl transition-colors">
                    ✓ Terminer la configuration
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Panneau résultats droite */}
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
                      analysis.score >= 60 ? 'text-yellow-400' : 'text-red-400'
                    }`}>{analysis.score}</span>
                    <span className="text-gray-500 text-sm mb-1">/100</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-1.5 mt-2">
                    <div
                      className={`h-1.5 rounded-full transition-all ${
                        analysis.score >= 80 ? 'bg-green-500' :
                        analysis.score >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
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
                      Procedures activees ({analysis.proceduresActives.length})
                    </p>
                    <div className="space-y-1">
                      {analysis.proceduresActives.slice(0, 8).map((proc) => (
                        <div key={proc} className="bg-gray-800 rounded px-2 py-1">
                          <span className="text-gray-300 text-xs font-mono">{proc}</span>
                        </div>
                      ))}
                      {analysis.proceduresActives.length > 8 && (
                        <p className="text-gray-600 text-xs">
                          +{analysis.proceduresActives.length - 8} autres...
                        </p>
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