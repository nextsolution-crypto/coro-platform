'use client';

import { useState, useEffect, useRef } from 'react';
import api from '@/lib/api';
import {
  Upload, Trash2, Edit2, FileText, ChevronDown, ChevronUp, Plus, X, Check
} from 'lucide-react';

// ============================================================
// TYPES
// ============================================================

type PlanSection = 'IMPLANTATION' | 'COUPE' | 'OPERATION' | 'SECTEURS' | 'DIVERS';

interface BuildingPlan {
  id: string;
  section: PlanSection;
  name: string;
  description?: string;
  fileName: string;
  fileSize: number;
  emissionDate?: string;
  revision?: string;
  order: number;
}

interface Module6SectionProps {
  projectId: string;
  language?: 'fr' | 'en';
}

// ============================================================
// CONFIG DES SECTIONS
// ============================================================

const SECTIONS: {
  key: PlanSection;
  labelFR: string;
  labelEN: string;
  descFR: string;
  descEN: string;
  multiple: boolean;
}[] = [
  {
    key: 'IMPLANTATION',
    labelFR: '6.1 — Plan d\'implantation',
    labelEN: '6.1 — Site Plan',
    descFR: 'Localisation du bâtiment sur son terrain, identification des accès, voies de circulation, zones de rassemblement et infrastructures connexes',
    descEN: 'Building location on its site, identification of accesses, traffic lanes, assembly areas, and related infrastructure',
    multiple: false,
  },
  {
    key: 'COUPE',
    labelFR: '6.2 — Plan de coupe',
    labelEN: '6.2 — Cross-Section Plan',
    descFR: 'Représentation verticale illustrant la distribution des étages, hauteurs, volumes et principaux éléments structuraux',
    descEN: 'Vertical representation showing floor distribution, heights, volumes, and main structural elements',
    multiple: false,
  },
  {
    key: 'OPERATION',
    labelFR: '6.3 — Plans d\'opération',
    labelEN: '6.3 — Operation Plans',
    descFR: 'Schéma des systèmes techniques et opérationnels clés, incluant les réseaux de sécurité, d\'alimentation et de protection incendie (1 PDF multi-pages)',
    descEN: 'Diagram of key technical and operational systems, including security, power, and fire protection networks (1 multi-page PDF)',
    multiple: false,
  },
  {
    key: 'SECTEURS',
    labelFR: '6.4 — Plans de secteurs',
    labelEN: '6.4 — Sector Plans',
    descFR: 'Plans détaillés par secteur ou zone (industriel, commercial, etc.) — plusieurs fichiers possibles',
    descEN: 'Detailed plans by sector or zone (industrial, commercial, etc.) — multiple files possible',
    multiple: true,
  },
  {
    key: 'DIVERS',
    labelFR: '6.5 — Plans techniques divers',
    labelEN: '6.5 — Miscellaneous Technical Plans',
    descFR: 'Tout autre plan technique pertinent à la compréhension du bâtiment et à la gestion des urgences',
    descEN: 'Any other technical plan relevant to building understanding and emergency management',
    multiple: true,
  },
];

// ============================================================
// COMPOSANT MODAL UPLOAD / MODIFIER
// ============================================================

function PlanModal({
  plan,
  sectionKey,
  sectionLabelFR,
  language,
  onSave,
  onClose,
}: {
  plan?: BuildingPlan;
  sectionKey: PlanSection;
  sectionLabelFR: string;
  language: 'fr' | 'en';
  onSave: (data: any) => Promise<void>;
  onClose: () => void;
}) {
  const isFr = language === 'fr';
  const fileRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    name:         plan?.name         || '',
    description:  plan?.description  || '',
    emissionDate: plan?.emissionDate || '',
    revision:     plan?.revision     || '',
  });

  const [file, setFile] = useState<{
    base64: string;
    name: string;
    size: number;
  } | null>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;

    if (f.type !== 'application/pdf') {
      setError(isFr ? 'Seuls les fichiers PDF sont acceptés' : 'Only PDF files are accepted');
      return;
    }

    if (f.size > 25 * 1024 * 1024) {
      setError(isFr ? 'Le fichier dépasse la limite de 25MB' : 'File exceeds the 25MB limit');
      return;
    }

    setError('');
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1];
      setFile({ base64, name: f.name, size: f.size });
      if (!form.name) setForm(prev => ({ ...prev, name: f.name.replace('.pdf', '') }));
    };
    reader.readAsDataURL(f);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      setError(isFr ? 'Le nom est obligatoire' : 'Name is required');
      return;
    }
    if (!plan && !file) {
      setError(isFr ? 'Veuillez sélectionner un fichier PDF' : 'Please select a PDF file');
      return;
    }

    setSaving(true);
    setError('');
    try {
      await onSave({
        section:      sectionKey,
        name:         form.name.trim(),
        description:  form.description.trim() || undefined,
        emissionDate: form.emissionDate || undefined,
        revision:     form.revision.trim() || undefined,
        ...(file && {
          fileBase64: file.base64,
          fileName:   file.name,
          fileSize:   file.size,
        }),
      });
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || (isFr ? 'Erreur lors de la sauvegarde' : 'Save error'));
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = {
    border: '1px solid #CED4DA',
    color: '#2C3E50',
    backgroundColor: '#FFFFFF',
    borderRadius: '4px',
    padding: '8px 12px',
    fontSize: '14px',
    width: '100%',
    outline: 'none',
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
      <div className="w-full max-w-lg rounded-md p-6"
        style={{ backgroundColor: '#FFFFFF', boxShadow: '0 8px 32px rgba(0,0,0,0.15)' }}>

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-semibold text-base" style={{ color: '#2C3E50' }}>
            {plan
              ? (isFr ? 'Modifier le plan' : 'Edit plan')
              : (isFr ? `Ajouter un plan — ${sectionLabelFR}` : `Add plan — ${sectionLabelFR}`)
            }
          </h3>
          <button onClick={onClose} style={{ color: '#ADB5BD' }}>
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4">
          {/* Nom */}
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: '#495057' }}>
              {isFr ? 'Nom du plan *' : 'Plan name *'}
            </label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              placeholder={isFr ? 'Ex: Plan d\'implantation — Site principal' : 'Ex: Site Plan — Main Campus'}
              style={inputStyle}
              onFocus={e => e.target.style.borderColor = '#C0392B'}
              onBlur={e => e.target.style.borderColor = '#CED4DA'}
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: '#495057' }}>
              {isFr ? 'Description' : 'Description'}
            </label>
            <input
              type="text"
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              placeholder={isFr ? 'Description optionnelle' : 'Optional description'}
              style={inputStyle}
              onFocus={e => e.target.style.borderColor = '#C0392B'}
              onBlur={e => e.target.style.borderColor = '#CED4DA'}
            />
          </div>

          {/* Date + Révision */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: '#495057' }}>
                {isFr ? 'Date d\'émission' : 'Emission date'}
              </label>
              <input
                type="date"
                value={form.emissionDate}
                onChange={e => setForm({ ...form, emissionDate: e.target.value })}
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = '#C0392B'}
                onBlur={e => e.target.style.borderColor = '#CED4DA'}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: '#495057' }}>
                {isFr ? 'Révision' : 'Revision'}
              </label>
              <input
                type="text"
                value={form.revision}
                onChange={e => setForm({ ...form, revision: e.target.value })}
                placeholder="Ex: Rev. 3"
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = '#C0392B'}
                onBlur={e => e.target.style.borderColor = '#CED4DA'}
              />
            </div>
          </div>

          {/* Upload fichier */}
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: '#495057' }}>
              {plan
                ? (isFr ? 'Remplacer le fichier PDF (optionnel)' : 'Replace PDF file (optional)')
                : (isFr ? 'Fichier PDF *' : 'PDF file *')
              }
            </label>
            <div
              onClick={() => fileRef.current?.click()}
              className="flex items-center gap-3 p-4 cursor-pointer transition-colors"
              style={{
                border: '2px dashed #DEE2E6',
                borderRadius: '4px',
                backgroundColor: '#F8F9FA',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = '#C0392B';
                e.currentTarget.style.backgroundColor = '#FDEDEC';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = '#DEE2E6';
                e.currentTarget.style.backgroundColor = '#F8F9FA';
              }}
            >
              <Upload size={18} style={{ color: '#ADB5BD' }} />
              <div>
                {file ? (
                  <p className="text-sm font-medium" style={{ color: '#2C3E50' }}>
                    {file.name}
                    <span className="ml-2 font-normal" style={{ color: '#ADB5BD' }}>
                      ({Math.round(file.size / 1024 / 1024 * 10) / 10} MB)
                    </span>
                  </p>
                ) : plan ? (
                  <p className="text-sm" style={{ color: '#6C757D' }}>
                    {isFr ? `Fichier actuel : ${plan.fileName}` : `Current file: ${plan.fileName}`}
                  </p>
                ) : (
                  <p className="text-sm" style={{ color: '#6C757D' }}>
                    {isFr ? 'Cliquer pour sélectionner un PDF (max 25MB)' : 'Click to select a PDF (max 25MB)'}
                  </p>
                )}
              </div>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={handleFile}
            />
          </div>

          {/* Erreur */}
          {error && (
            <p className="text-sm" style={{ color: '#C0392B' }}>{error}</p>
          )}

          {/* Boutons */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 font-medium py-2 text-sm"
              style={{
                border: '1px solid #DEE2E6',
                color: '#6C757D',
                borderRadius: '4px',
              }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F8F9FA'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              {isFr ? 'Annuler' : 'Cancel'}
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 text-white font-medium py-2 text-sm transition-colors"
              style={{
                backgroundColor: saving ? '#ADB5BD' : '#C0392B',
                borderRadius: '4px',
              }}
              onMouseEnter={e => { if (!saving) e.currentTarget.style.backgroundColor = '#A93226'; }}
              onMouseLeave={e => { if (!saving) e.currentTarget.style.backgroundColor = '#C0392B'; }}
            >
              {saving
                ? (isFr ? 'Sauvegarde...' : 'Saving...')
                : (isFr ? 'Sauvegarder' : 'Save')
              }
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// COMPOSANT PRINCIPAL
// ============================================================

export default function Module6Section({ projectId, language = 'fr' }: Module6SectionProps) {
  const isFr = language === 'fr';
  const [plans, setPlans] = useState<BuildingPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedSections, setExpandedSections] = useState<Set<PlanSection>>(
    new Set<PlanSection>(['IMPLANTATION', 'COUPE', 'OPERATION', 'SECTEURS', 'DIVERS'])
  );
  const [modal, setModal] = useState<{
    open: boolean;
    plan?: BuildingPlan;
    sectionKey: PlanSection;
  } | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  // ── Chargement ────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get(`/projects/${projectId}/building-plans`);
        setPlans(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [projectId]);

  // ── Helpers ───────────────────────────────────────────────
  const plansForSection = (section: PlanSection) =>
    plans.filter(p => p.section === section).sort((a, b) => a.order - b.order);

  const toggleSection = (key: PlanSection) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const formatSize = (bytes: number) =>
    `${Math.round(bytes / 1024 / 1024 * 10) / 10} MB`;

  const formatDate = (date?: string) => {
    if (!date) return '—';
    return new Date(date).toLocaleDateString(isFr ? 'fr-CA' : 'en-CA');
  };

  // ── CRUD ──────────────────────────────────────────────────
  const handleSave = async (data: any) => {
    if (modal?.plan) {
      // Modifier
      const res = await api.put(
        `/projects/${projectId}/building-plans/${modal.plan.id}`,
        data
      );
      setPlans(prev => prev.map(p => p.id === modal.plan!.id ? res.data : p));
    } else {
      // Créer
      const res = await api.post(`/projects/${projectId}/building-plans`, data);
      setPlans(prev => [...prev, res.data]);
    }
  };

  const handleDelete = async (planId: string) => {
    if (!confirm(isFr ? 'Supprimer ce plan ?' : 'Delete this plan?')) return;
    setDeleting(planId);
    try {
      await api.delete(`/projects/${projectId}/building-plans/${planId}`);
      setPlans(prev => prev.filter(p => p.id !== planId));
    } catch (err) {
      console.error(err);
    } finally {
      setDeleting(null);
    }
  };

  // ── Rendu ─────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-16 flex items-center justify-center">
        <span className="text-sm animate-pulse" style={{ color: '#ADB5BD' }}>
          {isFr ? 'Chargement...' : 'Loading...'}
        </span>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">

      {/* En-tête */}
      <div className="mb-6">
        <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: '#ADB5BD' }}>
          Module 6
        </p>
        <h1 className="text-3xl font-black uppercase leading-tight" style={{ color: '#2C3E50' }}>
          {isFr ? 'PLANS TECHNIQUES' : 'TECHNICAL PLANS'}
        </h1>
        <h2 className="text-xl font-black uppercase leading-tight" style={{ color: '#6C757D' }}>
          {isFr ? 'DU BÂTIMENT' : 'OF THE BUILDING'}
        </h2>
        <div className="h-1 w-16 mt-2" style={{ backgroundColor: '#C0392B' }} />
      </div>

      {/* Introduction */}
      <div className="p-5 mb-6"
        style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #E9ECEF',
          borderLeft: '3px solid #C0392B',
          borderRadius: '4px',
        }}>
        <p className="text-sm mb-3" style={{ color: '#495057', lineHeight: '1.6' }}>
          {isFr
            ? 'Ce chapitre présente l\'ensemble des documents graphiques essentiels à la compréhension de la configuration et du fonctionnement du bâtiment. Ces plans constituent des outils de référence pour les intervenants internes et externes, facilitant l\'orientation, l\'analyse des accès et la planification des interventions en situation d\'urgence.'
            : 'This chapter presents all graphical documents essential to understanding the building\'s configuration and operation. These plans are reference tools for internal and external responders, facilitating orientation, access analysis, and intervention planning in emergency situations.'
          }
        </p>
        <p className="text-sm" style={{ color: '#495057', lineHeight: '1.6' }}>
          {isFr ? 'Les sections suivantes comprennent :' : 'The following sections include:'}
        </p>
        <ul className="mt-2 space-y-1">
          {[
            isFr
              ? '**Plan d\'implantation** : localisation du bâtiment sur son terrain, identification des accès, voies de circulation, zones de rassemblement et infrastructures connexes'
              : '**Site plan**: building location on its site, identification of accesses, traffic lanes, assembly areas, and related infrastructure',
            isFr
              ? '**Plan de coupe** : représentation verticale illustrant la distribution des étages, hauteurs, volumes et principaux éléments structuraux'
              : '**Cross-section plan**: vertical representation showing floor distribution, heights, volumes, and main structural elements',
            isFr
              ? '**Plan d\'opération** : schéma des systèmes techniques et opérationnels clés, incluant les réseaux de sécurité, d\'alimentation et de protection incendie'
              : '**Operation plan**: diagram of key technical and operational systems, including security, power, and fire protection networks',
          ].map((item, i) => {
            const parts = item.split('**');
            return (
              <li key={i} className="text-sm flex gap-2" style={{ color: '#495057' }}>
                <span style={{ color: '#C0392B' }}>•</span>
                <span>
                  {parts.map((p, j) =>
                    j % 2 === 1
                      ? <strong key={j}>{p}</strong>
                      : <span key={j}>{p}</span>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Encadré important */}
      <div className="p-5 mb-8"
        style={{
          backgroundColor: '#FDEDEC',
          border: '1px solid #F1948A',
          borderRadius: '4px',
        }}>
        <p className="font-bold text-sm mb-2" style={{ color: '#C0392B' }}>
          {isFr ? 'IMPORTANT — Avis sur la mise à jour des plans' : 'IMPORTANT — Plan update notice'}
        </p>
        <p className="text-sm mb-2" style={{ color: '#495057', lineHeight: '1.6' }}>
          {isFr
            ? 'Les plans inclus dans cette section sont fournis à titre informatif et opérationnel. Bien que leur date d\'émission puisse remonter à plusieurs années, ils demeurent toujours valides et représentatifs de l\'état actuel du bâtiment.'
            : 'The plans included in this section are provided for informational and operational purposes. Although their emission date may be several years old, they remain valid and representative of the building\'s current state.'
          }
        </p>
        <p className="text-sm mb-2" style={{ color: '#495057', lineHeight: '1.6' }}>
          {isFr
            ? 'Les mises à jour sont effectuées lorsqu\'une modification significative de l\'infrastructure ou de l\'aménagement le requiert. En cas de doute ou si des changements récents ne sont pas reflétés dans ces documents, veuillez contacter la direction de l\'immeuble pour obtenir les informations les plus récentes.'
            : 'Updates are made when a significant infrastructure or layout modification requires it. If in doubt or if recent changes are not reflected in these documents, please contact building management for the most recent information.'
          }
        </p>
        <p className="text-xs" style={{ color: '#6C757D', fontStyle: 'italic' }}>
          {isFr
            ? '🔧 Note importante : La date figurant en page d\'accueil du PMU indique la révision générale du document, mais n\'implique pas nécessairement une mise à jour de chaque plan individuellement.'
            : '🔧 Important note: The date on the ERP cover page indicates the general document revision, but does not necessarily imply an update of each individual plan.'
          }
        </p>
      </div>

      {/* Sections de plans */}
      {SECTIONS.map(section => {
        const sectionPlans = plansForSection(section.key);
        const isExpanded = expandedSections.has(section.key);

        return (
          <div key={section.key} className="mb-4"
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E9ECEF',
              borderRadius: '4px',
              overflow: 'hidden',
            }}>

            {/* Header section */}
            <div
              className="flex items-center justify-between px-5 py-4 cursor-pointer transition-colors"
              style={{ backgroundColor: '#FFFFFF' }}
              onClick={() => toggleSection(section.key)}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F8F9FA'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = '#FFFFFF'}
            >
              <div className="flex items-center gap-3">
                <FileText size={16} style={{ color: '#C0392B' }} />
                <div>
                  <p className="font-semibold text-sm" style={{ color: '#2C3E50' }}>
                    {isFr ? section.labelFR : section.labelEN}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: '#ADB5BD' }}>
                    {isFr ? section.descFR : section.descEN}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs px-2 py-0.5 font-medium"
                  style={{
                    backgroundColor: sectionPlans.length > 0 ? '#EAFAF1' : '#F8F9FA',
                    color: sectionPlans.length > 0 ? '#27AE60' : '#ADB5BD',
                    border: `1px solid ${sectionPlans.length > 0 ? '#A9DFBF' : '#DEE2E6'}`,
                    borderRadius: '3px',
                  }}>
                  {sectionPlans.length} {isFr ? 'plan(s)' : 'plan(s)'}
                </span>
                {isExpanded
                  ? <ChevronUp size={16} style={{ color: '#ADB5BD' }} />
                  : <ChevronDown size={16} style={{ color: '#ADB5BD' }} />
                }
              </div>
            </div>

            {/* Contenu section */}
            {isExpanded && (
              <div style={{ borderTop: '1px solid #F0F0F0' }}>

                {/* Liste des plans */}
                {sectionPlans.length > 0 && (
                  <div className="px-5 py-3 space-y-2">
                    {sectionPlans.map(plan => (
                      <div key={plan.id}
                        className="flex items-center justify-between p-3"
                        style={{
                          backgroundColor: '#F8F9FA',
                          border: '1px solid #E9ECEF',
                          borderRadius: '4px',
                        }}>
                        <div className="flex items-center gap-3 min-w-0">
                          <FileText size={14} style={{ color: '#C0392B', flexShrink: 0 }} />
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate" style={{ color: '#2C3E50' }}>
                              {plan.name}
                            </p>
                            <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                              <span className="text-xs" style={{ color: '#ADB5BD' }}>
                                {plan.fileName}
                              </span>
                              <span style={{ color: '#DEE2E6' }}>•</span>
                              <span className="text-xs" style={{ color: '#ADB5BD' }}>
                                {formatSize(plan.fileSize)}
                              </span>
                              {plan.emissionDate && (
                                <>
                                  <span style={{ color: '#DEE2E6' }}>•</span>
                                  <span className="text-xs" style={{ color: '#ADB5BD' }}>
                                    {isFr ? 'Émis le' : 'Issued'} {formatDate(plan.emissionDate)}
                                  </span>
                                </>
                              )}
                              {plan.revision && (
                                <>
                                  <span style={{ color: '#DEE2E6' }}>•</span>
                                  <span className="text-xs font-medium" style={{ color: '#6C757D' }}>
                                    {plan.revision}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                          <button
                            onClick={() => setModal({ open: true, plan, sectionKey: section.key })}
                            className="p-1.5 transition-colors"
                            style={{ color: '#6C757D', borderRadius: '3px' }}
                            onMouseEnter={e => {
                              e.currentTarget.style.backgroundColor = '#F0F0F0';
                              e.currentTarget.style.color = '#2C3E50';
                            }}
                            onMouseLeave={e => {
                              e.currentTarget.style.backgroundColor = 'transparent';
                              e.currentTarget.style.color = '#6C757D';
                            }}
                            title={isFr ? 'Modifier' : 'Edit'}
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => handleDelete(plan.id)}
                            disabled={deleting === plan.id}
                            className="p-1.5 transition-colors"
                            style={{ color: '#ADB5BD', borderRadius: '3px' }}
                            onMouseEnter={e => {
                              e.currentTarget.style.backgroundColor = '#FDEDEC';
                              e.currentTarget.style.color = '#C0392B';
                            }}
                            onMouseLeave={e => {
                              e.currentTarget.style.backgroundColor = 'transparent';
                              e.currentTarget.style.color = '#ADB5BD';
                            }}
                            title={isFr ? 'Supprimer' : 'Delete'}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Bouton ajouter */}
                {(section.multiple || sectionPlans.length === 0) && (
                  <div className="px-5 py-3" style={{
                    borderTop: sectionPlans.length > 0 ? '1px solid #F0F0F0' : 'none'
                  }}>
                    <button
                      onClick={() => setModal({ open: true, sectionKey: section.key })}
                      className="flex items-center gap-2 text-sm font-medium px-4 py-2 transition-colors"
                      style={{
                        border: '1px solid #DEE2E6',
                        color: '#6C757D',
                        borderRadius: '4px',
                        backgroundColor: 'transparent',
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.backgroundColor = '#FDEDEC';
                        e.currentTarget.style.borderColor = '#F1948A';
                        e.currentTarget.style.color = '#C0392B';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        e.currentTarget.style.borderColor = '#DEE2E6';
                        e.currentTarget.style.color = '#6C757D';
                      }}
                    >
                      <Plus size={14} />
                      {isFr ? 'Ajouter un plan PDF' : 'Add a PDF plan'}
                    </button>
                  </div>
                )}

                {/* Message si section unique déjà remplie */}
                {!section.multiple && sectionPlans.length > 0 && (
                  <div className="px-5 py-3 flex items-center gap-2"
                    style={{ borderTop: '1px solid #F0F0F0' }}>
                    <Check size={14} style={{ color: '#27AE60' }} />
                    <span className="text-xs" style={{ color: '#27AE60' }}>
                      {isFr
                        ? 'Plan uploadé — modifier ou remplacer via le bouton crayon'
                        : 'Plan uploaded — edit or replace via the pencil button'
                      }
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* Modal */}
      {modal?.open && (
        <PlanModal
          plan={modal.plan}
          sectionKey={modal.sectionKey}
          sectionLabelFR={SECTIONS.find(s => s.key === modal.sectionKey)?.labelFR || ''}
          language={language}
          onSave={handleSave}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}