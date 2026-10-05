import { CommercialConfigurationService } from './commercial-configuration.service';

describe('CommercialConfigurationService publication recovery', () => {
  it('keeps a published Cost authority and records PARTIALLY_PUBLISHED when PriceBook publication fails', async () => {
    const deployment = {
      id: 'deployment-1',
      status: 'APPROVED',
      approvedAt: new Date('2026-10-05T12:00:00.000Z'),
      configurationFingerprint: 'fingerprint-1',
      costAssumptionVersionId: 'cost-version-1',
      priceBookVersionId: 'price-version-1',
    };
    const update = jest
      .fn()
      .mockResolvedValueOnce({ ...deployment, status: 'COST_PUBLISHED' })
      .mockResolvedValueOnce({
        ...deployment,
        status: 'PARTIALLY_PUBLISHED',
      });
    const prisma = {
      commercialConfigurationDeployment: {
        findUnique: jest.fn().mockResolvedValue(deployment),
        update,
      },
    };
    const catalog = {
      publishVersion: jest.fn().mockRejectedValue(new Error('price failure')),
    };
    const simulator = {
      transitionAssumption: jest
        .fn()
        .mockResolvedValue({ id: 'cost-version-1', status: 'PUBLISHED' }),
    };
    const service = new CommercialConfigurationService(
      prisma as never,
      catalog as never,
      simulator as never,
      {} as never,
    );
    jest.spyOn(service, 'analyze').mockResolvedValue({
      configurationFingerprint: 'fingerprint-1',
      target: { priceBookVersionId: 'price-version-1' },
    } as never);

    await expect(
      service.publish(
        'professional-direct',
        '2026-10-05T00:00:00.000Z',
        'Founder publication',
        { userId: 'super-admin-1' },
      ),
    ).rejects.toMatchObject({ response: { code: 'PARTIAL_PUBLICATION' } });

    expect(simulator.transitionAssumption).toHaveBeenCalledWith(
      'cost',
      'cost-version-1',
      'publish',
      'Founder publication',
      { userId: 'super-admin-1' },
    );
    expect(catalog.publishVersion).toHaveBeenCalledWith(
      'price-version-1',
      {
        effectiveFrom: '2026-10-05T00:00:00.000Z',
        reason: 'Founder publication',
      },
      { userId: 'super-admin-1' },
    );
    expect(update).toHaveBeenNthCalledWith(1, {
      where: { id: 'deployment-1' },
      data: { status: 'COST_PUBLISHED', lockVersion: { increment: 1 } },
    });
    expect(update).toHaveBeenNthCalledWith(2, {
      where: { id: 'deployment-1' },
      data: {
        status: 'PARTIALLY_PUBLISHED',
        lockVersion: { increment: 1 },
      },
    });
  });
});
