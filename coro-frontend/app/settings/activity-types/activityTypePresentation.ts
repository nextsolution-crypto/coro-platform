export const COLOR_OPTIONS = [
  { value: 'BLUE', label: 'Bleu', color: '#2471a3' },
  { value: 'CYAN', label: 'Turquoise', color: '#148f9c' },
  { value: 'VIOLET', label: 'Violet', color: '#7d3c98' },
  { value: 'SLATE', label: 'Ardoise', color: '#566573' },
  { value: 'INDIGO', label: 'Indigo', color: '#4b4fa3' },
  { value: 'NAVY', label: 'Bleu marine', color: '#1b4f72' },
  { value: 'ORANGE', label: 'Orange', color: '#ca6f1e' },
  { value: 'GREEN', label: 'Vert', color: '#27864a' },
  { value: 'AMBER', label: 'Ambre', color: '#a66b00' },
  { value: 'ROSE', label: 'Rose', color: '#b03a65' },
  { value: 'NEUTRAL', label: 'Neutre', color: '#7b858d' },
] as const;

export const ICON_OPTIONS = [
  { value: 'EXERCISE', label: 'Exercice', glyph: '◎' },
  { value: 'INSPECTION', label: 'Inspection', glyph: '⌕' },
  { value: 'TRAINING', label: 'Formation', glyph: '◆' },
  { value: 'MEETING', label: 'Réunion', glyph: '●' },
  { value: 'AUDIT', label: 'Audit', glyph: '✓' },
  { value: 'DOCUMENT', label: 'Document', glyph: '▤' },
  { value: 'FIELD', label: 'Terrain', glyph: '▲' },
  { value: 'OTHER', label: 'Autre', glyph: '■' },
] as const;

export type ActivityTypeForm = {
  nameFR: string; nameEN: string; visualToken: string; iconKey: string;
  defaultDurationMinutes: string; clientBookableDefault: boolean; displayOrder: string;
};

export const EMPTY_ACTIVITY_TYPE_FORM: ActivityTypeForm = {
  nameFR: '', nameEN: '', visualToken: 'BLUE', iconKey: 'OTHER',
  defaultDurationMinutes: '', clientBookableDefault: false, displayOrder: '',
};

export function colorPresentation(token?: string) {
  return COLOR_OPTIONS.find(option => option.value === token) ??
    { value: 'NEUTRAL' as const, label: 'Neutre', color: '#7b858d' };
}

export function iconPresentation(iconKey?: string | null) {
  return ICON_OPTIONS.find(option => option.value === iconKey) ??
    { value: 'OTHER' as const, label: 'Autre', glyph: '■' };
}

export function formatDefaultDuration(minutes?: number | null): string {
  if (!minutes) return 'Durée libre';
  const hours = Math.floor(minutes / 60); const remainder = minutes % 60;
  if (!hours) return `${remainder} min`;
  return `${hours} h${remainder ? ` ${remainder}` : ''}`;
}

export function activityTypeState(isActive: boolean) {
  return isActive ? { label: 'Actif', action: 'Archiver' } : { label: 'Archivé', action: 'Réactiver' };
}

export function activityTypePayload(form: ActivityTypeForm) {
  return {
    nameFR: form.nameFR.trim(), nameEN: form.nameEN.trim(),
    visualToken: form.visualToken, iconKey: form.iconKey,
    defaultDurationMinutes: form.defaultDurationMinutes ? Number(form.defaultDurationMinutes) : undefined,
    clientBookableDefault: form.clientBookableDefault,
    displayOrder: form.displayOrder ? Number(form.displayOrder) : undefined,
  };
}
