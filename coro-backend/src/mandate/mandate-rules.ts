// Règles des mandats d'une organisation (réglables dans Paramètres > Organisation).
export type MandateRules = {
  mandateTargetMarginPercent: number;
  mandateLongThresholdHours: number;
  mandateShortDeliveryDays: number;
  mandateLongDeliveryDays: number;
  evacuationPlanDeliveryDays: number;
};

export const DEFAULT_MANDATE_RULES: MandateRules = {
  mandateTargetMarginPercent: 50,
  mandateLongThresholdHours: 80,
  mandateShortDeliveryDays: 21,
  mandateLongDeliveryDays: 90,
  evacuationPlanDeliveryDays: 10,
};

export const MANDATE_RULE_LIMITS: Record<keyof MandateRules, [number, number]> = {
  mandateTargetMarginPercent: [0, 95],
  mandateLongThresholdHours: [1, 2000],
  mandateShortDeliveryDays: [1, 365],
  mandateLongDeliveryDays: [1, 730],
  evacuationPlanDeliveryDays: [1, 365],
};

export const MANDATE_RULE_SELECT = {
  mandateTargetMarginPercent: true,
  mandateLongThresholdHours: true,
  mandateShortDeliveryDays: true,
  mandateLongDeliveryDays: true,
  evacuationPlanDeliveryDays: true,
} as const;

// Délai de livraison forfaitaire après le relevé technique.
export function deliveryDays(rules: MandateRules, typeDelai: string | null | undefined, heures: number): number {
  if (typeDelai === 'EVACUATION') return rules.evacuationPlanDeliveryDays;
  return heures >= rules.mandateLongThresholdHours ? rules.mandateLongDeliveryDays : rules.mandateShortDeliveryDays;
}

export async function loadMandateRules(db: any, organizationId: string): Promise<MandateRules> {
  const org = await db.organization?.findUnique?.({ where: { id: organizationId }, select: MANDATE_RULE_SELECT });
  return { ...DEFAULT_MANDATE_RULES, ...(org ?? {}) };
}
