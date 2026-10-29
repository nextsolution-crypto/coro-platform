'use client';

import { useEffect, useRef, useState } from 'react';
import { Download, GripVertical, RotateCcw, X } from 'lucide-react';
import api from '@/lib/api';

interface ExportModalProps {
  projectId: string;
  projectName: string;
  documentType: string;
  hasPlans: boolean;
  onClose: () => void;
}
interface ModuleOption { num: number; label: string }
interface ExportArtifact {
  language: 'fr' | 'en'; fileName: string; sizeBytes: number; sha256: string; downloadUrl: string;
}
interface ExportResult {
  id: string; status: 'PROCESSING' | 'AVAILABLE' | 'FAILED'; failureCode?: string | null; artifacts: ExportArtifact[];
}

const pcaModules: ModuleOption[] = [
  { num: 1, label: 'M1 — Introduction et politique de continuité' },
  { num: 2, label: 'M2 — Contexte organisationnel et gouvernance' },
  { num: 3, label: 'M3 — Appréciation du risque (ARA)' },
  { num: 4, label: "M4 — Bilan d'impact sur les activités (BIA)" },
  { num: 5, label: 'M5 — Stratégies de continuité' },
  { num: 6, label: 'M6 — Communication de crise' },
  { num: 7, label: 'M7 — Activation et procédures de reprise' },
  { num: 8, label: 'M8 — Exercices, registres et maintien' },
];
const pmuModules: ModuleOption[] = [
  { num: 1, label: 'M1 — Introduction' }, { num: 2, label: 'M2 — Liste téléphonique' },
  { num: 3, label: 'M3 — Rôles et responsabilités' }, { num: 4, label: 'M4 — Procédures' },
  { num: 6, label: 'M6 — Plans techniques' }, { num: 7, label: 'M7 — Description du site' },
  { num: 8, label: 'M8 — Registres et annexes' },
];

export default function ExportModal({ projectId, projectName, documentType, hasPlans, onClose }: ExportModalProps) {
  const availableModules = (documentType === 'PCA' ? pcaModules : pmuModules).filter((module) => {
    if (documentType !== 'PCA' && module.num === 6 && !hasPlans) return false;
    return !(documentType === 'PSI' && module.num === 3);
  });
  const [orderedModules, setOrderedModules] = useState(availableModules);
  const [selected, setSelected] = useState(new Set(availableModules.map((module) => module.num)));
  const [language, setLanguage] = useState<'fr' | 'en' | 'both'>('fr');
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [result, setResult] = useState<ExportResult | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  const recoveryKey = `coro-document-pdf-export:${projectId}`;

  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  useEffect(() => {
    returnFocusRef.current = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); onCloseRef.current(); return; }
      if (event.key !== 'Tab' || !dialogRef.current) return;
      const controls = Array.from(dialogRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])')).filter((element) => element.offsetParent !== null);
      if (!controls.length) return;
      const [first, last] = [controls[0], controls[controls.length - 1]];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    const focusin = (event: FocusEvent) => {
      if (dialogRef.current && !dialogRef.current.contains(event.target as Node)) closeRef.current?.focus();
    };
    document.addEventListener('keydown', keydown);
    document.addEventListener('focusin', focusin);
    return () => {
      document.removeEventListener('keydown', keydown);
      document.removeEventListener('focusin', focusin);
      returnFocusRef.current?.focus();
    };
  }, []);

  useEffect(() => {
    const exportId = sessionStorage.getItem(recoveryKey);
    if (!exportId) return;
    void api.get<ExportResult>(`/projects/${projectId}/export/requests/${exportId}`).then(({ data }) => {
      setResult(data);
      setStatusMessage(data.status === 'AVAILABLE' ? 'Votre export est disponible.' : data.status === 'PROCESSING' ? 'La génération est en cours.' : 'La génération précédente a échoué. Vous pouvez la reprendre.');
    }).catch(() => sessionStorage.removeItem(recoveryKey));
  }, [projectId, recoveryKey]);

  const toggleModule = (num: number) => setSelected((previous) => {
    const next = new Set(previous); if (next.has(num)) next.delete(num); else next.add(num); return next;
  });
  const moveModule = (target: number) => {
    if (dragIndex === null || dragIndex === target) return;
    setOrderedModules((previous) => { const next = [...previous]; const [moved] = next.splice(dragIndex, 1); next.splice(target, 0, moved); return next; });
    setDragIndex(target);
  };
  const triggerDownload = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob); const link = document.createElement('a');
    link.href = url; link.download = filename; document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url);
  };
  const downloadArtifact = async (artifact: ExportArtifact) => {
    const response = await api.get(artifact.downloadUrl, { responseType: 'blob' });
    const receivedHash = response.headers?.['x-document-sha256'];
    if (receivedHash && receivedHash !== artifact.sha256) throw new Error("L'intégrité du fichier téléchargé ne peut pas être confirmée.");
    triggerDownload(response.data instanceof Blob ? response.data : new Blob([response.data], { type: 'application/pdf' }), artifact.fileName);
  };
  const waitForResult = async (initial: ExportResult) => {
    let current = initial;
    for (let attempt = 0; current.status === 'PROCESSING' && attempt < 40; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 750));
      current = (await api.get<ExportResult>(`/projects/${projectId}/export/requests/${current.id}`)).data;
    }
    return current;
  };
  const complete = async (initial: ExportResult, download: boolean) => {
    const current = await waitForResult(initial); setResult(current);
    if (current.status === 'FAILED') { setStatusMessage('La génération a échoué. Vous pouvez la reprendre.'); setError(`Échec de génération : ${current.failureCode || 'cause indisponible'}`); return; }
    if (current.status !== 'AVAILABLE') { setStatusMessage('La génération continue. Revenez à cet écran pour récupérer le résultat.'); return; }
    setStatusMessage('Votre export est disponible.');
    if (download) for (const artifact of current.artifacts) await downloadArtifact(artifact);
  };
  const handleExport = async () => {
    const modules = orderedModules.filter((module) => selected.has(module.num)).map((module) => module.num);
    if (!modules.length) { setError('Sélectionnez au moins un module à exporter.'); return; }
    setExporting(true); setError(''); setStatusMessage('Génération sécurisée en cours…');
    try {
      const created = (await api.post<ExportResult>(`/projects/${projectId}/export`, {
        selectedModules: modules, moduleOrder: modules, language, isPreview: false,
        idempotencyKey: crypto.randomUUID().replace(/-/g, ''),
      })).data;
      sessionStorage.setItem(recoveryKey, created.id);
      await complete(created, true);
    } catch (caught: any) {
      setError(caught?.response?.data?.message || caught?.message || 'Erreur lors de la génération du PDF.');
      setStatusMessage('');
    } finally { setExporting(false); }
  };
  const handleRetry = async () => {
    if (!result) return;
    setExporting(true); setError(''); setStatusMessage('Reprise de la génération…');
    try { await complete((await api.post<ExportResult>(`/projects/${projectId}/export/requests/${result.id}/retry`)).data, false); }
    catch (caught: any) { setError(caught?.response?.data?.message || caught?.message || 'Impossible de reprendre la génération.'); }
    finally { setExporting(false); }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="document-export-title" aria-describedby="document-export-description" className="w-full max-w-lg rounded-md p-6 max-h-[90vh] overflow-y-auto" style={{ backgroundColor: '#FFFFFF', boxShadow: '0 8px 32px rgba(0,0,0,0.15)' }}>
        <div className="flex items-center justify-between mb-5">
          <h3 id="document-export-title" className="font-semibold text-lg" style={{ color: '#2C3E50' }}>Exporter le document</h3>
          <button ref={closeRef} onClick={onClose} aria-label="Fermer la fenêtre d'export" style={{ color: '#ADB5BD' }}><X size={20} /></button>
        </div>
        <p className="text-sm font-medium mb-2" style={{ color: '#495057' }}>Modules à inclure (glissez pour réorganiser)</p>
        <div className="space-y-1.5 mb-5">
          {orderedModules.map((module, index) => {
            const active = selected.has(module.num);
            return <div key={module.num} draggable onDragStart={() => setDragIndex(index)} onDragOver={(event) => { event.preventDefault(); moveModule(index); }} onDragEnd={() => setDragIndex(null)} className="flex items-center gap-2 px-3 py-2.5 rounded" style={{ border: `1px solid ${active ? '#F1948A' : '#E9ECEF'}`, backgroundColor: active ? '#FDEDEC' : '#F8F9FA', cursor: 'grab' }}>
              <GripVertical size={15} style={{ color: '#ADB5BD', flexShrink: 0 }} />
              <input aria-label={`Inclure ${module.label}`} type="checkbox" checked={active} onChange={() => toggleModule(module.num)} className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm font-medium" style={{ color: active ? '#C0392B' : '#6C757D' }}>{module.label}</span>
            </div>;
          })}
        </div>
        <p className="text-sm font-medium mb-2" style={{ color: '#495057' }}>Langue</p>
        <div className="flex gap-2 mb-5">
          {([{ value: 'fr', label: 'Français' }, { value: 'en', label: 'English' }, { value: 'both', label: 'Les deux' }] as const).map((option) =>
            <button key={option.value} onClick={() => setLanguage(option.value)} aria-pressed={language === option.value} className="flex-1 py-2 rounded text-sm font-medium" style={{ backgroundColor: language === option.value ? '#C0392B' : '#F8F9FA', color: language === option.value ? '#FFFFFF' : '#6C757D', border: `1px solid ${language === option.value ? '#C0392B' : '#DEE2E6'}` }}>{option.label}</button>)}
        </div>
        <div id="document-export-description" className="mb-4 rounded px-3 py-2.5 text-sm" style={{ backgroundColor: '#F8F9FA', color: '#6C757D', border: '1px solid #E9ECEF' }}>
          Le PDF final est produit depuis la version approuvée et conservé dans le stockage privé. Projet : {projectName}.
        </div>
        {statusMessage && <p role="status" className="text-sm mb-3" style={{ color: '#2C3E50' }}>{statusMessage}</p>}
        {error && <p role="alert" className="text-sm mb-4" style={{ color: '#C0392B' }}>{error}</p>}
        {result?.status === 'AVAILABLE' && <div className="mb-4 flex flex-wrap gap-2">{result.artifacts.map((artifact) => <button key={artifact.language} onClick={() => void downloadArtifact(artifact)} className="px-3 py-2 rounded text-sm" style={{ border: '1px solid #C0392B', color: '#C0392B' }}><Download size={14} className="inline mr-1" />{artifact.fileName}</button>)}</div>}
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 font-medium py-2.5 rounded text-sm" style={{ border: '1px solid #DEE2E6', color: '#6C757D' }}>Annuler</button>
          {result?.status === 'FAILED' ? <button onClick={() => void handleRetry()} disabled={exporting} className="flex-1 flex items-center justify-center gap-2 text-white font-medium py-2.5 rounded text-sm disabled:opacity-50" style={{ backgroundColor: '#C0392B' }}><RotateCcw size={15} />{exporting ? 'Reprise…' : 'Reprendre'}</button> : <button onClick={() => void handleExport()} disabled={exporting} className="flex-1 flex items-center justify-center gap-2 text-white font-medium py-2.5 rounded text-sm disabled:opacity-50" style={{ backgroundColor: '#C0392B' }}><Download size={15} />{exporting ? 'Génération…' : 'Exporter'}</button>}
        </div>
      </div>
    </div>
  );
}
