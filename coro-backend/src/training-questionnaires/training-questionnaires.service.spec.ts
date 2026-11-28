import { BadRequestException, ForbiddenException, GoneException } from '@nestjs/common';
import {
  normalizeQuestions,
  scoreAnswers,
  TrainingQuestionnairesService,
} from './training-questionnaires.service';
import { DEFAULT_QUESTIONNAIRES, isTrainingType } from './default-questionnaires';

const questions = [
  { id: 'a', text: 'Q1', choices: ['x', 'y'], correct: 1 },
  { id: 'b', text: 'Q2', choices: ['x', 'y', 'z'], correct: 0 },
];

describe('questionnaires de formation', () => {
  it('chaque questionnaire CORO par défaut est valide', () => {
    for (const [code, questionnaire] of Object.entries(DEFAULT_QUESTIONNAIRES)) {
      expect(isTrainingType(code)).toBe(true);
      expect(normalizeQuestions(questionnaire.questions)).toHaveLength(questionnaire.questions.length);
    }
    expect(DEFAULT_QUESTIONNAIRES.formation_sst_batiment_occupe).toBeDefined();
  });

  it('refuse une question sans bonne réponse valide', () => {
    expect(() => normalizeQuestions([{ text: 'Q', choices: ['a', 'b'], correct: 2 }])).toThrow(BadRequestException);
    expect(() => normalizeQuestions([])).toThrow(BadRequestException);
  });

  it('calcule le score et refuse des réponses incomplètes', () => {
    expect(scoreAnswers(questions, [1, 2])).toEqual({ answers: [1, 2], correctCount: 1, totalCount: 2, percent: 50 });
    expect(() => scoreAnswers(questions, [1])).toThrow(BadRequestException);
    expect(() => scoreAnswers(questions, [1, 9])).toThrow(BadRequestException);
  });

  const session = (overrides = {}) => ({
    id: 's1',
    token: 'abcdefghijklmnopqrstuvwx',
    title: 'Questionnaire',
    passingPercent: 80,
    questions,
    isOpen: true,
    ...overrides,
  });

  it('ne divulgue jamais les bonnes réponses avant l’envoi', async () => {
    const prisma: any = { trainingQuestionnaireSession: { findUnique: jest.fn().mockResolvedValue(session()) } };
    const result = await new TrainingQuestionnairesService(prisma).publicGet('abcdefghijklmnopqrstuvwx');
    expect(JSON.stringify(result)).not.toContain('correct');
    expect(result.questions[0]).toEqual({ id: 'a', text: 'Q1', choices: ['x', 'y'] });
  });

  it('refuse une réponse sur un questionnaire fermé', async () => {
    const prisma: any = {
      trainingQuestionnaireSession: { findUnique: jest.fn().mockResolvedValue(session({ isOpen: false })) },
      trainingQuestionnaireResponse: { create: jest.fn() },
    };
    await expect(
      new TrainingQuestionnairesService(prisma).publicSubmit('abcdefghijklmnopqrstuvwx', { participantName: 'Alex', answers: [1, 0] }),
    ).rejects.toBeInstanceOf(GoneException);
    expect(prisma.trainingQuestionnaireResponse.create).not.toHaveBeenCalled();
  });

  it('enregistre la réponse avec le score et la réussite', async () => {
    const prisma: any = {
      trainingQuestionnaireSession: { findUnique: jest.fn().mockResolvedValue(session()) },
      trainingQuestionnaireResponse: { create: jest.fn().mockResolvedValue({}) },
    };
    const result = await new TrainingQuestionnairesService(prisma).publicSubmit('abcdefghijklmnopqrstuvwx', {
      participantName: '  Alex   Tremblay ',
      answers: [1, 0],
    });
    expect(result).toEqual(expect.objectContaining({ percent: 100, passed: true }));
    expect(prisma.trainingQuestionnaireResponse.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ sessionId: 's1', participantName: 'Alex Tremblay', percent: 100, passed: true }),
    });
  });

  it('réserve la modification des banques aux administrateurs', async () => {
    const service = new TrainingQuestionnairesService({} as any);
    await expect(
      service.save({ userId: 'u', organizationId: 'o', role: 'OPERATOR' }, 'formation_epi', { title: 'T', questions }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
