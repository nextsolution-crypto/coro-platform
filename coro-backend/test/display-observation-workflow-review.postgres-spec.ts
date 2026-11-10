import { createHash, randomUUID } from 'node:crypto';
import { DisplayPermission, UserRole } from '@prisma/client';
import {
  ClientDisplayService,
  type ClientDisplayActor,
} from '../src/client-portal/client-display.service';
import { DisplayObservationWorkflowService } from '../src/display-plans/display-observation-workflow.service';
import { PrismaService } from '../src/prisma/prisma.service';
import type { SpatialActor } from '../src/spatial/spatial-authorization.service';
import type { StorageService } from '../src/storage/storage.service';

const enabled = process.env.RUN_POSTGRES_TESTS === 'true';
const describePostgres = enabled ? describe : describe.skip;
const professionalPermissions = [
  DisplayPermission.DISPLAY_OBSERVATION_READ,
  DisplayPermission.DISPLAY_OBSERVATION_QUALIFY,
  DisplayPermission.DISPLAY_OBSERVATION_ASSIGN,
  DisplayPermission.DISPLAY_OBSERVATION_DECIDE,
  DisplayPermission.DISPLAY_OBSERVATION_RESPOND,
  DisplayPermission.DISPLAY_OBSERVATION_RESOLVE,
  DisplayPermission.DISPLAY_OBSERVATION_CLOSE,
  DisplayPermission.DISPLAY_OBSERVATION_AUDIT_READ,
];

describePostgres(
  'DISPLAY-05C independent workflow review on PostgreSQL 16',
  () => {
    const prisma = new PrismaService();
    const workflow = new DisplayObservationWorkflowService(prisma);
    const previewBytes = Buffer.from('display-05c-review-preview');
    const clientService = new ClientDisplayService(prisma, {
      downloadPrivate: jest.fn().mockResolvedValue(previewBytes),
    } as unknown as StorageService);

    beforeAll(async () => prisma.$connect());
    afterAll(async () => prisma.$disconnect());

    it('demonstrates tenant isolation, governed transitions, concurrency and immutable evidence', async () => {
      const suffix = randomUUID();
      const organizations = await Promise.all(
        ['A', 'B', 'C'].map((label) =>
          prisma.organization.create({
            data: { name: `05C review ${label} ${suffix}` },
          }),
        ),
      );
      const clients = await Promise.all(
        organizations.map((organization, index) =>
          prisma.client.create({
            data: {
              name: `05C Client ${index} ${suffix}`,
              organizationId: organization.id,
            },
          }),
        ),
      );
      const buildings = await Promise.all(
        organizations.map((organization, index) =>
          prisma.building.create({
            data: {
              name: `05C Bâtiment ${index}`,
              address: `${index} rue QA`,
              city: 'Montréal',
              province: 'QC',
              organizationId: organization.id,
              clientId: clients[index].id,
            },
          }),
        ),
      );
      const professional = await prisma.user.create({
        data: {
          email: `05c-professional-${suffix}@example.invalid`,
          password: 'not-used',
          firstName: 'Revue',
          lastName: 'Décideur',
          role: UserRole.OPERATOR,
          organizationId: organizations[0].id,
          displayPermissions: professionalPermissions,
          displayBuildingIds: [buildings[0].id],
        },
      });
      const validator = await prisma.user.create({
        data: {
          email: `05c-validator-${suffix}@example.invalid`,
          password: 'not-used',
          firstName: 'Revue',
          lastName: 'Validateur',
          role: UserRole.OPERATOR,
          organizationId: organizations[0].id,
          displayPermissions: professionalPermissions,
          displayBuildingIds: [buildings[0].id],
        },
      });
      const readOnly = await prisma.user.create({
        data: {
          email: `05c-reader-${suffix}@example.invalid`,
          password: 'not-used',
          firstName: 'Revue',
          lastName: 'Lecture',
          role: UserRole.OPERATOR,
          organizationId: organizations[0].id,
          displayPermissions: [DisplayPermission.DISPLAY_OBSERVATION_READ],
          displayBuildingIds: [buildings[0].id],
        },
      });
      const foreignProfessional = await prisma.user.create({
        data: {
          email: `05c-foreign-${suffix}@example.invalid`,
          password: 'not-used',
          firstName: 'Autre',
          lastName: 'Organisation',
          role: UserRole.OPERATOR,
          organizationId: organizations[1].id,
          displayPermissions: professionalPermissions,
          displayBuildingIds: [buildings[1].id],
        },
      });
      const floor = await prisma.buildingFloor.create({
        data: {
          organizationId: organizations[0].id,
          buildingId: buildings[0].id,
          code: 'RDC',
          name: 'RDC',
        },
      });
      const location = await prisma.displayLocation.create({
        data: {
          organizationId: organizations[0].id,
          buildingId: buildings[0].id,
          floorId: floor.id,
          code: 'HALL',
          label: 'Hall 05C',
        },
      });
      const source = await prisma.projectFile.create({
        data: {
          organizationId: organizations[0].id,
          buildingId: buildings[0].id,
          name: 'Plan 05C approuvé.pdf',
          category: 'plans_evacuation',
          size: 1024,
          mimeType: 'application/pdf',
          storageKey: `qa/${suffix}/source.pdf`,
          url: 'private://source.pdf',
          lifecycleState: 'APPROVED',
          status: 'valide',
          sha256: 'c'.repeat(64),
          approvedAt: new Date(),
          approvedById: professional.id,
          effectiveAt: new Date(Date.now() - 1_000),
        },
      });
      const publication = await prisma.displayPlanPublication.create({
        data: {
          organizationId: organizations[0].id,
          buildingId: buildings[0].id,
          floorId: floor.id,
          locationId: location.id,
          projectFileId: source.id,
          creationRequestId: randomUUID(),
          sourceVersion: source.version,
          sourceSha256: source.sha256!,
          sourceApprovedById: professional.id,
          sourceApprovedAt: source.approvedAt!,
          versionNumber: 1,
          variantVersion: 1,
          variantStorageKey: `qa/${suffix}/preview.png`,
          variantSha256: createHash('sha256')
            .update(previewBytes)
            .digest('hex'),
          variantMimeType: 'image/png',
          orientation: 'LANDSCAPE',
          language: 'FR',
          renderParameters: {},
          status: 'APPROVED',
          createdById: professional.id,
          approvedById: professional.id,
          approvedAt: new Date(),
        },
      });
      const author = await prisma.clientUser.create({
        data: {
          email: `05c-author-${suffix}@example.invalid`,
          password: 'not-used',
          firstName: 'Client',
          lastName: 'Auteur',
          organizationId: organizations[0].id,
          clientId: clients[0].id,
          buildingIds: [buildings[0].id],
          displayBuildingIds: [buildings[0].id],
          displayPermissions: [
            DisplayPermission.DISPLAY_CLIENT_PLAN_READ,
            DisplayPermission.DISPLAY_CLIENT_OBSERVATION_SUBMIT,
            DisplayPermission.DISPLAY_CLIENT_OBSERVATION_READ,
          ],
        },
      });
      const peer = await prisma.clientUser.create({
        data: {
          email: `05c-peer-${suffix}@example.invalid`,
          password: 'not-used',
          firstName: 'Client',
          lastName: 'Pair',
          organizationId: organizations[0].id,
          clientId: clients[0].id,
          buildingIds: [buildings[0].id],
          displayBuildingIds: [buildings[0].id],
          displayPermissions: [
            DisplayPermission.DISPLAY_CLIENT_OBSERVATION_READ,
          ],
        },
      });
      const professionalActor = (
        user: typeof professional,
        organizationId = organizations[0].id,
      ): SpatialActor => ({
        userId: user.id,
        organizationId,
        role: user.role,
      });
      const clientActor = (user: typeof author): ClientDisplayActor => ({
        sub: user.id,
        organizationId: user.organizationId,
        clientId: user.clientId,
        buildingIds: user.buildingIds,
        displayBuildingIds: user.displayBuildingIds,
        displayPermissions: user.displayPermissions,
      });
      const observation = await clientService.submit(clientActor(author), {
        requestId: randomUUID(),
        buildingId: buildings[0].id,
        publicationId: publication.id,
        locationId: location.id,
        category: 'DOCUMENT_INFORMATION_INCORRECT',
        suggestedPriority: 'CRITICAL',
        description:
          'La position documentaire de la sortie doit être vérifiée.',
      });

      const list = await workflow.list(
        organizations[0].id,
        professionalActor(readOnly),
        { limit: 25, offset: 0 },
      );
      expect(list.items.map((item) => item.id)).toContain(observation.id);
      expect(list.dashboard.critical).toBeGreaterThanOrEqual(1);
      await expect(
        workflow.qualify(
          organizations[0].id,
          observation.id,
          professionalActor(readOnly),
          {
            requestId: randomUUID(),
            expectedLockVersion: 0,
            reason: 'Interdit en lecture',
            professionalPriority: 'MAJOR',
            qualifiedCategory: 'DOCUMENT_INFORMATION_INCORRECT',
          },
        ),
      ).rejects.toThrow();
      await expect(
        workflow.detail(
          organizations[1].id,
          observation.id,
          professionalActor(foreignProfessional, organizations[1].id),
        ),
      ).rejects.toThrow('Observation introuvable');

      const qualificationRequests = [randomUUID(), randomUUID()];
      const concurrent = await Promise.allSettled(
        qualificationRequests.map((requestId) =>
          workflow.qualify(
            organizations[0].id,
            observation.id,
            professionalActor(professional),
            {
              requestId,
              expectedLockVersion: 0,
              reason: 'Qualification concurrente',
              professionalPriority: 'MAJOR',
              qualifiedCategory: 'DOCUMENT_INFORMATION_INCORRECT',
            },
          ),
        ),
      );
      expect(
        concurrent.filter((result) => result.status === 'fulfilled'),
      ).toHaveLength(1);
      expect(
        concurrent.filter((result) => result.status === 'rejected'),
      ).toHaveLength(1);
      let current = await prisma.displayCorrectionObservation.findUniqueOrThrow(
        { where: { id: observation.id } },
      );
      expect(current.suggestedPriority).toBe('CRITICAL');
      expect(current.professionalPriority).toBe('MAJOR');
      expect(
        await prisma.displayCorrectionObservationEvent.count({
          where: {
            observationId: observation.id,
            action: 'OBSERVATION_QUALIFIED',
          },
        }),
      ).toBe(1);

      await expect(
        workflow.assign(
          organizations[0].id,
          observation.id,
          professionalActor(professional),
          {
            requestId: randomUUID(),
            expectedLockVersion: current.lockVersion,
            reason: 'Responsable étranger interdit',
            assignedUserId: foreignProfessional.id,
          },
        ),
      ).rejects.toThrow('Responsable hors');
      await workflow.assign(
        organizations[0].id,
        observation.id,
        professionalActor(professional),
        {
          requestId: randomUUID(),
          expectedLockVersion: current.lockVersion,
          reason: 'Attribution au validateur',
          assignedUserId: validator.id,
        },
      );
      current = await prisma.displayCorrectionObservation.findUniqueOrThrow({
        where: { id: observation.id },
      });
      await workflow.message(
        organizations[0].id,
        observation.id,
        professionalActor(professional),
        {
          requestId: randomUUID(),
          expectedLockVersion: current.lockVersion,
          reason: 'Note de sécurité interne',
          visibility: 'INTERNAL',
          message: 'NOTE INTERNE CONFIDENTIELLE',
        },
      );
      current = await prisma.displayCorrectionObservation.findUniqueOrThrow({
        where: { id: observation.id },
      });
      await workflow.message(
        organizations[0].id,
        observation.id,
        professionalActor(professional),
        {
          requestId: randomUUID(),
          expectedLockVersion: current.lockVersion,
          reason: 'Réponse destinée au client',
          visibility: 'CLIENT',
          message: 'Votre observation est en cours de traitement.',
        },
      );
      const authorPage = await clientService.observations(clientActor(author), {
        limit: 10,
        offset: 0,
      });
      const peerPage = await clientService.observations(clientActor(peer), {
        limit: 10,
        offset: 0,
      });
      expect(JSON.stringify(authorPage)).toContain('Votre observation');
      expect(JSON.stringify(authorPage)).not.toContain(
        'NOTE INTERNE CONFIDENTIELLE',
      );
      expect(peerPage.total).toBe(0);

      current = await prisma.displayCorrectionObservation.findUniqueOrThrow({
        where: { id: observation.id },
      });
      await workflow.transition(
        organizations[0].id,
        observation.id,
        professionalActor(professional),
        {
          requestId: randomUUID(),
          expectedLockVersion: current.lockVersion,
          reason: 'Correction documentaire acceptée',
          toStatus: 'ACCEPTED',
        },
      );
      current = await prisma.displayCorrectionObservation.findUniqueOrThrow({
        where: { id: observation.id },
      });
      await workflow.transition(
        organizations[0].id,
        observation.id,
        professionalActor(professional),
        {
          requestId: randomUUID(),
          expectedLockVersion: current.lockVersion,
          reason: 'Correction rattachée',
          toStatus: 'CORRECTION_IN_PROGRESS',
          correctionReferenceType: 'PROJECT_TASK',
          correctionReferenceId: 'QA-TASK-05C',
        },
      );
      current = await prisma.displayCorrectionObservation.findUniqueOrThrow({
        where: { id: observation.id },
      });
      await expect(
        workflow.transition(
          organizations[0].id,
          observation.id,
          professionalActor(professional),
          {
            requestId: randomUUID(),
            expectedLockVersion: current.lockVersion,
            reason: 'Auto-validation interdite',
            toStatus: 'RESOLVED',
            correctionEvidence: 'Preuve contrôlée',
          },
        ),
      ).rejects.toThrow('autre professionnel');
      await workflow.transition(
        organizations[0].id,
        observation.id,
        professionalActor(validator),
        {
          requestId: randomUUID(),
          expectedLockVersion: current.lockVersion,
          reason: 'Validation indépendante de la preuve',
          toStatus: 'RESOLVED',
          correctionEvidence:
            'Preuve documentaire contrôlée par le validateur.',
        },
      );
      current = await prisma.displayCorrectionObservation.findUniqueOrThrow({
        where: { id: observation.id },
      });
      const closeRequestId = randomUUID();
      await workflow.transition(
        organizations[0].id,
        observation.id,
        professionalActor(professional),
        {
          requestId: closeRequestId,
          expectedLockVersion: current.lockVersion,
          reason: 'Traitement administratif terminé',
          toStatus: 'CLOSED',
        },
      );
      await expect(
        workflow.message(
          organizations[0].id,
          observation.id,
          professionalActor(professional),
          {
            requestId: randomUUID(),
            expectedLockVersion: current.lockVersion + 1,
            reason: 'Message tardif',
            visibility: 'INTERNAL',
            message: 'Ne doit pas être ajouté',
          },
        ),
      ).rejects.toThrow('clôturée');

      await expect(
        prisma.displayCorrectionObservationEvent.updateMany({
          where: { observationId: observation.id },
          data: { reason: 'altération' },
        }),
      ).rejects.toThrow('DISPLAY_OBSERVATION_APPEND_ONLY');
      await expect(
        prisma.displayCorrectionObservationMessage.deleteMany({
          where: { observationId: observation.id },
        }),
      ).rejects.toThrow('DISPLAY_OBSERVATION_APPEND_ONLY');
      const finalPublication =
        await prisma.displayPlanPublication.findUniqueOrThrow({
          where: { id: publication.id },
        });
      const finalSource = await prisma.projectFile.findUniqueOrThrow({
        where: { id: source.id },
      });
      expect(finalPublication.status).toBe('APPROVED');
      expect(finalPublication.variantSha256).toBe(publication.variantSha256);
      expect(finalSource.sha256).toBe(source.sha256);

      await prisma.user.update({
        where: { id: professional.id },
        data: { displayBuildingIds: [] },
      });
      await expect(
        workflow.transition(
          organizations[0].id,
          observation.id,
          professionalActor(professional),
          {
            requestId: closeRequestId,
            expectedLockVersion: current.lockVersion,
            reason: 'Rejeu après révocation',
            toStatus: 'CLOSED',
          },
        ),
      ).rejects.toThrow('bâtiment explicite');
    }, 60_000);
  },
);
