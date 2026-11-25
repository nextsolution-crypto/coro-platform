import { BadRequestException, ForbiddenException, Injectable, NotFoundException, Optional } from '@nestjs/common';
import { orgRolesFromContent, resolveActiveRoleCodes } from '../generator/regeneration.helpers';
import { templateIssues, toTemplateContent } from './procedure-template';
import { buildCorrectionPrompt, buildProcedurePrompt, parseJsonAnswer } from './procedure-prompt';
import { projectRoleChoices, ROLE_REGISTRY } from '../generator/role-registry';
import { PrismaService } from '../prisma/prisma.service';
import { AdviserActor, assertEditableProject, projectAccessWhere } from '../auth/project-access';
import { DemoCommunicationChannel } from '@prisma/client';
import { DemoCommunicationPolicyService } from '../demo-environment/demo-communication-policy.service';

// ── Rôles CORO connus : la liste unique (role-registry) ────
const KNOWN_ROLES = ROLE_REGISTRY.map((role) => ({
  code: role.code,
  labelFR: role.labelFR,
  labelEN: role.labelEN,
}));

@Injectable()
export class CustomProceduresService {
  constructor(
    private prisma: PrismaService,
    @Optional() private readonly demoCommunicationPolicy?: DemoCommunicationPolicyService,
  ) {}

  private async requireExternalAi(organizationId: string, operation: string, payload: unknown) {
    if (!this.demoCommunicationPolicy) {
      if (process.env.NODE_ENV === 'production') throw new Error('DEMO_COMMUNICATION_POLICY_REQUIRED');
      return;
    }
    const decision = await this.demoCommunicationPolicy.evaluate({
      organizationId,
      channel: DemoCommunicationChannel.AI_PROVIDER,
      operation,
      payload,
    });
    if (decision.disposition !== 'LIVE') throw new Error('EXTERNAL_AI_DISABLED_FOR_DEMO');
  }

  private async assertReadableProject(projectId: string, actor: AdviserActor) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, ...projectAccessWhere(actor) },
      select: { id: true },
    });
    if (!project) throw new NotFoundException('Projet introuvable');
  }

  private async assertMutableProject(projectId: string, actor: AdviserActor) {
    await assertEditableProject(this.prisma, projectId, actor);
  }

  private requireOrganizationManager(actor: AdviserActor) {
    if (!['ADMIN', 'SUPER_ADMIN'].includes(actor.role))
      throw new ForbiddenException('Autorisation de gestion requise.');
  }

  // ── Générer un code unique CP001, CP002... ──────────────
  private async generateCode(organizationId: string): Promise<string> {
    const existing = await this.prisma.customProcedure.findMany({
      where: { organizationId },
      select: { code: true },
      orderBy: { createdAt: 'desc' },
    });
    const nums = existing
      .map(p => parseInt(p.code.replace('CP', '')))
      .filter(n => !isNaN(n));
    const next = nums.length > 0 ? Math.max(...nums) + 1 : 1;
    return `CP${String(next).padStart(3, '0')}`;
  }

  // ── Détecter les rôles dans le texte ────────────────────
  detectRoles(text: string): string[] {
    const detected: string[] = [];
    const textLower = text.toLowerCase();
    for (const role of KNOWN_ROLES) {
      if (role.code === 'TOUS' || role.code === 'ROLE-TOUS') continue;
      const labelFRLower = role.labelFR.toLowerCase();
      const labelENLower = role.labelEN.toLowerCase();
      if (
        textLower.includes(role.code.toLowerCase()) ||
        textLower.includes(labelFRLower) ||
        textLower.includes(labelENLower)
      ) {
        detected.push(role.code);
      }
    }
    return [...new Set(detected)];
  }

  // ── Générer depuis texte libre via Claude ────────────────
  async generateFromText(
    text: string,
    projectId: string,
    actor: AdviserActor,
  ) {
    await this.assertMutableProject(projectId, actor);
    const organizationId = actor.organizationId;
    const userId = actor.userId;
    if (typeof text !== 'string' || text.trim().length < 50 || text.length > 20000)
      throw new BadRequestException('Texte de procédure invalide.');
    await this.requireExternalAi(organizationId, 'CUSTOM_PROCEDURE_GENERATION', {
      textLength: text.length,
    });
    const Anthropic = require('@anthropic-ai/sdk').default;
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    // Rôles de l'organigramme du projet (liste unique, rôles ajoutés compris)
    const doc = await this.prisma.document.findFirst({
      where: { projectId },
      select: { content: true },
    });
    const content = (doc?.content as any) || {};
    const orgRoles = orgRolesFromContent(content);
    const activeRoleCodes = resolveActiveRoleCodes(orgRoles, content?.config);
    const promptRoles = projectRoleChoices(orgRoles, activeRoleCodes);

    const ask = async (prompt: string) => {
      const response = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 16000,
        messages: [{ role: 'user', content: prompt }],
      });
      const block = response.content.find((b: any) => b.type === 'text');
      return parseJsonAnswer(block?.text || '');
    };

    // 1) Structuration au gabarit de la bibliothèque
    let parsed = await ask(buildProcedurePrompt(text, promptRoles));
    const code = await this.generateCode(organizationId);
    let templated = toTemplateContent({ ...parsed, code }, { code });
    let issues = templateIssues(templated, activeRoleCodes);

    // 2) Une passe de correction si le résultat s'écarte du gabarit
    if (issues.length > 0) {
      try {
        parsed = await ask(buildCorrectionPrompt(templated, issues, promptRoles));
        const corrected = toTemplateContent({ ...parsed, code }, { code });
        const correctedIssues = templateIssues(corrected, activeRoleCodes);
        if (corrected.roleSections.length && correctedIssues.length <= issues.length) {
          templated = corrected;
          issues = correctedIssues;
        }
      } catch {
        // on garde la première version, ses écarts sont signalés au conseiller
      }
    }

    const rolesDetected = [...new Set([
      ...this.detectRoles(text),
      ...templated.roleSections.map((s) => s.roleCode).filter((c) => c !== 'TOUS'),
    ])];
    const unmappedRoles: string[] = Array.isArray(parsed?.unmappedRoles)
      ? parsed.unmappedRoles.filter((r: unknown) => typeof r === 'string').slice(0, 20)
      : [];

    const procedure = await this.prisma.customProcedure.create({
      data: {
        organizationId,
        projectId,
        code,
        titleFR: templated.titleFR,
        titleEN: templated.titleEN,
        objective: templated.objective,
        color: templated.color,
        status: 'DRAFT',
        content: templated as any,
        sourceText: text.substring(0, 20000),
        sourceType: 'AI_TEXT',
        isPublished: false,
        rolesDetected,
        createdById: userId,
      },
    });

    // Rôles nommés par la procédure mais absents de l'organigramme
    const missingRoles = rolesDetected
      .filter((roleCode) => !activeRoleCodes.includes(roleCode))
      .map((roleCode) => KNOWN_ROLES.find((r) => r.code === roleCode))
      .filter(Boolean);

    return {
      procedure,
      missingRoles,
      rolesDetected,
      unmappedRoles,
      templateIssues: issues,
    };
  }

  // ── Générer depuis fichier Word ou PDF ──────────────────
  async generateFromFile(
    fileBase64: string,
    fileName: string,
    mimeType: string,
    projectId: string,
    actor: AdviserActor,
  ) {
    await this.assertMutableProject(projectId, actor);
    if (typeof fileBase64 !== 'string' || fileBase64.length === 0 || fileBase64.length > 14_000_000)
      throw new BadRequestException('Fichier de procédure invalide.');
    let extractedText = '';

    if (
      mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      fileName.endsWith('.docx')
    ) {
      // Extraction Word via mammoth
      const mammoth = require('mammoth');
      const buffer = Buffer.from(fileBase64, 'base64');
      const result = await mammoth.extractRawText({ buffer });
      extractedText = result.value;
    } else if (mimeType === 'application/pdf' || fileName.endsWith('.pdf')) {
      // Extraction PDF via Claude natif
      await this.requireExternalAi(actor.organizationId, 'CUSTOM_PROCEDURE_PDF_EXTRACTION', {
        fileName,
        encodedLength: fileBase64.length,
      });
      const Anthropic = require('@anthropic-ai/sdk').default;
      const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
      const pdfResponse = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 16000,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'document',
              source: {
                type: 'base64',
                media_type: 'application/pdf',
                data: fileBase64,
              },
            },
            {
              type: 'text',
              text: 'Extrais tout le texte de ce document de procédure. Retourne uniquement le texte brut, sans formatage ni commentaire.',
            },
          ],
        }],
      });
      const pdfContent = pdfResponse.content[0];
      if (pdfContent.type === 'text') extractedText = pdfContent.text;
    } else {
      throw new Error('Format non supporté. Utilisez PDF ou Word (.docx)');
    }

    if (!extractedText || extractedText.length < 50) {
      throw new Error('Le fichier ne contient pas assez de texte extractible');
    }

    // Réutiliser generateFromText avec le texte extrait
    const result = await this.generateFromText(
      extractedText.substring(0, 20000),
      projectId,
      actor,
    );

    // Mettre à jour les champs source
    await this.prisma.customProcedure.update({
      where: { id: result.procedure.id },
      data: {
        sourceType: 'AI_IMPORT',
        sourceFileName: fileName,
        sourceText: extractedText.substring(0, 2000),
      },
    });

    return { ...result, sourceFileName: fileName };
  }

  /** Contenu toujours rendu au gabarit (les anciennes procédures IA « actions » sont converties). */
  private withTemplate<T extends { content: any }>(record: T): T {
    return record ? { ...record, content: toTemplateContent(record.content, record) } : record;
  }

  // ── CRUD ────────────────────────────────────────────────
  async findAll(projectId: string, actor: AdviserActor) {
    await this.assertReadableProject(projectId, actor);
    const organizationId = actor.organizationId;
    const records = await this.prisma.customProcedure.findMany({
      where: {
        OR: [
          // Procédures du projet courant
          { organizationId, projectId },
          // Procédures publiées de l'organisation (toutes)
          { organizationId, projectId: null, isPublished: true },
          // Procédures globales CORO (super admin)
          { isGlobal: true, status: 'ACTIVE' },
        ],
      },
      orderBy: { createdAt: 'desc' },
    });
    return records.map((record) => this.withTemplate(record));
  }

  async findOne(id: string, actor: AdviserActor) {
    const proc = await this.prisma.customProcedure.findFirst({
      where: { id, organizationId: actor.organizationId },
    });
    if (!proc) throw new NotFoundException('Procédure introuvable');
    if (proc.projectId) await this.assertReadableProject(proc.projectId, actor);
    return this.withTemplate(proc);
  }

  async update(id: string, data: any, actor: AdviserActor) {
    const procedure = await this.findOne(id, actor);
    if (procedure.projectId) await this.assertMutableProject(procedure.projectId, actor);
    else this.requireOrganizationManager(actor);
    const allowed = ['titleFR', 'titleEN', 'objective', 'color', 'content', 'status', 'rolesDetected'];
    const update = Object.fromEntries(
      Object.entries(data ?? {}).filter(([key]) => allowed.includes(key)),
    );
    if (Object.keys(update).length === 0)
      throw new BadRequestException('Aucun champ modifiable fourni.');
    if (update.status && !['DRAFT', 'ACTIVE', 'ARCHIVED'].includes(String(update.status)))
      throw new BadRequestException('Statut de procédure invalide.');
    if (update.content !== undefined) {
      // Même gabarit que la bibliothèque, quel que soit l'écran qui enregistre.
      const templated = toTemplateContent(update.content, { ...procedure, ...update });
      update.content = templated as any;
      update.titleFR = templated.titleFR || procedure.titleFR;
      update.titleEN = templated.titleEN || procedure.titleEN;
      update.color = templated.color;
    }
    return this.prisma.customProcedure.update({
      where: { id },
      data: {
        ...update,
        updatedAt: new Date(),
      },
    });
  }

  async clone(id: string, projectId: string, actor: AdviserActor) {
    const source = await this.findOne(id, actor);
    await this.assertMutableProject(projectId, actor);
    const organizationId = actor.organizationId;
    const code = await this.generateCode(organizationId);
    return this.prisma.customProcedure.create({
      data: {
        organizationId,
        projectId,
        code,
        titleFR: `${source.titleFR} (copie)`,
        titleEN: `${source.titleEN} (copy)`,
        objective: source.objective,
        color: source.color,
        status: 'DRAFT',
        content: source.content as any,
        sourceText: source.sourceText,
        isPublished: false,
        rolesDetected: source.rolesDetected,
        createdById: actor.userId,
      },
    });
  }

  async publish(id: string, actor: AdviserActor) {
    this.requireOrganizationManager(actor);
    const procedure = await this.findOne(id, actor);
    if (procedure.projectId) await this.assertMutableProject(procedure.projectId, actor);
    return this.prisma.customProcedure.update({
      where: { id },
      data: { isPublished: true, projectId: null },
    });
  }

  async remove(id: string, actor: AdviserActor) {
    const procedure = await this.findOne(id, actor);
    if (procedure.projectId) await this.assertMutableProject(procedure.projectId, actor);
    else this.requireOrganizationManager(actor);
    return this.prisma.customProcedure.delete({ where: { id } });
  }

  async getLibrary(organizationId: string) {
    const records = await this.prisma.customProcedure.findMany({
      where: { organizationId, isPublished: true },
      orderBy: { titleFR: 'asc' },
    });
    return records.map((record) => this.withTemplate(record));
  }

  getKnownRoles() {
    return KNOWN_ROLES;
  }
}
