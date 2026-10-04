export type PopulationIdentityType = 'EMAIL' | 'PHONE';

export function populationIdentityLockKey(input: {
  programId: string;
  identityType: PopulationIdentityType;
  canonicalIdentity: string;
}) {
  return `${input.programId}:${input.identityType.toLowerCase()}:${input.canonicalIdentity}`;
}
