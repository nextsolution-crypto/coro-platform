export interface ValueAnalysisRequest {
  mandatesPerYear: string;
  averageHoursPerMandate: string;
  billableRateMinorPerHour: string;
  productivityGainBasisPoints: number;
}
const scaled = (v: string) => {
  if (!/^\d+(\.\d{1,6})?$/.test(v)) throw new Error('Invalid decimal');
  const [a, b = ''] = v.split('.');
  return BigInt(a) * 1_000_000n + BigInt(b.padEnd(6, '0'));
};
const halfUp = (numerator: bigint, denominator: bigint) =>
  (numerator + denominator / 2n) / denominator;
export const calculateValueAnalysis = (x: ValueAnalysisRequest) => {
  if (
    !Number.isInteger(x.productivityGainBasisPoints) ||
    x.productivityGainBasisPoints < 0 ||
    x.productivityGainBasisPoints > 10000
  )
    throw new Error('Invalid gain');
  const hoursScaled = halfUp(
    scaled(x.mandatesPerYear) *
      scaled(x.averageHoursPerMandate) *
      BigInt(x.productivityGainBasisPoints),
    10_000n * 1_000_000n,
  );
  const value = halfUp(
    hoursScaled * BigInt(x.billableRateMinorPerHour),
    1_000_000n,
  );
  return {
    estimatedHoursSaved: `${hoursScaled / 1_000_000n}.${(hoursScaled % 1_000_000n).toString().padStart(6, '0')}`,
    estimatedCapacityValueMinor: value.toString(),
    methodologyVersion: 'proposal-value/v1',
    roundingPolicy: 'HALF_UP_MINOR_UNIT',
  };
};
