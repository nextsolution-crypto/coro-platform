import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// ── Rôles CORO connus ───────────────────────────────────────
const KNOWN_ROLES = [
  { code: 'ROLE-CU',  labelFR: 'Coordonnateur d\'urgence',           labelEN: 'Emergency Coordinator' },
  { code: 'ROLE-AS',  labelFR: 'Agent de sécurité / Responsable',    labelEN: 'Security Agent / Manager' },
  { code: 'ROLE-EPI', labelFR: 'Équipier de première intervention',  labelEN: 'First Response Team Member' },
  { code: 'ROLE-RM',  labelFR: 'Responsable mécanique',              labelEN: 'Mechanical Supervisor' },
  { code: 'ROLE-RPR', labelFR: 'Responsable du point de rassemblement', labelEN: 'Assembly Point Supervisor' },
  { code: 'ROLE-SS',  labelFR: 'Surveillant de sortie',              labelEN: 'Exit Monitor' },
  { code: 'ROLE-BRI', labelFR: 'Brigadier',                          labelEN: 'Brigadier / Floor Warden' },
  { code: 'ROLE-RS',  labelFR: 'Responsable de secteur',             labelEN: 'Sector Supervisor' },
  { code: 'ROLE-CHE', labelFR: 'Chef d\'équipe',                     labelEN: 'Team Leader' },
  { code: 'ROLE-ACC', labelFR: 'Accompagnateur PPNAE',               labelEN: 'PREA Companion' },
  { code: 'ROLE-TOUS', labelFR: 'Tous les intervenants',             labelEN: 'All Responders' },
];

@Injectable()
export class CustomProceduresService {
  constructor(private prisma: PrismaService) {}

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
      if (role.code === 'ROLE-TOUS') continue;
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
    organizationId: string,
    userId: string,
  ) {
    const Anthropic = require('@anthropic-ai/sdk').default;
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    // Récupérer l'organigramme existant pour contexte
    const doc = await this.prisma.document.findFirst({
      where: { projectId },
      select: { content: true },
    });
    const content = (doc?.content as any) || {};
    const modules = content?.modules_fr || [];
    const m3 = modules.find((m: any) => m.moduleNumber === 3);
    const orgRoles = m3?.sections?.find((s: any) => s.id === '3.1')?.orgRoles || [];
    const activeRoles = orgRoles
      .filter((r: any) => r.isActive)
      .map((r: any) => `${r.roleCode} (${r.roleName})`)
      .join(', ') || 'Non défini';

    const prompt = `Tu es un expert en rédaction de procédures d'urgence pour bâtiments québécois.

Analyse ce texte et structure-le en procédure d'urgence selon le format JSON strict ci-dessous.

RÔLES ACTIFS DANS L'ORGANIGRAMME DU PROJET :
${activeRoles}

RÔLES DISPONIBLES DANS CORO :
${KNOWN_ROLES.map(r => `${r.code} = ${r.labelFR}`).join('\n')}

TEXTE À STRUCTURER :
${text}

RÈGLES STRICTES :
- titleFR et titleEN : titres courts (max 8 mots) en MAJUSCULES
- objective : 1-2 phrases décrivant l'objectif de la procédure
- color : choisir selon le type (#C0392B=incendie/évacuation, #E67E22=bris/panne, #8E44AD=sécurité/confinement, #2980B9=médical/technique, #27AE60=environnement)
- roleSections : max 4 rôles, chacun avec max 8 actions impératives courtes (verbe à l'infinitif)
- importantBoxes : max 2 encadrés (type IMPORTANT ou NOTE)
- rolesDetected : liste des codes de rôles CORO trouvés dans le texte
- crossReferences : codes de procédures liées mentionnées (ex: ["P001", "P005"])
- actionsEN : traduction anglaise de chaque action (même ordre que actions)
- roleNameEN : nom du rôle en anglais

RÉPONDS UNIQUEMENT avec ce JSON, sans texte avant ou après :

{
  "titleFR": "TITRE EN FRANÇAIS",
  "titleEN": "TITLE IN ENGLISH",
  "objective": "Objectif de la procédure...",
  "color": "#C0392B",
  "rolesDetected": ["ROLE-CU", "ROLE-EPI"],
  "crossReferences": [],
  "roleSections": [
    {
      "roleCode": "ROLE-CU",
      "roleName": "Coordonnateur d'urgence",
      "roleNameEN": "Emergency Coordinator",
      "actions": [
        "Action 1 impérative en français",
        "Action 2 impérative en français"
      ],
      "actionsEN": [
        "Action 1 in English",
        "Action 2 in English"
      ]
    }
  ],
  "importantBoxes": [
    {
      "type": "IMPORTANT",
      "text": "Texte de l'encadré important"
    }
  ]
}`;

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    });

    const rawText = response.content[0].type === 'text' ? response.content[0].text : '';
    const clean = rawText.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);

    const code = await this.generateCode(organizationId);
    const rolesDetected = this.detectRoles(text);
    const allRolesDetected = [...new Set([...rolesDetected, ...(parsed.rolesDetected || [])])];

    // Construire le contenu au format de nos procédures existantes
    const procedureContent = {
      code,
      titleFR: parsed.titleFR,
      titleEN: parsed.titleEN,
      objective: parsed.objective,
      color: parsed.color || '#2C3E50',
      activationRule: 'manual',
      roleSections: parsed.roleSections || [],
      importantBoxes: parsed.importantBoxes || [],
      crossReferences: parsed.crossReferences || [],
    };

    // Sauvegarder en DB
    const procedure = await this.prisma.customProcedure.create({
      data: {
        organizationId,
        projectId,
        code,
        titleFR: parsed.titleFR,
        titleEN: parsed.titleEN,
        objective: parsed.objective,
        color: parsed.color || '#2C3E50',
        status: 'DRAFT',
        content: procedureContent,
        sourceText: text,
        isPublished: false,
        rolesDetected: allRolesDetected,
        createdById: userId,
      },
    });

    // Détecter les rôles absents de l'organigramme
    const activeRoleCodes = orgRoles.filter((r: any) => r.isActive).map((r: any) => r.roleCode);
    const missingRoles = allRolesDetected
      .filter(code => !activeRoleCodes.includes(code))
      .map(code => KNOWN_ROLES.find(r => r.code === code))
      .filter(Boolean);

    return {
      procedure,
      missingRoles,
      rolesDetected: allRolesDetected,
    };
  }

  // ── Générer depuis fichier Word ou PDF ──────────────────
  async generateFromFile(
    fileBase64: string,
    fileName: string,
    mimeType: string,
    projectId: string,
    organizationId: string,
    userId: string,
  ) {
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
      const Anthropic = require('@anthropic-ai/sdk').default;
      const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
      const pdfResponse = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 4000,
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
      extractedText.substring(0, 8000),
      projectId,
      organizationId,
      userId,
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

  // ── CRUD ────────────────────────────────────────────────
  async findAll(projectId: string, organizationId: string) {
    return this.prisma.customProcedure.findMany({
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
  }

  async findOne(id: string, organizationId: string) {
    const proc = await this.prisma.customProcedure.findFirst({
      where: { id, organizationId },
    });
    if (!proc) throw new NotFoundException('Procédure introuvable');
    return proc;
  }

  async update(id: string, data: any, organizationId: string) {
    await this.findOne(id, organizationId);
    return this.prisma.customProcedure.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    });
  }

  async clone(id: string, projectId: string, organizationId: string, userId: string) {
    const source = await this.findOne(id, organizationId);
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
        createdById: userId,
      },
    });
  }

  async publish(id: string, organizationId: string) {
    await this.findOne(id, organizationId);
    return this.prisma.customProcedure.update({
      where: { id },
      data: { isPublished: true, projectId: null },
    });
  }

  async remove(id: string, organizationId: string) {
    await this.findOne(id, organizationId);
    return this.prisma.customProcedure.delete({ where: { id } });
  }

  async getLibrary(organizationId: string) {
    return this.prisma.customProcedure.findMany({
      where: { organizationId, isPublished: true },
      orderBy: { titleFR: 'asc' },
    });
  }

  getKnownRoles() {
    return KNOWN_ROLES;
  }
}