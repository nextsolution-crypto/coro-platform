// ============================================================
// CORO — Limites d'usage par palier de licence
// ============================================================

export const LICENSE_LIMITS: Record<string, { maxUsers: number | null; maxProjects: number | null }> = {
  ESSAI_GRATUIT: { maxUsers: 1, maxProjects: 1 },
  STANDARD:      { maxUsers: null, maxProjects: null },
  ENTREPRISE:    { maxUsers: null, maxProjects: null },
};

export function getLimitsForLicense(licenseType: string) {
  return LICENSE_LIMITS[licenseType] || LICENSE_LIMITS.ESSAI_GRATUIT;
}