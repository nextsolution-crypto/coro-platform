'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import api from '@/lib/api';
import { ArrowLeft, Plus, Trash2, Save, GripVertical, ChevronUp, ChevronDown } from 'lucide-react';

interface Section {
  id: string;
  title: string;
  content: string;
  order: number;
}

const DEFAULT_SECTIONS: Section[] = [
  { id: '1.1', title: 'Objet et portée', content: '', order: 1 },
  { id: '1.2', title: 'Responsabilité du contenu', content: '', order: 2 },
  { id: '1.3', title: 'Contexte organisationnel', content: '', order: 3 },
];

export default function Module1TemplatePage() {
  const router = useRouter();
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => { fetchTemplate(); }, []);

  const fetchTemplate = async () => {
    try {
      const res = await api.get('/organizations/module1-template');
      if (res.data.sections && res.data.sections.length > 0) {
        setSections(res.data.sections);
      } else {
        setSections(DEFAULT_SECTIONS);
      }
    } catch { setSections(DEFAULT_SECTIONS); }
    finally { setLoading(false); }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/organizations/module1-template', { sections });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  const addSection = () => {
    const newOrder = sections.length + 1;
    setSections(prev => [...prev, {
      id: `1.${newOrder}`,
      title: '',
      content: '',
      order: newOrder,
    }]);
  };

  const removeSection = (index: number) => {
    setSections(prev => prev.filter((_, i) => i !== index).map((s, i) => ({ ...s, order: i + 1, id: `1.${i + 1}` })));
  };

  const moveSection = (index: number, direction: 'up' | 'down') => {
    const newSections = [...sections];
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= newSections.length) return;
    [newSections[index], newSections[swapIndex]] = [newSections[swapIndex], newSections[index]];
    setSections(newSections.map((s, i) => ({ ...s, order: i + 1, id: `1.${i + 1}` })));
  };

  const updateSection = (index: number, field: 'title' | 'content', value: string) => {
    setSections(prev => prev.map((s, i) => i === index ? { ...s, [field]: value } : s));
  };

  const inputStyle = { border: '1px solid #CED4DA', color: '#2C3E50', backgroundColor: '#FFFFFF', width: '100%' };

  if (loading) return (
    <AppLayout>
      <div className="flex items-center justify-center py-24">
        <p className="text-sm animate-pulse" style={{ color: '#ADB5BD' }}>Chargement...</p>
      </div>
    </AppLayout>
  );

  return (
    <AppLayout>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <button onClick={() => router.push('/settings')}
            className="flex items-center gap-2 text-sm mb-3 transition-colors"
            style={{ color: '#6C757D' }}
            onMouseEnter={e => e.currentTarget.style.color = '#2C3E50'}
            onMouseLeave={e => e.currentTarget.style.color = '#6C757D'}>
            <ArrowLeft size={16} /> Retour aux paramètres
          </button>
          <h2 className="text-2xl font-semibold" style={{ color: '#2C3E50' }}>Modèle Module 1</h2>
          <p className="text-sm mt-1" style={{ color: '#6C757D' }}>
            Personnalisez les sections du Module 1 pour tous les nouveaux projets de votre organisation.
          </p>
        </div>
        <button onClick={handleSave} disabled={saving}
          className="flex items-center gap-2 text-white text-sm font-medium px-5 py-2.5 rounded"
          style={{ backgroundColor: saved ? '#27AE60' : '#C0392B' }}
          onMouseEnter={e => !saved && (e.currentTarget.style.backgroundColor = '#A93226')}
          onMouseLeave={e => !saved && (e.currentTarget.style.backgroundColor = '#C0392B')}>
          <Save size={15} />
          {saving ? 'Sauvegarde...' : saved ? '✓ Sauvegardé !' : 'Sauvegarder le modèle'}
        </button>
      </div>

      {/* Bannière info */}
      <div className="rounded-md p-4 mb-6 flex items-start gap-3"
        style={{ backgroundColor: '#EBF5FB', border: '1px solid #AED6F1' }}>
        <span style={{ fontSize: 18 }}>ℹ️</span>
        <div>
          <p className="text-sm font-medium" style={{ color: '#1A5276' }}>Comment fonctionne ce modèle ?</p>
          <p className="text-sm mt-1" style={{ color: '#2980B9' }}>
            Ces sections remplaceront automatiquement les sections standards du Module 1 (Introduction) lors de la génération de tout nouveau projet de votre organisation. Le contenu HTML est supporté. Les variables dynamiques disponibles sont : <code style={{ backgroundColor: '#D6EAF8', padding: '1px 5px', borderRadius: 3 }}>{'{{clientName}}'}</code>, <code style={{ backgroundColor: '#D6EAF8', padding: '1px 5px', borderRadius: 3 }}>{'{{buildingAddress}}'}</code>, <code style={{ backgroundColor: '#D6EAF8', padding: '1px 5px', borderRadius: 3 }}>{'{{documentType}}'}</code>.
          </p>
        </div>
      </div>

      {/* Sections */}
      <div className="space-y-4">
        {sections.map((section, index) => (
          <div key={index} className="rounded-md" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E9ECEF' }}>

            {/* En-tête de section */}
            <div className="flex items-center gap-3 p-4" style={{ borderBottom: '1px solid #F1F3F5' }}>
              <div className="flex flex-col gap-1">
                <button onClick={() => moveSection(index, 'up')} disabled={index === 0}
                  style={{ color: index === 0 ? '#DEE2E6' : '#6C757D', background: 'none', border: 'none', cursor: index === 0 ? 'default' : 'pointer', padding: 0 }}>
                  <ChevronUp size={16} />
                </button>
                <button onClick={() => moveSection(index, 'down')} disabled={index === sections.length - 1}
                  style={{ color: index === sections.length - 1 ? '#DEE2E6' : '#6C757D', background: 'none', border: 'none', cursor: index === sections.length - 1 ? 'default' : 'pointer', padding: 0 }}>
                  <ChevronDown size={16} />
                </button>
              </div>

              <div className="flex items-center justify-center rounded text-white text-xs font-bold"
                style={{ backgroundColor: '#C0392B', width: 32, height: 32, flexShrink: 0 }}>
                {section.id}
              </div>

              <input
                type="text"
                value={section.title}
                onChange={e => updateSection(index, 'title', e.target.value)}
                placeholder="Titre de la section..."
                className="flex-1 rounded px-3 py-2 text-sm font-medium focus:outline-none"
                style={{ border: '1px solid #E9ECEF', color: '#2C3E50', backgroundColor: '#F8F9FA' }}
                onFocus={e => e.target.style.borderColor = '#C0392B'}
                onBlur={e => e.target.style.borderColor = '#E9ECEF'}
              />

              <button onClick={() => removeSection(index)}
                className="flex items-center justify-center rounded p-2 transition-colors"
                style={{ color: '#ADB5BD', border: 'none', background: 'none', cursor: 'pointer' }}
                onMouseEnter={e => e.currentTarget.style.color = '#C0392B'}
                onMouseLeave={e => e.currentTarget.style.color = '#ADB5BD'}>
                <Trash2 size={16} />
              </button>
            </div>

            {/* Contenu */}
            <div className="p-4">
              <textarea
                value={section.content}
                onChange={e => updateSection(index, 'content', e.target.value)}
                rows={8}
                placeholder={`Contenu de la section ${section.id}...\n\nHTML supporté : <h2>, <p>, <strong>, <em>, <ul>, <li>\nVariables : {{clientName}}, {{buildingAddress}}, {{documentType}}`}
                className="rounded px-4 py-3 text-sm focus:outline-none resize-y font-mono"
                style={{ ...inputStyle, lineHeight: 1.7 }}
                onFocus={e => e.target.style.borderColor = '#C0392B'}
                onBlur={e => e.target.style.borderColor = '#CED4DA'}
              />
              <p className="text-xs mt-1" style={{ color: '#ADB5BD' }}>
                {section.content.length} caractères
              </p>
            </div>
          </div>
        ))}

        {/* Ajouter une section */}
        <button onClick={addSection}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-md text-sm font-medium transition-colors"
          style={{ border: '2px dashed #DEE2E6', color: '#6C757D', backgroundColor: 'transparent' }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = '#C0392B'; e.currentTarget.style.color = '#C0392B'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = '#DEE2E6'; e.currentTarget.style.color = '#6C757D'; }}>
          <Plus size={16} />
          Ajouter une section
        </button>
      </div>

      {/* Bouton sauvegarder bas de page */}
      <div className="flex justify-end mt-8">
        <button onClick={handleSave} disabled={saving}
          className="flex items-center gap-2 text-white text-sm font-medium px-6 py-3 rounded"
          style={{ backgroundColor: saved ? '#27AE60' : '#C0392B' }}
          onMouseEnter={e => !saved && (e.currentTarget.style.backgroundColor = '#A93226')}
          onMouseLeave={e => !saved && (e.currentTarget.style.backgroundColor = '#C0392B')}>
          <Save size={15} />
          {saving ? 'Sauvegarde...' : saved ? '✓ Sauvegardé !' : 'Sauvegarder le modèle'}
        </button>
      </div>
    </AppLayout>
  );
}