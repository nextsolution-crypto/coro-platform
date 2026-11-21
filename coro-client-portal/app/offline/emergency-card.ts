/**
 * Fiche d'urgence hors ligne (audit M2-10) : dernière liste connue des
 * bâtiments (nom, adresse, responsable), gardée sur l'appareil pour que la
 * page hors ligne puisse aider à appeler le 911 avec la bonne adresse.
 * Aucune donnée sensible : ni téléphone personnel, ni jeton.
 */
export const EMERGENCY_CARD_KEY = 'coro_offline_emergency_card_v1';

export interface EmergencyCardBuilding {
  name: string;
  address: string;
  responsable: string | null;
}

export interface EmergencyCard {
  savedAt: string;
  buildings: EmergencyCardBuilding[];
}

type BuildingLike = {
  name?: string | null;
  address?: string | null;
  city?: string | null;
  province?: string | null;
  responsableFirstName?: string | null;
  responsableLastName?: string | null;
};

export function toEmergencyCard(buildings: BuildingLike[], now = new Date()): EmergencyCard {
  return {
    savedAt: now.toISOString(),
    buildings: buildings
      .filter((b) => b && b.name)
      .slice(0, 50)
      .map((b) => ({
        name: String(b.name),
        address: [b.address, b.city, b.province].filter(Boolean).join(', '),
        responsable: [b.responsableFirstName, b.responsableLastName].filter(Boolean).join(' ') || null,
      })),
  };
}

export function saveEmergencyCard(buildings: unknown): void {
  if (!Array.isArray(buildings) || typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(EMERGENCY_CARD_KEY, JSON.stringify(toEmergencyCard(buildings as BuildingLike[])));
  } catch {
    // stockage indisponible (navigation privée) : la page hors ligne garde le 911
  }
}

export function readEmergencyCard(): EmergencyCard | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(EMERGENCY_CARD_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && Array.isArray(parsed.buildings) ? (parsed as EmergencyCard) : null;
  } catch {
    return null;
  }
}
