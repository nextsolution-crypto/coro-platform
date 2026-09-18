import {
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import {
  PopulationAlertStatus,
  PopulationAlertType,
  PopulationConsentEventType,
  PopulationPreferredLanguage,
  PopulationProgramStatus,
  PopulationSubscriberStatus,
  PopulationVerificationChannel,
  RueAssessmentStatus,
  PopulationAlertChannel,
  PopulationDeliveryStatus,
  Prisma,
} from '@prisma/client';
import { PopulationService } from './population.service';
import {
  PopulationProviderError,
} from './population-delivery.service';

describe('PopulationService', () => {
  let service: PopulationService;

  const prisma = {
  building: {
    findUnique: jest.fn(),
  },
  rueFacilityProfile: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  populationProgram: {
    upsert: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  populationSubscriber: {
    create: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
  },
  populationVerification: {
    create: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
  populationConsentEvent: {
    create: jest.fn(),
  },
  rueEmergencyScenario: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
  },
  populationAlert: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
  incidentEvent: {
    findFirst: jest.fn(),
  },
  populationAlertZone: {
    createMany: jest.fn(),
    deleteMany: jest.fn(),
  },
  populationAlertDelivery: {
  create: jest.fn(),
  createMany: jest.fn(),
  findMany: jest.fn(),
  findFirst: jest.fn(),
  count: jest.fn(),
  groupBy: jest.fn(),
  updateMany: jest.fn(),
},
  $transaction: jest.fn(),
};

const populationGeospatialService = {
  distanceKm: jest.fn(),
  isPointInsideGeometry: jest.fn(),
  isPointInsideImpactZone: jest.fn(),
};

const populationDeliveryService = {
  sendSms: jest.fn(),
  sendEmail: jest.fn(),
};

  beforeEach(() => {
  jest.clearAllMocks();

  prisma.$transaction.mockImplementation(
    async (callback: any) => callback(prisma),
  );

    process.env.POPULATION_OTP_SECRET =
      'test-population-otp-secret-not-for-production';

    process.env.POPULATION_ACCESS_SECRET =
      'test-population-access-secret-not-for-production';

    prisma.$transaction.mockImplementation(
      async (callback: (tx: typeof prisma) => unknown) =>
        callback(prisma),
    );
    service = new PopulationService(
      prisma as any,
      populationGeospatialService as any,
      populationDeliveryService as any,
    );
  });

  describe('getRueFacilityProfile', () => {
    it('retourne le profil RUE et son programme Population', async () => {
      const profile = {
        id: 'rue-profile-1',
        buildingId: 'building-1',
        assessmentStatus: RueAssessmentStatus.CONFIRMED_SUBJECT,
        populationEnabled: true,
        populationProgram: {
          id: 'population-program-1',
          status: PopulationProgramStatus.ACTIVE,
        },
      };

      prisma.rueFacilityProfile.findUnique.mockResolvedValue(profile);

      await expect(
        service.getRueFacilityProfile('building-1'),
      ).resolves.toEqual(profile);

      expect(prisma.rueFacilityProfile.findUnique).toHaveBeenCalledWith({
        where: {
          buildingId: 'building-1',
        },
        include: {
          populationProgram: true,
        },
      });
    });

    it('refuse un bâtiment sans profil RUE', async () => {
      prisma.rueFacilityProfile.findUnique.mockResolvedValue(null);

      await expect(
        service.getRueFacilityProfile('building-1'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('assertPopulationEligible', () => {
    it('autorise un site confirmé assujetti au RUE', async () => {
      const profile = {
        id: 'rue-profile-1',
        buildingId: 'building-1',
        assessmentStatus: RueAssessmentStatus.CONFIRMED_SUBJECT,
        populationEnabled: false,
        populationProgram: null,
      };

      prisma.rueFacilityProfile.findUnique.mockResolvedValue(profile);

      await expect(
        service.assertPopulationEligible('building-1'),
      ).resolves.toEqual(profile);
    });

    it.each([
      RueAssessmentStatus.NOT_ASSESSED,
      RueAssessmentStatus.ASSESSMENT_IN_PROGRESS,
      RueAssessmentStatus.CONFIRMED_NOT_SUBJECT,
      RueAssessmentStatus.EXEMPT,
    ])(
      'refuse un site dont le statut RUE est %s',
      async (assessmentStatus) => {
        prisma.rueFacilityProfile.findUnique.mockResolvedValue({
          id: 'rue-profile-1',
          buildingId: 'building-1',
          assessmentStatus,
          populationEnabled: false,
          populationProgram: null,
        });

        await expect(
          service.assertPopulationEligible('building-1'),
        ).rejects.toBeInstanceOf(BadRequestException);
      },
    );
  });

  describe('assertPopulationOperational', () => {
    it('autorise uniquement un site RUE avec Population activé et programme ACTIVE', async () => {
      const profile = {
        id: 'rue-profile-1',
        buildingId: 'building-1',
        assessmentStatus: RueAssessmentStatus.CONFIRMED_SUBJECT,
        populationEnabled: true,
        populationProgram: {
          id: 'population-program-1',
          status: PopulationProgramStatus.ACTIVE,
        },
      };

      prisma.rueFacilityProfile.findUnique.mockResolvedValue(profile);

      await expect(
        service.assertPopulationOperational('building-1'),
      ).resolves.toEqual(profile);
    });

    it('refuse un site RUE lorsque Population est désactivé', async () => {
      prisma.rueFacilityProfile.findUnique.mockResolvedValue({
        id: 'rue-profile-1',
        buildingId: 'building-1',
        assessmentStatus: RueAssessmentStatus.CONFIRMED_SUBJECT,
        populationEnabled: false,
        populationProgram: {
          id: 'population-program-1',
          status: PopulationProgramStatus.ACTIVE,
        },
      });

      await expect(
        service.assertPopulationOperational('building-1'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('refuse un site sans programme Population', async () => {
      prisma.rueFacilityProfile.findUnique.mockResolvedValue({
        id: 'rue-profile-1',
        buildingId: 'building-1',
        assessmentStatus: RueAssessmentStatus.CONFIRMED_SUBJECT,
        populationEnabled: true,
        populationProgram: null,
      });

      await expect(
        service.assertPopulationOperational('building-1'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it.each([
      PopulationProgramStatus.NOT_CONFIGURED,
      PopulationProgramStatus.CONFIGURING,
      PopulationProgramStatus.READY,
      PopulationProgramStatus.SUSPENDED,
    ])(
      'refuse un programme Population dont le statut est %s',
      async (status) => {
        prisma.rueFacilityProfile.findUnique.mockResolvedValue({
          id: 'rue-profile-1',
          buildingId: 'building-1',
          assessmentStatus: RueAssessmentStatus.CONFIRMED_SUBJECT,
          populationEnabled: true,
          populationProgram: {
            id: 'population-program-1',
            status,
          },
        });

        await expect(
          service.assertPopulationOperational('building-1'),
        ).rejects.toBeInstanceOf(BadRequestException);
      },
    );
  });

  describe('getPublicProgram', () => {
    const publicProgram = {
      publicSlug: 'sobeys-boucherville',

      nameFR: 'Alertes publiques Sobeys Boucherville',
      nameEN: 'Sobeys Boucherville Public Alerts',

      descriptionFR: 'Programme d’alerte à la population.',
      descriptionEN: 'Public alert program.',

      publicPhone: '450-555-0100',
      publicEmail: 'urgence@example.ca',
      websiteUrl: 'https://example.ca',

      registrationEnabled: true,

      smsEnabled: true,
      emailEnabled: true,

      privacyTextFR: 'Texte vie privée FR',
      privacyTextEN: 'Privacy text EN',

      consentTextFR: 'Consentement FR',
      consentTextEN: 'Consent EN',

      consentVersion: '2026-09-17',
    };

    it('retourne uniquement les données publiques d’un programme ACTIVE et opérationnel', async () => {
      prisma.populationProgram.findUnique.mockResolvedValue({
        ...publicProgram,
        status: PopulationProgramStatus.ACTIVE,
        rueFacilityProfile: {
          assessmentStatus: RueAssessmentStatus.CONFIRMED_SUBJECT,
          populationEnabled: true,
        },
      });

      const result = await service.getPublicProgram(
        'sobeys-boucherville',
      );

      expect(prisma.populationProgram.findUnique).toHaveBeenCalledWith({
        where: {
          publicSlug: 'sobeys-boucherville',
        },
        select: expect.objectContaining({
          publicSlug: true,
          status: true,
          rueFacilityProfile: {
            select: {
              assessmentStatus: true,
              populationEnabled: true,
            },
          },
        }),
      });

      expect(result).toEqual(publicProgram);
      expect(result).not.toHaveProperty('status');
      expect(result).not.toHaveProperty('rueFacilityProfile');
    });

    it('retourne 404 lorsque le slug public n’existe pas', async () => {
      prisma.populationProgram.findUnique.mockResolvedValue(null);

      await expect(
        service.getPublicProgram('programme-inexistant'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it.each([
      PopulationProgramStatus.NOT_CONFIGURED,
      PopulationProgramStatus.CONFIGURING,
      PopulationProgramStatus.READY,
      PopulationProgramStatus.SUSPENDED,
      PopulationProgramStatus.ARCHIVED,
    ])(
      'retourne 404 lorsque le programme est %s',
      async (status) => {
        prisma.populationProgram.findUnique.mockResolvedValue({
          ...publicProgram,
          status,
          rueFacilityProfile: {
            assessmentStatus: RueAssessmentStatus.CONFIRMED_SUBJECT,
            populationEnabled: true,
          },
        });

        await expect(
          service.getPublicProgram('sobeys-boucherville'),
        ).rejects.toBeInstanceOf(NotFoundException);
      },
    );

    it('retourne 404 lorsque le site n’est plus confirmé assujetti au RUE', async () => {
      prisma.populationProgram.findUnique.mockResolvedValue({
        ...publicProgram,
        status: PopulationProgramStatus.ACTIVE,
        rueFacilityProfile: {
          assessmentStatus: RueAssessmentStatus.CONFIRMED_NOT_SUBJECT,
          populationEnabled: true,
        },
      });

      await expect(
        service.getPublicProgram('sobeys-boucherville'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('retourne 404 lorsque Sentinelle Population est désactivé pour le site', async () => {
      prisma.populationProgram.findUnique.mockResolvedValue({
        ...publicProgram,
        status: PopulationProgramStatus.ACTIVE,
        rueFacilityProfile: {
          assessmentStatus: RueAssessmentStatus.CONFIRMED_SUBJECT,
          populationEnabled: false,
        },
      });

      await expect(
        service.getPublicProgram('sobeys-boucherville'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('getProgramConfiguration', () => {
    it('retourne un état non configuré lorsqu’aucun programme Population n’existe', async () => {
      prisma.rueFacilityProfile.findUnique.mockResolvedValue({
        id: 'rue-profile-1',
        buildingId: 'building-1',
        assessmentStatus: RueAssessmentStatus.CONFIRMED_SUBJECT,
        populationEnabled: false,
        populationProgram: null,
      });

      await expect(
        service.getProgramConfiguration('building-1'),
      ).resolves.toEqual({
        configured: false,
        rueFacilityProfileId: 'rue-profile-1',
        status: PopulationProgramStatus.NOT_CONFIGURED,
        program: null,
      });
    });

    it('retourne uniquement la configuration du programme sans ses relations sensibles', async () => {
      const now = new Date('2026-09-16T12:00:00.000Z');

      prisma.rueFacilityProfile.findUnique.mockResolvedValue({
        id: 'rue-profile-1',
        buildingId: 'building-1',
        assessmentStatus: RueAssessmentStatus.CONFIRMED_SUBJECT,
        populationEnabled: true,
        populationProgram: {
          id: 'population-program-1',
          status: PopulationProgramStatus.ACTIVE,
          publicSlug: 'sobeys-boucherville',

          nameFR: 'Alertes publiques Sobeys Boucherville',
          nameEN: 'Sobeys Boucherville Public Alerts',

          descriptionFR: 'Programme d’alerte à la population.',
          descriptionEN: 'Public alert program.',

          publicPhone: '450-555-0100',
          publicEmail: 'urgence@example.ca',
          websiteUrl: 'https://example.ca',

          registrationEnabled: true,

          smsEnabled: true,
          emailEnabled: true,

          privacyTextFR: 'Texte vie privée FR',
          privacyTextEN: 'Privacy text EN',

          consentTextFR: 'Consentement FR',
          consentTextEN: 'Consent EN',
          consentVersion: '2026-09-16',

          activatedAt: now,
          suspendedAt: null,
          archivedAt: null,

          createdAt: now,
          updatedAt: now,

          // Ces relations ne doivent jamais être propagées par cette méthode.
          subscribers: [{ id: 'subscriber-secret' }],
          consentEvents: [{ id: 'consent-secret' }],
          alerts: [{ id: 'alert-secret' }],
        },
      });

      const result =
        await service.getProgramConfiguration('building-1');

      expect(result).toEqual({
        configured: true,
        rueFacilityProfileId: 'rue-profile-1',
        status: PopulationProgramStatus.ACTIVE,
        program: {
          id: 'population-program-1',
          publicSlug: 'sobeys-boucherville',

          nameFR: 'Alertes publiques Sobeys Boucherville',
          nameEN: 'Sobeys Boucherville Public Alerts',

          descriptionFR: 'Programme d’alerte à la population.',
          descriptionEN: 'Public alert program.',

          publicPhone: '450-555-0100',
          publicEmail: 'urgence@example.ca',
          websiteUrl: 'https://example.ca',

          registrationEnabled: true,

          smsEnabled: true,
          emailEnabled: true,

          privacyTextFR: 'Texte vie privée FR',
          privacyTextEN: 'Privacy text EN',

          consentTextFR: 'Consentement FR',
          consentTextEN: 'Consent EN',
          consentVersion: '2026-09-16',

          activatedAt: now,
          suspendedAt: null,
          archivedAt: null,

          createdAt: now,
          updatedAt: now,
        },
      });

      expect(result.program).not.toHaveProperty('subscribers');
      expect(result.program).not.toHaveProperty('consentEvents');
      expect(result.program).not.toHaveProperty('alerts');
    });

    it('refuse de retourner une configuration pour un site non confirmé assujetti au RUE', async () => {
      prisma.rueFacilityProfile.findUnique.mockResolvedValue({
        id: 'rue-profile-1',
        buildingId: 'building-1',
        assessmentStatus: RueAssessmentStatus.CONFIRMED_NOT_SUBJECT,
        populationEnabled: false,
        populationProgram: null,
      });

      await expect(
        service.getProgramConfiguration('building-1'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('configureProgram', () => {
    const dto = {
      publicSlug: 'sobeys-boucherville',
      nameFR: 'Programme d’alerte publique',
      nameEN: 'Public Alert Program',
      descriptionFR: 'Programme destiné à la population environnante.',
      descriptionEN: 'Program for the surrounding population.',
      publicPhone: '450-555-0100',
      publicEmail: 'urgence@example.com',
      websiteUrl: 'https://example.com',
      registrationEnabled: false,
      smsEnabled: true,
      emailEnabled: true,
      privacyTextFR: 'Texte de confidentialité',
      privacyTextEN: 'Privacy text',
      consentTextFR: 'Texte de consentement',
      consentTextEN: 'Consent text',
      consentVersion: '2026-09-17',
    };

    it('creates a new program in CONFIGURING without enabling Population', async () => {
      prisma.rueFacilityProfile.findUnique.mockResolvedValue({
        id: 'profile-1',
        buildingId: 'building-1',
        assessmentStatus: RueAssessmentStatus.CONFIRMED_SUBJECT,
        populationEnabled: false,
        populationProgram: null,
      });

      prisma.populationProgram.upsert.mockResolvedValue({
        id: 'program-1',
        rueFacilityProfileId: 'profile-1',
        status: PopulationProgramStatus.CONFIGURING,
        ...dto,
      });

      await service.configureProgram('building-1', dto);

      expect(prisma.populationProgram.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            rueFacilityProfileId: 'profile-1',
          },
          create: expect.objectContaining({
            rueFacilityProfileId: 'profile-1',
            status: PopulationProgramStatus.CONFIGURING,
          }),
        }),
      );

      expect(prisma.populationProgram.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.not.objectContaining({
            status: expect.anything(),
          }),
        }),
      );
    });

    it('does not overwrite the status of an existing ACTIVE program', async () => {
      prisma.rueFacilityProfile.findUnique.mockResolvedValue({
        id: 'profile-1',
        buildingId: 'building-1',
        assessmentStatus: RueAssessmentStatus.CONFIRMED_SUBJECT,
        populationEnabled: true,
        populationProgram: {
          id: 'program-1',
          status: PopulationProgramStatus.ACTIVE,
        },
      });

      prisma.populationProgram.upsert.mockResolvedValue({
        id: 'program-1',
        rueFacilityProfileId: 'profile-1',
        status: PopulationProgramStatus.ACTIVE,
        ...dto,
      });

      await service.configureProgram('building-1', dto);

      const call = prisma.populationProgram.upsert.mock.calls[0][0];

      expect(call.update.status).toBeUndefined();
      expect(call.create.status).toBe(PopulationProgramStatus.CONFIGURING);
    });

    it('rejects configuration when the site is not confirmed subject to RUE', async () => {
      prisma.rueFacilityProfile.findUnique.mockResolvedValue({
        id: 'profile-1',
        buildingId: 'building-1',
        assessmentStatus: RueAssessmentStatus.CONFIRMED_NOT_SUBJECT,
        populationEnabled: false,
        populationProgram: null,
      });

      await expect(
        service.configureProgram('building-1', dto),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(prisma.populationProgram.upsert).not.toHaveBeenCalled();
    });

    it('refuse une modification invalide d’un programme ACTIVE sans écrire en base', async () => {
      prisma.rueFacilityProfile.findUnique.mockResolvedValue({
        id: 'profile-1',
        buildingId: 'building-1',
        assessmentStatus: RueAssessmentStatus.CONFIRMED_SUBJECT,
        populationEnabled: true,
        populationProgram: {
          id: 'program-1',
          status: PopulationProgramStatus.ACTIVE,
        },
      });

      const invalidDto = {
        ...dto,
        smsEnabled: false,
        emailEnabled: false,
      };

      await expect(
        service.configureProgram('building-1', invalidDto),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(prisma.populationProgram.upsert).not.toHaveBeenCalled();
    });

    it('refuse une modification invalide d’un programme READY sans écrire en base', async () => {
      prisma.rueFacilityProfile.findUnique.mockResolvedValue({
        id: 'profile-1',
        buildingId: 'building-1',
        assessmentStatus: RueAssessmentStatus.CONFIRMED_SUBJECT,
        populationEnabled: false,
        populationProgram: {
          id: 'program-1',
          status: PopulationProgramStatus.READY,
        },
      });

      const invalidDto = {
        ...dto,
        consentVersion: undefined,
      };

      await expect(
        service.configureProgram('building-1', invalidDto),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(prisma.populationProgram.upsert).not.toHaveBeenCalled();
    });

    it('permet de modifier un programme SUSPENDED même si la configuration n’est plus READY', async () => {
      prisma.rueFacilityProfile.findUnique.mockResolvedValue({
        id: 'profile-1',
        buildingId: 'building-1',
        assessmentStatus: RueAssessmentStatus.CONFIRMED_SUBJECT,
        populationEnabled: false,
        populationProgram: {
          id: 'program-1',
          status: PopulationProgramStatus.SUSPENDED,
        },
      });

      const suspendedDto = {
        ...dto,
        smsEnabled: false,
        emailEnabled: false,
      };

      prisma.populationProgram.upsert.mockResolvedValue({
        id: 'program-1',
        status: PopulationProgramStatus.SUSPENDED,
      });

      const result = await service.configureProgram(
        'building-1',
        suspendedDto,
      );

      expect(prisma.populationProgram.upsert).toHaveBeenCalled();
      expect(result.status).toBe(PopulationProgramStatus.SUSPENDED);
    });

    it('refuse toute modification d’un programme ARCHIVED', async () => {
      prisma.rueFacilityProfile.findUnique.mockResolvedValue({
        id: 'profile-1',
        buildingId: 'building-1',
        assessmentStatus: RueAssessmentStatus.CONFIRMED_SUBJECT,
        populationEnabled: false,
        populationProgram: {
          id: 'program-1',
          status: PopulationProgramStatus.ARCHIVED,
        },
      });

      await expect(
        service.configureProgram('building-1', dto),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(prisma.populationProgram.upsert).not.toHaveBeenCalled();
    });
  });
    describe('validateProgramReadiness', () => {
    const readyProgram = {
      id: 'program-1',
      rueFacilityProfileId: 'profile-1',
      status: PopulationProgramStatus.CONFIGURING,
      publicSlug: 'sobeys-boucherville',
      nameFR: 'Programme d’alerte publique',
      smsEnabled: true,
      emailEnabled: true,
      privacyTextFR: 'Texte de confidentialité',
      consentTextFR: 'Texte de consentement',
      consentVersion: '2026-09-17',
    };

    const operationalScenario = {
      id: 'scenario-1',
      facilityProfileId: 'profile-1',
      isActive: true,
      validatedAt: new Date(),
      defaultProtectiveAction: 'SHELTER_IN_PLACE',
      publicInstructionFR: 'Mettez-vous à l’abri et fermez les ouvertures.',
      impactZones: [
        {
          id: 'zone-1',
          isActive: true,
          validatedAt: new Date(),
          geometry: {
            type: 'Polygon',
            coordinates: [],
          },
          maxDistanceKm: null,
          protectiveAction: 'SHELTER_IN_PLACE',
          instructionFR: 'Mettez-vous à l’abri.',
        },
      ],
    };

    beforeEach(() => {
      prisma.rueFacilityProfile.findUnique.mockResolvedValue({
        id: 'profile-1',
        buildingId: 'building-1',
        assessmentStatus: RueAssessmentStatus.CONFIRMED_SUBJECT,
        populationEnabled: false,
        populationProgram: readyProgram,
      });

      prisma.populationProgram.findUnique.mockResolvedValue(readyProgram);
      prisma.rueEmergencyScenario.findMany.mockResolvedValue([
        operationalScenario,
      ]);
    });

    it('considère le programme READY lorsque tous les prérequis sont satisfaits', async () => {
      await expect(
        service.validateProgramReadiness('building-1'),
      ).resolves.toEqual({
        ready: true,
        missingRequirements: [],
      });
    });

    it('retourne PROGRAM_NOT_CONFIGURED lorsqu’aucun programme n’existe', async () => {
      prisma.populationProgram.findUnique.mockResolvedValue(null);

      await expect(
        service.validateProgramReadiness('building-1'),
      ).resolves.toEqual({
        ready: false,
        missingRequirements: ['PROGRAM_NOT_CONFIGURED'],
      });

      expect(prisma.rueEmergencyScenario.findMany).not.toHaveBeenCalled();
    });

    it('détecte les prérequis manquants de la configuration', async () => {
      prisma.populationProgram.findUnique.mockResolvedValue({
        ...readyProgram,
        publicSlug: '',
        nameFR: '',
        smsEnabled: false,
        emailEnabled: false,
        privacyTextFR: null,
        consentTextFR: null,
        consentVersion: null,
      });

      const result = await service.validateProgramReadiness('building-1');

      expect(result.ready).toBe(false);
      expect(result.missingRequirements).toEqual(
        expect.arrayContaining([
          'PUBLIC_SLUG_REQUIRED',
          'NAME_FR_REQUIRED',
          'DELIVERY_CHANNEL_REQUIRED',
          'PRIVACY_TEXT_FR_REQUIRED',
          'CONSENT_TEXT_FR_REQUIRED',
          'CONSENT_VERSION_REQUIRED',
        ]),
      );
    });

    it('refuse un scénario non validé', async () => {
      prisma.rueEmergencyScenario.findMany.mockResolvedValue([
        {
          ...operationalScenario,
          validatedAt: null,
        },
      ]);

      const result = await service.validateProgramReadiness('building-1');

      expect(result.ready).toBe(false);
      expect(result.missingRequirements).toContain(
        'OPERATIONAL_SCENARIO_REQUIRED',
      );
    });

    it('refuse une zone non validée', async () => {
      prisma.rueEmergencyScenario.findMany.mockResolvedValue([
        {
          ...operationalScenario,
          impactZones: [
            {
              ...operationalScenario.impactZones[0],
              validatedAt: null,
            },
          ],
        },
      ]);

      const result = await service.validateProgramReadiness('building-1');

      expect(result.ready).toBe(false);
      expect(result.missingRequirements).toContain(
        'OPERATIONAL_SCENARIO_REQUIRED',
      );
    });

    it('refuse une zone sans géométrie ni distance exploitable', async () => {
      prisma.rueEmergencyScenario.findMany.mockResolvedValue([
        {
          ...operationalScenario,
          impactZones: [
            {
              ...operationalScenario.impactZones[0],
              geometry: null,
              maxDistanceKm: null,
            },
          ],
        },
      ]);

      const result = await service.validateProgramReadiness('building-1');

      expect(result.ready).toBe(false);
      expect(result.missingRequirements).toContain(
        'OPERATIONAL_SCENARIO_REQUIRED',
      );
    });

    it('accepte une zone définie par une distance même sans GeoJSON', async () => {
      prisma.rueEmergencyScenario.findMany.mockResolvedValue([
        {
          ...operationalScenario,
          impactZones: [
            {
              ...operationalScenario.impactZones[0],
              geometry: null,
              maxDistanceKm: 2.5,
            },
          ],
        },
      ]);

      await expect(
        service.validateProgramReadiness('building-1'),
      ).resolves.toEqual({
        ready: true,
        missingRequirements: [],
      });
    });

    it('refuse une zone sans action de protection', async () => {
      prisma.rueEmergencyScenario.findMany.mockResolvedValue([
        {
          ...operationalScenario,
          impactZones: [
            {
              ...operationalScenario.impactZones[0],
              protectiveAction: null,
            },
          ],
        },
      ]);

      const result = await service.validateProgramReadiness('building-1');

      expect(result.ready).toBe(false);
      expect(result.missingRequirements).toContain(
        'OPERATIONAL_SCENARIO_REQUIRED',
      );
    });

    it('refuse une zone sans consigne publique française', async () => {
      prisma.rueEmergencyScenario.findMany.mockResolvedValue([
        {
          ...operationalScenario,
          impactZones: [
            {
              ...operationalScenario.impactZones[0],
              instructionFR: null,
            },
          ],
        },
      ]);

      const result = await service.validateProgramReadiness('building-1');

      expect(result.ready).toBe(false);
      expect(result.missingRequirements).toContain(
        'OPERATIONAL_SCENARIO_REQUIRED',
      );
    });
  });
    describe('markReady', () => {
    const readyProgram = {
      id: 'program-1',
      rueFacilityProfileId: 'profile-1',
      status: PopulationProgramStatus.CONFIGURING,
      publicSlug: 'sobeys-boucherville',
      nameFR: 'Programme d’alerte publique',
      smsEnabled: true,
      emailEnabled: true,
      privacyTextFR: 'Texte de confidentialité',
      consentTextFR: 'Texte de consentement',
      consentVersion: '2026-09-17',
    };

    const operationalScenario = {
      id: 'scenario-1',
      facilityProfileId: 'profile-1',
      isActive: true,
      validatedAt: new Date(),
      defaultProtectiveAction: 'SHELTER_IN_PLACE',
      publicInstructionFR: 'Mettez-vous à l’abri.',
      impactZones: [
        {
          id: 'zone-1',
          isActive: true,
          validatedAt: new Date(),
          geometry: null,
          maxDistanceKm: 2.5,
          protectiveAction: 'SHELTER_IN_PLACE',
          instructionFR: 'Mettez-vous à l’abri.',
        },
      ],
    };

    beforeEach(() => {
      prisma.rueFacilityProfile.findUnique.mockResolvedValue({
        id: 'profile-1',
        buildingId: 'building-1',
        assessmentStatus: RueAssessmentStatus.CONFIRMED_SUBJECT,
        populationEnabled: false,
        populationProgram: readyProgram,
      });

      prisma.populationProgram.findUnique.mockResolvedValue(readyProgram);

      prisma.rueEmergencyScenario.findMany.mockResolvedValue([
        operationalScenario,
      ]);

      prisma.populationProgram.update.mockResolvedValue({
        ...readyProgram,
        status: PopulationProgramStatus.READY,
      });
    });

    it('fait passer un programme CONFIGURING à READY', async () => {
      const result = await service.markReady('building-1');

      expect(prisma.populationProgram.update).toHaveBeenCalledWith({
        where: {
          id: 'program-1',
        },
        data: {
          status: PopulationProgramStatus.READY,
        },
      });

      expect(result.status).toBe(PopulationProgramStatus.READY);
    });

    it('refuse le passage à READY lorsque les prérequis sont incomplets', async () => {
      prisma.populationProgram.findUnique.mockResolvedValue({
        ...readyProgram,
        consentVersion: null,
      });

      await expect(service.markReady('building-1')).rejects.toBeInstanceOf(
        BadRequestException,
      );

      expect(prisma.populationProgram.update).not.toHaveBeenCalled();
    });

    it('est idempotent lorsqu’un programme est déjà READY', async () => {
      const alreadyReady = {
        ...readyProgram,
        status: PopulationProgramStatus.READY,
      };

      prisma.rueFacilityProfile.findUnique.mockResolvedValue({
        id: 'profile-1',
        buildingId: 'building-1',
        assessmentStatus: RueAssessmentStatus.CONFIRMED_SUBJECT,
        populationEnabled: false,
        populationProgram: alreadyReady,
      });

      prisma.populationProgram.findUnique.mockResolvedValue(alreadyReady);

      const result = await service.markReady('building-1');

      expect(result.status).toBe(PopulationProgramStatus.READY);
      expect(prisma.populationProgram.update).not.toHaveBeenCalled();
    });

    it.each([
      PopulationProgramStatus.ACTIVE,
      PopulationProgramStatus.SUSPENDED,
      PopulationProgramStatus.ARCHIVED,
    ])('refuse la transition %s vers READY', async (status) => {
      const program = {
        ...readyProgram,
        status,
      };

      prisma.rueFacilityProfile.findUnique.mockResolvedValue({
        id: 'profile-1',
        buildingId: 'building-1',
        assessmentStatus: RueAssessmentStatus.CONFIRMED_SUBJECT,
        populationEnabled:
          status === PopulationProgramStatus.ACTIVE,
        populationProgram: program,
      });

      prisma.populationProgram.findUnique.mockResolvedValue(program);

      await expect(service.markReady('building-1')).rejects.toBeInstanceOf(
        BadRequestException,
      );

      expect(prisma.populationProgram.update).not.toHaveBeenCalled();
    });
  });
    describe('activateProgram', () => {
    const readyProgram = {
      id: 'program-1',
      rueFacilityProfileId: 'profile-1',
      status: PopulationProgramStatus.READY,
      publicSlug: 'sobeys-boucherville',
      nameFR: 'Programme d’alerte publique',
      smsEnabled: true,
      emailEnabled: true,
      privacyTextFR: 'Texte de confidentialité',
      consentTextFR: 'Texte de consentement',
      consentVersion: '2026-09-17',
      activatedAt: null,
      suspendedAt: null,
    };

    const operationalScenario = {
      id: 'scenario-1',
      facilityProfileId: 'profile-1',
      isActive: true,
      validatedAt: new Date(),
      defaultProtectiveAction: 'SHELTER_IN_PLACE',
      publicInstructionFR: 'Mettez-vous à l’abri.',
      impactZones: [
        {
          id: 'zone-1',
          isActive: true,
          validatedAt: new Date(),
          geometry: null,
          maxDistanceKm: 2.5,
          protectiveAction: 'SHELTER_IN_PLACE',
          instructionFR: 'Mettez-vous à l’abri.',
        },
      ],
    };

    beforeEach(() => {
      prisma.rueFacilityProfile.findUnique.mockResolvedValue({
        id: 'profile-1',
        buildingId: 'building-1',
        assessmentStatus: RueAssessmentStatus.CONFIRMED_SUBJECT,
        populationEnabled: false,
        populationProgram: readyProgram,
      });

      prisma.populationProgram.findUnique.mockResolvedValue(readyProgram);

      prisma.rueEmergencyScenario.findMany.mockResolvedValue([
        operationalScenario,
      ]);

      prisma.rueFacilityProfile.update.mockReturnValue({
        operation: 'enable-profile',
      });

      prisma.populationProgram.update.mockReturnValue({
        operation: 'activate-program',
      });

      prisma.$transaction.mockResolvedValue([
        {
          id: 'profile-1',
          populationEnabled: true,
        },
        {
          ...readyProgram,
          status: PopulationProgramStatus.ACTIVE,
          activatedAt: new Date(),
        },
      ]);
    });

    it('active atomiquement un programme READY et Population', async () => {
      const result = await service.activateProgram('building-1');

      expect(prisma.rueFacilityProfile.update).toHaveBeenCalledWith({
        where: {
          id: 'profile-1',
        },
        data: {
          populationEnabled: true,
        },
      });

      expect(prisma.populationProgram.update).toHaveBeenCalledWith({
        where: {
          id: 'program-1',
        },
        data: {
          status: PopulationProgramStatus.ACTIVE,
          activatedAt: expect.any(Date),
          suspendedAt: null,
        },
      });

      expect(prisma.$transaction).toHaveBeenCalledWith([
        {
          operation: 'enable-profile',
        },
        {
          operation: 'activate-program',
        },
      ]);

      expect(result.status).toBe(PopulationProgramStatus.ACTIVE);
    });

    it('réactive un programme SUSPENDED sans remplacer sa première date d’activation', async () => {
      const firstActivatedAt = new Date('2026-09-01T12:00:00Z');

      const suspendedProgram = {
        ...readyProgram,
        status: PopulationProgramStatus.SUSPENDED,
        activatedAt: firstActivatedAt,
        suspendedAt: new Date('2026-09-10T12:00:00Z'),
      };

      prisma.rueFacilityProfile.findUnique.mockResolvedValue({
        id: 'profile-1',
        buildingId: 'building-1',
        assessmentStatus: RueAssessmentStatus.CONFIRMED_SUBJECT,
        populationEnabled: false,
        populationProgram: suspendedProgram,
      });

      prisma.populationProgram.findUnique.mockResolvedValue(suspendedProgram);

      await service.activateProgram('building-1');

      expect(prisma.populationProgram.update).toHaveBeenCalledWith({
        where: {
          id: 'program-1',
        },
        data: {
          status: PopulationProgramStatus.ACTIVE,
          activatedAt: firstActivatedAt,
          suspendedAt: null,
        },
      });
    });

    it('est idempotent lorsque le programme est déjà ACTIVE et Population activé', async () => {
      const activeProgram = {
        ...readyProgram,
        status: PopulationProgramStatus.ACTIVE,
        activatedAt: new Date('2026-09-01T12:00:00Z'),
      };

      prisma.rueFacilityProfile.findUnique.mockResolvedValue({
        id: 'profile-1',
        buildingId: 'building-1',
        assessmentStatus: RueAssessmentStatus.CONFIRMED_SUBJECT,
        populationEnabled: true,
        populationProgram: activeProgram,
      });

      prisma.populationProgram.findUnique.mockResolvedValue(activeProgram);

      const result = await service.activateProgram('building-1');

      expect(result).toBe(activeProgram);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('répare atomiquement un état incohérent ACTIVE avec Population désactivé', async () => {
      const activeProgram = {
        ...readyProgram,
        status: PopulationProgramStatus.ACTIVE,
        activatedAt: new Date('2026-09-01T12:00:00Z'),
      };

      prisma.rueFacilityProfile.findUnique.mockResolvedValue({
        id: 'profile-1',
        buildingId: 'building-1',
        assessmentStatus: RueAssessmentStatus.CONFIRMED_SUBJECT,
        populationEnabled: false,
        populationProgram: activeProgram,
      });

      prisma.populationProgram.findUnique.mockResolvedValue(activeProgram);

      await service.activateProgram('building-1');

      expect(prisma.rueFacilityProfile.update).toHaveBeenCalledWith({
        where: {
          id: 'profile-1',
        },
        data: {
          populationEnabled: true,
        },
      });

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    });

    it.each([
      PopulationProgramStatus.NOT_CONFIGURED,
      PopulationProgramStatus.CONFIGURING,
      PopulationProgramStatus.ARCHIVED,
    ])('refuse l’activation depuis %s', async (status) => {
      const program = {
        ...readyProgram,
        status,
      };

      prisma.rueFacilityProfile.findUnique.mockResolvedValue({
        id: 'profile-1',
        buildingId: 'building-1',
        assessmentStatus: RueAssessmentStatus.CONFIRMED_SUBJECT,
        populationEnabled: false,
        populationProgram: program,
      });

      prisma.populationProgram.findUnique.mockResolvedValue(program);

      await expect(
        service.activateProgram('building-1'),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('refuse l’activation si les prérequis READY ne sont plus satisfaits', async () => {
      prisma.populationProgram.findUnique.mockResolvedValue({
        ...readyProgram,
        consentVersion: null,
      });

      await expect(
        service.activateProgram('building-1'),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(prisma.$transaction).not.toHaveBeenCalled();
    });
  });
    describe('suspendProgram', () => {
    const activeProgram = {
      id: 'program-1',
      rueFacilityProfileId: 'profile-1',
      status: PopulationProgramStatus.ACTIVE,
      activatedAt: new Date('2026-09-01T12:00:00Z'),
      suspendedAt: null,
    };

    beforeEach(() => {
      prisma.rueFacilityProfile.findUnique.mockResolvedValue({
        id: 'profile-1',
        buildingId: 'building-1',
        assessmentStatus: RueAssessmentStatus.CONFIRMED_SUBJECT,
        populationEnabled: true,
        populationProgram: activeProgram,
      });

      prisma.populationProgram.findUnique.mockResolvedValue(activeProgram);

      prisma.rueFacilityProfile.update.mockReturnValue({
        operation: 'disable-profile',
      });

      prisma.populationProgram.update.mockReturnValue({
        operation: 'suspend-program',
      });

      prisma.$transaction.mockResolvedValue([
        {
          id: 'profile-1',
          populationEnabled: false,
        },
        {
          ...activeProgram,
          status: PopulationProgramStatus.SUSPENDED,
          suspendedAt: new Date(),
        },
      ]);
    });

    it('suspend atomiquement un programme ACTIVE et désactive Population', async () => {
      const result = await service.suspendProgram('building-1');

      expect(prisma.rueFacilityProfile.update).toHaveBeenCalledWith({
        where: {
          id: 'profile-1',
        },
        data: {
          populationEnabled: false,
        },
      });

      expect(prisma.populationProgram.update).toHaveBeenCalledWith({
        where: {
          id: 'program-1',
        },
        data: {
          status: PopulationProgramStatus.SUSPENDED,
          suspendedAt: expect.any(Date),
        },
      });

      expect(prisma.$transaction).toHaveBeenCalledWith([
        {
          operation: 'disable-profile',
        },
        {
          operation: 'suspend-program',
        },
      ]);

      expect(result.status).toBe(PopulationProgramStatus.SUSPENDED);
    });

    it('est idempotent lorsque le programme est déjà SUSPENDED et Population désactivé', async () => {
      const suspendedProgram = {
        ...activeProgram,
        status: PopulationProgramStatus.SUSPENDED,
        suspendedAt: new Date('2026-09-10T12:00:00Z'),
      };

      prisma.rueFacilityProfile.findUnique.mockResolvedValue({
        id: 'profile-1',
        buildingId: 'building-1',
        assessmentStatus: RueAssessmentStatus.CONFIRMED_SUBJECT,
        populationEnabled: false,
        populationProgram: suspendedProgram,
      });

      prisma.populationProgram.findUnique.mockResolvedValue(suspendedProgram);

      const result = await service.suspendProgram('building-1');

      expect(result).toBe(suspendedProgram);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('répare atomiquement un état incohérent SUSPENDED avec Population activé', async () => {
      const suspendedAt = new Date('2026-09-10T12:00:00Z');

      const suspendedProgram = {
        ...activeProgram,
        status: PopulationProgramStatus.SUSPENDED,
        suspendedAt,
      };

      prisma.rueFacilityProfile.findUnique.mockResolvedValue({
        id: 'profile-1',
        buildingId: 'building-1',
        assessmentStatus: RueAssessmentStatus.CONFIRMED_SUBJECT,
        populationEnabled: true,
        populationProgram: suspendedProgram,
      });

      prisma.populationProgram.findUnique.mockResolvedValue(suspendedProgram);

      await service.suspendProgram('building-1');

      expect(prisma.rueFacilityProfile.update).toHaveBeenCalledWith({
        where: {
          id: 'profile-1',
        },
        data: {
          populationEnabled: false,
        },
      });

      expect(prisma.populationProgram.update).toHaveBeenCalledWith({
        where: {
          id: 'program-1',
        },
        data: {
          suspendedAt,
        },
      });

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    });

    it.each([
      PopulationProgramStatus.NOT_CONFIGURED,
      PopulationProgramStatus.CONFIGURING,
      PopulationProgramStatus.READY,
      PopulationProgramStatus.ARCHIVED,
    ])('refuse la suspension depuis %s', async (status) => {
      const program = {
        ...activeProgram,
        status,
      };

      prisma.rueFacilityProfile.findUnique.mockResolvedValue({
        id: 'profile-1',
        buildingId: 'building-1',
        assessmentStatus: RueAssessmentStatus.CONFIRMED_SUBJECT,
        populationEnabled: false,
        populationProgram: program,
      });

      prisma.populationProgram.findUnique.mockResolvedValue(program);

      await expect(
        service.suspendProgram('building-1'),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(prisma.$transaction).not.toHaveBeenCalled();
    });
  });
    describe('archiveProgram', () => {
    const activeProgram = {
      id: 'program-1',
      rueFacilityProfileId: 'profile-1',
      status: PopulationProgramStatus.ACTIVE,
      activatedAt: new Date('2026-09-01T12:00:00Z'),
      suspendedAt: null,
      archivedAt: null,
    };

    beforeEach(() => {
      prisma.rueFacilityProfile.findUnique.mockResolvedValue({
        id: 'profile-1',
        buildingId: 'building-1',
        assessmentStatus: RueAssessmentStatus.CONFIRMED_SUBJECT,
        populationEnabled: true,
        populationProgram: activeProgram,
      });

      prisma.populationProgram.findUnique.mockResolvedValue(activeProgram);

      prisma.rueFacilityProfile.update.mockReturnValue({
        operation: 'disable-profile',
      });

      prisma.populationProgram.update.mockReturnValue({
        operation: 'archive-program',
      });

      prisma.$transaction.mockResolvedValue([
        {
          id: 'profile-1',
          populationEnabled: false,
        },
        {
          ...activeProgram,
          status: PopulationProgramStatus.ARCHIVED,
          archivedAt: new Date(),
        },
      ]);
    });

    it('archive atomiquement un programme ACTIVE et désactive Population', async () => {
      const result = await service.archiveProgram('building-1');

      expect(prisma.rueFacilityProfile.update).toHaveBeenCalledWith({
        where: {
          id: 'profile-1',
        },
        data: {
          populationEnabled: false,
        },
      });

      expect(prisma.populationProgram.update).toHaveBeenCalledWith({
        where: {
          id: 'program-1',
        },
        data: {
          status: PopulationProgramStatus.ARCHIVED,
          archivedAt: expect.any(Date),
        },
      });

      expect(prisma.$transaction).toHaveBeenCalledWith([
        {
          operation: 'disable-profile',
        },
        {
          operation: 'archive-program',
        },
      ]);

      expect(result.status).toBe(PopulationProgramStatus.ARCHIVED);
    });

    it('archive un programme SUSPENDED', async () => {
      const suspendedProgram = {
        ...activeProgram,
        status: PopulationProgramStatus.SUSPENDED,
        suspendedAt: new Date('2026-09-10T12:00:00Z'),
      };

      prisma.rueFacilityProfile.findUnique.mockResolvedValue({
        id: 'profile-1',
        buildingId: 'building-1',
        assessmentStatus: RueAssessmentStatus.CONFIRMED_SUBJECT,
        populationEnabled: false,
        populationProgram: suspendedProgram,
      });

      prisma.populationProgram.findUnique.mockResolvedValue(suspendedProgram);

      await service.archiveProgram('building-1');

      expect(prisma.populationProgram.update).toHaveBeenCalledWith({
        where: {
          id: 'program-1',
        },
        data: {
          status: PopulationProgramStatus.ARCHIVED,
          archivedAt: expect.any(Date),
        },
      });

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    });

    it('est idempotent lorsque le programme est déjà ARCHIVED et Population désactivé', async () => {
      const archivedProgram = {
        ...activeProgram,
        status: PopulationProgramStatus.ARCHIVED,
        archivedAt: new Date('2026-09-15T12:00:00Z'),
      };

      prisma.rueFacilityProfile.findUnique.mockResolvedValue({
        id: 'profile-1',
        buildingId: 'building-1',
        assessmentStatus: RueAssessmentStatus.CONFIRMED_SUBJECT,
        populationEnabled: false,
        populationProgram: archivedProgram,
      });

      prisma.populationProgram.findUnique.mockResolvedValue(archivedProgram);

      const result = await service.archiveProgram('building-1');

      expect(result).toBe(archivedProgram);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('répare atomiquement un état incohérent ARCHIVED avec Population activé sans remplacer archivedAt', async () => {
      const archivedAt = new Date('2026-09-15T12:00:00Z');

      const archivedProgram = {
        ...activeProgram,
        status: PopulationProgramStatus.ARCHIVED,
        archivedAt,
      };

      prisma.rueFacilityProfile.findUnique.mockResolvedValue({
        id: 'profile-1',
        buildingId: 'building-1',
        assessmentStatus: RueAssessmentStatus.CONFIRMED_SUBJECT,
        populationEnabled: true,
        populationProgram: archivedProgram,
      });

      prisma.populationProgram.findUnique.mockResolvedValue(archivedProgram);

      await service.archiveProgram('building-1');

      expect(prisma.rueFacilityProfile.update).toHaveBeenCalledWith({
        where: {
          id: 'profile-1',
        },
        data: {
          populationEnabled: false,
        },
      });

      expect(prisma.populationProgram.update).toHaveBeenCalledWith({
        where: {
          id: 'program-1',
        },
        data: {
          archivedAt,
        },
      });

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    });

    it.each([
      PopulationProgramStatus.NOT_CONFIGURED,
      PopulationProgramStatus.CONFIGURING,
      PopulationProgramStatus.READY,
    ])('refuse l’archivage depuis %s', async (status) => {
      const program = {
        ...activeProgram,
        status,
      };

      prisma.rueFacilityProfile.findUnique.mockResolvedValue({
        id: 'profile-1',
        buildingId: 'building-1',
        assessmentStatus: RueAssessmentStatus.CONFIRMED_SUBJECT,
        populationEnabled: false,
        populationProgram: program,
      });

      prisma.populationProgram.findUnique.mockResolvedValue(program);

      await expect(
        service.archiveProgram('building-1'),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(prisma.$transaction).not.toHaveBeenCalled();
    });
  });

  describe('registerSubscriber', () => {
    const activePublicProgram = {
      id: 'program-1',
      status: PopulationProgramStatus.ACTIVE,
      registrationEnabled: true,
      smsEnabled: true,
      emailEnabled: true,
      consentVersion: '2026-09-v1',
      rueFacilityProfile: {
        assessmentStatus: RueAssessmentStatus.CONFIRMED_SUBJECT,
        populationEnabled: true,
      },
    };

    beforeEach(() => {
      prisma.populationProgram.findUnique.mockResolvedValue(
        activePublicProgram,
      );

      prisma.populationSubscriber.create.mockResolvedValue({
        id: 'subscriber-1',
        status: PopulationSubscriberStatus.PENDING_VERIFICATION,
        preferredLanguage: PopulationPreferredLanguage.FR,
        createdAt: new Date('2026-09-17T12:00:00Z'),
      });

      prisma.populationVerification.create.mockResolvedValue({
        id: 'verification-1',
      });

      prisma.$transaction.mockImplementation(
        async (callback: (tx: typeof prisma) => unknown) =>
          callback(prisma),
      );
    });

    it('crée une inscription SMS en attente de vérification et un OTP hashé', async () => {
      const result = await service.registerSubscriber(
        'sobeys-boucherville',
        {
          phone: '+14505551234',
          preferredLanguage: PopulationPreferredLanguage.FR,
          consentVersion: '2026-09-v1',
        },
      );

      expect(
        prisma.populationSubscriber.create,
      ).toHaveBeenCalledWith({
        data: {
          programId: 'program-1',
          phone: '+14505551234',
          email: null,
          preferredLanguage: PopulationPreferredLanguage.FR,
          status:
            PopulationSubscriberStatus.PENDING_VERIFICATION,
        },
        select: {
          id: true,
          status: true,
          preferredLanguage: true,
          createdAt: true,
        },
      });

      expect(
        prisma.populationVerification.create,
      ).toHaveBeenCalledWith({
        data: {
          subscriberId: 'subscriber-1',
          channel: PopulationVerificationChannel.SMS,
          codeHash: expect.stringMatching(/^[a-f0-9]{64}$/),
          expiresAt: expect.any(Date),
          maxAttempts: 5,
        },
      });

      const verificationCall =
        prisma.populationVerification.create.mock.calls[0][0];

      expect(
        verificationCall.data.codeHash,
      ).not.toMatch(/^\d{6}$/);

      expect(result.verificationRequired).toBe(true);
      expect(result.verificationChannel).toBe(
        PopulationVerificationChannel.SMS,
      );
    });

    it('crée une inscription EMAIL lorsque seul le courriel est fourni', async () => {
      await service.registerSubscriber(
        'sobeys-boucherville',
        {
          email: 'Citoyen@Example.com',
          preferredLanguage: PopulationPreferredLanguage.EN,
          consentVersion: '2026-09-v1',
        },
      );

      expect(
        prisma.populationSubscriber.create,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            programId: 'program-1',
            phone: null,
            email: 'citoyen@example.com',
            preferredLanguage: PopulationPreferredLanguage.EN,
          }),
        }),
      );

      expect(
        prisma.populationVerification.create,
      ).toHaveBeenCalledWith({
        data: expect.objectContaining({
          subscriberId: 'subscriber-1',
          channel: PopulationVerificationChannel.EMAIL,
          codeHash: expect.stringMatching(/^[a-f0-9]{64}$/),
          maxAttempts: 5,
        }),
      });
    });

    it('refuse un programme public inexistant', async () => {
      prisma.populationProgram.findUnique.mockResolvedValue(null);

      await expect(
        service.registerSubscriber(
          'programme-inexistant',
          {
            phone: '+14505551234',
            preferredLanguage: PopulationPreferredLanguage.FR,
            consentVersion: '2026-09-v1',
          },
        ),
      ).rejects.toBeInstanceOf(NotFoundException);

      expect(
        prisma.populationSubscriber.create,
      ).not.toHaveBeenCalled();
    });

    it('refuse un programme qui n’est pas ACTIVE', async () => {
      prisma.populationProgram.findUnique.mockResolvedValue({
        ...activePublicProgram,
        status: PopulationProgramStatus.SUSPENDED,
      });

      await expect(
        service.registerSubscriber(
          'sobeys-boucherville',
          {
            phone: '+14505551234',
            preferredLanguage: PopulationPreferredLanguage.FR,
            consentVersion: '2026-09-v1',
          },
        ),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('refuse les inscriptions lorsque registrationEnabled est false', async () => {
      prisma.populationProgram.findUnique.mockResolvedValue({
        ...activePublicProgram,
        registrationEnabled: false,
      });

      await expect(
        service.registerSubscriber(
          'sobeys-boucherville',
          {
            phone: '+14505551234',
            preferredLanguage: PopulationPreferredLanguage.FR,
            consentVersion: '2026-09-v1',
          },
        ),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(
        prisma.populationSubscriber.create,
      ).not.toHaveBeenCalled();
    });

    it('refuse une version de consentement périmée', async () => {
      await expect(
        service.registerSubscriber(
          'sobeys-boucherville',
          {
            phone: '+14505551234',
            preferredLanguage: PopulationPreferredLanguage.FR,
            consentVersion: 'ancienne-version',
          },
        ),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(
        prisma.populationSubscriber.create,
      ).not.toHaveBeenCalled();
    });

    it('refuse SMS lorsque le canal SMS du programme est désactivé', async () => {
      prisma.populationProgram.findUnique.mockResolvedValue({
        ...activePublicProgram,
        smsEnabled: false,
      });

      await expect(
        service.registerSubscriber(
          'sobeys-boucherville',
          {
            phone: '+14505551234',
            preferredLanguage: PopulationPreferredLanguage.FR,
            consentVersion: '2026-09-v1',
          },
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('refuse EMAIL lorsque le canal courriel du programme est désactivé', async () => {
      prisma.populationProgram.findUnique.mockResolvedValue({
        ...activePublicProgram,
        emailEnabled: false,
      });

      await expect(
        service.registerSubscriber(
          'sobeys-boucherville',
          {
            email: 'citoyen@example.com',
            preferredLanguage: PopulationPreferredLanguage.FR,
            consentVersion: '2026-09-v1',
          },
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('resendVerification', () => {
    const activePublicProgram = {
      id: 'program-1',
      status: PopulationProgramStatus.ACTIVE,
      smsEnabled: true,
      emailEnabled: true,
      rueFacilityProfile: {
        assessmentStatus:
          RueAssessmentStatus.CONFIRMED_SUBJECT,
        populationEnabled: true,
      },
    };

    const pendingSubscriber = {
      id: 'subscriber-1',
      status:
        PopulationSubscriberStatus.PENDING_VERIFICATION,
      phone: '+14505551234',
      email: 'citoyen@example.com',
    };

    beforeEach(() => {
      prisma.populationProgram.findUnique.mockResolvedValue(
        activePublicProgram,
      );

      prisma.populationSubscriber.findFirst.mockResolvedValue(
        pendingSubscriber,
      );

      prisma.populationVerification.findFirst.mockResolvedValue(
        null,
      );

      prisma.populationVerification.count.mockResolvedValue(0);

      prisma.populationVerification.create.mockResolvedValue({
        id: 'verification-new',
      });
    });

    it('crée un nouvel OTP SMS hashé', async () => {
      const result = await service.resendVerification(
        'sobeys-boucherville',
        'subscriber-1',
        {
          channel: PopulationVerificationChannel.SMS,
        },
      );

      expect(
        prisma.populationVerification.create,
      ).toHaveBeenCalledWith({
        data: {
          subscriberId: 'subscriber-1',
          channel: PopulationVerificationChannel.SMS,
          codeHash: expect.stringMatching(/^[a-f0-9]{64}$/),
          expiresAt: expect.any(Date),
          maxAttempts: 5,
        },
      });

      expect(result.verificationRequired).toBe(true);
      expect(result.verificationChannel).toBe(
        PopulationVerificationChannel.SMS,
      );
    });

    it('refuse un renvoi avant 60 secondes', async () => {
      prisma.populationVerification.findFirst.mockResolvedValue({
        createdAt: new Date(Date.now() - 30 * 1000),
      });

      await expect(
        service.resendVerification(
          'sobeys-boucherville',
          'subscriber-1',
          {
            channel: PopulationVerificationChannel.SMS,
          },
        ),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(
        prisma.populationVerification.create,
      ).not.toHaveBeenCalled();
    });

    it('refuse après 5 OTP sur 60 minutes', async () => {
      prisma.populationVerification.findFirst.mockResolvedValue({
        createdAt: new Date(Date.now() - 2 * 60 * 1000),
      });

      prisma.populationVerification.count.mockResolvedValue(5);

      await expect(
        service.resendVerification(
          'sobeys-boucherville',
          'subscriber-1',
          {
            channel: PopulationVerificationChannel.SMS,
          },
        ),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(
        prisma.populationVerification.create,
      ).not.toHaveBeenCalled();
    });

    it('refuse SMS si aucun téléphone n’est disponible', async () => {
      prisma.populationSubscriber.findFirst.mockResolvedValue({
        ...pendingSubscriber,
        phone: null,
      });

      await expect(
        service.resendVerification(
          'sobeys-boucherville',
          'subscriber-1',
          {
            channel: PopulationVerificationChannel.SMS,
          },
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('refuse EMAIL si aucun courriel n’est disponible', async () => {
      prisma.populationSubscriber.findFirst.mockResolvedValue({
        ...pendingSubscriber,
        email: null,
      });

      await expect(
        service.resendVerification(
          'sobeys-boucherville',
          'subscriber-1',
          {
            channel: PopulationVerificationChannel.EMAIL,
          },
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('refuse le renvoi pour un abonné déjà ACTIVE', async () => {
      prisma.populationSubscriber.findFirst.mockResolvedValue({
        ...pendingSubscriber,
        status: PopulationSubscriberStatus.ACTIVE,
      });

      await expect(
        service.resendVerification(
          'sobeys-boucherville',
          'subscriber-1',
          {
            channel: PopulationVerificationChannel.SMS,
          },
        ),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(
        prisma.populationVerification.create,
      ).not.toHaveBeenCalled();
    });

    it('refuse un subscriber appartenant à un autre programme', async () => {
      prisma.populationSubscriber.findFirst.mockResolvedValue(
        null,
      );

      await expect(
        service.resendVerification(
          'sobeys-boucherville',
          'subscriber-autre-programme',
          {
            channel: PopulationVerificationChannel.SMS,
          },
        ),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('verifySubscriber', () => {
    const activePublicProgram = {
      id: 'program-1',
      status: PopulationProgramStatus.ACTIVE,
      consentVersion: '2026-09-v1',
      rueFacilityProfile: {
        assessmentStatus: RueAssessmentStatus.CONFIRMED_SUBJECT,
        populationEnabled: true,
      },
    };

    const pendingSubscriber = {
      id: 'subscriber-1',
      programId: 'program-1',
      status: PopulationSubscriberStatus.PENDING_VERIFICATION,
      phone: '+14505551234',
      email: null,
      smsEnabled: false,
      emailEnabled: false,
      verifiedAt: null,
    };

    const validCode = '123456';

    const hashCode = (code: string) =>
      require('crypto')
        .createHmac(
          'sha256',
          'test-population-otp-secret-not-for-production',
        )
        .update(code)
        .digest('hex');

    const validVerification = {
      id: 'verification-1',
      subscriberId: 'subscriber-1',
      channel: PopulationVerificationChannel.SMS,
      codeHash: hashCode(validCode),
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      attemptCount: 0,
      maxAttempts: 5,
      verifiedAt: null,
      createdAt: new Date(),
    };

    beforeEach(() => {
      prisma.populationProgram.findUnique.mockResolvedValue(
        activePublicProgram,
      );

      prisma.populationSubscriber.findFirst.mockResolvedValue(
        pendingSubscriber,
      );

      prisma.populationVerification.findFirst.mockResolvedValue(
        validVerification,
      );

      prisma.populationVerification.update.mockResolvedValue({
        ...validVerification,
        verifiedAt: new Date(),
      });

      prisma.populationSubscriber.update.mockResolvedValue({
        ...pendingSubscriber,
        status: PopulationSubscriberStatus.ACTIVE,
        verifiedAt: new Date(),
        smsEnabled: true,
      });

      prisma.populationConsentEvent.create.mockResolvedValue({
        id: 'consent-event-1',
      });

      prisma.$transaction.mockImplementation(
        async (callback: (tx: typeof prisma) => unknown) =>
          callback(prisma),
      );
    });

    it('vérifie un OTP valide et active l’abonné SMS', async () => {
      const result = await service.verifySubscriber(
        'sobeys-boucherville',
        'subscriber-1',
        {
          channel: PopulationVerificationChannel.SMS,
          code: validCode,
        },
      );

      expect(
        prisma.populationVerification.update,
      ).toHaveBeenCalledWith({
        where: {
          id: 'verification-1',
        },
        data: {
          verifiedAt: expect.any(Date),
        },
      });

      expect(
        prisma.populationSubscriber.update,
      ).toHaveBeenCalledWith({
        where: {
          id: 'subscriber-1',
        },
        data: {
          status: PopulationSubscriberStatus.ACTIVE,
          verifiedAt: expect.any(Date),
          smsEnabled: true,
          emailEnabled: false,
        },
      });

      expect(
        prisma.populationConsentEvent.create,
      ).toHaveBeenCalledTimes(2);

      expect(
        prisma.populationConsentEvent.create,
      ).toHaveBeenNthCalledWith(
        1,
        {
          data: expect.objectContaining({
            programId: 'program-1',
            subscriberId: 'subscriber-1',
            type: PopulationConsentEventType.SUBSCRIBED,
            consentVersion: '2026-09-v1',
            smsEnabled: true,
            emailEnabled: false,
            source: 'PUBLIC_PORTAL',
          }),
        },
      );

      expect(
        prisma.populationConsentEvent.create,
      ).toHaveBeenNthCalledWith(
        2,
        {
          data: expect.objectContaining({
            type: PopulationConsentEventType.VERIFIED,
            consentVersion: '2026-09-v1',
          }),
        },
      );

      expect(result).toEqual({
        verified: true,
        status: PopulationSubscriberStatus.ACTIVE,
        accessToken: expect.any(String),
        accessTokenExpiresInSeconds: 1800,
      });

      expect(result.accessToken).toBeDefined();
      expect(result.accessToken!.split('.')).toHaveLength(2);
    });

    it('incrémente attemptCount lorsque le code est invalide', async () => {
      await expect(
        service.verifySubscriber(
          'sobeys-boucherville',
          'subscriber-1',
          {
            channel: PopulationVerificationChannel.SMS,
            code: '999999',
          },
        ),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(
        prisma.populationVerification.update,
      ).toHaveBeenCalledWith({
        where: {
          id: 'verification-1',
        },
        data: {
          attemptCount: {
            increment: 1,
          },
        },
      });

      expect(
        prisma.populationSubscriber.update,
      ).not.toHaveBeenCalled();

      expect(
        prisma.populationConsentEvent.create,
      ).not.toHaveBeenCalled();
    });

    it('refuse un OTP expiré', async () => {
      prisma.populationVerification.findFirst.mockResolvedValue({
        ...validVerification,
        expiresAt: new Date(Date.now() - 1000),
      });

      await expect(
        service.verifySubscriber(
          'sobeys-boucherville',
          'subscriber-1',
          {
            channel: PopulationVerificationChannel.SMS,
            code: validCode,
          },
        ),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(
        prisma.populationSubscriber.update,
      ).not.toHaveBeenCalled();
    });

    it('refuse lorsque le nombre maximal de tentatives est atteint', async () => {
      prisma.populationVerification.findFirst.mockResolvedValue({
        ...validVerification,
        attemptCount: 5,
        maxAttempts: 5,
      });

      await expect(
        service.verifySubscriber(
          'sobeys-boucherville',
          'subscriber-1',
          {
            channel: PopulationVerificationChannel.SMS,
            code: validCode,
          },
        ),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(
        prisma.populationSubscriber.update,
      ).not.toHaveBeenCalled();
    });

    it('refuse un subscriber qui n’appartient pas au programme public', async () => {
      prisma.populationSubscriber.findFirst.mockResolvedValue(null);

      await expect(
        service.verifySubscriber(
          'sobeys-boucherville',
          'subscriber-autre-programme',
          {
            channel: PopulationVerificationChannel.SMS,
            code: validCode,
          },
        ),
      ).rejects.toBeInstanceOf(NotFoundException);

      expect(
        prisma.populationVerification.findFirst,
      ).not.toHaveBeenCalled();
    });

    it('est idempotent lorsque l’abonné est déjà ACTIVE', async () => {
      prisma.populationSubscriber.findFirst.mockResolvedValue({
        ...pendingSubscriber,
        status: PopulationSubscriberStatus.ACTIVE,
        verifiedAt: new Date(),
        smsEnabled: true,
      });

      const result = await service.verifySubscriber(
        'sobeys-boucherville',
        'subscriber-1',
        {
          channel: PopulationVerificationChannel.SMS,
          code: validCode,
        },
      );

      expect(result).toEqual({
        verified: true,
        status: PopulationSubscriberStatus.ACTIVE,
        accessToken: expect.any(String),
        accessTokenExpiresInSeconds: 1800,
      });

      expect(
        prisma.populationVerification.findFirst,
      ).not.toHaveBeenCalled();

      expect(
        prisma.populationConsentEvent.create,
      ).not.toHaveBeenCalled();
    });

    it('refuse lorsqu’aucune vérification active n’existe', async () => {
      prisma.populationVerification.findFirst.mockResolvedValue(null);

      await expect(
        service.verifySubscriber(
          'sobeys-boucherville',
          'subscriber-1',
          {
            channel: PopulationVerificationChannel.SMS,
            code: validCode,
          },
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('verifySubscriber additional channel', () => {
    const validCode = '654321';

    const hashCode = (code: string) =>
      require('crypto')
        .createHmac(
          'sha256',
          'test-population-otp-secret-not-for-production',
        )
        .update(code)
        .digest('hex');

    beforeEach(() => {
      prisma.populationProgram.findUnique.mockResolvedValue({
        id: 'program-1',
        status: PopulationProgramStatus.ACTIVE,
        consentVersion: '2026-09-v1',
        rueFacilityProfile: {
          assessmentStatus:
            RueAssessmentStatus.CONFIRMED_SUBJECT,
          populationEnabled: true,
        },
      });

      prisma.populationSubscriber.findFirst.mockResolvedValue({
        id: 'subscriber-1',
        programId: 'program-1',
        status: PopulationSubscriberStatus.ACTIVE,
        phone: '+14505551234',
        email: 'citoyen@example.com',
        smsEnabled: true,
        emailEnabled: false,
        verifiedAt: new Date('2026-09-17T12:00:00Z'),
      });

      prisma.populationVerification.findFirst.mockResolvedValue({
        id: 'verification-email-1',
        subscriberId: 'subscriber-1',
        channel: PopulationVerificationChannel.EMAIL,
        codeHash: hashCode(validCode),
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        attemptCount: 0,
        maxAttempts: 5,
        verifiedAt: null,
        createdAt: new Date(),
      });

      prisma.populationVerification.update.mockResolvedValue({
        id: 'verification-email-1',
      });

      prisma.populationSubscriber.update.mockResolvedValue({
        id: 'subscriber-1',
      });

      prisma.populationConsentEvent.create.mockResolvedValue({
        id: 'consent-event-1',
      });

      prisma.$transaction.mockImplementation(
        async (callback: (tx: typeof prisma) => unknown) =>
          callback(prisma),
      );
    });

    it('active EMAIL sans désactiver SMS', async () => {
      const result = await service.verifySubscriber(
        'sobeys-boucherville',
        'subscriber-1',
        {
          channel: PopulationVerificationChannel.EMAIL,
          code: validCode,
        },
      );

      expect(
        prisma.populationSubscriber.update,
      ).toHaveBeenCalledWith({
        where: {
          id: 'subscriber-1',
        },
        data: {
          status: PopulationSubscriberStatus.ACTIVE,
          verifiedAt: new Date('2026-09-17T12:00:00Z'),
          smsEnabled: true,
          emailEnabled: true,
        },
      });

      expect(
        prisma.populationConsentEvent.create,
      ).toHaveBeenNthCalledWith(
        1,
        {
          data: expect.objectContaining({
            type:
              PopulationConsentEventType.CONSENT_UPDATED,
            smsEnabled: true,
            emailEnabled: true,
          }),
        },
      );

      expect(
        prisma.populationConsentEvent.create,
      ).toHaveBeenNthCalledWith(
        2,
        {
          data: expect.objectContaining({
            type: PopulationConsentEventType.VERIFIED,
            smsEnabled: true,
            emailEnabled: true,
          }),
        },
      );

      expect(result).toEqual({
        verified: true,
        status: PopulationSubscriberStatus.ACTIVE,
        accessToken: expect.any(String),
        accessTokenExpiresInSeconds: 1800,
      });
    });

    it('ne revérifie pas un canal SMS déjà actif', async () => {
      const result = await service.verifySubscriber(
        'sobeys-boucherville',
        'subscriber-1',
        {
          channel: PopulationVerificationChannel.SMS,
          code: '000000',
        },
      );

      expect(result).toEqual({
        verified: true,
        status: PopulationSubscriberStatus.ACTIVE,
        accessToken: expect.any(String),
        accessTokenExpiresInSeconds: 1800,
      });

      expect(
        prisma.populationVerification.findFirst,
      ).not.toHaveBeenCalled();

      expect(
        prisma.populationConsentEvent.create,
      ).not.toHaveBeenCalled();
    });
  });

  describe('getScenarioPopulationPreview', () => {
    const activeProfile = {
      id: 'profile-1',
      buildingId: 'building-1',
      assessmentStatus:
        RueAssessmentStatus.CONFIRMED_SUBJECT,
      populationEnabled: true,
      populationProgram: {
        id: 'program-1',
        status: PopulationProgramStatus.ACTIVE,
      },
    };

    const scenario = {
      id: 'scenario-1',
      nameFR: 'Rejet accidentel d’ammoniac',
      nameEN: 'Accidental ammonia release',
      impactZones: [
        {
          id: 'zone-a',
          code: 'A',
          nameFR: 'Zone immédiate',
          nameEN: 'Immediate zone',
          geometry: {
            type: 'Polygon',
            coordinates: [],
          },
          maxDistanceKm: null,
          protectiveAction: 'SHELTER_IN_PLACE',
          instructionFR: 'Mettez-vous à l’abri.',
          instructionEN: 'Shelter in place.',
        },
        {
          id: 'zone-b',
          code: 'B',
          nameFR: 'Zone étendue',
          nameEN: 'Extended zone',
          geometry: null,
          maxDistanceKm: 5,
          protectiveAction: 'SHELTER_IN_PLACE',
          instructionFR: 'Mettez-vous à l’abri.',
          instructionEN: 'Shelter in place.',
        },
      ],
    };

    const subscribers = [
      {
        id: 'subscriber-1',
        latitude: 45.50,
        longitude: -73.50,
        smsEnabled: true,
        emailEnabled: true,
      },
      {
        id: 'subscriber-2',
        latitude: 45.51,
        longitude: -73.51,
        smsEnabled: true,
        emailEnabled: false,
      },
      {
        id: 'subscriber-3',
        latitude: 45.52,
        longitude: -73.52,
        smsEnabled: false,
        emailEnabled: true,
      },
      {
        id: 'subscriber-4',
        latitude: null,
        longitude: null,
        smsEnabled: true,
        emailEnabled: true,
      },
    ];

    beforeEach(() => {
      prisma.rueFacilityProfile.findUnique.mockResolvedValue(
        activeProfile,
      );

      prisma.building.findUnique.mockResolvedValue({
        id: 'building-1',
        latitude: 45.50,
        longitude: -73.50,
      });

      prisma.rueEmergencyScenario.findFirst.mockResolvedValue(
        scenario,
      );

      prisma.populationSubscriber.findMany.mockResolvedValue(
        subscribers,
      );

      populationGeospatialService.isPointInsideImpactZone
        .mockImplementation(
          ({
            latitude,
            geometry,
          }: {
            latitude: number;
            geometry: unknown;
          }) => {
            /*
             * subscriber-1 :
             *   Zone A + Zone B
             *
             * subscriber-2 :
             *   Zone B seulement
             *
             * subscriber-3 :
             *   hors zones
             */
            if (latitude === 45.50) {
              return true;
            }

            if (
              latitude === 45.51 &&
              geometry === null
            ) {
              return true;
            }

            return false;
          },
        );
    });

    it('calcule les agrégats par zone et déduplique les citoyens présents dans plusieurs zones', async () => {
      const result =
        await service.getScenarioPopulationPreview(
          'building-1',
          'scenario-1',
        );

      expect(result.population).toEqual({
        activeSubscriberCount: 4,
        geolocatedSubscriberCount: 3,
        unlocatedSubscriberCount: 1,
        uniqueTargetCount: 2,
        uniqueSmsTargetCount: 2,
        uniqueEmailTargetCount: 1,
      });

      expect(result.zones).toEqual([
        {
          id: 'zone-a',
          code: 'A',
          nameFR: 'Zone immédiate',
          nameEN: 'Immediate zone',
          geometry: {
            type: 'Polygon',
            coordinates: [],
          },
          maxDistanceKm: null,
          protectiveAction: 'SHELTER_IN_PLACE',
          instructionFR: 'Mettez-vous à l’abri.',
          instructionEN: 'Shelter in place.',
          targetCount: 1,
          smsTargetCount: 1,
          emailTargetCount: 1,
        },
        {
          id: 'zone-b',
          code: 'B',
          nameFR: 'Zone étendue',
          nameEN: 'Extended zone',
          geometry: null,
          maxDistanceKm: 5,
          protectiveAction: 'SHELTER_IN_PLACE',
          instructionFR: 'Mettez-vous à l’abri.',
          instructionEN: 'Shelter in place.',
          targetCount: 2,
          smsTargetCount: 2,
          emailTargetCount: 1,
        },
      ]);

      /*
       * subscriber-1 est présent dans A et B,
       * mais ne compte qu'une seule fois dans uniqueTargetCount.
       */
      expect(result.population.uniqueTargetCount).toBe(2);
    });

    it('ne transmet au moteur spatial que les abonnés géolocalisés', async () => {
      await service.getScenarioPopulationPreview(
        'building-1',
        'scenario-1',
      );

      expect(
        populationGeospatialService
          .isPointInsideImpactZone,
      ).toHaveBeenCalledTimes(6);

      const calls =
        populationGeospatialService
          .isPointInsideImpactZone.mock.calls;

      expect(
        calls.some(
          ([argument]) =>
            argument.latitude === null ||
            argument.longitude === null,
        ),
      ).toBe(false);
    });

    it('utilise les coordonnées du bâtiment comme référence des zones radiales', async () => {
      await service.getScenarioPopulationPreview(
        'building-1',
        'scenario-1',
      );

      expect(
        populationGeospatialService
          .isPointInsideImpactZone,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          referenceLatitude: 45.50,
          referenceLongitude: -73.50,
        }),
      );
    });

        it('retourne le point du bâtiment sans exposer de donnée individuelle d’abonné', async () => {
      const result =
        await service.getScenarioPopulationPreview(
          'building-1',
          'scenario-1',
        );

      const serialized = JSON.stringify(result);

      expect(result.building).toEqual(
        expect.objectContaining({
          id: 'building-1',
          latitude: 45.50,
          longitude: -73.50,
        }),
      );

      expect(serialized).not.toContain(
        'subscriber-1',
      );

      expect(serialized).not.toContain(
        'subscriber-2',
      );

      expect(serialized).not.toContain(
        'subscriber-3',
      );

      expect(serialized).not.toContain(
        '"phone"',
      );

      expect(serialized).not.toContain(
        '"email"',
      );
    });

    it('demande uniquement les abonnés ACTIVE du programme concerné', async () => {
      await service.getScenarioPopulationPreview(
        'building-1',
        'scenario-1',
      );

      expect(
        prisma.populationSubscriber.findMany,
      ).toHaveBeenCalledWith({
        where: {
          programId: 'program-1',
          status: PopulationSubscriberStatus.ACTIVE,
        },
        select: {
          id: true,
          latitude: true,
          longitude: true,
          smsEnabled: true,
          emailEnabled: true,
        },
      });
    });

    it('refuse un scénario qui n’appartient pas au profil RUE du bâtiment', async () => {
      prisma.rueEmergencyScenario.findFirst.mockResolvedValue(
        null,
      );

      await expect(
        service.getScenarioPopulationPreview(
          'building-1',
          'scenario-autre-site',
        ),
      ).rejects.toBeInstanceOf(NotFoundException);

      expect(
        prisma.rueEmergencyScenario.findFirst,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: 'scenario-autre-site',
            facilityProfileId: 'profile-1',
            isActive: true,
          }),
        }),
      );

      expect(
        prisma.populationSubscriber.findMany,
      ).not.toHaveBeenCalled();
    });

    it('refuse le calcul lorsque Sentinelle Population n’est pas opérationnel', async () => {
      prisma.rueFacilityProfile.findUnique.mockResolvedValue({
        ...activeProfile,
        populationEnabled: false,
      });

      await expect(
        service.getScenarioPopulationPreview(
          'building-1',
          'scenario-1',
        ),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(
        prisma.building.findUnique,
      ).not.toHaveBeenCalled();

      expect(
        prisma.rueEmergencyScenario.findFirst,
      ).not.toHaveBeenCalled();

      expect(
        prisma.populationSubscriber.findMany,
      ).not.toHaveBeenCalled();
    });

        it('refuse un bÃ¢timent introuvable aprÃ¨s validation du profil opÃ©rationnel', async () => {
      prisma.building.findUnique.mockResolvedValue(null);

      await expect(
        service.getScenarioPopulationPreview(
          'building-1',
          'scenario-1',
        ),
      ).rejects.toBeInstanceOf(NotFoundException);

      expect(
        prisma.rueEmergencyScenario.findFirst,
      ).not.toHaveBeenCalled();
    });
  });

  describe('getAvailableScenarios', () => {
    const eligibleProfile = {
      id: 'profile-1',
      buildingId: 'building-1',
      assessmentStatus:
        RueAssessmentStatus.CONFIRMED_SUBJECT,
      populationEnabled: false,
      populationProgram: {
        id: 'program-1',
        status: PopulationProgramStatus.CONFIGURING,
      },
    };

    beforeEach(() => {
      prisma.rueFacilityProfile.findUnique.mockResolvedValue(
        eligibleProfile,
      );

      prisma.rueEmergencyScenario.findMany.mockResolvedValue([
        {
          id: 'scenario-1',
          nameFR: 'Rejet accidentel d’ammoniac',
          nameEN: 'Accidental ammonia release',
          description:
            'Rejet accidentel pouvant affecter le voisinage.',
          type: 'TOXIC_RELEASE',
          eventType: 'Fuite',
          impactDistanceKm: 1.5,
          impactMethod: 'Étude de conséquences',
          defaultProtectiveAction: 'SHELTER_IN_PLACE',
          publicInstructionFR: 'Mettez-vous à l’abri.',
          publicInstructionEN: 'Shelter in place.',
          validatedAt: new Date('2026-09-01T12:00:00.000Z'),
          impactZones: [
            {
              id: 'zone-a',
              code: 'A',
              nameFR: 'Zone immédiate',
              nameEN: 'Immediate zone',
              protectiveAction: 'SHELTER_IN_PLACE',
              instructionFR: 'Mettez-vous à l’abri.',
              instructionEN: 'Shelter in place.',
              validatedAt: new Date(
                '2026-09-01T12:00:00.000Z',
              ),
              geometry: {
                type: 'Polygon',
                coordinates: [],
              },
              maxDistanceKm: null,
            },
            {
              id: 'zone-b',
              code: 'B',
              nameFR: 'Zone étendue',
              nameEN: 'Extended zone',
              protectiveAction: 'SHELTER_IN_PLACE',
              instructionFR: 'Restez à l’intérieur.',
              instructionEN: 'Remain indoors.',
              validatedAt: null,
              geometry: null,
              maxDistanceKm: 1.5,
            },
          ],
        },
      ]);
    });

    it('retourne les scénarios RUE actifs sans exiger un programme Population opérationnel', async () => {
      const result =
        await service.getAvailableScenarios('building-1');

      expect(
        prisma.rueEmergencyScenario.findMany,
      ).toHaveBeenCalledWith({
        where: {
          facilityProfileId: 'profile-1',
          isActive: true,
        },
        orderBy: [
          {
            nameFR: 'asc',
          },
          {
            id: 'asc',
          },
        ],
        select: expect.any(Object),
      });

      expect(result.scenarios).toHaveLength(1);

      expect(result.scenarios[0]).toEqual(
        expect.objectContaining({
          id: 'scenario-1',
          nameFR: 'Rejet accidentel d’ammoniac',
          type: 'TOXIC_RELEASE',
          eventType: 'Fuite',
          operational: true,
        }),
      );
    });

    it('calcule séparément l’état opérationnel des zones', async () => {
      const result =
        await service.getAvailableScenarios('building-1');

      expect(result.scenarios[0].impactZones).toEqual([
        expect.objectContaining({
          id: 'zone-a',
          code: 'A',
          hasGeometry: true,
          operational: true,
        }),
        expect.objectContaining({
          id: 'zone-b',
          code: 'B',
          hasGeometry: false,
          maxDistanceKm: 1.5,
          operational: false,
        }),
      ]);
    });

    it('ne retourne pas la géométrie brute des zones', async () => {
      const result =
        await service.getAvailableScenarios('building-1');

      const serialized = JSON.stringify(result);

      expect(serialized).not.toContain('"geometry"');
      expect(serialized).not.toContain('"coordinates"');
    });

    it('refuse la lecture lorsque le site n’est pas admissible au RUE', async () => {
      prisma.rueFacilityProfile.findUnique.mockResolvedValue({
        ...eligibleProfile,
        assessmentStatus:
          RueAssessmentStatus.CONFIRMED_NOT_SUBJECT,
      });

      await expect(
        service.getAvailableScenarios('building-1'),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(
        prisma.rueEmergencyScenario.findMany,
      ).not.toHaveBeenCalled();
    });
  });

  describe('createAlertDraft', () => {
    const activeProfile = {
      id: 'profile-1',
      buildingId: 'building-1',
      assessmentStatus:
        RueAssessmentStatus.CONFIRMED_SUBJECT,
      populationEnabled: true,
      populationProgram: {
        id: 'program-1',
        status: PopulationProgramStatus.ACTIVE,
      },
    };

    const building = {
      id: 'building-1',
      name: 'Installation Boucherville',
      address: '1234 rue Industrielle',
      city: 'Boucherville',
      province: 'QC',
      latitude: 45.5,
      longitude: -73.5,
    };

    const scenario = {
      id: 'scenario-1',
      nameFR: 'Rejet accidentel d’ammoniac',
      nameEN: 'Accidental ammonia release',
      impactZones: [
        {
          id: 'zone-a',
          code: 'A',
          nameFR: 'Zone immédiate',
          nameEN: 'Immediate zone',
          geometry: {
            type: 'Polygon',
            coordinates: [],
          },
          maxDistanceKm: null,
          protectiveAction: 'SHELTER_IN_PLACE',
          instructionFR: 'Mettez-vous à l’abri.',
          instructionEN: 'Shelter in place.',
        },
        {
          id: 'zone-b',
          code: 'B',
          nameFR: 'Zone étendue',
          nameEN: 'Extended zone',
          geometry: null,
          maxDistanceKm: 5,
          protectiveAction: 'SHELTER_IN_PLACE',
          instructionFR: 'Mettez-vous à l’abri.',
          instructionEN: 'Shelter in place.',
        },
      ],
    };

    const subscribers = [
      {
        id: 'subscriber-1',
        latitude: 45.5,
        longitude: -73.5,
        smsEnabled: true,
        emailEnabled: true,
      },
      {
        id: 'subscriber-2',
        latitude: 45.51,
        longitude: -73.51,
        smsEnabled: true,
        emailEnabled: false,
      },
      {
        id: 'subscriber-3',
        latitude: 45.52,
        longitude: -73.52,
        smsEnabled: false,
        emailEnabled: true,
      },
      {
        id: 'subscriber-unlocated',
        latitude: null,
        longitude: null,
        smsEnabled: true,
        emailEnabled: true,
      },
    ];

    const dto = {
      scenarioId: 'scenario-1',
      type: PopulationAlertType.EMERGENCY,
      titleFR: '  Alerte ammoniac  ',
      titleEN: '  Ammonia alert  ',
      messageFR:
        '  Un rejet accidentel est en cours.  ',
      messageEN:
        '  An accidental release is underway.  ',
      instructionFR:
        '  Mettez-vous immédiatement à l’abri.  ',
      instructionEN:
        '  Shelter in place immediately.  ',
    };

    const actor = {
      type: 'CLIENT_USER',
      id: 'client-user-1',
    };

    beforeEach(() => {
      prisma.rueFacilityProfile.findUnique.mockResolvedValue(
        activeProfile,
      );

      prisma.building.findUnique.mockResolvedValue(
        building,
      );

      prisma.rueEmergencyScenario.findFirst.mockResolvedValue(
        scenario,
      );

      prisma.populationSubscriber.findMany.mockResolvedValue(
        subscribers,
      );

      populationGeospatialService.isPointInsideImpactZone
        .mockImplementation(
          ({
            latitude,
            geometry,
          }: {
            latitude: number;
            geometry: unknown;
          }) => {
            // subscriber-1 appartient aux zones A et B.
            if (latitude === 45.5) {
              return true;
            }

            // subscriber-2 appartient uniquement à la zone B.
            if (
              latitude === 45.51 &&
              geometry === null
            ) {
              return true;
            }

            return false;
          },
        );

      prisma.populationAlert.create.mockResolvedValue({
        id: 'alert-1',
        programId: 'program-1',
        emergencyScenarioId: 'scenario-1',
        type: PopulationAlertType.EMERGENCY,
        status: PopulationAlertStatus.DRAFT,
      });

      prisma.populationAlertZone.createMany.mockResolvedValue({
        count: 2,
      });

      prisma.populationAlert.findUnique.mockResolvedValue({
        id: 'alert-1',
        programId: 'program-1',
        emergencyScenarioId: 'scenario-1',
        type: PopulationAlertType.EMERGENCY,
        status: PopulationAlertStatus.DRAFT,
        zones: [
          {
            zoneCodeSnapshot: 'A',
            targetedSubscriberCount: 1,
          },
          {
            zoneCodeSnapshot: 'B',
            targetedSubscriberCount: 2,
          },
        ],
      });

      prisma.$transaction.mockImplementation(
        async (callback: (tx: typeof prisma) => unknown) =>
          callback(prisma),
      );
    });

    it('crée un brouillon DRAFT avec le scénario et le créateur fournis côté serveur', async () => {
      const result = await service.createAlertDraft(
        'building-1',
        dto,
        actor,
      );

      expect(
        prisma.populationAlert.create,
      ).toHaveBeenCalledWith({
        data: expect.objectContaining({
          programId: 'program-1',
          emergencyScenarioId: 'scenario-1',

          type: PopulationAlertType.EMERGENCY,
          status: PopulationAlertStatus.DRAFT,

          titleFR: 'Alerte ammoniac',
          titleEN: 'Ammonia alert',

          messageFR:
            'Un rejet accidentel est en cours.',
          messageEN:
            'An accidental release is underway.',

          instructionFR:
            'Mettez-vous immédiatement à l’abri.',
          instructionEN:
            'Shelter in place immediately.',

          createdByType: 'CLIENT_USER',
          createdById: 'client-user-1',

          contextSnapshot: expect.any(Object),
        }),
      });

      expect(result).toEqual(
        expect.objectContaining({
          id: 'alert-1',
          status: PopulationAlertStatus.DRAFT,
        }),
      );
    });

    it('refuse UPDATE par la création générique même sans incidentEventId', async () => {
      await expect(
        service.createAlertDraft(
          'building-1',
          {
            ...dto,
            type: PopulationAlertType.UPDATE,
          },
          actor,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(
        prisma.populationAlert.create,
      ).not.toHaveBeenCalled();
    });

    it('refuse ALL_CLEAR par la création générique même sans incidentEventId', async () => {
      await expect(
        service.createAlertDraft(
          'building-1',
          {
            ...dto,
            type: PopulationAlertType.ALL_CLEAR,
          },
          actor,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(
        prisma.populationAlert.create,
      ).not.toHaveBeenCalled();
    });

    it('snapshotte les zones et leurs populations sans créer de livraison', async () => {
      await service.createAlertDraft(
        'building-1',
        dto,
        actor,
      );

      expect(
        prisma.populationAlertZone.createMany,
      ).toHaveBeenCalledTimes(1);

      const zoneData =
        prisma.populationAlertZone.createMany.mock
          .calls[0][0].data;

      expect(zoneData).toHaveLength(2);

      expect(zoneData[0]).toEqual(
        expect.objectContaining({
          alertId: 'alert-1',
          impactZoneId: 'zone-a',
          zoneCodeSnapshot: 'A',
          zoneNameFRSnapshot: 'Zone immédiate',
          zoneNameENSnapshot: 'Immediate zone',
          geometrySnapshot: scenario.impactZones[0].geometry,
          protectiveActionSnapshot:
            'SHELTER_IN_PLACE',
          instructionFRSnapshot:
            'Mettez-vous à l’abri.',
          instructionENSnapshot:
            'Shelter in place.',
          targetedSubscriberCount: 1,
        }),
      );

      expect(zoneData[1]).toEqual(
        expect.objectContaining({
          alertId: 'alert-1',
          impactZoneId: 'zone-b',
          zoneCodeSnapshot: 'B',
          targetedSubscriberCount: 2,
        }),
      );

      expect(
        prisma.populationAlertDelivery.create,
      ).not.toHaveBeenCalled();

      expect(
        prisma.populationAlertDelivery.createMany,
      ).not.toHaveBeenCalled();
    });

    it('conserve dans contextSnapshot les agrégats dédupliqués calculés par le même moteur que le preview', async () => {
      await service.createAlertDraft(
        'building-1',
        dto,
        actor,
      );

      const alertCreateData =
        prisma.populationAlert.create.mock
          .calls[0][0].data;

      expect(
        alertCreateData.contextSnapshot.population,
      ).toEqual({
        activeSubscriberCount: 4,
        geolocatedSubscriberCount: 3,
        unlocatedSubscriberCount: 1,
        uniqueTargetCount: 2,
        uniqueSmsTargetCount: 2,
        uniqueEmailTargetCount: 1,
      });

      expect(
        alertCreateData.contextSnapshot.targeting,
      ).toEqual({
        zoneCount: 2,
        calculatedAt: expect.any(String),
      });
    });

    it('ne place aucune donnée citoyenne nominative dans contextSnapshot', async () => {
      await service.createAlertDraft(
        'building-1',
        dto,
        actor,
      );

      const snapshot =
        prisma.populationAlert.create.mock
          .calls[0][0].data.contextSnapshot;

      const serialized = JSON.stringify(snapshot);

      expect(serialized).not.toContain(
        'subscriber-1',
      );

      expect(serialized).not.toContain(
        'subscriber-2',
      );

      expect(serialized).not.toContain(
        'subscriber-unlocated',
      );

      expect(serialized).not.toContain(
        '+1450555',
      );

      expect(serialized).not.toContain(
        '@example',
      );

      expect(snapshot.building).toEqual({
        id: 'building-1',
        name: 'Installation Boucherville',
        address: '1234 rue Industrielle',
        city: 'Boucherville',
        province: 'QC',
        latitude: 45.5,
        longitude: -73.5,
      });
    });

    it('réutilise le ciblage géospatial et déduplique un citoyen présent dans plusieurs zones', async () => {
      await service.createAlertDraft(
        'building-1',
        dto,
        actor,
      );

      expect(
        populationGeospatialService
          .isPointInsideImpactZone,
      ).toHaveBeenCalledTimes(6);

      const snapshot =
        prisma.populationAlert.create.mock
          .calls[0][0].data.contextSnapshot;

      expect(
        snapshot.population.uniqueTargetCount,
      ).toBe(2);

      const zoneData =
        prisma.populationAlertZone.createMany.mock
          .calls[0][0].data;

      expect(
        zoneData.map(
          (zone: {
            zoneCodeSnapshot: string;
            targetedSubscriberCount: number;
          }) => ({
            code: zone.zoneCodeSnapshot,
            count: zone.targetedSubscriberCount,
          }),
        ),
      ).toEqual([
        {
          code: 'A',
          count: 1,
        },
        {
          code: 'B',
          count: 2,
        },
      ]);
    });

    it('refuse un titre ou un message français vide avant toute écriture d’alerte', async () => {
      await expect(
        service.createAlertDraft(
          'building-1',
          {
            ...dto,
            titleFR: '   ',
          },
          actor,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(
        prisma.populationAlert.create,
      ).not.toHaveBeenCalled();

      expect(
        prisma.populationAlertZone.createMany,
      ).not.toHaveBeenCalled();
    });

    it('refuse la création lorsque Population n’est pas opérationnel', async () => {
      prisma.rueFacilityProfile.findUnique.mockResolvedValue({
        ...activeProfile,
        populationEnabled: false,
      });

      await expect(
        service.createAlertDraft(
          'building-1',
          dto,
          actor,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(
        prisma.populationAlert.create,
      ).not.toHaveBeenCalled();

      expect(
        prisma.populationAlertZone.createMany,
      ).not.toHaveBeenCalled();
    });

    it('propage une erreur de création des zones dans la transaction', async () => {
      prisma.populationAlertZone.createMany.mockRejectedValue(
        new Error('zone snapshot failure'),
      );

      await expect(
        service.createAlertDraft(
          'building-1',
          dto,
          actor,
        ),
      ).rejects.toThrow('zone snapshot failure');

      expect(
        prisma.populationAlert.create,
      ).toHaveBeenCalledTimes(1);

      expect(
        prisma.populationAlert.findUnique,
      ).not.toHaveBeenCalled();
    });
  });

  describe('Population alert draft lifecycle', () => {
    const activeProfile = {
      id: 'profile-1',
      buildingId: 'building-1',
      assessmentStatus:
        RueAssessmentStatus.CONFIRMED_SUBJECT,
      populationEnabled: true,
      populationProgram: {
        id: 'program-1',
        status: PopulationProgramStatus.ACTIVE,
      },
    };

    const draftAlert = {
      id: 'alert-1',
      programId: 'program-1',
      emergencyScenarioId: 'scenario-1',
      type: PopulationAlertType.EMERGENCY,
      status: PopulationAlertStatus.DRAFT,
      titleFR: 'Alerte ammoniac',
      titleEN: 'Ammonia alert',
      messageFR: 'Un rejet accidentel est en cours.',
      messageEN: 'An accidental release is underway.',
      instructionFR: 'Mettez-vous à l’abri.',
      instructionEN: 'Shelter in place.',
      zones: [
        {
          id: 'alert-zone-1',
          zoneCodeSnapshot: 'A',
          targetedSubscriberCount: 1,
        },
      ],
    };

    beforeEach(() => {
      prisma.rueFacilityProfile.findUnique.mockResolvedValue(
        activeProfile,
      );

      prisma.populationAlert.findFirst.mockResolvedValue(
        draftAlert,
      );
    });

    it('retourne uniquement une alerte appartenant au programme du bâtiment', async () => {
      await expect(
        service.getAlert(
          'building-1',
          'alert-1',
        ),
      ).resolves.toEqual(draftAlert);

      expect(
        prisma.populationAlert.findFirst,
      ).toHaveBeenCalledWith({
        where: {
          id: 'alert-1',
          programId: 'program-1',
        },
        include: {
          zones: {
            orderBy: {
              zoneCodeSnapshot: 'asc',
            },
          },
        },
      });
    });

    it('retourne 404 lorsqu’une alerte ne correspond pas au programme du bâtiment', async () => {
      prisma.populationAlert.findFirst.mockResolvedValue(
        null,
      );

      await expect(
        service.getAlert(
          'building-1',
          'alert-other-program',
        ),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('modifie le contenu éditorial d’une alerte DRAFT', async () => {
      prisma.populationAlert.update.mockResolvedValue({
        ...draftAlert,
        titleFR: 'Nouveau titre',
        messageFR: 'Nouveau message',
        titleEN: null,
      });

      await service.updateAlertDraft(
        'building-1',
        'alert-1',
        {
          titleFR: '  Nouveau titre  ',
          messageFR: '  Nouveau message  ',
          titleEN: '   ',
        },
      );

      expect(
        prisma.populationAlert.update,
      ).toHaveBeenCalledWith({
        where: {
          id: 'alert-1',
        },
        data: {
          titleFR: 'Nouveau titre',
          titleEN: null,
          messageFR: 'Nouveau message',
        },
        include: {
          zones: {
            orderBy: {
              zoneCodeSnapshot: 'asc',
            },
          },
        },
      });
    });

    it('refuse de modifier le type d’une communication rattachée à un incident', async () => {
      prisma.populationAlert.findFirst.mockResolvedValue({
        ...draftAlert,
        incidentEventId: 'incident-1',
      });

      await expect(
        service.updateAlertDraft(
          'building-1',
          'alert-1',
          {
            type: PopulationAlertType.TEST,
          },
        ),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(
        prisma.populationAlert.update,
      ).not.toHaveBeenCalled();
    });

    it('refuse toute modification éditoriale après DRAFT', async () => {
      prisma.populationAlert.findFirst.mockResolvedValue({
        ...draftAlert,
        status: PopulationAlertStatus.READY,
      });

      await expect(
        service.updateAlertDraft(
          'building-1',
          'alert-1',
          {
            titleFR: 'Titre modifié',
          },
        ),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(
        prisma.populationAlert.update,
      ).not.toHaveBeenCalled();
    });

    it('refuse de vider le titre français d’un DRAFT', async () => {
      await expect(
        service.updateAlertDraft(
          'building-1',
          'alert-1',
          {
            titleFR: '   ',
          },
        ),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(
        prisma.populationAlert.update,
      ).not.toHaveBeenCalled();
    });

    it('retourne le DRAFT sans écriture lorsque aucune modification n’est fournie', async () => {
      await expect(
        service.updateAlertDraft(
          'building-1',
          'alert-1',
          {},
        ),
      ).resolves.toEqual(draftAlert);

      expect(
        prisma.populationAlert.update,
      ).not.toHaveBeenCalled();
    });
  });

  describe('Population incident communication lifecycle', () => {
    const activeProfile = {
      id: 'profile-1',
      buildingId: 'building-1',
      assessmentStatus:
        RueAssessmentStatus.CONFIRMED_SUBJECT,
      populationEnabled: true,
      populationProgram: {
        id: 'program-1',
        status: PopulationProgramStatus.ACTIVE,
      },
    };

    const building = {
      id: 'building-1',
      organizationId: 'organization-1',
      name: 'Installation Boucherville',
      address: '1234 rue Industrielle',
      city: 'Boucherville',
      province: 'QC',
      latitude: 45.5,
      longitude: -73.5,
    };

    const incident = {
      id: 'incident-1',
      buildingId: 'building-1',
      organizationId: 'organization-1',
    };

    const scenario = {
      id: 'scenario-1',
      nameFR: 'Rejet accidentel d’ammoniac',
      nameEN: 'Accidental ammonia release',
      impactZones: [
        {
          id: 'zone-a',
          code: 'A',
          nameFR: 'Zone immédiate',
          nameEN: 'Immediate zone',
          geometry: null,
          maxDistanceKm: 5,
          protectiveAction: 'SHELTER_IN_PLACE',
          instructionFR: 'Mettez-vous à l’abri.',
          instructionEN: 'Shelter in place.',
        },
      ],
    };

    const sourceAlert = {
      id: 'alert-emergency-1',
      programId: 'program-1',
      incidentEventId: 'incident-1',
      emergencyScenarioId: 'scenario-1',
      type: PopulationAlertType.EMERGENCY,
      status: PopulationAlertStatus.ACTIVE,
      titleFR: 'Alerte ammoniac',
      titleEN: 'Ammonia alert',
      messageFR: 'Un rejet est en cours.',
      messageEN: 'A release is underway.',
      instructionFR: 'Mettez-vous à l’abri.',
      instructionEN: 'Shelter in place.',
    };

    const actor = {
      type: 'CLIENT_USER',
      id: 'client-user-1',
    };

    const updateContent = {
      titleFR: '  Mise à jour de la situation  ',
      titleEN: '  Situation update  ',
      messageFR:
        '  Les équipes d’intervention sont sur place.  ',
      messageEN:
        '  Response teams are on site.  ',
      instructionFR:
        '  Maintenez la mise à l’abri.  ',
      instructionEN:
        '  Continue to shelter in place.  ',
    };

    beforeEach(() => {
      prisma.rueFacilityProfile.findUnique.mockResolvedValue(
        activeProfile,
      );

      prisma.building.findUnique.mockResolvedValue(
        building,
      );

      prisma.incidentEvent.findFirst.mockResolvedValue(
        incident,
      );

      prisma.rueEmergencyScenario.findFirst.mockResolvedValue(
        scenario,
      );

      prisma.populationSubscriber.findMany.mockResolvedValue([
        {
          id: 'subscriber-1',
          latitude: 45.5,
          longitude: -73.5,
          smsEnabled: true,
          emailEnabled: true,
        },
      ]);

      populationGeospatialService.isPointInsideImpactZone
        .mockReturnValue(true);

      prisma.populationAlertZone.createMany.mockResolvedValue({
        count: 1,
      });
    });

    it('retourne l’historique chronologique et uniquement des preuves de livraison sans PII', async () => {
      const history = [
        {
          id: 'alert-emergency-1',
          type: PopulationAlertType.EMERGENCY,
          status: PopulationAlertStatus.ACTIVE,
          zones: [],
          deliveries: [
            {
              id: 'delivery-1',
              channel: 'SMS',
              status: 'SENT',
              language: 'FR',
              queuedAt: new Date(),
              sentAt: new Date(),
              deliveredAt: null,
              failedAt: null,
              cancelledAt: null,
              provider: 'BREVO',
            },
          ],
        },
      ];

      prisma.populationAlert.findMany.mockResolvedValue(
        history,
      );

      await expect(
        service.getIncidentAlertHistory(
          'building-1',
          'incident-1',
        ),
      ).resolves.toEqual(history);

      expect(
        prisma.incidentEvent.findFirst,
      ).toHaveBeenCalledWith({
        where: {
          id: 'incident-1',
          buildingId: 'building-1',
          organizationId: 'organization-1',
        },
        select: {
          id: true,
          buildingId: true,
          organizationId: true,
        },
      });

      expect(
        prisma.populationAlert.findMany,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            programId: 'program-1',
            incidentEventId: 'incident-1',
          },
          orderBy: [
            {
              createdAt: 'asc',
            },
            {
              id: 'asc',
            },
          ],
        }),
      );

      const historyQuery =
        prisma.populationAlert.findMany.mock.calls[0][0];

      expect(
        historyQuery.include.deliveries.select,
      ).not.toHaveProperty('destinationSnapshot');

      expect(
        historyQuery.include.deliveries.select,
      ).not.toHaveProperty('subscriberId');
    });

    it('crée un UPDATE distinct avec son propre contenu et le même incident', async () => {
      prisma.populationAlert.findFirst.mockImplementation(
        async (args: any) => {
          if (
            args?.where?.type ===
            PopulationAlertType.ALL_CLEAR
          ) {
            return null;
          }

          return sourceAlert;
        },
      );

      prisma.populationAlert.create.mockResolvedValue({
        id: 'alert-update-1',
        programId: 'program-1',
        incidentEventId: 'incident-1',
        emergencyScenarioId: 'scenario-1',
        type: PopulationAlertType.UPDATE,
        status: PopulationAlertStatus.DRAFT,
      });

      prisma.populationAlert.findUnique.mockResolvedValue({
        id: 'alert-update-1',
        programId: 'program-1',
        incidentEventId: 'incident-1',
        emergencyScenarioId: 'scenario-1',
        type: PopulationAlertType.UPDATE,
        status: PopulationAlertStatus.DRAFT,
        zones: [],
      });

      await service.createIncidentFollowUpDraft(
        'building-1',
        'incident-1',
        'alert-emergency-1',
        PopulationAlertType.UPDATE,
        updateContent,
        actor,
      );

      expect(
        prisma.populationAlert.create,
      ).toHaveBeenCalledWith({
        data: expect.objectContaining({
          programId: 'program-1',
          incidentEventId: 'incident-1',
          emergencyScenarioId: 'scenario-1',

          type: PopulationAlertType.UPDATE,
          status: PopulationAlertStatus.DRAFT,

          titleFR: 'Mise à jour de la situation',
          titleEN: 'Situation update',

          messageFR:
            'Les équipes d’intervention sont sur place.',
          messageEN:
            'Response teams are on site.',

          instructionFR:
            'Maintenez la mise à l’abri.',
          instructionEN:
            'Continue to shelter in place.',

          createdByType: 'CLIENT_USER',
          createdById: 'client-user-1',

          contextSnapshot: expect.any(Object),
        }),
      });

      expect(
        prisma.populationAlertZone.createMany,
      ).toHaveBeenCalledTimes(1);
    });

    it('crée un ALL_CLEAR distinct avec son propre contenu', async () => {
      prisma.populationAlert.findFirst.mockImplementation(
        async (args: any) => {
          if (
            args?.where?.type ===
            PopulationAlertType.ALL_CLEAR
          ) {
            return null;
          }

          return sourceAlert;
        },
      );

      prisma.populationAlert.create.mockResolvedValue({
        id: 'alert-all-clear-1',
        programId: 'program-1',
        incidentEventId: 'incident-1',
        emergencyScenarioId: 'scenario-1',
        type: PopulationAlertType.ALL_CLEAR,
        status: PopulationAlertStatus.DRAFT,
      });

      prisma.populationAlert.findUnique.mockResolvedValue({
        id: 'alert-all-clear-1',
        programId: 'program-1',
        incidentEventId: 'incident-1',
        emergencyScenarioId: 'scenario-1',
        type: PopulationAlertType.ALL_CLEAR,
        status: PopulationAlertStatus.DRAFT,
        zones: [],
      });

      await service.createIncidentFollowUpDraft(
        'building-1',
        'incident-1',
        'alert-emergency-1',
        PopulationAlertType.ALL_CLEAR,
        {
          titleFR: '  Fin de l’alerte  ',
          titleEN: '  All clear  ',
          messageFR:
            '  La situation est maintenant maîtrisée.  ',
          messageEN:
            '  The situation is now under control.  ',
          instructionFR:
            '  La consigne de mise à l’abri est levée.  ',
          instructionEN:
            '  The shelter-in-place instruction is lifted.  ',
        },
        actor,
      );

      expect(
        prisma.populationAlert.create,
      ).toHaveBeenCalledWith({
        data: expect.objectContaining({
          incidentEventId: 'incident-1',
          emergencyScenarioId: 'scenario-1',
          type: PopulationAlertType.ALL_CLEAR,

          titleFR: 'Fin de l’alerte',
          titleEN: 'All clear',

          messageFR:
            'La situation est maintenant maîtrisée.',
          messageEN:
            'The situation is now under control.',

          instructionFR:
            'La consigne de mise à l’abri est levée.',
          instructionEN:
            'The shelter-in-place instruction is lifted.',
        }),
      });
    });

    it('refuse un deuxième ALL_CLEAR pour le même incident', async () => {
      prisma.populationAlert.findFirst.mockImplementation(
        async (args: any) => {
          if (
            args?.where?.type ===
            PopulationAlertType.ALL_CLEAR
          ) {
            return {
              id: 'existing-all-clear',
              status: PopulationAlertStatus.DRAFT,
            };
          }

          return sourceAlert;
        },
      );

      await expect(
        service.createIncidentFollowUpDraft(
          'building-1',
          'incident-1',
          'alert-emergency-1',
          PopulationAlertType.ALL_CLEAR,
          {
            titleFR: 'Fin de l’alerte',
            messageFR: 'La situation est maîtrisée.',
          },
          actor,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(
        prisma.populationAlert.create,
      ).not.toHaveBeenCalled();
    });

    it('refuse un UPDATE dès qu’un ALL_CLEAR existe, même encore DRAFT', async () => {
      prisma.populationAlert.findFirst.mockImplementation(
        async (args: any) => {
          if (
            args?.where?.type ===
            PopulationAlertType.ALL_CLEAR
          ) {
            return {
              id: 'existing-all-clear',
              status: PopulationAlertStatus.DRAFT,
            };
          }

          return sourceAlert;
        },
      );

      await expect(
        service.createIncidentFollowUpDraft(
          'building-1',
          'incident-1',
          'alert-emergency-1',
          PopulationAlertType.UPDATE,
          updateContent,
          actor,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(
        prisma.populationAlert.create,
      ).not.toHaveBeenCalled();
    });

    it('transforme une collision concurrente ALL_CLEAR en erreur métier', async () => {
      prisma.populationAlert.findFirst.mockImplementation(
        async (args: any) => {
          if (
            args?.where?.type ===
            PopulationAlertType.ALL_CLEAR
          ) {
            /*
             * Simule la course :
             * aucune autre requête n'a encore créé le
             * ALL_CLEAR au moment du contrôle applicatif.
             */
            return null;
          }

          return sourceAlert;
        },
      );

      prisma.populationAlert.create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError(
          'Unique constraint failed',
          {
            code: 'P2002',
            clientVersion: 'test',
            meta: {
              target:
                'PopulationAlert_one_active_all_clear_per_incident',
            },
          },
        ),
      );

      await expect(
        service.createIncidentFollowUpDraft(
          'building-1',
          'incident-1',
          'alert-emergency-1',
          PopulationAlertType.ALL_CLEAR,
          {
            titleFR: 'Fin de l’alerte',
            messageFR:
              'La situation d’urgence est maintenant maîtrisée.',
            instructionFR:
              'La population peut reprendre ses activités normales.',
          },
          actor,
        ),
      ).rejects.toThrow(
        'Un ALL_CLEAR existe déjà pour cet incident',
      );

      expect(
        prisma.populationAlert.create,
      ).toHaveBeenCalledTimes(1);

      expect(
        prisma.populationAlertZone.createMany,
      ).not.toHaveBeenCalled();
    });

    it('permet un nouvel UPDATE lorsque l’ancien ALL_CLEAR est CANCELLED', async () => {
      prisma.populationAlert.findFirst.mockImplementation(
        async (args: any) => {
          if (
            args?.where?.type ===
            PopulationAlertType.ALL_CLEAR
          ) {
            /*
             * La requête du service exclut les ALL_CLEAR
             * CANCELLED. Prisma retourne donc null.
             */
            return null;
          }

          return sourceAlert;
        },
      );

      prisma.populationAlert.create.mockResolvedValue({
        id: 'alert-update-after-cancelled-all-clear',
        programId: 'program-1',
        incidentEventId: 'incident-1',
        emergencyScenarioId: 'scenario-1',
        type: PopulationAlertType.UPDATE,
        status: PopulationAlertStatus.DRAFT,
      });

      prisma.populationAlert.findUnique.mockResolvedValue({
        id: 'alert-update-after-cancelled-all-clear',
        programId: 'program-1',
        incidentEventId: 'incident-1',
        emergencyScenarioId: 'scenario-1',
        type: PopulationAlertType.UPDATE,
        status: PopulationAlertStatus.DRAFT,
        zones: [],
      });

      await expect(
        service.createIncidentFollowUpDraft(
          'building-1',
          'incident-1',
          'alert-emergency-1',
          PopulationAlertType.UPDATE,
          updateContent,
          actor,
        ),
      ).resolves.toEqual(
        expect.objectContaining({
          id: 'alert-update-after-cancelled-all-clear',
          type: PopulationAlertType.UPDATE,
          status: PopulationAlertStatus.DRAFT,
        }),
      );

      expect(
        prisma.populationAlert.create,
      ).toHaveBeenCalledTimes(1);
    });

    it('refuse un follow-up lorsque la communication source n’est pas ACTIVE ou ENDED', async () => {
      prisma.populationAlert.findFirst.mockResolvedValue({
        ...sourceAlert,
        status: PopulationAlertStatus.READY,
      });

      await expect(
        service.createIncidentFollowUpDraft(
          'building-1',
          'incident-1',
          'alert-emergency-1',
          PopulationAlertType.UPDATE,
          updateContent,
          actor,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(
        prisma.populationAlert.create,
      ).not.toHaveBeenCalled();
    });

    it('permet de consulter l’historique après suspension ou désactivation opérationnelle de Population', async () => {
      prisma.rueFacilityProfile.findUnique.mockResolvedValue({
        ...activeProfile,
        populationEnabled: false,
        populationProgram: {
          ...activeProfile.populationProgram,
          status: PopulationProgramStatus.SUSPENDED,
        },
      });

      prisma.populationAlert.findMany.mockResolvedValue([
        {
          id: 'alert-emergency-1',
          programId: 'program-1',
          incidentEventId: 'incident-1',
          type: PopulationAlertType.EMERGENCY,
          status: PopulationAlertStatus.ENDED,
          zones: [],
          deliveries: [],
        },
      ]);

      await expect(
        service.getIncidentAlertHistory(
          'building-1',
          'incident-1',
        ),
      ).resolves.toEqual([
        expect.objectContaining({
          id: 'alert-emergency-1',
          incidentEventId: 'incident-1',
        }),
      ]);

      expect(
        prisma.populationAlert.findMany,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            programId: 'program-1',
            incidentEventId: 'incident-1',
          },
        }),
      );
    });

    it('refuse un incident qui n’appartient pas au bâtiment et à l’organisation', async () => {
      prisma.incidentEvent.findFirst.mockResolvedValue(
        null,
      );

      await expect(
        service.getIncidentAlertHistory(
          'building-1',
          'incident-other-building',
        ),
      ).rejects.toBeInstanceOf(NotFoundException);

      expect(
        prisma.populationAlert.findMany,
      ).not.toHaveBeenCalled();
    });

    describe('cancelAlert', () => {
      it.each([
        PopulationAlertStatus.DRAFT,
        PopulationAlertStatus.READY,
      ])(
        'annule une alerte %s en conservant son historique',
        async (status) => {
          prisma.populationAlert.findFirst
            .mockResolvedValueOnce({
              ...sourceAlert,
              status,
            })
            .mockResolvedValueOnce({
              ...sourceAlert,
              status: PopulationAlertStatus.CANCELLED,
              cancelledAt: new Date(),
            });

          prisma.populationAlert.updateMany.mockResolvedValue({
            count: 1,
          });

          const result = await service.cancelAlert(
            'building-1',
            'alert-emergency-1',
          );

          expect(
            prisma.populationAlert.updateMany,
          ).toHaveBeenCalledWith({
            where: {
              id: 'alert-emergency-1',
              programId: 'program-1',
              status: {
                in: [
                  PopulationAlertStatus.DRAFT,
                  PopulationAlertStatus.READY,
                ],
              },
            },
            data: {
              status: PopulationAlertStatus.CANCELLED,
              cancelledAt: expect.any(Date),
            },
          });

          expect(result).toEqual(
            expect.objectContaining({
              id: 'alert-emergency-1',
              status: PopulationAlertStatus.CANCELLED,
            }),
          );

          expect(
            prisma.populationAlertZone.deleteMany,
          ).not.toHaveBeenCalled();

          expect(
            prisma.populationAlertDelivery.updateMany,
          ).not.toHaveBeenCalled();
        },
      );

      it('est idempotente lorsque l’alerte est déjà CANCELLED', async () => {
        prisma.populationAlert.findFirst.mockResolvedValue({
          ...sourceAlert,
          status: PopulationAlertStatus.CANCELLED,
          cancelledAt: new Date(),
        });

        const result = await service.cancelAlert(
          'building-1',
          'alert-emergency-1',
        );

        expect(result).toEqual(
          expect.objectContaining({
            id: 'alert-emergency-1',
            status: PopulationAlertStatus.CANCELLED,
          }),
        );

        expect(
          prisma.populationAlert.updateMany,
        ).not.toHaveBeenCalled();
      });

      it.each([
        PopulationAlertStatus.SENDING,
        PopulationAlertStatus.ACTIVE,
        PopulationAlertStatus.ENDED,
        PopulationAlertStatus.FAILED,
      ])(
        'refuse d’annuler une alerte %s',
        async (status) => {
          prisma.populationAlert.findFirst.mockResolvedValue({
            ...sourceAlert,
            status,
          });

          await expect(
            service.cancelAlert(
              'building-1',
              'alert-emergency-1',
            ),
          ).rejects.toThrow(
            'Seule une alerte DRAFT ou READY peut être annulée',
          );

          expect(
            prisma.populationAlert.updateMany,
          ).not.toHaveBeenCalled();
        },
      );

      it('permet l’annulation après suspension et désactivation du programme', async () => {
        prisma.rueFacilityProfile.findUnique.mockResolvedValue({
          ...activeProfile,
          populationEnabled: false,
          populationProgram: {
            ...activeProfile.populationProgram,
            status: PopulationProgramStatus.SUSPENDED,
          },
        });

        prisma.populationAlert.findFirst
          .mockResolvedValueOnce({
            ...sourceAlert,
            status: PopulationAlertStatus.READY,
          })
          .mockResolvedValueOnce({
            ...sourceAlert,
            status: PopulationAlertStatus.CANCELLED,
            cancelledAt: new Date(),
          });

        prisma.populationAlert.updateMany.mockResolvedValue({
          count: 1,
        });

        await expect(
          service.cancelAlert(
            'building-1',
            'alert-emergency-1',
          ),
        ).resolves.toEqual(
          expect.objectContaining({
            id: 'alert-emergency-1',
            status: PopulationAlertStatus.CANCELLED,
          }),
        );

        expect(
          prisma.populationAlert.updateMany,
        ).toHaveBeenCalledTimes(1);
      });
    });

    it('clôture une alerte ACTIVE en ENDED sans modifier son historique', async () => {
      prisma.populationAlert.findFirst.mockResolvedValue({
        ...sourceAlert,
        status: PopulationAlertStatus.ACTIVE,
      });

      prisma.populationAlert.updateMany.mockResolvedValue({
        count: 1,
      });

      prisma.populationAlert.findFirst
        .mockResolvedValueOnce({
          ...sourceAlert,
          status: PopulationAlertStatus.ACTIVE,
        })
        .mockResolvedValueOnce({
          ...sourceAlert,
          status: PopulationAlertStatus.ENDED,
          endedAt: expect.anything(),
        });

      await service.endAlert(
        'building-1',
        'alert-emergency-1',
      );

      expect(
        prisma.populationAlert.updateMany,
      ).toHaveBeenCalledWith({
        where: {
          id: 'alert-emergency-1',
          programId: 'program-1',
          status: PopulationAlertStatus.ACTIVE,
        },
        data: {
          status: PopulationAlertStatus.ENDED,
          endedAt: expect.any(Date),
        },
      });

      expect(
        prisma.populationAlertZone.deleteMany,
      ).not.toHaveBeenCalled();

      expect(
        prisma.populationAlertDelivery.updateMany,
      ).not.toHaveBeenCalled();
    });

    it('permet de clôturer une alerte ACTIVE après suspension et désactivation du programme', async () => {
      prisma.rueFacilityProfile.findUnique.mockResolvedValue({
        ...activeProfile,
        populationEnabled: false,
        populationProgram: {
          ...activeProfile.populationProgram,
          status: PopulationProgramStatus.SUSPENDED,
        },
      });

      prisma.populationAlert.findFirst
        .mockResolvedValueOnce({
          ...sourceAlert,
          status: PopulationAlertStatus.ACTIVE,
        })
        .mockResolvedValueOnce({
          ...sourceAlert,
          status: PopulationAlertStatus.ENDED,
          endedAt: new Date(),
        });

      prisma.populationAlert.updateMany.mockResolvedValue({
        count: 1,
      });

      const result = await service.endAlert(
        'building-1',
        'alert-emergency-1',
      );

      expect(
        prisma.populationAlert.updateMany,
      ).toHaveBeenCalledWith({
        where: {
          id: 'alert-emergency-1',
          programId: 'program-1',
          status: PopulationAlertStatus.ACTIVE,
        },
        data: {
          status: PopulationAlertStatus.ENDED,
          endedAt: expect.any(Date),
        },
      });

      expect(result).toEqual(
        expect.objectContaining({
          id: 'alert-emergency-1',
          status: PopulationAlertStatus.ENDED,
        }),
      );

      expect(
        prisma.populationAlertZone.deleteMany,
      ).not.toHaveBeenCalled();

      expect(
        prisma.populationAlertDelivery.updateMany,
      ).not.toHaveBeenCalled();
    });

    it('rend la clôture ENDED idempotente', async () => {
      prisma.populationAlert.findFirst.mockResolvedValue({
        ...sourceAlert,
        status: PopulationAlertStatus.ENDED,
        endedAt: new Date(),
      });

      await service.endAlert(
        'building-1',
        'alert-emergency-1',
      );

      expect(
        prisma.populationAlert.updateMany,
      ).not.toHaveBeenCalled();
    });

    it('relit l’état historique lorsqu’une autre requête clôture simultanément la même alerte', async () => {
      prisma.populationAlert.findFirst
        .mockResolvedValueOnce({
          ...sourceAlert,
          status: PopulationAlertStatus.ACTIVE,
        })
        .mockResolvedValueOnce({
          ...sourceAlert,
          status: PopulationAlertStatus.ENDED,
          endedAt: new Date(),
        });

      prisma.populationAlert.updateMany.mockResolvedValue({
        count: 0,
      });

      const result = await service.endAlert(
        'building-1',
        'alert-emergency-1',
      );

      expect(
        prisma.populationAlert.updateMany,
      ).toHaveBeenCalledTimes(1);

      expect(result).toEqual(
        expect.objectContaining({
          id: 'alert-emergency-1',
          status: PopulationAlertStatus.ENDED,
        }),
      );
    });

    it('refuse de clôturer une communication qui n’est ni ACTIVE ni déjà ENDED', async () => {
      prisma.populationAlert.findFirst.mockResolvedValue({
        ...sourceAlert,
        status: PopulationAlertStatus.READY,
      });

      await expect(
        service.endAlert(
          'building-1',
          'alert-emergency-1',
        ),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(
        prisma.populationAlert.updateMany,
      ).not.toHaveBeenCalled();
    });
  });

  describe('refreshAlertDraftTargeting', () => {
    const activeProfile = {
      id: 'profile-1',
      buildingId: 'building-1',
      assessmentStatus:
        RueAssessmentStatus.CONFIRMED_SUBJECT,
      populationEnabled: true,
      populationProgram: {
        id: 'program-1',
        status: PopulationProgramStatus.ACTIVE,
      },
    };

    const draftAlert = {
      id: 'alert-1',
      programId: 'program-1',
      emergencyScenarioId: 'scenario-1',
      status: PopulationAlertStatus.DRAFT,
      titleFR: 'Alerte ammoniac',
      messageFR: 'Un rejet est en cours.',
      zones: [],
    };

    const scenario = {
      id: 'scenario-1',
      nameFR: 'Rejet accidentel d’ammoniac',
      nameEN: 'Accidental ammonia release',
      impactZones: [
        {
          id: 'zone-a',
          code: 'A',
          nameFR: 'Zone immédiate',
          nameEN: 'Immediate zone',
          geometry: {
            type: 'Polygon',
            coordinates: [],
          },
          maxDistanceKm: null,
          protectiveAction: 'SHELTER_IN_PLACE',
          instructionFR: 'Mettez-vous à l’abri.',
          instructionEN: 'Shelter in place.',
        },
      ],
    };

    beforeEach(() => {
      prisma.rueFacilityProfile.findUnique.mockResolvedValue(
        activeProfile,
      );

      prisma.populationAlert.findFirst.mockResolvedValue(
        draftAlert,
      );

      prisma.building.findUnique.mockResolvedValue({
        id: 'building-1',
        name: 'Installation Boucherville',
        address: '1234 rue Industrielle',
        city: 'Boucherville',
        province: 'QC',
        latitude: 45.5,
        longitude: -73.5,
      });

      prisma.rueEmergencyScenario.findFirst.mockResolvedValue(
        scenario,
      );

      prisma.populationSubscriber.findMany.mockResolvedValue([
        {
          id: 'subscriber-1',
          latitude: 45.5,
          longitude: -73.5,
          smsEnabled: true,
          emailEnabled: true,
        },
      ]);

      populationGeospatialService.isPointInsideImpactZone
        .mockReturnValue(true);

      prisma.populationAlertZone.deleteMany.mockResolvedValue({
        count: 1,
      });

      prisma.populationAlertZone.createMany.mockResolvedValue({
        count: 1,
      });

      prisma.populationAlert.update.mockResolvedValue({
        id: 'alert-1',
      });

      prisma.populationAlert.findUnique.mockResolvedValue({
        ...draftAlert,
        zones: [
          {
            zoneCodeSnapshot: 'A',
            targetedSubscriberCount: 1,
          },
        ],
      });

      prisma.$transaction.mockImplementation(
        async (callback: (tx: typeof prisma) => unknown) =>
          callback(prisma),
      );
    });

    it('remplace atomiquement les anciens snapshots par le ciblage recalculé', async () => {
      await service.refreshAlertDraftTargeting(
        'building-1',
        'alert-1',
      );

      expect(
        prisma.populationAlertZone.deleteMany,
      ).toHaveBeenCalledWith({
        where: {
          alertId: 'alert-1',
        },
      });

      expect(
        prisma.populationAlertZone.createMany,
      ).toHaveBeenCalledTimes(1);

      const zoneData =
        prisma.populationAlertZone.createMany.mock
          .calls[0][0].data;

      expect(zoneData).toEqual([
        expect.objectContaining({
          alertId: 'alert-1',
          impactZoneId: 'zone-a',
          zoneCodeSnapshot: 'A',
          targetedSubscriberCount: 1,
        }),
      ]);

      expect(
        prisma.populationAlert.update,
      ).toHaveBeenCalledWith({
        where: {
          id: 'alert-1',
        },
        data: {
          contextSnapshot: expect.objectContaining({
            snapshotVersion: 1,
            population: {
              activeSubscriberCount: 1,
              geolocatedSubscriberCount: 1,
              unlocatedSubscriberCount: 0,
              uniqueTargetCount: 1,
              uniqueSmsTargetCount: 1,
              uniqueEmailTargetCount: 1,
            },
            targeting: {
              zoneCount: 1,
              calculatedAt: expect.any(String),
            },
          }),
        },
      });
    });

    it('refuse de recalculer le ciblage d’une alerte qui n’est plus DRAFT', async () => {
      prisma.populationAlert.findFirst.mockResolvedValue({
        ...draftAlert,
        status: PopulationAlertStatus.READY,
      });

      await expect(
        service.refreshAlertDraftTargeting(
          'building-1',
          'alert-1',
        ),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(
        prisma.populationAlertZone.deleteMany,
      ).not.toHaveBeenCalled();

      expect(
        prisma.rueEmergencyScenario.findFirst,
      ).not.toHaveBeenCalled();
    });

    it('refuse le recalcul lorsque le DRAFT n’est lié à aucun scénario', async () => {
      prisma.populationAlert.findFirst.mockResolvedValue({
        ...draftAlert,
        emergencyScenarioId: null,
      });

      await expect(
        service.refreshAlertDraftTargeting(
          'building-1',
          'alert-1',
        ),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(
        prisma.populationAlertZone.deleteMany,
      ).not.toHaveBeenCalled();
    });
  });

  describe('markAlertDraftReady', () => {
    const activeProfile = {
      id: 'profile-1',
      buildingId: 'building-1',
      assessmentStatus:
        RueAssessmentStatus.CONFIRMED_SUBJECT,
      populationEnabled: true,
      populationProgram: {
        id: 'program-1',
        status: PopulationProgramStatus.ACTIVE,
      },
    };

    const draftAlert = {
      id: 'alert-1',
      programId: 'program-1',
      emergencyScenarioId: 'scenario-1',
      status: PopulationAlertStatus.DRAFT,
      titleFR: 'Alerte ammoniac',
      messageFR: 'Un rejet est en cours.',
      zones: [],
    };

    beforeEach(() => {
      prisma.rueFacilityProfile.findUnique.mockResolvedValue(
        activeProfile,
      );

      prisma.populationAlert.findFirst.mockResolvedValue(
        draftAlert,
      );

      prisma.building.findUnique.mockResolvedValue({
        id: 'building-1',
        name: 'Installation Boucherville',
        address: '1234 rue Industrielle',
        city: 'Boucherville',
        province: 'QC',
        latitude: 45.5,
        longitude: -73.5,
      });

      prisma.rueEmergencyScenario.findFirst.mockResolvedValue({
        id: 'scenario-1',
        nameFR: 'Rejet accidentel d’ammoniac',
        nameEN: null,
        impactZones: [
          {
            id: 'zone-a',
            code: 'A',
            nameFR: 'Zone immédiate',
            nameEN: null,
            geometry: null,
            maxDistanceKm: 5,
            protectiveAction: 'SHELTER_IN_PLACE',
            instructionFR: 'Mettez-vous à l’abri.',
            instructionEN: null,
          },
        ],
      });

      prisma.populationSubscriber.findMany.mockResolvedValue([]);

      prisma.populationAlertZone.deleteMany.mockResolvedValue({
        count: 1,
      });

      prisma.populationAlertZone.createMany.mockResolvedValue({
        count: 1,
      });

      prisma.populationAlert.findUnique.mockResolvedValue(
        draftAlert,
      );

      prisma.populationAlert.update.mockResolvedValue({
        ...draftAlert,
        status: PopulationAlertStatus.READY,
      });

      prisma.$transaction.mockImplementation(
        async (callback: (tx: typeof prisma) => unknown) =>
          callback(prisma),
      );
    });

    it('recalcule le ciblage immédiatement avant le passage DRAFT vers READY', async () => {
      const result =
        await service.markAlertDraftReady(
          'building-1',
          'alert-1',
        );

      expect(
        prisma.populationAlertZone.deleteMany,
      ).toHaveBeenCalledWith({
        where: {
          alertId: 'alert-1',
        },
      });

      expect(
        prisma.populationAlert.update,
      ).toHaveBeenLastCalledWith({
        where: {
          id: 'alert-1',
        },
        data: {
          status: PopulationAlertStatus.READY,
        },
        include: {
          zones: {
            orderBy: {
              zoneCodeSnapshot: 'asc',
            },
          },
        },
      });

      expect(result.status).toBe(
        PopulationAlertStatus.READY,
      );
    });

    it('est idempotent lorsqu’une alerte est déjà READY', async () => {
      const readyAlert = {
        ...draftAlert,
        status: PopulationAlertStatus.READY,
      };

      prisma.populationAlert.findFirst.mockResolvedValue(
        readyAlert,
      );

      await expect(
        service.markAlertDraftReady(
          'building-1',
          'alert-1',
        ),
      ).resolves.toEqual(readyAlert);

      expect(
        prisma.populationAlertZone.deleteMany,
      ).not.toHaveBeenCalled();

      expect(
        prisma.populationAlert.update,
      ).not.toHaveBeenCalled();
    });

    it.each([
      PopulationAlertStatus.SENDING,
      PopulationAlertStatus.ACTIVE,
      PopulationAlertStatus.ENDED,
      PopulationAlertStatus.CANCELLED,
      PopulationAlertStatus.FAILED,
    ])(
      'refuse la transition %s vers READY',
      async (status) => {
        prisma.populationAlert.findFirst.mockResolvedValue({
          ...draftAlert,
          status,
        });

        await expect(
          service.markAlertDraftReady(
            'building-1',
            'alert-1',
          ),
        ).rejects.toBeInstanceOf(BadRequestException);

        expect(
          prisma.populationAlertZone.deleteMany,
        ).not.toHaveBeenCalled();
      },
    );

    it('refuse READY si le titre français est vide', async () => {
      prisma.populationAlert.findFirst.mockResolvedValue({
        ...draftAlert,
        titleFR: '   ',
      });

      await expect(
        service.markAlertDraftReady(
          'building-1',
          'alert-1',
        ),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(
        prisma.populationAlertZone.deleteMany,
      ).not.toHaveBeenCalled();
    });

    it('ne crée toujours aucune livraison individuelle au passage READY', async () => {
      await service.markAlertDraftReady(
        'building-1',
        'alert-1',
      );

      expect(
        prisma.populationAlertDelivery.create,
      ).not.toHaveBeenCalled();

      expect(
        prisma.populationAlertDelivery.createMany,
      ).not.toHaveBeenCalled();
    });
  });

  describe('approveAlert', () => {
    const activeProfile = {
      id: 'profile-1',
      buildingId: 'building-1',
      assessmentStatus:
        RueAssessmentStatus.CONFIRMED_SUBJECT,
      populationEnabled: true,
      populationProgram: {
        id: 'program-1',
        status: PopulationProgramStatus.ACTIVE,
      },
    };

    const readyAlert = {
      id: 'alert-1',
      programId: 'program-1',
      emergencyScenarioId: 'scenario-1',
      type: PopulationAlertType.EMERGENCY,
      status: PopulationAlertStatus.READY,

      titleFR: 'Alerte ammoniac',
      messageFR: 'Un rejet accidentel est en cours.',

      approvedByType: null,
      approvedById: null,
      approvedAt: null,

      zones: [
        {
          id: 'alert-zone-1',
          zoneCodeSnapshot: 'A',
          targetedSubscriberCount: 12,
        },
      ],
    };

    const actor = {
      type: 'CLIENT_USER',
      id: 'client-user-1',
    };

    beforeEach(() => {
      prisma.rueFacilityProfile.findUnique.mockResolvedValue(
        activeProfile,
      );

      prisma.populationAlert.findFirst.mockResolvedValue(
        readyAlert,
      );

      prisma.populationAlert.update.mockResolvedValue({
        ...readyAlert,
        approvedByType: 'CLIENT_USER',
        approvedById: 'client-user-1',
        approvedAt: new Date(
          '2026-09-17T16:00:00.000Z',
        ),
      });
    });

    it('enregistre l’approbation humaine d’une alerte READY', async () => {
      const result = await service.approveAlert(
        'building-1',
        'alert-1',
        actor,
      );

      expect(
        prisma.populationAlert.update,
      ).toHaveBeenCalledWith({
        where: {
          id: 'alert-1',
        },
        data: {
          approvedByType: 'CLIENT_USER',
          approvedById: 'client-user-1',
          approvedAt: expect.any(Date),
        },
        include: {
          zones: {
            orderBy: {
              zoneCodeSnapshot: 'asc',
            },
          },
        },
      });

      expect(result.approvedById).toBe(
        'client-user-1',
      );

      expect(result.approvedAt).toEqual(
        expect.any(Date),
      );
    });

    it('est idempotent lorsqu’une alerte READY est déjà approuvée', async () => {
      const approvedAlert = {
        ...readyAlert,
        approvedByType: 'CLIENT_USER',
        approvedById: 'client-user-original',
        approvedAt: new Date(
          '2026-09-17T15:00:00.000Z',
        ),
      };

      prisma.populationAlert.findFirst.mockResolvedValue(
        approvedAlert,
      );

      const result = await service.approveAlert(
        'building-1',
        'alert-1',
        {
          type: 'CLIENT_USER',
          id: 'client-user-other',
        },
      );

      expect(result).toEqual(approvedAlert);

      expect(
        prisma.populationAlert.update,
      ).not.toHaveBeenCalled();

      /*
       * Une seconde requête ne remplace jamais
       * l'approbateur historique.
       */
      expect(result.approvedById).toBe(
        'client-user-original',
      );
    });

    it.each([
      PopulationAlertStatus.DRAFT,
      PopulationAlertStatus.SENDING,
      PopulationAlertStatus.ACTIVE,
      PopulationAlertStatus.ENDED,
      PopulationAlertStatus.CANCELLED,
      PopulationAlertStatus.FAILED,
    ])(
      'refuse l’approbation d’une alerte %s',
      async (status) => {
        prisma.populationAlert.findFirst.mockResolvedValue({
          ...readyAlert,
          status,
        });

        await expect(
          service.approveAlert(
            'building-1',
            'alert-1',
            actor,
          ),
        ).rejects.toBeInstanceOf(BadRequestException);

        expect(
          prisma.populationAlert.update,
        ).not.toHaveBeenCalled();
      },
    );

    it('refuse implicitement une alerte appartenant à un autre programme', async () => {
      prisma.populationAlert.findFirst.mockResolvedValue(
        null,
      );

      await expect(
        service.approveAlert(
          'building-1',
          'alert-other-program',
          actor,
        ),
      ).rejects.toBeInstanceOf(NotFoundException);

      expect(
        prisma.populationAlert.findFirst,
      ).toHaveBeenCalledWith({
        where: {
          id: 'alert-other-program',
          programId: 'program-1',
        },
        include: {
          zones: {
            orderBy: {
              zoneCodeSnapshot: 'asc',
            },
          },
        },
      });

      expect(
        prisma.populationAlert.update,
      ).not.toHaveBeenCalled();
    });

    it('ne crée aucune livraison lors de l’approbation', async () => {
      await service.approveAlert(
        'building-1',
        'alert-1',
        actor,
      );

      expect(
        prisma.populationAlertDelivery.create,
      ).not.toHaveBeenCalled();

      expect(
        prisma.populationAlertDelivery.createMany,
      ).not.toHaveBeenCalled();
    });
  });

  describe('freezeAlertRecipients', () => {
    const activeProfile = {
      id: 'profile-1',
      buildingId: 'building-1',
      assessmentStatus:
        RueAssessmentStatus.CONFIRMED_SUBJECT,
      populationEnabled: true,
      populationProgram: {
        id: 'program-1',
        status: PopulationProgramStatus.ACTIVE,
        smsEnabled: true,
        emailEnabled: true,
      },
    };

    const approvedAlert = {
      id: 'alert-1',
      programId: 'program-1',
      emergencyScenarioId: 'scenario-1',
      type: PopulationAlertType.EMERGENCY,
      status: PopulationAlertStatus.READY,

      titleFR: 'Alerte ammoniac',
      titleEN: 'Ammonia alert',

      messageFR: 'Mettez-vous immédiatement à l’abri.',
      messageEN: 'Shelter in place immediately.',

      approvedByType: 'CLIENT_USER',
      approvedById: 'client-user-1',
      approvedAt: new Date(
        '2026-09-17T16:00:00.000Z',
      ),

      recipientsFrozenAt: null,

      contextSnapshot: {
        snapshotVersion: 1,
        building: {
          id: 'building-1',
          name: 'Installation Boucherville',
          latitude: 45.5,
          longitude: -73.5,
        },
      },

      zones: [
        {
          id: 'alert-zone-a',
          impactZoneId: 'zone-a',
          zoneCodeSnapshot: 'A',
          zoneNameFRSnapshot: 'Zone A',
          geometrySnapshot: {
            type: 'Polygon',
            coordinates: [],
          },
          maxDistanceKmSnapshot: null,
          targetedSubscriberCount: 2,
        },
        {
          id: 'alert-zone-b',
          impactZoneId: 'zone-b',
          zoneCodeSnapshot: 'B',
          zoneNameFRSnapshot: 'Zone B',
          geometrySnapshot: null,
          maxDistanceKmSnapshot: 5,
          targetedSubscriberCount: 2,
        },
      ],
    };

    beforeEach(() => {
      prisma.rueFacilityProfile.findUnique.mockResolvedValue(
        activeProfile,
      );

      prisma.populationAlert.findFirst.mockResolvedValue(
        approvedAlert,
      );

      prisma.populationSubscriber.findMany.mockResolvedValue(
        [],
      );

      prisma.populationAlert.updateMany.mockResolvedValue({
        count: 1,
      });

      prisma.populationAlertDelivery.createMany.mockResolvedValue({
        count: 0,
      });

      prisma.$transaction.mockImplementation(
        async (callback: any) => callback(prisma),
      );

      prisma.populationAlertDelivery.findMany.mockResolvedValue(
        [],
      );

      populationGeospatialService.isPointInsideImpactZone
        .mockReturnValue(false);
    });

    it('refuse de figer les destinataires avant approbation humaine', async () => {
      prisma.populationAlert.findFirst.mockResolvedValue({
        ...approvedAlert,
        approvedByType: null,
        approvedById: null,
        approvedAt: null,
      });

      await expect(
        service.freezeAlertRecipients(
          'building-1',
          'alert-1',
        ),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(
        prisma.populationSubscriber.findMany,
      ).not.toHaveBeenCalled();

      expect(
        prisma.populationAlertDelivery.createMany,
      ).not.toHaveBeenCalled();
    });

    it.each([
      PopulationAlertStatus.DRAFT,
      PopulationAlertStatus.SENDING,
      PopulationAlertStatus.ACTIVE,
      PopulationAlertStatus.ENDED,
      PopulationAlertStatus.CANCELLED,
      PopulationAlertStatus.FAILED,
    ])(
      'refuse le freeze pour une alerte %s',
      async (status) => {
        prisma.populationAlert.findFirst.mockResolvedValue({
          ...approvedAlert,
          status,
        });

        await expect(
          service.freezeAlertRecipients(
            'building-1',
            'alert-1',
          ),
        ).rejects.toBeInstanceOf(BadRequestException);

        expect(
          prisma.populationAlertDelivery.createMany,
        ).not.toHaveBeenCalled();
      },
    );

    it('cible un citoyen présent dans plusieurs zones une seule fois par canal', async () => {
      prisma.populationSubscriber.findMany.mockResolvedValue([
        {
          id: 'subscriber-1',
          preferredLanguage:
            PopulationPreferredLanguage.FR,
          phone: '+15145550101',
          email: 'citoyen@example.com',
          smsEnabled: true,
          emailEnabled: true,
          latitude: 45.51,
          longitude: -73.51,
        },
      ]);

      /*
       * Le même citoyen correspond aux deux zones.
       */
      populationGeospatialService.isPointInsideImpactZone
        .mockReturnValue(true);

      prisma.populationAlertDelivery.findMany.mockResolvedValue([
        {
          id: 'delivery-sms',
          channel: PopulationAlertChannel.SMS,
          status: PopulationDeliveryStatus.QUEUED,
          language: PopulationPreferredLanguage.FR,
          queuedAt: new Date(),
          sentAt: null,
          deliveredAt: null,
          failedAt: null,
        },
        {
          id: 'delivery-email',
          channel: PopulationAlertChannel.EMAIL,
          status: PopulationDeliveryStatus.QUEUED,
          language: PopulationPreferredLanguage.FR,
          queuedAt: new Date(),
          sentAt: null,
          deliveredAt: null,
          failedAt: null,
        },
      ]);

      const result =
        await service.freezeAlertRecipients(
          'building-1',
          'alert-1',
        );

      const createCall =
        prisma.populationAlertDelivery.createMany.mock
          .calls[0][0];

      expect(createCall.skipDuplicates).toBe(true);

      expect(createCall.data).toHaveLength(2);

      expect(createCall.data).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            idempotencyKey:
              'alert-1:subscriber-1:SMS',
            subscriberId: 'subscriber-1',
            channel: PopulationAlertChannel.SMS,
          }),
          expect.objectContaining({
            idempotencyKey:
              'alert-1:subscriber-1:EMAIL',
            subscriberId: 'subscriber-1',
            channel: PopulationAlertChannel.EMAIL,
          }),
        ]),
      );

      expect(result.targeting.subscriberCount).toBe(1);
      expect(result.targeting.deliveryCount).toBe(2);
      expect(result.targeting.smsDeliveryCount).toBe(1);
      expect(result.targeting.emailDeliveryCount).toBe(1);
    });

    it('utilise le message anglais pour un citoyen EN lorsque la version EN existe', async () => {
      prisma.populationSubscriber.findMany.mockResolvedValue([
        {
          id: 'subscriber-en',
          preferredLanguage:
            PopulationPreferredLanguage.EN,
          phone: '+15145550102',
          email: null,
          smsEnabled: true,
          emailEnabled: false,
          latitude: 45.51,
          longitude: -73.51,
        },
      ]);

      populationGeospatialService.isPointInsideImpactZone
        .mockReturnValue(true);

      await service.freezeAlertRecipients(
        'building-1',
        'alert-1',
      );

      expect(
        prisma.populationAlertDelivery.createMany,
      ).toHaveBeenCalledWith({
        data: [
          expect.objectContaining({
            language:
              PopulationPreferredLanguage.EN,
            messageSnapshot:
              'Shelter in place immediately.',
          }),
        ],
        skipDuplicates: true,
      });
    });

    it('retombe sur le français pour un citoyen EN lorsque messageEN est absent', async () => {
      prisma.populationAlert.findFirst.mockResolvedValue({
        ...approvedAlert,
        messageEN: null,
      });

      prisma.populationSubscriber.findMany.mockResolvedValue([
        {
          id: 'subscriber-en',
          preferredLanguage:
            PopulationPreferredLanguage.EN,
          phone: '+15145550102',
          email: null,
          smsEnabled: true,
          emailEnabled: false,
          latitude: 45.51,
          longitude: -73.51,
        },
      ]);

      populationGeospatialService.isPointInsideImpactZone
        .mockReturnValue(true);

      await service.freezeAlertRecipients(
        'building-1',
        'alert-1',
      );

      expect(
        prisma.populationAlertDelivery.createMany,
      ).toHaveBeenCalledWith({
        data: [
          expect.objectContaining({
            language:
              PopulationPreferredLanguage.FR,
            messageSnapshot:
              'Mettez-vous immédiatement à l’abri.',
          }),
        ],
        skipDuplicates: true,
      });
    });

    it('exclut un abonné sans localisation exploitable', async () => {
      prisma.populationSubscriber.findMany.mockResolvedValue([
        {
          id: 'subscriber-unlocated',
          preferredLanguage:
            PopulationPreferredLanguage.FR,
          phone: '+15145550103',
          email: null,
          smsEnabled: true,
          emailEnabled: false,
          latitude: null,
          longitude: null,
        },
      ]);

      const result =
        await service.freezeAlertRecipients(
          'building-1',
          'alert-1',
        );

      expect(
        populationGeospatialService.isPointInsideImpactZone,
      ).not.toHaveBeenCalled();

      expect(
        prisma.populationAlertDelivery.createMany,
      ).not.toHaveBeenCalled();

      expect(result.targeting.subscriberCount).toBe(0);
      expect(result.targeting.deliveryCount).toBe(0);
    });

    it('respecte les canaux activés au niveau du programme', async () => {
      prisma.rueFacilityProfile.findUnique.mockResolvedValue({
        ...activeProfile,
        populationProgram: {
          ...activeProfile.populationProgram,
          smsEnabled: false,
          emailEnabled: true,
        },
      });

      prisma.populationSubscriber.findMany.mockResolvedValue([
        {
          id: 'subscriber-1',
          preferredLanguage:
            PopulationPreferredLanguage.FR,
          phone: '+15145550101',
          email: 'citoyen@example.com',
          smsEnabled: true,
          emailEnabled: true,
          latitude: 45.51,
          longitude: -73.51,
        },
      ]);

      populationGeospatialService.isPointInsideImpactZone
        .mockReturnValue(true);

      await service.freezeAlertRecipients(
        'building-1',
        'alert-1',
      );

      const deliveries =
        prisma.populationAlertDelivery.createMany.mock
          .calls[0][0].data;

      expect(deliveries).toHaveLength(1);

      expect(deliveries[0]).toEqual(
        expect.objectContaining({
          channel: PopulationAlertChannel.EMAIL,
          destinationSnapshot:
            'citoyen@example.com',
        }),
      );
    });

    it('utilise exclusivement les snapshots de zones approuvés pour le calcul géospatial', async () => {
      prisma.populationSubscriber.findMany.mockResolvedValue([
        {
          id: 'subscriber-1',
          preferredLanguage:
            PopulationPreferredLanguage.FR,
          phone: '+15145550101',
          email: null,
          smsEnabled: true,
          emailEnabled: false,
          latitude: 45.51,
          longitude: -73.51,
        },
      ]);

      populationGeospatialService.isPointInsideImpactZone
        .mockReturnValue(true);

      await service.freezeAlertRecipients(
        'building-1',
        'alert-1',
      );

      expect(
        populationGeospatialService.isPointInsideImpactZone,
      ).toHaveBeenCalledWith({
        latitude: 45.51,
        longitude: -73.51,
        geometry:
          approvedAlert.zones[0].geometrySnapshot,
        maxDistanceKm:
          approvedAlert.zones[0]
            .maxDistanceKmSnapshot,
        referenceLatitude: 45.5,
        referenceLongitude: -73.5,
      });

      /*
       * Le freeze ne consulte pas le scénario RUE courant.
       */
      expect(
        prisma.rueEmergencyScenario.findFirst,
      ).not.toHaveBeenCalled();
    });

    it('rend le freeze idempotent grâce aux clés déterministes et skipDuplicates', async () => {
      prisma.populationSubscriber.findMany.mockResolvedValue([
        {
          id: 'subscriber-1',
          preferredLanguage:
            PopulationPreferredLanguage.FR,
          phone: '+15145550101',
          email: null,
          smsEnabled: true,
          emailEnabled: false,
          latitude: 45.51,
          longitude: -73.51,
        },
      ]);

      populationGeospatialService.isPointInsideImpactZone
        .mockReturnValue(true);

      prisma.populationAlertDelivery.findMany.mockResolvedValue([
        {
          id: 'existing-delivery',
          channel: PopulationAlertChannel.SMS,
          status: PopulationDeliveryStatus.QUEUED,
          language: PopulationPreferredLanguage.FR,
          queuedAt: new Date(),
          sentAt: null,
          deliveredAt: null,
          failedAt: null,
        },
      ]);

      await service.freezeAlertRecipients(
        'building-1',
        'alert-1',
      );

      expect(
        prisma.populationAlertDelivery.createMany,
      ).toHaveBeenCalledWith({
        data: [
          expect.objectContaining({
            idempotencyKey:
              'alert-1:subscriber-1:SMS',
          }),
        ],
        skipDuplicates: true,
      });
    });

    it('ne retourne aucune PII citoyenne dans la réponse du freeze', async () => {
      prisma.populationSubscriber.findMany.mockResolvedValue([
        {
          id: 'subscriber-secret',
          preferredLanguage:
            PopulationPreferredLanguage.FR,
          phone: '+15145550999',
          email: 'secret@example.com',
          smsEnabled: true,
          emailEnabled: true,
          latitude: 45.51,
          longitude: -73.51,
        },
      ]);

      populationGeospatialService.isPointInsideImpactZone
        .mockReturnValue(true);

      prisma.populationAlertDelivery.findMany.mockResolvedValue([
        {
          id: 'delivery-1',
          channel: PopulationAlertChannel.SMS,
          status: PopulationDeliveryStatus.QUEUED,
          language: PopulationPreferredLanguage.FR,
          queuedAt: new Date(),
          sentAt: null,
          deliveredAt: null,
          failedAt: null,
        },
      ]);

      const result =
        await service.freezeAlertRecipients(
          'building-1',
          'alert-1',
        );

      const serialized = JSON.stringify(result);

      expect(serialized).not.toContain(
        'subscriber-secret',
      );
      expect(serialized).not.toContain(
        '+15145550999',
      );
      expect(serialized).not.toContain(
        'secret@example.com',
      );
      expect(serialized).not.toContain('45.51');
      expect(serialized).not.toContain('-73.51');
    });

        it('ne crÃ©e rien lorsquâ€™aucun citoyen ne correspond aux zones', async () => {
      prisma.populationSubscriber.findMany.mockResolvedValue([
        {
          id: 'subscriber-outside',
          preferredLanguage:
            PopulationPreferredLanguage.FR,
          phone: '+15145550104',
          email: null,
          smsEnabled: true,
          emailEnabled: false,
          latitude: 46,
          longitude: -74,
        },
      ]);

      populationGeospatialService.isPointInsideImpactZone
        .mockReturnValue(false);

      const result =
        await service.freezeAlertRecipients(
          'building-1',
          'alert-1',
        );

      expect(
        prisma.populationAlertDelivery.createMany,
      ).not.toHaveBeenCalled();

      expect(result.targeting).toEqual({
        subscriberCount: 0,
        deliveryCount: 0,
        smsDeliveryCount: 0,
        emailDeliveryCount: 0,
      });
        });

    it('enregistre le freeze même lorsqu’il n’existe aucun destinataire', async () => {
      prisma.populationSubscriber.findMany.mockResolvedValue(
        [],
      );

      prisma.populationAlertDelivery.findMany.mockResolvedValue(
        [],
      );

      const result =
        await service.freezeAlertRecipients(
          'building-1',
          'alert-1',
        );

              expect(
        prisma.$transaction,
      ).toHaveBeenCalledTimes(1);

      expect(
        prisma.populationAlert.updateMany,
      ).toHaveBeenCalledWith({
        where: {
          id: 'alert-1',
          programId: 'program-1',
          status: PopulationAlertStatus.READY,
          recipientsFrozenAt: null,
        },
        data: {
          recipientsFrozenAt: expect.any(Date),
        },
      });

      expect(
        prisma.populationAlertDelivery.createMany,
      ).not.toHaveBeenCalled();

      expect(
        result.recipientsFrozenAt,
      ).toBeInstanceOf(Date);

      expect(result.targeting).toEqual({
        subscriberCount: 0,
        deliveryCount: 0,
        smsDeliveryCount: 0,
        emailDeliveryCount: 0,
      });
    });

    it('ne recalcule jamais les destinataires d’une alerte déjà figée', async () => {
      const frozenAt = new Date(
        '2026-09-17T16:05:00.000Z',
      );

      prisma.populationAlert.findFirst.mockResolvedValue({
        ...approvedAlert,
        recipientsFrozenAt: frozenAt,
      });

      prisma.populationAlertDelivery.findMany
        .mockResolvedValueOnce([
          {
            id: 'delivery-existing',
            channel: PopulationAlertChannel.SMS,
            status: PopulationDeliveryStatus.QUEUED,
            language:
              PopulationPreferredLanguage.FR,
            queuedAt: new Date(),
            sentAt: null,
            deliveredAt: null,
            failedAt: null,
          },
        ])
        .mockResolvedValueOnce([
          {
            subscriberId: 'subscriber-existing',
          },
        ]);

      const result =
        await service.freezeAlertRecipients(
          'building-1',
          'alert-1',
        );

      expect(
        prisma.populationSubscriber.findMany,
      ).not.toHaveBeenCalled();

      expect(
        populationGeospatialService.isPointInsideImpactZone,
      ).not.toHaveBeenCalled();

      expect(
        prisma.populationAlert.updateMany,
      ).not.toHaveBeenCalled();

      expect(
        prisma.populationAlertDelivery.createMany,
      ).not.toHaveBeenCalled();

      expect(result.recipientsFrozenAt).toEqual(
        frozenAt,
      );

      expect(result.targeting).toEqual({
        subscriberCount: 1,
        deliveryCount: 1,
        smsDeliveryCount: 1,
        emailDeliveryCount: 0,
      });
    });

    it('un second processus qui perd le claim retourne le roster déjà figé sans créer de deliveries', async () => {
      const frozenAt = new Date(
        '2026-09-17T16:05:00.000Z',
      );

      prisma.populationSubscriber.findMany.mockResolvedValue([
        {
          id: 'subscriber-racing',
          preferredLanguage:
            PopulationPreferredLanguage.FR,
          phone: '+15145550101',
          email: null,
          smsEnabled: true,
          emailEnabled: false,
          latitude: 45.51,
          longitude: -73.51,
        },
      ]);

      populationGeospatialService.isPointInsideImpactZone
        .mockReturnValue(true);

      prisma.populationAlert.updateMany.mockResolvedValue({
        count: 0,
      });

      /*
       * Premier findFirst = chargement initial de l'alerte.
       * Deuxième findFirst = confirmation après perte du claim.
       */
      prisma.populationAlert.findFirst
        .mockResolvedValueOnce(approvedAlert)
        .mockResolvedValueOnce({
          recipientsFrozenAt: frozenAt,
        });

      prisma.populationAlertDelivery.findMany
        .mockResolvedValueOnce([
          {
            id: 'delivery-winner',
            channel: PopulationAlertChannel.SMS,
            status: PopulationDeliveryStatus.QUEUED,
            language:
              PopulationPreferredLanguage.FR,
            queuedAt: new Date(),
            sentAt: null,
            deliveredAt: null,
            failedAt: null,
          },
        ])
        .mockResolvedValueOnce([
          {
            subscriberId: 'subscriber-winner',
          },
        ]);

      const result =
        await service.freezeAlertRecipients(
          'building-1',
          'alert-1',
        );

      expect(
        prisma.$transaction,
      ).toHaveBeenCalledTimes(1);

      expect(
        prisma.populationAlertDelivery.createMany,
      ).not.toHaveBeenCalled();

      expect(result.recipientsFrozenAt).toEqual(
        frozenAt,
      );

      expect(result.targeting.subscriberCount).toBe(
        1,
      );

      expect(result.targeting.deliveryCount).toBe(1);
    });

    it('échoue si le claim est perdu sans qu’un freeze concurrent puisse être confirmé', async () => {
      prisma.populationAlert.updateMany.mockResolvedValue({
        count: 0,
      });

      prisma.populationAlert.findFirst
        .mockResolvedValueOnce(approvedAlert)
        .mockResolvedValueOnce({
          recipientsFrozenAt: null,
        });

      await expect(
        service.freezeAlertRecipients(
          'building-1',
          'alert-1',
        ),
      ).rejects.toThrow(
        'Impossible de confirmer le freeze des destinataires',
      );

      expect(
        prisma.populationAlertDelivery.createMany,
      ).not.toHaveBeenCalled();
    });
  });

      it('ne valide pas un freeze lorsque la matérialisation du roster échoue', async () => {
      prisma.populationAlert.updateMany.mockResolvedValue({
        count: 1,
      });

      prisma.$transaction.mockImplementation(
        async (callback: any) => callback(prisma),
      );

      prisma.populationSubscriber.findMany.mockResolvedValue([
        {
          id: 'subscriber-rollback',
          preferredLanguage:
            PopulationPreferredLanguage.FR,
          phone: '+15145550105',
          email: null,
          smsEnabled: true,
          emailEnabled: false,
          latitude: 45.51,
          longitude: -73.51,
        },
      ]);

      populationGeospatialService.isPointInsideImpactZone
        .mockReturnValue(true);

      prisma.populationAlertDelivery.createMany.mockRejectedValue(
        new Error('database write failed'),
      );

      await expect(
        service.freezeAlertRecipients(
          'building-1',
          'alert-1',
        ),
      ).rejects.toThrow('database write failed');

      expect(
        prisma.$transaction,
      ).toHaveBeenCalledTimes(1);

      expect(
        prisma.populationAlert.updateMany,
      ).toHaveBeenCalledWith({
        where: {
          id: 'alert-1',
          programId: 'program-1',
          status: PopulationAlertStatus.READY,
          recipientsFrozenAt: null,
        },
        data: {
          recipientsFrozenAt: expect.any(Date),
        },
      });

      expect(
        prisma.populationAlertDelivery.createMany,
      ).toHaveBeenCalledTimes(1);
    });

  describe('sendAlert', () => {
    const activeProfile = {
      id: 'profile-1',
      buildingId: 'building-1',
      assessmentStatus:
        RueAssessmentStatus.CONFIRMED_SUBJECT,
      populationEnabled: true,
      populationProgram: {
        id: 'program-1',
        status: PopulationProgramStatus.ACTIVE,
        smsEnabled: true,
        emailEnabled: true,
      },
    };

    const readyAlert = {
      id: 'alert-send-1',
      programId: 'program-1',
      status: PopulationAlertStatus.READY,

      titleFR: 'Alerte ammoniac',
      titleEN: 'Ammonia alert',

      approvedByType: 'CLIENT_USER',
      approvedById: 'client-user-1',
      approvedAt: new Date(
        '2026-09-17T16:00:00.000Z',
      ),

      recipientsFrozenAt: new Date(
        '2026-09-17T16:01:00.000Z',
      ),

      zones: [],
    };

    beforeEach(() => {
      prisma.rueFacilityProfile.findUnique.mockResolvedValue(
        activeProfile,
      );

      prisma.populationAlert.findFirst.mockResolvedValue(
        readyAlert,
      );

      prisma.populationAlertDelivery.count.mockResolvedValue(
        1,
      );

      prisma.populationAlert.updateMany.mockResolvedValue({
        count: 1,
      });

      prisma.populationAlertDelivery.findMany.mockResolvedValue([
        {
          id: 'delivery-send-1',
        },
      ]);

      prisma.populationAlertDelivery.groupBy.mockResolvedValue([
        {
          status: PopulationDeliveryStatus.SENT,
          _count: {
            _all: 1,
          },
        },
      ] as any);
    });

    it('claim atomiquement l’alerte READY avant de diffuser le roster', async () => {
      const claimSpy = jest
        .spyOn(service, 'claimAlertDelivery')
        .mockResolvedValue({
          claimed: true,
          delivery: {
            id: 'delivery-send-1',
          },
        } as any);

      const dispatchSpy = jest
        .spyOn(service, 'dispatchAlertDelivery')
        .mockResolvedValue({
          deliveryId: 'delivery-send-1',
          status: PopulationDeliveryStatus.SENT,
        } as any);

      await service.sendAlert(
        'building-1',
        'alert-send-1',
      );

      expect(
        prisma.populationAlert.updateMany,
      ).toHaveBeenNthCalledWith(
        1,
        {
          where: {
            id: 'alert-send-1',
            programId: 'program-1',
            status: PopulationAlertStatus.READY,
            recipientsFrozenAt: {
              not: null,
            },
            approvedAt: {
              not: null,
            },
          },
          data: {
            status: PopulationAlertStatus.SENDING,
            sendingAt: expect.any(Date),
          },
        },
      );

      expect(claimSpy).toHaveBeenCalledWith(
        'building-1',
        'alert-send-1',
        'delivery-send-1',
      );

      expect(dispatchSpy).toHaveBeenCalledWith(
        'building-1',
        'alert-send-1',
        'delivery-send-1',
      );
    });

    it('passe ACTIVE lorsqu’au moins une livraison est SENT', async () => {
      jest
        .spyOn(service, 'claimAlertDelivery')
        .mockResolvedValue({
          claimed: true,
          delivery: {
            id: 'delivery-send-1',
          },
        } as any);

      jest
        .spyOn(service, 'dispatchAlertDelivery')
        .mockResolvedValue({
          deliveryId: 'delivery-send-1',
          status: PopulationDeliveryStatus.SENT,
        } as any);

      await service.sendAlert(
        'building-1',
        'alert-send-1',
      );

      expect(
        prisma.populationAlert.updateMany,
      ).toHaveBeenNthCalledWith(
        2,
        {
          where: {
            id: 'alert-send-1',
            programId: 'program-1',
            status: PopulationAlertStatus.SENDING,
          },
          data: {
            status: PopulationAlertStatus.ACTIVE,
            activatedAt: expect.any(Date),
          },
        },
      );
    });

    it('passe FAILED lorsque toutes les livraisons ont échoué', async () => {
      jest
        .spyOn(service, 'claimAlertDelivery')
        .mockResolvedValue({
          claimed: true,
          delivery: {
            id: 'delivery-send-1',
          },
        } as any);

      jest
        .spyOn(service, 'dispatchAlertDelivery')
        .mockResolvedValue({
          deliveryId: 'delivery-send-1',
          status: PopulationDeliveryStatus.FAILED,
        } as any);

      prisma.populationAlertDelivery.groupBy.mockResolvedValue([
        {
          status: PopulationDeliveryStatus.FAILED,
          _count: {
            _all: 1,
          },
        },
      ] as any);

      await service.sendAlert(
        'building-1',
        'alert-send-1',
      );

      expect(
        prisma.populationAlert.updateMany,
      ).toHaveBeenNthCalledWith(
        2,
        {
          where: {
            id: 'alert-send-1',
            programId: 'program-1',
            status: PopulationAlertStatus.SENDING,
          },
          data: {
            status: PopulationAlertStatus.FAILED,
          },
        },
      );
    });

    it('refuse l’envoi lorsque les destinataires ne sont pas figés', async () => {
      prisma.populationAlert.findFirst.mockResolvedValue({
        ...readyAlert,
        recipientsFrozenAt: null,
      });

      await expect(
        service.sendAlert(
          'building-1',
          'alert-send-1',
        ),
      ).rejects.toThrow(
        'Les destinataires doivent être figés avant l’envoi',
      );

      expect(
        prisma.populationAlertDelivery.count,
      ).not.toHaveBeenCalled();

      expect(
        prisma.populationAlert.updateMany,
      ).not.toHaveBeenCalled();
    });

    it('refuse l’envoi lorsque le roster figé est vide', async () => {
      prisma.populationAlertDelivery.count.mockResolvedValue(
        0,
      );

      await expect(
        service.sendAlert(
          'building-1',
          'alert-send-1',
        ),
      ).rejects.toThrow(
        'Aucun destinataire figé pour cette alerte',
      );

      expect(
        prisma.populationAlert.updateMany,
      ).not.toHaveBeenCalled();
    });

    it('un second orchestrateur ne diffuse rien lorsqu’il perd le claim de l’alerte', async () => {
      prisma.populationAlert.updateMany.mockResolvedValue({
        count: 0,
      });

      const claimSpy = jest.spyOn(
        service,
        'claimAlertDelivery',
      );

      const dispatchSpy = jest.spyOn(
        service,
        'dispatchAlertDelivery',
      );

      await service.sendAlert(
        'building-1',
        'alert-send-1',
      );

      expect(claimSpy).not.toHaveBeenCalled();

      expect(dispatchSpy).not.toHaveBeenCalled();

      expect(
        prisma.populationAlertDelivery.findMany,
      ).not.toHaveBeenCalled();
    });
  });

  describe('claimAlertDelivery', () => {
    const activeProfile = {
      id: 'profile-1',
      buildingId: 'building-1',
      assessmentStatus:
        RueAssessmentStatus.CONFIRMED_SUBJECT,
      populationEnabled: true,
      populationProgram: {
        id: 'program-1',
        status: PopulationProgramStatus.ACTIVE,
        smsEnabled: true,
        emailEnabled: true,
      },
    };

    const approvedAlert = {
      id: 'alert-1',
      programId: 'program-1',
      status: PopulationAlertStatus.SENDING,
      approvedByType: 'CLIENT_USER',
      approvedById: 'client-user-1',
      approvedAt: new Date(
        '2026-09-17T16:00:00.000Z',
      ),
      zones: [],
    };

    beforeEach(() => {
      prisma.rueFacilityProfile.findUnique.mockResolvedValue(
        activeProfile,
      );

      prisma.populationAlert.findFirst.mockResolvedValue(
        approvedAlert,
      );

      prisma.populationAlertDelivery.updateMany.mockResolvedValue({
        count: 1,
      });

      prisma.populationAlertDelivery.findFirst.mockResolvedValue({
        id: 'delivery-1',
        channel: PopulationAlertChannel.SMS,
        status: PopulationDeliveryStatus.SENDING,
        language: PopulationPreferredLanguage.FR,
        messageSnapshot: 'Mettez-vous à l’abri.',
        destinationSnapshot: '+15145550101',
        queuedAt: new Date(
          '2026-09-17T16:01:00.000Z',
        ),
      });
    });

    it('claim atomiquement une livraison QUEUED en SENDING', async () => {
      const result =
        await service.claimAlertDelivery(
          'building-1',
          'alert-1',
          'delivery-1',
        );

      expect(
        prisma.populationAlertDelivery.updateMany,
      ).toHaveBeenCalledWith({
        where: {
          id: 'delivery-1',
          alertId: 'alert-1',
          status: PopulationDeliveryStatus.QUEUED,
        },
        data: {
          status: PopulationDeliveryStatus.SENDING,
        },
      });

      expect(result).toEqual({
        claimed: true,
        delivery: expect.objectContaining({
          id: 'delivery-1',
          status: PopulationDeliveryStatus.SENDING,
        }),
      });
    });

    it('un second worker ne peut pas réclamer une livraison déjà claimée', async () => {
      prisma.populationAlertDelivery.updateMany.mockResolvedValue({
        count: 0,
      });

      const result =
        await service.claimAlertDelivery(
          'building-1',
          'alert-1',
          'delivery-1',
        );

      expect(result).toEqual({
        claimed: false,
        delivery: null,
      });

      expect(
        prisma.populationAlertDelivery.findFirst,
      ).not.toHaveBeenCalled();
    });

    it('le claim est lié à alertId et ne peut pas capturer une livraison d’une autre alerte', async () => {
      prisma.populationAlertDelivery.updateMany.mockResolvedValue({
        count: 0,
      });

      await service.claimAlertDelivery(
        'building-1',
        'alert-1',
        'delivery-other-alert',
      );

      expect(
        prisma.populationAlertDelivery.updateMany,
      ).toHaveBeenCalledWith({
        where: {
          id: 'delivery-other-alert',
          alertId: 'alert-1',
          status: PopulationDeliveryStatus.QUEUED,
        },
        data: {
          status: PopulationDeliveryStatus.SENDING,
        },
      });
    });

    it('refuse tout claim avant approbation humaine', async () => {
      prisma.populationAlert.findFirst.mockResolvedValue({
        ...approvedAlert,
        approvedByType: null,
        approvedById: null,
        approvedAt: null,
      });

      await expect(
        service.claimAlertDelivery(
          'building-1',
          'alert-1',
          'delivery-1',
        ),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(
        prisma.populationAlertDelivery.updateMany,
      ).not.toHaveBeenCalled();
    });

    it.each([
      PopulationAlertStatus.DRAFT,
      PopulationAlertStatus.READY,
      PopulationAlertStatus.ACTIVE,
      PopulationAlertStatus.ENDED,
      PopulationAlertStatus.CANCELLED,
      PopulationAlertStatus.FAILED,
    ])(
      'refuse le claim lorsque l’alerte est %s',
      async (status) => {
        prisma.populationAlert.findFirst.mockResolvedValue({
          ...approvedAlert,
          status,
        });

        await expect(
          service.claimAlertDelivery(
            'building-1',
            'alert-1',
            'delivery-1',
          ),
        ).rejects.toBeInstanceOf(BadRequestException);

        expect(
          prisma.populationAlertDelivery.updateMany,
        ).not.toHaveBeenCalled();
      },
    );

    it('ne modifie aucun horodatage SENT lors du claim', async () => {
      await service.claimAlertDelivery(
        'building-1',
        'alert-1',
        'delivery-1',
      );

      const update =
        prisma.populationAlertDelivery.updateMany.mock
          .calls[0][0].data;

      expect(update).toEqual({
        status: PopulationDeliveryStatus.SENDING,
      });

      expect(update).not.toHaveProperty('sentAt');
      expect(update).not.toHaveProperty('deliveredAt');
    });

    it('échoue explicitement si le delivery disparaît après un claim réussi', async () => {
      prisma.populationAlertDelivery.findFirst.mockResolvedValue(
        null,
      );

      await expect(
        service.claimAlertDelivery(
          'building-1',
          'alert-1',
          'delivery-1',
        ),
      ).rejects.toThrow(
        'La livraison réclamée est introuvable après le claim atomique',
      );
    });

    it('ne déclenche toujours aucun fournisseur pendant le claim', async () => {
      await service.claimAlertDelivery(
        'building-1',
        'alert-1',
        'delivery-1',
      );

      /*
       * À ce stade, le seul effet métier doit être
       * QUEUED -> SENDING.
       */
      expect(
        prisma.populationAlertDelivery.updateMany,
      ).toHaveBeenCalledTimes(1);

      expect(
        prisma.populationAlertDelivery.create,
      ).not.toHaveBeenCalled();
    });
  });

  describe('dispatchAlertDelivery', () => {
    const activeProfile = {
      id: 'profile-1',
      buildingId: 'building-1',
      assessmentStatus:
        RueAssessmentStatus.CONFIRMED_SUBJECT,
      populationEnabled: true,
      populationProgram: {
        id: 'program-1',
        status: PopulationProgramStatus.ACTIVE,
        smsEnabled: true,
        emailEnabled: true,
      },
    };

    const approvedAlert = {
      id: 'alert-1',
      programId: 'program-1',
      status: PopulationAlertStatus.SENDING,
      titleFR: 'Alerte ammoniac',
      titleEN: 'Ammonia alert',
      approvedByType: 'CLIENT_USER',
      approvedById: 'client-user-1',
      approvedAt: new Date(
        '2026-09-17T16:00:00.000Z',
      ),
      zones: [],
    };

    const sendingSms = {
      id: 'delivery-1',
      alertId: 'alert-1',
      channel: PopulationAlertChannel.SMS,
      status: PopulationDeliveryStatus.SENDING,
      language: PopulationPreferredLanguage.FR,
      messageSnapshot:
        'Mettez-vous immédiatement à l’abri.',
      destinationSnapshot: '+15145550101',
    };

    beforeEach(() => {
      prisma.rueFacilityProfile.findUnique.mockResolvedValue(
        activeProfile,
      );

      prisma.populationAlert.findFirst.mockResolvedValue(
        approvedAlert,
      );

      prisma.populationAlertDelivery.findFirst.mockResolvedValue(
        sendingSms,
      );

      prisma.populationAlertDelivery.updateMany.mockResolvedValue({
        count: 1,
      });

      populationDeliveryService.sendSms.mockResolvedValue({
        provider: 'BREVO',
        providerMessageId: 'brevo-sms-123',
      });

      populationDeliveryService.sendEmail.mockResolvedValue({
        provider: 'BREVO',
        providerMessageId: 'brevo-email-123',
      });
    });

    it('diffuse un SMS SENDING et le marque SENT', async () => {
      const result =
        await service.dispatchAlertDelivery(
          'building-1',
          'alert-1',
          'delivery-1',
        );

      expect(
        populationDeliveryService.sendSms,
      ).toHaveBeenCalledWith(
        '+15145550101',
        'Mettez-vous immédiatement à l’abri.',
      );

      expect(
        prisma.populationAlertDelivery.updateMany,
      ).toHaveBeenCalledWith({
        where: {
          id: 'delivery-1',
          alertId: 'alert-1',
          status: PopulationDeliveryStatus.SENDING,
        },
        data: expect.objectContaining({
          status: PopulationDeliveryStatus.SENT,
          provider: 'BREVO',
          providerMessageId: 'brevo-sms-123',
          sentAt: expect.any(Date),
          failedAt: null,
          errorCode: null,
          errorMessage: null,
        }),
      });

      expect(result).toEqual(
        expect.objectContaining({
          deliveryId: 'delivery-1',
          status: PopulationDeliveryStatus.SENT,
          provider: 'BREVO',
          providerMessageId: 'brevo-sms-123',
        }),
      );
    });

    it('diffuse un EMAIL SENDING avec le sujet dans la langue du destinataire', async () => {
      prisma.populationAlertDelivery.findFirst.mockResolvedValue({
        ...sendingSms,
        channel: PopulationAlertChannel.EMAIL,
        language: PopulationPreferredLanguage.EN,
        destinationSnapshot:
          'citizen@example.com',
        messageSnapshot:
          'Shelter in place immediately.',
      });

      await service.dispatchAlertDelivery(
        'building-1',
        'alert-1',
        'delivery-1',
      );

      expect(
        populationDeliveryService.sendEmail,
      ).toHaveBeenCalledWith({
        destination: 'citizen@example.com',
        subject: 'Ammonia alert',
        html: '<p>Shelter in place immediately.</p>',
      });

      expect(
        populationDeliveryService.sendSms,
      ).not.toHaveBeenCalled();
    });

    it('retombe sur le titre FR pour un EMAIL EN sans titleEN', async () => {
      prisma.populationAlert.findFirst.mockResolvedValue({
        ...approvedAlert,
        titleEN: null,
      });

      prisma.populationAlertDelivery.findFirst.mockResolvedValue({
        ...sendingSms,
        channel: PopulationAlertChannel.EMAIL,
        language: PopulationPreferredLanguage.EN,
        destinationSnapshot:
          'citizen@example.com',
        messageSnapshot:
          'Shelter in place immediately.',
      });

      await service.dispatchAlertDelivery(
        'building-1',
        'alert-1',
        'delivery-1',
      );

      expect(
        populationDeliveryService.sendEmail,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: 'Alerte ammoniac',
        }),
      );
    });

    it('échappe le contenu citoyen avant de construire le HTML courriel', async () => {
      prisma.populationAlertDelivery.findFirst.mockResolvedValue({
        ...sendingSms,
        channel: PopulationAlertChannel.EMAIL,
        destinationSnapshot:
          'citizen@example.com',
        messageSnapshot:
          '<script>alert("x")</script>\nRestez à l’abri.',
      });

      await service.dispatchAlertDelivery(
        'building-1',
        'alert-1',
        'delivery-1',
      );

      expect(
        populationDeliveryService.sendEmail,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          html:
            '<p>&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;<br>Restez à l’abri.</p>',
        }),
      );
    });

    it('refuse d’envoyer directement une livraison QUEUED', async () => {
      prisma.populationAlertDelivery.findFirst.mockResolvedValue({
        ...sendingSms,
        status: PopulationDeliveryStatus.QUEUED,
      });

      await expect(
        service.dispatchAlertDelivery(
          'building-1',
          'alert-1',
          'delivery-1',
        ),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(
        populationDeliveryService.sendSms,
      ).not.toHaveBeenCalled();

      expect(
        populationDeliveryService.sendEmail,
      ).not.toHaveBeenCalled();
    });

    it.each([
      PopulationDeliveryStatus.SENT,
      PopulationDeliveryStatus.DELIVERED,
      PopulationDeliveryStatus.FAILED,
      PopulationDeliveryStatus.CANCELLED,
    ])(
      'refuse de rediffuser une livraison %s',
      async (status) => {
        prisma.populationAlertDelivery.findFirst.mockResolvedValue({
          ...sendingSms,
          status,
        });

        await expect(
          service.dispatchAlertDelivery(
            'building-1',
            'alert-1',
            'delivery-1',
          ),
        ).rejects.toBeInstanceOf(BadRequestException);

        expect(
          populationDeliveryService.sendSms,
        ).not.toHaveBeenCalled();
      },
    );

    it('marque FAILED lorsqu’une destination est absente sans appeler Brevo', async () => {
      prisma.populationAlertDelivery.findFirst.mockResolvedValue({
        ...sendingSms,
        destinationSnapshot: null,
      });

      const result =
        await service.dispatchAlertDelivery(
          'building-1',
          'alert-1',
          'delivery-1',
        );

      expect(
        populationDeliveryService.sendSms,
      ).not.toHaveBeenCalled();

      expect(
        prisma.populationAlertDelivery.updateMany,
      ).toHaveBeenCalledWith({
        where: {
          id: 'delivery-1',
          alertId: 'alert-1',
          status: PopulationDeliveryStatus.SENDING,
        },
        data: expect.objectContaining({
          status: PopulationDeliveryStatus.FAILED,
          failedAt: expect.any(Date),
          errorCode: 'DESTINATION_MISSING',
        }),
      });

      expect(result.status).toBe(
        PopulationDeliveryStatus.FAILED,
      );
    });

    it('marque FAILED lors d’une erreur fournisseur contrôlée', async () => {
      populationDeliveryService.sendSms.mockRejectedValue(
        new PopulationProviderError(
          'BREVO_HTTP_429',
          'Too many requests',
        ),
      );

      const result =
        await service.dispatchAlertDelivery(
          'building-1',
          'alert-1',
          'delivery-1',
        );

      expect(
        prisma.populationAlertDelivery.updateMany,
      ).toHaveBeenCalledWith({
        where: {
          id: 'delivery-1',
          alertId: 'alert-1',
          status: PopulationDeliveryStatus.SENDING,
        },
        data: expect.objectContaining({
          status: PopulationDeliveryStatus.FAILED,
          failedAt: expect.any(Date),
          errorCode: 'BREVO_HTTP_429',
          errorMessage: 'Too many requests',
        }),
      });

      expect(result).toEqual(
        expect.objectContaining({
          status: PopulationDeliveryStatus.FAILED,
          errorCode: 'BREVO_HTTP_429',
        }),
      );
    });

    it('ne conserve pas le détail d’une erreur interne arbitraire', async () => {
      populationDeliveryService.sendSms.mockRejectedValue(
        new Error(
          'secret +15145550999 citizen@example.com',
        ),
      );

      await service.dispatchAlertDelivery(
        'building-1',
        'alert-1',
        'delivery-1',
      );

      expect(
        prisma.populationAlertDelivery.updateMany,
      ).toHaveBeenCalledWith({
        where: expect.any(Object),
        data: expect.objectContaining({
          status: PopulationDeliveryStatus.FAILED,
          errorCode: 'DELIVERY_INTERNAL_ERROR',
          errorMessage:
            'Erreur interne lors de la diffusion',
        }),
      });

      const serialized = JSON.stringify(
        prisma.populationAlertDelivery.updateMany.mock
          .calls[0][0],
      );

      expect(serialized).not.toContain(
        '+15145550999',
      );

      expect(serialized).not.toContain(
        'citizen@example.com',
      );
    });

    it('refuse une livraison appartenant à une autre alerte', async () => {
      prisma.populationAlertDelivery.findFirst.mockResolvedValue(
        null,
      );

      await expect(
        service.dispatchAlertDelivery(
          'building-1',
          'alert-1',
          'delivery-other',
        ),
      ).rejects.toBeInstanceOf(NotFoundException);

      expect(
        populationDeliveryService.sendSms,
      ).not.toHaveBeenCalled();
    });

    it('refuse toute diffusion avant approbation humaine', async () => {
      prisma.populationAlert.findFirst.mockResolvedValue({
        ...approvedAlert,
        approvedByType: null,
        approvedById: null,
        approvedAt: null,
      });

      await expect(
        service.dispatchAlertDelivery(
          'building-1',
          'alert-1',
          'delivery-1',
        ),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(
        populationDeliveryService.sendSms,
      ).not.toHaveBeenCalled();
    });
  });

  describe('getSubscriberProfile', () => {
    const createAccessToken = (
      subscriberId = 'subscriber-1',
      programId = 'program-1',
      expiresAt = Date.now() + 30 * 60 * 1000,
    ) => {
      const crypto = require('crypto');

      const encodedPayload = Buffer.from(
        JSON.stringify({
          subscriberId,
          programId,
          exp: expiresAt,
        }),
      ).toString('base64url');

      const signature = crypto
        .createHmac(
          'sha256',
          'test-population-access-secret-not-for-production',
        )
        .update(encodedPayload)
        .digest('base64url');

      return `${encodedPayload}.${signature}`;
    };

    beforeEach(() => {
      prisma.populationProgram.findUnique.mockResolvedValue({
        id: 'program-1',
      });

      prisma.populationSubscriber.findFirst.mockResolvedValue({
        id: 'subscriber-1',
        status: PopulationSubscriberStatus.ACTIVE,
        preferredLanguage: PopulationPreferredLanguage.FR,
        phone: '+14505551234',
        email: 'citoyen@example.com',
        smsEnabled: true,
        emailEnabled: true,
        verifiedAt: new Date('2026-09-17T12:00:00Z'),
        unsubscribedAt: null,
      });
    });

    it('retourne le profil authentifié avec les coordonnées masquées', async () => {
      const result = await service.getSubscriberProfile(
        'sobeys-boucherville',
        'subscriber-1',
        {
          accessToken: createAccessToken(),
        },
      );

      expect(result).toEqual({
        id: 'subscriber-1',
        status: PopulationSubscriberStatus.ACTIVE,
        preferredLanguage: PopulationPreferredLanguage.FR,
        channels: {
          sms: {
            available: true,
            enabled: true,
            destination: '********1234',
          },
          email: {
            available: true,
            enabled: true,
            destination: 'c***@example.com',
          },
        },
        verifiedAt: new Date('2026-09-17T12:00:00Z'),
        unsubscribedAt: null,
      });
    });

    it('ne retourne pas de destination pour un canal absent', async () => {
      prisma.populationSubscriber.findFirst.mockResolvedValue({
        id: 'subscriber-1',
        status: PopulationSubscriberStatus.ACTIVE,
        preferredLanguage: PopulationPreferredLanguage.EN,
        phone: null,
        email: 'a@example.com',
        smsEnabled: false,
        emailEnabled: true,
        verifiedAt: new Date('2026-09-17T12:00:00Z'),
        unsubscribedAt: null,
      });

      const result = await service.getSubscriberProfile(
        'sobeys-boucherville',
        'subscriber-1',
        {
          accessToken: createAccessToken(),
        },
      );

      expect(result.channels.sms).toEqual({
        available: false,
        enabled: false,
        destination: null,
      });

      expect(result.channels.email).toEqual({
        available: true,
        enabled: true,
        destination: '*@example.com',
      });
    });

    it('refuse un jeton appartenant à un autre abonné', async () => {
      await expect(
        service.getSubscriberProfile(
          'sobeys-boucherville',
          'subscriber-1',
          {
            accessToken: createAccessToken(
              'subscriber-2',
              'program-1',
            ),
          },
        ),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(
        prisma.populationSubscriber.findFirst,
      ).not.toHaveBeenCalled();
    });

    it('refuse un jeton expiré', async () => {
      await expect(
        service.getSubscriberProfile(
          'sobeys-boucherville',
          'subscriber-1',
          {
            accessToken: createAccessToken(
              'subscriber-1',
              'program-1',
              Date.now() - 1000,
            ),
          },
        ),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(
        prisma.populationSubscriber.findFirst,
      ).not.toHaveBeenCalled();
    });
  });

  describe('updateSubscriberPreferences', () => {
    const createAccessToken = (
      subscriberId = 'subscriber-1',
      programId = 'program-1',
    ) => {
      const crypto = require('crypto');

      const encodedPayload = Buffer.from(
        JSON.stringify({
          subscriberId,
          programId,
          exp: Date.now() + 30 * 60 * 1000,
        }),
      ).toString('base64url');

      const signature = crypto
        .createHmac(
          'sha256',
          'test-population-access-secret-not-for-production',
        )
        .update(encodedPayload)
        .digest('base64url');

      return `${encodedPayload}.${signature}`;
    };

    const activeSubscriber = {
      id: 'subscriber-1',
      programId: 'program-1',
      status: PopulationSubscriberStatus.ACTIVE,
      preferredLanguage: PopulationPreferredLanguage.FR,
      phone: '+14505551234',
      email: 'citoyen@example.com',
      smsEnabled: true,
      emailEnabled: false,
      verifiedAt: new Date('2026-09-17T12:00:00Z'),
      unsubscribedAt: null,
    };

    beforeEach(() => {
      prisma.populationProgram.findUnique.mockResolvedValue({
        id: 'program-1',
        consentVersion: '2026-09-v1',
      });

      prisma.populationSubscriber.findFirst.mockResolvedValue(
        activeSubscriber,
      );

      prisma.populationSubscriber.update.mockResolvedValue({
        ...activeSubscriber,
        preferredLanguage: PopulationPreferredLanguage.EN,
      });

      prisma.populationConsentEvent.create.mockResolvedValue({
        id: 'consent-preferences-1',
      });

      prisma.$transaction.mockImplementation(
        async (callback: (tx: typeof prisma) => unknown) =>
          callback(prisma),
      );
    });

    it('modifie la langue et crée une preuve CONSENT_UPDATED', async () => {
      const result =
        await service.updateSubscriberPreferences(
          'sobeys-boucherville',
          'subscriber-1',
          {
            accessToken: createAccessToken(),
            preferredLanguage:
              PopulationPreferredLanguage.EN,
          },
        );

      expect(
        prisma.populationSubscriber.update,
      ).toHaveBeenCalledWith({
        where: {
          id: 'subscriber-1',
        },
        data: {
          preferredLanguage:
            PopulationPreferredLanguage.EN,
        },
      });

      expect(
        prisma.populationConsentEvent.create,
      ).toHaveBeenCalledWith({
        data: {
          programId: 'program-1',
          subscriberId: 'subscriber-1',
          type:
            PopulationConsentEventType.CONSENT_UPDATED,
          consentVersion: '2026-09-v1',
          smsEnabled: true,
          emailEnabled: false,
          source: 'PUBLIC_PORTAL',
          occurredAt: expect.any(Date),
        },
      });

      expect(result).toEqual({
        updated: true,
        preferredLanguage:
          PopulationPreferredLanguage.EN,
      });
    });

    it('est idempotent lorsque la langue ne change pas', async () => {
      const result =
        await service.updateSubscriberPreferences(
          'sobeys-boucherville',
          'subscriber-1',
          {
            accessToken: createAccessToken(),
            preferredLanguage:
              PopulationPreferredLanguage.FR,
          },
        );

      expect(result).toEqual({
        updated: false,
        preferredLanguage:
          PopulationPreferredLanguage.FR,
      });

      expect(
        prisma.populationSubscriber.update,
      ).not.toHaveBeenCalled();

      expect(
        prisma.populationConsentEvent.create,
      ).not.toHaveBeenCalled();
    });

    it('refuse la modification pour un abonné non ACTIVE', async () => {
      prisma.populationSubscriber.findFirst.mockResolvedValue({
        ...activeSubscriber,
        status:
          PopulationSubscriberStatus.PENDING_VERIFICATION,
      });

      await expect(
        service.updateSubscriberPreferences(
          'sobeys-boucherville',
          'subscriber-1',
          {
            accessToken: createAccessToken(),
            preferredLanguage:
              PopulationPreferredLanguage.EN,
          },
        ),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(
        prisma.populationSubscriber.update,
      ).not.toHaveBeenCalled();

      expect(
        prisma.populationConsentEvent.create,
      ).not.toHaveBeenCalled();
    });

    it('refuse un jeton appartenant à un autre programme', async () => {
      await expect(
        service.updateSubscriberPreferences(
          'sobeys-boucherville',
          'subscriber-1',
          {
            accessToken: createAccessToken(
              'subscriber-1',
              'program-2',
            ),
            preferredLanguage:
              PopulationPreferredLanguage.EN,
          },
        ),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(
        prisma.populationSubscriber.findFirst,
      ).not.toHaveBeenCalled();

      expect(
        prisma.populationSubscriber.update,
      ).not.toHaveBeenCalled();
    });
  });

  describe('unsubscribeSubscriber', () => {
    const program = {
      id: 'program-1',
      consentVersion: '2026-09-v1',
    };

    const activeSubscriber = {
      id: 'subscriber-1',
      programId: 'program-1',
      status: PopulationSubscriberStatus.ACTIVE,
      smsEnabled: true,
      emailEnabled: false,
      unsubscribedAt: null,
    };

    const createAccessToken = (
      subscriberId = 'subscriber-1',
      programId = 'program-1',
      expiresAt = Date.now() + 30 * 60 * 1000,
    ) => {
      const crypto = require('crypto');

      const encodedPayload = Buffer.from(
        JSON.stringify({
          subscriberId,
          programId,
          exp: expiresAt,
        }),
      ).toString('base64url');

      const signature = crypto
        .createHmac(
          'sha256',
          'test-population-access-secret-not-for-production',
        )
        .update(encodedPayload)
        .digest('base64url');

      return `${encodedPayload}.${signature}`;
    };

    beforeEach(() => {
      prisma.populationProgram.findUnique.mockResolvedValue(
        program,
      );

      prisma.populationSubscriber.findFirst.mockResolvedValue(
        activeSubscriber,
      );

      prisma.populationSubscriber.update.mockResolvedValue({
        ...activeSubscriber,
        status: PopulationSubscriberStatus.UNSUBSCRIBED,
        smsEnabled: false,
        emailEnabled: false,
        unsubscribedAt: new Date(),
      });

      prisma.populationConsentEvent.create.mockResolvedValue({
        id: 'consent-unsubscribe-1',
      });

      prisma.$transaction.mockImplementation(
        async (callback: (tx: typeof prisma) => unknown) =>
          callback(prisma),
      );
    });

    it('désabonne un abonné ACTIVE avec un jeton valide', async () => {
      const result = await service.unsubscribeSubscriber(
        'sobeys-boucherville',
        'subscriber-1',
        {
          accessToken: createAccessToken(),
        },
      );

      expect(
        prisma.populationSubscriber.update,
      ).toHaveBeenCalledWith({
        where: {
          id: 'subscriber-1',
        },
        data: {
          status: PopulationSubscriberStatus.UNSUBSCRIBED,
          smsEnabled: false,
          emailEnabled: false,
          unsubscribedAt: expect.any(Date),
        },
      });

      expect(
        prisma.populationConsentEvent.create,
      ).toHaveBeenCalledWith({
        data: {
          programId: 'program-1',
          subscriberId: 'subscriber-1',
          type: PopulationConsentEventType.UNSUBSCRIBED,
          consentVersion: '2026-09-v1',
          smsEnabled: false,
          emailEnabled: false,
          source: 'PUBLIC_PORTAL',
          occurredAt: expect.any(Date),
        },
      });

      expect(result).toEqual({
        unsubscribed: true,
        status: PopulationSubscriberStatus.UNSUBSCRIBED,
      });
    });

    it('refuse un jeton dont la signature est invalide', async () => {
      const validToken = createAccessToken();
      const [payload] = validToken.split('.');

      await expect(
        service.unsubscribeSubscriber(
          'sobeys-boucherville',
          'subscriber-1',
          {
            accessToken: `${payload}.signature-invalide`,
          },
        ),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(
        prisma.populationSubscriber.update,
      ).not.toHaveBeenCalled();
    });

    it('refuse un jeton expiré', async () => {
      await expect(
        service.unsubscribeSubscriber(
          'sobeys-boucherville',
          'subscriber-1',
          {
            accessToken: createAccessToken(
              'subscriber-1',
              'program-1',
              Date.now() - 1000,
            ),
          },
        ),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(
        prisma.populationSubscriber.update,
      ).not.toHaveBeenCalled();
    });

    it('refuse un jeton appartenant à un autre abonné', async () => {
      await expect(
        service.unsubscribeSubscriber(
          'sobeys-boucherville',
          'subscriber-1',
          {
            accessToken: createAccessToken(
              'subscriber-2',
              'program-1',
            ),
          },
        ),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(
        prisma.populationSubscriber.update,
      ).not.toHaveBeenCalled();
    });

    it('refuse un jeton appartenant à un autre programme', async () => {
      await expect(
        service.unsubscribeSubscriber(
          'sobeys-boucherville',
          'subscriber-1',
          {
            accessToken: createAccessToken(
              'subscriber-1',
              'program-2',
            ),
          },
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('est idempotent lorsque l’abonné est déjà UNSUBSCRIBED', async () => {
      prisma.populationSubscriber.findFirst.mockResolvedValue({
        ...activeSubscriber,
        status: PopulationSubscriberStatus.UNSUBSCRIBED,
        smsEnabled: false,
        emailEnabled: false,
        unsubscribedAt: new Date(),
      });

      const result = await service.unsubscribeSubscriber(
        'sobeys-boucherville',
        'subscriber-1',
        {
          accessToken: createAccessToken(),
        },
      );

      expect(result).toEqual({
        unsubscribed: true,
        status: PopulationSubscriberStatus.UNSUBSCRIBED,
      });

      expect(
        prisma.populationSubscriber.update,
      ).not.toHaveBeenCalled();

      expect(
        prisma.populationConsentEvent.create,
      ).not.toHaveBeenCalled();
    });
  });
});