import { HttpException } from '@nestjs/common';
import { assertVerificationBudget, populationDeliveryConcurrency } from './population.service';

describe('protection du coût SMS et débit de diffusion (M7-02, M7-03)', () => {
  afterEach(() => {
    delete process.env.POPULATION_OTP_HOURLY_CAP_PER_PROGRAM;
    delete process.env.POPULATION_DELIVERY_CONCURRENCY;
  });

  function db(count: number) {
    return {
      populationSubscriber: { findUnique: jest.fn().mockResolvedValue({ programId: 'program-1' }) },
      populationVerification: { count: jest.fn().mockResolvedValue(count) },
    };
  }

  it('laisse passer sous le plafond horaire du programme', async () => {
    const d = db(10);
    await expect(assertVerificationBudget(d, 'sub-1')).resolves.toBeUndefined();
    expect(d.populationVerification.count).toHaveBeenCalledWith({
      where: expect.objectContaining({ subscriber: { programId: 'program-1' } }),
    });
  });

  it('met l’inscription en pause au-delà du plafond (429)', async () => {
    process.env.POPULATION_OTP_HOURLY_CAP_PER_PROGRAM = '50';
    await expect(assertVerificationBudget(db(50), 'sub-1')).rejects.toBeInstanceOf(HttpException);
    await expect(assertVerificationBudget(db(50), 'sub-1')).rejects.toMatchObject({ status: 429 });
  });

  it('borne le parallélisme de diffusion', () => {
    expect(populationDeliveryConcurrency()).toBe(10);
    process.env.POPULATION_DELIVERY_CONCURRENCY = '999';
    expect(populationDeliveryConcurrency()).toBe(25);
  });
});
