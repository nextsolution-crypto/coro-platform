'use client';

import { useState } from 'react';
import { X, GripVertical, Download } from 'lucide-react';
import api from '@/lib/api';

interface ExportModalProps {
  projectId: string;
  projectName: string;
  hasPlans: boolean;
  onClose: () => void;
}

interface ModuleOption {
  num: number;
  label: string;
}

const ALL_MODULES: ModuleOption[] = [
  { num: 1, label: 'M1 — Introduction' },
  { num: 2, label: 'M2 — Liste téléphonique' },
  { num: 3, label: 'M3 — Rôles et responsabilités' },
  { num: 4, label: 'M4 — Procédures' },
  { num: 6, label: 'M6 — Plans techniques' },
  { num: 7, label: 'M7 — Description du site' },
  { num: 8, label: 'M8 — Registres et annexes' },
];

export default function ExportModal({ projectId, projectName, hasPlans, onClose }: ExportModalProps) {
  // Liste filtrée — M6 retiré de la liste si aucun plan n'existe
  const availableModules = ALL_MODULES.filter(m => m.num !== 6 || hasPlans);

  const [orderedModules, setOrderedModules] = useState<ModuleOption[]>(availableModules);
  const [selected, setSelected] = useState<Set<number>>(new Set(availableModules.map(m => m.num)));
  const [language, setLanguage] = useState<'fr' | 'en' | 'both'>('fr');
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const toggleModule = (num: number) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(num)) next.delete(num);
      else next.add(num);
      return next;
    });
  };

  // ── Glisser-déposer ──
  const handleDragStart = (idx: number) => setDragIndex(idx);

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === idx) return;
    setOrderedModules(prev => {
      const next = [...prev];
      const [moved] = next.splice(dragIndex, 1);
      next.splice(idx, 0, moved);
      return next;
    });
    setDragIndex(idx);
  };

  const handleDragEnd = () => setDragIndex(null);

  // ── Export ──
  const handleExport = async () => {
    const selectedModules = orderedModules.filter(m => selected.has(m.num)).map(m => m.num);
    if (selectedModules.length === 0) {
      setError('Sélectionnez au moins un module à exporter.');
      return;
    }

    setExporting(true);
    setError('');
    try {
      const res = await api.post(
        `/projects/${projectId}/export`,
        {
          selectedModules,
          moduleOrder: selectedModules,
          language,
        },
        { responseType: language === 'both' ? 'json' : 'blob' }
      );

      const safeName = projectName.replace(/[^a-z0-9]/gi, '-');

      if (language === 'both') {
        // Réponse JSON avec fr/en en base64 — 2 téléchargements
        const { fr, en } = res.data;
        if (fr) downloadBase64Pdf(fr, `${safeName}-FR.pdf`);
        if (en) downloadBase64Pdf(en, `${safeName}-EN.pdf`);
      } else {
        const url = window.URL.createObjectURL(new Blob([res.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `${safeName}-${language.toUpperCase()}.pdf`);
        document.body.appendChild(link);
        link.click();
        link.remove();
      }
      onClose();
    } catch (err) {
      console.error(err);
      setError('Erreur lors de la génération du PDF. Vérifiez que le document a bien été généré.');
    } finally {
      setExporting(false);
    }
  };

  const downloadBase64Pdf = (base64: string, filename: string) => {
    const byteChars = atob(base64);
    const byteNumbers = new Array(byteChars.length);
    for (let i = 0; i < byteChars.length; i++) byteNumbers[i] = byteChars.charCodeAt(i);
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
      <div className="w-full max-w-lg rounded-md p-6 max-h-[90vh] overflow-y-auto"
        style={{ backgroundColor: '#FFFFFF', boxShadow: '0 8px 32px rgba(0,0,0,0.15)' }}>

        {/* En-tête */}
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-semibold text-lg" style={{ color: '#2C3E50' }}>
            Exporter le document
          </h3>
          <button onClick={onClose} style={{ color: '#ADB5BD' }}>
            <X size={20} />
          </button>
        </div>

        {/* Liste modules — sélection + ordre */}
        <p className="text-sm font-medium mb-2" style={{ color: '#495057' }}>
          Modules à inclure (glissez pour réorganiser)
        </p>
        <div className="space-y-1.5 mb-5">
          {orderedModules.map((mod, idx) => {
            const isSelected = selected.has(mod.num);
            return (
              <div
                key={mod.num}
                draggable
                onDragStart={() => handleDragStart(idx)}
                onDragOver={e => handleDragOver(e, idx)}
                onDragEnd={handleDragEnd}
                className="flex items-center gap-2 px-3 py-2.5 rounded transition-colors"
                style={{
                  border: `1px solid ${isSelected ? '#F1948A' : '#E9ECEF'}`,
                  backgroundColor: isSelected ? '#FDEDEC' : '#F8F9FA',
                  opacity: dragIndex === idx ? 0.5 : 1,
                  cursor: 'grab',
                }}
              >
                <GripVertical size={15} style={{ color: '#ADB5BD', flexShrink: 0 }} />
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleModule(mod.num)}
                  onClick={e => e.stopPropagation()}
                  className="w-4 h-4 flex-shrink-0"
                />
                <span className="text-sm font-medium" style={{ color: isSelected ? '#C0392B' : '#6C757D' }}>
                  {mod.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Langue */}
        <p className="text-sm font-medium mb-2" style={{ color: '#495057' }}>
          Langue
        </p>
        <div className="flex gap-2 mb-5">
          {([
            { value: 'fr', label: 'Français' },
            { value: 'en', label: 'English' },
            { value: 'both', label: 'Les deux' },
          ] as const).map(opt => (
            <button
              key={opt.value}
              onClick={() => setLanguage(opt.value)}
              className="flex-1 py-2 rounded text-sm font-medium transition-colors"
              style={{
                backgroundColor: language === opt.value ? '#C0392B' : '#F8F9FA',
                color: language === opt.value ? '#FFFFFF' : '#6C757D',
                border: `1px solid ${language === opt.value ? '#C0392B' : '#DEE2E6'}`,
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {error && (
          <p className="text-sm mb-4" style={{ color: '#C0392B' }}>{error}</p>
        )}

        {/* Boutons */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 font-medium py-2.5 rounded text-sm"
            style={{ border: '1px solid #DEE2E6', color: '#6C757D' }}
          >
            Annuler
          </button>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="flex-1 flex items-center justify-center gap-2 text-white font-medium py-2.5 rounded text-sm transition-colors disabled:opacity-50"
            style={{ backgroundColor: '#C0392B' }}
          >
            <Download size={15} />
            {exporting ? 'Génération...' : 'Exporter'}
          </button>
        </div>
      </div>
    </div>
  );
}
