import { CoroActorType } from '@prisma/client';
import {
  ensureProvenanceActor,
  provenanceActor,
} from './coro-actor-provenance';

describe('typed business actor provenance', () => {
  it('derives a client actor exclusively from canonical authority', async () => {
    const upsert = jest.fn().mockResolvedValue({});
    const authority = {
      actorType: 'CLIENT_USER' as const,
      actorId: 'client-user',
      organizationId: 'organization',
      clientId: 'client',
      role: 'CLIENT_MANAGER' as const,
      sessionVersion: 4,
      permissions: [],
      buildingIds: ['building'],
    };
    expect(provenanceActor(authority)).toMatchObject({
      actorType: 'CLIENT_USER',
      actorId: 'client-user',
    });
    await ensureProvenanceActor(
      { coroActorIdentity: { upsert } } as never,
      authority,
    );
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        // Jest asymmetric matchers are intentionally dynamic at this boundary.
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        create: expect.objectContaining({
          actorType: CoroActorType.CLIENT_USER,
          clientUserId: 'client-user',
          userId: null,
        }),
      }),
    );
  });
});
