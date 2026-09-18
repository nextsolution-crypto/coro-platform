import { Test } from '@nestjs/testing';
import { PrismaModule } from '../prisma/prisma.module';
import { PopulationModule } from './population.module';
import { PopulationReadinessService } from './population-readiness.service';

describe('PopulationModule dependency injection', () => {
  it('compiles and resolves PopulationReadinessService through Nest DI', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [PrismaModule, PopulationModule],
    }).compile();

    expect(moduleRef.get(PopulationReadinessService)).toBeInstanceOf(
      PopulationReadinessService,
    );

    await moduleRef.close();
  });
});
