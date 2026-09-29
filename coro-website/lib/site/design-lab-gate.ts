/**
 * Exposure policy for the internal Design Lab (/design-lab).
 * Development and test: available by default. Production: 404 unless the SERVER-SIDE variable DESIGN_LAB_ENABLED is exactly "true".
 * Strict opt-in: "1", "TRUE", " true" or any other value keeps the Lab disabled. There is deliberately no client-exposed variant.
 */
export function isDesignLabEnabled({ nodeEnv, explicitFlag }: { nodeEnv?: string; explicitFlag?: string }): boolean {
  if (nodeEnv === 'production') return explicitFlag === 'true';
  return true;
}
