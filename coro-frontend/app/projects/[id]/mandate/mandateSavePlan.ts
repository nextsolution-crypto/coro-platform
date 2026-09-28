export type MandateSavePlan = {
  saveMandate: boolean;
  bootstrapCommercialRevision: boolean;
  saveServices: boolean;
};

export function mandateSavePlan(input: {
  mandateExists: boolean;
  mandateFieldsDirty: boolean;
  servicesDirty: boolean;
  commercialRevision: string | null;
}): MandateSavePlan {
  const saveMandate = input.mandateFieldsDirty || (!input.mandateExists && input.servicesDirty);
  return {
    saveMandate,
    bootstrapCommercialRevision: !input.mandateExists && saveMandate,
    saveServices: input.servicesDirty,
  };
}
