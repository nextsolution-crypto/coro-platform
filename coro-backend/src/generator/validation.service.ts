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

    // ── RÈGLE V-001 : Double signal sans EPI ──────────────────
    if (config.panneauType === 'DOUBLE') {
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

    // ── RÈGLE V-002 : Code Rouge sans Responsable secteur ─────
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

    // ── RÈGLE V-003 : Document sans Coordonnateur d'urgence ───
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

    // ── RÈGLE V-004 : Mat. dangereuses sans procédure ─────────
    if (config.matieresDangereuses === true) {
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

    // ── RÈGLE V-005 : Gicleurs sans procédure ─────────────────
    if (config.gicleurs === true) {
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

    // ── RÈGLE V-006 : Ascenseurs sans procédure ───────────────
    if (config.ascenseurs === true) {
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

    // ── RÈGLE V-007 : Module 2 vide ───────────────────────────
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

    // ── RÈGLE V-008 : Gaz naturel sans procédure ──────────────
    if (config.gazNaturel === true) {
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