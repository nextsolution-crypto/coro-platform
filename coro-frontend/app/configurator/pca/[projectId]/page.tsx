'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';
import api from '@/lib/api';
import AppLayout from '@/components/layout/AppLayout';
import { ArrowLeft, Save, ChevronRight, ChevronLeft } from 'lucide-react';
import { formatPhone } from '@/lib/formatPhone';

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
  const [finalizing, setFinalizing] = useState(false);
  const [finalizationError, setFinalizationError] = useState('');
  const [activeSection, setActiveSection] = useState(1);
  const [project, setProject] = useState<any>(null);
  const [prefill, setPrefill] = useState<any>(null);
  const [linkedPmus, setLinkedPmus] = useState<any[]>([]);
  const [customRegReq, setCustomRegReq] = useState('');
  const hasLoadedRef = useRef(false);
  const lastSavedConfigRef = useRef('');
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve());

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
    alternativeSite: null as boolean | null,
    alternativeSiteAddress: '',
    sharingAgreement: null as boolean | null,
    itRedundancy: null as boolean | null,
    offSiteBackup: null as boolean | null,
    backupFrequency: '',
    criticalITSystems: [] as any[],
    crossTraining: null as boolean | null,
    processDocumented: null as boolean | null,
    tempStaffAccess: null as boolean | null,
    absenteeismThreshold: '',
    alternativeSuppliers: null as boolean | null,
    safetyStock: null as boolean | null,
    safetyStockDuration: '',
    criticalSuppliers: [] as any[],
    generator: null as boolean | null,
    ups: null as boolean | null,
    insuranceBI: null as boolean | null,
    insuranceProperty: null as boolean | null,
    insuranceCyber: null as boolean | null,
    insuranceLastReview: '',

    // Section 6
    internalChannel: '',
    massAlertSystem: null as boolean | null,
    externalChannel: '',
    priorityClients: '',
    authoritiesToNotify: [] as string[],
    mediaContact: '',

    // Section 7
    activationCriteria: '',
    coordinationLocation: '',
    emergencyBridge: '',
    linkedPmuId: '',

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
        const {
          resumptionSequence: _legacyResumptionSequence,
          ...storedConfig
        } = c;

        setConfig(prev => {
  const loadedConfig = {
    ...prev,
    ...storedConfig,
    effectiveDate: c.effectiveDate
      ? new Date(c.effectiveDate).toISOString().split('T')[0]
      : '',
    insuranceLastReview: c.insuranceLastReview
      ? new Date(c.insuranceLastReview).toISOString().split('T')[0]
      : '',
    nextReviewDate: c.nextReviewDate
      ? new Date(c.nextReviewDate).toISOString().split('T')[0]
      : '',

    // Tableaux — toujours normalisés pour éviter null / données invalides
    cellMembers: Array.isArray(c.cellMembers) ? c.cellMembers : [],
    riskScenarios: Array.isArray(c.riskScenarios) ? c.riskScenarios : [],
    criticalServices: Array.isArray(c.criticalServices) ? c.criticalServices : [],
    criticalITSystems: Array.isArray(c.criticalITSystems) ? c.criticalITSystems : [],
    criticalSuppliers: Array.isArray(c.criticalSuppliers) ? c.criticalSuppliers : [],
    regulatoryReqs: Array.isArray(c.regulatoryReqs) ? c.regulatoryReqs : [],
    authoritiesToNotify: Array.isArray(c.authoritiesToNotify) ? c.authoritiesToNotify : [],
  };

  lastSavedConfigRef.current = JSON.stringify(loadedConfig);
  hasLoadedRef.current = true;

  return loadedConfig;
});
      } else {
        // Pré-remplissage depuis les fiches existantes
        const p = configRes.data.prefill;
        setConfig(prev => {
  const initialConfig = {
    ...prev,
    planName: `PCA — ${configRes.data.project.client?.name || ''} ${configRes.data.project.year}`,
    sector: p.sector || p.clientSector || '',
    employeeCount: p.employeeCount || p.clientEmployeeCount || '',
    operatingHours: p.operatingHours || '',
    regulatoryReqs: Array.isArray(p.regulatoryReqs) ? p.regulatoryReqs : [],
    coordinatorFirstName: p.coordinatorFirstName || '',
    coordinatorLastName: p.coordinatorLastName || '',
    coordinatorTitle: p.coordinatorTitle || '',
    coordinatorEmail: p.coordinatorEmail || '',
    coordinatorPhone: p.coordinatorPhone || '',
  };

  lastSavedConfigRef.current = JSON.stringify(initialConfig);
  hasLoadedRef.current = true;

  return initialConfig;
});
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
  if (autosaveTimerRef.current) {
    clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = null;
  }

  const configSnapshot = config;
  const serializedSnapshot = JSON.stringify(configSnapshot);

  const payload = {
    ...configSnapshot,

    effectiveDate: configSnapshot.effectiveDate
      ? new Date(configSnapshot.effectiveDate)
      : null,

    insuranceLastReview: configSnapshot.insuranceLastReview
      ? new Date(configSnapshot.insuranceLastReview)
      : null,

    nextReviewDate: configSnapshot.nextReviewDate
      ? new Date(configSnapshot.nextReviewDate)
      : null,

    employeeCount:
      configSnapshot.employeeCount !== '' &&
      configSnapshot.employeeCount !== null &&
      configSnapshot.employeeCount !== undefined
        ? parseInt(String(configSnapshot.employeeCount), 10)
        : null,
  };

  setSaving(true);

  const saveOperation = saveQueueRef.current
    .catch(() => undefined)
    .then(async () => {
      await api.post(`/pca/configurator/${projectId}`, payload);
      lastSavedConfigRef.current = serializedSnapshot;
    });

  saveQueueRef.current = saveOperation.then(
    () => undefined,
    () => undefined,
  );

  try {
    await saveOperation;

    setSaved(true);
    setTimeout(() => setSaved(false), 3000);

    return true;
  } catch (err) {
    console.error('Erreur sauvegarde PCA:', err);
    throw err;
  } finally {
    setSaving(false);
  }
};

useEffect(() => {
  if (!hasLoadedRef.current || loading) return;

  const serializedConfig = JSON.stringify(config);

  if (serializedConfig === lastSavedConfigRef.current) {
    return;
  }

  if (autosaveTimerRef.current) {
    clearTimeout(autosaveTimerRef.current);
  }

  autosaveTimerRef.current = setTimeout(async () => {
    try {
      await handleSave();
    } catch (err) {
      console.error('Erreur autosauvegarde PCA:', err);
    }
  }, 1500);

  return () => {
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
    }
  };
}, [config, loading]);

const changeSection = async (nextSection: number) => {
  if (nextSection < 1 || nextSection > 8) return;

  const serializedConfig = JSON.stringify(config);

  if (
    hasLoadedRef.current &&
    serializedConfig !== lastSavedConfigRef.current
  ) {
    try {
      await handleSave();
    } catch (err) {
      console.error('Erreur sauvegarde avant changement de section:', err);
      return;
    }
  }

  setActiveSection(nextSection);
};

const handleBackToProject = async () => {
  const serializedConfig = JSON.stringify(config);

  if (
    hasLoadedRef.current &&
    serializedConfig !== lastSavedConfigRef.current
  ) {
    try {
      await handleSave();
    } catch (err) {
      console.error('Erreur sauvegarde avant retour au projet:', err);
      return;
    }
  }

  router.push(`/projects/${projectId}`);
};

const TIME_TO_HOURS: Record<string, number> = {
  '1h': 1,
  '2h': 2,
  '4h': 4,
  '8h': 8,
  '24h': 24,
  '48h': 48,
  '72h': 72,
  '1sem': 168,
  '2sem': 336,
  '1mois': 720,
  'plus': 9999,
};

const IMPACT_LEVEL: Record<string, number> = {
  'NEGLIGEABLE': 1,
  'FAIBLE': 2,
  'MODERE': 3,
  'ELEVE': 4,
  'CRITIQUE': 5,
};

const getBiaWarnings = (service: any) => {
  const warnings: {
    level: 'critical' | 'warning' | 'info';
    message: string;
  }[] = [];

  const rtoHours = TIME_TO_HOURS[service.rto];
  const madHours = TIME_TO_HOURS[service.mad];

  // 1. RTO supérieur au MAD
  if (
    rtoHours &&
    madHours &&
    rtoHours > madHours
  ) {
    warnings.push({
      level: 'critical',
      message:
        'Le RTO est supérieur au MAD. L’activité serait rétablie après la limite maximale d’interruption tolérable.',
    });
  }

  // 2. Impact critique atteint avant le RTO
  const timeImpacts = [
    { field: 'impact4h', hours: 4, label: '4 heures' },
    { field: 'impact24h', hours: 24, label: '24 heures' },
    { field: 'impact72h', hours: 72, label: '72 heures' },
    { field: 'impact7d', hours: 168, label: '7 jours' },
  ];

  const firstCriticalImpact = timeImpacts.find(
    item => service[item.field] === 'CRITIQUE'
  );

  if (
    firstCriticalImpact &&
    rtoHours &&
    rtoHours > firstCriticalImpact.hours
  ) {
    warnings.push({
      level: 'critical',
      message:
        `Les impacts deviennent critiques après ${firstCriticalImpact.label}, mais le RTO est fixé au-delà de ce seuil.`,
    });
  }

  // 3. Priorité faible malgré des impacts élevés ou critiques rapidement
  const earlyHighImpact =
    IMPACT_LEVEL[service.impact4h] >= 4 ||
    IMPACT_LEVEL[service.impact24h] >= 5;

  if (
    earlyHighImpact &&
    ['MOYENNE', 'FAIBLE', ''].includes(service.recoveryPriority || '')
  ) {
    warnings.push({
      level: 'warning',
      message:
        'Les impacts deviennent élevés ou critiques rapidement, mais la priorité de reprise semble faible.',
    });
  }

  // 4. MAD court avec priorité faible
  if (
    madHours &&
    madHours <= 24 &&
    ['MOYENNE', 'FAIBLE', ''].includes(service.recoveryPriority || '')
  ) {
    warnings.push({
      level: 'warning',
      message:
        'Le MAD est de 24 heures ou moins. Une priorité de reprise plus élevée devrait être évaluée.',
    });
  }

  // 5. Mode dégradé plus long que le MAD
  const degradedHours =
    service.degradedModeDuration === 'indefini'
      ? null
      : TIME_TO_HOURS[service.degradedModeDuration];

  if (
    degradedHours &&
    madHours &&
    degradedHours > madHours
  ) {
    warnings.push({
      level: 'warning',
      message:
        'La durée soutenable déclarée du mode dégradé dépasse le MAD. Vérifiez la cohérence entre ces deux paramètres.',
    });
  }

  // 6. Dépendances non documentées
  const hasDependencies =
    (service.internalDependencies || '').trim() ||
    (service.externalDependencies || '').trim() ||
    (service.singlePointsOfFailure || '').trim() ||
    (service.recoveryPrerequisites || '').trim();

  if (!hasDependencies) {
    warnings.push({
      level: 'info',
      message:
        'Aucune dépendance critique ni aucun prérequis de reprise n’est documenté pour cette activité.',
    });
  }

  // 7. Ressources minimales non documentées
  const hasMinimumResources =
    (service.resourcePersonnel || '').trim() ||
    (service.resourceIT || '').trim() ||
    (service.resourceEquipment || '').trim() ||
    (service.resourceSuppliers || '').trim() ||
    (service.resourceSite || '').trim() ||
    (service.resourceEnergy || '').trim();

  if (!hasMinimumResources) {
    warnings.push({
      level: 'info',
      message:
        'Aucune ressource minimale nécessaire à la reprise n’est documentée.',
    });
  }

    return warnings;
};

const getBiaSummary = () => {
  let criticalCount = 0;
  let warningCount = 0;
  let infoCount = 0;
  let compliantActivities = 0;

  config.criticalServices.forEach((service: any) => {
    const warnings = getBiaWarnings(service);

    if (warnings.length === 0) {
      compliantActivities += 1;
    }

    warnings.forEach(warning => {
      if (warning.level === 'critical') {
        criticalCount += 1;
      }

      if (warning.level === 'warning') {
        warningCount += 1;
      }

      if (warning.level === 'info') {
        infoCount += 1;
      }
    });
  });

  return {
    totalActivities: config.criticalServices.length,
    compliantActivities,
    criticalCount,
    warningCount,
    infoCount,
  };
};

  const toggleRisk = (scenarioId: string) => {
    const existing = config.riskScenarios.find((r: any) => r.id === scenarioId);
    if (existing) {
      setConfig(prev => ({ ...prev, riskScenarios: prev.riskScenarios.filter((r: any) => r.id !== scenarioId) }));
    } else {
      setConfig(prev => ({
  ...prev,
  riskScenarios: [
    ...prev.riskScenarios,
    {
      id: scenarioId,
      probability: '',
      impact: '',
      customScenario: '',
      consequences: '',
      affectedActivities: '',
      dependencies: '',
      existingControls: '',
      riskOwner: '',
      treatmentActions: '',
      comments: '',
    },
  ],
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
    criticalServices: [
      ...prev.criticalServices,
      {
        id: Date.now().toString(),

        // Identification
        name: '',
        owner: '',
        recoveryPriority: '',

        // Objectifs de continuité
        minServiceLevel: '',
        rto: '',
        rpo: '',
        mad: '',

        // Impacts
        financialImpact: '',
        reputationalImpact: '',
        legalImpact: null,

        // Évolution des impacts dans le temps
        impact4h: '',
        impact24h: '',
        impact72h: '',
        impact7d: '',

        // Dépendances
        internalDependencies: '',
        externalDependencies: '',
        singlePointsOfFailure: '',
        recoveryPrerequisites: '',

        // Exploitation en mode dégradé
        criticalPeriods: '',
        degradedMode: '',
        degradedModeDuration: '',

        // Ressources minimales
        resourcePersonnel: '',
        resourceIT: '',
        resourceEquipment: '',
        resourceSuppliers: '',
        resourceSite: '',
        resourceEnergy: '',
      },
    ],
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
  responsibilities: '',
  alternate: '',
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
  if (req === 'Autre') return;

  setConfig(prev => ({
    ...prev,
    regulatoryReqs: prev.regulatoryReqs.includes(req)
      ? prev.regulatoryReqs.filter(r => r !== req)
      : [...prev.regulatoryReqs, req],
  }));
};

const addCustomRegReq = () => {
  const value = customRegReq.trim();

  if (!value) return;

  setConfig(prev => ({
    ...prev,
    regulatoryReqs: prev.regulatoryReqs.includes(value)
      ? prev.regulatoryReqs
      : [...prev.regulatoryReqs, value],
  }));

  setCustomRegReq('');
};

const removeRegReq = (req: string) => {
  setConfig(prev => ({
    ...prev,
    regulatoryReqs: prev.regulatoryReqs.filter(
      r => r !== req
    ),
  }));
};

  const addITSystem = () => {
    setConfig(prev => ({
      ...prev,
      criticalITSystems: [...prev.criticalITSystems, {
        id: Date.now().toString(),
        name: '',
        rto: '',
        rpo: '',
        degradedMode: '',
        backupSolution: '',
      }],
    }));
  };

  const updateITSystem = (id: string, field: string, value: string) => {
    setConfig(prev => ({
      ...prev,
      criticalITSystems: prev.criticalITSystems.map((s: any) =>
        s.id === id ? { ...s, [field]: value } : s
      ),
    }));
  };

  const removeITSystem = (id: string) => {
    setConfig(prev => ({
      ...prev,
      criticalITSystems: prev.criticalITSystems.filter((s: any) => s.id !== id),
    }));
  };

  const addCriticalSupplier = () => {
    setConfig(prev => ({
      ...prev,
      criticalSuppliers: [...prev.criticalSuppliers, {
        id: Date.now().toString(),
        name: '',
        service: '',
        tolerance: '',
        preventiveMeasure: '',
        backupSolution: '',
        activationDelay: '',
        status: 'A_CONFIRMER',
      }],
    }));
  };

  const updateCriticalSupplier = (id: string, field: string, value: string) => {
    setConfig(prev => ({
      ...prev,
      criticalSuppliers: prev.criticalSuppliers.map((s: any) =>
        s.id === id ? { ...s, [field]: value } : s
      ),
    }));
  };

  const removeCriticalSupplier = (id: string) => {
    setConfig(prev => ({
      ...prev,
      criticalSuppliers: prev.criticalSuppliers.filter((s: any) => s.id !== id),
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

  const handlePhoneChange = (field: string, value: string) => {
    setConfig(prev => ({ ...prev, [field]: formatPhone(value) }));
  };

  const BoolField = ({
    label,
    field,
    hint,
  }: {
    label: string;
    field: string;
    hint?: string;
  }) => {
    const options = [
      {
        label: 'Oui',
        value: true,
        backgroundColor: '#EAFAF1',
        color: '#27AE60',
        borderColor: '#A9DFBF',
      },
      {
        label: 'Non',
        value: false,
        backgroundColor: '#FDEDEC',
        color: '#C0392B',
        borderColor: '#F1948A',
      },
      {
        label: 'À déterminer',
        value: null,
        backgroundColor: '#F8F9FA',
        color: '#6C757D',
        borderColor: '#CED4DA',
      },
    ];

    return (
      <div
        className="flex items-start justify-between gap-4 py-3"
        style={{ borderBottom: '1px solid #F1F3F5' }}
      >
        <div>
          <p
            className="text-sm font-medium"
            style={{ color: '#2C3E50' }}
          >
            {label}
          </p>

          {hint && (
            <p
              className="text-xs mt-0.5"
              style={{ color: '#ADB5BD' }}
            >
              {hint}
            </p>
          )}
        </div>

        <div className="flex gap-2 flex-shrink-0">
          {options.map(option => {
            const isSelected =
              (config as any)[field] === option.value;

            return (
              <button
                key={option.label}
                type="button"
                onClick={() =>
                  setConfig(prev => ({
                    ...prev,
                    [field]: option.value,
                  }))
                }
                className="px-4 py-1.5 rounded text-sm font-medium transition-colors"
                style={{
                  backgroundColor: isSelected
                    ? option.backgroundColor
                    : '#FFFFFF',
                  color: isSelected
                    ? option.color
                    : '#6C757D',
                  border: `1px solid ${
                    isSelected
                      ? option.borderColor
                      : '#DEE2E6'
                  }`,
                }}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

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
          <button onClick={handleBackToProject}
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
          <button key={s.id} onClick={() => changeSection(s.id)}
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
  <Label>Exigences réglementaires, normatives ou contractuelles</Label>
  <p className="text-xs mb-3" style={{ color: '#ADB5BD' }}>
    Identifiez les normes, exigences légales, obligations sectorielles, certifications
    ou engagements contractuels pouvant influencer la continuité des activités.
  </p>

  <div className="flex flex-wrap gap-2">
    {REGULATORY_REQS.filter(req => req !== 'Autre').map(req => (
      <button
        key={req}
        type="button"
        onClick={() => toggleRegReq(req)}
        className="px-3 py-1.5 rounded text-sm font-medium transition-colors"
        style={{
          backgroundColor: config.regulatoryReqs.includes(req) ? '#EBF5FB' : '#F8F9FA',
          color: config.regulatoryReqs.includes(req) ? '#2980B9' : '#6C757D',
          border: `1px solid ${
            config.regulatoryReqs.includes(req) ? '#AED6F1' : '#DEE2E6'
          }`,
        }}
      >
        {config.regulatoryReqs.includes(req) ? '✓ ' : ''}
        {req}
      </button>
    ))}
  </div>

  <div className="mt-4">
    <Label>Autre exigence</Label>

    <div className="flex flex-col sm:flex-row gap-2">
      <input
        type="text"
        value={customRegReq}
        onChange={e => setCustomRegReq(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter') {
            e.preventDefault();
            addCustomRegReq();
          }
        }}
        placeholder="Ex: Exigence client SLA, norme sectorielle, règlement interne..."
        className="rounded px-4 py-2.5 text-sm focus:outline-none flex-1"
        style={inputStyle}
        onFocus={e => e.target.style.borderColor = '#C0392B'}
        onBlur={e => e.target.style.borderColor = '#CED4DA'}
      />

      <button
        type="button"
        onClick={addCustomRegReq}
        className="px-4 py-2.5 rounded text-sm font-medium"
        style={{
          border: '1px solid #AED6F1',
          color: '#2980B9',
          backgroundColor: '#FFFFFF',
        }}
      >
        + Ajouter
      </button>
    </div>
  </div>

  {config.regulatoryReqs.filter(req => !REGULATORY_REQS.includes(req)).length > 0 && (
    <div className="mt-3 flex flex-wrap gap-2">
      {config.regulatoryReqs
        .filter(req => !REGULATORY_REQS.includes(req))
        .map(req => (
          <div
            key={req}
            className="flex items-center gap-2 px-3 py-1.5 rounded text-sm"
            style={{
              backgroundColor: '#EBF5FB',
              color: '#2980B9',
              border: '1px solid #AED6F1',
            }}
          >
            <span>{req}</span>

            <button
              type="button"
              onClick={() => removeRegReq(req)}
              style={{ color: '#6C757D' }}
              title="Supprimer"
            >
              ×
            </button>
          </div>
        ))}
    </div>
  )}
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
                                    { label: 'Téléphone', field: 'coordinatorPhone', placeholder: 'Ex: (514) 555-1234' },
                ].map(f => (
                  <div key={f.field}>
                    <Label>{f.label}</Label>
                    <input type="text" value={(config as any)[f.field]}
                      onChange={e => f.field.includes('Phone')
                        ? handlePhoneChange(f.field, e.target.value)
                        : setConfig({ ...config, [f.field]: e.target.value })}
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
                  { label: 'Téléphone', field: 'substitutePhone', placeholder: 'Ex: (514) 555-5678' },
                ].map(f => (
                  <div key={f.field}>
                    <Label>{f.label}</Label>
                    <input type="text" value={(config as any)[f.field]}
                      onChange={e => f.field.includes('Phone')
                        ? handlePhoneChange(f.field, e.target.value)
                        : setConfig({ ...config, [f.field]: e.target.value })}
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
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-2">
                        <div>
                          <Label>Rôle</Label>
                          <input type="text" value={member.role || ''}
                            onChange={e => updateCellMember(member.id, 'role', e.target.value)}
                            placeholder="Ex: Responsable TI"
                            className="rounded px-3 py-2 text-sm focus:outline-none" style={inputStyle}
                            onFocus={e => e.target.style.borderColor = '#C0392B'}
                            onBlur={e => e.target.style.borderColor = '#CED4DA'} />
                        </div>
                        <div>
                          <Label>Prénom</Label>
                          <input type="text" value={member.firstName || ''}
                            onChange={e => updateCellMember(member.id, 'firstName', e.target.value)}
                            placeholder="Prénom"
                            className="rounded px-3 py-2 text-sm focus:outline-none" style={inputStyle}
                            onFocus={e => e.target.style.borderColor = '#C0392B'}
                            onBlur={e => e.target.style.borderColor = '#CED4DA'} />
                        </div>
                        <div>
                          <Label>Nom</Label>
                          <input type="text" value={member.lastName || ''}
                            onChange={e => updateCellMember(member.id, 'lastName', e.target.value)}
                            placeholder="Nom"
                            className="rounded px-3 py-2 text-sm focus:outline-none" style={inputStyle}
                            onFocus={e => e.target.style.borderColor = '#C0392B'}
                            onBlur={e => e.target.style.borderColor = '#CED4DA'} />
                        </div>
                        <div>
  <Label>Courriel</Label>
  <input
    type="email"
    value={member.email || ''}
    onChange={e =>
      updateCellMember(member.id, 'email', e.target.value)
    }
    placeholder="courriel@entreprise.ca"
    className="rounded px-3 py-2 text-sm focus:outline-none"
    style={inputStyle}
    onFocus={e => e.target.style.borderColor = '#C0392B'}
    onBlur={e => e.target.style.borderColor = '#CED4DA'}
  />
</div>

<div>
  <Label>Téléphone</Label>
  <input
    type="text"
    value={member.phone || ''}
    onChange={e =>
      updateCellMember(
        member.id,
        'phone',
        formatPhone(e.target.value)
      )
    }
    placeholder="(514) 555-0000"
    className="rounded px-3 py-2 text-sm focus:outline-none"
    style={inputStyle}
    onFocus={e => e.target.style.borderColor = '#C0392B'}
    onBlur={e => e.target.style.borderColor = '#CED4DA'}
  />
</div>

<div>
  <Label>Substitut / relève</Label>
  <input
    type="text"
    value={member.alternate || ''}
    onChange={e =>
      updateCellMember(
        member.id,
        'alternate',
        e.target.value
      )
    }
    placeholder="Ex: Jean Côté — Directeur adjoint"
    className="rounded px-3 py-2 text-sm focus:outline-none"
    style={inputStyle}
    onFocus={e => e.target.style.borderColor = '#C0392B'}
    onBlur={e => e.target.style.borderColor = '#CED4DA'}
  />
</div>

<div className="col-span-2 sm:col-span-3">
  <Label>Responsabilités en situation de continuité</Label>
  <textarea
    value={member.responsibilities || ''}
    onChange={e =>
      updateCellMember(
        member.id,
        'responsibilities',
        e.target.value
      )
    }
    rows={2}
    placeholder="Ex: Évaluer l'état des systèmes, coordonner la relève TI, communiquer l'heure estimée de rétablissement à la cellule..."
    className="rounded px-3 py-2 text-sm focus:outline-none resize-none"
    style={inputStyle}
    onFocus={e => e.target.style.borderColor = '#C0392B'}
    onBlur={e => e.target.style.borderColor = '#CED4DA'}
  />
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
  Identifiez les scénarios susceptibles d'interrompre les activités, leurs conséquences,
  les activités et dépendances exposées ainsi que les mesures de contrôle déjà en place.
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
  <div className="ml-8 space-y-3">

    {scenario.id === 'autre' && (
      <div>
        <Label>Description du scénario</Label>
        <input
          type="text"
          value={risk.customScenario || ''}
          onChange={e =>
            updateRisk(scenario.id, 'customScenario', e.target.value)
          }
          placeholder="Ex: Indisponibilité prolongée du centre de distribution principal"
          className="rounded px-3 py-2 text-sm focus:outline-none"
          style={inputStyle}
          onFocus={e => e.target.style.borderColor = '#C0392B'}
          onBlur={e => e.target.style.borderColor = '#CED4DA'}
        />
      </div>
    )}

    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <Label>Probabilité</Label>
                            <select
  value={risk.probability || ''}
  onChange={e => updateRisk(scenario.id, 'probability', e.target.value)}
  className="rounded px-3 py-2 text-sm focus:outline-none"
  style={inputStyle}
>
  <option value="">À évaluer...</option>
  <option value="FAIBLE">1 — Faible (peu probable)</option>
  <option value="MOYENNE">2 — Moyenne (probable)</option>
  <option value="ELEVEE">3 — Élevée (très probable)</option>
</select>
                          </div>
                          <div>
                            <Label>Impact sur les activités</Label>
                            <select
  value={risk.impact || ''}
  onChange={e => updateRisk(scenario.id, 'impact', e.target.value)}
  className="rounded px-3 py-2 text-sm focus:outline-none"
  style={inputStyle}
>
  <option value="">À évaluer...</option>
  <option value="FAIBLE">1 — Faible (effets limités)</option>
  <option value="MOYEN">2 — Modéré (activités ralenties)</option>
  <option value="ELEVE">3 — Sévère (activités inopérantes)</option>
</select>
                          </div>
                        </div>
                        {/* Niveau de risque calculé */}
{(() => {
  if (!risk.probability || !risk.impact) {
    return (
      <div
        className="flex items-center gap-2 px-3 py-2 rounded text-xs font-bold"
        style={{
          backgroundColor: '#F8F9FA',
          border: '1px solid #DEE2E6',
          color: '#6C757D',
        }}
      >
        Niveau de risque : À déterminer
        <span className="font-normal ml-1">
          — renseignez la probabilité et l'impact
        </span>
      </div>
    );
  }

  const p =
    risk.probability === 'ELEVEE'
      ? 3
      : risk.probability === 'MOYENNE'
        ? 2
        : 1;

  const i =
    risk.impact === 'ELEVE'
      ? 3
      : risk.impact === 'MOYEN'
        ? 2
        : 1;

  const score = p * i;
  const label =
    score >= 6
      ? 'ÉLEVÉ'
      : score >= 3
        ? 'MOYEN'
        : 'FAIBLE';

  const color =
    score >= 6
      ? '#C0392B'
      : score >= 3
        ? '#F39C12'
        : '#27AE60';

  const bg =
    score >= 6
      ? '#FDEDEC'
      : score >= 3
        ? '#FEF9E7'
        : '#EAFAF1';

  const border =
    score >= 6
      ? '#F1948A'
      : score >= 3
        ? '#FAD7A0'
        : '#A9DFBF';

  return (
    <div
      className="flex items-center gap-2 px-3 py-2 rounded text-xs font-bold"
      style={{
        backgroundColor: bg,
        border: `1px solid ${border}`,
        color,
      }}
    >
      Niveau de risque : {score} — {label}

      <span
        className="font-normal ml-1"
        style={{ color: '#6C757D' }}
      >
        (Probabilité {p} × Impact {i} = {score})
      </span>
    </div>
  );
})()}
                        <div>
  <Label>Conséquences possibles sur l'organisation</Label>
  <textarea
    value={risk.consequences || ''}
    onChange={e =>
      updateRisk(scenario.id, 'consequences', e.target.value)
    }
    rows={2}
    placeholder="Ex: Perte d'accès au site, arrêt des opérations, perte de revenus, incapacité à servir certains clients..."
    className="rounded px-3 py-2 text-sm focus:outline-none resize-none"
    style={inputStyle}
    onFocus={e => e.target.style.borderColor = '#C0392B'}
    onBlur={e => e.target.style.borderColor = '#CED4DA'}
  />
</div>

<div>
  <Label>Activités ou services susceptibles d'être touchés</Label>
  <textarea
    value={risk.affectedActivities || ''}
    onChange={e =>
      updateRisk(scenario.id, 'affectedActivities', e.target.value)
    }
    rows={2}
    placeholder="Ex: Réception des commandes, expédition, service à la clientèle, facturation..."
    className="rounded px-3 py-2 text-sm focus:outline-none resize-none"
    style={inputStyle}
    onFocus={e => e.target.style.borderColor = '#C0392B'}
    onBlur={e => e.target.style.borderColor = '#CED4DA'}
  />
</div>

<div>
  <Label>Dépendances ou concentrations de risque</Label>
  <textarea
    value={risk.dependencies || ''}
    onChange={e =>
      updateRisk(scenario.id, 'dependencies', e.target.value)
    }
    rows={2}
    placeholder="Ex: Site unique, ERP central, fournisseur unique, personnel spécialisé, lien Internet principal..."
    className="rounded px-3 py-2 text-sm focus:outline-none resize-none"
    style={inputStyle}
    onFocus={e => e.target.style.borderColor = '#C0392B'}
    onBlur={e => e.target.style.borderColor = '#CED4DA'}
  />
</div>

<div>
  <Label>Mesures de contrôle existantes</Label>
  <textarea
    value={risk.existingControls || ''}
    onChange={e =>
      updateRisk(scenario.id, 'existingControls', e.target.value)
    }
    rows={2}
    placeholder="Ex: Détection incendie, génératrice, fournisseur secondaire, MFA, sauvegardes hors site..."
    className="rounded px-3 py-2 text-sm focus:outline-none resize-none"
    style={inputStyle}
    onFocus={e => e.target.style.borderColor = '#C0392B'}
    onBlur={e => e.target.style.borderColor = '#CED4DA'}
  />
</div>

<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
  <div>
    <Label>Responsable du suivi du risque</Label>
    <input
      type="text"
      value={risk.riskOwner || ''}
      onChange={e =>
        updateRisk(scenario.id, 'riskOwner', e.target.value)
      }
      placeholder="Ex: Directeur TI, Directrice des opérations..."
      className="rounded px-3 py-2 text-sm focus:outline-none"
      style={inputStyle}
      onFocus={e => e.target.style.borderColor = '#C0392B'}
      onBlur={e => e.target.style.borderColor = '#CED4DA'}
    />
  </div>

  <div>
    <Label>Mesures additionnelles à mettre en œuvre</Label>
    <input
      type="text"
      value={risk.treatmentActions || ''}
      onChange={e =>
        updateRisk(scenario.id, 'treatmentActions', e.target.value)
      }
      placeholder="Ex: Contractualiser un fournisseur secondaire"
      className="rounded px-3 py-2 text-sm focus:outline-none"
      style={inputStyle}
      onFocus={e => e.target.style.borderColor = '#C0392B'}
      onBlur={e => e.target.style.borderColor = '#CED4DA'}
    />
  </div>
</div>

<div>
  <Label>Commentaires complémentaires</Label>
  <textarea
    value={risk.comments || ''}
    onChange={e =>
      updateRisk(scenario.id, 'comments', e.target.value)
    }
    rows={2}
    placeholder="Observations, hypothèses, contraintes ou informations complémentaires..."
    className="rounded px-3 py-2 text-sm focus:outline-none resize-none"
    style={inputStyle}
    onFocus={e => e.target.style.borderColor = '#C0392B'}
    onBlur={e => e.target.style.borderColor = '#CED4DA'}
  />
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
  Identifiez les activités essentielles, évaluez l'évolution de leurs impacts dans le temps,
  leurs dépendances et les ressources nécessaires afin de déterminer les priorités et objectifs de reprise.
</p>
              </div>
              <button onClick={addCriticalService}
                className="text-sm font-medium px-4 py-2 rounded text-white transition-colors flex-shrink-0"
                style={{ backgroundColor: '#C0392B' }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#A93226'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = '#C0392B'}>
                + Ajouter une activité
              </button>
            </div>

            {config.criticalServices.length > 0 && (() => {
  const summary = getBiaSummary();

  const hasCritical = summary.criticalCount > 0;
  const hasWarnings = summary.warningCount > 0;

  const statusLabel = hasCritical
    ? 'Anomalies critiques détectées'
    : hasWarnings
      ? 'Points de cohérence à vérifier'
      : 'BIA cohérent';

  const statusColor = hasCritical
    ? '#C0392B'
    : hasWarnings
      ? '#F39C12'
      : '#27AE60';

  const statusBackground = hasCritical
    ? '#FDEDEC'
    : hasWarnings
      ? '#FEF9E7'
      : '#EAFAF1';

  const statusBorder = hasCritical
    ? '#F1948A'
    : hasWarnings
      ? '#FAD7A0'
      : '#A9DFBF';

  return (
    <div
      className="p-4 rounded"
      style={{
        backgroundColor: statusBackground,
        border: `1px solid ${statusBorder}`,
      }}
    >
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">

        <div>
          <p
            className="text-sm font-semibold"
            style={{ color: statusColor }}
          >
            Contrôle de cohérence du BIA — {statusLabel}
          </p>

          <p
            className="text-xs mt-1"
            style={{ color: '#6C757D' }}
          >
            Analyse automatique des objectifs de reprise, impacts,
            priorités, dépendances et ressources minimales.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">

          <div
            className="px-3 py-2 rounded text-center"
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #DEE2E6',
            }}
          >
            <p
              className="text-lg font-bold"
              style={{ color: '#2C3E50' }}
            >
              {summary.totalActivities}
            </p>

            <p
              className="text-xs"
              style={{ color: '#6C757D' }}
            >
              Activités
            </p>
          </div>

          <div
            className="px-3 py-2 rounded text-center"
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #A9DFBF',
            }}
          >
            <p
              className="text-lg font-bold"
              style={{ color: '#27AE60' }}
            >
              {summary.compliantActivities}
            </p>

            <p
              className="text-xs"
              style={{ color: '#6C757D' }}
            >
              Sans écart
            </p>
          </div>

          <div
            className="px-3 py-2 rounded text-center"
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #F1948A',
            }}
          >
            <p
              className="text-lg font-bold"
              style={{ color: '#C0392B' }}
            >
              {summary.criticalCount}
            </p>

            <p
              className="text-xs"
              style={{ color: '#6C757D' }}
            >
              Critiques
            </p>
          </div>

          <div
            className="px-3 py-2 rounded text-center"
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #FAD7A0',
            }}
          >
            <p
              className="text-lg font-bold"
              style={{ color: '#F39C12' }}
            >
              {summary.warningCount}
            </p>

            <p
              className="text-xs"
              style={{ color: '#6C757D' }}
            >
              Avertissements
            </p>
          </div>

          <div
            className="px-3 py-2 rounded text-center"
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #AED6F1',
            }}
          >
            <p
              className="text-lg font-bold"
              style={{ color: '#2980B9' }}
            >
              {summary.infoCount}
            </p>

            <p
              className="text-xs"
              style={{ color: '#6C757D' }}
            >
              Informations
            </p>
          </div>

        </div>
      </div>
    </div>
  );
})()}

            <div className="p-3 rounded" style={{ backgroundColor: '#EBF5FB', border: '1px solid #AED6F1' }}>
              <p className="text-xs font-semibold mb-1" style={{ color: '#2980B9' }}>
                ℹ️ Définitions (ISO 22301 / Guide Québec)
              </p>
              <div className="grid grid-cols-3 gap-3">
                {[
  {
    term: 'RTO',
    def: 'Recovery Time Objective — Objectif de délai pour rétablir l’activité ou le service',
  },
  {
    term: 'RPO',
    def: 'Recovery Point Objective — Quantité maximale de données pouvant être perdue',
  },
  {
    term: 'MAD',
    def: 'Maximum Allowable Downtime — Durée maximale d’interruption tolérable avant que les impacts deviennent inacceptables',
  },
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
  Aucune activité essentielle définie. Cliquez sur "Ajouter une activité" pour commencer.
</p>
              </div>
            ) : (
              <div className="space-y-4">
                {config.criticalServices.map((service: any, index: number) => (
                  <div key={service.id} className="p-5 rounded" style={{ backgroundColor: '#F8F9FA', border: '1px solid #E9ECEF' }}>
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-medium" style={{ color: '#2C3E50' }}>
                        Activité essentielle #{index + 1}
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
                        <Label required>Produit, service ou activité essentielle</Label>
<input
  type="text"
  value={service.name || ''}
  onChange={e => updateService(service.id, 'name', e.target.value)}
  placeholder="Ex: Traitement des commandes clients"
  className="rounded px-4 py-2.5 text-sm focus:outline-none"
  style={inputStyle}
  onFocus={e => e.target.style.borderColor = '#C0392B'}
  onBlur={e => e.target.style.borderColor = '#CED4DA'}
/>
                      </div>
                      <div>
  <Label>Responsable de l'activité</Label>
  <input
    type="text"
    value={service.owner || ''}
    onChange={e => updateService(service.id, 'owner', e.target.value)}
    placeholder="Ex: Directrice du service à la clientèle"
    className="rounded px-4 py-2.5 text-sm focus:outline-none"
    style={inputStyle}
    onFocus={e => e.target.style.borderColor = '#C0392B'}
    onBlur={e => e.target.style.borderColor = '#CED4DA'}
  />
</div>

<div>
  <Label>Priorité de reprise</Label>
  <select
    value={service.recoveryPriority || ''}
    onChange={e => updateService(service.id, 'recoveryPriority', e.target.value)}
    className="rounded px-4 py-2.5 text-sm focus:outline-none"
    style={inputStyle}
  >
    <option value="">À déterminer...</option>
    <option value="CRITIQUE">Critique — reprise prioritaire immédiate</option>
    <option value="ELEVEE">Élevée — reprise prioritaire</option>
    <option value="MOYENNE">Moyenne — reprise après les fonctions prioritaires</option>
    <option value="FAIBLE">Faible — reprise différable</option>
  </select>
</div>

<div className="sm:col-span-2">
  <Label>Niveau de service minimum acceptable</Label>
  <input
    type="text"
    value={service.minServiceLevel || ''}
    onChange={e => updateService(service.id, 'minServiceLevel', e.target.value)}
    placeholder="Ex: Traiter au moins 50% des commandes urgentes"
    className="rounded px-4 py-2.5 text-sm focus:outline-none"
    style={inputStyle}
    onFocus={e => e.target.style.borderColor = '#C0392B'}
    onBlur={e => e.target.style.borderColor = '#CED4DA'}
  />
</div>
                      <div>
                        <Label>RTO (Délai de reprise max.)</Label>
                        <select value={service.rto || ''}
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
                        <select value={service.rpo || ''}
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
                        <select value={service.mad || ''}
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
                        <select value={service.financialImpact || ''}
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
  <select
    value={service.reputationalImpact || ''}
    onChange={e => updateService(service.id, 'reputationalImpact', e.target.value)}
    className="rounded px-4 py-2.5 text-sm focus:outline-none"
    style={inputStyle}
  >
    <option value="">À évaluer...</option>
    <option value="FAIBLE">Faible</option>
    <option value="MOYEN">Modéré</option>
    <option value="ELEVE">Élevé</option>
    <option value="CRITIQUE">Critique</option>
  </select>
</div>
                      <div className="sm:col-span-2">
  <Label>Impact légal, réglementaire ou contractuel</Label>

  <div className="flex flex-wrap gap-2">
    {[
      { label: 'Oui', value: true },
      { label: 'Non', value: false },
      { label: 'À déterminer', value: null },
    ].map(option => {
      const isSelected = service.legalImpact === option.value;

      return (
        <button
          key={option.label}
          type="button"
          onClick={() => updateService(service.id, 'legalImpact', option.value)}
          className="px-4 py-2 rounded text-sm font-medium transition-colors"
          style={{
            backgroundColor: isSelected ? '#EBF5FB' : '#FFFFFF',
            color: isSelected ? '#2980B9' : '#6C757D',
            border: `1px solid ${isSelected ? '#AED6F1' : '#DEE2E6'}`,
          }}
        >
          {option.label}
        </button>
      );
    })}
  </div>
</div>

<div
  className="sm:col-span-2 pt-4 mt-2"
  style={{ borderTop: '1px solid #E9ECEF' }}
>
  <p
    className="text-xs font-bold uppercase mb-1"
    style={{ color: '#ADB5BD', letterSpacing: '0.08em' }}
  >
    Évolution des impacts dans le temps
  </p>

  <p className="text-xs mb-3" style={{ color: '#6C757D' }}>
    Évaluez l'importance des conséquences si l'activité demeure interrompue.
    Cette évolution aide à déterminer la tolérance maximale et les objectifs de reprise.
  </p>

  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
    {[
      { key: 'impact4h', label: 'Après 4 heures' },
      { key: 'impact24h', label: 'Après 24 heures' },
      { key: 'impact72h', label: 'Après 72 heures' },
      { key: 'impact7d', label: 'Après 7 jours' },
    ].map(item => (
      <div key={item.key}>
        <Label>{item.label}</Label>

        <select
          value={service[item.key] || ''}
          onChange={e =>
            updateService(service.id, item.key, e.target.value)
          }
          className="rounded px-3 py-2 text-sm focus:outline-none"
          style={inputStyle}
        >
          <option value="">À évaluer...</option>
          <option value="NEGLIGEABLE">Négligeable</option>
          <option value="FAIBLE">Faible</option>
          <option value="MODERE">Modéré</option>
          <option value="ELEVE">Élevé</option>
          <option value="CRITIQUE">Critique</option>
        </select>
      </div>
    ))}
  </div>
</div>

<div
  className="sm:col-span-2 pt-4 mt-2"
  style={{ borderTop: '1px solid #E9ECEF' }}
>
  <p
    className="text-xs font-bold uppercase mb-1"
    style={{ color: '#ADB5BD', letterSpacing: '0.08em' }}
  >
    Dépendances critiques
  </p>

  <p className="text-xs mb-3" style={{ color: '#6C757D' }}>
    Identifiez les ressources, fonctions et conditions nécessaires au maintien
    ou à la reprise de cette activité.
  </p>

  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
    <div>
      <Label>Dépendances internes</Label>
      <textarea
        value={service.internalDependencies || ''}
        onChange={e =>
          updateService(service.id, 'internalDependencies', e.target.value)
        }
        rows={2}
        placeholder="Ex: Finance, entrepôt, service TI, ressources humaines..."
        className="rounded px-4 py-2.5 text-sm focus:outline-none resize-none"
        style={inputStyle}
        onFocus={e => e.target.style.borderColor = '#C0392B'}
        onBlur={e => e.target.style.borderColor = '#CED4DA'}
      />
    </div>

    <div>
      <Label>Dépendances externes</Label>
      <textarea
        value={service.externalDependencies || ''}
        onChange={e =>
          updateService(service.id, 'externalDependencies', e.target.value)
        }
        rows={2}
        placeholder="Ex: Fournisseur ERP, transporteur, télécommunications, sous-traitant..."
        className="rounded px-4 py-2.5 text-sm focus:outline-none resize-none"
        style={inputStyle}
        onFocus={e => e.target.style.borderColor = '#C0392B'}
        onBlur={e => e.target.style.borderColor = '#CED4DA'}
      />
    </div>

    <div>
      <Label>Points uniques de défaillance</Label>
      <textarea
        value={service.singlePointsOfFailure || ''}
        onChange={e =>
          updateService(service.id, 'singlePointsOfFailure', e.target.value)
        }
        rows={2}
        placeholder="Ex: Une seule personne formée, site unique, lien Internet unique..."
        className="rounded px-4 py-2.5 text-sm focus:outline-none resize-none"
        style={inputStyle}
        onFocus={e => e.target.style.borderColor = '#C0392B'}
        onBlur={e => e.target.style.borderColor = '#CED4DA'}
      />
    </div>

    <div>
      <Label>Prérequis à la reprise</Label>
      <textarea
        value={service.recoveryPrerequisites || ''}
        onChange={e =>
          updateService(service.id, 'recoveryPrerequisites', e.target.value)
        }
        rows={2}
        placeholder="Ex: VPN disponible, ERP restauré, 4 employés présents, fournisseur confirmé..."
        className="rounded px-4 py-2.5 text-sm focus:outline-none resize-none"
        style={inputStyle}
        onFocus={e => e.target.style.borderColor = '#C0392B'}
        onBlur={e => e.target.style.borderColor = '#CED4DA'}
      />
    </div>
  </div>
</div>

                      {/* ── Champs enrichis BIA ── */}
                      <div className="sm:col-span-2 pt-3 mt-1" style={{ borderTop: '1px solid #E9ECEF' }}>
                        <p
  className="text-xs font-bold uppercase mb-3"
  style={{ color: '#ADB5BD', letterSpacing: '0.08em' }}
>
  Exploitation en mode dégradé
</p>
                      </div>

                      <div>
                        <Label>Périodes critiques</Label>
                        <input type="text" value={service.criticalPeriods || ''}
                          onChange={e => updateService(service.id, 'criticalPeriods', e.target.value)}
                          placeholder="Ex: Fin de mois, périodes de pointe saisonnières, jours fériés"
                          className="rounded px-4 py-2.5 text-sm focus:outline-none" style={inputStyle}
                          onFocus={e => e.target.style.borderColor = '#C0392B'}
                          onBlur={e => e.target.style.borderColor = '#CED4DA'} />
                      </div>

                      <div className="sm:col-span-2">
                        <Label>Mode dégradé documenté</Label>
                        <textarea value={service.degradedMode || ''}
                          onChange={e => updateService(service.id, 'degradedMode', e.target.value)}
                          rows={2}
                          placeholder="Ex: Réception des commandes par téléphone/courriel, registre temporaire papier, saisie différée dans l'ERP"
                          className="rounded px-4 py-2.5 text-sm focus:outline-none resize-none" style={inputStyle}
                          onFocus={e => e.target.style.borderColor = '#C0392B'}
                          onBlur={e => e.target.style.borderColor = '#CED4DA'} />
                      </div>

                      <div>
                        <Label>Durée soutenable du mode dégradé</Label>
                        <select value={service.degradedModeDuration || ''}
                          onChange={e => updateService(service.id, 'degradedModeDuration', e.target.value)}
                          className="rounded px-4 py-2.5 text-sm focus:outline-none" style={inputStyle}>
                          <option value="">Sélectionner...</option>
                          <option value="2h">2 heures</option>
                          <option value="4h">4 heures</option>
                          <option value="8h">8 heures (1 journée)</option>
                          <option value="24h">24 heures</option>
                          <option value="48h">48 heures (2 jours)</option>
                          <option value="72h">72 heures (3 jours)</option>
                          <option value="1sem">1 semaine</option>
                          <option value="indefini">Indéfini / selon situation</option>
                        </select>
                      </div>

                      {/* Ressources minimales */}
                      <div className="sm:col-span-2 pt-3 mt-1" style={{ borderTop: '1px solid #E9ECEF' }}>
                        <p className="text-xs font-bold uppercase mb-3" style={{ color: '#ADB5BD', letterSpacing: '0.08em' }}>
                          Ressources minimales requises
                        </p>
                        <div className="space-y-2">
                          {[
                            { key: 'resourcePersonnel', label: '👤 Personnel', placeholder: 'Ex: 4 agents + 1 superviseur en mode dégradé' },
                            { key: 'resourceIT', label: '💻 Systèmes TI', placeholder: 'Ex: Accès ERP + courriel + téléphonie mobile' },
                            { key: 'resourceEquipment', label: '🔧 Équipements', placeholder: 'Ex: 5 postes de travail sécurisés, imprimantes' },
                            { key: 'resourceSuppliers', label: '🚚 Fournisseurs / partenaires', placeholder: 'Ex: Transporteur secondaire, fournisseur TI joignable 24/7' },
                            { key: 'resourceSite', label: '🏢 Site / installations', placeholder: 'Ex: Zone de travail sécuritaire + 2 quais accessibles' },
                            { key: 'resourceEnergy', label: '⚡ Énergie', placeholder: 'Ex: Alimentation normale ou génératrice pour charges prioritaires' },
                          ].map(r => (
                            <div key={r.key} className="flex items-center gap-3">
                              <span className="text-xs font-medium flex-shrink-0" style={{ color: '#6C757D', minWidth: '160px' }}>
                                {r.label}
                              </span>
                              <input type="text" value={service[r.key] || ''}
                                onChange={e => updateService(service.id, r.key, e.target.value)}
                                placeholder={r.placeholder}
                                className="flex-1 rounded px-3 py-2 text-sm focus:outline-none" style={inputStyle}
                                onFocus={e => e.target.style.borderColor = '#C0392B'}
                                onBlur={e => e.target.style.borderColor = '#CED4DA'} />
                            </div>
                          ))}
                        </div>
                      </div>

                      {(() => {
                        const warnings = getBiaWarnings(service);

                        if (warnings.length === 0) {
                          return (
                            <div
                              className="mt-5 p-3 rounded"
                              style={{
                                backgroundColor: '#EAFAF1',
                                border: '1px solid #A9DFBF',
                              }}
                            >
                              <p
                                className="text-xs font-medium"
                                style={{ color: '#1E8449' }}
                              >
                                ✓ Aucun écart de cohérence détecté pour cette activité.
                              </p>
                            </div>
                          );
                        }

                        return (
                          <div className="mt-5 space-y-2">
                            <p
                              className="text-xs font-bold uppercase"
                              style={{
                                color: '#6C757D',
                                letterSpacing: '0.08em',
                              }}
                            >
                              Vérifications de cohérence CORO
                            </p>

                            {warnings.map((warning, warningIndex) => {
                              const styles =
                                warning.level === 'critical'
                                  ? {
                                      backgroundColor: '#FDEDEC',
                                      border: '#F1948A',
                                      color: '#922B21',
                                      icon: '⛔',
                                    }
                                  : warning.level === 'warning'
                                    ? {
                                        backgroundColor: '#FEF9E7',
                                        border: '#FAD7A0',
                                        color: '#9A7D0A',
                                        icon: '⚠️',
                                      }
                                    : {
                                        backgroundColor: '#EBF5FB',
                                        border: '#AED6F1',
                                        color: '#1A5276',
                                        icon: 'ℹ️',
                                      };

                              return (
                                <div
                                  key={warningIndex}
                                  className="p-3 rounded flex items-start gap-2"
                                  style={{
                                    backgroundColor: styles.backgroundColor,
                                    border: `1px solid ${styles.border}`,
                                  }}
                                >
                                  <span className="text-sm flex-shrink-0">
                                    {styles.icon}
                                  </span>

                                  <p
                                    className="text-xs"
                                    style={{ color: styles.color }}
                                  >
                                    {warning.message}
                                  </p>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })()}
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

              {/* Systèmes TI critiques */}
              <div className="mt-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-medium" style={{ color: '#2C3E50' }}>
                    Systèmes TI critiques
                  </p>
                  <button onClick={addITSystem}
                    className="text-xs font-medium px-3 py-1.5 rounded transition-colors"
                    style={{ border: '1px solid #AED6F1', color: '#2980B9' }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = '#EBF5FB'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                    + Ajouter un système
                  </button>
                </div>
                {config.criticalITSystems.length === 0 ? (
                  <div className="p-3 text-center rounded" style={{ backgroundColor: '#F8F9FA', border: '1px dashed #DEE2E6' }}>
                    <p className="text-xs" style={{ color: '#ADB5BD' }}>
                      Ex: ERP, courriel, téléphonie, accès Internet, fichiers partagés, logiciels métier
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {config.criticalITSystems.map((sys: any) => (
                      <div key={sys.id} className="p-4 rounded" style={{ backgroundColor: '#F8F9FA', border: '1px solid #E9ECEF' }}>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="sm:col-span-2">
                            <Label>Nom du système / application</Label>
                            <input type="text" value={sys.name}
                              onChange={e => updateITSystem(sys.id, 'name', e.target.value)}
                              placeholder="Ex: ERP (Microsoft Dynamics), Courriel (Microsoft 365)"
                              className="rounded px-3 py-2 text-sm focus:outline-none" style={inputStyle}
                              onFocus={e => e.target.style.borderColor = '#C0392B'}
                              onBlur={e => e.target.style.borderColor = '#CED4DA'} />
                          </div>
                          <div>
                            <Label>RTO du système</Label>
                            <select value={sys.rto}
                              onChange={e => updateITSystem(sys.id, 'rto', e.target.value)}
                              className="rounded px-3 py-2 text-sm focus:outline-none" style={inputStyle}>
                              <option value="">Sélectionner...</option>
                              <option value="1h">1 heure</option>
                              <option value="4h">4 heures</option>
                              <option value="8h">8 heures</option>
                              <option value="24h">24 heures</option>
                              <option value="48h">48 heures</option>
                              <option value="72h">72 heures</option>
                            </select>
                          </div>
                          <div>
                            <Label>RPO du système</Label>
                            <select value={sys.rpo}
                              onChange={e => updateITSystem(sys.id, 'rpo', e.target.value)}
                              className="rounded px-3 py-2 text-sm focus:outline-none" style={inputStyle}>
                              <option value="">Sélectionner...</option>
                              <option value="0">Aucune perte (RPO = 0)</option>
                              <option value="1h">1 heure</option>
                              <option value="4h">4 heures</option>
                              <option value="8h">8 heures</option>
                              <option value="24h">24 heures</option>
                            </select>
                          </div>
                          <div>
                            <Label>Mode dégradé</Label>
                            <input type="text" value={sys.degradedMode}
                              onChange={e => updateITSystem(sys.id, 'degradedMode', e.target.value)}
                              placeholder="Ex: Formulaires papier + saisie différée"
                              className="rounded px-3 py-2 text-sm focus:outline-none" style={inputStyle}
                              onFocus={e => e.target.style.borderColor = '#C0392B'}
                              onBlur={e => e.target.style.borderColor = '#CED4DA'} />
                          </div>
                          <div>
                            <Label>Solution de relève / reprise</Label>
                            <input type="text" value={sys.backupSolution}
                              onChange={e => updateITSystem(sys.id, 'backupSolution', e.target.value)}
                              placeholder="Ex: Restauration fournisseur / environnement infonuagique"
                              className="rounded px-3 py-2 text-sm focus:outline-none" style={inputStyle}
                              onFocus={e => e.target.style.borderColor = '#C0392B'}
                              onBlur={e => e.target.style.borderColor = '#CED4DA'} />
                          </div>
                        </div>
                        <button onClick={() => removeITSystem(sys.id)}
                          className="text-xs mt-2"
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
              <div className="mt-3">
                <Label>Seuil d'activation pour absentéisme massif</Label>
                <div className="flex items-center gap-3">
                  <select value={config.absenteeismThreshold}
                    onChange={e => setConfig({ ...config, absenteeismThreshold: e.target.value })}
                    className="rounded px-4 py-2.5 text-sm focus:outline-none" style={{ ...inputStyle, width: 'auto' }}>
                    <option value="">Sélectionner...</option>
                    <option value="15">≥ 15% du personnel absent</option>
                    <option value="20">≥ 20% du personnel absent</option>
                    <option value="25">≥ 25% du personnel absent</option>
                    <option value="30">≥ 30% du personnel absent</option>
                    <option value="40">≥ 40% du personnel absent</option>
                    <option value="50">≥ 50% du personnel absent</option>
                    <option value="cle">Perte d'un employé clé (sans seuil %)</option>
                  </select>
                  {config.absenteeismThreshold && config.absenteeismThreshold !== 'cle' && (
                    <p className="text-xs" style={{ color: '#ADB5BD' }}>
                      → Déclenche la procédure PC013
                    </p>
                  )}
                </div>
              </div>
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

              {/* Fournisseurs critiques */}
              <div className="mt-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-medium" style={{ color: '#2C3E50' }}>
                    Fournisseurs critiques
                  </p>
                  <button onClick={addCriticalSupplier}
                    className="text-xs font-medium px-3 py-1.5 rounded transition-colors"
                    style={{ border: '1px solid #AED6F1', color: '#2980B9' }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = '#EBF5FB'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                    + Ajouter un fournisseur
                  </button>
                </div>
                {config.criticalSuppliers.length === 0 ? (
                  <div className="p-3 text-center rounded" style={{ backgroundColor: '#F8F9FA', border: '1px dashed #DEE2E6' }}>
                    <p className="text-xs" style={{ color: '#ADB5BD' }}>
                      Ex: transporteur principal, fournisseur ERP, fournisseur matières premières, télécoms
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {config.criticalSuppliers.map((sup: any) => (
                      <div key={sup.id} className="p-4 rounded" style={{ backgroundColor: '#F8F9FA', border: '1px solid #E9ECEF' }}>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <Label>Nom du fournisseur</Label>
                            <input type="text" value={sup.name}
                              onChange={e => updateCriticalSupplier(sup.id, 'name', e.target.value)}
                              placeholder="Ex: Transporteur XYZ"
                              className="rounded px-3 py-2 text-sm focus:outline-none" style={inputStyle}
                              onFocus={e => e.target.style.borderColor = '#C0392B'}
                              onBlur={e => e.target.style.borderColor = '#CED4DA'} />
                          </div>
                          <div>
                            <Label>Service / produit fourni</Label>
                            <input type="text" value={sup.service}
                              onChange={e => updateCriticalSupplier(sup.id, 'service', e.target.value)}
                              placeholder="Ex: Livraison des commandes prioritaires"
                              className="rounded px-3 py-2 text-sm focus:outline-none" style={inputStyle}
                              onFocus={e => e.target.style.borderColor = '#C0392B'}
                              onBlur={e => e.target.style.borderColor = '#CED4DA'} />
                          </div>
                          <div>
                            <Label>Tolérance maximale à l'interruption</Label>
                            <select value={sup.tolerance}
                              onChange={e => updateCriticalSupplier(sup.id, 'tolerance', e.target.value)}
                              className="rounded px-3 py-2 text-sm focus:outline-none" style={inputStyle}>
                              <option value="">Sélectionner...</option>
                              <option value="1h">1 heure</option>
                              <option value="4h">4 heures</option>
                              <option value="8h">8 heures</option>
                              <option value="24h">24 heures</option>
                              <option value="48h">48 heures</option>
                              <option value="72h">72 heures</option>
                              <option value="1sem">1 semaine</option>
                            </select>
                          </div>
                          <div>
                            <Label>Délai d'activation de la relève</Label>
                            <select value={sup.activationDelay}
                              onChange={e => updateCriticalSupplier(sup.id, 'activationDelay', e.target.value)}
                              className="rounded px-3 py-2 text-sm focus:outline-none" style={inputStyle}>
                              <option value="">Sélectionner...</option>
                              <option value="immediate">Immédiat (contrat en place)</option>
                              <option value="1h">Moins de 1 heure</option>
                              <option value="4h">4 heures</option>
                              <option value="24h">24 heures</option>
                              <option value="48h">48 heures</option>
                              <option value="1sem">1 semaine</option>
                            </select>
                          </div>
                          <div>
                            <Label>Mesure préventive en place</Label>
                            <input type="text" value={sup.preventiveMeasure}
                              onChange={e => updateCriticalSupplier(sup.id, 'preventiveMeasure', e.target.value)}
                              placeholder="Ex: Stock de sécurité 3 jours, 2e transporteur identifié"
                              className="rounded px-3 py-2 text-sm focus:outline-none" style={inputStyle}
                              onFocus={e => e.target.style.borderColor = '#C0392B'}
                              onBlur={e => e.target.style.borderColor = '#CED4DA'} />
                          </div>
                          <div>
                            <Label>Solution de relève</Label>
                            <input type="text" value={sup.backupSolution}
                              onChange={e => updateCriticalSupplier(sup.id, 'backupSolution', e.target.value)}
                              placeholder="Ex: Fournisseur secondaire XYZ — contrat cadre signé"
                              className="rounded px-3 py-2 text-sm focus:outline-none" style={inputStyle}
                              onFocus={e => e.target.style.borderColor = '#C0392B'}
                              onBlur={e => e.target.style.borderColor = '#CED4DA'} />
                          </div>
                          <div>
                            <Label>État de préparation</Label>
                            <select value={sup.status}
                              onChange={e => updateCriticalSupplier(sup.id, 'status', e.target.value)}
                              className="rounded px-3 py-2 text-sm focus:outline-none" style={inputStyle}>
                              <option value="PRET">✅ Prêt — contrat et contacts confirmés</option>
                              <option value="PARTIEL">⚠️ Partiel — à renforcer ou tester</option>
                              <option value="A_CONFIRMER">🔴 À confirmer — solution non contractualisée</option>
                            </select>
                          </div>
                        </div>
                        <button onClick={() => removeCriticalSupplier(sup.id)}
                          className="text-xs mt-2"
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
          onClick={() => changeSection(Math.max(1, activeSection - 1))}
          disabled={activeSection === 1}
          className="flex items-center gap-2 text-sm font-medium px-4 py-2 rounded disabled:opacity-40"
          style={{ border: '1px solid #DEE2E6', color: '#6C757D' }}
          onMouseEnter={e => { if (activeSection > 1) e.currentTarget.style.backgroundColor = '#F8F9FA'; }}
          onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
          <ChevronLeft size={16} /> Section précédente
        </button>

        {activeSection < 8 ? (
          <button
            onClick={() => changeSection(Math.min(8, activeSection + 1))}
            className="flex items-center gap-2 text-sm font-medium px-4 py-2 rounded text-white"
            style={{ backgroundColor: '#C0392B' }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#A93226'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = '#C0392B'}>
            Section suivante <ChevronRight size={16} />
          </button>
        ) : (
          <div className="flex flex-col items-end gap-2">
            <button
              type="button"
              disabled={finalizing || saving}
              onClick={async () => {
                if (finalizing) return;

                setFinalizing(true);
                setFinalizationError('');

                try {
                  // Sauvegarder la toute dernière version de la configuration.
                  // handleSave attend également les sauvegardes précédentes
                  // grâce à la file saveQueueRef.
                  await handleSave();

                  // Générer le document.
                  // Axios rejettera automatiquement la promesse si le backend
                  // répond avec un statut HTTP d'erreur.
                  await api.post(`/generator/generate/${projectId}`);

                  // Ne revenir au projet qu'après confirmation du backend.
                  router.push(`/projects/${projectId}`);
                } catch (err) {
                  console.error('Erreur finalisation PCA:', err);

                  setFinalizationError(
                    'La configuration a été conservée, mais le PCA n’a pas pu être généré. Veuillez réessayer.'
                  );

                  setFinalizing(false);
                }
              }}
              className="flex items-center gap-2 text-sm font-medium px-4 py-2 rounded text-white disabled:opacity-60 disabled:cursor-not-allowed"
              style={{
                backgroundColor: finalizing ? '#7DCEA0' : '#27AE60',
              }}
              onMouseEnter={e => {
                if (!finalizing && !saving) {
                  e.currentTarget.style.backgroundColor = '#1E8449';
                }
              }}
              onMouseLeave={e => {
                if (!finalizing && !saving) {
                  e.currentTarget.style.backgroundColor = '#27AE60';
                }
              }}
            >
              <Save size={16} />

              {finalizing
                ? 'Génération du PCA...'
                : 'Terminer la configuration'}
            </button>

            {finalizationError && (
              <p
                className="text-xs text-right max-w-md"
                style={{ color: '#C0392B' }}
              >
                {finalizationError}
              </p>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}