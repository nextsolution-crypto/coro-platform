'use client';

import { useMemo, useState } from 'react';
import type { ActivityCatalogItem } from './mandateSelection';
import {
  addServiceDraft, canRestoreService, classifyCatalogService, historicalServiceSuggestions,
  MandateCommercialState, MandateServiceDraft, removeServiceDraft, restoreServiceAtEnd,
  updateServiceDraft,
} from './mandateCommercialState';
import type { ApplyRuntimeState, OperationalServiceView, PreviewRuntimeState } from './mandateOperationalState';

type HistoricalActivity = { sourceMandate?: boolean; activityTypeId?: string | null };

type Props = {
  state: MandateCommercialState;
  catalog: ActivityCatalogItem[];
  catalogError: boolean;
  historicalActivities: HistoricalActivity[];
  historicalKnown: boolean;
  canEdit: boolean;
  disabled: boolean;
  validationErrors: Record<string, string>;
  saveError: string;
  onChange: (draft: MandateServiceDraft[]) => void;
  onRetry: () => void;
  onRetryCatalog: () => void;
  onReloadConflict: () => void;
  previewState: PreviewRuntimeState;
  applyState: ApplyRuntimeState;
  successServiceId: string | null;
  operationalView: (service: MandateServiceDraft, commerciallyClean: boolean) => OperationalServiceView;
  onRetryPreview: () => void;
  onCreateActivity: (serviceId: string, serviceName: string) => void;
  onRetryCreate: (serviceId: string) => void;
  onOpenPlanner: () => void;
};

const identity = (service: MandateServiceDraft) => service.id || service.localDraftId || '';

export default function MandateServicesEditor({ state, catalog, catalogError, historicalActivities,
  historicalKnown, canEdit, disabled, validationErrors, saveError, onChange, onRetry, onRetryCatalog,
  onReloadConflict, previewState, applyState, successServiceId, operationalView, onRetryPreview, onCreateActivity,
  onRetryCreate, onOpenPlanner }: Props) {
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [search, setSearch] = useState('');
  const snapshotById = useMemo(() => new Map(state.snapshot.flatMap(service => service.id
    ? [[service.id, service] as const] : [])), [state.snapshot]);
  const catalogById = useMemo(() => new Map(catalog.map(item => [item.activityTypeId, item])), [catalog]);
  const activeCatalogIds = useMemo(() => new Set(catalog.map(item => item.activityTypeId)), [catalog]);
  const suggestions = useMemo(() => historicalServiceSuggestions(historicalActivities), [historicalActivities]);
  const suggestionByType = useMemo(() => new Map(suggestions.map(item => [item.activityTypeId, item.activityCount])), [suggestions]);

  if (state.loadStatus === 'LOADING') return <div className="mt-6 text-sm" aria-busy="true">Chargement des services vendus…</div>;
  if (state.loadStatus === 'ERROR') return (
    <div className="mt-6 rounded p-4" role="alert" style={{ background: '#FDEDEC', color: '#922B21' }}>
      <p>{state.error || "L'offre commerciale n'a pas pu être chargée."}</p>
      <button type="button" className="mt-2 underline" onClick={onRetry}>Réessayer</button>
    </div>
  );

  const draftRemoved = (service: MandateServiceDraft) => service.id
    && snapshotById.get(service.id)?.commercialStatus === 'ACTIVE' && service.commercialStatus === 'REMOVED';
  const persistedRemoved = (service: MandateServiceDraft) => service.id
    && snapshotById.get(service.id)?.commercialStatus === 'REMOVED' && service.commercialStatus === 'REMOVED';
  const draftRestored = (service: MandateServiceDraft) => service.id
    && snapshotById.get(service.id)?.commercialStatus === 'REMOVED' && service.commercialStatus === 'ACTIVE';
  const visible = state.draft.filter(service => !persistedRemoved(service));
  const removed = state.draft.filter(persistedRemoved);
  const filteredCatalog = catalog.filter(item => item.label.toLocaleLowerCase('fr-CA')
    .includes(search.trim().toLocaleLowerCase('fr-CA')));

  const serviceName = (service: MandateServiceDraft) => service.nameFRSnapshot
    || catalogById.get(service.activityTypeId)?.label || 'Service indisponible';
  const restore = (service: MandateServiceDraft) => {
    if (!canRestoreService(state.draft, identity(service), activeCatalogIds)) return;
    onChange(restoreServiceAtEnd(state.draft, identity(service)));
  };

  return (
    <section className="mt-6" aria-labelledby="mandate-services-title">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
        <div>
          <h3 id="mandate-services-title" className="font-semibold" style={{ color: '#2C3E50' }}>Services vendus</h3>
          <p className="text-xs mt-1" style={{ color: '#6C757D' }}>
            Définissez les prestations incluses dans l’offre. Les activités opérationnelles sont gérées séparément.
          </p>
          <p className="text-xs" style={{ color: '#6C757D' }}>Enregistrer l’offre ne crée ni ne modifie automatiquement les activités.</p>
        </div>
        {canEdit && <button type="button" aria-expanded={catalogOpen} aria-controls="mandate-service-catalog"
          disabled={disabled || catalogError} onClick={() => setCatalogOpen(value => !value)}
          className="text-xs font-medium px-3 py-2 rounded disabled:opacity-50"
          style={{ background: '#2C3E50', color: '#FFFFFF' }}>+ Ajouter un service</button>}
      </div>

      {state.historicalTransition === 'HISTORICAL_CONFIRMATION_REQUIRED' && (
        <div className="rounded p-3 mb-3 text-sm" style={{ background: '#FEF9E7', color: '#7D6608', border: '1px solid #F7DC6F' }}>
          {canEdit
            ? "Des activités historiques existent pour ce Mandat. Confirmez les services réellement inclus dans l'offre. Les activités existantes seront conservées."
            : 'La configuration commerciale de ce Mandat doit être confirmée par un administrateur.'}
        </div>
      )}
      {!historicalKnown && state.draft.length === 0 && (
        <p className="text-xs mb-3" style={{ color: '#B9770E' }}>L’historique opérationnel n’a pas pu être vérifié.</p>
      )}
      {catalogError && <div className="text-xs mb-3" role="alert" style={{ color: '#B9770E' }}>
        Le catalogue des services n’a pas pu être chargé. <button type="button" className="underline" onClick={onRetryCatalog}>Réessayer</button>
      </div>}
      {saveError && <div role="alert" className="text-sm mb-3 rounded p-3" style={{ background: '#FDEDEC', color: '#922B21' }}>
        {saveError} {(saveError.includes('modifiée') || saveError.includes('incertain'))
          && <button type="button" className="underline ml-1" onClick={onReloadConflict}>Recharger l’offre</button>}
      </div>}
      {previewState.status === 'LOADING' && <p className="text-xs mb-3" aria-live="polite">Analyse de l’état opérationnel…</p>}
      {(previewState.status === 'ERROR' || previewState.status === 'CONFLICT') && <div role="alert" className="text-sm mb-3 rounded p-3"
        style={{ background: '#FEF9E7', color: '#7D6608' }}><p>{previewState.error}</p>
        <button type="button" className="underline mt-1" onClick={previewState.status === 'CONFLICT' ? onReloadConflict : onRetryPreview}>
          {previewState.status === 'CONFLICT' ? "Recharger l’offre" : 'Réessayer l’analyse'}
        </button></div>}

      {catalogOpen && canEdit && (
        <div id="mandate-service-catalog" className="rounded p-4 mb-4" style={{ background: '#F8F9FA', border: '1px solid #DEE2E6' }}>
          <label htmlFor="mandate-service-search" className="block text-xs font-semibold mb-1">Rechercher dans le catalogue</label>
          <input id="mandate-service-search" value={search} onChange={event => setSearch(event.target.value)}
            className="w-full px-3 py-2 rounded text-sm mb-3" style={{ border: '1px solid #CED4DA' }} />
          <div className="space-y-2">
            {filteredCatalog.map(item => {
              const classification = classifyCatalogService(item.activityTypeId, state.draft);
              const count = suggestionByType.get(item.activityTypeId);
              const restorable = classification.restorableId
                ? canRestoreService(state.draft, classification.restorableId, activeCatalogIds) : false;
              return <div key={item.activityTypeId} className="flex flex-wrap items-center justify-between gap-2 p-2 rounded bg-white">
                <div><p className="text-sm font-medium">{item.label}</p>
                  {count && <p className="text-xs" style={{ color: '#B9770E' }}>Historique détecté · {count} activité{count > 1 ? 's' : ''}</p>}
                </div>
                {classification.state === 'AVAILABLE' && <button type="button" disabled={disabled}
                  onClick={() => onChange(addServiceDraft(state.draft, item.activityTypeId, crypto.randomUUID()))}
                  className="text-xs underline">Ajouter</button>}
                {classification.state === 'REMOVED_RESTORABLE' && <button type="button" disabled={disabled || !restorable}
                  onClick={() => { const service = state.draft.find(row => row.id === classification.restorableId); if (service) restore(service); }}
                  className="text-xs underline">Réajouter</button>}
                {classification.state === 'ALREADY_ACTIVE' && <span className="text-xs" style={{ color: '#6C757D' }}>Déjà dans l’offre</span>}
                {classification.state === 'MULTIPLE_EXISTING' && <span className="text-xs" style={{ color: '#6C757D' }}>Déjà utilisé dans plusieurs lignes de l’offre</span>}
              </div>;
            })}
          </div>
        </div>
      )}

      <div className="space-y-3">
        {visible.length === 0 && <p className="text-sm p-3 rounded" style={{ background: '#F8F9FA', color: '#6C757D' }}>
          {canEdit ? "Aucun service dans l'offre. Ajoutez les prestations prévues au Mandat." : "Aucun service dans l'offre."}
        </p>}
        {visible.map(service => {
          const key = identity(service); const removing = Boolean(draftRemoved(service)); const restoring = Boolean(draftRestored(service));
          const badge = !service.id ? 'Non enregistré' : removing ? 'Retrait non enregistré'
            : restoring ? 'Réajout non enregistré' : 'Vendu';
          const operational = operationalView(service, Boolean(service.id && !removing && !restoring));
          return <article key={key} className="rounded p-3" style={{ border: '1px solid #DEE2E6', background: removing ? '#FEF9E7' : '#FFFFFF' }}>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <div><p className="text-sm font-semibold">{serviceName(service)}</p>
                <span className="text-xs" style={{ color: removing ? '#B9770E' : '#27864A' }}>{badge}</span></div>
              {canEdit && (!service.id ? <button type="button" disabled={disabled} className="text-xs underline"
                onClick={() => onChange(removeServiceDraft(state.draft, key))}>Annuler l’ajout</button>
                : removing ? <button type="button" disabled={disabled} className="text-xs underline"
                  onClick={() => onChange(updateServiceDraft(state.draft, key, { commercialStatus: 'ACTIVE' }))}>Annuler le retrait</button>
                  : restoring ? <button type="button" disabled={disabled} className="text-xs underline"
                    onClick={() => onChange(updateServiceDraft(state.draft, key, { commercialStatus: 'REMOVED',
                      displayOrder: snapshotById.get(service.id!)?.displayOrder ?? service.displayOrder }))}>Annuler le réajout</button>
                    : <button type="button" disabled={disabled} className="text-xs underline" onClick={() => {
                      if (window.confirm("Retirer ce service de l'offre ? Les activités et l'historique associés seront conservés."))
                        onChange(removeServiceDraft(state.draft, key));
                    }}>Retirer de l’offre</button>)}
            </div>
            <div className="rounded p-3 mb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
              style={{ background: '#F8F9FA', border: '1px solid #E9ECEF' }}>
              <div><span className="text-xs font-semibold">{operational.label}</span>
                <p className="text-xs mt-1" style={{ color: '#6C757D' }}>{operational.description}</p>
                {applyState.mandateServiceId === service.id && applyState.error && <div role="alert" className="text-xs mt-1" style={{ color: '#C0392B' }}>
                  <p>{applyState.error}</p>{applyState.status !== 'UNKNOWN' && <button type="button" className="underline mt-1"
                    onClick={applyState.status === 'CONFLICT' ? onReloadConflict : onRetryPreview}>
                    {applyState.status === 'CONFLICT' ? "Recharger l’offre" : 'Réessayer l’analyse'}
                  </button>}
                </div>}
                {successServiceId === service.id && <p aria-live="polite" className="text-xs mt-1" style={{ color: '#27864A' }}>
                  Activité créée. Elle est maintenant prête à être planifiée.
                </p>}
              </div>
              {service.id && operational.primaryAction === 'CREATE' && <button type="button" disabled={disabled || !operational.mutationAllowed}
                onClick={() => onCreateActivity(service.id!, serviceName(service))} className="text-xs px-3 py-2 rounded text-white disabled:opacity-50"
                style={{ background: '#C0392B' }}>Créer l’activité</button>}
              {operational.primaryAction === 'APPLYING' && <button type="button" disabled aria-busy="true"
                className="text-xs px-3 py-2 rounded text-white opacity-50" style={{ background: '#C0392B' }}>Création…</button>}
              {service.id && operational.primaryAction === 'RETRY_CREATE' && <button type="button" disabled={disabled}
                onClick={() => onRetryCreate(service.id!)} className="text-xs px-3 py-2 rounded text-white disabled:opacity-50"
                style={{ background: '#C0392B' }}>Réessayer</button>}
              {operational.planningAction && <button type="button" onClick={onOpenPlanner}
                className="text-xs px-3 py-2 rounded" style={{ border: '1px solid #2980B9', color: '#2980B9' }}>Ouvrir le Planner</button>}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="text-xs">Récurrence
                <select value={service.recurrenceMode} disabled={!canEdit || disabled || removing}
                  onChange={event => onChange(updateServiceDraft(state.draft, key,
                    { recurrenceMode: event.target.value as MandateServiceDraft['recurrenceMode'] }))}
                  className="block w-full mt-1 px-2 py-2 rounded" style={{ border: '1px solid #CED4DA' }}>
                  <option value="ONCE">Une fois</option><option value="ANNUAL">Annuel</option>
                </select></label>
              <label className="text-xs">Quantité
                <input type="number" min="1" step="1" value={Number.isFinite(service.quantity) ? service.quantity : ''}
                  disabled={!canEdit || disabled || removing} onChange={event => onChange(updateServiceDraft(state.draft, key,
                    { quantity: event.target.value === '' ? Number.NaN : Number(event.target.value) }))}
                  className="block w-full mt-1 px-2 py-2 rounded" style={{ border: '1px solid #CED4DA' }} /></label>
            </div>
            {validationErrors[key] && <p role="alert" className="text-xs mt-2" style={{ color: '#C0392B' }}>{validationErrors[key]}</p>}
          </article>;
        })}
      </div>

      {removed.length > 0 && <div className="mt-5">
        <h4 className="text-sm font-semibold mb-2">Services retirés ({removed.length})</h4>
        <div className="space-y-2">{removed.map(service => {
          const key = identity(service); const allowed = canRestoreService(state.draft, key, activeCatalogIds);
          return <div key={key} className="flex flex-wrap items-center justify-between gap-2 rounded p-3" style={{ background: '#F8F9FA' }}>
            <div><p className="text-sm">{serviceName(service)}</p><p className="text-xs" style={{ color: '#6C757D' }}>Retiré de l’offre</p></div>
            {canEdit && <div className="text-right"><button type="button" disabled={disabled || !allowed} onClick={() => restore(service)}
              className="text-xs underline disabled:opacity-50">Réajouter</button>
              {!allowed && <p className="text-xs" style={{ color: '#6C757D' }}>Type indisponible ou déjà actif dans l’offre.</p>}</div>}
          </div>;
        })}</div>
      </div>}
    </section>
  );
}
