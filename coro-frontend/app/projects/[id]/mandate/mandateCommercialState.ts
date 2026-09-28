export type MandateServiceStatus = 'ACTIVE' | 'REMOVED';
export type MandateServiceRecurrence = 'ONCE' | 'ANNUAL';

export type MandateServiceServer = {
  id: string;
  projectMandateId: string;
  activityTypeId: string;
  commercialStatus: MandateServiceStatus;
  recurrenceMode: MandateServiceRecurrence;
  quantity: number;
  displayOrder: number;
  nameFRSnapshot: string;
  nameENSnapshot: string | null;
  removedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type MandateServiceDraft = {
  id?: string;
  localDraftId?: string;
  activityTypeId: string;
  commercialStatus: MandateServiceStatus;
  recurrenceMode: MandateServiceRecurrence;
  quantity: number;
  displayOrder: number;
  nameFRSnapshot?: string;
  nameENSnapshot?: string | null;
};

export type MandateCommercialState = {
  modelAvailable: boolean;
  loadStatus: 'IDLE' | 'LOADING' | 'READY' | 'ERROR';
  error: string | null;
  revision: string | null;
  snapshot: MandateServiceDraft[];
  draft: MandateServiceDraft[];
  historicalTransition: HistoricalCommercialTransition;
};

export const emptyMandateCommercialState = (): MandateCommercialState => ({
  modelAvailable: false, loadStatus: 'IDLE', error: null, revision: null, snapshot: [], draft: [],
  historicalTransition: 'NEW_EMPTY',
});

export const serviceDraftsFromServer = (services: MandateServiceServer[]): MandateServiceDraft[] => services
  .map(service => ({
    id: service.id,
    activityTypeId: service.activityTypeId,
    commercialStatus: service.commercialStatus,
    recurrenceMode: service.recurrenceMode,
    quantity: service.quantity,
    displayOrder: service.displayOrder,
    nameFRSnapshot: service.nameFRSnapshot,
    nameENSnapshot: service.nameENSnapshot,
  }))
  .sort((a, b) => a.displayOrder - b.displayOrder || (a.id || '').localeCompare(b.id || ''));

export const cloneServiceDrafts = (services: MandateServiceDraft[]) => services.map(service => ({ ...service }));

const comparable = (services: MandateServiceDraft[]) => services.map((service, displayOrder) => ({
  identity: service.id || service.localDraftId,
  activityTypeId: service.activityTypeId,
  commercialStatus: service.commercialStatus,
  recurrenceMode: service.recurrenceMode,
  quantity: service.quantity,
  displayOrder,
}));

export const mandateServicesAreDirty = (draft: MandateServiceDraft[], snapshot: MandateServiceDraft[]) =>
  JSON.stringify(comparable(draft)) !== JSON.stringify(comparable(snapshot));

export const resetServiceDrafts = (snapshot: MandateServiceDraft[]) => cloneServiceDrafts(snapshot);

export function updateServiceDraft(services: MandateServiceDraft[], identity: string,
  change: Partial<Omit<MandateServiceDraft, 'id' | 'localDraftId'>>) {
  return services.map(service => (service.id || service.localDraftId) === identity ? { ...service, ...change } : service);
}

export const removeServiceDraft = (services: MandateServiceDraft[], identity: string) => services
  .filter(service => service.id || (service.id || service.localDraftId) !== identity)
  .map(service => (service.id || service.localDraftId) === identity
    ? { ...service, commercialStatus: 'REMOVED' as const }
    : service);

export const restoreServiceDraft = (services: MandateServiceDraft[], identity: string) => services
  .map(service => (service.id || service.localDraftId) === identity
    ? { ...service, commercialStatus: 'ACTIVE' as const }
    : service);

export function addServiceDraft(services: MandateServiceDraft[], activityTypeId: string,
  localDraftId: string, allowDuplicate = false): MandateServiceDraft[] {
  if (!allowDuplicate && services.some(service => service.activityTypeId === activityTypeId
    && service.commercialStatus === 'ACTIVE')) return services;
  return [...services, { localDraftId, activityTypeId, commercialStatus: 'ACTIVE', recurrenceMode: 'ONCE',
    quantity: 1, displayOrder: services.length }];
}

export function buildSaveMandateServicesPayload(expectedRevision: string, draft: MandateServiceDraft[]) {
  return { expectedRevision, services: draft.filter(service => service.commercialStatus !== 'REMOVED')
    .map((service, displayOrder) => ({
      ...(service.id ? { id: service.id } : {}), activityTypeId: service.activityTypeId,
      recurrenceMode: service.recurrenceMode, quantity: service.quantity, displayOrder,
    })) };
}

export const historicalServiceTransition = (before: MandateServiceDraft, after: MandateServiceDraft) => ({
  removed: before.commercialStatus !== 'REMOVED' && after.commercialStatus === 'REMOVED',
  restored: before.commercialStatus === 'REMOVED' && after.commercialStatus !== 'REMOVED',
});

export type HistoricalCommercialTransition = 'NEW_EMPTY' | 'COMMERCIAL_CONFIGURED'
  | 'HISTORICAL_CONFIRMATION_REQUIRED';

export function deriveHistoricalCommercialTransition(mandateExists: boolean, services: MandateServiceDraft[],
  activities: Array<{ sourceMandate?: boolean }>): HistoricalCommercialTransition {
  if (!mandateExists) return 'NEW_EMPTY';
  if (services.length > 0) return 'COMMERCIAL_CONFIGURED';
  return activities.some(activity => activity.sourceMandate) ? 'HISTORICAL_CONFIRMATION_REQUIRED' : 'NEW_EMPTY';
}

export function historicalServiceSuggestions(activities: Array<{ sourceMandate?: boolean; activityTypeId?: string | null }>) {
  const counts = new Map<string, number>();
  for (const activity of activities) {
    if (!activity.sourceMandate || !activity.activityTypeId) continue;
    counts.set(activity.activityTypeId, (counts.get(activity.activityTypeId) || 0) + 1);
  }
  return Array.from(counts.entries()).map(([activityTypeId, activityCount]) =>
    ({ activityTypeId, activityCount, selected: false as const }));
}

export const canEditMandateServices = (role?: string | null) => role === 'ADMIN' || role === 'SUPER_ADMIN';
export const canApplyMandateOperations = canEditMandateServices;

export type CatalogServiceState = 'AVAILABLE' | 'ALREADY_ACTIVE' | 'REMOVED_RESTORABLE' | 'MULTIPLE_EXISTING';

export function classifyCatalogService(activityTypeId: string, draft: MandateServiceDraft[]): {
  state: CatalogServiceState; restorableId?: string;
} {
  const rows = draft.filter(service => service.activityTypeId === activityTypeId);
  const active = rows.filter(service => service.commercialStatus === 'ACTIVE');
  const removed = rows.filter(service => service.commercialStatus === 'REMOVED');
  if (active.length > 1 || removed.length > 1) return { state: 'MULTIPLE_EXISTING' };
  if (active.length === 1) return { state: 'ALREADY_ACTIVE' };
  if (removed.length === 1) return { state: 'REMOVED_RESTORABLE', restorableId: removed[0].id };
  return { state: 'AVAILABLE' };
}

export function canRestoreService(draft: MandateServiceDraft[], identity: string, activeCatalogIds: Set<string>) {
  const row = draft.find(service => (service.id || service.localDraftId) === identity);
  if (!row || row.commercialStatus !== 'REMOVED' || !activeCatalogIds.has(row.activityTypeId)) return false;
  const sameType = draft.filter(service => service.activityTypeId === row.activityTypeId);
  return sameType.filter(service => service.commercialStatus === 'ACTIVE').length === 0
    && sameType.filter(service => service.commercialStatus === 'REMOVED').length === 1;
}

export function restoreServiceAtEnd(draft: MandateServiceDraft[], identity: string) {
  const maxOrder = draft.filter(service => service.commercialStatus === 'ACTIVE')
    .reduce((max, service) => Math.max(max, service.displayOrder), -1);
  return updateServiceDraft(restoreServiceDraft(draft, identity), identity, { displayOrder: maxOrder + 1 });
}

export type MandateServiceValidation = { valid: boolean; errors: Record<string, string> };

export function validateMandateServices(draft: MandateServiceDraft[], snapshot: MandateServiceDraft[],
  activeCatalogIds: Set<string>): MandateServiceValidation {
  const errors: Record<string, string> = {};
  const snapshotById = new Map(snapshot.flatMap(service => service.id ? [[service.id, service] as const] : []));
  for (const service of draft.filter(item => item.commercialStatus === 'ACTIVE')) {
    const identity = service.id || service.localDraftId || service.activityTypeId;
    if (!service.activityTypeId) errors[identity] = "Le type d'activité est requis.";
    else if (!Number.isInteger(service.quantity) || service.quantity < 1) errors[identity] = 'La quantité doit être un entier supérieur ou égal à 1.';
    else if (!['ONCE', 'ANNUAL'].includes(service.recurrenceMode)) errors[identity] = 'La récurrence est invalide.';
    else {
      const before = service.id ? snapshotById.get(service.id) : undefined;
      const requiresActiveCatalog = !before || before.commercialStatus === 'REMOVED';
      if (requiresActiveCatalog && !activeCatalogIds.has(service.activityTypeId)) {
        errors[identity] = "Ce type d'activité n'est pas disponible dans le catalogue.";
      }
    }
  }
  return { valid: Object.keys(errors).length === 0, errors };
}

export function normalizeMandateApiError(error: unknown, fallback = 'Une erreur est survenue.') {
  const value = error as { response?: { status?: number; data?: { message?: unknown; code?: string } } };
  const message = value.response?.data?.message;
  const status = value.response?.status ?? null;
  const kind = status === null ? 'network' : status === 400 ? 'validation' : status === 403 ? 'forbidden'
    : status === 404 ? 'not_found' : status === 409 ? 'conflict' : 'server';
  return { status, kind, code: value.response?.data?.code ?? null,
    message: Array.isArray(message) ? message.join(' ') : (typeof message === 'string' ? message : fallback) };
}
