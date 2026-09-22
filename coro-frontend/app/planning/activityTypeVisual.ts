export type ActivityTypeIdentity = { code: string; nameFR: string; visualToken: string; iconKey?: string | null };
const COLORS: Record<string, string> = { BLUE:'#2471a3', CYAN:'#148f9c', VIOLET:'#7d3c98', SLATE:'#566573', INDIGO:'#4b4fa3', NAVY:'#1b4f72', ORANGE:'#ca6f1e', GREEN:'#27864a', AMBER:'#a66b00', ROSE:'#b03a65', NEUTRAL:'#7b858d' };
const ICONS: Record<string, string> = { EXERCISE:'◉', INSPECTION:'⌕', TRAINING:'◆', MEETING:'●', AUDIT:'✓', DOCUMENT:'▤', FIELD:'▲', OTHER:'■' };
export function getActivityTypeVisual(type?: ActivityTypeIdentity) {
  const token = type?.visualToken?.toUpperCase() || 'NEUTRAL';
  return { label: type?.nameFR || 'Activité', color: COLORS[token] || COLORS.NEUTRAL, icon: type?.iconKey ? ICONS[type.iconKey.toUpperCase()] || '■' : '■' };
}
