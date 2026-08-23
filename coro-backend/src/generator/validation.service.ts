import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export type ValidationLevel = 'CRITIQUE' | 'ERREUR' | 'AVERTISSEMENT' | 'INFO';

export interface ValidationResult {
  id: string;
  level: ValidationLevel;
  message: string;
  moduleNumber: number;
  sectionId?: string;
  action?: string;
}

@Injectable()
export class ValidationService {
  constructor(private prisma: PrismaService) {}

  async validate(projectId: string, organizationId: string): Promise<ValidationResult[]> {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, organizationId },
      include: { building: true },
    });
    if (!project) return [];

    const doc = await this.prisma.document.findFirst({ where: { projectId } });
    if (!doc) return [{ id: 'NO_DOC', level: 'CRITIQUE', message: 'Document non généré. Veuillez d\'abord générer le document.', moduleNumber: 0 }];

    const content = doc.content as any;
    const config = content?.config || {};
    const modules = content?.modules_fr || [];

    const results: ValidationResult[] = [];
    const isPsi = project.documentType === 'PSI';
    const isPca = project.documentType === 'PCA';

    // ── Branche PCA — règles de validation spécifiques ──
    if (isPca) {
      const pcaConfig = await this.prisma.pcaConfig.findUnique({ where: { projectId } });
      const cfg = pcaConfig as any || {};

      // V-PCA-001 : Coordonnateur PCA manquant
      if (!cfg.coordinatorFirstName || !cfg.coordinatorEmail) {
        results.push({
          id: 'V-PCA-001',
          level: 'CRITIQUE',
          message: 'Le coordonnateur PCA n\'est pas défini. → Compléter la Section 2 du configurateur PCA',
          moduleNumber: 2,
          action: 'Définir le coordonnateur PCA dans le configurateur',
        });
      }

      // V-PCA-002 : Aucun scénario de risque
      if (!cfg.riskScenarios || cfg.riskScenarios.length === 0) {
        results.push({
          id: 'V-PCA-002',
          level: 'CRITIQUE',
          message: 'Aucun scénario de risque identifié. → Compléter la Section 3 du configurateur PCA',
          moduleNumber: 3,
          action: 'Identifier les scénarios de risque dans le configurateur',
        });
      }

      // V-PCA-003 : Aucun service critique (BIA vide)
      if (!cfg.criticalServices || cfg.criticalServices.length === 0) {
        results.push({
          id: 'V-PCA-003',
          level: 'CRITIQUE',
          message: 'Aucun service critique défini dans le BIA. → Compléter la Section 4 du configurateur PCA',
          moduleNumber: 4,
          action: 'Définir les services critiques dans le BIA',
        });
      }

      // V-PCA-004 : Aucune stratégie de continuité
      if (!cfg.teleworkPossible && !cfg.alternativeSite && !cfg.itRedundancy && !cfg.crossTraining) {
        results.push({
          id: 'V-PCA-004',
          level: 'AVERTISSEMENT',
          message: 'Aucune stratégie de continuité définie. → Compléter la Section 5 du configurateur PCA',
          moduleNumber: 5,
          action: 'Définir les stratégies de continuité dans le configurateur',
        });
      }

      // V-PCA-005 : Critères d'activation manquants
      if (!cfg.activationCriteria || cfg.activationCriteria.length < 20) {
        results.push({
          id: 'V-PCA-005',
          level: 'AVERTISSEMENT',
          message: 'Les critères d\'activation du PCA ne sont pas définis. → Compléter la Section 7 du configurateur PCA',
          moduleNumber: 7,
          action: 'Définir les critères d\'activation dans le configurateur',
        });
      }

      // V-PCA-006 : Responsable du plan manquant
      if (!cfg.planOwner) {
        results.push({
          id: 'V-PCA-006',
          level: 'AVERTISSEMENT',
          message: 'Le responsable de la mise à jour du plan n\'est pas désigné. → Compléter la Section 8 du configurateur PCA',
          moduleNumber: 8,
          action: 'Désigner le responsable du plan dans le configurateur',
        });
      }

      return results;
    }

    // ── RÈGLE V-001 : Double signal sans EPI (PMU seulement) ──
    if (!isPsi && config.panneauType === 'DOUBLE') {
      const module3 = modules.find((m: any) => m.moduleNumber === 3);
      const orgRoles = module3?.sections?.find((s: any) => s.id === '3.1')?.orgRoles || [];
      const hasEPI = orgRoles.some((r: any) => r.isActive && r.roleCode === 'ROLE-EPI');
      if (!hasEPI) {
        results.push({
          id: 'V-001',
          level: 'CRITIQUE',
          message: 'Double signal activé mais aucun Équipier de première intervention (EPI) n\'est actif dans l\'organigramme.',
          moduleNumber: 3,
          sectionId: '3.1',
          action: 'Activer le rôle EPI dans le Module 3',
        });
      }
    }

    // ── RÈGLE V-002 : Code Rouge sans Responsable secteur (PMU seulement) ─────
    if (!isPsi) {
      const hasCodeRouge = (config.incident_codes || []).includes('CODE_ROUGE') ||
        modules.find((m: any) => m.moduleNumber === 4)?.procedures?.some((p: any) =>
          p.code === 'P002' || p.titleFR?.toLowerCase().includes('rouge')
        );
      if (hasCodeRouge) {
        const module3 = modules.find((m: any) => m.moduleNumber === 3);
        const orgRoles = module3?.sections?.find((s: any) => s.id === '3.1')?.orgRoles || [];
        const hasRS = orgRoles.some((r: any) => r.isActive && r.roleCode === 'ROLE-RS');
        if (!hasRS) {
          results.push({
            id: 'V-002',
            level: 'ERREUR',
            message: 'Code Rouge présent mais aucun Responsable de secteur (RS) n\'est actif.',
            moduleNumber: 3,
            sectionId: '3.1',
            action: 'Activer le rôle RS dans le Module 3',
          });
        }
      }
    }

    // ── RÈGLE V-003 : Document sans Coordonnateur d'urgence (PMU seulement) ───
    if (!isPsi) {
      const module3 = modules.find((m: any) => m.moduleNumber === 3);
      const orgRoles = module3?.sections?.find((s: any) => s.id === '3.1')?.orgRoles || [];
      const hasCU = orgRoles.some((r: any) => r.isActive &&
        (r.roleCode === 'ROLE-CU' || r.roleCode === 'ROLE-CHE'));
      if (!hasCU && orgRoles.length > 0) {
        results.push({
          id: 'V-003',
          level: 'CRITIQUE',
          message: 'Aucun Coordonnateur d\'urgence (CU) ou Chef d\'équipe n\'est actif dans l\'organigramme.',
          moduleNumber: 3,
          sectionId: '3.1',
          action: 'Activer le rôle CU dans le Module 3',
        });
      }
    }

    // ── RÈGLE V-004 : Mat. dangereuses sans procédure (PMU seulement) ─────────
    if (!isPsi && config.matieresDangereuses === true) {
      const module4 = modules.find((m: any) => m.moduleNumber === 4);
      const procedures = module4?.procedures || [];
      const hasHazmat = procedures.some((p: any) =>
        p.code === 'P018' || p.titleFR?.toLowerCase().includes('matières dangereuses')
      );
      if (!hasHazmat) {
        results.push({
          id: 'V-004',
          level: 'CRITIQUE',
          message: 'Matières dangereuses déclarées dans le configurateur mais la procédure P018 (Déversement de matières dangereuses) est absente.',
          moduleNumber: 4,
          action: 'Ajouter la procédure P018 dans le Module 4',
        });
      }
    }

    // ── RÈGLE V-005 : Gicleurs sans procédure (PMU seulement) ─────────────────
    if (!isPsi && config.gicleurs === true) {
      const module4 = modules.find((m: any) => m.moduleNumber === 4);
      const procedures = module4?.procedures || [];
      const hasSprinkler = procedures.some((p: any) => p.code === 'P017');
      if (!hasSprinkler) {
        results.push({
          id: 'V-005',
          level: 'AVERTISSEMENT',
          message: 'Système de gicleurs déclaré mais la procédure P017 (Bris de gicleurs) est absente.',
          moduleNumber: 4,
          action: 'Ajouter la procédure P017 dans le Module 4',
        });
      }
    }

    // ── RÈGLE V-006 : Ascenseurs sans procédure (PMU seulement) ───────────────
    if (!isPsi && config.ascenseurs === true) {
      const module4 = modules.find((m: any) => m.moduleNumber === 4);
      const procedures = module4?.procedures || [];
      const hasElevator = procedures.some((p: any) => p.code === 'P012');
      if (!hasElevator) {
        results.push({
          id: 'V-006',
          level: 'AVERTISSEMENT',
          message: 'Ascenseurs déclarés mais la procédure P012 (Personne prise dans un ascenseur) est absente.',
          moduleNumber: 4,
          action: 'Ajouter la procédure P012 dans le Module 4',
        });
      }
    }

    // ── RÈGLE V-007 : Module 2 vide (tous types) ──────────────
    const module2 = modules.find((m: any) => m.moduleNumber === 2);
    const section2_1 = module2?.sections?.find((s: any) => s.id === '2.1')?.entries || [];
    if (section2_1.length === 0) {
      results.push({
        id: 'V-007',
        level: 'AVERTISSEMENT',
        message: 'La liste téléphonique (section 2.1 — Numéros d\'urgence) est vide.',
        moduleNumber: 2,
        sectionId: '2.1',
        action: 'Ajouter des contacts dans le Module 2',
      });
    }

    // ── RÈGLE V-008 : Gaz naturel sans procédure (PMU seulement) ──────────────
    if (!isPsi && config.gazNaturel === true) {
      const module4 = modules.find((m: any) => m.moduleNumber === 4);
      const procedures = module4?.procedures || [];
      const hasGas = procedures.some((p: any) => p.code === 'P005');
      if (!hasGas) {
        results.push({
          id: 'V-008',
          level: 'CRITIQUE',
          message: 'Gaz naturel déclaré mais la procédure P005 (Fuite de gaz naturel) est absente.',
          moduleNumber: 4,
          action: 'Ajouter la procédure P005 dans le Module 4',
        });
      }
    }

    return results;
  }
}