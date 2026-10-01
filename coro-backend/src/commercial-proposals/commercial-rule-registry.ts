import {
  CapabilityCode,
  CommercialQuantityBasis,
  CommercialScope,
  MeteringSourceQuality,
  ProposalLineSource,
} from '@prisma/client';
import type { Prisma } from '@prisma/client';

export type CommercialRuleLifecycle = 'CURRENT' | 'HISTORICAL';

export type CommercialRuleEvaluation = Readonly<{
  quantity: Prisma.Decimal;
  unit: string;
}>;

export type CommercialRuleDefinition = Readonly<{
  code: string;
  version: string;
  lifecycle: CommercialRuleLifecycle;
  capabilityCode: CapabilityCode;
  scope: CommercialScope;
  metricCode: string;
  metricVersion: string;
  policyVersion: string;
  acceptedSourceQualities: readonly MeteringSourceQuality[];
  measuredUnit: string;
  evaluatedUnit: string;
  evaluator: (input: CommercialRuleEvaluation) => CommercialRuleEvaluation;
}>;

export type CommercialQuantityBinding = Readonly<{
  source:
    | ProposalLineSource
    | 'CATALOG_COMPONENT'
    | 'CUSTOM_COMPONENT'
    | 'EXCLUSIVITY_FEE';
  capabilityId?: string | null;
  capabilityCode?: CapabilityCode | null;
  commercialQuantityBasis?: CommercialQuantityBasis | null;
  commercialRuleCode?: string | null;
  commercialRuleVersion?: string | null;
}>;

export type CommercialBindingValidationOptions = Readonly<{
  requireExplicit: boolean;
  requireCurrentRule: boolean;
}>;

export class CommercialRuleRegistry {
  private readonly definitions: readonly CommercialRuleDefinition[];
  private readonly byIdentity: ReadonlyMap<string, CommercialRuleDefinition>;

  constructor(definitions: readonly CommercialRuleDefinition[] = []) {
    const identities = new Map<string, CommercialRuleDefinition>();
    const currentCodes = new Set<string>();
    const frozen = definitions.map((definition) => {
      this.assertCanonicalDefinition(definition);
      const identity = this.identity(definition.code, definition.version);
      if (identities.has(identity))
        throw new Error(`Duplicate Commercial Rule identity: ${identity}`);
      if (
        definition.lifecycle === 'CURRENT' &&
        currentCodes.has(definition.code)
      )
        throw new Error(
          `Multiple CURRENT Commercial Rule versions: ${definition.code}`,
        );
      if (definition.lifecycle === 'CURRENT') currentCodes.add(definition.code);
      const item = Object.freeze({
        ...definition,
        acceptedSourceQualities: Object.freeze([
          ...definition.acceptedSourceQualities,
        ]),
      });
      identities.set(identity, item);
      return item;
    });
    this.definitions = Object.freeze(frozen);
    this.byIdentity = identities;
  }

  exact(code: string, version: string) {
    return this.byIdentity.get(this.identity(code, version));
  }

  current() {
    return this.definitions
      .filter((definition) => definition.lifecycle === 'CURRENT')
      .slice()
      .sort(
        (left, right) =>
          left.code.localeCompare(right.code) ||
          left.version.localeCompare(right.version),
      );
  }

  private identity(code: string, version: string) {
    return `${code}\u0000${version}`;
  }

  private assertCanonicalDefinition(definition: CommercialRuleDefinition) {
    if (!/^[A-Z][A-Z0-9_]{0,99}$/.test(definition.code))
      throw new Error(`Invalid Commercial Rule code: ${definition.code}`);
    if (
      !definition.version ||
      definition.version.length > 50 ||
      definition.version.trim() !== definition.version
    )
      throw new Error(`Invalid Commercial Rule version: ${definition.version}`);
    if (!definition.acceptedSourceQualities.length)
      throw new Error(
        `Commercial Rule requires a source quality: ${definition.code}`,
      );
    if (!definition.measuredUnit.trim() || !definition.evaluatedUnit.trim())
      throw new Error(`Commercial Rule units are required: ${definition.code}`);
  }
}

export class CommercialBindingError extends Error {}

export const isCommercialQuantityBindingRequired = (
  binding: Pick<CommercialQuantityBinding, 'source' | 'capabilityId'>,
) =>
  binding.capabilityId != null &&
  (binding.source === 'CATALOG_COMPONENT' ||
    binding.source === 'CUSTOM_COMPONENT');

export function validateCommercialQuantityBinding(
  binding: CommercialQuantityBinding,
  registry: CommercialRuleRegistry,
  options: CommercialBindingValidationOptions,
) {
  const basis = binding.commercialQuantityBasis ?? null;
  const code = binding.commercialRuleCode ?? null;
  const version = binding.commercialRuleVersion ?? null;
  const required = isCommercialQuantityBindingRequired(binding);

  if (!basis) {
    if (code || version)
      throw new CommercialBindingError(
        'Une règle commerciale exige une source de quantité commerciale.',
      );
    if (required && options.requireExplicit)
      throw new CommercialBindingError(
        'Une source de quantité commerciale explicite est requise avant finalisation.',
      );
    return;
  }

  if (basis === 'DECLARED') {
    if (code || version)
      throw new CommercialBindingError(
        'Une quantité DECLARED ne peut pas référencer de règle commerciale.',
      );
    return;
  }

  if (!code || !version)
    throw new CommercialBindingError(
      'Une quantité METERED exige le code et la version exacts de la règle commerciale.',
    );
  const definition = registry.exact(code, version);
  if (!definition)
    throw new CommercialBindingError(
      `Règle commerciale inconnue: ${code}/${version}.`,
    );
  if (options.requireCurrentRule && definition.lifecycle !== 'CURRENT')
    throw new CommercialBindingError(
      `La règle commerciale ${code}/${version} n’est pas CURRENT.`,
    );
  if (!binding.capabilityId || !binding.capabilityCode)
    throw new CommercialBindingError(
      'Une quantité METERED exige une capability explicite.',
    );
  if (definition.capabilityCode !== binding.capabilityCode)
    throw new CommercialBindingError(
      `La règle commerciale ${code}/${version} ne correspond pas à la capability sélectionnée.`,
    );
}

export const PRODUCTION_COMMERCIAL_RULE_DEFINITIONS: readonly CommercialRuleDefinition[] =
  Object.freeze([]);

export const PRODUCTION_COMMERCIAL_RULE_REGISTRY = new CommercialRuleRegistry(
  PRODUCTION_COMMERCIAL_RULE_DEFINITIONS,
);
