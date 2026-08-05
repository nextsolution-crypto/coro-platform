import { PrismaService } from '../../prisma/prisma.service';

export const DOCUMENT_TYPE_LABELS: Record<string, { fr: string; en: string }> = {
  PMU: { fr: 'Plan de mesures d\'urgence',       en: 'Emergency Response Plan' },
  PSI: { fr: 'Plan de sécurité incendie',         en: 'Fire Safety Plan' },
  PCA: { fr: 'Plan de continuité des affaires',   en: 'Business Continuity Plan' },
  PGC: { fr: 'Plan de gestion de crise',          en: 'Crisis Management Plan' },
  PRA: { fr: 'Plan de reprise des activités',     en: 'Disaster Recovery Plan' },
  PUE: { fr: 'Plan d\'urgence environnementale',  en: 'Environmental Emergency Plan' },
};

export const MODULE_TITLES: Record<number, { fr: string; en: string }> = {
  1: { fr: 'Introduction',                                          en: 'Introduction' },
  2: { fr: 'Liste téléphonique',                                    en: 'Phone Directory' },
  3: { fr: 'Rôles et responsabilités de l\'équipe d\'urgence',      en: 'Emergency Team Roles and Responsibilities' },
  4: { fr: 'Procédures',                                            en: 'Procedures' },
  6: { fr: 'Plans techniques du bâtiment',                          en: 'Technical Building Plans' },
  7: { fr: 'Description du site et équipements de sécurité',        en: 'Site Description and Safety Equipment' },
  8: { fr: 'Registres et annexes',                                  en: 'Records and Appendices' },
};

export type PdfSegment =
  | { type: 'html'; content: string; sequentialNumber: number; subsectionId?: string; colorBar?: string }
  | { type: 'separator'; html: string; sequentialNumber: number }
  | { type: 'plans'; plans: { buffer: Buffer; section: string }[]; sequentialNumber: number };

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
  ): Promise<boolean>; // retourne true si le module a été traité

  get project() { return this.doc.project; }
  get isFr()    { return this.lang === 'fr'; }
  get docTypeLabel() {
    return DOCUMENT_TYPE_LABELS[this.project.documentType]?.[this.lang] || this.project.documentType;
  }
  get isIndustriel() {
    return this.project.building.buildingType?.toLowerCase() === 'industriel';
  }
  get modules() {
    return this.lang === 'fr' ? this.content.modules_fr : this.content.modules_en;
  }
  get orderedModules() {
    return this.options.moduleOrder.filter(n => this.options.selectedModules.includes(n));
  }

  // ── Méthodes communes réutilisables par tous les builders ──

  mergeModule2SavedData(generatedSections: any[], savedModule2: any): any[] {
    if (!savedModule2) return generatedSections;
    const sectionKeyMap: Record<string, string> = {
      '2.1': 'section2_1', '2.2': 'section2_2',
      '2.3': 'section2_3', '2.4': 'section2_4',
    };
    const isFr = this.lang === 'fr';
    const section25Active = savedModule2.section2_5Enabled && savedModule2.section2_5?.length > 0;
    return generatedSections
      .filter(section => section.id !== '2.5' || section25Active)
      .map(section => {
        const savedKey = sectionKeyMap[section.id];
        if (section.id === '2.5') {
          return { ...section, title: isFr ? 'RESSOURCES CORPORATIVES' : 'CORPORATE RESOURCES', entries: savedModule2.section2_5 };
        }
        if (savedKey && savedModule2[savedKey]) {
          const updated = { ...section, entries: savedModule2[savedKey] };
          if (section.id === '2.1') updated.internalEmergencyNumber = savedModule2.internalEmergencyNumber || '';
          return updated;
        }
        return section;
      });
  }

  mergeModule3SavedData(generatedSections: any[], savedModule3: any): any[] {
    if (!savedModule3) return generatedSections;
    return generatedSections.map(section => {
      if (section.id === '3.1' && savedModule3.orgRoles) return { ...section, orgRoles: savedModule3.orgRoles };
      if (section.id === '3.2' && savedModule3.members)  return { ...section, members: savedModule3.members };
      return section;
    });
  }

  async getBuildingPlansSorted(): Promise<{ buffer: Buffer; section: string }[]> {
    const plans = await this.prisma.buildingPlan.findMany({
      where: { projectId: this.project.id },
      orderBy: { order: 'asc' },
    });
    const sectionOrder = ['IMPLANTATION', 'COUPE', 'OPERATION', 'SECTEURS', 'DIVERS'];
    const sorted = sectionOrder.flatMap(section => plans.filter(p => p.section === section));
    return sorted.map(plan => ({ buffer: Buffer.from(plan.fileBase64, 'base64'), section: plan.section }));
  }

  getModule4Procedures(): any[] {
    const { getActiveProcedures } = require('../../generator/procedures/index');
    const module3Content = this.content.modules_fr?.find((m: any) => m.moduleNumber === 3);
    const savedOrgRoles = module3Content?.sections?.find((s: any) => s.id === '3.1')?.orgRoles || [];
    const activeRoleCodes = savedOrgRoles.length > 0
      ? savedOrgRoles.filter((r: any) => r.isActive).map((r: any) => r.roleCode).filter(Boolean)
      : ['ROLE-AS', 'ROLE-CU', 'ROLE-EPI', 'ROLE-RM', 'ROLE-RPR', 'ROLE-SS', 'ROLE-BRI', 'ROLE-RS', 'ROLE-CHE', 'ROLE-ACC'];
    return getActiveProcedures(this.content.config || {}, this.project.documentType, activeRoleCodes);
  }

  buildSeparatorHtml(moduleNum: number, generateSeparatorPage: Function): string {
    this.sequentialNumber += 1;
    const moduleTitle = MODULE_TITLES[moduleNum]?.[this.lang] || `Module ${moduleNum}`;
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