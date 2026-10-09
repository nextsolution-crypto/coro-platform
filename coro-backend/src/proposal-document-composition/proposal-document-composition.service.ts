import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CommercialClauseCategory,
  Prisma,
  ProposalDocumentTemplateCode,
  ProposalLanguage,
} from '@prisma/client';
import { AdminAuditService } from '../admin-audit/admin-audit.service';
import { buildProposalCustomerPreview } from '../commercial-proposals/proposal-customer-preview';
import { PrismaService } from '../prisma/prisma.service';
import { canonicalSha256 } from './canonical-json';
import { ComposeProposalDocumentDto } from './proposal-document-composition.dto';
import {
  CompositionDiagnostic,
  CompositionResult,
  ProposalDocumentCompositionContent,
} from './proposal-document-composition.types';
import {
  PROPOSAL_DOCUMENT_SECTION_ORDER,
  PROPOSAL_DOCUMENT_TEMPLATE_VERSION,
  ProposalDocumentSectionCode,
  resolveProposalDocumentTemplate,
} from './proposal-document-template.registry';

type Actor = { userId: string };
type Transaction = Prisma.TransactionClient;
type ParameterDefinition = {
  key: string;
  type:
    | 'DURATION_DAYS'
    | 'DURATION_MONTHS'
    | 'MONEY_MINOR'
    | 'DECIMAL'
    | 'TEXT'
    | 'JURISDICTION';
  required: boolean;
};

const revisionInclude = {
  proposal: true,
  createdBy: true,
  lines: true,
  inputs: true,
  exclusivities: { include: { sectors: true } },
  commitments: true,
  valueAnalysis: true,
  legalIssuerSnapshot: true,
  simulationConversion: {
    include: {
      scenario: {
        include: {
          families: { orderBy: { displayOrder: 'asc' as const } },
          capabilities: {
            include: { capability: { select: { code: true } } },
          },
        },
      },
    },
  },
} as const;

type RevisionSource = Prisma.CommercialProposalRevisionGetPayload<{
  include: typeof revisionInclude;
}>;

const clauseSections: Record<
  CommercialClauseCategory,
  ProposalDocumentSectionCode
> = {
  OFFER_VALIDITY: 'COMMERCIAL_SAAS_CONDITIONS',
  CURRENCY_AND_TAXES: 'COMMERCIAL_SAAS_CONDITIONS',
  PAYMENT_TERMS: 'COMMERCIAL_SAAS_CONDITIONS',
  INVOICING: 'COMMERCIAL_SAAS_CONDITIONS',
  SAAS_SUBSCRIPTION: 'COMMERCIAL_SAAS_CONDITIONS',
  RENEWAL: 'COMMERCIAL_SAAS_CONDITIONS',
  TERMINATION: 'COMMERCIAL_SAAS_CONDITIONS',
  SUSPENSION: 'COMMERCIAL_SAAS_CONDITIONS',
  SUPPORT_AND_MAINTENANCE: 'COMMERCIAL_SAAS_CONDITIONS',
  SERVICE_AVAILABILITY: 'COMMERCIAL_SAAS_CONDITIONS',
  IMPLEMENTATION: 'IMPLEMENTATION',
  PROFESSIONAL_SERVICES: 'PROFESSIONAL_SERVICES',
  SCOPE_CHANGE: 'COMMERCIAL_SAAS_CONDITIONS',
  CUSTOMER_OBLIGATIONS: 'RESPONSIBILITIES',
  DELAYS: 'RESPONSIBILITIES',
  ADDITIONAL_FEES: 'COMMERCIAL_SAAS_CONDITIONS',
  PENALTIES: 'COMMERCIAL_SAAS_CONDITIONS',
  CONFIDENTIALITY: 'COMMERCIAL_SAAS_CONDITIONS',
  DATA_PROTECTION: 'DATA_PROTECTION',
  DATA_RETENTION_AND_RETURN: 'DATA_PROTECTION',
  INTELLECTUAL_PROPERTY: 'RESPONSIBILITIES',
  LIABILITY: 'RESPONSIBILITIES',
  FORCE_MAJEURE: 'RESPONSIBILITIES',
  GOVERNING_LAW: 'COMMERCIAL_SAAS_CONDITIONS',
  ACCEPTANCE: 'ACCEPTANCE',
};

@Injectable()
export class ProposalDocumentCompositionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AdminAuditService,
  ) {}

  composeInternalDraft(
    proposalId: string,
    revisionId: string,
    dto: ComposeProposalDocumentDto,
    actor: Actor,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const lockKey = `${revisionId}:${dto.templateCode}:${dto.language}`;
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${lockKey}, 0))`;
      const result = await this.resolve(
        tx,
        proposalId,
        revisionId,
        dto.templateCode,
        dto.language,
        dto.clauseParameters ?? {},
      );
      const compositionKey = canonicalSha256({
        proposalRevisionId: revisionId,
        templateCode: dto.templateCode,
        language: dto.language,
        canonicalHash: result.canonicalHash,
      });
      const existing = await tx.proposalDocumentCompositionSnapshot.findUnique({
        where: { compositionKey },
      });
      if (existing) return this.response(existing);
      const latest = await tx.proposalDocumentCompositionSnapshot.aggregate({
        where: {
          proposalRevisionId: revisionId,
          templateCode: dto.templateCode,
          language: dto.language,
        },
        _max: { sequence: true },
      });
      const created = await tx.proposalDocumentCompositionSnapshot.create({
        data: {
          proposalRevisionId: revisionId,
          templateCode: dto.templateCode,
          templateVersion: PROPOSAL_DOCUMENT_TEMPLATE_VERSION,
          language: dto.language,
          sequence: (latest._max.sequence ?? 0) + 1,
          readiness: result.readiness,
          issuanceReady: result.issuanceReady,
          compositionKey,
          canonicalHash: result.canonicalHash,
          snapshot: result.content as unknown as Prisma.InputJsonValue,
          diagnostics: [...result.diagnostics],
          composedByUserId: actor.userId,
        },
      });
      await this.audit.record(tx, {
        actorUserId: actor.userId,
        action: 'PROPOSAL_DOCUMENT_COMPOSITION_CAPTURED',
        targetType: 'ProposalDocumentCompositionSnapshot',
        targetId: created.id,
        organizationId: null,
        afterData: {
          proposalId,
          proposalRevisionId: revisionId,
          templateCode: dto.templateCode,
          language: dto.language,
          sequence: created.sequence,
          readiness: created.readiness,
          canonicalHash: created.canonicalHash,
        },
      });
      return this.response(created);
    });
  }

  async history(proposalId: string, revisionId: string) {
    await this.assertRevision(this.prisma, proposalId, revisionId);
    const snapshots =
      await this.prisma.proposalDocumentCompositionSnapshot.findMany({
        where: { proposalRevisionId: revisionId },
        orderBy: [{ composedAt: 'desc' }, { sequence: 'desc' }],
        select: {
          id: true,
          templateCode: true,
          templateVersion: true,
          language: true,
          sequence: true,
          readiness: true,
          issuanceReady: true,
          canonicalHash: true,
          diagnostics: true,
          composedAt: true,
          composedByUserId: true,
        },
      });
    return snapshots;
  }

  async metadata(proposalId: string, revisionId: string, snapshotId: string) {
    await this.assertRevision(this.prisma, proposalId, revisionId);
    const snapshot =
      await this.prisma.proposalDocumentCompositionSnapshot.findFirst({
        where: { id: snapshotId, proposalRevisionId: revisionId },
      });
    if (!snapshot)
      throw new NotFoundException('Document composition snapshot not found.');
    return this.response(snapshot);
  }

  private async resolve(
    tx: Transaction,
    proposalId: string,
    revisionId: string,
    templateCode: ProposalDocumentTemplateCode,
    language: ProposalLanguage,
    suppliedParameters: Record<string, unknown>,
  ): Promise<CompositionResult> {
    const revision = await tx.commercialProposalRevision.findFirst({
      where: { id: revisionId, proposalId },
      include: revisionInclude,
    });
    if (!revision) throw new NotFoundException('Proposal revision not found.');
    const template = resolveProposalDocumentTemplate(templateCode);
    const diagnostics: CompositionDiagnostic[] = [];
    const preview = buildProposalCustomerPreview(revision);
    const familyCodes =
      revision.simulationConversion?.scenario.families.map(
        ({ familyCode }) => familyCode,
      ) ?? [];
    this.validateFamilyAuthority(templateCode, familyCodes, diagnostics);
    this.validateEconomics(preview, diagnostics);

    const content = await this.resolveContent(
      tx,
      template.contentCodes,
      language,
      {
        familyCodes,
        componentCodes: revision.lines.map(
          ({ componentCode }) => componentCode,
        ),
        capabilityCodes:
          revision.simulationConversion?.scenario.capabilities.map(
            ({ capability }) => capability.code,
          ) ?? [],
      },
      diagnostics,
    );
    const issuer = await this.resolveIssuer(tx, revision, diagnostics);
    const clauses = await this.resolveClauses(
      tx,
      template.clauseScope,
      template.requiredClauseCategories,
      language,
      suppliedParameters,
      diagnostics,
    );
    const economics: ProposalDocumentCompositionContent['economics'] = {
      currency: preview.currency,
      lines: preview.lines,
      totals: preview.totals,
      inputs: preview.inputs,
      valueAnalysis: preview.valueAnalysis,
      exclusivities: preview.exclusivities,
      commitments: preview.commitments,
      commercialTerms: preview.commercialTerms,
      validity: preview.validity,
    };
    const sections = this.sections(
      revision,
      language,
      preview,
      content.items,
      clauses.items,
    );
    const composition: ProposalDocumentCompositionContent = {
      schemaVersion: 'proposal-document-composition/v1',
      proposalRevisionId: revision.id,
      proposalReference: revision.proposal.reference,
      proposalRevisionNumber: revision.revisionNumber,
      template: {
        code: template.code,
        version: PROPOSAL_DOCUMENT_TEMPLATE_VERSION,
      },
      language,
      familyCodes,
      recipient: preview.customer,
      issuer: issuer.value,
      economics,
      sections,
      clauses: clauses.items,
      provenance: {
        contentVersionIds: content.versionIds,
        legalIssuerVersionId: issuer.versionId,
        clauseVersionIds: clauses.versionIds,
      },
    };
    const orderedDiagnostics = [...diagnostics].sort((left, right) =>
      `${left.severity}:${left.code}:${left.subject ?? ''}`.localeCompare(
        `${right.severity}:${right.code}:${right.subject ?? ''}`,
      ),
    );
    const issuanceReady = !orderedDiagnostics.some(
      ({ severity }) => severity === 'BLOCKING',
    );
    return {
      content: composition,
      diagnostics: orderedDiagnostics,
      readiness: issuanceReady ? 'ISSUANCE_READY' : 'INTERNAL_DRAFT',
      issuanceReady,
      canonicalHash: canonicalSha256(composition),
    };
  }

  private validateFamilyAuthority(
    templateCode: ProposalDocumentTemplateCode,
    familyCodes: readonly string[],
    diagnostics: CompositionDiagnostic[],
  ) {
    const template = resolveProposalDocumentTemplate(templateCode);
    if (!familyCodes.length) {
      diagnostics.push({
        code: 'FAMILY_AUTHORITY_MISSING',
        severity: 'BLOCKING',
      });
      return;
    }
    if (
      template.familyCodes.length &&
      !template.familyCodes.every((code) => familyCodes.includes(code))
    )
      diagnostics.push({
        code: 'TEMPLATE_FAMILY_MISMATCH',
        severity: 'BLOCKING',
        subject: templateCode,
      });
    if (
      templateCode === 'CORO_PROFESSIONAL' &&
      familyCodes.some(
        (code) => code !== 'PROFESSIONAL' && code !== 'PROFESSIONAL_SERVICES',
      )
    )
      diagnostics.push({
        code: 'PROFESSIONAL_FAMILY_ISOLATION_FAILED',
        severity: 'BLOCKING',
      });
  }

  private validateEconomics(
    preview: ReturnType<typeof buildProposalCustomerPreview>,
    diagnostics: CompositionDiagnostic[],
  ) {
    if (
      !preview.currency ||
      !preview.lines.length ||
      preview.totals.firstYearMinor === null
    )
      diagnostics.push({
        code: 'CUSTOMER_SAFE_ECONOMICS_INCOMPLETE',
        severity: 'BLOCKING',
      });
  }

  private async resolveContent(
    tx: Transaction,
    contentCodes: readonly string[],
    language: ProposalLanguage,
    composition: {
      familyCodes: readonly string[];
      componentCodes: readonly string[];
      capabilityCodes: readonly string[];
    },
    diagnostics: CompositionDiagnostic[],
  ) {
    if (!contentCodes.length) {
      diagnostics.push({
        code: 'TEMPLATE_CONTENT_NOT_CONFIGURED',
        severity: 'BLOCKING',
      });
      return { items: [], versionIds: [] };
    }
    const records = await tx.commercialContent.findMany({
      where: { code: { in: [...contentCodes] } },
      orderBy: { code: 'asc' },
      include: {
        versions: {
          where: { status: 'APPROVED' },
          orderBy: { versionNumber: 'desc' },
          take: 1,
          include: { bindings: { orderBy: { displayOrder: 'asc' } } },
        },
      },
    });
    const byCode = new Map(records.map((record) => [record.code, record]));
    const items: Record<string, unknown>[] = [];
    const versionIds: string[] = [];
    for (const code of contentCodes) {
      const version = byCode.get(code)?.versions[0];
      if (!version) {
        diagnostics.push({
          code: 'APPROVED_COMMERCIAL_CONTENT_MISSING',
          severity: 'BLOCKING',
          subject: code,
        });
        continue;
      }
      const title = language === 'FR' ? version.titleFR : version.titleEN;
      const description =
        language === 'FR' ? version.descriptionFR : version.descriptionEN;
      if (!title?.trim() || !description?.trim()) {
        diagnostics.push({
          code: 'COMMERCIAL_CONTENT_LANGUAGE_INCOMPLETE',
          severity: 'BLOCKING',
          subject: code,
        });
        continue;
      }
      const bindings = version.bindings
        .filter(
          (binding) =>
            binding.commercialIntent === 'INCLUDED' &&
            !['FUTURE', 'UNVERIFIED'].includes(binding.deliveryMaturity) &&
            (binding.targetType === 'FUNCTIONAL_FEATURE' ||
              (binding.targetType === 'FAMILY' &&
                composition.familyCodes.includes(binding.targetCode)) ||
              (binding.targetType === 'COMPONENT' &&
                composition.componentCodes.includes(binding.targetCode)) ||
              (binding.targetType === 'CAPABILITY' &&
                composition.capabilityCodes.includes(binding.targetCode))),
        )
        .map((binding) => ({
          targetType: binding.targetType,
          targetCode: binding.targetCode,
          label:
            language === 'FR' ? binding.labelFR : (binding.labelEN ?? null),
          deliveryMaturity: binding.deliveryMaturity,
        }));
      if (bindings.some(({ label }) => !label))
        diagnostics.push({
          code: 'COMMERCIAL_BINDING_LANGUAGE_INCOMPLETE',
          severity: 'BLOCKING',
          subject: code,
        });
      items.push({ code, title, description, bindings });
      versionIds.push(version.id);
    }
    return { items, versionIds };
  }

  private async resolveIssuer(
    tx: Transaction,
    revision: RevisionSource,
    diagnostics: CompositionDiagnostic[],
  ) {
    if (revision.legalIssuerSnapshot) {
      const source = revision.legalIssuerSnapshot;
      return {
        versionId: source.legalIssuerVersionId,
        value: this.issuerFields(source),
      };
    }
    const verified = await tx.commercialLegalIssuerVersion.findMany({
      where: { status: 'VERIFIED' },
      orderBy: [{ verifiedAt: 'desc' }, { versionNumber: 'desc' }],
      include: { commercialLegalIssuer: { select: { code: true } } },
      take: 2,
    });
    if (!verified.length) {
      diagnostics.push({
        code: 'VERIFIED_LEGAL_ISSUER_MISSING',
        severity: 'BLOCKING',
      });
      return { versionId: null, value: null };
    }
    if (verified.length > 1)
      diagnostics.push({
        code: 'VERIFIED_LEGAL_ISSUER_AMBIGUOUS',
        severity: 'BLOCKING',
      });
    const source = verified[0];
    return {
      versionId: source.id,
      value: {
        issuerCode: source.commercialLegalIssuer.code,
        issuerVersionNumber: source.versionNumber,
        ...this.issuerFields(source),
      },
    };
  }

  private issuerFields(source: {
    legalName: string;
    tradeName: string | null;
    legalForm: string | null;
    country: string | null;
    subdivision: string | null;
    addressLine1: string | null;
    addressLine2: string | null;
    city: string | null;
    postalCode: string | null;
    officialEmail: string | null;
    officialPhone: string | null;
    website: string | null;
    businessNumber: string | null;
    federalTaxNumber: string | null;
    provincialTaxNumber: string | null;
    referenceCurrency: string | null;
    representativeName: string | null;
    representativeTitle: string | null;
    representativeEmail: string | null;
    authorizedSignatoryName: string | null;
    authorizedSignatoryTitle: string | null;
    authorizedSignatoryEmail: string | null;
  }) {
    return {
      legalName: source.legalName,
      tradeName: source.tradeName,
      legalForm: source.legalForm,
      country: source.country,
      subdivision: source.subdivision,
      addressLine1: source.addressLine1,
      addressLine2: source.addressLine2,
      city: source.city,
      postalCode: source.postalCode,
      officialEmail: source.officialEmail,
      officialPhone: source.officialPhone,
      website: source.website,
      businessNumber: source.businessNumber,
      federalTaxNumber: source.federalTaxNumber,
      provincialTaxNumber: source.provincialTaxNumber,
      referenceCurrency: source.referenceCurrency,
      representativeName: source.representativeName,
      representativeTitle: source.representativeTitle,
      representativeEmail: source.representativeEmail,
      authorizedSignatoryName: source.authorizedSignatoryName,
      authorizedSignatoryTitle: source.authorizedSignatoryTitle,
      authorizedSignatoryEmail: source.authorizedSignatoryEmail,
    };
  }

  private async resolveClauses(
    tx: Transaction,
    templateScope: string,
    requiredCategories: readonly CommercialClauseCategory[],
    language: ProposalLanguage,
    suppliedParameters: Record<string, unknown>,
    diagnostics: CompositionDiagnostic[],
  ) {
    const now = new Date();
    const clauses = await tx.commercialClause.findMany({
      where: { isActive: true },
      orderBy: [{ category: 'asc' }, { code: 'asc' }],
      include: {
        versions: {
          where: { status: 'APPROVED' },
          orderBy: { versionNumber: 'desc' },
          include: { applicabilities: true },
        },
      },
    });
    const applicable = clauses
      .map((clause) => ({
        clause,
        version: clause.versions.find(
          (version) =>
            (!version.effectiveAt || version.effectiveAt <= now) &&
            version.applicabilities.some(({ scope }) =>
              ['ALL_OFFERS', templateScope].includes(scope),
            ),
        ),
      }))
      .filter(
        (
          item,
        ): item is typeof item & {
          version: NonNullable<typeof item.version>;
        } => Boolean(item.version),
      );
    const knownParameterKeys = new Set<string>();
    for (const { version } of applicable)
      for (const definition of this.parameterDefinitions(
        version.parameterSchema,
      ))
        knownParameterKeys.add(definition.key);
    const unknown = Object.keys(suppliedParameters).filter(
      (key) => !knownParameterKeys.has(key),
    );
    if (unknown.length)
      throw new BadRequestException(
        `UNKNOWN_CLAUSE_PARAMETERS:${unknown.sort().join(',')}`,
      );
    for (const category of requiredCategories) {
      if (!applicable.some(({ clause }) => clause.category === category))
        diagnostics.push({
          code: 'REQUIRED_APPROVED_CLAUSE_MISSING',
          severity: 'BLOCKING',
          subject: category,
        });
    }
    const items: Record<string, unknown>[] = [];
    const versionIds: string[] = [];
    for (const { clause, version } of applicable) {
      const parameters: Record<string, unknown> = {};
      for (const definition of this.parameterDefinitions(
        version.parameterSchema,
      )) {
        const value = suppliedParameters[definition.key];
        if (value === undefined || value === null || value === '') {
          if (definition.required)
            diagnostics.push({
              code: 'REQUIRED_CLAUSE_PARAMETER_MISSING',
              severity: 'BLOCKING',
              subject: `${clause.code}.${definition.key}`,
            });
          continue;
        }
        if (!this.validParameter(definition, value))
          throw new BadRequestException(
            `INVALID_CLAUSE_PARAMETER:${clause.code}.${definition.key}`,
          );
        parameters[definition.key] = value;
      }
      const text = language === 'FR' ? version.textFR : version.textEN;
      const title = language === 'FR' ? version.titleFR : version.titleEN;
      if (!text.trim() || !title.trim())
        diagnostics.push({
          code: 'CLAUSE_LANGUAGE_INCOMPLETE',
          severity: 'BLOCKING',
          subject: clause.code,
        });
      items.push({
        code: clause.code,
        category: clause.category,
        title,
        text,
        required: version.isRequired,
        parameters,
        section: clauseSections[clause.category],
      });
      versionIds.push(version.id);
    }
    return { items, versionIds };
  }

  private parameterDefinitions(value: Prisma.JsonValue) {
    if (!Array.isArray(value)) return [];
    return value.filter((item): item is ParameterDefinition =>
      Boolean(
        item &&
        typeof item === 'object' &&
        'key' in item &&
        'type' in item &&
        'required' in item,
      ),
    );
  }

  private validParameter(definition: ParameterDefinition, value: unknown) {
    if (['TEXT', 'JURISDICTION'].includes(definition.type))
      return typeof value === 'string' && value.trim().length > 0;
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0)
      return false;
    if (
      ['DURATION_DAYS', 'DURATION_MONTHS', 'MONEY_MINOR'].includes(
        definition.type,
      )
    )
      return Number.isInteger(value);
    return true;
  }

  private sections(
    revision: RevisionSource,
    language: ProposalLanguage,
    preview: ReturnType<typeof buildProposalCustomerPreview>,
    content: readonly Record<string, unknown>[],
    clauses: readonly Record<string, unknown>[],
  ) {
    const linesByGroup = (group: string) =>
      preview.lines.filter((line) => line.group === group);
    const includedBindings = content.flatMap((item) => {
      const value: unknown = item.bindings;
      return Array.isArray(value)
        ? value.map((binding: unknown) => binding)
        : [];
    });
    const values: Partial<Record<ProposalDocumentSectionCode, unknown>> = {
      COVER: {
        reference: preview.reference,
        revision: preview.revision,
        title: revision.proposal.title,
        recipient: preview.customer,
      },
      CLIENT_CONTEXT_OBJECTIVES:
        language === 'FR'
          ? preview.commercialTerms.contextFr
          : preview.commercialTerms.contextEn,
      PROPOSED_SOLUTION: content.map(({ code, title, description }) => ({
        code,
        title,
        description,
      })),
      INCLUDED_FEATURES_EXCLUSIONS: includedBindings,
      IMPLEMENTATION: linesByGroup('IMPLEMENTATION'),
      PROFESSIONAL_SERVICES: linesByGroup('PROFESSIONAL_SERVICES'),
      INVESTMENT: {
        currency: preview.currency,
        lines: preview.lines,
        totals: preview.totals,
        inputs: preview.inputs,
      },
      COMMERCIAL_SAAS_CONDITIONS: clauses.filter(
        ({ section }) => section === 'COMMERCIAL_SAAS_CONDITIONS',
      ),
      DATA_PROTECTION: clauses.filter(
        ({ section }) => section === 'DATA_PROTECTION',
      ),
      RESPONSIBILITIES: clauses.filter(
        ({ section }) => section === 'RESPONSIBILITIES',
      ),
      ACCEPTANCE: clauses.filter(({ section }) => section === 'ACCEPTANCE'),
    };
    return PROPOSAL_DOCUMENT_SECTION_ORDER.flatMap((code) => {
      const sectionContent = values[code];
      if (
        sectionContent === null ||
        sectionContent === undefined ||
        sectionContent === '' ||
        (Array.isArray(sectionContent) && sectionContent.length === 0)
      )
        return [];
      return [{ code, content: sectionContent }];
    });
  }

  private async assertRevision(
    tx: Pick<Transaction, 'commercialProposalRevision'>,
    proposalId: string,
    revisionId: string,
  ) {
    const revision = await tx.commercialProposalRevision.findFirst({
      where: { id: revisionId, proposalId },
      select: { id: true },
    });
    if (!revision) throw new NotFoundException('Proposal revision not found.');
  }

  private response<T extends { diagnostics: Prisma.JsonValue }>(value: T) {
    return value;
  }
}
