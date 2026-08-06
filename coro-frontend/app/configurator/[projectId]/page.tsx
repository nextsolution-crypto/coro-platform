'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';
import api from '@/lib/api';
import MapPicker from '@/components/MapPicker';

interface SchemaField {
  key: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'boolean' | 'checkbox_group' | 'date' | 'time';
  options?: string[];
  checkboxOptions?: string[];
}

interface Field {
  key: string;
  label: string;
  type: 'boolean' | 'text' | 'number' | 'select' | 'dynamic_list' | 'checkbox_group' | 'date' | 'schedule_grid';
  options?: string[];
  checkboxOptions?: string[];
  schema?: SchemaField[];
  tooltip?: string;
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

const validationStyles: Record<string, { bg: string; text: string; border: string; icon: string }> = {
  INFO:           { bg: '#EBF5FB', text: '#2980B9', border: '#AED6F1', icon: 'ℹ' },
  RECOMMANDATION: { bg: '#F4ECF7', text: '#8E44AD', border: '#D2B4DE', icon: '💡' },
  AVERTISSEMENT:  { bg: '#FEF9E7', text: '#F39C12', border: '#FAD7A0', icon: '⚠' },
  ERREUR:         { bg: '#FDEDEC', text: '#C0392B', border: '#F1948A', icon: '✖' },
  CRITIQUE:       { bg: '#FADBD8', text: '#922B21', border: '#F1948A', icon: '🚨' },
};

// ── Normalisation province ───────────────────────────────────

function normalizeProvince(raw: string): string {
  const v = raw.trim().toLowerCase();
  if (v === 'qc' || v === 'québec' || v === 'quebec') return 'Quebec';
  if (v === 'on' || v === 'ontario') return 'Ontario';
  if (v === 'ab' || v === 'alberta') return 'Alberta';
  return raw; // valeur inconnue, laissée telle quelle (le select affichera vide)
}

// ── DynamicListEditor ────────────────────────────────────────

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
    const newItems = [...items, initItem()];
    onChange(newItems);
    setExpandedIdx(newItems.length - 1);
  };

  const handleUpdate = (idx: number, key: string, value: any) => {
    const updated = [...items];
    updated[idx] = { ...updated[idx], [key]: value };
    onChange(updated);
  };

  const handleDelete = (idx: number) => {
    onChange(items.filter((_, i) => i !== idx));
    if (expandedIdx === idx) setExpandedIdx(null);
    else if (expandedIdx !== null && expandedIdx > idx) setExpandedIdx(expandedIdx - 1);
  };

  const getSummary = (item: any) =>
    schema.filter(sf => item[sf.key] && item[sf.key] !== '' && item[sf.key] !== false && item[sf.key] !== 0)
      .map(sf => sf.type === 'boolean' ? (item[sf.key] ? sf.label : null) : item[sf.key])
      .filter(Boolean).join(' — ');

  const inputCls = "w-full rounded px-3 py-2 text-sm focus:outline-none";
  const inputSty = { border: '1px solid #CED4DA', color: '#2C3E50', backgroundColor: '#FFFFFF' };

  return (
    <div className="space-y-2">
      {items.map((item, idx) => (
        <div key={idx} className="rounded overflow-hidden"
          style={{ border: '1px solid #DEE2E6', backgroundColor: '#FFFFFF' }}>
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
              <span className="text-white text-xs font-bold w-6 h-6 rounded flex items-center
                justify-center flex-shrink-0"
                style={{ backgroundColor: '#C0392B' }}>
                {idx + 1}
              </span>
              <span className="text-sm truncate max-w-xs" style={{ color: '#495057' }}>
                {getSummary(item) || 'Nouveau — cliquer pour modifier'}
              </span>
            </div>
            <div className="flex gap-3 flex-shrink-0">
              <button onClick={() => setExpandedIdx(expandedIdx === idx ? null : idx)}
                className="text-xs font-medium transition-colors"
                style={{ color: '#2980B9' }}>
                {expandedIdx === idx ? 'Fermer' : 'Modifier'}
              </button>
              <button onClick={() => handleDelete(idx)}
                className="text-xs font-medium transition-colors"
                style={{ color: '#C0392B' }}>
                Supprimer
              </button>
            </div>
          </div>

          {expandedIdx === idx && (
            <div className="px-4 py-4 space-y-3"
              style={{ borderTop: '1px solid #E9ECEF', backgroundColor: '#F8F9FA' }}>
              {schema.map(sf => (
                <div key={sf.key}>
                  <label className="text-xs font-medium mb-1.5 block"
                    style={{ color: '#495057' }}>{sf.label}</label>
                  {sf.type === 'select' && (
                    <select value={item[sf.key] || ''}
                      onChange={e => handleUpdate(idx, sf.key, e.target.value)}
                      className={inputCls} style={inputSty}>
                      <option value="">Sélectionner...</option>
                      {sf.options?.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  )}
                  {sf.type === 'text' && sf.key === 'lieu' && (
                    <textarea value={item[sf.key] || ''}
                      onChange={e => handleUpdate(idx, sf.key, e.target.value)}
                      rows={3}
                      className={inputCls} style={{ ...inputSty, resize: 'vertical' }}
                      placeholder="Ex: SS1, SS2&#10;Rampe d'accès&#10;Étages RDC au 12ème" />
                  )}
                  {sf.type === 'text' && sf.key !== 'lieu' && (
                    <input type="text" value={item[sf.key] || ''}
                      onChange={e => handleUpdate(idx, sf.key, e.target.value)}
                      className={inputCls} style={inputSty}
                      placeholder="Entrer une valeur..." />
                  )}
                  {sf.type === 'date' && (
                    <input type="date" value={item[sf.key] || ''}
                      onChange={e => handleUpdate(idx, sf.key, e.target.value)}
                      className={inputCls} style={inputSty} />
                  )}

                  {sf.type === 'time' && (
                    <input type="time" value={item[sf.key] || ''}
                      onChange={e => handleUpdate(idx, sf.key, e.target.value)}
                      className={inputCls} style={inputSty} />
                  )}

                  {sf.type === 'number' && (
                    <input type="number" value={item[sf.key] === 0 ? '' : item[sf.key]}
                      onChange={e => handleUpdate(idx, sf.key, e.target.value === '' ? 0 : parseInt(e.target.value))}
                      className={inputCls} style={inputSty} />
                  )}

                  {sf.type === 'boolean' && (
                    <div className="flex gap-2">
                      {[true, false].map(val => (
                        <button key={String(val)}
                          onClick={() => handleUpdate(idx, sf.key, val)}
                          className="flex-1 py-1.5 rounded text-xs font-medium transition-colors"
                          style={{
                            backgroundColor: item[sf.key] === val
                              ? (val ? '#EAFAF1' : '#FDEDEC')
                              : '#F8F9FA',
                            color: item[sf.key] === val
                              ? (val ? '#27AE60' : '#C0392B')
                              : '#6C757D',
                            border: `1px solid ${item[sf.key] === val
                              ? (val ? '#A9DFBF' : '#F1948A')
                              : '#DEE2E6'}`,
                          }}>
                          {val ? 'Oui' : 'Non'}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
      <button onClick={handleAdd}
        className="w-full text-sm py-3 rounded transition-all flex items-center
          justify-center gap-2 font-medium"
        style={{
          border: '2px dashed #F1948A',
          color: '#C0392B',
          backgroundColor: 'transparent',
        }}
        onMouseEnter={e => e.currentTarget.style.backgroundColor = '#FDEDEC'}
        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
      >
        + Ajouter un élément
      </button>
    </div>
  );
}

// ── CheckboxGroupField ───────────────────────────────────────

function CheckboxGroupField({ field, value, onChange }: {
  field: Field;
  value: string[];
  onChange: (value: string[]) => void;
}) {
  const toggle = (opt: string) =>
    onChange(value.includes(opt) ? value.filter(v => v !== opt) : [...value, opt]);

  return (
    <div className="grid grid-cols-2 gap-2">
      {field.checkboxOptions?.map(opt => {
        const checked = value.includes(opt);
        return (
          <label key={opt}
            className="flex items-center gap-2.5 p-2.5 rounded cursor-pointer
              transition-colors"
            style={{
              backgroundColor: checked ? '#FDEDEC' : '#F8F9FA',
              border: `1px solid ${checked ? '#F1948A' : '#DEE2E6'}`,
            }}
            onClick={() => toggle(opt)}
          >
            <div className="w-4 h-4 rounded border-2 flex items-center justify-center
              flex-shrink-0 transition-colors"
              style={{
                backgroundColor: checked ? '#C0392B' : '#FFFFFF',
                borderColor: checked ? '#C0392B' : '#CED4DA',
              }}>
              {checked && <span className="text-white text-xs font-bold">✓</span>}
            </div>
            <span className="text-xs font-medium"
              style={{ color: checked ? '#C0392B' : '#495057' }}>
              {opt}
            </span>
          </label>
        );
      })}
    </div>
  );
}

// ── ScheduleGrid ─────────────────────────────────────────────

interface ScheduleCell { heure: string; occupants: string; }
interface ScheduleData {
  jour:  { semaine: ScheduleCell; samedi: ScheduleCell; dimanche: ScheduleCell };
  soir:  { semaine: ScheduleCell; samedi: ScheduleCell; dimanche: ScheduleCell };
  nuit:  { semaine: ScheduleCell; samedi: ScheduleCell; dimanche: ScheduleCell };
}

const emptyCell = (): ScheduleCell => ({ heure: '', occupants: '' });
const defaultSchedule = (): ScheduleData => ({
  jour:  { semaine: emptyCell(), samedi: emptyCell(), dimanche: emptyCell() },
  soir:  { semaine: emptyCell(), samedi: emptyCell(), dimanche: emptyCell() },
  nuit:  { semaine: emptyCell(), samedi: emptyCell(), dimanche: emptyCell() },
});

function ScheduleGrid({ value, onChange }: {
  value: ScheduleData;
  onChange: (value: ScheduleData) => void;
}) {
  const data = value && value.jour ? value : defaultSchedule();

  const rows: { key: 'jour' | 'soir' | 'nuit'; label: string }[] = [
    { key: 'jour', label: 'Jour (6h00 – 18h00)' },
    { key: 'soir', label: 'Soir (18h00 – 24h00)' },
    { key: 'nuit', label: 'Nuit (00h00 – 06h00)' },
  ];
  const cols: { key: 'semaine' | 'samedi' | 'dimanche'; label: string }[] = [
    { key: 'semaine', label: 'Semaine' },
    { key: 'samedi', label: 'Samedi' },
    { key: 'dimanche', label: 'Dimanche' },
  ];

  const updateCell = (rowKey: 'jour' | 'soir' | 'nuit', colKey: 'semaine' | 'samedi' | 'dimanche', field: 'heure' | 'occupants', val: string) => {
    onChange({
      ...data,
      [rowKey]: {
        ...data[rowKey],
        [colKey]: { ...data[rowKey][colKey], [field]: val },
      },
    });
  };

  const cellInputStyle = {
    width: '100%',
    border: '1px solid #DEE2E6',
    borderRadius: '4px',
    padding: '4px 6px',
    fontSize: '12px',
    color: '#2C3E50',
    backgroundColor: '#FFFFFF',
    marginBottom: '4px',
  };

  return (
    <div className="overflow-x-auto rounded" style={{ border: '1px solid #DEE2E6' }}>
      <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ backgroundColor: '#F8F9FA' }}>
            <th className="px-3 py-2 text-left font-semibold" style={{ border: '1px solid #E9ECEF', color: '#495057' }}>
              Quart de travail
            </th>
            {cols.map(c => (
              <th key={c.key} className="px-3 py-2 text-center font-semibold" style={{ border: '1px solid #E9ECEF', color: '#495057' }}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.key}>
              <td className="px-3 py-2 font-medium" style={{ border: '1px solid #E9ECEF', color: '#2C3E50' }}>
                {r.label}
              </td>
              {cols.map(c => (
                <td key={c.key} className="px-2 py-2" style={{ border: '1px solid #E9ECEF' }}>
                  <input type="text" placeholder="Heure (ex: 6h-18h)"
                    value={data[r.key][c.key].heure}
                    onChange={e => updateCell(r.key, c.key, 'heure', e.target.value)}
                    style={cellInputStyle} />
                  <input type="number" placeholder="Nb occupants"
                    value={data[r.key][c.key].occupants}
                    onChange={e => updateCell(r.key, c.key, 'occupants', e.target.value)}
                    style={cellInputStyle} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── PAGE PRINCIPALE ──────────────────────────────────────────

export default function ConfiguratorPage() {
  const router    = useRouter();
  const params    = useParams();
  const projectId = params.projectId as string;
  const { isAuthenticated, initAuth } = useAuthStore();

  const [sections,      setSections]      = useState<Section[]>([]);
  const [activeSection, setActiveSection] = useState(0);
  const [config,        setConfig]        = useState<Record<string, any>>({});
  const [lists,         setLists]         = useState<Record<string, any[]>>({});
  const [analysis,      setAnalysis]      = useState<AnalysisResult | null>(null);
  const [loading,       setLoading]       = useState(true);
  const [analyzing,     setAnalyzing]     = useState(false);
  const [saving,        setSaving]        = useState(false);
  const [saved,         setSaved]         = useState(false);
  const [projectName,   setProjectName]   = useState('');
  const [buildingAddress, setBuildingAddress] = useState('');
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ fieldsFound: number } | null>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { initAuth(); }, []);

  useEffect(() => {
    if (isAuthenticated) fetchData();
    else {
      const token = localStorage.getItem('coro_token');
      if (!token) router.push('/login');
    }
  }, [isAuthenticated]);

  const fetchData = async () => {
    try {
      const [questionsRes, projectRes, savedConfigRes] = await Promise.all([
        api.get('/configurator/questions'),
        api.get(`/projects/${projectId}`),
        api.get(`/configurator/load/${projectId}`).catch(() => ({ data: {} })),
      ]);
      setSections(questionsRes.data.sections);
      const usageField = questionsRes.data.sections
        .flatMap((s: Section) => s.fields)
        .find((f: Field) => f.key === 'usagePrincipal');
      setProjectName(projectRes.data.name);

      const b = projectRes.data.building;
      if (b) setBuildingAddress(`${b.address || ''}, ${b.city || ''}, ${b.province || ''}, Canada`);

      const savedConfig = savedConfigRes.data || {};

      // Pré-remplit les champs déjà connus depuis la fiche bâtiment, si pas encore configurés
      const building = projectRes.data.building;
      if (building) {
        if (!savedConfig.buildingType && building.buildingType) {
          savedConfig.buildingType = building.buildingType;
        }
        if (!savedConfig.province && building.province) {
          savedConfig.province = normalizeProvince(building.province);
        }
        if (!savedConfig.ville && building.city) {
          savedConfig.ville = building.city;
        }
        if (!savedConfig.responsableNom && building.responsableNom) {
          savedConfig.responsableNom = building.responsableNom;
        }
        if (!savedConfig.responsableTitre && building.responsableTitre) {
          savedConfig.responsableTitre = building.responsableTitre;
        }
        if (!savedConfig.floors && building.floors) {
          savedConfig.floors = building.floors;
        }
      }

      const defaults: Record<string, any> = {};
      const defaultLists: Record<string, any[]> = {};
      questionsRes.data.sections.forEach((s: Section) => {
        s.fields.forEach((f: Field) => {
          if (f.type === 'dynamic_list') {
            defaultLists[f.key] = savedConfig[f.key] !== undefined ? savedConfig[f.key] : [];
          } else if (f.type === 'boolean') {
            defaults[f.key] = savedConfig[f.key] !== undefined ? savedConfig[f.key] : false;
          } else if (f.type === 'number') {
            defaults[f.key] = savedConfig[f.key] !== undefined ? savedConfig[f.key] : 0;
          } else if (f.type === 'checkbox_group') {
            defaults[f.key] = savedConfig[f.key] !== undefined ? savedConfig[f.key] : [];
          } else {
            defaults[f.key] = savedConfig[f.key] !== undefined ? savedConfig[f.key] : '';
          }
        });
      });
      // Récupérer les coords et snapshots des cartes
      const mapKeys = ['pointRassemblement', 'pointRassemblement2', 'lieuAccueilTemporaire'];
      mapKeys.forEach(key => {
        if (savedConfig[`${key}_coords`]) defaults[`${key}_coords`] = savedConfig[`${key}_coords`];
        if (savedConfig[`${key}_snapshot`]) defaults[`${key}_snapshot`] = savedConfig[`${key}_snapshot`];
      });
      setConfig(defaults);
      setLists(defaultLists);

      if (Object.keys(savedConfig).length > 0) {
        triggerAnalysis(defaults, defaultLists);
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const triggerAnalysis = async (newConfig: Record<string, any>, newLists: Record<string, any[]>) => {
    setAnalyzing(true);
    try {
      const res = await api.post('/configurator/analyze', { ...newConfig, ...newLists });
      setAnalysis(res.data);
    } catch (err) { console.error(err); }
    finally { setAnalyzing(false); }
  };

  const formatPhone = (value: string): string => {
    const digits = value.replace(/\D/g, '');
    
    if (digits.length === 11 && digits.startsWith('1')) {
      const d = digits.substring(1);
      return `1 (${d.substring(0, 3)}) ${d.substring(3, 6)}-${d.substring(6)}`;
    }
    
    if (digits.length === 10) {
      return `(${digits.substring(0, 3)}) ${digits.substring(3, 6)}-${digits.substring(6)}`;
    }
    
    const d = digits.substring(0, 11);
    if (d.length === 0) return '';
    if (d.startsWith('1')) {
      if (d.length <= 1) return '1';
      if (d.length <= 4) return `1 (${d.substring(1)}`;
      if (d.length <= 7) return `1 (${d.substring(1, 4)}) ${d.substring(4)}`;
      if (d.length <= 11) return `1 (${d.substring(1, 4)}) ${d.substring(4, 7)}-${d.substring(7)}`;
    }
    if (d.length <= 3) return `(${d}`;
    if (d.length <= 6) return `(${d.substring(0, 3)}) ${d.substring(3)}`;
    return `(${d.substring(0, 3)}) ${d.substring(3, 6)}-${d.substring(6, 10)}`;
  };

  const phoneKeys = ['centraleTelephone'];

  const updateConfig = (key: string, value: any) => {
    const formatted = phoneKeys.includes(key) && typeof value === 'string' ? formatPhone(value) : value;
    const newConfig = { ...config, [key]: formatted };
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
      const payload = { ...config, ...lists };
      await api.post(`/configurator/save/${projectId}`, payload);
      localStorage.setItem(`coro_config_${projectId}`, JSON.stringify(payload));
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) { console.error(err); }
    finally { setSaving(false); }
  };

  const handleImportWord = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        try {
          const base64 = ev.target?.result as string;
          const res = await api.post('/configurator/import-word', { base64 });
          const { config: importedConfig, fieldsFound } = res.data;

          const newConfig = { ...config };
          const newLists = { ...lists };

          Object.entries(importedConfig).forEach(([key, value]) => {
            if (Array.isArray(value)) {
              newLists[key] = value as any[];
            } else {
              newConfig[key] = value;
            }
          });

          // Normaliser usagePrincipal
          if (newConfig.usagePrincipal) {
            const usageOptions = [
              'A1 - Etablissements de reunion - Spectacle',
              'A2 - Etablissements de reunion - Education, culte, divertissement, restauration',
              'A3 - Etablissements de reunion de type arena',
              'A4 - Etablissements de reunion en plein air',
              'B1 - Etablissements de detention',
              'B2 - Etablissements de traitement',
              'B3 - Etablissements de soins',
              'C - Etablissements d habitation',
              'D - Etablissements d affaires',
              'E - Etablissements commerciaux',
              'F1 - Etablissement industriel a risques tres eleves',
              'F2 - Etablissement industriel a risques moyens',
              'F3 - Etablissement industriel a risques faibles',
            ];
            const normalize = (s: string) => s.toLowerCase()
              .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
              .replace(/s\b/g, '')
              .replace(/[^a-z0-9]/g, '');
            const match = usageOptions.find(opt =>
              normalize(opt) === normalize(newConfig.usagePrincipal)
            );
            if (match) newConfig.usagePrincipal = match;
          }

          setConfig(newConfig);
          setLists(newLists);
          setImportResult({ fieldsFound });
          
          // Sauvegarder aussi dans localStorage comme le fait handleSave
          const projectIdStr = projectId as string;
          const storageKey = `coro_config_${projectIdStr}`;
          const stored = JSON.parse(localStorage.getItem(storageKey) || '{}');
          localStorage.setItem(storageKey, JSON.stringify({ ...stored, ...newConfig }));
          
          triggerAnalysis(newConfig, newLists);

          if (importInputRef.current) importInputRef.current.value = '';
        } catch (err) {
          console.error(err);
          alert('Erreur lors de l\'import du document.');
        } finally {
          setImporting(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error(err);
      setImporting(false);
    }
  };

  const isFieldVisible = (field: Field): boolean => {
    if (field.key === 'zoneConfinement' || field.key === 'zoneRafraichissement') return config['certBOMA'] === true;
    if (field.key === 'certBOMANiveau') return config['certBOMA'] === true;
    if (field.key === 'certLEEDNiveau') return config['certLEED'] === true;
    if (field.key === 'nbLocataires') return config['multiLocataires'] === true;
    if (field.key === 'panneauAnnonciateurLieu') return config['panneauAnnonciateurDistance'] === true;
    if (field.key === 'heuresFonctionnement') return config['panneauType'] === 'DOUBLE';
    if (['centraleSurveillance','centraleTelephone','centraleCodeClient'].includes(field.key)) return config['teleSurveillance'] === true;
    if (['nbAscenseurs','typeAscenseur','salleAscenseur','ascenseurPompier','rappelAscenseursLieu','telephoneAscenseurs','fonctionneSecours'].includes(field.key)) return config['ascenseurs'] === true;
    if (field.key === 'ascenseurPompierLequel') return config['ascenseurPompier'] === true;
    if (['gicleursSystemes','salleGicleurs','pompeIncendie','pompeIncendieLieu','gapmUsgpm','boyauIncendie','boyauCabinet','priseRefoulement','raccordPompier','raccordPompierLieu','bornesFontaine','bornesFontaineLieu','vannesIsolement','vannesIsolementLieu','valve2_5','valve2_5Lieu','valve1_5','valve1_5Lieu'].includes(field.key)) return config['gicleurs'] === true;
    if (field.key === 'valve2_5Lieu') return config['gicleurs'] === true && config['valve2_5'] === true;
    if (field.key === 'valve1_5Lieu') return config['gicleurs'] === true && config['valve1_5'] === true;
    if (field.key === 'extincteursList') return config['extincteurPortatif'] === true;
    if (field.key === 'systemeExtinctionFixeLieu') return config['systemeExtinctionFixe'] === true;
    if (field.key === 'systemePreActionLieu') return config['systemePreAction'] === true;
    if (field.key === 'systemeHalogenLieu') return config['systemeHalogen'] === true;
    if (field.key === 'systemeCO2Lieu') return config['systemeCO2'] === true;
    if (['cvacType','cvacLocalisation'].includes(field.key)) return config['cvac'] === true;
    if (field.key === 'desenfumageLieu') return config['desenfumage'] === true;
    if (['nbGeneratrices','generatriceNom','generatriceLieu','generatriceCarburant','autonomieGeneratrice','capaciteReservoir','reservoirsAuxiliaires','generatriceEquipements','generatriceEquipementsPersonnalises'].includes(field.key)) return config['generatrice'] === true;
    if (['reservoirsAuxiliairesLieu','reservoirsAuxiliairesCapacite','autonomieTotale'].includes(field.key)) return config['generatrice'] === true && config['reservoirsAuxiliaires'] === true;
    if (['generatriceEquipementsPersonnalises'].includes(field.key)) return config['generatrice'] === true;
    if (field.key === 'trousseDeversementListe') return config['trousseDeversement'] === true;
    if (field.key === 'trousseClesPompierLieu') return config['trousseClesPompier'] === true;
    if (field.key === 'compacteurGicleurs') return config['compacteur'] === true;
    if (['compacteurGicleursType','compacteurVanneIsolement'].includes(field.key)) return config['compacteur'] === true && config['compacteurGicleurs'] === true;
    if (field.key === 'pompeIncendieLieu') return config['pompeIncendie'] === true;
    if (field.key === 'gazNaturelLieu') return config['gazNaturel'] === true;
    if (field.key === 'propaneLieu') return config['propane'] === true;
    if (['detecteurCOSeuil1','detecteurCOSeuil2','detecteurCOLieu'].includes(field.key)) return config['detecteurCO'] === true;
    if (field.key === 'detecteurGazNaturelLieu') return config['detecteurGazNaturel'] === true;
    if (['detecteurAmmoniacSeuil1','detecteurAmmoniacSeuil2'].includes(field.key)) return config['detecteurAmmoniac'] === true;
    if (field.key === 'matieresList') return config['matieresDangereuses'] === true;
    if (field.key === 'trousseDeversementLieu') return config['trousseDeversement'] === true;
    if (['chariotsElevateursBatterie','chariotsElevateursLieu'].includes(field.key)) return config['chariotsElevateurs'] === true;
    if (field.key === 'mezzanineLieu') return config['mezzanine'] === true;
    if (field.key === 'procesDangereuxDesc') return config['procesDangereux'] === true;
    if (field.key === 'espaceClosLieu') return config['espaceClos'] === true;
    if (['systemePhonicType','messagesAutomatises'].includes(field.key)) return config['systemePhonic'] === true;
    if (field.key === 'nbRadios') return config['radiosCommunication'] === true;
    if (field.key === 'accesSousSolDetails') return (config['accesSousSol'] || []).length > 0;
    if (field.key === 'accesEtagesDetails') return (config['accesEtages'] || []).length > 0;
    if (field.key === 'infosBatiment') return config['treizeEtage'] === true;
    return true;
  };

  const currentSection  = sections[activeSection];
  const visibleFields   = currentSection ? currentSection.fields.filter(isFieldVisible) : [];
  const completedFields = visibleFields.filter(f => {
    if (f.type === 'dynamic_list')   return (lists[f.key] || []).length > 0;
    if (f.type === 'checkbox_group') return (config[f.key] || []).length > 0;
    if (f.type === 'boolean')        return config[f.key] === true;
    return config[f.key] !== '' && config[f.key] !== 0;
  }).length;

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center"
      style={{ backgroundColor: '#F8F9FA' }}>
      <p className="text-sm animate-pulse" style={{ color: '#ADB5BD' }}>
        Chargement du configurateur...
      </p>
    </div>
  );

  const inputCls = "w-full rounded px-3 py-2.5 text-sm focus:outline-none";
  const inputSty = { border: '1px solid #CED4DA', color: '#2C3E50', backgroundColor: '#FFFFFF' };

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F8F9FA' }}>

      {/* Topbar */}
      <div className="flex items-center justify-between px-6 py-4 sticky top-0 z-40"
        style={{
          backgroundColor: '#FFFFFF',
          borderBottom: '1px solid #DEE2E6',
          boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        }}>
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold cursor-pointer" style={{ color: '#2C3E50' }}
            onClick={() => router.push('/dashboard')}>
            CO<span style={{ color: '#C0392B' }}>RO</span>
          </h1>
          <span style={{ color: '#DEE2E6' }}>|</span>
          <span className="text-sm" style={{ color: '#6C757D' }}>Configurateur</span>
          <span style={{ color: '#DEE2E6' }}>|</span>
          <span className="text-sm font-medium" style={{ color: '#C0392B' }}>
            {projectName}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <input
            ref={importInputRef}
            type="file"
            accept=".docx"
            onChange={handleImportWord}
            className="hidden"
          />
          {analysis && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded"
              style={{ backgroundColor: '#F8F9FA', border: '1px solid #E9ECEF' }}>
              <span className="text-xs" title="Mesure la conformité réglementaire de votre configuration — pas le pourcentage de champs remplis" style={{ color: '#6C757D', cursor: 'help' }}>Conformité ⓘ</span>
              <span className="font-bold text-base" style={{
                color: analysis.score >= 80 ? '#27AE60' :
                       analysis.score >= 60 ? '#F39C12' : '#C0392B',
              }}>
                {analysis.score}/100
              </span>
            </div>
          )}
          <button
            onClick={() => importInputRef.current?.click()}
            disabled={importing}
            className="text-sm font-medium px-4 py-2 rounded transition-colors disabled:opacity-50 flex items-center gap-2"
            style={{ border: '1px solid #AED6F1', color: '#2980B9', backgroundColor: 'transparent' }}
            onMouseEnter={e => { if (!importing) e.currentTarget.style.backgroundColor = '#EBF5FB'; }}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            {importing ? '⏳ Analyse en cours...' : '📄 Importer un PMU existant'}
          </button>
          <button
            onClick={() => router.push(`/projects/${projectId}`)}
            className="text-sm font-medium px-4 py-2 rounded transition-colors"
            style={{ border: '1px solid #DEE2E6', color: '#6C757D' }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F8F9FA'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            Retour au projet
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="text-white text-sm font-medium px-4 py-2 rounded transition-colors disabled:opacity-50"
            style={{ backgroundColor: saved ? '#27AE60' : '#C0392B' }}
            onMouseEnter={e => { if (!saving) e.currentTarget.style.backgroundColor = saved ? '#1E8449' : '#A93226'; }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = saved ? '#27AE60' : '#C0392B'; }}
          >
            {saving ? 'Sauvegarde...' : saved ? '✓ Sauvegardé !' : 'Sauvegarder'}
          </button>
        </div>
      </div>

      {importResult && (
        <div className="px-6 py-3 flex items-center justify-between"
          style={{ backgroundColor: '#EAFAF1', borderBottom: '1px solid #A9DFBF' }}>
          <p className="text-sm font-medium" style={{ color: '#1E8449' }}>
            ✓ Document analysé — {importResult.fieldsFound} champ{importResult.fieldsFound > 1 ? 's' : ''} pré-rempli{importResult.fieldsFound > 1 ? 's' : ''} automatiquement. Vérifiez et complétez les informations manquantes.
          </p>
          <button onClick={() => setImportResult(null)}
            className="text-xs" style={{ color: '#6C757D' }}>
            ✕
          </button>
        </div>
      )}

      <div className="flex" style={{ height: 'calc(100vh - 65px)' }}>

        {/* Sidebar nav */}
        <div className="w-56 overflow-y-auto flex-shrink-0"
          style={{
            backgroundColor: '#FFFFFF',
            borderRight: '1px solid #DEE2E6',
          }}>
          <div className="p-3">
            {(() => {
              const GROUPS: { label: string; ids: string[] }[] = [
                { label: 'Général',           ids: ['infos_document', 'description', 'certifications', 'emplacements', 'historique'] },
                { label: 'Sécurité incendie', ids: ['alarme', 'gicleurs', 'extincteurs', 'detecteurs'] },
                { label: 'Équipements',       ids: ['mecanique', 'communication', 'premiers_soins'] },
                { label: 'Risques',           ids: ['matieres'] },
                { label: 'Industriel',        ids: ['industriel'] },
              ];

              return GROUPS.map((group, groupIdx) => {
                const groupSections = sections
                  .map((s, idx) => ({ ...s, idx }))
                  .filter(s => group.ids.includes(s.id));

                if (groupSections.length === 0) return null;

                // Masquer le groupe Industriel si pas industriel
                if (group.ids.includes('industriel') && config['buildingType'] !== 'Industriel') return null;

                return (
                  <div key={groupIdx} className="mb-3">
                    <p className="px-3 text-xs font-bold uppercase tracking-wider mb-1"
                      style={{ color: '#ADB5BD' }}>
                      {group.label}
                    </p>
                    {groupSections.map(section => {
                      const isActive = activeSection === section.idx;
                      return (
                        <button
                          key={section.id}
                          onClick={() => setActiveSection(section.idx)}
                          className="w-full text-left px-3 py-2 rounded text-xs mb-0.5 transition-colors flex items-center gap-2 font-medium"
                          style={{
                            backgroundColor: isActive ? '#FDEDEC' : 'transparent',
                            color: isActive ? '#C0392B' : '#495057',
                            border: isActive ? '1px solid #F1948A' : '1px solid transparent',
                          }}
                          onMouseEnter={e => { if (!isActive) e.currentTarget.style.backgroundColor = '#F8F9FA'; }}
                          onMouseLeave={e => { if (!isActive) e.currentTarget.style.backgroundColor = 'transparent'; }}
                        >
                          <span>{section.icon}</span>
                          <span>{section.title}</span>
                        </button>
                      );
                    })}
                  </div>
                );
              });
            })()}
          </div>
        </div>

        {/* Formulaire */}
        <div className="flex-1 overflow-y-auto p-6">
          {currentSection && (
            <div>
              <div className="flex items-center gap-3 mb-6">
                <span className="text-3xl">{currentSection.icon}</span>
                <div>
                  <h2 className="text-xl font-semibold" style={{ color: '#2C3E50' }}>
                    {currentSection.title}
                  </h2>
                  <p className="text-sm" style={{ color: '#6C757D' }}>
                    Section {activeSection + 1} / {sections.length}
                    {visibleFields.length > 0 && (
                      <span className="ml-2 font-medium" style={{ color: '#C0392B' }}>
                        {completedFields}/{visibleFields.length} complétés
                      </span>
                    )}
                  </p>
                </div>
              </div>

              <div className="grid gap-3 max-w-2xl">
                {visibleFields.map(field => (
                  <div key={field.key} className="rounded-md p-4 transition-all"
                    style={{
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #E9ECEF',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                    }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = '#CED4DA'}
                    onMouseLeave={e => e.currentTarget.style.borderColor = '#E9ECEF'}
                  >
                    <label className="block text-sm font-medium mb-2.5 flex items-center gap-2"
                      style={{ color: '#2C3E50' }}>
                      {field.label}
                      {field.tooltip && (
                        <span
                          title={field.tooltip}
                          className="inline-flex items-center justify-center w-4 h-4 rounded-full text-xs cursor-help flex-shrink-0"
                          style={{ backgroundColor: '#EBF5FB', color: '#2980B9', border: '1px solid #AED6F1', fontSize: '10px' }}
                        >
                          i
                        </span>
                      )}
                    </label>

                    {field.type === 'boolean' && (
                      <div className="flex gap-3">
                        {[true, false].map(val => (
                          <button key={String(val)}
                            onClick={() => updateConfig(field.key, val)}
                            className="flex-1 py-2 rounded text-sm font-medium transition-colors"
                            style={{
                              backgroundColor: config[field.key] === val
                                ? (val ? '#EAFAF1' : '#FDEDEC')
                                : '#F8F9FA',
                              color: config[field.key] === val
                                ? (val ? '#27AE60' : '#C0392B')
                                : '#6C757D',
                              border: `1px solid ${config[field.key] === val
                                ? (val ? '#A9DFBF' : '#F1948A')
                                : '#DEE2E6'}`,
                            }}>
                            {val ? 'Oui' : 'Non'}
                          </button>
                        ))}
                      </div>
                    )}

                    {field.type === 'number' && (
                      <input type="number"
                        value={config[field.key] === 0 ? '' : config[field.key]}
                        onChange={e => updateConfig(field.key, e.target.value === '' ? 0 : parseInt(e.target.value))}
                        placeholder="0" min="0"
                        className={inputCls} style={inputSty}
                        onFocus={e => e.target.style.borderColor = '#C0392B'}
                        onBlur={e => e.target.style.borderColor = '#CED4DA'}
                      />
                    )}

                    {field.type === 'select' && (
                      <select value={config[field.key] || ''}
                        onChange={e => updateConfig(field.key, e.target.value)}
                        className={inputCls} style={inputSty}
                        onFocus={e => e.target.style.borderColor = '#C0392B'}
                        onBlur={e => e.target.style.borderColor = '#CED4DA'}
                      >
                        <option value="">Sélectionner...</option>
                        {field.options?.map(opt => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    )}

                    {field.type === 'text' && ['pointRassemblement', 'pointRassemblement2', 'lieuAccueilTemporaire'].includes(field.key) && (
                      <MapPicker
                        label={field.label}
                        value={config[field.key] || ''}
                        coords={config[`${field.key}_coords`] || null}
                        buildingAddress={buildingAddress}
                        onValueChange={val => updateConfig(field.key, val)}
                        onCoordsChange={coords => updateConfig(`${field.key}_coords`, coords)}
                        onMapSnapshot={snapshot => updateConfig(`${field.key}_snapshot`, snapshot)}
                      />
                    )}
                    {config[`${field.key}_snapshot`] && ['pointRassemblement', 'pointRassemblement2', 'lieuAccueilTemporaire'].includes(field.key) && (
                      <img src={config[`${field.key}_snapshot`]} style={{ width: '100%', marginTop: '8px', borderRadius: '4px' }} />
                    )}

                    {field.type === 'text' && !['pointRassemblement', 'pointRassemblement2', 'lieuAccueilTemporaire'].includes(field.key) && (
                      <input type="text"
                        value={config[field.key] || ''}
                        onChange={e => updateConfig(field.key, e.target.value)}
                        placeholder="Entrer une valeur..."
                        className={inputCls} style={inputSty}
                        onFocus={e => e.target.style.borderColor = '#C0392B'}
                        onBlur={e => e.target.style.borderColor = '#CED4DA'}
                      />
                    )}

                    {field.type === 'date' && (
                      <input type="date"
                        value={config[field.key] || ''}
                        onChange={e => updateConfig(field.key, e.target.value)}
                        className={inputCls} style={inputSty}
                        onFocus={e => e.target.style.borderColor = '#C0392B'}
                        onBlur={e => e.target.style.borderColor = '#CED4DA'}
                      />
                    )}

                    {field.type === 'checkbox_group' && (
                      <CheckboxGroupField
                        field={field}
                        value={config[field.key] || []}
                        onChange={val => updateConfig(field.key, val)}
                      />
                    )}

                    {field.type === 'dynamic_list' && (
                      <DynamicListEditor
                        field={field}
                        items={lists[field.key] || []}
                        onChange={items => updateList(field.key, items)}
                      />
                    )}

                    {field.type === 'schedule_grid' && (
                      <ScheduleGrid
                        value={config[field.key]}
                        onChange={val => updateConfig(field.key, val)}
                      />
                    )}
                  </div>
                ))}
              </div>

              {/* Navigation */}
              <div className="flex gap-3 mt-6 max-w-2xl">
                {activeSection > 0 && (
                  <button onClick={() => {
                    let prev = activeSection - 1;
                    while (prev > 0 && sections[prev].id === 'industriel' && config['buildingType'] !== 'Industriel') {
                      prev--;
                    }
                    setActiveSection(prev);
                  }}
                    className="flex-1 font-medium py-3 rounded-md text-sm transition-colors"
                    style={{ border: '1px solid #DEE2E6', color: '#6C757D' }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F8F9FA'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    ← Précédent
                  </button>
                )}
                {activeSection < sections.length - 1 && (
                  <button onClick={() => {
                    let next = activeSection + 1;
                    while (next < sections.length - 1 && sections[next].id === 'industriel' && config['buildingType'] !== 'Industriel') {
                      next++;
                    }
                    setActiveSection(next);
                  }}
                    className="flex-1 text-white font-medium py-3 rounded-md text-sm"
                    style={{ backgroundColor: '#C0392B' }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = '#A93226'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = '#C0392B'}
                  >
                    Suivant →
                  </button>
                )}
                {activeSection === sections.length - 1 && (
                  <button onClick={handleSave}
                    className="flex-1 text-white font-medium py-3 rounded-md text-sm"
                    style={{ backgroundColor: '#27AE60' }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = '#1E8449'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = '#27AE60'}
                  >
                    Terminer la configuration ✓
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Panneau analyse */}
        <div className="w-80 overflow-y-auto flex-shrink-0"
          style={{
            backgroundColor: '#FFFFFF',
            borderLeft: '1px solid #DEE2E6',
          }}>
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-sm" style={{ color: '#2C3E50' }}>
                Analyse en temps réel
              </h3>
              <p className="text-xs mt-1" style={{ color: '#ADB5BD' }}>
                Le score de conformité évalue le respect des normes réglementaires, pas l'avancement de votre saisie.
              </p>
              {analyzing && (
                <span className="text-xs animate-pulse" style={{ color: '#C0392B' }}>
                  Analyse...
                </span>
              )}
            </div>

            {!analysis ? (
              <div className="text-center py-8">
                <p className="text-xs" style={{ color: '#ADB5BD' }}>
                  Répondez aux questions pour voir l'analyse
                </p>
              </div>
            ) : (
              <div className="space-y-4">

                {/* Score */}
                <div className="rounded-md p-4"
                  style={{ backgroundColor: '#F8F9FA', border: '1px solid #E9ECEF' }}>
                  <p className="text-xs mb-2" style={{ color: '#6C757D' }}>
                    Score de conformité
                  </p>
                  <div className="flex items-end gap-2">
                    <span className="text-3xl font-bold" style={{
                      color: analysis.score >= 80 ? '#27AE60' :
                             analysis.score >= 60 ? '#F39C12' : '#C0392B',
                    }}>
                      {analysis.score}
                    </span>
                    <span className="text-sm mb-1" style={{ color: '#ADB5BD' }}>/100</span>
                  </div>
                  <div className="w-full rounded-full h-2 mt-2"
                    style={{ backgroundColor: '#E9ECEF' }}>
                    <div className="h-2 rounded-full transition-all" style={{
                      width: `${analysis.score}%`,
                      backgroundColor: analysis.score >= 80 ? '#27AE60' :
                                       analysis.score >= 60 ? '#F39C12' : '#C0392B',
                    }} />
                  </div>
                </div>

                {/* Rôles actifs */}
                {analysis.rolesActives.length > 0 && (
                  <div>
                    <p className="text-xs font-medium mb-2" style={{ color: '#6C757D' }}>
                      Rôles actifs ({analysis.rolesActives.length})
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {analysis.rolesActives.map(role => (
                        <span key={role} className="text-xs px-2 py-1 rounded font-mono"
                          style={{
                            backgroundColor: '#FDEDEC',
                            color: '#C0392B',
                            border: '1px solid #F1948A',
                          }}>
                          {role}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Rôles recommandés */}
                {analysis.rolesRecommandes.length > 0 && (
                  <div>
                    <p className="text-xs font-medium mb-2" style={{ color: '#6C757D' }}>
                      Rôles recommandés ({analysis.rolesRecommandes.length})
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {analysis.rolesRecommandes.map(role => (
                        <span key={role} className="text-xs px-2 py-1 rounded font-mono"
                          style={{
                            backgroundColor: '#F8F9FA',
                            color: '#495057',
                            border: '1px solid #DEE2E6',
                          }}>
                          {role}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Procédures */}
                {analysis.proceduresActives.length > 0 && (
                  <div>
                    <p className="text-xs font-medium mb-2" style={{ color: '#6C757D' }}>
                      Procédures ({analysis.proceduresActives.length})
                    </p>
                    <div className="space-y-1">
                      {analysis.proceduresActives.slice(0, 8).map(proc => (
                        <div key={proc} className="rounded px-2 py-1"
                          style={{ backgroundColor: '#F8F9FA', border: '1px solid #E9ECEF' }}>
                          <span className="text-xs font-mono" style={{ color: '#495057' }}>
                            {proc}
                          </span>
                        </div>
                      ))}
                      {analysis.proceduresActives.length > 8 && (
                        <p className="text-xs" style={{ color: '#ADB5BD' }}>
                          +{analysis.proceduresActives.length - 8} autres...
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Validations */}
                {analysis.validations.length > 0 && (
                  <div>
                    <p className="text-xs font-medium mb-2" style={{ color: '#6C757D' }}>
                      Validations ({analysis.validations.length})
                    </p>
                    <div className="space-y-2">
                      {analysis.validations.map((v, idx) => {
                        const vs = validationStyles[v.type] || validationStyles.INFO;
                        return (
                          <div key={idx} className="rounded p-2.5"
                            style={{
                              backgroundColor: vs.bg,
                              border: `1px solid ${vs.border}`,
                            }}>
                            <div className="flex items-start gap-2">
                              <span className="text-sm flex-shrink-0">{vs.icon}</span>
                              <div>
                                <p className="text-xs font-medium" style={{ color: vs.text }}>
                                  {v.type}
                                </p>
                                <p className="text-xs mt-0.5" style={{ color: vs.text, opacity: 0.85 }}>
                                  {v.message}
                                </p>
                                {v.reference && (
                                  <p className="text-xs mt-1 font-mono"
                                    style={{ color: vs.text, opacity: 0.6 }}>
                                    {v.reference}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Sections document */}
                {analysis.sectionsDocument.length > 0 && (
                  <div>
                    <p className="text-xs font-medium mb-2" style={{ color: '#6C757D' }}>
                      Sections document ({analysis.sectionsDocument.length})
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {analysis.sectionsDocument.map(s => (
                        <span key={s} className="text-xs px-1.5 py-0.5 rounded font-mono"
                          style={{
                            backgroundColor: '#EBF5FB',
                            color: '#2980B9',
                            border: '1px solid #AED6F1',
                          }}>
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