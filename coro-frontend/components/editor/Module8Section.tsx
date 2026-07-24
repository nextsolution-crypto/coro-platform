'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import api from '@/lib/api';
import Module8Section10, { LithiumAnnexeData, DEFAULT_LITHIUM_ANNEXE_DATA } from './Module8Section10';

// ============================================================
// TYPES
// ============================================================

interface TrainingEntry {
  id: string;
  nom: string;
  titre: string;
  date: string;
  formateur: string;
}

interface PhoneticMessage {
  id: string;
  evenement: string;
  messageFR: string;
  messageEN: string;
}

interface EvacuationReport {
  adresse: string;
  telephoneContact: string;
  dateEvenement: string;
  heure: string;
  coordonnateurUrgence: string;
  typeEvenement: string;
  cause: string;
  heureDeClenchement: string;
  deroulement: string;
  recommandation: string;
  tempsEvacuationComplete: string;
  signatureResponsable: string;
  dateSignature: string;
}

interface RiskRow {
  id: string;
  equipement: string;
  codeNorme: string;
  article: string;
  observations: string;
}

interface SectorRow {
  id: string;
  etage: string;
  evacue: boolean;
  notes: string;
}

interface Module8SectionProps {
  projectId: string;
  language?: 'fr' | 'en';
  initialData: {
    sections: any[];
  };
}

// ============================================================
// UTILITAIRES
// ============================================================

function uid(): string {
  return Math.random().toString(36).slice(2, 9);
}

function ensureIds<T extends { id?: string }>(entries: T[]): (T & { id: string })[] {
  if (!entries || !Array.isArray(entries)) return [];
  return entries.map(e => ({ ...e, id: e.id || uid() }));
}

function getSection(sections: any[], id: string) {
  return sections.find((s: any) => s.id === id);
}

// ============================================================
// SOUS-COMPOSANTS STATIQUES
// ============================================================

function SectionHeader({ sectionId, title }: { sectionId: string; title: string }) {
  return (
    <div className="mb-4">
      <div className="flex items-start gap-2 mb-1">
        <div
          className="w-8 h-6 rounded flex items-center justify-center text-xs font-bold flex-shrink-0"
          style={{ backgroundColor: '#F8F9FA', color: '#6C757D', border: '1px solid #DEE2E6' }}
        >
          {sectionId}
        </div>
        <h2 className="text-xl font-black uppercase leading-tight" style={{ color: '#2C3E50' }}>
          {title}
        </h2>
      </div>
      <div className="h-0.5 mt-1 mb-4" style={{ backgroundColor: '#C0392B' }} />
    </div>
  );
}

function AddRowButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className="mt-2 flex items-center gap-1.5 text-sm px-3 py-1.5 rounded transition-colors"
      style={{ color: '#2980B9', border: '1px solid transparent' }}
      onMouseEnter={e => {
        e.currentTarget.style.backgroundColor = '#EBF5FB';
        e.currentTarget.style.borderColor = '#AED6F1';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.backgroundColor = 'transparent';
        e.currentTarget.style.borderColor = 'transparent';
      }}
    >
      <Plus size={15} />
      {label}
    </button>
  );
}

// ============================================================
// COMPOSANT SECTION TEXTE — vrai composant React (règles des Hooks)
// ============================================================

function TextSection({
  sectionId,
  title,
  value,
  setValue,
  markDirty,
  language,
}: {
  sectionId: string;
  title: string;
  value: string;
  setValue: (v: string) => void;
  markDirty: () => void;
  language: 'fr' | 'en';
}) {
  const [editing, setEditing] = useState(false);
  const [localVal, setLocalVal] = useState(value);
  const isFr = language === 'fr';

  useEffect(() => { setLocalVal(value); }, [value]);

  const t = {
    edit:   isFr ? 'Modifier'    : 'Edit',
    cancel: isFr ? 'Annuler'     : 'Cancel',
    save:   isFr ? 'Sauvegarder' : 'Save',
  };

  return (
    <div>
      <SectionHeader sectionId={sectionId} title={title} />
      <div className="flex justify-end mb-3">
        {!editing ? (
          <button
            onClick={() => setEditing(true)}
            className="text-sm px-4 py-2 rounded flex items-center gap-2"
            style={{ border: '1px solid #DEE2E6', color: '#6C757D' }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F8F9FA'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            ✏️ {t.edit}
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={() => { setLocalVal(value); setEditing(false); }}
              className="text-sm px-3 py-2 rounded"
              style={{ border: '1px solid #DEE2E6', color: '#6C757D' }}
            >
              {t.cancel}
            </button>
            <button
              onClick={() => { setValue(localVal); markDirty(); setEditing(false); }}
              className="text-sm px-4 py-2 rounded text-white"
              style={{ backgroundColor: '#C0392B' }}
            >
              {t.save}
            </button>
          </div>
        )}
      </div>

      {editing ? (
        <textarea
          value={localVal}
          onChange={e => setLocalVal(e.target.value)}
          className="w-full rounded-md p-4 text-sm font-mono"
          style={{
            minHeight: '400px',
            border: '1px solid #C0392B',
            color: '#2C3E50',
            backgroundColor: '#FFFFFF',
            outline: 'none',
            resize: 'vertical',
          }}
        />
      ) : (
        <div className="rounded-md p-6" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E9ECEF' }}>
          {value.split('\n').map((line, i) => {
            if (line.startsWith('**') && line.endsWith('**'))
              return <h3 key={i} className="font-bold mt-4 mb-2" style={{ color: '#2C3E50' }}>{line.replace(/\*\*/g, '')}</h3>;
            if (line.startsWith('- '))
              return <li key={i} className="ml-6 text-sm" style={{ color: '#495057' }}>{line.substring(2)}</li>;
            if (line.trim() === '') return <br key={i} />;
            return <p key={i} className="text-sm leading-relaxed" style={{ color: '#495057' }}>{line}</p>;
          })}
        </div>
      )}
    </div>
  );
}

// ============================================================
// COMPOSANT PRINCIPAL
// ============================================================

export default function Module8Section({
  projectId,
  language = 'fr',
  initialData,
}: Module8SectionProps) {

  const isFr = language === 'fr';
  const isFirstLoad = useRef(true);

  const [section8_1, setSection8_1] = useState<TrainingEntry[]>([]);
  const [section8_2, setSection8_2] = useState<PhoneticMessage[]>([]);
  const [section8_3, setSection8_3] = useState<EvacuationReport>({
    adresse: '', telephoneContact: '', dateEvenement: '', heure: '',
    coordonnateurUrgence: '', typeEvenement: '', cause: '',
    heureDeClenchement: '', deroulement: '', recommandation: '',
    tempsEvacuationComplete: '', signatureResponsable: '', dateSignature: '',
  });
  const [section8_4, setSection8_4] = useState<RiskRow[]>([]);
  const [section8_5, setSection8_5] = useState<SectorRow[]>([]);
  const [section8_6, setSection8_6] = useState('');
  const [section8_7, setSection8_7] = useState('');
  const [section8_8, setSection8_8] = useState('');
  const [section8_9, setSection8_9] = useState('');
  const [section8_10, setSection8_10] = useState<LithiumAnnexeData>(DEFAULT_LITHIUM_ANNEXE_DATA);

  const [activeSection, setActiveSection] = useState('8.1');
  const [saving,        setSaving]        = useState(false);
  const [lastSaved,     setLastSaved]     = useState<Date | null>(null);
  const [isDirty,       setIsDirty]       = useState(false);
  const [loadingData,   setLoadingData]   = useState(true);

  const defaultReport: EvacuationReport = {
    adresse: '', telephoneContact: '', dateEvenement: '', heure: '',
    coordonnateurUrgence: '', typeEvenement: '', cause: '',
    heureDeClenchement: '', deroulement: '', recommandation: '',
    tempsEvacuationComplete: '', signatureResponsable: '', dateSignature: '',
  };

  // ============================================================
  // CHARGEMENT
  // ============================================================

  useEffect(() => {
    const loadData = async () => {
      setLoadingData(true);
      try {
        const res = await api.get(`/projects/${projectId}/module8`);
        const saved = res.data?.module8;

        if (saved && saved.section8_1) {
          setSection8_1(ensureIds(saved.section8_1));
          setSection8_2(ensureIds(saved.section8_2));
          setSection8_3(saved.section8_3 || defaultReport);
          setSection8_4(ensureIds(saved.section8_4));
          setSection8_5(ensureIds(saved.section8_5));
          setSection8_6(saved.section8_6 || '');
          setSection8_7(saved.section8_7 || '');
          setSection8_8(saved.section8_8 || '');
          setSection8_9(saved.section8_9 || '');
          setSection8_10(saved.section8_10 || DEFAULT_LITHIUM_ANNEXE_DATA);
        } else {
          const sections = initialData?.sections || [];
          const newS1 = ensureIds(getSection(sections, '8.1')?.entries || []) as TrainingEntry[];
          const newS2 = ensureIds(getSection(sections, '8.2')?.entries || []) as PhoneticMessage[];
          const newS3 = (getSection(sections, '8.3')?.data || defaultReport) as EvacuationReport;
          const newS4 = ensureIds(getSection(sections, '8.4')?.entries || []) as RiskRow[];
          const newS5 = ensureIds(getSection(sections, '8.5')?.entries || []) as SectorRow[];
          const newS6 = getSection(sections, '8.6')?.content || '';
          const newS7 = getSection(sections, '8.7')?.content || '';
          const newS8 = getSection(sections, '8.8')?.content || '';
          const newS9 = getSection(sections, '8.9')?.content || '';

          setSection8_1(newS1);
          setSection8_2(newS2);
          setSection8_3(newS3);
          setSection8_4(newS4);
          setSection8_5(newS5);
          setSection8_6(newS6);
          setSection8_7(newS7);
          setSection8_8(newS8);
          setSection8_9(newS9);

          // Sauvegarder immédiatement les données initiales en DB
          try {
            await api.put(`/projects/${projectId}/module8`, {
              section8_1: newS1, section8_2: newS2, section8_3: newS3, section8_4: newS4,
              section8_5: newS5, section8_6: newS6, section8_7: newS7, section8_8: newS8,
              section8_9: newS9, section8_10: DEFAULT_LITHIUM_ANNEXE_DATA,
            });
          } catch (err) { console.error('Sauvegarde initiale module8 échouée:', err); }
        }
      } catch {
        const sections = initialData?.sections || [];
        setSection8_1(ensureIds(getSection(sections, '8.1')?.entries || []));
        setSection8_2(ensureIds(getSection(sections, '8.2')?.entries || []));
        setSection8_3(getSection(sections, '8.3')?.data || defaultReport);
        setSection8_4(ensureIds(getSection(sections, '8.4')?.entries || []));
        setSection8_5(ensureIds(getSection(sections, '8.5')?.entries || []));
        setSection8_6(getSection(sections, '8.6')?.content || '');
        setSection8_7(getSection(sections, '8.7')?.content || '');
        setSection8_8(getSection(sections, '8.8')?.content || '');
        setSection8_9(getSection(sections, '8.9')?.content || '');
      } finally {
        setLoadingData(false);
        isFirstLoad.current = false;
      }
    };
    loadData();
  }, [projectId]);

  // ============================================================
  // AUTOSAVE
  // ============================================================

  const saveData = useCallback(async () => {
    setSaving(true);
    try {
      await api.put(`/projects/${projectId}/module8`, {
        section8_1, section8_2, section8_3, section8_4,
        section8_5, section8_6, section8_7, section8_8, section8_9, section8_10,
      });
      setLastSaved(new Date());
      setIsDirty(false);
    } catch (err) {
      console.error('Autosave Module 8 échoué :', err);
    } finally {
      setSaving(false);
    }
  }, [projectId, section8_1, section8_2, section8_3, section8_4,
      section8_5, section8_6, section8_7, section8_8, section8_9, section8_10]);

  useEffect(() => {
    if (isFirstLoad.current || !isDirty) return;
    const timer = setTimeout(saveData, 2000);
    return () => clearTimeout(timer);
  }, [section8_1, section8_2, section8_3, section8_4,
      section8_5, section8_6, section8_7, section8_8, section8_9, section8_10, isDirty]);

  const markDirty = () => setIsDirty(true);

  // ============================================================
  // LABELS
  // ============================================================

  const t = isFr ? {
    module: 'REGISTRES ET ANNEXES',
    sections: [
      { id: '8.1', title: 'REGISTRE DE FORMATION' },
      { id: '8.2', title: 'EXEMPLES DE MESSAGES PHONIQUES' },
      { id: '8.3', title: 'RAPPORT D\'ÉVACUATION' },
      { id: '8.4', title: 'INSPECTIONS ET SURVEILLANCES DES RISQUES' },
      { id: '8.5', title: 'REGISTRE D\'ÉVACUATION PAR SECTEURS' },
      { id: '8.6', title: 'RAPPORT D\'INSPECTION DES ÉQUIPEMENTS DE PROTECTION INCENDIE' },
      { id: '8.7', title: 'CADENASSAGE ET ESPACE CLOS' },
      { id: '8.8', title: 'PERMIS DE TRAVAIL À CHAUD ET DEMANDE D\'ÉVITEMENT' },
      { id: '8.9', title: 'COPIE À L\'ENTREPRENEUR' },
      { id: '8.10', title: 'ANNEXE — INCENDIE DE BATTERIES LITHIUM-ION' },
    ],
    addRow: 'Ajouter une ligne',
    saving: 'Sauvegarde...', saved: 'Sauvegardé', unsaved: 'Non sauvegardé',
    loading: 'Chargement...',
  } : {
    module: 'RECORDS AND APPENDICES',
    sections: [
      { id: '8.1', title: 'TRAINING REGISTER' },
      { id: '8.2', title: 'EXAMPLES OF PHONETIC MESSAGES' },
      { id: '8.3', title: 'EVACUATION REPORT' },
      { id: '8.4', title: 'RISK INSPECTIONS AND MONITORING' },
      { id: '8.5', title: 'EVACUATION REGISTER BY SECTOR' },
      { id: '8.6', title: 'FIRE PROTECTION EQUIPMENT INSPECTION REPORT' },
      { id: '8.7', title: 'LOCKOUT/TAGOUT AND CONFINED SPACES' },
      { id: '8.8', title: 'HOT WORK PERMIT AND COMPONENT BYPASS REQUEST' },
      { id: '8.9', title: 'COPY TO CONTRACTOR' },
      { id: '8.10', title: 'APPENDIX — LITHIUM-ION BATTERY FIRE' },
    ],
    addRow: 'Add a row',
    saving: 'Saving...', saved: 'Saved', unsaved: 'Unsaved changes',
    loading: 'Loading...',
  };

  const currentSectionMeta = t.sections.find(s => s.id === activeSection)!;

  // ============================================================
  // SECTION 8.1 — Registre de formation
  // ============================================================

  const [printingAttendance, setPrintingAttendance] = useState(false);

  const handlePrintAttendance = async () => {
    setPrintingAttendance(true);
    try {
      const res = await api.post(
        `/projects/${projectId}/module8/print-attendance`,
        { language },
        { responseType: 'blob' }
      );
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `feuille-presence.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) { console.error(err); }
    finally { setPrintingAttendance(false); }
  };

  const render8_1 = () => (
    <div>
      <div className="flex items-center justify-between mb-4">
        <SectionHeader sectionId="8.1" title={currentSectionMeta.title} />
        <button
          onClick={handlePrintAttendance}
          disabled={printingAttendance}
          className="text-sm font-medium px-4 py-2 rounded transition-colors disabled:opacity-50 flex items-center gap-2"
          style={{ border: '1px solid #A9DFBF', color: '#27AE60', backgroundColor: '#FFFFFF' }}
          onMouseEnter={e => e.currentTarget.style.backgroundColor = '#EAFAF1'}
          onMouseLeave={e => e.currentTarget.style.backgroundColor = '#FFFFFF'}
        >
          🖨️ {printingAttendance ? 'Génération...' : (isFr ? 'Imprimer la feuille de présence' : 'Print attendance sheet')}
        </button>
      </div>
      <div className="rounded overflow-hidden shadow-sm" style={{ border: '1px solid #DEE2E6' }}>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr style={{ backgroundColor: '#F8F9FA' }}>
              {(isFr
                ? ['NOM', 'TITRE / FONCTION', 'DATE', 'FORMATEUR']
                : ['NAME', 'TITLE / FUNCTION', 'DATE', 'TRAINER']
              ).map(col => (
                <th key={col} className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide"
                  style={{ color: '#6C757D', border: '1px solid #DEE2E6' }}>
                  {col}
                </th>
              ))}
              <th style={{ border: '1px solid #DEE2E6', width: '40px' }} />
            </tr>
          </thead>
          <tbody>
            {section8_1.map((entry, idx) => (
              <tr key={entry.id} className="group"
                style={{ backgroundColor: idx % 2 === 0 ? '#FFFFFF' : '#F8F9FA' }}>
                {(['nom', 'titre', 'date', 'formateur'] as const).map(field => (
                  <td key={field} style={{ border: '1px solid #DEE2E6', padding: '2px 4px' }}>
                    <input
                      type={field === 'date' ? 'date' : 'text'}
                      value={entry[field]}
                      onChange={e => {
                        setSection8_1(section8_1.map(r => r.id === entry.id ? { ...r, [field]: e.target.value } : r));
                        markDirty();
                      }}
                      className="w-full px-2 py-1 text-sm bg-transparent border-0 outline-none rounded"
                      style={{ color: '#2C3E50' }}
                    />
                  </td>
                ))}
                <td style={{ border: '1px solid #DEE2E6', textAlign: 'center' }}>
                  <button
                    onClick={() => { setSection8_1(section8_1.filter(r => r.id !== entry.id)); markDirty(); }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded"
                    style={{ color: '#C0392B' }}
                  >
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <AddRowButton label={t.addRow} onClick={() => {
        setSection8_1([...section8_1, { id: uid(), nom: '', titre: '', date: '', formateur: '' }]);
        markDirty();
      }} />
    </div>
  );

  // ============================================================
  // SECTION 8.2 — Messages phoniques
  // ============================================================

  const render8_2 = () => (
    <div>
      <SectionHeader sectionId="8.2" title={currentSectionMeta.title} />
      <div className="rounded overflow-hidden shadow-sm" style={{ border: '1px solid #DEE2E6' }}>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr style={{ backgroundColor: '#F8F9FA' }}>
              {(isFr
                ? ['ÉVÉNEMENT', 'MESSAGE FRANÇAIS', 'MESSAGE ANGLAIS']
                : ['EVENT', 'FRENCH MESSAGE', 'ENGLISH MESSAGE']
              ).map((col, i) => (
                <th key={col} className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide"
                  style={{ color: '#6C757D', border: '1px solid #DEE2E6', width: i === 0 ? '20%' : '40%' }}>
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {section8_2.map((msg, idx) => (
              <tr key={msg.id} style={{ backgroundColor: idx % 2 === 0 ? '#FFFFFF' : '#F8F9FA' }}>
                <td className="px-3 py-2 text-xs font-bold uppercase"
                  style={{ border: '1px solid #DEE2E6', color: '#C0392B', verticalAlign: 'top' }}>
                  {msg.evenement}
                </td>
                <td style={{ border: '1px solid #DEE2E6', padding: '2px 4px' }}>
                  <textarea
                    value={msg.messageFR}
                    onChange={e => {
                      setSection8_2(section8_2.map(m => m.id === msg.id ? { ...m, messageFR: e.target.value } : m));
                      markDirty();
                    }}
                    rows={3}
                    className="w-full px-2 py-1 text-xs bg-transparent border-0 outline-none resize-none"
                    style={{ color: '#495057' }}
                  />
                </td>
                <td style={{ border: '1px solid #DEE2E6', padding: '2px 4px' }}>
                  <textarea
                    value={msg.messageEN}
                    onChange={e => {
                      setSection8_2(section8_2.map(m => m.id === msg.id ? { ...m, messageEN: e.target.value } : m));
                      markDirty();
                    }}
                    rows={3}
                    className="w-full px-2 py-1 text-xs bg-transparent border-0 outline-none resize-none"
                    style={{ color: '#495057' }}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  // ============================================================
  // SECTION 8.3 — Rapport d'évacuation
  // ============================================================

  const render8_3 = () => {
    const update = (field: keyof EvacuationReport, value: string) => {
      setSection8_3(prev => ({ ...prev, [field]: value }));
      markDirty();
    };

    const Field = ({ label, field, type = 'text', full = false }: {
      label: string; field: keyof EvacuationReport; type?: string; full?: boolean;
    }) => (
      <div className={full ? 'col-span-2' : ''}>
        <label className="block text-xs font-semibold mb-1 uppercase tracking-wide" style={{ color: '#6C757D' }}>
          {label}
        </label>
        {type === 'textarea' ? (
          <textarea
            value={section8_3[field]}
            onChange={e => update(field, e.target.value)}
            rows={3}
            className="w-full px-3 py-2 text-sm rounded"
            style={{ border: '1px solid #DEE2E6', color: '#2C3E50', backgroundColor: '#FFFFFF', outline: 'none', resize: 'vertical' }}
          />
        ) : (
          <input
            type={type}
            value={section8_3[field]}
            onChange={e => update(field, e.target.value)}
            className="w-full px-3 py-2 text-sm rounded"
            style={{ border: '1px solid #DEE2E6', color: '#2C3E50', backgroundColor: '#FFFFFF', outline: 'none' }}
          />
        )}
      </div>
    );

    const typeOptions = isFr
      ? ['Exercice d\'évacuation', 'Évacuation non-fondée', 'Évacuation fondée']
      : ['Evacuation drill', 'Unfounded evacuation', 'Founded evacuation'];

    return (
      <div>
        <SectionHeader sectionId="8.3" title={currentSectionMeta.title} />
        <div className="rounded-md p-6" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E9ECEF' }}>
          <div className="grid grid-cols-2 gap-4">
            <Field label={isFr ? 'Adresse de l\'événement' : 'Event address'} field="adresse" full />
            <Field label={isFr ? 'Téléphone contact' : 'Contact phone'} field="telephoneContact" />
            <Field label={isFr ? 'Date de l\'événement' : 'Event date'} field="dateEvenement" type="date" />
            <Field label={isFr ? 'Heure' : 'Time'} field="heure" type="time" />
            <Field label={isFr ? 'Coordonnateur d\'urgence' : 'Emergency coordinator'} field="coordonnateurUrgence" full />
            <div className="col-span-2">
              <label className="block text-xs font-semibold mb-2 uppercase tracking-wide" style={{ color: '#6C757D' }}>
                {isFr ? 'Type d\'événement' : 'Event type'}
              </label>
              <div className="flex gap-6">
                {typeOptions.map(opt => (
                  <label key={opt} className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="typeEvenement"
                      checked={section8_3.typeEvenement === opt}
                      onChange={() => update('typeEvenement', opt)}
                      style={{ accentColor: '#C0392B' }} />
                    <span className="text-sm" style={{ color: '#495057' }}>{opt}</span>
                  </label>
                ))}
              </div>
            </div>
            <Field label={isFr ? 'Cause' : 'Cause'} field="cause" full />
            <Field label={isFr ? 'Heure de déclenchement' : 'Trigger time'} field="heureDeClenchement" type="time" />
            <Field label={isFr ? 'Temps pour l\'évacuation complète' : 'Total evacuation time'} field="tempsEvacuationComplete" />
            <Field label={isFr ? 'Déroulement' : 'Course of events'} field="deroulement" type="textarea" full />
            <Field label={isFr ? 'Recommandation' : 'Recommendation'} field="recommandation" type="textarea" full />
            <Field label={isFr ? 'Signature du responsable du PMU' : 'Emergency plan manager signature'} field="signatureResponsable" />
            <Field label={isFr ? 'Date' : 'Date'} field="dateSignature" type="date" />
          </div>
        </div>
      </div>
    );
  };

  // ============================================================
  // SECTION 8.4 — Inspections et surveillances
  // ============================================================

  const render8_4 = () => (
    <div>
      <SectionHeader sectionId="8.4" title={currentSectionMeta.title} />
      <div className="rounded overflow-hidden shadow-sm" style={{ border: '1px solid #DEE2E6' }}>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr style={{ backgroundColor: '#2C3E50' }}>
              {(isFr
                ? ['ÉQUIPEMENT', 'CODE / NORME / RÈGLEMENT', 'ARTICLE', 'OBSERVATIONS']
                : ['EQUIPMENT', 'CODE / STANDARD / REGULATION', 'ARTICLE', 'OBSERVATIONS']
              ).map((col, i) => (
                <th key={col} className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wide"
                  style={{
                    color: '#FFFFFF', border: '1px solid #4A6278',
                    width: i === 0 ? '30%' : i === 1 ? '22%' : i === 2 ? '13%' : '35%',
                  }}>
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {section8_4.map((row, idx) => (
              <tr key={row.id} style={{ backgroundColor: idx % 2 === 0 ? '#FFFFFF' : '#F8F9FA' }}>
                <td className="px-3 py-2 text-xs font-semibold" style={{ border: '1px solid #DEE2E6', color: '#2C3E50' }}>
                  {row.equipement}
                </td>
                <td className="px-3 py-2 text-xs" style={{ border: '1px solid #DEE2E6', color: '#495057' }}>
                  {row.codeNorme}
                </td>
                <td className="px-3 py-2 text-xs font-mono" style={{ border: '1px solid #DEE2E6', color: '#6C757D' }}>
                  {row.article}
                </td>
                <td style={{ border: '1px solid #DEE2E6', padding: '2px 4px' }}>
                  <input
                    type="text"
                    value={row.observations}
                    onChange={e => {
                      setSection8_4(section8_4.map(r => r.id === row.id ? { ...r, observations: e.target.value } : r));
                      markDirty();
                    }}
                    placeholder="Observations..."
                    className="w-full px-2 py-1 text-xs bg-transparent border-0 outline-none"
                    style={{ color: '#495057' }}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  // ============================================================
  // SECTION 8.5 — Registre d'évacuation par secteurs
  // ============================================================

  const render8_5 = () => (
    <div>
      <SectionHeader sectionId="8.5" title={currentSectionMeta.title} />
      <div className="rounded overflow-hidden shadow-sm" style={{ border: '1px solid #DEE2E6' }}>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr style={{ backgroundColor: '#C0392B' }}>
              {(isFr
                ? ['ÉTAGE / SECTEUR', 'ÉVACUÉ?', 'AUTRES INFORMATIONS (personne manquante, danger imminent, individu blessé)']
                : ['FLOOR / SECTOR', 'EVACUATED?', 'OTHER INFORMATION (missing person, imminent danger, injured person)']
              ).map((col, i) => (
                <th key={col} className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wide"
                  style={{
                    color: '#FFFFFF', border: '1px solid #E74C3C',
                    width: i === 0 ? '18%' : i === 1 ? '12%' : '70%',
                  }}>
                  {col}
                </th>
              ))}
              <th style={{ border: '1px solid #E74C3C', width: '40px' }} />
            </tr>
          </thead>
          <tbody>
            {section8_5.map((row, idx) => (
              <tr key={row.id} className="group"
                style={{ backgroundColor: idx % 2 === 0 ? '#FFFFFF' : '#F8F9FA' }}>
                <td className="px-3 py-2 text-sm font-bold text-center"
                  style={{ border: '1px solid #DEE2E6', color: '#2C3E50' }}>
                  {row.etage}
                </td>
                <td className="text-center" style={{ border: '1px solid #DEE2E6' }}>
                  <input
                    type="checkbox"
                    checked={row.evacue}
                    onChange={e => {
                      setSection8_5(section8_5.map(r => r.id === row.id ? { ...r, evacue: e.target.checked } : r));
                      markDirty();
                    }}
                    style={{ accentColor: '#C0392B', width: '16px', height: '16px' }}
                  />
                </td>
                <td style={{ border: '1px solid #DEE2E6', padding: '2px 4px' }}>
                  <input
                    type="text"
                    value={row.notes}
                    onChange={e => {
                      setSection8_5(section8_5.map(r => r.id === row.id ? { ...r, notes: e.target.value } : r));
                      markDirty();
                    }}
                    className="w-full px-2 py-1 text-sm bg-transparent border-0 outline-none"
                    style={{ color: '#495057' }}
                  />
                </td>
                <td style={{ border: '1px solid #DEE2E6', textAlign: 'center' }}>
                  <button
                    onClick={() => { setSection8_5(section8_5.filter(r => r.id !== row.id)); markDirty(); }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded"
                    style={{ color: '#C0392B' }}
                  >
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <AddRowButton label={t.addRow} onClick={() => {
        setSection8_5([...section8_5, { id: uid(), etage: String(section8_5.length + 1), evacue: false, notes: '' }]);
        markDirty();
      }} />
    </div>
  );

  // ============================================================
  // RENDU ACTIF
  // ============================================================

  const renderActiveSection = () => {
    switch (activeSection) {
      case '8.1': return render8_1();
      case '8.2': return render8_2();
      case '8.3': return render8_3();
      case '8.4': return render8_4();
      case '8.5': return render8_5();
      case '8.6': return <TextSection sectionId="8.6" title={currentSectionMeta.title} value={section8_6} setValue={setSection8_6} markDirty={markDirty} language={language} />;
      case '8.7': return <TextSection sectionId="8.7" title={currentSectionMeta.title} value={section8_7} setValue={setSection8_7} markDirty={markDirty} language={language} />;
      case '8.8': return <TextSection sectionId="8.8" title={currentSectionMeta.title} value={section8_8} setValue={setSection8_8} markDirty={markDirty} language={language} />;
      case '8.9': return <TextSection sectionId="8.9" title={currentSectionMeta.title} value={section8_9} setValue={setSection8_9} markDirty={markDirty} language={language} />;
      case '8.10': return <Module8Section10 data={section8_10} onChange={setSection8_10} markDirty={markDirty} language={language} />;
      default: return null;
    }
  };

  // ============================================================
  // RENDU PRINCIPAL
  // ============================================================

  if (loadingData) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-16 flex items-center justify-center">
        <span className="text-sm animate-pulse" style={{ color: '#ADB5BD' }}>{t.loading}</span>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">

      {/* En-tête */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: '#ADB5BD' }}>
            Module 8
          </p>
          <h1 className="text-3xl font-black uppercase" style={{ color: '#2C3E50' }}>{t.module}</h1>
          <div className="h-1 w-16 mt-2" style={{ backgroundColor: '#C0392B' }} />
        </div>

        {/* Indicateur autosave */}
        <div className="text-xs">
          {saving && (
            <span className="flex items-center gap-1.5" style={{ color: '#2980B9' }}>
              <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: '#2980B9' }} />
              {t.saving}
            </span>
          )}
          {!saving && lastSaved && !isDirty && (
            <span className="flex items-center gap-1.5" style={{ color: '#27AE60' }}>
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#27AE60' }} />
              {t.saved} — {lastSaved.toLocaleTimeString()}
            </span>
          )}
          {!saving && isDirty && (
            <span className="flex items-center gap-1.5" style={{ color: '#E67E22' }}>
              <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: '#E67E22' }} />
              {t.unsaved}
            </span>
          )}
        </div>
      </div>

      {/* Navigation sous-sections */}
      <div className="flex flex-wrap gap-2 mb-8 pb-4" style={{ borderBottom: '1px solid #E9ECEF' }}>
        {t.sections.map(s => (
          <button
            key={s.id}
            onClick={() => setActiveSection(s.id)}
            className="px-3 py-1.5 rounded text-xs font-medium transition-colors"
            style={{
              backgroundColor: activeSection === s.id ? '#C0392B' : '#F8F9FA',
              color:           activeSection === s.id ? '#FFFFFF'  : '#6C757D',
              border:          activeSection === s.id ? '1px solid #C0392B' : '1px solid #DEE2E6',
            }}
          >
            {s.id}
          </button>
        ))}
      </div>

      {/* Contenu actif */}
      {renderActiveSection()}

    </div>
  );
}
