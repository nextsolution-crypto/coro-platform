export type ActivityTypeIdentity = { code: string; nameFR: string; visualToken: string; iconKey?: string | null };
const COLORS: Record<string, string> = { BLUE:'#2471a3', CYAN:'#148f9c', VIOLET:'#7d3c98', SLATE:'#566573', INDIGO:'#4b4fa3', NAVY:'#1b4f72', ORANGE:'#ca6f1e', GREEN:'#27864a', AMBER:'#a66b00', ROSE:'#b03a65', NEUTRAL:'#7b858d' };
const ICONS: Record<string, string> = { EXERCISE:'◉', INSPECTION:'⌕', TRAINING:'◆', MEETING:'●', AUDIT:'✓', DOCUMENT:'▤', FIELD:'▲', OTHER:'■' };

// Activités sans type du catalogue (anciennes activités) : on déduit la famille du libellé
// pour qu'elles gardent une couleur reconnaissable plutôt que du gris.
const FAMILIES: Array<[RegExp, string, string]> = [
  [/exercice|évacuation|evacuation|simul/i, 'NAVY', 'EXERCISE'],
  [/formation|séance|seance|atelier/i, 'VIOLET', 'TRAINING'],
  [/relev|visite|inspection|conformit/i, 'ORANGE', 'INSPECTION'],
  [/audit/i, 'AMBER', 'AUDIT'],
  [/rencontre|réunion|reunion|présentation|presentation/i, 'CYAN', 'MEETING'],
  [/document|plan|pmu|psi|pca|rédaction|redaction|mise à jour/i, 'SLATE', 'DOCUMENT'],
];

function inferred(type?: ActivityTypeIdentity) {
  const text = `${type?.nameFR ?? ''} ${type?.code ?? ''}`;
  return FAMILIES.find(([pattern]) => pattern.test(text));
}

export function getActivityTypeVisual(type?: ActivityTypeIdentity) {
  let token = type?.visualToken?.toUpperCase() || 'NEUTRAL';
  let iconKey = type?.iconKey?.toUpperCase();
  if (token === 'NEUTRAL') {
    const family = inferred(type);
    if (family) { token = family[1]; iconKey = iconKey || family[2]; }
  }
  return { label: type?.nameFR || 'Activité', color: COLORS[token] || COLORS.NEUTRAL, icon: iconKey ? ICONS[iconKey] || '■' : '■' };
}
