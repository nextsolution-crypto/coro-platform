import {
  BadRequestException,
  ForbiddenException,
  GoneException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  AdviserActor,
  projectAccessWhere,
  projectReadWhere,
} from '../auth/project-access';
import {
  DEFAULT_QUESTIONNAIRES,
  isTrainingType,
  QuestionnaireQuestion,
} from './default-questionnaires';

const MAX_QUESTIONS = 40;

export type EffectiveQuestionnaire = {
  id: string | null;
  source: 'CORO' | 'ORGANIZATION';
  title: string;
  passingPercent: number;
  questions: QuestionnaireQuestion[];
};

export type QuestionnaireInput = {
  title?: unknown;
  passingPercent?: unknown;
  questions?: unknown;
};

/** Valide et normalise une banque de questions (aucune réponse vide, bonne réponse existante). */
export function normalizeQuestions(raw: unknown): QuestionnaireQuestion[] {
  if (!Array.isArray(raw) || raw.length === 0)
    throw new BadRequestException('Ajoutez au moins une question.');
  if (raw.length > MAX_QUESTIONS)
    throw new BadRequestException(`${MAX_QUESTIONS} questions au maximum.`);
  return raw.map((item: any, index) => {
    const text = typeof item?.text === 'string' ? item.text.trim() : '';
    if (!text || text.length > 500)
      throw new BadRequestException(`Question ${index + 1} : texte requis (500 caractères au plus).`);
    const choices = Array.isArray(item?.choices)
      ? item.choices.map((c: unknown) => (typeof c === 'string' ? c.trim() : ''))
      : [];
    if (choices.length < 2 || choices.length > 6 || choices.some((c: string) => !c || c.length > 300))
      throw new BadRequestException(`Question ${index + 1} : de 2 à 6 réponses, toutes remplies.`);
    const correct = Number(item?.correct);
    if (!Number.isInteger(correct) || correct < 0 || correct >= choices.length)
      throw new BadRequestException(`Question ${index + 1} : indiquez la bonne réponse.`);
    const id =
      typeof item?.id === 'string' && /^[A-Za-z0-9_-]{1,40}$/.test(item.id)
        ? item.id
        : `q${index + 1}`;
    return { id, text, choices, correct };
  });
}

export function scoreAnswers(questions: QuestionnaireQuestion[], answers: unknown) {
  if (!Array.isArray(answers) || answers.length !== questions.length)
    throw new BadRequestException('Répondez à toutes les questions.');
  const normalized = answers.map((value, index) => {
    const choice = Number(value);
    if (!Number.isInteger(choice) || choice < 0 || choice >= questions[index].choices.length)
      throw new BadRequestException(`Réponse invalide à la question ${index + 1}.`);
    return choice;
  });
  const correctCount = normalized.filter((choice, index) => choice === questions[index].correct).length;
  const totalCount = questions.length;
  return {
    answers: normalized,
    correctCount,
    totalCount,
    percent: Math.round((correctCount / totalCount) * 100),
  };
}

@Injectable()
export class TrainingQuestionnairesService {
  constructor(private readonly prisma: PrismaService) {}

  private requireAdmin(actor: AdviserActor) {
    if (!['ADMIN', 'SUPER_ADMIN'].includes(actor.role))
      throw new ForbiddenException('Réservé aux administrateurs de l’organisation.');
  }

  /** Questionnaire en vigueur pour un type : celui de l’organisation, sinon celui de CORO. */
  private async effective(organizationId: string, code: string): Promise<EffectiveQuestionnaire | null> {
    const custom = await this.prisma.trainingQuestionnaire.findFirst({
      where: { organizationId, activityTypeCode: code, isActive: true },
    });
    if (custom)
      return {
        id: custom.id,
        source: 'ORGANIZATION' as const,
        title: custom.title,
        passingPercent: custom.passingPercent,
        questions: custom.questions as unknown as QuestionnaireQuestion[],
      };
    const fallback = DEFAULT_QUESTIONNAIRES[code];
    if (!fallback) return null;
    return { id: null, source: 'CORO' as const, ...fallback };
  }

  /** Paramètres : un questionnaire par type de formation actif de l’organisation. */
  async list(actor: AdviserActor) {
    const types = await this.prisma.activityType.findMany({
      where: {
        isActive: true,
        OR: [{ organizationId: null }, { organizationId: actor.organizationId }],
      },
      orderBy: [{ displayOrder: 'asc' }, { nameFR: 'asc' }],
      select: { code: true, nameFR: true },
    });
    const result: Array<{
      activityTypeCode: string;
      activityTypeName: string;
      questionnaire: EffectiveQuestionnaire | null;
    }> = [];
    for (const type of types.filter((t) => isTrainingType(t.code))) {
      const current = await this.effective(actor.organizationId, type.code);
      result.push({
        activityTypeCode: type.code,
        activityTypeName: type.nameFR,
        questionnaire: current,
      });
    }
    return result;
  }

  async save(actor: AdviserActor, code: string, input: QuestionnaireInput) {
    this.requireAdmin(actor);
    if (!isTrainingType(code)) throw new BadRequestException('Ce type n’est pas une formation.');
    const title = typeof input.title === 'string' ? input.title.trim() : '';
    if (!title || title.length > 200) throw new BadRequestException('Titre requis (200 caractères au plus).');
    const passingPercent = Number(input.passingPercent ?? 80);
    if (!Number.isInteger(passingPercent) || passingPercent < 0 || passingPercent > 100)
      throw new BadRequestException('Seuil de réussite entre 0 et 100 %.');
    const questions = normalizeQuestions(input.questions) as unknown as Prisma.InputJsonValue;
    const existing = await this.prisma.trainingQuestionnaire.findFirst({
      where: { organizationId: actor.organizationId, activityTypeCode: code, isActive: true },
      select: { id: true },
    });
    if (existing)
      return this.prisma.trainingQuestionnaire.update({
        where: { id: existing.id },
        data: { title, passingPercent, questions },
      });
    return this.prisma.trainingQuestionnaire.create({
      data: { organizationId: actor.organizationId, activityTypeCode: code, title, passingPercent, questions },
    });
  }

  /** Revenir au questionnaire CORO par défaut (la version de l’organisation est désactivée, pas supprimée). */
  async reset(actor: AdviserActor, code: string) {
    this.requireAdmin(actor);
    await this.prisma.trainingQuestionnaire.updateMany({
      where: { organizationId: actor.organizationId, activityTypeCode: code, isActive: true },
      data: { isActive: false },
    });
    return { reset: true };
  }

  private async activityFor(actor: AdviserActor, activityId: string) {
    const activity = await this.prisma.projectActivity.findFirst({
      where: {
        id: activityId,
        organizationId: actor.organizationId,
        project: { is: { ...projectReadWhere(actor), isActive: true } },
      },
      select: {
        id: true,
        type: true,
        label: true,
        assigneeEmail: true,
        projectId: true,
        project: { select: { buildingId: true } },
        activityType: { select: { code: true } },
      },
    });
    if (!activity) throw new NotFoundException('Activité introuvable');
    return activity;
  }

  /** Ouvrir ou fermer : propriétaire du projet, administrateur, coordination ou conseiller affecté. */
  private async canManage(
    actor: AdviserActor,
    activity: { id: string; projectId: string; assigneeEmail: string | null },
  ) {
    if (actor.planningCoordinator) return true;
    const owned = await this.prisma.project.findFirst({
      where: { id: activity.projectId, ...projectAccessWhere(actor) },
      select: { id: true },
    });
    if (owned) return true;
    const user = await this.prisma.user.findFirst({
      where: { id: actor.userId, organizationId: actor.organizationId, isActive: true },
      select: { email: true },
    });
    if (user && activity.assigneeEmail && activity.assigneeEmail.toLowerCase() === user.email.toLowerCase())
      return true;
    const assignment = await this.prisma.booking.findFirst({
      where: {
        activityId: activity.id,
        assignments: { some: { userId: actor.userId, status: { in: ['PENDING', 'ACCEPTED'] } } },
      },
      select: { id: true },
    });
    return Boolean(assignment);
  }

  private summary(session: {
    passingPercent: number;
    responses: Array<{ percent: number; passed: boolean }>;
  }) {
    const count = session.responses.length;
    return {
      participants: count,
      averagePercent: count
        ? Math.round(session.responses.reduce((sum, r) => sum + r.percent, 0) / count)
        : null,
      passRate: count
        ? Math.round((session.responses.filter((r) => r.passed).length / count) * 100)
        : null,
    };
  }

  async getForActivity(actor: AdviserActor, activityId: string) {
    const activity = await this.activityFor(actor, activityId);
    const code = activity.activityType?.code ?? activity.type;
    const session = await this.prisma.trainingQuestionnaireSession.findUnique({
      where: { projectActivityId: activity.id },
      include: { responses: { orderBy: { submittedAt: 'asc' } } },
    });
    const available = await this.effective(actor.organizationId, code);
    return {
      trainingType: isTrainingType(code),
      available: Boolean(available),
      canManage: await this.canManage(actor, activity),
      session: session
        ? {
            id: session.id,
            token: session.token,
            title: session.title,
            passingPercent: session.passingPercent,
            questionCount: (session.questions as unknown as QuestionnaireQuestion[]).length,
            isOpen: session.isOpen,
            createdAt: session.createdAt,
            closedAt: session.closedAt,
            ...this.summary(session),
            responses: session.responses.map((r) => ({
              id: r.id,
              participantName: r.participantName,
              correctCount: r.correctCount,
              totalCount: r.totalCount,
              percent: r.percent,
              passed: r.passed,
              submittedAt: r.submittedAt,
            })),
          }
        : null,
    };
  }

  async open(actor: AdviserActor, activityId: string) {
    const activity = await this.activityFor(actor, activityId);
    if (!(await this.canManage(actor, activity)))
      throw new ForbiddenException('Seuls le responsable du projet ou le conseiller affecté peuvent ouvrir le questionnaire.');
    const code = activity.activityType?.code ?? activity.type;
    if (!isTrainingType(code)) throw new BadRequestException('Cette activité n’est pas une formation.');
    const existing = await this.prisma.trainingQuestionnaireSession.findUnique({
      where: { projectActivityId: activity.id },
      select: { id: true },
    });
    if (existing) {
      await this.prisma.trainingQuestionnaireSession.update({
        where: { id: existing.id },
        data: { isOpen: true, closedAt: null },
      });
      return this.getForActivity(actor, activityId);
    }
    const questionnaire = await this.effective(actor.organizationId, code);
    if (!questionnaire)
      throw new BadRequestException('Aucun questionnaire n’est défini pour ce type de formation.');
    await this.prisma.trainingQuestionnaireSession.create({
      data: {
        organizationId: actor.organizationId,
        projectActivityId: activity.id,
        buildingId: activity.project.buildingId,
        questionnaireId: questionnaire.id,
        title: questionnaire.title,
        passingPercent: questionnaire.passingPercent,
        questions: questionnaire.questions as unknown as Prisma.InputJsonValue,
        token: randomBytes(18).toString('base64url'),
        createdById: actor.userId,
      },
    });
    return this.getForActivity(actor, activityId);
  }

  async close(actor: AdviserActor, activityId: string) {
    const activity = await this.activityFor(actor, activityId);
    if (!(await this.canManage(actor, activity)))
      throw new ForbiddenException('Seuls le responsable du projet ou le conseiller affecté peuvent fermer le questionnaire.');
    await this.prisma.trainingQuestionnaireSession.updateMany({
      where: { projectActivityId: activity.id, isOpen: true },
      data: { isOpen: false, closedAt: new Date() },
    });
    return this.getForActivity(actor, activityId);
  }

  // ── Accès public (participants, par code QR) ─────────────────────────────

  private async sessionByToken(token: string) {
    if (!/^[A-Za-z0-9_-]{16,64}$/.test(token)) throw new NotFoundException('Questionnaire introuvable');
    const session = await this.prisma.trainingQuestionnaireSession.findUnique({ where: { token } });
    if (!session) throw new NotFoundException('Questionnaire introuvable');
    return session;
  }

  /** Questions sans les bonnes réponses. */
  async publicGet(token: string) {
    const session = await this.sessionByToken(token);
    if (!session.isOpen) throw new GoneException('Ce questionnaire est fermé.');
    const questions = session.questions as unknown as QuestionnaireQuestion[];
    return {
      title: session.title,
      passingPercent: session.passingPercent,
      questions: questions.map((question) => ({ id: question.id, text: question.text, choices: question.choices })),
    };
  }

  async publicSubmit(token: string, body: { participantName?: unknown; answers?: unknown }) {
    const session = await this.sessionByToken(token);
    if (!session.isOpen) throw new GoneException('Ce questionnaire est fermé.');
    const participantName =
      typeof body.participantName === 'string' ? body.participantName.trim().replace(/\s+/g, ' ') : '';
    if (participantName.length < 2 || participantName.length > 120)
      throw new BadRequestException('Indiquez votre nom (2 à 120 caractères).');
    const questions = session.questions as unknown as QuestionnaireQuestion[];
    const score = scoreAnswers(questions, body.answers);
    const passed = score.percent >= session.passingPercent;
    await this.prisma.trainingQuestionnaireResponse.create({
      data: {
        sessionId: session.id,
        participantName,
        answers: score.answers,
        correctCount: score.correctCount,
        totalCount: score.totalCount,
        percent: score.percent,
        passed,
      },
    });
    return {
      correctCount: score.correctCount,
      totalCount: score.totalCount,
      percent: score.percent,
      passed,
      passingPercent: session.passingPercent,
      // Correction affichée après l’envoi, pour l’apprentissage.
      corrections: questions.map((question, index) => ({
        id: question.id,
        correct: score.answers[index] === question.correct,
        correctChoice: question.choices[question.correct],
      })),
    };
  }

  /** Résultats des 12 derniers mois pour un bâtiment (indice CORO). */
  async buildingAnalysis(buildingId: string, organizationId: string) {
    const since = new Date(Date.now() - 365 * 86400000);
    const responses = await this.prisma.trainingQuestionnaireResponse.findMany({
      where: { submittedAt: { gte: since }, session: { buildingId, organizationId } },
      select: { percent: true, passed: true, sessionId: true },
    });
    const count = responses.length;
    return {
      sessions: new Set(responses.map((r) => r.sessionId)).size,
      participants: count,
      averagePercent: count ? Math.round(responses.reduce((s, r) => s + r.percent, 0) / count) : null,
      passRate: count ? Math.round((responses.filter((r) => r.passed).length / count) * 100) : null,
    };
  }
}
