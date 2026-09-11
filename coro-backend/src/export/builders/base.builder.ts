import { PrismaService } from '../../prisma/prisma.service';

export const DOCUMENT_TYPE_LABELS: Record<string, { fr: string; en: string }> = {
  PMU: { fr: 'Plan de mesures d\'urgence',       en: 'Emergency Response Plan' },
  PSI: { fr: 'Plan de sécurité incendie',        en: 'Fire Safety Plan' },
  PCA: { fr: 'Plan de continuité des affaires',  en: 'Business Continuity Plan' },
  PGC: { fr: 'Plan de gestion de crise',         en: 'Crisis Management Plan' },
  PRA: { fr: 'Plan de reprise des activités',    en: 'Disaster Recovery Plan' },
  PUE: { fr: 'Plan d\'urgence environnementale', en: 'Environmental Emergency Plan' },
};

export const MODULE_TITLES: Record<number, { fr: string; en: string }> = {
  1: { fr: 'Introduction',                                     en: 'Introduction' },
  2: { fr: 'Liste téléphonique',                               en: 'Phone Directory' },
  3: { fr: 'Rôles et responsabilités de l\'équipe d\'urgence', en: 'Emergency Team Roles and Responsibilities' },
  4: { fr: 'Procédures',                                       en: 'Procedures' },
  6: { fr: 'Plans techniques du bâtiment',                     en: 'Technical Building Plans' },
  7: { fr: 'Description du site et équipements de sécurité',   en: 'Site Description and Safety Equipment' },
  8: { fr: 'Registres et annexes',                             en: 'Records and Appendices' },
};

export type PdfSegment =
  | { type: 'html'; content: string; sequentialNumber: number; subsectionId?: string; colorBar?: string }
  | { type: 'separator'; html: string; sequentialNumber: number }
  | { type: 'plans'; plans: { buffer: Buffer; section: string }[]; sequentialNumber: number };

type LocalizedStepOverride = {
  fr?: string;
  en?: string;
};

type StoredStepOverride = string | LocalizedStepOverride;

const DEFAULT_EMERGENCY_ROLE_CODES = [
  'ROLE-AS',
  'ROLE-CU',
  'ROLE-EPI',
  'ROLE-RM',
  'ROLE-RPR',
  'ROLE-SS',
  'ROLE-BRI',
  'ROLE-RS',
  'ROLE-CHE',
  'ROLE-ACC',
];

export abstract class BaseDocumentBuilder {
  protected sequentialNumber = 0;
  public subsectionTitlesById: Record<string, string> = {};

  constructor(
    protected readonly prisma: PrismaService,
    protected readonly doc: any,
    protected readonly content: any,
    protected readonly lang: 'fr' | 'en',
    protected readonly options: { selectedModules: number[]; moduleOrder: number[] },
  ) {}

  abstract getDefaultModules(): number[];
  abstract buildModuleSegments(
    moduleNum: number,
    pdfSegments: PdfSegment[],
    currentHtmlChunk: { value: string },
    currentHtmlSeqNumber: { value: number },
  ): Promise<boolean>;

  get project() { return this.doc.project; }
  get isFr()    { return this.lang === 'fr'; }

  get docTypeLabel() {
    return DOCUMENT_TYPE_LABELS[this.project.documentType]?.[this.lang] || this.project.documentType;
  }

  /**
   * Décision documentaire : priorité au snapshot figé dans Document.content.config.
   * Le Building courant ne sert que de fallback pour les anciens snapshots.
   */
  get isIndustriel() {
    const snapshotType = this.content?.config?.buildingType;

    if (
      snapshotType !== undefined &&
      snapshotType !== null &&
      snapshotType !== ''
    ) {
      return String(snapshotType).trim().toLowerCase() === 'industriel';
    }

    return (
      String(this.project.building?.buildingType || '')
        .trim()
        .toLowerCase() === 'industriel'
    );
  }

  get modules() {
    return this.lang === 'fr' ? this.content.modules_fr : this.content.modules_en;
  }

  get orderedModules() {
    return this.options.moduleOrder.filter(n => this.options.selectedModules.includes(n));
  }

  mergeModule2SavedData(generatedSections: any[], savedModule2: any): any[] {
    if (!savedModule2) return generatedSections;

    const sectionKeyMap: Record<string, string> = {
      '2.1': 'section2_1',
      '2.2': 'section2_2',
      '2.3': 'section2_3',
      '2.4': 'section2_4',
    };

    const isFr = this.lang === 'fr';
    const section25Active =
      savedModule2.section2_5Enabled &&
      savedModule2.section2_5?.length > 0;

    return generatedSections
      .filter(section => section.id !== '2.5' || section25Active)
      .map(section => {
        const savedKey = sectionKeyMap[section.id];

        if (section.id === '2.5') {
          return {
            ...section,
            title: isFr ? 'RESSOURCES CORPORATIVES' : 'CORPORATE RESOURCES',
            entries: savedModule2.section2_5,
          };
        }

        if (savedKey && savedModule2[savedKey]) {
          const updated = {
            ...section,
            entries: savedModule2[savedKey],
          };

          if (section.id === '2.1') {
            updated.internalEmergencyNumber =
              savedModule2.internalEmergencyNumber || '';
          }

          return updated;
        }

        return section;
      });
  }

  mergeModule3SavedData(generatedSections: any[], savedModule3: any): any[] {
    if (!savedModule3) return generatedSections;

    return generatedSections.map(section => {
      if (section.id === '3.1' && savedModule3.orgRoles) {
        return { ...section, orgRoles: savedModule3.orgRoles };
      }

      if (section.id === '3.2' && savedModule3.members) {
        return { ...section, members: savedModule3.members };
      }

      return section;
    });
  }

  async getBuildingPlansSorted(): Promise<{ buffer: Buffer; section: string }[]> {
    const plans = await this.prisma.buildingPlan.findMany({
      where: { projectId: this.project.id },
      orderBy: { order: 'asc' },
    });

    const sectionOrder = ['IMPLANTATION', 'COUPE', 'OPERATION', 'SECTEURS', 'DIVERS'];
    const sorted = sectionOrder.flatMap(section =>
      plans.filter(p => p.section === section),
    );

    return sorted.map(plan => ({
      buffer: Buffer.from(plan.fileBase64, 'base64'),
      section: plan.section,
    }));
  }

  private getActiveRoleCodesForModule4(): string[] {
    const generatedModule3 = this.content.modules_fr?.find(
      (m: any) => m.moduleNumber === 3,
    );

    if (!generatedModule3) {
      return [...DEFAULT_EMERGENCY_ROLE_CODES];
    }

    const mergedSections = this.mergeModule3SavedData(
      generatedModule3.sections || [],
      this.content.module3,
    );

    const orgRoles =
      mergedSections.find((s: any) => s.id === '3.1')?.orgRoles || [];

    if (orgRoles.length === 0) {
      return [...DEFAULT_EMERGENCY_ROLE_CODES];
    }

    return orgRoles
      .filter((r: any) => r.isActive)
      .map((r: any) => r.roleCode)
      .filter(Boolean);
  }

  private filterRoleSections(procedure: any, activeRoleCodes: string[]): any {
    return {
      ...procedure,
      roleSections: (procedure.roleSections || []).filter((rs: any) =>
        rs.roleCode === 'TOUS' ||
        rs.roleCode === 'ROLE-OCC' ||
        activeRoleCodes.includes(rs.roleCode),
      ),
    };
  }

  private getStepOverrideText(
    value: StoredStepOverride | undefined,
  ): string | undefined {
    if (typeof value === 'string') {
      return this.lang === 'fr' ? value : undefined;
    }

    if (!value || typeof value !== 'object') {
      return undefined;
    }

    return value[this.lang];
  }

  private applyStepOverridesToSteps(
    steps: any[] | undefined,
    overrides: Record<string, StoredStepOverride>,
  ): any[] {
    return (steps || []).map(step => {
      const overrideText = this.getStepOverrideText(overrides[step.id]);

      const updated: any = {
        ...step,
        ...(overrideText !== undefined
          ? this.lang === 'fr'
            ? { textFR: overrideText }
            : { textEN: overrideText }
          : {}),
      };

      if (Array.isArray(step.subSteps)) {
        updated.subSteps = this.applyStepOverridesToSteps(
          step.subSteps,
          overrides,
        );
      }

      return updated;
    });
  }

  private applyInlineStepOverrides(
    procedure: any,
    overrides: Record<string, StoredStepOverride>,
  ): any {
    if (!procedure || !overrides || Object.keys(overrides).length === 0) {
      return procedure;
    }

    return {
      ...procedure,
      directivesGenerales: Array.isArray(procedure.directivesGenerales)
        ? this.applyStepOverridesToSteps(
            procedure.directivesGenerales,
            overrides,
          )
        : procedure.directivesGenerales,
      roleSections: (procedure.roleSections || []).map((section: any) => ({
        ...section,
        steps: this.applyStepOverridesToSteps(section.steps, overrides),
      })),
    };
  }

  private buildCustomIaProcedure(record: any, activeRoleCodes: string[]): any {
    const content = (record.content as any) || {};

    const roleSections = (content.roleSections || []).map((rs: any) => {
      const directSteps = Array.isArray(rs.steps) ? rs.steps : null;

      return {
        roleCode: rs.roleCode,
        roleLabelFR: rs.roleLabelFR || rs.roleName || rs.roleCode,
        roleLabelEN:
          rs.roleLabelEN ||
          rs.roleNameEN ||
          rs.roleName ||
          rs.roleCode,
        headerColor:
          rs.headerColor ||
          content.headerColor ||
          content.color ||
          record.color ||
          '#2C3E50',
        steps:
          directSteps ||
          (rs.actions || []).map((action: string, idx: number) => ({
            id: `${record.code}_${idx}`,
            textFR: action,
            textEN:
              rs.actionsEN && rs.actionsEN[idx]
                ? rs.actionsEN[idx]
                : action,
          })),
      };
    });

    return this.filterRoleSections(
      {
        id: record.id,
        code: record.code,
        titleFR: content.titleFR || record.titleFR,
        titleEN: content.titleEN || record.titleEN,
        icon: content.icon,
        headerColor:
          content.headerColor ||
          content.color ||
          record.color ||
          '#2C3E50',
        activationRule: content.activationRule || 'manual',
        documentTypes: content.documentTypes || [],
        phase: content.phase,
        directivesGenerales: content.directivesGenerales || [],
        roleSections,
        importantBoxes: content.importantBoxes || [],
        objective: content.objective || record.objective,
        _isCustomIA: true,
      },
      activeRoleCodes,
    );
  }

  async getModule4Procedures(): Promise<any[]> {
    const {
      getActiveProcedures,
      getAllProcedures,
      getProcedureById,
    } = require('../../generator/module4.templates');

    const config = this.content.config || {};
    const documentType = this.project.documentType;
    const organizationId = this.project.organizationId;
    const projectId = this.project.id;

    const activeRoleCodes = this.getActiveRoleCodesForModule4();

    const module4Saved = this.content.module4 || {};
    const customProcedureIds: string[] = Array.isArray(
      module4Saved.customProcedureIds,
    )
      ? module4Saved.customProcedureIds
      : [];

    const inlineStepOverrides: Record<string, StoredStepOverride> =
      module4Saved.procedureOverrides?.steps || {};

    const tsAutoProcedures = getActiveProcedures(
      config,
      documentType,
      activeRoleCodes,
    );

    const allTsProcedures = getAllProcedures();
    const allTsCodes = new Set(
      allTsProcedures.map((p: any) => p?.code).filter(Boolean),
    );

    const [defaults, orgOverrides, projectOverrides] = await Promise.all([
      this.prisma.procedureDefault.findMany({
        where: { isActive: true },
        orderBy: { code: 'asc' },
      }),
      this.prisma.procedureOverride.findMany({
        where: {
          organizationId,
          projectId: null,
        },
      }),
      this.prisma.procedureOverride.findMany({
        where: {
          organizationId,
          projectId,
        },
      }),
    ]);

    const orgOverrideMap = new Map(
      orgOverrides.map((o: any) => [o.procedureId, o]),
    );

    const projectOverrideMap = new Map(
      projectOverrides.map((o: any) => [o.procedureId, o]),
    );

    const effectiveStandardProcedures = defaults.map((d: any) => {
      const orgOverride: any = orgOverrideMap.get(d.id);
      const projectOverride: any = projectOverrideMap.get(d.id);

      const effectiveContent =
        projectOverride?.content ??
        orgOverride?.content ??
        d.content ??
        {};

      return {
        ...(effectiveContent as any),
        id: d.id,
        _originalId: (effectiveContent as any)?.id,
        _projectIsActive:
          projectOverride?.isActive !== false,
      };
    });

    const standardById = new Map(
      effectiveStandardProcedures.map((p: any) => [p.id, p]),
    );

    const standardByCode = new Map(
      effectiveStandardProcedures
        .filter((p: any) => p.code)
        .map((p: any) => [p.code, p]),
    );

    const selected: any[] = [];
    const selectedIds = new Set<string>();

    const pushProcedure = (procedure: any) => {
      if (!procedure) return;

      const key = procedure.id || procedure.code;

      if (!key || selectedIds.has(key)) return;

      if (procedure._projectIsActive === false) return;

      const filtered = this.filterRoleSections(
        procedure,
        activeRoleCodes,
      );

      const hasDirectives =
        Array.isArray(filtered.directivesGenerales) &&
        filtered.directivesGenerales.length > 0;

      const hasRoles =
        Array.isArray(filtered.roleSections) &&
        filtered.roleSections.length > 0;

      if (!hasDirectives && !hasRoles) return;

      selectedIds.add(key);
      selected.push(filtered);
    };

    for (const tsProc of tsAutoProcedures) {
      const effective =
        standardByCode.get(tsProc.code) ||
        standardById.get(tsProc.id) ||
        tsProc;

      pushProcedure(effective);
    }

    for (const proc of effectiveStandardProcedures) {
      if (allTsCodes.has(proc.code)) continue;
      if (customProcedureIds.includes(proc.id)) continue;
      if (proc.activationRule !== 'always') continue;

      const docTypes: string[] = Array.isArray(proc.documentTypes)
        ? proc.documentTypes
        : [];

      if (docTypes.length > 0 && !docTypes.includes(documentType)) {
        continue;
      }

      pushProcedure(proc);
    }

    const unresolvedCustomIds: string[] = [];

    for (const id of customProcedureIds) {
      const dbProc = standardById.get(id);

      if (dbProc) {
        pushProcedure(dbProc);
        continue;
      }

      const tsProc = getProcedureById(id);

      if (tsProc) {
        pushProcedure(tsProc);
        continue;
      }

      unresolvedCustomIds.push(id);
    }

    if (unresolvedCustomIds.length > 0) {
      const customIaRecords = await this.prisma.customProcedure.findMany({
        where: {
          organizationId,
          id: { in: unresolvedCustomIds },
          OR: [
            { projectId },
            { isPublished: true },
          ],
        },
      });

      const customIaById = new Map(
        customIaRecords.map((p: any) => [p.id, p]),
      );

      for (const id of unresolvedCustomIds) {
        const record: any = customIaById.get(id);
        if (!record) continue;

        if (record.status !== 'ACTIVE') continue;

        pushProcedure(
          this.buildCustomIaProcedure(record, activeRoleCodes),
        );
      }
    }

    return selected.map(procedure =>
      this.applyInlineStepOverrides(
        procedure,
        inlineStepOverrides,
      ),
    );
  }

  buildSeparatorHtml(moduleNum: number, generateSeparatorPage: Function): string {
    this.sequentialNumber += 1;

    const moduleTitle =
      MODULE_TITLES[moduleNum]?.[this.lang] ||
      `Module ${moduleNum}`;

    return generateSeparatorPage({
      sequentialNumber: this.sequentialNumber,
      moduleTitle,
      documentTypeLabel: this.docTypeLabel,
      buildingName: this.project.building.name,
      year: this.project.year,
    });
  }

  findModuleTitleBySeq(seqNum: number): string {
    const moduleNum = this.orderedModules[seqNum - 1];
    return MODULE_TITLES[moduleNum]?.[this.lang] || `Module ${moduleNum}`;
  }
}
