'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ExternalLink, Save } from 'lucide-react';
import api from '@/lib/api';
import AppLayout from '@/components/layout/AppLayout';
import MandateWorkTab from './MandateWorkTab';
import CommentsTab from './CommentsTab';
import TimesheetTab from './TimesheetTab';
import MandateServicesEditor from './MandateServicesEditor';
import { useAuthStore } from '@/stores/auth.store';
import { ActivityCatalogItem } from './mandateSelection';
import { emptyMandateForm, MandateForm, mandateFieldsAreEqual, mandateFormFromServer,
  } from './mandateFormState';
import { buildSaveMandateServicesPayload, deriveHistoricalCommercialTransition, emptyMandateCommercialState,
  mandateServicesAreDirty, normalizeMandateApiError, resetServiceDrafts, serviceDraftsFromServer,
  validateMandateServices } from './mandateCommercialState';
import { getMandateServices, putMandateServices } from './mandateApi';
import { mandateSavePlan } from './mandateSavePlan';
import { useMandateOperations } from './useMandateOperations';

const TABS = [
  { id: 'fiche', label: '📋 Fiche & Offre' },
  { id: 'activities', label: '✅ Activités' },
  { id: 'comments', label: '💬 Commentaires' },
  { id: 'timesheet', label: '⏱ Feuille de temps' },
];

export default function MandatePage() {
  const params = useParams();
  const router = useRouter();
  const authUser = useAuthStore(state => state.user);
  const projectId = params.id as string;

  const [project, setProject] = useState<any>(null);
  const [mandate, setMandate] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState('');
  const [saveError, setSaveError] = useState('');
  const [offerSaveError, setOfferSaveError] = useState('');
  const [serviceValidationErrors, setServiceValidationErrors] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState('fiche');
  const [activityCatalog, setActivityCatalog] = useState<ActivityCatalogItem[]>([]);
  const [catalogError, setCatalogError] = useState(false);
  const [historicalActivityState, setHistoricalActivityState] = useState<{
    known: boolean; activities: Array<{ sourceMandate?: boolean; activityTypeId?: string | null }>;
  }>({ known: true, activities: [] });

  const [form, setForm] = useState<MandateForm>(emptyMandateForm);
  const [serverSnapshot, setServerSnapshot] = useState<MandateForm>(emptyMandateForm);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [showTypeMandatPopup, setShowTypeMandatPopup] = useState(false);
  const [commercialState, setCommercialState] = useState(emptyMandateCommercialState);
  const [mandateContext, setMandateContext] = useState<{ projectId: string; exists: boolean } | null>(null);
  const commercialRequest = useRef(0);
  const historicalActivities = useRef<{ projectId: string; activities: Array<{ sourceMandate?: boolean }> } | null>(null);

  useEffect(() => { fetchData(); }, [projectId]);

  useEffect(() => {
    const request = ++commercialRequest.current;
    if (mandateContext?.projectId !== projectId || !mandateContext.exists) {
      return;
    }
    const controller = new AbortController();
    Promise.resolve().then(() => {
      if (request !== commercialRequest.current || controller.signal.aborted) return null;
      setCommercialState({ ...emptyMandateCommercialState(), modelAvailable: true, loadStatus: 'LOADING' });
      return getMandateServices(projectId, controller.signal);
    }).then(response => {
      if (!response) return;
      if (request !== commercialRequest.current || controller.signal.aborted) return;
      const services = serviceDraftsFromServer(response.services || []);
      setCommercialState({ modelAvailable: true, loadStatus: 'READY', error: null,
        revision: response.revision, snapshot: services, draft: services.map(service => ({ ...service })),
        historicalTransition: deriveHistoricalCommercialTransition(true, services,
          historicalActivities.current?.projectId === projectId ? historicalActivities.current.activities : []) });
    }).catch(error => {
      if (request !== commercialRequest.current || controller.signal.aborted) return;
      setCommercialState({ ...emptyMandateCommercialState(), modelAvailable: true, loadStatus: 'ERROR',
        error: normalizeMandateApiError(error, 'Impossible de charger les services vendus.').message });
    });
    return () => controller.abort();
  }, [projectId, mandateContext]);

  const fetchData = async () => {
    try {
      const [projectRes, mandateRes, activitiesRes, teamRes, catalogRes] = await Promise.all([
        api.get(`/projects/${projectId}`),
        api.get(`/projects/${projectId}/mandate`).catch(() => ({ data: null })),
        api.get(`/projects/${projectId}/activities`).then(response => ({ data: response.data, failed: false }))
          .catch(() => ({ data: [], failed: true })),
        api.get('/users/organization').catch(() => ({ data: [] })),
        api.get('/activities/catalog').then(response => ({ data: response.data, failed: false }))
          .catch(() => ({ data: [], failed: true })),
      ]);
      setActivityCatalog(catalogRes.data || []);
      setCatalogError(catalogRes.failed);
      setTeamMembers(teamRes.data || []);
      setProject(projectRes.data);
      const m = mandateRes.data;
      historicalActivities.current = { projectId, activities: activitiesRes.data || [] };
      setHistoricalActivityState({ known: !activitiesRes.failed, activities: activitiesRes.data || [] });
      setMandate(m);
      setMandateContext({ projectId, exists: Boolean(m) });
      if (!m) setCommercialState(emptyMandateCommercialState());
      const nextForm = mandateFormFromServer(m);
      setServerSnapshot(nextForm);
      setForm(nextForm);
      if (m) {
        // Popup migration si typeMandat pas encore défini
        if (!m.typeMandat || m.typeMandat === '') setShowTypeMandatPopup(true);
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const canEditMandate = ['ADMIN', 'SUPER_ADMIN'].includes(authUser?.role || '');
  const mandateFieldsDirty = !mandateFieldsAreEqual(form, serverSnapshot);
  const commercialServicesDirty = mandateServicesAreDirty(commercialState.draft, commercialState.snapshot);
  const isDirty = mandateFieldsDirty || commercialServicesDirty;
  const operations = useMandateOperations({ projectId, revision: commercialState.revision,
    servicesDirty: commercialServicesDirty, canApply: canEditMandate,
    commercialReady: commercialState.loadStatus === 'READY' && mandateContext?.projectId === projectId });
  const operationalLocked = ['APPLYING', 'UNKNOWN'].includes(operations.applyState.status);
  const decisionOpen = Boolean(operations.decisionDialog);

  const handleSave = async () => {
    setSaveError(''); setOfferSaveError(''); setSaveSuccess('');
    const fieldsWereDirty = mandateFieldsDirty;
    const servicesWereDirty = commercialServicesDirty;
    const savePlan = mandateSavePlan({ mandateExists: Boolean(mandate), mandateFieldsDirty: fieldsWereDirty,
      servicesDirty: servicesWereDirty, commercialRevision: commercialState.revision });
    const validation = validateMandateServices(commercialState.draft, commercialState.snapshot,
      new Set(activityCatalog.map(item => item.activityTypeId)));
    setServiceValidationErrors(validation.errors);
    if (servicesWereDirty && !validation.valid) return;
    if (!fieldsWereDirty && !servicesWereDirty || operationalLocked) return;
    setSaving(true);
    let ficheSaved = false;
    let createdMandate = false;
    let servicesAttempted = false;
    try {
      if (savePlan.saveMandate) {
        const response = await api.put(`/projects/${projectId}/mandate`, form);
        const persisted = mandateFormFromServer(response.data);
        setMandate((current: any) => ({ ...current, ...response.data }));
        createdMandate = !mandate;
        setServerSnapshot(persisted); setForm(persisted); ficheSaved = true;
      }
      if (savePlan.saveServices) {
        servicesAttempted = true;
        let revision = commercialState.revision;
        if (!revision) revision = (await getMandateServices(projectId)).revision;
        const response = await putMandateServices(projectId,
          buildSaveMandateServicesPayload(revision, commercialState.draft));
        const services = serviceDraftsFromServer(response.services || []);
        setCommercialState({ modelAvailable: true, loadStatus: 'READY', error: null, revision: response.revision,
          snapshot: services, draft: services.map(service => ({ ...service })),
          historicalTransition: deriveHistoricalCommercialTransition(true, services, historicalActivityState.activities) });
      } else if (createdMandate) {
        try {
          const response = await getMandateServices(projectId);
          const services = serviceDraftsFromServer(response.services || []);
          setCommercialState({ modelAvailable: true, loadStatus: 'READY', error: null, revision: response.revision,
            snapshot: services, draft: services.map(service => ({ ...service })),
            historicalTransition: deriveHistoricalCommercialTransition(true, services, historicalActivityState.activities) });
        } catch (error) {
          setCommercialState({ ...emptyMandateCommercialState(), modelAvailable: true, loadStatus: 'ERROR',
            error: normalizeMandateApiError(error, "L'offre commerciale n'a pas pu être chargée.").message });
        }
      }
      setSaveSuccess(fieldsWereDirty && servicesWereDirty ? 'Mandat et offre enregistrés.'
        : servicesWereDirty ? 'Offre enregistrée.' : 'Mandat enregistré.');
    } catch (error: unknown) {
      const normalized = normalizeMandateApiError(error);
      if (savePlan.saveMandate && !ficheSaved) {
        setSaveError(normalized.message || "L'enregistrement du Mandat a échoué.");
      }
      else if (ficheSaved && servicesWereDirty) {
        setSaveSuccess("Les informations du Mandat sont enregistrées. L'offre contient encore des modifications non enregistrées.");
      }
      if (servicesAttempted) setOfferSaveError(normalized.kind === 'conflict'
        ? "L'offre a été modifiée par une autre personne. Votre brouillon est conservé."
        : normalized.kind === 'network'
          ? "Le résultat de l'enregistrement de l'offre est incertain. Vérifiez l'état serveur avant de réessayer."
          : normalized.message || "L'enregistrement de l'offre a échoué.");
    } finally { setSaving(false); }
  };

  const updateForm = (change: Partial<MandateForm>) => {
    setForm(current => ({ ...current, ...change }));
    setSaveError('');
    setSaveSuccess('');
  };
  const updateCommercialServices = (draft: typeof commercialState.draft) => {
    setCommercialState(current => ({ ...current, draft }));
    setOfferSaveError(''); setServiceValidationErrors({}); setSaveSuccess('');
  };
  const resetChanges = () => {
    setForm(serverSnapshot);
    setCommercialState(current => ({ ...current, draft: resetServiceDrafts(current.snapshot) }));
    setSaveError(''); setOfferSaveError(''); setServiceValidationErrors({}); setSaveSuccess('');
  };
  const reloadMandateServices = async () => {
    if (commercialServicesDirty && !window.confirm("Recharger l'offre remplacera vos modifications non enregistrées. Continuer ?")) return;
    const request = ++commercialRequest.current;
    setCommercialState(current => ({ ...current, loadStatus: 'LOADING', error: null }));
    try {
      const response = await getMandateServices(projectId);
      if (request !== commercialRequest.current) return;
      const services = serviceDraftsFromServer(response.services || []);
      setCommercialState({ modelAvailable: true, loadStatus: 'READY', error: null, revision: response.revision,
        snapshot: services, draft: services.map(service => ({ ...service })),
        historicalTransition: deriveHistoricalCommercialTransition(true, services, historicalActivityState.activities) });
      setOfferSaveError(''); setServiceValidationErrors({});
    } catch (error) {
      if (request !== commercialRequest.current) return;
      setCommercialState(current => ({ ...current, loadStatus: 'ERROR',
        error: normalizeMandateApiError(error, "L'offre commerciale n'a pas pu être chargée.").message }));
    }
  };
  const reloadCatalog = async () => {
    try { const response = await api.get('/activities/catalog'); setActivityCatalog(response.data || []); setCatalogError(false); }
    catch { setCatalogError(true); }
  };
  const leaveMandate = () => {
    if (operationalLocked && !window.confirm("Une action opérationnelle est en cours ou son résultat reste à confirmer. Quitter le mandat ?")) return;
    if (!isDirty || window.confirm('Des modifications ne sont pas enregistrées. Quitter le mandat ?')) {
      router.push(`/projects/${projectId}`);
    }
  };

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (!isDirty && !operationalLocked) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [isDirty, operationalLocked]);

  const montant = parseFloat(form.montantVendu) || 0;
  const taux = parseFloat(form.tauxHoraire) || 0;
  const budget = parseFloat(form.heuresBudgetees) || 0;
  const heuresReelles = mandate?.heuresReelles || 0;
  const coutReel = heuresReelles * taux;
  const margeEstimee = montant - coutReel;
  const margePct = montant > 0 ? Math.round((margeEstimee / montant) * 100) : 0;
  const heuresRestantes = budget - heuresReelles;
  const budgetPct = budget > 0 ? Math.min(Math.round((heuresReelles / budget) * 100), 100) : 0;

  const inputCls = "w-full px-3 py-2.5 text-sm rounded focus:outline-none";
  const inputSty = { border: '1px solid #CED4DA', color: '#2C3E50', backgroundColor: '#FFFFFF' };

  // Calcul délai livraison
  const today = new Date();
  const dateLimite = mandate?.dateLimite ? new Date(mandate.dateLimite) : null;
  const diffDays = dateLimite ? Math.ceil((dateLimite.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) : null;
  const delaiLevel = diffDays === null ? null
    : diffDays < 0 ? 'DEPASSE'
    : diffDays <= 3 ? 'CRITIQUE'
    : diffDays <= 7 ? 'URGENT'
    : diffDays <= 14 ? 'ATTENTION'
    : 'OK';
  const delaiColors: Record<string, { bg: string; text: string; border: string }> = {
    DEPASSE:  { bg: '#FDEDEC', text: '#C0392B', border: '#F1948A' },
    CRITIQUE: { bg: '#FDEDEC', text: '#C0392B', border: '#F1948A' },
    URGENT:   { bg: '#FEF9E7', text: '#E67E22', border: '#FAD7A0' },
    ATTENTION:{ bg: '#FEF9E7', text: '#F39C12', border: '#FAD7A0' },
    OK:       { bg: '#EAFAF1', text: '#27AE60', border: '#A9DFBF' },
  };

  if (loading) return (
    <AppLayout>
      {/* Popup migration type de mandat */}
      {showTypeMandatPopup && canEditMandate && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="w-full max-w-md rounded-md p-8"
            style={{ backgroundColor: '#FFFFFF', boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
            <div className="text-center mb-6">
              <span style={{ fontSize: '36px' }}>⚙️</span>
              <h3 className="font-bold text-lg mt-3 mb-2" style={{ color: '#2C3E50' }}>
                Configuration requise
              </h3>
              <p className="text-sm" style={{ color: '#6C757D' }}>
                Ce mandat n'a pas encore été configuré. Choisissez le type pour activer le suivi des délais de livraison.
              </p>
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => {
                  updateForm({ typeMandat: 'FORFAITAIRE' });
                  setShowTypeMandatPopup(false);
                }}
                className="flex-1 py-4 rounded-md font-semibold text-sm transition-colors"
                style={{ backgroundColor: '#FDEDEC', color: '#C0392B', border: '2px solid #F1948A' }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F1948A'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = '#FDEDEC'}>
                <div className="text-2xl mb-2">📅</div>
                Forfaitaire
                <p className="text-xs font-normal mt-1" style={{ color: '#6C757D' }}>
                  Délai calculé automatiquement
                </p>
              </button>
              <button
                onClick={() => {
                  updateForm({ typeMandat: 'ANNUEL' });
                  setShowTypeMandatPopup(false);
                }}
                className="flex-1 py-4 rounded-md font-semibold text-sm transition-colors"
                style={{ backgroundColor: '#EBF5FB', color: '#2980B9', border: '2px solid #AED6F1' }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#AED6F1'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = '#EBF5FB'}>
                <div className="text-2xl mb-2">🔄</div>
                Annuel récurrent
                <p className="text-xs font-normal mt-1" style={{ color: '#6C757D' }}>
                  Pas de délai de livraison
                </p>
              </button>
            </div>
            <button
              onClick={() => setShowTypeMandatPopup(false)}
              className="w-full mt-4 text-xs py-2 rounded transition-colors"
              style={{ color: '#ADB5BD' }}
              onMouseEnter={e => e.currentTarget.style.color = '#6C757D'}
              onMouseLeave={e => e.currentTarget.style.color = '#ADB5BD'}>
              Ignorer pour l'instant
            </button>
          </div>
        </div>
      )}
      <div className="flex items-center justify-center py-24">
        <p className="text-sm animate-pulse" style={{ color: '#ADB5BD' }}>Chargement...</p>
      </div>
    </AppLayout>
  );

  return (
    <AppLayout>
      <button onClick={leaveMandate}
        className="text-sm mb-4 flex items-center gap-1 transition-colors"
        style={{ color: '#6C757D' }}
        onMouseEnter={e => e.currentTarget.style.color = '#2C3E50'}
        onMouseLeave={e => e.currentTarget.style.color = '#6C757D'}>
        ← Retour au projet
      </button>

      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: '#ADB5BD' }}>
            {project?.documentType} · {project?.client?.name}
          </p>
          <h1 className="text-2xl font-black" style={{ color: '#2C3E50' }}>{project?.name}</h1>
          <div className="h-1 w-16 mt-2" style={{ backgroundColor: '#C0392B' }} />
        </div>
        {activeTab === 'fiche' && (
          <div className="flex flex-wrap items-center justify-end gap-3">
            {canEditMandate && isDirty && <button type="button" onClick={resetChanges} disabled={saving || operationalLocked || decisionOpen}
              className="text-sm px-4 py-2 rounded disabled:opacity-50" style={{ border: '1px solid #CED4DA', color: '#6C757D' }}>
              Annuler les modifications
            </button>}
            {canEditMandate && <button type="button" onClick={handleSave} disabled={saving || operationalLocked || decisionOpen || !isDirty}
              aria-busy={saving}
              className="text-white text-sm font-medium px-4 py-2 rounded flex items-center gap-2 disabled:opacity-50"
              style={{ backgroundColor: '#C0392B' }}>
              <Save size={14} />
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </button>}
            {isDirty && (
              <p className="text-xs mt-1" style={{ color: '#F39C12' }}>
                Modifications non enregistrées
              </p>
            )}
          </div>
        )}
      </div>

      {saveError && <p role="alert" className="text-sm mb-4" style={{ color: '#C0392B' }}>{saveError}</p>}
      {saveSuccess && <p aria-live="polite" className="text-sm mb-4" style={{ color: '#27864A' }}>{saveSuccess}</p>}
      {!canEditMandate && activeTab === 'fiche' && (
        <p className="text-sm mb-4" style={{ color: '#6C757D' }}>Fiche et offre en lecture seule. Seuls les administrateurs peuvent les modifier.</p>
      )}

      <div className="flex gap-2 mb-6 pb-4" style={{ borderBottom: '1px solid #E9ECEF' }}>
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className="px-4 py-2 rounded text-sm font-medium transition-colors"
            style={{
              backgroundColor: activeTab === tab.id ? '#C0392B' : '#F8F9FA',
              color: activeTab === tab.id ? '#FFFFFF' : '#6C757D',
              border: activeTab === tab.id ? '1px solid #C0392B' : '1px solid #DEE2E6',
            }}>
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'fiche' && (
        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2 space-y-6">

            {/* Description */}
            <div className="rounded-md p-6" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E9ECEF' }}>
              <h2 className="font-semibold mb-4" style={{ color: '#2C3E50' }}>📄 Description du mandat</h2>
              <p className="text-xs mb-2" style={{ color: '#6C757D' }}>
                Briefing pour le conseiller — contexte, particularités, informations importantes
              </p>
              <textarea value={form.description}
                disabled={!canEditMandate} onChange={e => updateForm({ description: e.target.value })}
                rows={8}
                placeholder="Ex: Client multi-locataires avec 3 bâtiments distincts. Contact principal : Marie Tremblay..."
                className="w-full px-3 py-2.5 text-sm rounded resize-vertical focus:outline-none"
                style={{ border: '1px solid #CED4DA', color: '#2C3E50', backgroundColor: '#FFFFFF', minHeight: '160px' }}
                onFocus={e => e.target.style.borderColor = '#C0392B'}
                onBlur={e => e.target.style.borderColor = '#CED4DA'} />
            </div>

            {/* Offre de service */}
            <div className="rounded-md p-6" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E9ECEF' }}>
              <h2 className="font-semibold mb-4" style={{ color: '#2C3E50' }}>💼 Offre de service</h2>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: '#6C757D' }}>Montant vendu ($)</label>
                  <input type="number" value={form.montantVendu}
                    disabled={!canEditMandate} onChange={e => updateForm({ montantVendu: e.target.value })}
                    placeholder="0.00" min="0" step="0.01"
                    className={inputCls} style={inputSty}
                    onFocus={e => e.target.style.borderColor = '#C0392B'}
                    onBlur={e => e.target.style.borderColor = '#CED4DA'} />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: '#6C757D' }}>Taux horaire ($/h)</label>
                  <input type="number" value={form.tauxHoraire}
                    disabled={!canEditMandate} onChange={e => updateForm({ tauxHoraire: e.target.value })}
                    placeholder="0.00" min="0" step="0.01"
                    className={inputCls} style={inputSty}
                    onFocus={e => e.target.style.borderColor = '#C0392B'}
                    onBlur={e => e.target.style.borderColor = '#CED4DA'} />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: '#6C757D' }}>Heures budgétées</label>
                  <input type="number" value={form.heuresBudgetees}
                    disabled={!canEditMandate} onChange={e => updateForm({ heuresBudgetees: e.target.value })}
                    placeholder="0" min="0" step="0.5"
                    className={inputCls} style={inputSty}
                    onFocus={e => e.target.style.borderColor = '#C0392B'}
                    onBlur={e => e.target.style.borderColor = '#CED4DA'} />
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: '#6C757D' }}>Lien Google Drive</label>
                <div className="flex gap-2">
                  <input type="url" value={form.lienDrive}
                    disabled={!canEditMandate} onChange={e => updateForm({ lienDrive: e.target.value })}
                    placeholder="https://drive.google.com/drive/folders/..."
                    className={`flex-1 ${inputCls}`} style={inputSty}
                    onFocus={e => e.target.style.borderColor = '#C0392B'}
                    onBlur={e => e.target.style.borderColor = '#CED4DA'} />
                  {form.lienDrive && (
                    <a href={form.lienDrive} target="_blank" rel="noopener noreferrer"
                      className="px-3 py-2.5 rounded flex items-center gap-1 text-sm transition-colors"
                      style={{ border: '1px solid #AED6F1', color: '#2980B9' }}
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = '#EBF5FB'}
                      onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                      <ExternalLink size={14} /> Ouvrir
                    </a>
                  )}
                </div>
              </div>

              {/* Propriétaire du mandat */}
              <div className="mt-4">
                <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: '#6C757D' }}>
                  Conseiller responsable du mandat
                </label>
                <select value={form.ownerId}
                  disabled={!canEditMandate} onChange={e => updateForm({ ownerId: e.target.value })}
                  className="w-full px-3 py-2.5 text-sm rounded"
                  style={{ border: '1px solid #CED4DA', color: '#2C3E50', backgroundColor: '#FFFFFF' }}>
                  <option value="">— Non assigné —</option>
                  {teamMembers.map((m: any) => (
                    <option key={m.id} value={m.id}>
                      {m.firstName} {m.lastName}
                    </option>
                  ))}
                </select>
              </div>

              <MandateServicesEditor
                state={commercialState}
                catalog={activityCatalog}
                catalogError={catalogError}
                historicalActivities={historicalActivityState.activities}
                historicalKnown={historicalActivityState.known}
                canEdit={canEditMandate}
                disabled={saving || operationalLocked || decisionOpen}
                validationErrors={serviceValidationErrors}
                saveError={offerSaveError}
                onChange={updateCommercialServices}
                onRetry={reloadMandateServices}
                onRetryCatalog={reloadCatalog}
                onReloadConflict={reloadMandateServices}
                previewState={operations.previewState}
                applyState={operations.applyState}
                success={operations.success}
                decisionDialog={operations.decisionDialog}
                operationalView={operations.viewFor}
                onRetryPreview={operations.retryPreview}
                onCreateActivity={operations.createActivity}
                onRetryCreate={operations.retryOperation}
                onExamine={operations.openDecision}
                onCloseDecision={operations.closeDecision}
                onConfirmDecision={operations.executeDecision}
                onOpenPlanner={() => router.push(`/planning?projectId=${projectId}`)}
              />
            </div>
          </div>

          {/* Colonne droite */}
          <div className="space-y-4">
            <div className="rounded-md p-5" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E9ECEF' }}>
              <p className="text-xs font-bold uppercase tracking-wide mb-3" style={{ color: '#ADB5BD' }}>Budget heures</p>
              <div className="flex items-end gap-1 mb-2">
                <span className="text-3xl font-black"
                  style={{ color: budgetPct > 90 ? '#C0392B' : budgetPct > 70 ? '#F39C12' : '#27AE60' }}>
                  {heuresReelles}h
                </span>
                <span className="text-sm mb-1" style={{ color: '#ADB5BD' }}>/ {budget}h</span>
              </div>
              <div className="w-full h-2 rounded-full mb-2" style={{ backgroundColor: '#E9ECEF' }}>
                <div className="h-2 rounded-full transition-all" style={{
                  width: `${budgetPct}%`,
                  backgroundColor: budgetPct > 90 ? '#C0392B' : budgetPct > 70 ? '#F39C12' : '#27AE60',
                }} />
              </div>
              <p className="text-xs" style={{ color: heuresRestantes < 0 ? '#C0392B' : '#6C757D' }}>
                {heuresRestantes >= 0 ? `${heuresRestantes}h restantes` : `${Math.abs(heuresRestantes)}h dépassées`}
              </p>
            </div>

            <div className="rounded-md p-5" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E9ECEF' }}>
              <p className="text-xs font-bold uppercase tracking-wide mb-3" style={{ color: '#ADB5BD' }}>Rentabilité estimée</p>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-xs" style={{ color: '#6C757D' }}>Montant vendu</span>
                  <span className="text-sm font-bold" style={{ color: '#2C3E50' }}>
                    {montant > 0 ? `${montant.toFixed(2)} $` : '—'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs" style={{ color: '#6C757D' }}>Coût réel ({heuresReelles}h × {taux}$)</span>
                  <span className="text-sm font-bold" style={{ color: '#2C3E50' }}>
                    {coutReel > 0 ? `${coutReel.toFixed(2)} $` : '—'}
                  </span>
                </div>
                <div className="h-px" style={{ backgroundColor: '#E9ECEF' }} />
                <div className="flex justify-between">
                  <span className="text-xs font-semibold" style={{ color: '#6C757D' }}>Marge estimée</span>
                  <span className="text-sm font-black" style={{ color: margeEstimee >= 0 ? '#27AE60' : '#C0392B' }}>
                    {montant > 0 ? `${margeEstimee.toFixed(2)} $ (${margePct}%)` : '—'}
                  </span>
                </div>
              </div>
            </div>

            {/* Bloc délai de livraison */}
            <div className="rounded-md p-5" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E9ECEF' }}>
              <p className="text-xs font-bold uppercase tracking-wide mb-3" style={{ color: '#ADB5BD' }}>
                ⏱ Délai de livraison
              </p>

              {/* Type de mandat */}
              <div className="mb-3">
                <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: '#6C757D' }}>
                  Type de mandat
                </label>
                <div className="flex gap-2">
                  {[
                    { value: 'FORFAITAIRE', label: '📅 Forfaitaire' },
                    { value: 'ANNUEL', label: '🔄 Annuel' },
                  ].map(opt => (
                    <button key={opt.value}
                      disabled={!canEditMandate} onClick={() => updateForm({ typeMandat: opt.value })}
                      className="flex-1 py-2 rounded text-xs font-medium transition-colors"
                      style={{
                        backgroundColor: form.typeMandat === opt.value ? '#2C3E50' : '#F8F9FA',
                        color: form.typeMandat === opt.value ? '#FFFFFF' : '#6C757D',
                        border: `1px solid ${form.typeMandat === opt.value ? '#2C3E50' : '#DEE2E6'}`,
                      }}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {form.typeMandat === 'FORFAITAIRE' && (
                <>
                  {/* Type délai */}
                  <div className="mb-3">
                    <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: '#6C757D' }}>
                      Type de document
                    </label>
                    <div className="flex gap-2">
                      {[
                        { value: 'STANDARD', label: 'PMU/PSI/PCA' },
                        { value: 'EVACUATION', label: 'Plan évacuation' },
                      ].map(opt => (
                        <button key={opt.value}
                          disabled={!canEditMandate} onClick={() => updateForm({ typeDelai: opt.value })}
                          className="flex-1 py-1.5 rounded text-xs font-medium transition-colors"
                          style={{
                            backgroundColor: form.typeDelai === opt.value ? '#C0392B' : '#F8F9FA',
                            color: form.typeDelai === opt.value ? '#FFFFFF' : '#6C757D',
                            border: `1px solid ${form.typeDelai === opt.value ? '#C0392B' : '#DEE2E6'}`,
                          }}>
                          {opt.label}
                        </button>
                      ))}
                    </div>
                    <p className="text-xs mt-1" style={{ color: '#ADB5BD' }}>
                      {form.typeDelai === 'EVACUATION' ? '15 jours max' : parseFloat(form.heuresBudgetees) > 30 ? '90 jours max' : '21 jours max'}
                    </p>
                  </div>

                  {/* Date de début */}
                  <div className="mb-3">
                    <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: '#6C757D' }}>
                      Date visite/relevé technique
                    </label>
                    <input type="date"
                      value={form.dateDebutDelai}
                      disabled={!canEditMandate} onChange={e => updateForm({ dateDebutDelai: e.target.value })}
                      className="w-full px-3 py-2 text-sm rounded focus:outline-none"
                      style={{ border: '1px solid #CED4DA', color: '#2C3E50' }}
                      onFocus={e => e.target.style.borderColor = '#C0392B'}
                      onBlur={e => e.target.style.borderColor = '#CED4DA'} />
                    <p className="text-xs mt-1" style={{ color: '#ADB5BD' }}>
                      Le délai démarre automatiquement à cette date
                    </p>
                  </div>

                  {/* Alerte active */}
                  <label className="flex items-center gap-2 mb-3 cursor-pointer">
                    <input type="checkbox"
                      checked={form.alerteActive}
                      disabled={!canEditMandate} onChange={e => updateForm({ alerteActive: e.target.checked })}
                      style={{ accentColor: '#C0392B', width: '14px', height: '14px' }} />
                    <span className="text-xs" style={{ color: '#6C757D' }}>Alertes actives</span>
                  </label>

                  {/* Affichage du délai calculé */}
                  {mandate?.dateLimite && delaiLevel && (
                    <div className="rounded p-3 mt-2"
                      style={{
                        backgroundColor: delaiColors[delaiLevel]?.bg,
                        border: `1px solid ${delaiColors[delaiLevel]?.border}`,
                      }}>
                      <p className="text-xs font-bold mb-1" style={{ color: delaiColors[delaiLevel]?.text }}>
                        {delaiLevel === 'DEPASSE' ? `🔴 Dépassé depuis ${Math.abs(diffDays!)} jour(s)` :
                         delaiLevel === 'CRITIQUE' ? `🔴 Expire dans ${diffDays} jour(s)` :
                         delaiLevel === 'URGENT' ? `🟠 Expire dans ${diffDays} jour(s)` :
                         delaiLevel === 'ATTENTION' ? `🟡 Expire dans ${diffDays} jour(s)` :
                         `✅ ${diffDays} jour(s) restants`}
                      </p>
                      <p className="text-xs" style={{ color: '#6C757D' }}>
                        Date limite : {new Date(mandate.dateLimite).toLocaleDateString('fr-CA', { day: 'numeric', month: 'long', year: 'numeric' })}
                        {mandate.delaiJours && ` (${mandate.delaiJours} jours)`}
                      </p>
                    </div>
                  )}
                </>
              )}

              {form.typeMandat === 'ANNUEL' && (
                <div className="rounded p-3 mt-1"
                  style={{ backgroundColor: '#EBF5FB', border: '1px solid #AED6F1' }}>
                  <p className="text-xs" style={{ color: '#2980B9' }}>
                    🔄 Mandat annuel récurrent — aucun délai de livraison applicable.
                  </p>
                </div>
              )}
            </div>

            <div className="rounded-md p-5" style={{ backgroundColor: '#F8F9FA', border: '1px solid #E9ECEF' }}>
              <p className="text-xs font-bold uppercase tracking-wide mb-3" style={{ color: '#ADB5BD' }}>Infos projet</p>
              <div className="space-y-2">
                {[
                  { label: 'Client', value: project?.client?.name },
                  { label: 'Bâtiment', value: project?.building?.name },
                  { label: 'Type', value: project?.documentType },
                  { label: 'Année', value: project?.year },
                ].map(info => (
                  <div key={info.label} className="flex justify-between">
                    <span className="text-xs" style={{ color: '#ADB5BD' }}>{info.label}</span>
                    <span className="text-xs font-medium" style={{ color: '#2C3E50' }}>{info.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'activities' && (
        <MandateWorkTab projectId={projectId} teamMembers={teamMembers} />
      )}

      {activeTab === 'comments' && (
        <CommentsTab projectId={projectId} />
      )}

      {activeTab === 'timesheet' && (
        <TimesheetTab projectId={projectId} mandate={mandate} />
      )}

    </AppLayout>
  );
}
