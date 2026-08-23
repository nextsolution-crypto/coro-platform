'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';
import api from '@/lib/api';
import AppLayout from '@/components/layout/AppLayout';
import { ArrowLeft, Save, ChevronRight, ChevronLeft } from 'lucide-react';

const SECTIONS = [
  { id: 1, label: 'Informations générales' },
  { id: 2, label: 'Gouvernance' },
  { id: 3, label: 'Appréciation du risque' },
  { id: 4, label: 'Bilan d\'impact (BIA)' },
  { id: 5, label: 'Stratégies de continuité' },
  { id: 6, label: 'Communication de crise' },
  { id: 7, label: 'Activation et reprise' },
  { id: 8, label: 'Exercices et maintien' },
];

const RISK_SCENARIOS = [
  { id: 'sinistre', label: 'Sinistre bâtiment (incendie, inondation, séisme)' },
  { id: 'meteo', label: 'Événement météorologique extrême (verglas, tempête, canicule)' },
  { id: 'cyber', label: 'Cyberattaque / panne informatique majeure' },
  { id: 'pandemie', label: 'Pandémie / absentéisme massif' },
  { id: 'electrique', label: 'Panne électrique prolongée' },
  { id: 'fournisseur', label: 'Perte d\'un fournisseur critique' },
  { id: 'personnel', label: 'Perte d\'un employé clé' },
  { id: 'approvisionnement', label: 'Interruption chaîne d\'approvisionnement' },
  { id: 'autre', label: 'Autre' },
];

const REGULATORY_REQS = [
  'ISO 22301', 'BOMA BEST', 'AMF', 'OCRCVM', 'LEED', 'SQF', 'AS9100', 'IATF 16949', 'Autre',
];

const SECTORS = [
  'Manufacturier', 'Services professionnels', 'Santé', 'Finance et assurances',
  'Commerce de détail', 'Construction', 'Transport et logistique',
  'Technologies de l\'information', 'Gouvernement et secteur public',
  'Éducation', 'Hôtellerie et restauration', 'Autre',
];

const inputStyle = {
  border: '1px solid #CED4DA', color: '#2C3E50',
  backgroundColor: '#FFFFFF', width: '100%',
};

const Label = ({ children, required }: { children: React.ReactNode; required?: boolean }) => (
  <label className="block text-sm font-medium mb-1.5" style={{ color: '#495057' }}>
    {children} {required && <span style={{ color: '#C0392B' }}>*</span>}
  </label>
);

export default function PcaConfiguratorPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.projectId as string;
  const { isAuthenticated, initAuth } = useAuthStore();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeSection, setActiveSection] = useState(1);
  const [project, setProject] = useState<any>(null);
  const [prefill, setPrefill] = useState<any>(null);
  const [linkedPmus, setLinkedPmus] = useState<any[]>([]);

  const [config, setConfig] = useState({
    // Section 1
    planName: '',
    effectiveDate: '',
    scope: 'ORGANIZATION',
    sector: '',
    employeeCount: '',
    operatingHours: '',
    regulatoryReqs: [] as string[],

    // Section 2
    coordinatorFirstName: '',
    coordinatorLastName: '',
    coordinatorTitle: '',
    coordinatorEmail: '',
    coordinatorPhone: '',
    substituteFirstName: '',
    substituteLastName: '',
    substituteEmail: '',
    substitutePhone: '',
    cellMembers: [] as any[],
    spokesperson: '',
    socialMediaMonitor: '',

    // Section 3
    riskScenarios: [] as any[],

    // Section 4
    criticalServices: [] as any[],

    // Section 5
    teleworkPossible: '',
    alternativeSite: false,
    alternativeSiteAddress: '',
    sharingAgreement: false,
    itRedundancy: false,
    offSiteBackup: false,
    backupFrequency: '',
    crossTraining: false,
    processDocumented: false,
    tempStaffAccess: false,
    alternativeSuppliers: false,
    safetyStock: false,
    safetyStockDuration: '',
    generator: false,
    ups: false,
    insuranceBI: false,
    insuranceProperty: false,
    insuranceCyber: false,
    insuranceLastReview: '',

    // Section 6
    internalChannel: '',
    massAlertSystem: false,
    externalChannel: '',
    priorityClients: '',
    authoritiesToNotify: [] as string[],
    mediaContact: '',

    // Section 7
    activationCriteria: '',
    coordinationLocation: '',
    emergencyBridge: '',
    linkedPmuId: '',
    resumptionSequence: [] as any[],

    // Section 8
    exerciseFormative: 'Annuel',
    exerciseTable: 'Annuel',
    exerciseSimulation: 'Tous les 3 ans',
    exerciseIT: 'Annuel',
    planOwner: '',
    reviewFrequency: 'Annuel',
    nextReviewDate: '',
  });

  useEffect(() => { initAuth(); }, []);

  useEffect(() => {
    if (isAuthenticated) fetchData();
  }, [isAuthenticated, projectId]);

  const fetchData = async () => {
    try {
      const [configRes, linkedRes] = await Promise.all([
        api.get(`/pca/configurator/${projectId}`),
        api.get(`/pca/configurator/${projectId}/linked-pmu`),
      ]);
      setProject(configRes.data.project);
      setPrefill(configRes.data.prefill);
      setLinkedPmus(linkedRes.data || []);

      if (configRes.data.config) {
        // Charger la config existante
        const c = configRes.data.config;
        setConfig(prev => ({
          ...prev,
          ...c,
          effectiveDate: c.effectiveDate ? new Date(c.effectiveDate).toISOString().split('T')[0] : '',
          insuranceLastReview: c.insuranceLastReview ? new Date(c.insuranceLastReview).toISOString().split('T')[0] : '',
          nextReviewDate: c.nextReviewDate ? new Date(c.nextReviewDate).toISOString().split('T')[0] : '',
          cellMembers: c.cellMembers || [],
          riskScenarios: c.riskScenarios || [],
          criticalServices: c.criticalServices || [],
          resumptionSequence: c.resumptionSequence || [],
          regulatoryReqs: c.regulatoryReqs || [],
          authoritiesToNotify: c.authoritiesToNotify || [],
        }));
      } else {
        // Pré-remplissage depuis les fiches existantes
        const p = configRes.data.prefill;
        setConfig(prev => ({
          ...prev,
          planName: `PCA — ${configRes.data.project.client?.name || ''} ${configRes.data.project.year}`,
          sector: p.sector || p.clientSector || '',
          employeeCount: p.employeeCount || p.clientEmployeeCount || '',
          operatingHours: p.operatingHours || '',
          regulatoryReqs: p.regulatoryReqs || [],
          coordinatorFirstName: p.coordinatorFirstName || '',
          coordinatorLastName: p.coordinatorLastName || '',
          coordinatorTitle: p.coordinatorTitle || '',
          coordinatorEmail: p.coordinatorEmail || '',
          coordinatorPhone: p.coordinatorPhone || '',
        }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        ...config,
        effectiveDate: config.effectiveDate ? new Date(config.effectiveDate) : null,
        insuranceLastReview: config.insuranceLastReview ? new Date(config.insuranceLastReview) : null,
        nextReviewDate: config.nextReviewDate ? new Date(config.nextReviewDate) : null,
        employeeCount: config.employeeCount ? parseInt(config.employeeCount as string) : null,
      };
      await api.post(`/pca/configurator/${projectId}`, payload);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const toggleRisk = (scenarioId: string) => {
    const existing = config.riskScenarios.find((r: any) => r.id === scenarioId);
    if (existing) {
      setConfig(prev => ({ ...prev, riskScenarios: prev.riskScenarios.filter((r: any) => r.id !== scenarioId) }));
    } else {
      setConfig(prev => ({
        ...prev,
        riskScenarios: [...prev.riskScenarios, { id: scenarioId, probability: 'MOYENNE', impact: 'MOYEN' }],
      }));
    }
  };

  const updateRisk = (scenarioId: string, field: string, value: string) => {
    setConfig(prev => ({
      ...prev,
      riskScenarios: prev.riskScenarios.map((r: any) =>
        r.id === scenarioId ? { ...r, [field]: value } : r
      ),
    }));
  };

  const addCriticalService = () => {
    setConfig(prev => ({
      ...prev,
      criticalServices: [...prev.criticalServices, {
        id: Date.now().toString(),
        name: '',
        minServiceLevel: '',
        rto: '',
        rpo: '',
        mad: '',
        financialImpact: '',
        reputationalImpact: 'MOYEN',
        legalImpact: false,
      }],
    }));
  };

  const updateService = (id: string, field: string, value: any) => {
    setConfig(prev => ({
      ...prev,
      criticalServices: prev.criticalServices.map((s: any) =>
        s.id === id ? { ...s, [field]: value } : s
      ),
    }));
  };

  const removeService = (id: string) => {
    setConfig(prev => ({
      ...prev,
      criticalServices: prev.criticalServices.filter((s: any) => s.id !== id),
    }));
  };

  const addCellMember = () => {
    setConfig(prev => ({
      ...prev,
      cellMembers: [...prev.cellMembers, {
        id: Date.now().toString(),
        role: '',
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
      }],
    }));
  };

  const updateCellMember = (id: string, field: string, value: string) => {
    setConfig(prev => ({
      ...prev,
      cellMembers: prev.cellMembers.map((m: any) =>
        m.id === id ? { ...m, [field]: value } : m
      ),
    }));
  };

  const removeCellMember = (id: string) => {
    setConfig(prev => ({
      ...prev,
      cellMembers: prev.cellMembers.filter((m: any) => m.id !== id),
    }));
  };

  const toggleRegReq = (req: string) => {
    setConfig(prev => ({
      ...prev,
      regulatoryReqs: prev.regulatoryReqs.includes(req)
        ? prev.regulatoryReqs.filter(r => r !== req)
        : [...prev.regulatoryReqs, req],
    }));
  };

  const toggleAuthority = (auth: string) => {
    setConfig(prev => ({
      ...prev,
      authoritiesToNotify: prev.authoritiesToNotify.includes(auth)
        ? prev.authoritiesToNotify.filter(a => a !== auth)
        : [...prev.authoritiesToNotify, auth],
    }));
  };

  const BoolField = ({ label, field, hint }: { label: string; field: string; hint?: string }) => (
    <div className="flex items-start justify-between gap-4 py-3" style={{ borderBottom: '1px solid #F1F3F5' }}>
      <div>
        <p className="text-sm font-medium" style={{ color: '#2C3E50' }}>{label}</p>
        {hint && <p className="text-xs mt-0.5" style={{ color: '#ADB5BD' }}>{hint}</p>}
      </div>
      <div className="flex gap-2 flex-shrink-0">
        {['Oui', 'Non'].map(opt => (
          <button key={opt} type="button"
            onClick={() => setConfig(prev => ({ ...prev, [field]: opt === 'Oui' }))}
            className="px-4 py-1.5 rounded text-sm font-medium transition-colors"
            style={{
              backgroundColor: (config as any)[field] === (opt === 'Oui') ? (opt === 'Oui' ? '#EAFAF1' : '#FDEDEC') : '#F8F9FA',
              color: (config as any)[field] === (opt === 'Oui') ? (opt === 'Oui' ? '#27AE60' : '#C0392B') : '#6C757D',
              border: `1px solid ${(config as any)[field] === (opt === 'Oui') ? (opt === 'Oui' ? '#A9DFBF' : '#F1948A') : '#DEE2E6'}`,
            }}>
            {opt}
          </button>
        ))}
      </div>
    </div>
  );

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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <button onClick={() => router.push(`/projects/${projectId}`)}
            className="flex items-center gap-2 text-sm mb-3 transition-colors"
            style={{ color: '#6C757D' }}
            onMouseEnter={e => e.currentTarget.style.color = '#2C3E50'}
            onMouseLeave={e => e.currentTarget.style.color = '#6C757D'}>
            <ArrowLeft size={16} /> Retour au projet
          </button>
          <h2 className="text-2xl font-semibold" style={{ color: '#2C3E50' }}>
            Configurateur PCA
          </h2>
          {project && (
            <p className="text-sm mt-1" style={{ color: '#6C757D' }}>
              {project.name} — {project.client?.name}
            </p>
          )}
        </div>
        <button onClick={handleSave} disabled={saving}
          className="flex items-center gap-2 text-white text-sm font-medium px-5 py-2.5 rounded transition-colors"
          style={{ backgroundColor: saved ? '#27AE60' : saving ? '#E8A89C' : '#C0392B' }}
          onMouseEnter={e => { if (!saving && !saved) e.currentTarget.style.backgroundColor = '#A93226'; }}
          onMouseLeave={e => { if (!saving && !saved) e.currentTarget.style.backgroundColor = '#C0392B'; }}>
          <Save size={16} />
          {saving ? 'Sauvegarde...' : saved ? '✓ Sauvegardé !' : 'Sauvegarder'}
        </button>
      </div>

      {/* Navigation sections */}
      <div className="flex gap-1 mb-8 overflow-x-auto pb-1">
        {SECTIONS.map(s => (
          <button key={s.id} onClick={() => setActiveSection(s.id)}
            className="flex-shrink-0 px-4 py-2 rounded text-sm font-medium transition-colors"
            style={{
              backgroundColor: activeSection === s.id ? '#C0392B' : '#FFFFFF',
              color: activeSection === s.id ? '#FFFFFF' : '#6C757D',
              border: `1px solid ${activeSection === s.id ? '#C0392B' : '#E9ECEF'}`,
            }}>
            {s.id}. {s.label}
          </button>
        ))}
      </div>

      {/* Contenu des sections */}
      <div className="rounded-md p-6" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E9ECEF' }}>

        {/* ── SECTION 1 — Informations générales ── */}
        {activeSection === 1 && (
          <div className="space-y-6">
            <h3 className="font-semibold text-lg" style={{ color: '#2C3E50' }}>
              Informations générales
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <Label required>Nom du plan</Label>
                <input type="text" value={config.planName}
                  onChange={e => setConfig({ ...config, planName: e.target.value })}
                  placeholder="Ex: Plan de continuité des activités — Entreprise ABC 2026"
                  className="rounded px-4 py-2.5 text-sm focus:outline-none" style={inputStyle}
                  onFocus={e => e.target.style.borderColor = '#C0392B'}
                  onBlur={e => e.target.style.borderColor = '#CED4DA'} />
              </div>

              <div>
                <Label>Date d'entrée en vigueur</Label>
                <input type="date" value={config.effectiveDate}
                  onChange={e => setConfig({ ...config, effectiveDate: e.target.value })}
                  className="rounded px-4 py-2.5 text-sm focus:outline-none" style={inputStyle}
                  onFocus={e => e.target.style.borderColor = '#C0392B'}
                  onBlur={e => e.target.style.borderColor = '#CED4DA'} />
              </div>

              <div>
                <Label required>Portée du plan</Label>
                <select value={config.scope}
                  onChange={e => setConfig({ ...config, scope: e.target.value })}
                  className="rounded px-4 py-2.5 text-sm focus:outline-none" style={inputStyle}
                  onFocus={e => e.target.style.borderColor = '#C0392B'}
                  onBlur={e => e.target.style.borderColor = '#CED4DA'}>
                  <option value="ORGANIZATION">Organisation entière</option>
                  <option value="BUILDING">Un bâtiment spécifique</option>
                  <option value="MULTI_BUILDING">Plusieurs bâtiments</option>
                </select>
              </div>

              <div>
                <Label>Secteur d'activité</Label>
                <select value={config.sector}
                  onChange={e => setConfig({ ...config, sector: e.target.value })}
                  className="rounded px-4 py-2.5 text-sm focus:outline-none" style={inputStyle}
                  onFocus={e => e.target.style.borderColor = '#C0392B'}
                  onBlur={e => e.target.style.borderColor = '#CED4DA'}>
                  <option value="">Sélectionner...</option>
                  {SECTORS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div>
                <Label>Nombre d'employés</Label>
                <input type="number" value={config.employeeCount}
                  onChange={e => setConfig({ ...config, employeeCount: e.target.value })}
                  placeholder="Ex: 150"
                  className="rounded px-4 py-2.5 text-sm focus:outline-none" style={inputStyle}
                  onFocus={e => e.target.style.borderColor = '#C0392B'}
                  onBlur={e => e.target.style.borderColor = '#CED4DA'} />
              </div>

              <div>
                <Label>Heures d'opération</Label>
                <select value={config.operatingHours}
                  onChange={e => setConfig({ ...config, operatingHours: e.target.value })}
                  className="rounded px-4 py-2.5 text-sm focus:outline-none" style={inputStyle}
                  onFocus={e => e.target.style.borderColor = '#C0392B'}
                  onBlur={e => e.target.style.borderColor = '#CED4DA'}>
                  <option value="">Sélectionner...</option>
                  <option value="24/7">24h/7j — Opération continue</option>
                  <option value="heures_bureau">Heures de bureau (L-V, 8h-17h)</option>
                  <option value="heures_etendues">Heures étendues (L-V, 7h-20h)</option>
                  <option value="semaine_weekend">Semaine et fin de semaine</option>
                  <option value="autre">Autre</option>
                </select>
              </div>
            </div>

            {/* Exigences réglementaires */}
            <div>
              <Label>Exigences réglementaires ou contractuelles</Label>
              <p className="text-xs mb-3" style={{ color: '#ADB5BD' }}>
                Sélectionnez toutes les normes et certifications applicables à votre organisation
              </p>
              <div className="flex flex-wrap gap-2">
                {REGULATORY_REQS.map(req => (
                  <button key={req} type="button"
                    onClick={() => toggleRegReq(req)}
                    className="px-3 py-1.5 rounded text-sm font-medium transition-colors"
                    style={{
                      backgroundColor: config.regulatoryReqs.includes(req) ? '#EBF5FB' : '#F8F9FA',
                      color: config.regulatoryReqs.includes(req) ? '#2980B9' : '#6C757D',
                      border: `1px solid ${config.regulatoryReqs.includes(req) ? '#AED6F1' : '#DEE2E6'}`,
                    }}>
                    {config.regulatoryReqs.includes(req) ? '✓ ' : ''}{req}
                  </button>
                ))}
              </div>
            </div>

            {/* Infos pré-remplies */}
            {prefill && (
              <div className="p-4 rounded" style={{ backgroundColor: '#EBF5FB', border: '1px solid #AED6F1' }}>
                <p className="text-xs font-semibold mb-2" style={{ color: '#2980B9' }}>
                  ℹ️ Informations importées automatiquement
                </p>
                <p className="text-xs" style={{ color: '#1A5276' }}>
                  Bâtiment : <strong>{prefill.buildingName}</strong> —{' '}
                  {prefill.buildingAddress}, {prefill.buildingCity}, {prefill.buildingProvince}
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── SECTION 2 — Gouvernance ── */}
        {activeSection === 2 && (
          <div className="space-y-6">
            <h3 className="font-semibold text-lg" style={{ color: '#2C3E50' }}>
              Gouvernance et équipe de continuité
            </h3>

            {/* Coordonnateur */}
            <div>
              <h4 className="font-medium mb-4" style={{ color: '#C0392B' }}>Coordonnateur PCA</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { label: 'Prénom', field: 'coordinatorFirstName', placeholder: 'Ex: Marie' },
                  { label: 'Nom', field: 'coordinatorLastName', placeholder: 'Ex: Tremblay' },
                  { label: 'Titre', field: 'coordinatorTitle', placeholder: 'Ex: Directrice des opérations' },
                  { label: 'Courriel', field: 'coordinatorEmail', placeholder: 'Ex: marie.tremblay@entreprise.ca' },
                  { label: 'Téléphone', field: 'coordinatorPhone', placeholder: 'Ex: 514-555-1234' },
                ].map(f => (
                  <div key={f.field}>
                    <Label>{f.label}</Label>
                    <input type="text" value={(config as any)[f.field]}
                      onChange={e => setConfig({ ...config, [f.field]: e.target.value })}
                      placeholder={f.placeholder}
                      className="rounded px-4 py-2.5 text-sm focus:outline-none" style={inputStyle}
                      onFocus={e => e.target.style.borderColor = '#C0392B'}
                      onBlur={e => e.target.style.borderColor = '#CED4DA'} />
                  </div>
                ))}
              </div>
            </div>

            {/* Substitut */}
            <div>
              <h4 className="font-medium mb-4" style={{ color: '#C0392B' }}>Substitut du coordonnateur</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { label: 'Prénom', field: 'substituteFirstName', placeholder: 'Ex: Jean' },
                  { label: 'Nom', field: 'substituteLastName', placeholder: 'Ex: Côté' },
                  { label: 'Courriel', field: 'substituteEmail', placeholder: 'Ex: jean.cote@entreprise.ca' },
                  { label: 'Téléphone', field: 'substitutePhone', placeholder: 'Ex: 514-555-5678' },
                ].map(f => (
                  <div key={f.field}>
                    <Label>{f.label}</Label>
                    <input type="text" value={(config as any)[f.field]}
                      onChange={e => setConfig({ ...config, [f.field]: e.target.value })}
                      placeholder={f.placeholder}
                      className="rounded px-4 py-2.5 text-sm focus:outline-none" style={inputStyle}
                      onFocus={e => e.target.style.borderColor = '#C0392B'}
                      onBlur={e => e.target.style.borderColor = '#CED4DA'} />
                  </div>
                ))}
              </div>
            </div>

            {/* Membres de la cellule */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-medium" style={{ color: '#C0392B' }}>
                  Membres de la cellule de gestion d'incident
                </h4>
                <button onClick={addCellMember}
                  className="text-sm font-medium px-3 py-1.5 rounded transition-colors"
                  style={{ border: '1px solid #AED6F1', color: '#2980B9' }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = '#EBF5FB'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                  + Ajouter un membre
                </button>
              </div>

              {config.cellMembers.length === 0 ? (
                <div className="p-6 text-center rounded" style={{ backgroundColor: '#F8F9FA', border: '1px dashed #DEE2E6' }}>
                  <p className="text-sm" style={{ color: '#ADB5BD' }}>
                    Ajoutez les membres de votre cellule de gestion d'incident
                  </p>
                  <p className="text-xs mt-1" style={{ color: '#ADB5BD' }}>
                    Ex: Responsable opérations, TI, RH, communications, fournisseurs, installations
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {config.cellMembers.map((member: any) => (
                    <div key={member.id} className="p-4 rounded" style={{ backgroundColor: '#F8F9FA', border: '1px solid #E9ECEF' }}>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-2">
                        <div>
                          <Label>Rôle</Label>
                          <input type="text" value={member.role}
                            onChange={e => updateCellMember(member.id, 'role', e.target.value)}
                            placeholder="Ex: Responsable TI"
                            className="rounded px-3 py-2 text-sm focus:outline-none" style={inputStyle}
                            onFocus={e => e.target.style.borderColor = '#C0392B'}
                            onBlur={e => e.target.style.borderColor = '#CED4DA'} />
                        </div>
                        <div>
                          <Label>Prénom</Label>
                          <input type="text" value={member.firstName}
                            onChange={e => updateCellMember(member.id, 'firstName', e.target.value)}
                            placeholder="Prénom"
                            className="rounded px-3 py-2 text-sm focus:outline-none" style={inputStyle}
                            onFocus={e => e.target.style.borderColor = '#C0392B'}
                            onBlur={e => e.target.style.borderColor = '#CED4DA'} />
                        </div>
                        <div>
                          <Label>Nom</Label>
                          <input type="text" value={member.lastName}
                            onChange={e => updateCellMember(member.id, 'lastName', e.target.value)}
                            placeholder="Nom"
                            className="rounded px-3 py-2 text-sm focus:outline-none" style={inputStyle}
                            onFocus={e => e.target.style.borderColor = '#C0392B'}
                            onBlur={e => e.target.style.borderColor = '#CED4DA'} />
                        </div>
                        <div>
                          <Label>Courriel</Label>
                          <input type="email" value={member.email}
                            onChange={e => updateCellMember(member.id, 'email', e.target.value)}
                            placeholder="courriel@entreprise.ca"
                            className="rounded px-3 py-2 text-sm focus:outline-none" style={inputStyle}
                            onFocus={e => e.target.style.borderColor = '#C0392B'}
                            onBlur={e => e.target.style.borderColor = '#CED4DA'} />
                        </div>
                        <div>
                          <Label>Téléphone</Label>
                          <input type="text" value={member.phone}
                            onChange={e => updateCellMember(member.id, 'phone', e.target.value)}
                            placeholder="514-555-0000"
                            className="rounded px-3 py-2 text-sm focus:outline-none" style={inputStyle}
                            onFocus={e => e.target.style.borderColor = '#C0392B'}
                            onBlur={e => e.target.style.borderColor = '#CED4DA'} />
                        </div>
                      </div>
                      <button onClick={() => removeCellMember(member.id)}
                        className="text-xs"
                        style={{ color: '#ADB5BD' }}
                        onMouseEnter={e => e.currentTarget.style.color = '#C0392B'}
                        onMouseLeave={e => e.currentTarget.style.color = '#ADB5BD'}>
                        ✕ Supprimer
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Porte-parole */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Porte-parole désigné</Label>
                <input type="text" value={config.spokesperson}
                  onChange={e => setConfig({ ...config, spokesperson: e.target.value })}
                  placeholder="Ex: Marie Tremblay, Directrice générale"
                  className="rounded px-4 py-2.5 text-sm focus:outline-none" style={inputStyle}
                  onFocus={e => e.target.style.borderColor = '#C0392B'}
                  onBlur={e => e.target.style.borderColor = '#CED4DA'} />
              </div>
              <div>
                <Label>Responsable suivi médias sociaux</Label>
                <input type="text" value={config.socialMediaMonitor}
                  onChange={e => setConfig({ ...config, socialMediaMonitor: e.target.value })}
                  placeholder="Ex: Jean Côté, Responsable communications"
                  className="rounded px-4 py-2.5 text-sm focus:outline-none" style={inputStyle}
                  onFocus={e => e.target.style.borderColor = '#C0392B'}
                  onBlur={e => e.target.style.borderColor = '#CED4DA'} />
              </div>
            </div>
          </div>
        )}

        {/* ── SECTION 3 — Appréciation du risque ── */}
        {activeSection === 3 && (
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold text-lg" style={{ color: '#2C3E50' }}>
                Appréciation du risque (ARA)
              </h3>
              <p className="text-sm mt-1" style={{ color: '#6C757D' }}>
                Identifiez les scénarios d'interruption applicables à votre organisation et évaluez leur probabilité et impact.
              </p>
            </div>

            <div className="space-y-3">
              {RISK_SCENARIOS.map(scenario => {
                const risk = config.riskScenarios.find((r: any) => r.id === scenario.id);
                const isSelected = !!risk;
                return (
                  <div key={scenario.id} className="rounded p-4 transition-all"
                    style={{
                      backgroundColor: isSelected ? '#FEF9E7' : '#F8F9FA',
                      border: `1px solid ${isSelected ? '#FAD7A0' : '#E9ECEF'}`,
                    }}>
                    <div className="flex items-center gap-3 mb-3">
                      <button type="button" onClick={() => toggleRisk(scenario.id)}
                        className="w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors"
                        style={{
                          backgroundColor: isSelected ? '#F39C12' : '#FFFFFF',
                          borderColor: isSelected ? '#F39C12' : '#CED4DA',
                        }}>
                        {isSelected && <span className="text-white text-xs">✓</span>}
                      </button>
                      <p className="text-sm font-medium" style={{ color: '#2C3E50' }}>{scenario.label}</p>
                    </div>

                    {isSelected && (
                      <div className="grid grid-cols-2 gap-4 ml-8">
                        <div>
                          <Label>Probabilité</Label>
                          <select value={risk.probability}
                            onChange={e => updateRisk(scenario.id, 'probability', e.target.value)}
                            className="rounded px-3 py-2 text-sm focus:outline-none" style={inputStyle}>
                            <option value="FAIBLE">Faible</option>
                            <option value="MOYENNE">Moyenne</option>
                            <option value="ELEVEE">Élevée</option>
                          </select>
                        </div>
                        <div>
                          <Label>Impact</Label>
                          <select value={risk.impact}
                            onChange={e => updateRisk(scenario.id, 'impact', e.target.value)}
                            className="rounded px-3 py-2 text-sm focus:outline-none" style={inputStyle}>
                            <option value="FAIBLE">Faible</option>
                            <option value="MOYEN">Moyen</option>
                            <option value="ELEVE">Élevé</option>
                          </select>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── SECTION 4 — BIA ── */}
        {activeSection === 4 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-lg" style={{ color: '#2C3E50' }}>
                  Bilan d'impact sur les activités (BIA)
                </h3>
                <p className="text-sm mt-1" style={{ color: '#6C757D' }}>
                  Identifiez vos produits/services essentiels et définissez vos objectifs de continuité.
                </p>
              </div>
              <button onClick={addCriticalService}
                className="text-sm font-medium px-4 py-2 rounded text-white transition-colors flex-shrink-0"
                style={{ backgroundColor: '#C0392B' }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#A93226'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = '#C0392B'}>
                + Ajouter un service
              </button>
            </div>

            <div className="p-3 rounded" style={{ backgroundColor: '#EBF5FB', border: '1px solid #AED6F1' }}>
              <p className="text-xs font-semibold mb-1" style={{ color: '#2980B9' }}>
                ℹ️ Définitions (ISO 22301 / Guide Québec)
              </p>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { term: 'RTO', def: 'Recovery Time Objective — Délai de reprise maximal acceptable' },
                  { term: 'RPO', def: 'Recovery Point Objective — Perte de données maximale admissible' },
                  { term: 'MAD', def: 'Maximum Allowable Downtime — Temps d\'arrêt maximal admissible' },
                ].map(d => (
                  <div key={d.term}>
                    <p className="text-xs font-bold" style={{ color: '#2980B9' }}>{d.term}</p>
                    <p className="text-xs" style={{ color: '#1A5276' }}>{d.def}</p>
                  </div>
                ))}
              </div>
            </div>

            {config.criticalServices.length === 0 ? (
              <div className="p-8 text-center rounded" style={{ backgroundColor: '#F8F9FA', border: '1px dashed #DEE2E6' }}>
                <p className="text-sm" style={{ color: '#ADB5BD' }}>
                  Aucun service critique défini. Cliquez sur "Ajouter un service" pour commencer.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {config.criticalServices.map((service: any, index: number) => (
                  <div key={service.id} className="p-5 rounded" style={{ backgroundColor: '#F8F9FA', border: '1px solid #E9ECEF' }}>
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-medium" style={{ color: '#2C3E50' }}>
                        Service #{index + 1}
                      </h4>
                      <button onClick={() => removeService(service.id)}
                        className="text-xs"
                        style={{ color: '#ADB5BD' }}
                        onMouseEnter={e => e.currentTarget.style.color = '#C0392B'}
                        onMouseLeave={e => e.currentTarget.style.color = '#ADB5BD'}>
                        ✕ Supprimer
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="sm:col-span-2">
                        <Label required>Produit ou service essentiel</Label>
                        <input type="text" value={service.name}
                          onChange={e => updateService(service.id, 'name', e.target.value)}
                          placeholder="Ex: Traitement des commandes clients"
                          className="rounded px-4 py-2.5 text-sm focus:outline-none" style={inputStyle}
                          onFocus={e => e.target.style.borderColor = '#C0392B'}
                          onBlur={e => e.target.style.borderColor = '#CED4DA'} />
                      </div>
                      <div className="sm:col-span-2">
                        <Label>Niveau de service minimum acceptable</Label>
                        <input type="text" value={service.minServiceLevel}
                          onChange={e => updateService(service.id, 'minServiceLevel', e.target.value)}
                          placeholder="Ex: Traiter au moins 50% des commandes urgentes"
                          className="rounded px-4 py-2.5 text-sm focus:outline-none" style={inputStyle}
                          onFocus={e => e.target.style.borderColor = '#C0392B'}
                          onBlur={e => e.target.style.borderColor = '#CED4DA'} />
                      </div>
                      <div>
                        <Label>RTO (Délai de reprise max.)</Label>
                        <select value={service.rto}
                          onChange={e => updateService(service.id, 'rto', e.target.value)}
                          className="rounded px-4 py-2.5 text-sm focus:outline-none" style={inputStyle}>
                          <option value="">Sélectionner...</option>
                          <option value="1h">1 heure</option>
                          <option value="4h">4 heures</option>
                          <option value="8h">8 heures</option>
                          <option value="24h">24 heures</option>
                          <option value="48h">48 heures</option>
                          <option value="72h">72 heures</option>
                          <option value="1sem">1 semaine</option>
                          <option value="plus">Plus d'une semaine</option>
                        </select>
                      </div>
                      <div>
                        <Label>RPO (Perte de données max.)</Label>
                        <select value={service.rpo}
                          onChange={e => updateService(service.id, 'rpo', e.target.value)}
                          className="rounded px-4 py-2.5 text-sm focus:outline-none" style={inputStyle}>
                          <option value="">Sélectionner...</option>
                          <option value="0">Aucune perte (RPO = 0)</option>
                          <option value="1h">1 heure</option>
                          <option value="4h">4 heures</option>
                          <option value="8h">8 heures</option>
                          <option value="24h">24 heures</option>
                          <option value="48h">48 heures</option>
                          <option value="1sem">1 semaine</option>
                        </select>
                      </div>
                      <div>
                        <Label>MAD (Temps d'arrêt max.)</Label>
                        <select value={service.mad}
                          onChange={e => updateService(service.id, 'mad', e.target.value)}
                          className="rounded px-4 py-2.5 text-sm focus:outline-none" style={inputStyle}>
                          <option value="">Sélectionner...</option>
                          <option value="4h">4 heures</option>
                          <option value="8h">8 heures</option>
                          <option value="24h">24 heures</option>
                          <option value="48h">48 heures</option>
                          <option value="72h">72 heures</option>
                          <option value="1sem">1 semaine</option>
                          <option value="2sem">2 semaines</option>
                          <option value="1mois">1 mois</option>
                        </select>
                      </div>
                      <div>
                        <Label>Impact financier estimé / jour d'interruption</Label>
                        <select value={service.financialImpact}
                          onChange={e => updateService(service.id, 'financialImpact', e.target.value)}
                          className="rounded px-4 py-2.5 text-sm focus:outline-none" style={inputStyle}>
                          <option value="">Sélectionner...</option>
                          <option value="moins_1k">Moins de 1 000 $</option>
                          <option value="1k_10k">1 000 $ — 10 000 $</option>
                          <option value="10k_50k">10 000 $ — 50 000 $</option>
                          <option value="50k_100k">50 000 $ — 100 000 $</option>
                          <option value="100k_500k">100 000 $ — 500 000 $</option>
                          <option value="plus_500k">Plus de 500 000 $</option>
                        </select>
                      </div>
                      <div>
                        <Label>Impact réputationnel</Label>
                        <select value={service.reputationalImpact}
                          onChange={e => updateService(service.id, 'reputationalImpact', e.target.value)}
                          className="rounded px-4 py-2.5 text-sm focus:outline-none" style={inputStyle}>
                          <option value="FAIBLE">Faible</option>
                          <option value="MOYEN">Moyen</option>
                          <option value="ELEVE">Élevé</option>
                        </select>
                      </div>
                      <div className="flex items-center gap-3">
                        <input type="checkbox" checked={service.legalImpact}
                          onChange={e => updateService(service.id, 'legalImpact', e.target.checked)}
                          className="w-4 h-4" id={`legal-${service.id}`} />
                        <label htmlFor={`legal-${service.id}`} className="text-sm" style={{ color: '#2C3E50' }}>
                          Impact légal ou réglementaire
                        </label>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── SECTION 5 — Stratégies de continuité ── */}
        {activeSection === 5 && (
          <div className="space-y-6">
            <h3 className="font-semibold text-lg" style={{ color: '#2C3E50' }}>
              Stratégies de continuité
            </h3>

            {/* Perte d'accès au bâtiment */}
            <div>
              <h4 className="font-medium mb-3 pb-2" style={{ color: '#C0392B', borderBottom: '1px solid #F1F3F5' }}>
                🏢 Perte d'accès au bâtiment
              </h4>
              <div>
                <Label>Télétravail possible</Label>
                <div className="flex gap-2 mb-4">
                  {['Oui', 'Partiel', 'Non'].map(opt => (
                    <button key={opt} type="button"
                      onClick={() => setConfig({ ...config, teleworkPossible: opt })}
                      className="px-4 py-1.5 rounded text-sm font-medium transition-colors"
                      style={{
                        backgroundColor: config.teleworkPossible === opt ? '#EBF5FB' : '#F8F9FA',
                        color: config.teleworkPossible === opt ? '#2980B9' : '#6C757D',
                        border: `1px solid ${config.teleworkPossible === opt ? '#AED6F1' : '#DEE2E6'}`,
                      }}>
                      {opt}
                    </button>
                  ))}
                </div>
                <BoolField label="Site alternatif disponible" field="alternativeSite"
                  hint="Local temporaire, autre succursale, espace partagé" />
                {config.alternativeSite && (
                  <div className="mt-2 mb-2">
                    <Label>Adresse du site alternatif</Label>
                    <input type="text" value={config.alternativeSiteAddress}
                      onChange={e => setConfig({ ...config, alternativeSiteAddress: e.target.value })}
                      placeholder="Ex: 123 rue Principale, Montréal, QC H2X 1A1"
                      className="rounded px-4 py-2.5 text-sm focus:outline-none" style={inputStyle}
                      onFocus={e => e.target.style.borderColor = '#C0392B'}
                      onBlur={e => e.target.style.borderColor = '#CED4DA'} />
                  </div>
                )}
                <BoolField label="Entente de partage de locaux" field="sharingAgreement"
                  hint="Accord avec une autre entreprise pour partager les locaux en cas d'incident" />
              </div>
            </div>

            {/* Perte systèmes TI */}
            <div>
              <h4 className="font-medium mb-3 pb-2" style={{ color: '#C0392B', borderBottom: '1px solid #F1F3F5' }}>
                💻 Perte des systèmes TI et communications
              </h4>
              <BoolField label="Relève ou redondance des systèmes informatiques" field="itRedundancy" />
              <BoolField label="Sauvegardes hors site disponibles" field="offSiteBackup" />
              {config.offSiteBackup && (
                <div className="ml-0 mt-2 mb-2">
                  <Label>Fréquence des sauvegardes</Label>
                  <select value={config.backupFrequency}
                    onChange={e => setConfig({ ...config, backupFrequency: e.target.value })}
                    className="rounded px-4 py-2.5 text-sm focus:outline-none" style={inputStyle}>
                    <option value="">Sélectionner...</option>
                    <option value="temps_reel">Temps réel (continu)</option>
                    <option value="horaire">Toutes les heures</option>
                    <option value="quotidien">Quotidien</option>
                    <option value="hebdo">Hebdomadaire</option>
                  </select>
                </div>
              )}
            </div>

            {/* Absentéisme */}
            <div>
              <h4 className="font-medium mb-3 pb-2" style={{ color: '#C0392B', borderBottom: '1px solid #F1F3F5' }}>
                👥 Absentéisme ou perte de personnel clé
              </h4>
              <BoolField label="Formation croisée en place" field="crossTraining"
                hint="Les employés sont formés pour effectuer les tâches de leurs collègues" />
              <BoolField label="Processus clés documentés" field="processDocumented"
                hint="Les procédures sont documentées et accessibles" />
              <BoolField label="Accès à du personnel temporaire" field="tempStaffAccess"
                hint="Agences de placement, retraités, anciens employés" />
            </div>

            {/* Fournisseurs */}
            <div>
              <h4 className="font-medium mb-3 pb-2" style={{ color: '#C0392B', borderBottom: '1px solid #F1F3F5' }}>
                🚚 Perte d'un fournisseur critique
              </h4>
              <BoolField label="Fournisseurs alternatifs identifiés" field="alternativeSuppliers" />
              <BoolField label="Stock de sécurité maintenu" field="safetyStock" />
              {config.safetyStock && (
                <div className="mt-2 mb-2">
                  <Label>Durée du stock de sécurité</Label>
                  <select value={config.safetyStockDuration}
                    onChange={e => setConfig({ ...config, safetyStockDuration: e.target.value })}
                    className="rounded px-4 py-2.5 text-sm focus:outline-none" style={inputStyle}>
                    <option value="">Sélectionner...</option>
                    <option value="1sem">1 semaine</option>
                    <option value="2sem">2 semaines</option>
                    <option value="1mois">1 mois</option>
                    <option value="3mois">3 mois</option>
                    <option value="6mois">6 mois</option>
                  </select>
                </div>
              )}
            </div>

            {/* Énergie */}
            <div>
              <h4 className="font-medium mb-3 pb-2" style={{ color: '#C0392B', borderBottom: '1px solid #F1F3F5' }}>
                ⚡ Panne électrique
              </h4>
              <BoolField label="Génératrice disponible" field="generator" />
              <BoolField label="Alimentation sans coupure (UPS)" field="ups" />
            </div>

            {/* Assurances */}
            <div>
              <h4 className="font-medium mb-3 pb-2" style={{ color: '#C0392B', borderBottom: '1px solid #F1F3F5' }}>
                🛡️ Couverture d'assurance
              </h4>
              <BoolField label="Assurance interruption des affaires" field="insuranceBI" />
              <BoolField label="Assurance dommages matériels" field="insuranceProperty" />
              <BoolField label="Assurance cyber" field="insuranceCyber" />
              <div className="mt-3">
                <Label>Dernière révision de la couverture</Label>
                <input type="date" value={config.insuranceLastReview}
                  onChange={e => setConfig({ ...config, insuranceLastReview: e.target.value })}
                  className="rounded px-4 py-2.5 text-sm focus:outline-none w-full sm:w-auto"
                  style={inputStyle}
                  onFocus={e => e.target.style.borderColor = '#C0392B'}
                  onBlur={e => e.target.style.borderColor = '#CED4DA'} />
              </div>
            </div>
          </div>
        )}

        {/* ── SECTION 6 — Communication de crise ── */}
        {activeSection === 6 && (
          <div className="space-y-6">
            <h3 className="font-semibold text-lg" style={{ color: '#2C3E50' }}>
              Communication de crise
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Canal de communication interne principal</Label>
                <select value={config.internalChannel}
                  onChange={e => setConfig({ ...config, internalChannel: e.target.value })}
                  className="rounded px-4 py-2.5 text-sm focus:outline-none" style={inputStyle}
                  onFocus={e => e.target.style.borderColor = '#C0392B'}
                  onBlur={e => e.target.style.borderColor = '#CED4DA'}>
                  <option value="">Sélectionner...</option>
                  <option value="courriel">Courriel</option>
                  <option value="sms">SMS / Texto</option>
                  <option value="telephone">Téléphone</option>
                  <option value="teams">Microsoft Teams</option>
                  <option value="slack">Slack</option>
                  <option value="application">Application dédiée</option>
                  <option value="autre">Autre</option>
                </select>
              </div>

              <div>
                <Label>Canal de communication externe</Label>
                <select value={config.externalChannel}
                  onChange={e => setConfig({ ...config, externalChannel: e.target.value })}
                  className="rounded px-4 py-2.5 text-sm focus:outline-none" style={inputStyle}
                  onFocus={e => e.target.style.borderColor = '#C0392B'}
                  onBlur={e => e.target.style.borderColor = '#CED4DA'}>
                  <option value="">Sélectionner...</option>
                  <option value="site_web">Site web</option>
                  <option value="medias_sociaux">Médias sociaux</option>
                  <option value="communique">Communiqué de presse</option>
                  <option value="courriel_clients">Courriel aux clients</option>
                  <option value="multiple">Multiple canaux</option>
                </select>
              </div>
            </div>

            <BoolField label="Système d'alerte de masse disponible" field="massAlertSystem"
              hint="Système permettant d'envoyer rapidement des notifications à tous les employés" />

            <div>
              <Label>Clients à aviser en priorité</Label>
              <textarea value={config.priorityClients}
                onChange={e => setConfig({ ...config, priorityClients: e.target.value })}
                rows={3}
                placeholder="Ex: Clients avec contrats SLA, clients gouvernementaux, clients avec commandes urgentes en cours..."
                className="rounded px-4 py-2.5 text-sm focus:outline-none resize-none" style={inputStyle}
                onFocus={e => e.target.style.borderColor = '#C0392B'}
                onBlur={e => e.target.style.borderColor = '#CED4DA'} />
            </div>

            <div>
              <Label>Autorités à aviser selon le scénario</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {['CNESST', 'Environnement Canada', 'Autorité des marchés financiers (AMF)',
                  'OCRCVM', 'Santé Canada', 'Sécurité publique Québec', 'Autres régulateurs sectoriels'].map(auth => (
                  <button key={auth} type="button"
                    onClick={() => toggleAuthority(auth)}
                    className="px-3 py-1.5 rounded text-sm font-medium transition-colors"
                    style={{
                      backgroundColor: config.authoritiesToNotify.includes(auth) ? '#EBF5FB' : '#F8F9FA',
                      color: config.authoritiesToNotify.includes(auth) ? '#2980B9' : '#6C757D',
                      border: `1px solid ${config.authoritiesToNotify.includes(auth) ? '#AED6F1' : '#DEE2E6'}`,
                    }}>
                    {config.authoritiesToNotify.includes(auth) ? '✓ ' : ''}{auth}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label>Contact média / ligne de communication approuvée</Label>
              <textarea value={config.mediaContact}
                onChange={e => setConfig({ ...config, mediaContact: e.target.value })}
                rows={3}
                placeholder="Ex: Pour toute demande des médias, contacter Marie Tremblay au 514-555-1234. Message approuvé : Notre organisation est en train de gérer la situation et met tout en œuvre pour..."
                className="rounded px-4 py-2.5 text-sm focus:outline-none resize-none" style={inputStyle}
                onFocus={e => e.target.style.borderColor = '#C0392B'}
                onBlur={e => e.target.style.borderColor = '#CED4DA'} />
            </div>
          </div>
        )}

        {/* ── SECTION 7 — Activation et reprise ── */}
        {activeSection === 7 && (
          <div className="space-y-6">
            <h3 className="font-semibold text-lg" style={{ color: '#2C3E50' }}>
              Activation et reprise
            </h3>

            <div>
              <Label>Critères d'activation du PCA</Label>
              <p className="text-xs mb-2" style={{ color: '#ADB5BD' }}>
                Qui peut décider d'activer le PCA et selon quels critères ?
              </p>
              <textarea value={config.activationCriteria}
                onChange={e => setConfig({ ...config, activationCriteria: e.target.value })}
                rows={4}
                placeholder="Ex: Le PCA est activé par le Coordonnateur PCA ou la Direction générale lorsque : (1) l'accès au bâtiment principal est impossible pour plus de 4 heures, (2) les systèmes informatiques critiques sont indisponibles pour plus de 2 heures..."
                className="rounded px-4 py-2.5 text-sm focus:outline-none resize-none" style={inputStyle}
                onFocus={e => e.target.style.borderColor = '#C0392B'}
                onBlur={e => e.target.style.borderColor = '#CED4DA'} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Lieu de coordination alternatif</Label>
                <input type="text" value={config.coordinationLocation}
                  onChange={e => setConfig({ ...config, coordinationLocation: e.target.value })}
                  placeholder="Ex: Salle de conférence — 456 ave des Pins, Montréal"
                  className="rounded px-4 py-2.5 text-sm focus:outline-none" style={inputStyle}
                  onFocus={e => e.target.style.borderColor = '#C0392B'}
                  onBlur={e => e.target.style.borderColor = '#CED4DA'} />
              </div>
              <div>
                <Label>Pont téléphonique d'urgence</Label>
                <input type="text" value={config.emergencyBridge}
                  onChange={e => setConfig({ ...config, emergencyBridge: e.target.value })}
                  placeholder="Ex: 1-800-555-0000 # 12345"
                  className="rounded px-4 py-2.5 text-sm focus:outline-none" style={inputStyle}
                  onFocus={e => e.target.style.borderColor = '#C0392B'}
                  onBlur={e => e.target.style.borderColor = '#CED4DA'} />
              </div>
            </div>

            {/* Lien PMU/PSI */}
            <div>
              <Label>Lien avec un PMU/PSI existant</Label>
              <p className="text-xs mb-2" style={{ color: '#ADB5BD' }}>
                Le PCA peut référencer un PMU ou PSI existant pour le même bâtiment
              </p>
              {linkedPmus.length === 0 ? (
                <div className="p-3 rounded" style={{ backgroundColor: '#F8F9FA', border: '1px solid #E9ECEF' }}>
                  <p className="text-sm" style={{ color: '#ADB5BD' }}>
                    Aucun PMU/PSI validé trouvé pour ce bâtiment
                  </p>
                </div>
              ) : (
                <select value={config.linkedPmuId}
                  onChange={e => setConfig({ ...config, linkedPmuId: e.target.value })}
                  className="rounded px-4 py-2.5 text-sm focus:outline-none" style={inputStyle}
                  onFocus={e => e.target.style.borderColor = '#C0392B'}
                  onBlur={e => e.target.style.borderColor = '#CED4DA'}>
                  <option value="">Aucun lien</option>
                  {linkedPmus.map((p: any) => (
                    <option key={p.id} value={p.id}>
                      {p.documentType} — {p.name} ({p.year})
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>
        )}

        {/* ── SECTION 8 — Exercices et maintien ── */}
        {activeSection === 8 && (
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold text-lg" style={{ color: '#2C3E50' }}>
                Exercices et maintien du plan
              </h3>
              <p className="text-sm mt-1" style={{ color: '#6C757D' }}>
                Basé sur les recommandations du Guide de gestion de la continuité des activités — Gouvernement du Québec
              </p>
            </div>

            {/* Programme d'exercices */}
            <div>
              <h4 className="font-medium mb-4" style={{ color: '#C0392B' }}>Programme d'exercices</h4>
              <div className="space-y-3">
                {[
                  { label: 'Exercice formatif / discussion', field: 'exerciseFormative', recommended: 'Annuel', desc: 'Parcourir le plan avec les intervenants pour identifier les lacunes' },
                  { label: 'Exercice sur table', field: 'exerciseTable', recommended: 'Annuel', desc: 'Simulation scénario en salle — vérifier les rôles et interrelations' },
                  { label: 'Simulation en temps réel', field: 'exerciseSimulation', recommended: 'Tous les 3 ans', desc: 'Exercice complet avec déploiement de ressources sur le terrain' },
                  { label: 'Tests TI / essais techniques', field: 'exerciseIT', recommended: 'Annuel', desc: 'Valider la restauration des systèmes, sauvegardes, délais de reprise' },
                ].map(ex => (
                  <div key={ex.field} className="p-4 rounded" style={{ backgroundColor: '#F8F9FA', border: '1px solid #E9ECEF' }}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <p className="text-sm font-medium" style={{ color: '#2C3E50' }}>{ex.label}</p>
                        <p className="text-xs mt-0.5" style={{ color: '#ADB5BD' }}>{ex.desc}</p>
                        <p className="text-xs mt-1 font-medium" style={{ color: '#27AE60' }}>
                          Recommandé : {ex.recommended}
                        </p>
                      </div>
                      <div style={{ minWidth: '160px' }}>
                        <select value={(config as any)[ex.field]}
                          onChange={e => setConfig({ ...config, [ex.field]: e.target.value })}
                          className="rounded px-3 py-2 text-sm focus:outline-none w-full"
                          style={{ border: '1px solid #CED4DA', color: '#2C3E50', backgroundColor: '#FFFFFF' }}>
                          <option value="Annuel">Annuel</option>
                          <option value="Tous les 2 ans">Tous les 2 ans</option>
                          <option value="Tous les 3 ans">Tous les 3 ans</option>
                          <option value="Sur demande">Sur demande</option>
                          <option value="Non prévu">Non prévu</option>
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Responsable et révision */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Responsable de la mise à jour du plan</Label>
                <input type="text" value={config.planOwner}
                  onChange={e => setConfig({ ...config, planOwner: e.target.value })}
                  placeholder="Ex: Marie Tremblay, Directrice des opérations"
                  className="rounded px-4 py-2.5 text-sm focus:outline-none" style={inputStyle}
                  onFocus={e => e.target.style.borderColor = '#C0392B'}
                  onBlur={e => e.target.style.borderColor = '#CED4DA'} />
              </div>
              <div>
                <Label>Fréquence de révision du plan</Label>
                <select value={config.reviewFrequency}
                  onChange={e => setConfig({ ...config, reviewFrequency: e.target.value })}
                  className="rounded px-4 py-2.5 text-sm focus:outline-none" style={inputStyle}
                  onFocus={e => e.target.style.borderColor = '#C0392B'}
                  onBlur={e => e.target.style.borderColor = '#CED4DA'}>
                  <option value="Annuel">Annuel (recommandé)</option>
                  <option value="Semestriel">Semestriel</option>
                  <option value="Lors de changements significatifs">Lors de changements significatifs</option>
                </select>
              </div>
              <div>
                <Label>Date de la prochaine révision</Label>
                <input type="date" value={config.nextReviewDate}
                  onChange={e => setConfig({ ...config, nextReviewDate: e.target.value })}
                  className="rounded px-4 py-2.5 text-sm focus:outline-none" style={inputStyle}
                  onFocus={e => e.target.style.borderColor = '#C0392B'}
                  onBlur={e => e.target.style.borderColor = '#CED4DA'} />
              </div>
            </div>

            <div className="p-4 rounded" style={{ backgroundColor: '#EAFAF1', border: '1px solid #A9DFBF' }}>
              <p className="text-xs font-semibold mb-1" style={{ color: '#27AE60' }}>
                ✅ Rappel important
              </p>
              <p className="text-xs" style={{ color: '#1E8449' }}>
                La capacité d'une entreprise à maintenir ses activités ne peut être démontrée tant que son plan de continuité des activités n'a pas été exercé. — Guide de gestion de la continuité des activités, Gouvernement du Québec
              </p>
            </div>
          </div>
        )}

      </div>

      {/* Navigation entre sections */}
      <div className="flex justify-between mt-6">
        <button
          onClick={() => setActiveSection(prev => Math.max(1, prev - 1))}
          disabled={activeSection === 1}
          className="flex items-center gap-2 text-sm font-medium px-4 py-2 rounded disabled:opacity-40"
          style={{ border: '1px solid #DEE2E6', color: '#6C757D' }}
          onMouseEnter={e => { if (activeSection > 1) e.currentTarget.style.backgroundColor = '#F8F9FA'; }}
          onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
          <ChevronLeft size={16} /> Section précédente
        </button>

        {activeSection < 8 ? (
          <button
            onClick={() => setActiveSection(prev => Math.min(8, prev + 1))}
            className="flex items-center gap-2 text-sm font-medium px-4 py-2 rounded text-white"
            style={{ backgroundColor: '#C0392B' }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#A93226'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = '#C0392B'}>
            Section suivante <ChevronRight size={16} />
          </button>
        ) : (
          <button
            onClick={async () => { await handleSave(); router.push(`/projects/${projectId}`); }}
            className="flex items-center gap-2 text-sm font-medium px-4 py-2 rounded text-white"
            style={{ backgroundColor: '#27AE60' }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#1E8449'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = '#27AE60'}>
            <Save size={16} /> Terminer la configuration
          </button>
        )}
      </div>
    </AppLayout>
  );
}