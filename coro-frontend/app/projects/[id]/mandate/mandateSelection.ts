export type ActivityCatalogItem = {
  activityTypeId: string;
  type: string;
  label: string;
  duration: string;
  mode: string;
};

export type SelectedService = {
  activityTypeId: string;
  type: string;
  isRecurring: boolean;
};

export function reconstructMandateServices(activities: any[]): SelectedService[] {
  return activities
    .filter(activity => activity.sourceMandate && activity.activityTypeId && activity.status !== 'annule')
    .map(activity => ({
      activityTypeId: activity.activityTypeId,
      type: activity.type,
      isRecurring: activity.isRecurring,
    }));
}

export function cancelledMandateActivityTypeIds(activities: any[]): Set<string> {
  return new Set(activities
    .filter(activity => activity.sourceMandate && activity.activityTypeId && activity.status === 'annule')
    .map(activity => activity.activityTypeId));
}

export function toggleMandateService(
  selected: SelectedService[],
  activity: ActivityCatalogItem,
  checked: boolean,
): SelectedService[] {
  if (!checked) return selected.filter(service => service.activityTypeId !== activity.activityTypeId);
  if (selected.some(service => service.activityTypeId === activity.activityTypeId)) return selected;
  return [...selected, { activityTypeId: activity.activityTypeId, type: activity.type, isRecurring: false }];
}

export function mandateServicesPayload(selected: SelectedService[]) {
  return selected.map(({ activityTypeId, isRecurring }) => ({ activityTypeId, isRecurring }));
}
