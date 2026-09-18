import {
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';

/**
 * ClientPortalService dépend d'ExportService, lequel charge Puppeteer.
 * Puppeteer est ESM et n'a pas besoin d'être chargé pour ces tests unitaires.
 *
 * On remplace donc le module ExportService avant l'import du service testé.
 */
jest.mock('../export/export.service', () => ({
  ExportService: class ExportService {},
}));

const { ClientPortalService } = require('./client-portal.service');

describe('ClientPortalService - Sentinelle Population', () => {
  let service: InstanceType<typeof ClientPortalService>;

  const prisma = {
    building: {
      findFirst: jest.fn(),
    },
    rueFacilityProfile: {
      findUnique: jest.fn(),
    },
  };

    const populationService = {
    getProgramConfiguration: jest.fn(),
    configureProgram: jest.fn(),
    markReady: jest.fn(),
    activateProgram: jest.fn(),
    suspendProgram: jest.fn(),
    archiveProgram: jest.fn(),
    getAvailableScenarios: jest.fn(),
    getScenarioPopulationPreview: jest.fn(),
    createAlertDraft: jest.fn(),
    getAlert: jest.fn(),
    getAlertDeliveryStatus: jest.fn(),
    updateAlertDraft: jest.fn(),
    refreshAlertDraftTargeting: jest.fn(),
    markAlertDraftReady: jest.fn(),
    approveAlert: jest.fn(),
    freezeAlertRecipients: jest.fn(),
    sendAlert: jest.fn(),
    createIncidentFollowUpDraft: jest.fn(),
    getIncidentAlertHistory: jest.fn(),
    endAlert: jest.fn(),
    cancelAlert: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    service = new ClientPortalService(
      prisma as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      populationService as any,
    );
  });

  describe('assertBuildingAccess', () => {
    it('refuse un bâtiment inexistant ou appartenant à une autre organisation', async () => {
      prisma.building.findFirst.mockResolvedValue(null);

      await expect(
        service.assertBuildingAccess('building-1', {
          clientId: 'client-1',
          organizationId: 'org-1',
          role: 'CLIENT_MANAGER',
          buildingIds: ['building-1'],
        }),
      ).rejects.toBeInstanceOf(NotFoundException);

      expect(prisma.building.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'building-1',
          organizationId: 'org-1',
        },
        select: {
          id: true,
          clientId: true,
        },
      });
    });

    it('autorise un CLIENT_MANAGER pour un buildingId explicitement autorisé', async () => {
      prisma.building.findFirst.mockResolvedValue({
        id: 'building-1',
        clientId: 'client-1',
      });

      await expect(
        service.assertBuildingAccess('building-1', {
          clientId: 'client-1',
          organizationId: 'org-1',
          role: 'CLIENT_MANAGER',
          buildingIds: ['building-1'],
        }),
      ).resolves.toEqual({
        id: 'building-1',
        clientId: 'client-1',
      });
    });

    it('refuse un CLIENT_MANAGER pour un buildingId non autorisé', async () => {
      prisma.building.findFirst.mockResolvedValue({
        id: 'building-2',
        clientId: 'client-1',
      });

      await expect(
        service.assertBuildingAccess('building-2', {
          clientId: 'client-1',
          organizationId: 'org-1',
          role: 'CLIENT_MANAGER',
          buildingIds: ['building-1'],
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('limite un CLIENT_MANAGER sans buildingIds aux bâtiments de son client', async () => {
      prisma.building.findFirst.mockResolvedValue({
        id: 'building-2',
        clientId: 'client-2',
      });

      await expect(
        service.assertBuildingAccess('building-2', {
          clientId: 'client-1',
          organizationId: 'org-1',
          role: 'CLIENT_MANAGER',
          buildingIds: [],
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('getPopulationStatus', () => {
    const actor = {
      clientId: 'client-1',
      organizationId: 'org-1',
      role: 'CLIENT_MANAGER',
      buildingIds: ['building-1'],
    };

    beforeEach(() => {
      prisma.building.findFirst.mockResolvedValue({
        id: 'building-1',
        clientId: 'client-1',
      });
    });

    it('retourne NOT_ASSESSED lorsqu’aucun profil RUE n’existe', async () => {
      prisma.rueFacilityProfile.findUnique.mockResolvedValue(null);

      await expect(
        service.getPopulationStatus('building-1', actor),
      ).resolves.toEqual({
        eligible: false,
        rueStatus: 'NOT_ASSESSED',
        populationEnabled: false,
        programStatus: 'NOT_CONFIGURED',
      });
    });

    it('distingue un site RUE admissible d’un programme Population non activé', async () => {
      prisma.rueFacilityProfile.findUnique.mockResolvedValue({
        assessmentStatus: 'CONFIRMED_SUBJECT',
        populationEnabled: false,
        populationProgram: null,
      });

      await expect(
        service.getPopulationStatus('building-1', actor),
      ).resolves.toEqual({
        eligible: true,
        rueStatus: 'CONFIRMED_SUBJECT',
        populationEnabled: false,
        programStatus: 'NOT_CONFIGURED',
      });
    });

    it('retourne correctement un programme Population actif', async () => {
      prisma.rueFacilityProfile.findUnique.mockResolvedValue({
        assessmentStatus: 'CONFIRMED_SUBJECT',
        populationEnabled: true,
        populationProgram: {
          status: 'ACTIVE',
        },
      });

      await expect(
        service.getPopulationStatus('building-1', actor),
      ).resolves.toEqual({
        eligible: true,
        rueStatus: 'CONFIRMED_SUBJECT',
        populationEnabled: true,
        programStatus: 'ACTIVE',
      });
    });

    it('vérifie l’accès bâtiment avant de lire les données RUE', async () => {
      prisma.building.findFirst.mockResolvedValue(null);

      await expect(
        service.getPopulationStatus('building-1', actor),
      ).rejects.toBeInstanceOf(NotFoundException);

      expect(prisma.rueFacilityProfile.findUnique).not.toHaveBeenCalled();
    });
  });

  describe('getPopulationConfiguration', () => {
    const actor = {
      clientId: 'client-1',
      organizationId: 'org-1',
      role: 'CLIENT_MANAGER',
      buildingIds: ['building-1'],
    };

    it('délègue au PopulationService après validation de l’accès bâtiment', async () => {
      prisma.building.findFirst.mockResolvedValue({
        id: 'building-1',
        clientId: 'client-1',
      });

      populationService.getProgramConfiguration.mockResolvedValue({
        configured: false,
        rueFacilityProfileId: 'rue-profile-1',
        status: 'NOT_CONFIGURED',
        program: null,
      });

      await expect(
        service.getPopulationConfiguration('building-1', actor),
      ).resolves.toEqual({
        configured: false,
        rueFacilityProfileId: 'rue-profile-1',
        status: 'NOT_CONFIGURED',
        program: null,
      });

      expect(
        populationService.getProgramConfiguration,
      ).toHaveBeenCalledTimes(1);

      expect(
        populationService.getProgramConfiguration,
      ).toHaveBeenCalledWith('building-1');
    });

    it('ne délègue jamais au PopulationService lorsque l’accès bâtiment est refusé', async () => {
      prisma.building.findFirst.mockResolvedValue(null);

      await expect(
        service.getPopulationConfiguration('building-1', actor),
      ).rejects.toBeInstanceOf(NotFoundException);

      expect(
        populationService.getProgramConfiguration,
      ).not.toHaveBeenCalled();
    });
  });
    describe('Population command delegation', () => {
    const actor = {
      clientId: 'client-1',
      organizationId: 'org-1',
      role: 'CLIENT_MANAGER',
      buildingIds: ['building-1'],
    };

    const configureDto = {
      publicSlug: 'sobeys-boucherville',
      nameFR: 'Programme d’alerte publique',
      registrationEnabled: true,
      smsEnabled: true,
      emailEnabled: true,
      privacyTextFR: 'Texte de confidentialité',
      consentTextFR: 'Texte de consentement',
      consentVersion: '2026-09-17',
    };

    beforeEach(() => {
      prisma.building.findFirst.mockResolvedValue({
        id: 'building-1',
        clientId: 'client-1',
      });
    });

    it('délègue la configuration après validation de l’accès au bâtiment', async () => {
      populationService.configureProgram.mockResolvedValue({
        id: 'program-1',
      });

      await service.configurePopulationProgram(
        'building-1',
        configureDto,
        actor,
      );

      expect(prisma.building.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'building-1',
          organizationId: 'org-1',
        },
        select: {
          id: true,
          clientId: true,
        },
      });

      expect(populationService.configureProgram).toHaveBeenCalledWith(
        'building-1',
        configureDto,
      );
    });

    it('délègue le passage à READY après validation de l’accès', async () => {
      populationService.markReady.mockResolvedValue({
        status: 'READY',
      });

      await service.markPopulationReady('building-1', actor);

      expect(populationService.markReady).toHaveBeenCalledWith('building-1');
    });

    it('délègue l’activation après validation de l’accès', async () => {
      populationService.activateProgram.mockResolvedValue({
        status: 'ACTIVE',
      });

      await service.activatePopulationProgram('building-1', actor);

      expect(populationService.activateProgram).toHaveBeenCalledWith(
        'building-1',
      );
    });

    it('délègue la suspension après validation de l’accès', async () => {
      populationService.suspendProgram.mockResolvedValue({
        status: 'SUSPENDED',
      });

      await service.suspendPopulationProgram('building-1', actor);

      expect(populationService.suspendProgram).toHaveBeenCalledWith(
        'building-1',
      );
    });

    it('délègue l’archivage après validation de l’accès', async () => {
      populationService.archiveProgram.mockResolvedValue({
        status: 'ARCHIVED',
      });

      await service.archivePopulationProgram('building-1', actor);

      expect(populationService.archiveProgram).toHaveBeenCalledWith(
        'building-1',
      );
    });

    it.each([
      ['configure', 'configureProgram'],
      ['ready', 'markReady'],
      ['activate', 'activateProgram'],
      ['suspend', 'suspendProgram'],
      ['archive', 'archiveProgram'],
    ])(
      'ne délègue jamais la commande %s lorsque le bâtiment est hors périmètre',
      async (command, populationMethod) => {
        prisma.building.findFirst.mockResolvedValue(null);

        switch (command) {
          case 'configure':
            await expect(
              service.configurePopulationProgram(
                'building-forbidden',
                configureDto,
                actor,
              ),
            ).rejects.toBeInstanceOf(NotFoundException);
            break;

          case 'ready':
            await expect(
              service.markPopulationReady('building-forbidden', actor),
            ).rejects.toBeInstanceOf(NotFoundException);
            break;

          case 'activate':
            await expect(
              service.activatePopulationProgram('building-forbidden', actor),
            ).rejects.toBeInstanceOf(NotFoundException);
            break;

          case 'suspend':
            await expect(
              service.suspendPopulationProgram('building-forbidden', actor),
            ).rejects.toBeInstanceOf(NotFoundException);
            break;

          case 'archive':
            await expect(
              service.archivePopulationProgram('building-forbidden', actor),
            ).rejects.toBeInstanceOf(NotFoundException);
            break;
        }

        expect(
          populationService[
            populationMethod as keyof typeof populationService
          ],
        ).not.toHaveBeenCalled();
      },
    );
  });

  describe('getPopulationScenarioPreview', () => {
    const actor = {
      clientId: 'client-1',
      organizationId: 'org-1',
      role: 'CLIENT_MANAGER',
      buildingIds: ['building-1'],
    };

    beforeEach(() => {
      prisma.building.findFirst.mockResolvedValue({
        id: 'building-1',
        clientId: 'client-1',
      });
    });

    it('délègue le preview au PopulationService après validation de l’accès bâtiment', async () => {
      const preview = {
        scenario: {
          id: 'scenario-1',
          nameFR: 'Rejet accidentel d’ammoniac',
          nameEN: 'Accidental ammonia release',
        },
        population: {
          activeSubscriberCount: 25,
          geolocatedSubscriberCount: 22,
          unlocatedSubscriberCount: 3,
          uniqueTargetCount: 14,
          uniqueSmsTargetCount: 12,
          uniqueEmailTargetCount: 9,
        },
        zones: [],
      };

      populationService.getScenarioPopulationPreview.mockResolvedValue(
        preview,
      );

      await expect(
        service.getPopulationScenarioPreview(
          'building-1',
          'scenario-1',
          actor,
        ),
      ).resolves.toEqual(preview);

      expect(prisma.building.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'building-1',
          organizationId: 'org-1',
        },
        select: {
          id: true,
          clientId: true,
        },
      });

      expect(
        populationService.getScenarioPopulationPreview,
      ).toHaveBeenCalledTimes(1);

      expect(
        populationService.getScenarioPopulationPreview,
      ).toHaveBeenCalledWith(
        'building-1',
        'scenario-1',
      );
    });

    it('ne délègue jamais le preview lorsque le bâtiment est hors périmètre', async () => {
      prisma.building.findFirst.mockResolvedValue(null);

      await expect(
        service.getPopulationScenarioPreview(
          'building-forbidden',
          'scenario-1',
          actor,
        ),
      ).rejects.toBeInstanceOf(NotFoundException);

      expect(
        populationService.getScenarioPopulationPreview,
      ).not.toHaveBeenCalled();
    });

    it('respecte les restrictions buildingIds du CLIENT_MANAGER avant le calcul spatial', async () => {
      prisma.building.findFirst.mockResolvedValue({
        id: 'building-2',
        clientId: 'client-1',
      });

      await expect(
        service.getPopulationScenarioPreview(
          'building-2',
          'scenario-1',
          actor,
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);

      expect(
        populationService.getScenarioPopulationPreview,
      ).not.toHaveBeenCalled();
    });
  });

  describe('getPopulationScenarios', () => {
    const actor = {
      sub: 'client-user-1',
      clientId: 'client-1',
      organizationId: 'org-1',
      role: 'CLIENT_MANAGER',
      buildingIds: ['building-1'],
    };

    beforeEach(() => {
      prisma.building.findFirst.mockResolvedValue({
        id: 'building-1',
        clientId: 'client-1',
      });

      populationService.getAvailableScenarios.mockResolvedValue({
        scenarios: [
          {
            id: 'scenario-1',
            nameFR: 'Rejet accidentel d’ammoniac',
            operational: true,
          },
        ],
      });
    });

    it('valide le périmètre du bâtiment avant de déléguer la lecture des scénarios', async () => {
      await expect(
        service.getPopulationScenarios(
          'building-1',
          actor,
        ),
      ).resolves.toEqual({
        scenarios: [
          {
            id: 'scenario-1',
            nameFR: 'Rejet accidentel d’ammoniac',
            operational: true,
          },
        ],
      });

      expect(
        prisma.building.findFirst,
      ).toHaveBeenCalledWith({
        where: {
          id: 'building-1',
          organizationId: 'org-1',
        },
        select: {
          id: true,
          clientId: true,
        },
      });

      expect(
        populationService.getAvailableScenarios,
      ).toHaveBeenCalledWith('building-1');
    });

    it('ne délègue jamais lorsque le bâtiment est introuvable', async () => {
      prisma.building.findFirst.mockResolvedValue(null);

      await expect(
        service.getPopulationScenarios(
          'building-1',
          actor,
        ),
      ).rejects.toBeInstanceOf(NotFoundException);

      expect(
        populationService.getAvailableScenarios,
      ).not.toHaveBeenCalled();
    });

    it('respecte les restrictions buildingIds du CLIENT_MANAGER', async () => {
      prisma.building.findFirst.mockResolvedValue({
        id: 'building-2',
        clientId: 'client-1',
      });

      await expect(
        service.getPopulationScenarios(
          'building-2',
          actor,
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);

      expect(
        populationService.getAvailableScenarios,
      ).not.toHaveBeenCalled();
    });
  });

  describe('createPopulationAlertDraft', () => {
    const actor = {
      sub: 'client-user-1',
      clientId: 'client-1',
      organizationId: 'org-1',
      role: 'CLIENT_MANAGER',
      buildingIds: ['building-1'],
    };

    const dto = {
      scenarioId: 'scenario-1',
      type: 'EMERGENCY',
      titleFR: 'Alerte ammoniac',
      titleEN: 'Ammonia alert',
      messageFR: 'Un rejet accidentel est en cours.',
      messageEN: 'An accidental release is underway.',
      instructionFR: 'Mettez-vous à l’abri.',
      instructionEN: 'Shelter in place.',
    };

    beforeEach(() => {
      prisma.building.findFirst.mockResolvedValue({
        id: 'building-1',
        clientId: 'client-1',
      });

      populationService.createAlertDraft.mockResolvedValue({
        id: 'alert-1',
        status: 'DRAFT',
      });
    });

    it('délègue la création après validation du bâtiment et impose l’identité issue du JWT', async () => {
      await expect(
        service.createPopulationAlertDraft(
          'building-1',
          dto,
          actor,
        ),
      ).resolves.toEqual({
        id: 'alert-1',
        status: 'DRAFT',
      });

      expect(
        prisma.building.findFirst,
      ).toHaveBeenCalledWith({
        where: {
          id: 'building-1',
          organizationId: 'org-1',
        },
        select: {
          id: true,
          clientId: true,
        },
      });

      expect(
        populationService.createAlertDraft,
      ).toHaveBeenCalledWith(
        'building-1',
        dto,
        {
          type: 'CLIENT_USER',
          id: 'client-user-1',
        },
      );
    });

    it('ne délègue jamais lorsque le bâtiment est hors périmètre', async () => {
      prisma.building.findFirst.mockResolvedValue(null);

      await expect(
        service.createPopulationAlertDraft(
          'building-forbidden',
          dto,
          actor,
        ),
      ).rejects.toBeInstanceOf(NotFoundException);

      expect(
        populationService.createAlertDraft,
      ).not.toHaveBeenCalled();
    });

    it('respecte buildingIds avant toute création de brouillon', async () => {
      prisma.building.findFirst.mockResolvedValue({
        id: 'building-2',
        clientId: 'client-1',
      });

      await expect(
        service.createPopulationAlertDraft(
          'building-2',
          dto,
          actor,
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);

      expect(
        populationService.createAlertDraft,
      ).not.toHaveBeenCalled();
    });

    it('refuse la création si le JWT client ne contient pas d’identité utilisateur', async () => {
      const actorWithoutSub = {
        clientId: 'client-1',
        organizationId: 'org-1',
        role: 'CLIENT_MANAGER',
        buildingIds: ['building-1'],
      };

      await expect(
        service.createPopulationAlertDraft(
          'building-1',
          dto,
          actorWithoutSub,
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);

      expect(
        populationService.createAlertDraft,
      ).not.toHaveBeenCalled();
    });
  });

  describe('Population alert draft lifecycle delegation', () => {
    const actor = {
      sub: 'client-user-1',
      clientId: 'client-1',
      organizationId: 'org-1',
      role: 'CLIENT_MANAGER',
      buildingIds: ['building-1'],
    };

    beforeEach(() => {
      prisma.building.findFirst.mockResolvedValue({
        id: 'building-1',
        clientId: 'client-1',
      });
    });

    it('délègue la consultation d’une alerte après validation du bâtiment', async () => {
      populationService.getAlert.mockResolvedValue({
        id: 'alert-1',
        status: 'DRAFT',
      });

      await service.getPopulationAlert(
        'building-1',
        'alert-1',
        actor,
      );

      expect(
        populationService.getAlert,
      ).toHaveBeenCalledWith(
        'building-1',
        'alert-1',
      );
    });

    it('délègue la modification d’un DRAFT après validation du bâtiment', async () => {
      const dto = {
        titleFR: 'Nouveau titre',
      };

      await service.updatePopulationAlertDraft(
        'building-1',
        'alert-1',
        dto,
        actor,
      );

      expect(
        populationService.updateAlertDraft,
      ).toHaveBeenCalledWith(
        'building-1',
        'alert-1',
        dto,
      );
    });

    it('délègue le recalcul du ciblage après validation du bâtiment', async () => {
      await service.refreshPopulationAlertDraftTargeting(
        'building-1',
        'alert-1',
        actor,
      );

      expect(
        populationService.refreshAlertDraftTargeting,
      ).toHaveBeenCalledWith(
        'building-1',
        'alert-1',
      );
    });

    it('délègue le passage à READY après validation du bâtiment', async () => {
      await service.markPopulationAlertReady(
        'building-1',
        'alert-1',
        actor,
      );

      expect(
        populationService.markAlertDraftReady,
      ).toHaveBeenCalledWith(
        'building-1',
        'alert-1',
      );
    });

    it('ne délègue aucune opération d’alerte lorsque le bâtiment est hors périmètre', async () => {
      prisma.building.findFirst.mockResolvedValue(null);

      await expect(
        service.getPopulationAlert(
          'building-forbidden',
          'alert-1',
          actor,
        ),
      ).rejects.toBeInstanceOf(NotFoundException);

      await expect(
        service.updatePopulationAlertDraft(
          'building-forbidden',
          'alert-1',
          {
            titleFR: 'Titre',
          },
          actor,
        ),
      ).rejects.toBeInstanceOf(NotFoundException);

      await expect(
        service.refreshPopulationAlertDraftTargeting(
          'building-forbidden',
          'alert-1',
          actor,
        ),
      ).rejects.toBeInstanceOf(NotFoundException);

      await expect(
        service.markPopulationAlertReady(
          'building-forbidden',
          'alert-1',
          actor,
        ),
      ).rejects.toBeInstanceOf(NotFoundException);

      expect(
        populationService.getAlert,
      ).not.toHaveBeenCalled();

      expect(
        populationService.updateAlertDraft,
      ).not.toHaveBeenCalled();

      expect(
        populationService.refreshAlertDraftTargeting,
      ).not.toHaveBeenCalled();

      expect(
        populationService.markAlertDraftReady,
      ).not.toHaveBeenCalled();
    });
  });

  describe('approvePopulationAlert', () => {
    const actor = {
      sub: 'client-user-1',
      clientId: 'client-1',
      organizationId: 'org-1',
      role: 'CLIENT_MANAGER',
      buildingIds: ['building-1'],
    };

    beforeEach(() => {
      prisma.building.findFirst.mockResolvedValue({
        id: 'building-1',
        clientId: 'client-1',
      });

      populationService.approveAlert.mockResolvedValue({
        id: 'alert-1',
        status: 'READY',
        approvedById: 'client-user-1',
        approvedAt: new Date(),
      });
    });

    it('délègue l’approbation avec l’identité issue du JWT', async () => {
      await service.approvePopulationAlert(
        'building-1',
        'alert-1',
        actor,
      );

      expect(
        populationService.approveAlert,
      ).toHaveBeenCalledWith(
        'building-1',
        'alert-1',
        {
          type: 'CLIENT_USER',
          id: 'client-user-1',
        },
      );
    });

    it('ne délègue pas l’approbation lorsque le bâtiment est hors périmètre', async () => {
      prisma.building.findFirst.mockResolvedValue(null);

      await expect(
        service.approvePopulationAlert(
          'building-forbidden',
          'alert-1',
          actor,
        ),
      ).rejects.toBeInstanceOf(NotFoundException);

      expect(
        populationService.approveAlert,
      ).not.toHaveBeenCalled();
    });

    it('respecte buildingIds avant toute approbation', async () => {
      prisma.building.findFirst.mockResolvedValue({
        id: 'building-2',
        clientId: 'client-1',
      });

      await expect(
        service.approvePopulationAlert(
          'building-2',
          'alert-1',
          actor,
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);

      expect(
        populationService.approveAlert,
      ).not.toHaveBeenCalled();
    });

    it('refuse l’approbation lorsque le JWT ne contient pas l’identité utilisateur', async () => {
      const actorWithoutSub = {
        clientId: 'client-1',
        organizationId: 'org-1',
        role: 'CLIENT_MANAGER',
        buildingIds: ['building-1'],
      };

      await expect(
        service.approvePopulationAlert(
          'building-1',
          'alert-1',
          actorWithoutSub,
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);

      expect(
        populationService.approveAlert,
      ).not.toHaveBeenCalled();
    });
  });

  describe('freezePopulationAlertRecipients', () => {
    const actor = {
      sub: 'client-user-1',
      clientId: 'client-1',
      organizationId: 'org-1',
      role: 'CLIENT_MANAGER',
      buildingIds: ['building-1'],
    };

    beforeEach(() => {
      prisma.building.findFirst.mockResolvedValue({
        id: 'building-1',
        clientId: 'client-1',
      });

      populationService.freezeAlertRecipients.mockResolvedValue({
        alertId: 'alert-1',
        status: 'READY',
        targeting: {
          subscriberCount: 12,
          deliveryCount: 20,
          smsDeliveryCount: 12,
          emailDeliveryCount: 8,
        },
        deliveries: [],
      });
    });

    it('valide le périmètre bâtiment avant de figer les destinataires', async () => {
      await service.freezePopulationAlertRecipients(
        'building-1',
        'alert-1',
        actor,
      );

      expect(
        populationService.freezeAlertRecipients,
      ).toHaveBeenCalledWith(
        'building-1',
        'alert-1',
      );
    });

    it('ne délègue pas le freeze pour un bâtiment inaccessible', async () => {
      prisma.building.findFirst.mockResolvedValue(null);

      await expect(
        service.freezePopulationAlertRecipients(
          'building-forbidden',
          'alert-1',
          actor,
        ),
      ).rejects.toBeInstanceOf(NotFoundException);

      expect(
        populationService.freezeAlertRecipients,
      ).not.toHaveBeenCalled();
    });

    it('respecte la restriction buildingIds du CLIENT_MANAGER', async () => {
      prisma.building.findFirst.mockResolvedValue({
        id: 'building-2',
        clientId: 'client-1',
      });

      await expect(
        service.freezePopulationAlertRecipients(
          'building-2',
          'alert-1',
          actor,
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);

      expect(
        populationService.freezeAlertRecipients,
      ).not.toHaveBeenCalled();
    });
  });
    describe('sendPopulationAlert', () => {
    const actor = {
      sub: 'client-user-1',
      clientId: 'client-1',
      organizationId: 'org-1',
      role: 'CLIENT_MANAGER',
      buildingIds: ['building-1'],
    };

    it('valide l’accès au bâtiment avant de déléguer l’envoi à PopulationService', async () => {
      const assertBuildingAccessSpy = jest
        .spyOn(service, 'assertBuildingAccess')
        .mockResolvedValue({
          id: 'building-1',
          clientId: 'client-1',
        } as any);

      populationService.sendAlert.mockResolvedValue({
        id: 'alert-1',
        status: 'ACTIVE',
      } as any);

      const result = await service.sendPopulationAlert(
        'building-1',
        'alert-1',
        actor,
      );

      expect(assertBuildingAccessSpy).toHaveBeenCalledWith(
        'building-1',
        actor,
      );

      expect(
        populationService.sendAlert,
      ).toHaveBeenCalledWith(
        'building-1',
        'alert-1',
      );

      expect(result).toEqual({
        id: 'alert-1',
        status: 'ACTIVE',
      });
    });

    it('ne déclenche jamais l’envoi lorsque l’accès au bâtiment est refusé', async () => {
      jest
        .spyOn(service, 'assertBuildingAccess')
        .mockRejectedValue(
          new ForbiddenException(
            'Accès refusé à ce bâtiment',
          ),
        );

      await expect(
        service.sendPopulationAlert(
          'building-1',
          'alert-1',
          actor,
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);

      expect(
        populationService.sendAlert,
      ).not.toHaveBeenCalled();
    });

    it('propage les erreurs métier de PopulationService sans les masquer', async () => {
      jest
        .spyOn(service, 'assertBuildingAccess')
        .mockResolvedValue({
          id: 'building-1',
          clientId: 'client-1',
        } as any);

      populationService.sendAlert.mockRejectedValue(
        new Error(
          'Les destinataires doivent être figés avant l’envoi',
        ),
      );

      await expect(
        service.sendPopulationAlert(
          'building-1',
          'alert-1',
          actor,
        ),
      ).rejects.toThrow(
        'Les destinataires doivent être figés avant l’envoi',
      );
    });
  });

  describe('Population incident communications', () => {
    const actor = {
      sub: 'client-user-1',
      clientId: 'client-1',
      organizationId: 'org-1',
      role: 'CLIENT_MANAGER',
      buildingIds: ['building-1'],
    };

    const followUpDto = {
      sourceAlertId: 'alert-emergency-1',
      titleFR: 'Mise à jour',
      titleEN: 'Update',
      messageFR: 'La situation évolue.',
      messageEN: 'The situation is evolving.',
      instructionFR: 'Restez à l’abri.',
      instructionEN: 'Remain sheltered.',
    };

    it('crée un brouillon UPDATE après validation de l’accès et transmet l’acteur CLIENT_USER', async () => {
      const assertBuildingAccessSpy = jest
        .spyOn(service, 'assertBuildingAccess')
        .mockResolvedValue({
          id: 'building-1',
          clientId: 'client-1',
        } as any);

      populationService.createIncidentFollowUpDraft.mockResolvedValue({
        id: 'alert-update-1',
        type: 'UPDATE',
        status: 'DRAFT',
      } as any);

      const result =
        await service.createPopulationIncidentUpdateDraft(
          'building-1',
          'incident-1',
          followUpDto,
          actor,
        );

      expect(assertBuildingAccessSpy).toHaveBeenCalledWith(
        'building-1',
        actor,
      );

      expect(
        populationService.createIncidentFollowUpDraft,
      ).toHaveBeenCalledWith(
        'building-1',
        'incident-1',
        'alert-emergency-1',
        'UPDATE',
        {
          titleFR: 'Mise à jour',
          titleEN: 'Update',
          messageFR: 'La situation évolue.',
          messageEN: 'The situation is evolving.',
          instructionFR: 'Restez à l’abri.',
          instructionEN: 'Remain sheltered.',
        },
        {
          type: 'CLIENT_USER',
          id: 'client-user-1',
        },
      );

      expect(result).toEqual({
        id: 'alert-update-1',
        type: 'UPDATE',
        status: 'DRAFT',
      });
    });

    it('crée un brouillon ALL_CLEAR distinct dans le même incident', async () => {
      jest
        .spyOn(service, 'assertBuildingAccess')
        .mockResolvedValue({
          id: 'building-1',
          clientId: 'client-1',
        } as any);

      const dto = {
        sourceAlertId: 'alert-update-1',
        titleFR: 'Fin de l’alerte',
        messageFR:
          'La situation d’urgence est maintenant maîtrisée.',
        instructionFR:
          'Vous pouvez reprendre vos activités normales.',
      };

      populationService.createIncidentFollowUpDraft.mockResolvedValue({
        id: 'alert-all-clear-1',
        type: 'ALL_CLEAR',
        status: 'DRAFT',
      } as any);

      await service.createPopulationIncidentAllClearDraft(
        'building-1',
        'incident-1',
        dto,
        actor,
      );

      expect(
        populationService.createIncidentFollowUpDraft,
      ).toHaveBeenCalledWith(
        'building-1',
        'incident-1',
        'alert-update-1',
        'ALL_CLEAR',
        {
          titleFR: 'Fin de l’alerte',
          titleEN: undefined,
          messageFR:
            'La situation d’urgence est maintenant maîtrisée.',
          messageEN: undefined,
          instructionFR:
            'Vous pouvez reprendre vos activités normales.',
          instructionEN: undefined,
        },
        {
          type: 'CLIENT_USER',
          id: 'client-user-1',
        },
      );
    });

    it('refuse UPDATE et ALL_CLEAR lorsque l’identité utilisateur est absente', async () => {
      jest
        .spyOn(service, 'assertBuildingAccess')
        .mockResolvedValue({
          id: 'building-1',
          clientId: 'client-1',
        } as any);

      const actorWithoutSub = {
        clientId: 'client-1',
        organizationId: 'org-1',
        role: 'CLIENT_MANAGER',
        buildingIds: ['building-1'],
      };

      await expect(
        service.createPopulationIncidentUpdateDraft(
          'building-1',
          'incident-1',
          followUpDto,
          actorWithoutSub,
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);

      await expect(
        service.createPopulationIncidentAllClearDraft(
          'building-1',
          'incident-1',
          followUpDto,
          actorWithoutSub,
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);

      expect(
        populationService.createIncidentFollowUpDraft,
      ).not.toHaveBeenCalled();
    });

    it('retourne l’historique Population de l’incident après validation de l’accès', async () => {
      const assertBuildingAccessSpy = jest
        .spyOn(service, 'assertBuildingAccess')
        .mockResolvedValue({
          id: 'building-1',
          clientId: 'client-1',
        } as any);

      populationService.getIncidentAlertHistory.mockResolvedValue([
        {
          id: 'alert-emergency-1',
          type: 'EMERGENCY',
          status: 'ENDED',
        },
        {
          id: 'alert-all-clear-1',
          type: 'ALL_CLEAR',
          status: 'ACTIVE',
        },
      ] as any);

      const result =
        await service.getPopulationIncidentAlertHistory(
          'building-1',
          'incident-1',
          actor,
        );

      expect(assertBuildingAccessSpy).toHaveBeenCalledWith(
        'building-1',
        actor,
      );

      expect(
        populationService.getIncidentAlertHistory,
      ).toHaveBeenCalledWith(
        'building-1',
        'incident-1',
      );

      expect(result).toHaveLength(2);
    });

    it('clôture une alerte Population après validation de l’accès', async () => {
      const assertBuildingAccessSpy = jest
        .spyOn(service, 'assertBuildingAccess')
        .mockResolvedValue({
          id: 'building-1',
          clientId: 'client-1',
        } as any);

      populationService.endAlert.mockResolvedValue({
        id: 'alert-1',
        status: 'ENDED',
      } as any);

      const result = await service.endPopulationAlert(
        'building-1',
        'alert-1',
        actor,
      );

      expect(assertBuildingAccessSpy).toHaveBeenCalledWith(
        'building-1',
        actor,
      );

      expect(
        populationService.endAlert,
      ).toHaveBeenCalledWith(
        'building-1',
        'alert-1',
      );

      expect(result).toEqual({
        id: 'alert-1',
        status: 'ENDED',
      });
    });

    it('annule une alerte Population après validation de l’accès', async () => {
      const assertBuildingAccessSpy = jest
        .spyOn(service, 'assertBuildingAccess')
        .mockResolvedValue({
          id: 'building-1',
          clientId: 'client-1',
        } as any);

      populationService.cancelAlert.mockResolvedValue({
        id: 'alert-1',
        status: 'CANCELLED',
      } as any);

      const result = await service.cancelPopulationAlert(
        'building-1',
        'alert-1',
        actor,
      );

      expect(assertBuildingAccessSpy).toHaveBeenCalledWith(
        'building-1',
        actor,
      );

      expect(
        populationService.cancelAlert,
      ).toHaveBeenCalledWith(
        'building-1',
        'alert-1',
      );

      expect(result).toEqual({
        id: 'alert-1',
        status: 'CANCELLED',
      });
    });

    it('ne délègue aucune opération 7D lorsque l’accès au bâtiment est refusé', async () => {
      jest
        .spyOn(service, 'assertBuildingAccess')
        .mockRejectedValue(
          new ForbiddenException(
            'Accès refusé à ce bâtiment',
          ),
        );

      await expect(
        service.createPopulationIncidentUpdateDraft(
          'building-forbidden',
          'incident-1',
          followUpDto,
          actor,
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);

      await expect(
        service.createPopulationIncidentAllClearDraft(
          'building-forbidden',
          'incident-1',
          followUpDto,
          actor,
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);

      await expect(
        service.getPopulationIncidentAlertHistory(
          'building-forbidden',
          'incident-1',
          actor,
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);

      await expect(
        service.endPopulationAlert(
          'building-forbidden',
          'alert-1',
          actor,
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);

      await expect(
        service.cancelPopulationAlert(
          'building-forbidden',
          'alert-1',
          actor,
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);

      expect(
        populationService.createIncidentFollowUpDraft,
      ).not.toHaveBeenCalled();

      expect(
        populationService.getIncidentAlertHistory,
      ).not.toHaveBeenCalled();

      expect(
        populationService.endAlert,
      ).not.toHaveBeenCalled();

      expect(
        populationService.cancelAlert,
      ).not.toHaveBeenCalled();
    });
  });
});