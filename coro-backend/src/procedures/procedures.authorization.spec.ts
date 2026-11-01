import { NotFoundException } from '@nestjs/common';
import { ProceduresService } from './procedures.service';

const actor = { userId: 'operator-a', organizationId: 'org-a', role: 'OPERATOR' };

describe('ProceduresService project-scoped reads', () => {
  it('denies a known project outside the canonical actor scope before reading overrides', async () => {
    const prisma: any = {
      project: { findFirst: jest.fn().mockResolvedValue(null) },
      procedureDefault: { findMany: jest.fn() },
      procedureOverride: { findMany: jest.fn() },
    };
    await expect(new ProceduresService(prisma).findAllForProject('foreign-project', actor))
      .rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.procedureDefault.findMany).not.toHaveBeenCalled();
    expect(prisma.procedureOverride.findMany).not.toHaveBeenCalled();
  });

  it('applies the same project scope before resolving a direct project override', async () => {
    const prisma: any = {
      procedureDefault: { findUnique: jest.fn().mockResolvedValue({ id: 'proc-a' }) },
      project: { findFirst: jest.fn().mockResolvedValue(null) },
      procedureOverride: { findUnique: jest.fn(), findFirst: jest.fn() },
    };
    await expect(new ProceduresService(prisma).findOne('proc-a', 'foreign-project', actor))
      .rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.procedureOverride.findUnique).not.toHaveBeenCalled();
  });
});
