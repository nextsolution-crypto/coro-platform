'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { ChevronDown, ChevronUp, RotateCcw, Edit2, Check, X } from 'lucide-react';

interface ProcedureStep {
  id: string;
  textFR: string;
  textEN: string;
  isBold?: boolean;
  isRed?: boolean;
}

interface RoleSection {
  roleCode: string;
  roleLabelFR: string;
  roleLabelEN: string;
  headerColor: string;
  steps: ProcedureStep[];
}

interface PcaProcedure {
  id: string;
  code: string;
  isActive: boolean;
  isOverridden: boolean;
  content: {
    titleFR: string;
    titleEN: string;
    headerColor: string;
    activationRule: string;
    roleSections: RoleSection[];
  };
}

interface Props {
  projectId: string;
  language?: 'fr' | 'en';
}

const SCENARIO_LABELS: Record<string, { fr: string; en: string }> = {
  PC001: { fr: 'Activation et gestion', en: 'Activation and management' },
  PC002: { fr: 'Activation et gestion', en: 'Activation and management' },
  PC003: { fr: 'Activation et gestion', en: 'Activation and management' },
  PC004: { fr: 'Activation et gestion', en: 'Activation and management' },
  PC005: { fr: 'Activation et gestion', en: 'Activation and management' },
  PC011: { fr: 'Scénarios d\'incident', en: 'Incident scenarios' },
  PC012: { fr: 'Scénarios d\'incident', en: 'Incident scenarios' },
  PC013: { fr: 'Scénarios d\'incident', en: 'Incident scenarios' },
  PC014: { fr: 'Scénarios d\'incident', en: 'Incident scenarios' },
  PC015: { fr: 'Scénarios d\'incident', en: 'Incident scenarios' },
  PC016: { fr: 'Scénarios d\'incident', en: 'Incident scenarios' },
  PC021: { fr: 'Reprise des activités', en: 'Activity recovery' },
  PC022: { fr: 'Reprise des activités', en: 'Activity recovery' },
  PC023: { fr: 'Reprise des activités', en: 'Activity recovery' },
};

export default function Module4PcaSection({ projectId, language = 'fr' }: Props) {
  const isFr = language === 'fr';
  const [procedures, setProcedures] = useState<PcaProcedure[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchProcedures();
  }, [projectId]);

  const fetchProcedures = async () => {
    try {
      const res = await api.get(`/pca/configurator/${projectId}/procedures`);
      setProcedures(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (proc: PcaProcedure) => {
    try {
      await api.put(`/pca/configurator/${projectId}/procedures/${proc.id}/toggle`, {
        isActive: !proc.isActive,
      });
      setProcedures(prev => prev.map(p =>
        p.id === proc.id ? { ...p, isActive: !p.isActive } : p
      ));
    } catch (err) {
      console.error(err);
    }
  };

  const handleEdit = (proc: PcaProcedure) => {
    setEditingId(proc.id);
    setEditContent(JSON.parse(JSON.stringify(proc.content)));
    setExpandedId(proc.id);
  };

  const handleSaveEdit = async (proc: PcaProcedure) => {
    setSaving(true);
    try {
      await api.put(`/pca/configurator/${projectId}/procedures/${proc.id}`, {
        content: editContent,
      });
      setProcedures(prev => prev.map(p =>
        p.id === proc.id ? { ...p, content: editContent, isOverridden: true } : p
      ));
      setEditingId(null);
      setEditContent(null);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleRestore = async (proc: PcaProcedure) => {
    if (!confirm(isFr ? 'Restaurer la version par défaut ?' : 'Restore default version?')) return;
    try {
      await api.delete(`/pca/configurator/${projectId}/procedures/${proc.id}`);
      await fetchProcedures();
      setEditingId(null);
    } catch (err) {
      console.error(err);
    }
  };

  const updateStep = (roleIdx: number, stepIdx: number, field: 'textFR' | 'textEN', value: string) => {
    const updated = { ...editContent };
    updated.roleSections[roleIdx].steps[stepIdx][field] = value;
    setEditContent(updated);
  };

  // Grouper par catégorie
  const grouped = procedures.reduce((acc, p) => {
    const cat = isFr
      ? (SCENARIO_LABELS[p.code]?.fr || 'Autres')
      : (SCENARIO_LABELS[p.code]?.en || 'Other');
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(p);
    return acc;
  }, {} as Record<string, PcaProcedure[]>);

  const activeCount = procedures.filter(p => p.isActive).length;

  if (loading) return (
    <div className="flex items-center justify-center py-12">
      <p className="text-sm animate-pulse" style={{ color: '#ADB5BD' }}>
        {isFr ? 'Chargement des procédures...' : 'Loading procedures...'}
      </p>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="rounded-md p-4" style={{ backgroundColor: '#EBF5FB', border: '1px solid #AED6F1' }}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold" style={{ color: '#2980B9' }}>
              {isFr ? 'Bibliothèque de procédures PCA' : 'BCP Procedure Library'}
            </p>
            <p className="text-xs mt-0.5" style={{ color: '#1A5276' }}>
              {isFr
                ? `${activeCount} procédure(s) active(s) sur ${procedures.length} — Activez, désactivez ou personnalisez chaque procédure`
                : `${activeCount} active procedure(s) out of ${procedures.length} — Activate, deactivate or customize each procedure`}
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold" style={{ color: '#2980B9' }}>{activeCount}</p>
            <p className="text-xs" style={{ color: '#ADB5BD' }}>
              {isFr ? 'actives' : 'active'}
            </p>
          </div>
        </div>
      </div>

      {/* Procédures groupées par catégorie */}
      {Object.entries(grouped).map(([category, procs]) => (
        <div key={category}>
          <h4 className="text-xs font-bold uppercase mb-3"
            style={{ color: '#ADB5BD', letterSpacing: '0.1em' }}>
            {category}
          </h4>
          <div className="space-y-2">
            {procs.map(proc => {
              const content = editingId === proc.id ? editContent : proc.content;
              const isExpanded = expandedId === proc.id;
              const isEditing = editingId === proc.id;
              const title = isFr ? content.titleFR : content.titleEN;

              return (
                <div key={proc.id} className="rounded-md overflow-hidden"
                  style={{
                    border: `1px solid ${proc.isActive ? '#E9ECEF' : '#F8F9FA'}`,
                    opacity: proc.isActive ? 1 : 0.6,
                  }}>

                  {/* En-tête de la procédure */}
                  <div className="flex items-center gap-3 p-3"
                    style={{ backgroundColor: proc.isActive ? '#FFFFFF' : '#F8F9FA' }}>

                    {/* Toggle actif/inactif */}
                    <button
                      onClick={() => handleToggle(proc)}
                      className="w-10 h-6 rounded-full flex-shrink-0 transition-colors relative"
                      style={{
                        backgroundColor: proc.isActive ? '#27AE60' : '#DEE2E6',
                      }}>
                      <div className="w-4 h-4 rounded-full bg-white absolute top-1 transition-all"
                        style={{ left: proc.isActive ? '22px' : '2px', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                    </button>

                    {/* Bande couleur */}
                    <div className="w-1 h-8 rounded flex-shrink-0"
                      style={{ backgroundColor: content.headerColor || '#C0392B' }} />

                    {/* Code + titre */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold px-2 py-0.5 rounded"
                          style={{ backgroundColor: '#F8F9FA', color: '#6C757D', border: '1px solid #E9ECEF' }}>
                          {proc.code}
                        </span>
                        {proc.isOverridden && (
                          <span className="text-xs px-2 py-0.5 rounded"
                            style={{ backgroundColor: '#FEF9E7', color: '#F39C12', border: '1px solid #FAD7A0' }}>
                            {isFr ? 'Personnalisée' : 'Customized'}
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-medium mt-0.5 truncate" style={{ color: '#2C3E50' }}>
                        {title}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {proc.isOverridden && !isEditing && (
                        <button onClick={() => handleRestore(proc)}
                          className="p-1.5 rounded transition-colors"
                          title={isFr ? 'Restaurer la version par défaut' : 'Restore default version'}
                          style={{ color: '#ADB5BD' }}
                          onMouseEnter={e => e.currentTarget.style.color = '#F39C12'}
                          onMouseLeave={e => e.currentTarget.style.color = '#ADB5BD'}>
                          <RotateCcw size={14} />
                        </button>
                      )}
                      {!isEditing ? (
                        <button onClick={() => handleEdit(proc)}
                          className="p-1.5 rounded transition-colors"
                          title={isFr ? 'Personnaliser' : 'Customize'}
                          style={{ color: '#ADB5BD' }}
                          onMouseEnter={e => e.currentTarget.style.color = '#2980B9'}
                          onMouseLeave={e => e.currentTarget.style.color = '#ADB5BD'}>
                          <Edit2 size={14} />
                        </button>
                      ) : (
                        <>
                          <button onClick={() => handleSaveEdit(proc)}
                            disabled={saving}
                            className="p-1.5 rounded transition-colors"
                            style={{ color: '#27AE60' }}>
                            <Check size={14} />
                          </button>
                          <button onClick={() => { setEditingId(null); setEditContent(null); }}
                            className="p-1.5 rounded transition-colors"
                            style={{ color: '#C0392B' }}>
                            <X size={14} />
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : proc.id)}
                        className="p-1.5 rounded transition-colors"
                        style={{ color: '#ADB5BD' }}
                        onMouseEnter={e => e.currentTarget.style.color = '#2C3E50'}
                        onMouseLeave={e => e.currentTarget.style.color = '#ADB5BD'}>
                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>
                    </div>
                  </div>

                  {/* Contenu développé */}
                  {isExpanded && (
                    <div className="border-t" style={{ borderColor: '#E9ECEF' }}>
                      {(content.roleSections || []).map((role: RoleSection, roleIdx: number) => (
                        <div key={role.roleCode} className="border-b last:border-b-0"
                          style={{ borderColor: '#F1F3F5' }}>
                          {/* En-tête rôle */}
                          <div className="px-4 py-2 flex items-center gap-2"
                            style={{ backgroundColor: role.headerColor + '15' }}>
                            <div className="w-2 h-2 rounded-full flex-shrink-0"
                              style={{ backgroundColor: role.headerColor }} />
                            <p className="text-xs font-bold uppercase"
                              style={{ color: role.headerColor, letterSpacing: '0.05em' }}>
                              {isFr ? role.roleLabelFR : role.roleLabelEN}
                            </p>
                          </div>

                          {/* Étapes */}
                          <div className="px-4 py-3 space-y-2">
                            {(role.steps || []).map((step: ProcedureStep, stepIdx: number) => (
                              <div key={step.id} className="flex items-start gap-2">
                                <span className="text-xs font-bold flex-shrink-0 mt-0.5"
                                  style={{ color: '#ADB5BD', minWidth: '20px' }}>
                                  {stepIdx + 1}.
                                </span>
                                {isEditing ? (
                                  <textarea
                                    value={isFr ? editContent.roleSections[roleIdx].steps[stepIdx].textFR : editContent.roleSections[roleIdx].steps[stepIdx].textEN}
                                    onChange={e => updateStep(roleIdx, stepIdx, isFr ? 'textFR' : 'textEN', e.target.value)}
                                    rows={2}
                                    className="flex-1 rounded px-2 py-1 text-sm focus:outline-none resize-none"
                                    style={{ border: '1px solid #AED6F1', color: '#2C3E50', backgroundColor: '#F8FCFF' }}
                                  />
                                ) : (
                                  <p className="text-sm flex-1"
                                    style={{
                                      color: step.isRed ? '#C0392B' : '#2C3E50',
                                      fontWeight: step.isBold ? 700 : 400,
                                    }}>
                                    {isFr ? step.textFR : step.textEN}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}