'use client';

import { useState } from 'react';
import { X, GripVertical, Download } from 'lucide-react';
import api from '@/lib/api';

interface ExportModalProps {
  projectId: string;
  projectName: string;
  documentType: string;
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

export default function ExportModal({
  projectId,
  projectName,
  documentType,
  hasPlans,
  onClose,
}: ExportModalProps) {
  // Liste filtrée selon le type de document
  const PSI_EXCLUDED_MODULES = [3]; // Pas d'organigramme dans un PSI

  const availableModules = ALL_MODULES.filter((m) => {
    if (m.num === 6 && !hasPlans) return false;
    if (documentType === 'PSI' && PSI_EXCLUDED_MODULES.includes(m.num)) return false;
    return true;
  });

  const [orderedModules, setOrderedModules] =
    useState<ModuleOption[]>(availableModules);
  const [selected, setSelected] = useState<Set<number>>(
    new Set(availableModules.map((m) => m.num)),
  );
  const [language, setLanguage] = useState<'fr' | 'en' | 'both'>('fr');
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const toggleModule = (num: number) => {
    setSelected((prev) => {
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

    setOrderedModules((prev) => {
      const next = [...prev];
      const [moved] = next.splice(dragIndex, 1);
      next.splice(idx, 0, moved);
      return next;
    });

    setDragIndex(idx);
  };

  const handleDragEnd = () => setDragIndex(null);

  // ── Nommage ──────────────────────────────────────────────
  const sanitizeFilenamePart = (value: string): string => {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9-_]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  };

  const buildFallbackFilename = (lang: 'fr' | 'en') => {
    const safeType = sanitizeFilenamePart(documentType || 'DOCUMENT');
    const safeProject = sanitizeFilenamePart(projectName || 'Projet');

    return `${safeType}---${safeProject}-${lang.toUpperCase()}.pdf`;
  };

  const getFilenameFromDisposition = (
    disposition: string | undefined,
    fallback: string,
  ) => {
    if (!disposition) return fallback;

    // filename*=UTF-8''...
    const utf8Match = disposition.match(/filename\*=UTF-8''([^;]+)/i);

    if (utf8Match?.[1]) {
      try {
        return decodeURIComponent(utf8Match[1].trim());
      } catch {
        // Continue vers filename=
      }
    }

    // filename="..."
    const standardMatch = disposition.match(/filename="([^"]+)"/i);

    if (standardMatch?.[1]) {
      return standardMatch[1].trim();
    }

    return fallback;
  };

  const triggerBlobDownload = (blob: Blob, filename: string) => {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.setAttribute('download', filename);

    document.body.appendChild(link);
    link.click();
    link.remove();

    window.URL.revokeObjectURL(url);
  };

  const downloadBase64Pdf = (base64: string, filename: string) => {
    const byteChars = atob(base64);
    const byteNumbers = new Array(byteChars.length);

    for (let i = 0; i < byteChars.length; i++) {
      byteNumbers[i] = byteChars.charCodeAt(i);
    }

    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: 'application/pdf' });

    triggerBlobDownload(blob, filename);
  };

  // ── Export ────────────────────────────────────────────────
  const handleExport = async () => {
    const selectedModules = orderedModules
      .filter((m) => selected.has(m.num))
      .map((m) => m.num);

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
          // L'aperçu est désormais géré séparément dans la page projet.
          // Un export via cette modale est toujours un export normal.
          isPreview: false,
        },
        {
          responseType: language === 'both' ? 'json' : 'blob',
        },
      );

      if (language === 'both') {
        const { fr, en, filenames } = res.data ?? {};

        if (fr) {
          downloadBase64Pdf(
            fr,
            filenames?.fr || buildFallbackFilename('fr'),
          );
        }

        if (en) {
          downloadBase64Pdf(
            en,
            filenames?.en || buildFallbackFilename('en'),
          );
        }
      } else {
        const blob =
          res.data instanceof Blob
            ? res.data
            : new Blob([res.data], { type: 'application/pdf' });

        const fallback = buildFallbackFilename(language);

        const disposition = res.headers?.['content-disposition'];

        const filename = getFilenameFromDisposition(
          disposition,
          fallback,
        );

        triggerBlobDownload(blob, filename);
      }

      onClose();
    } catch (err: any) {
      console.error(err);

      const detail =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        err?.message;

      setError(
        detail
          ? `Erreur lors de la génération du PDF : ${detail}`
          : 'Erreur lors de la génération du PDF.',
      );
    } finally {
      setExporting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50 p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
    >
      <div
        className="w-full max-w-lg rounded-md p-6 max-h-[90vh] overflow-y-auto"
        style={{
          backgroundColor: '#FFFFFF',
          boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
        }}
      >
        {/* En-tête */}
        <div className="flex items-center justify-between mb-5">
          <h3
            className="font-semibold text-lg"
            style={{ color: '#2C3E50' }}
          >
            Exporter le document
          </h3>

          <button onClick={onClose} style={{ color: '#ADB5BD' }}>
            <X size={20} />
          </button>
        </div>

        {/* Liste modules — sélection + ordre */}
        <p
          className="text-sm font-medium mb-2"
          style={{ color: '#495057' }}
        >
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
                onDragOver={(e) => handleDragOver(e, idx)}
                onDragEnd={handleDragEnd}
                className="flex items-center gap-2 px-3 py-2.5 rounded transition-colors"
                style={{
                  border: `1px solid ${
                    isSelected ? '#F1948A' : '#E9ECEF'
                  }`,
                  backgroundColor: isSelected ? '#FDEDEC' : '#F8F9FA',
                  opacity: dragIndex === idx ? 0.5 : 1,
                  cursor: 'grab',
                }}
              >
                <GripVertical
                  size={15}
                  style={{ color: '#ADB5BD', flexShrink: 0 }}
                />

                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleModule(mod.num)}
                  onClick={(e) => e.stopPropagation()}
                  className="w-4 h-4 flex-shrink-0"
                />

                <span
                  className="text-sm font-medium"
                  style={{
                    color: isSelected ? '#C0392B' : '#6C757D',
                  }}
                >
                  {mod.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Langue */}
        <p
          className="text-sm font-medium mb-2"
          style={{ color: '#495057' }}
        >
          Langue
        </p>

        <div className="flex gap-2 mb-5">
          {(
            [
              { value: 'fr', label: 'Français' },
              { value: 'en', label: 'English' },
              { value: 'both', label: 'Les deux' },
            ] as const
          ).map((opt) => (
            <button
              key={opt.value}
              onClick={() => setLanguage(opt.value)}
              className="flex-1 py-2 rounded text-sm font-medium transition-colors"
              style={{
                backgroundColor:
                  language === opt.value ? '#C0392B' : '#F8F9FA',
                color:
                  language === opt.value ? '#FFFFFF' : '#6C757D',
                border: `1px solid ${
                  language === opt.value ? '#C0392B' : '#DEE2E6'
                }`,
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Information */}
        <div
          className="mb-5 rounded px-3 py-2.5 text-sm"
          style={{
            backgroundColor: '#F8F9FA',
            color: '#6C757D',
            border: '1px solid #E9ECEF',
          }}
        >
          L’aperçu est maintenant géré directement depuis la page du projet.
          Cet écran génère uniquement l’export PDF final demandé.
        </div>

        {error && (
          <p className="text-sm mb-4" style={{ color: '#C0392B' }}>
            {error}
          </p>
        )}

        {/* Boutons */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 font-medium py-2.5 rounded text-sm"
            style={{
              border: '1px solid #DEE2E6',
              color: '#6C757D',
            }}
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
