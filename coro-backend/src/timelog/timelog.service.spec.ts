import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { TimelogService, parseCivilDate } from './timelog.service';

const model = () => new Proxy({}, { get: (target: any, key) => target[key] ||= jest.fn() });

describe('Timelog integrity', () => {
  it.each(['2024-02-29', '2026-03-08', '2026-11-01', '2026-12-31'])(
    'preserves civil date %s as UTC calendar fields', value => {
      const date = parseCivilDate(value);
      expect(date.toISOString()).toBe(`${value}T00:00:00.000Z`);
    },
  );

  it.each(['2025-02-29', '2026-02-30', 'not-a-date'])('rejects impossible civil date %s', value => {
    expect(() => parseCivilDate(value)).toThrow(RangeError);
  });

  it('rejects a reversed civil-date period before querying data', () => {
    const service = new TimelogService({} as any);
    expect(() => (service as any).parseRange('2026-10-31', '2026-10-01'))
      .toThrow(BadRequestException);
  });

  it('derives owner and tenant, validates the category, and creates an idempotent row', async () => {
    const prisma: any = { timelogCategory: model(), timelogEntry: model() };
    prisma.timelogCategory.findFirst.mockResolvedValue({ id: 'category' });
    prisma.timelogEntry.findFirst.mockResolvedValue(null);
    prisma.timelogEntry.create.mockImplementation(({ data }: any) => ({ id: 'entry', ...data, lockVersion: 0 }));
    const result = await new TimelogService(prisma).addEntry('user-a', 'org-a', {
      date: '2026-10-29', heures: 1.5, category: 'admin', note: ' note ',
      clientRequestId: '6385ee1b-6aef-4e6d-9402-33f51331a74f',
    });
    expect(result).toMatchObject({ userId: 'user-a', organizationId: 'org-a', heures: 1.5, note: 'note' });
    expect(prisma.timelogCategory.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ key: 'admin', isActive: true }),
    }));
  });

  it('rejects an unknown category before writing', async () => {
    const prisma: any = { timelogCategory: model(), timelogEntry: model() };
    prisma.timelogCategory.findFirst.mockResolvedValue(null);
    await expect(new TimelogService(prisma).addEntry('user-a', 'org-a', {
      date: '2026-10-29', heures: 1, category: 'forged',
      clientRequestId: '6385ee1b-6aef-4e6d-9402-33f51331a74f',
    } as any)).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.timelogEntry.create).not.toHaveBeenCalled();
  });

  it('returns the original row when the same create request is repeated', async () => {
    const existing = { id: 'entry', organizationId: 'org-a', userId: 'user-a',
      date: new Date('2026-10-29T00:00:00.000Z'), heures: 1, category: 'admin', note: null };
    const prisma: any = { timelogCategory: model(), timelogEntry: model() };
    prisma.timelogCategory.findFirst.mockResolvedValue({ id: 'category' });
    prisma.timelogEntry.findFirst.mockResolvedValue(existing);
    const result = await new TimelogService(prisma).addEntry('user-a', 'org-a', {
      date: '2026-10-29', heures: 1, category: 'admin',
      clientRequestId: '6385ee1b-6aef-4e6d-9402-33f51331a74f',
    } as any);
    expect(result).toBe(existing);
    expect(prisma.timelogEntry.create).not.toHaveBeenCalled();
  });

  it('atomically rejects a stale update', async () => {
    const prisma: any = { timelogEntry: model() };
    prisma.timelogEntry.updateMany.mockResolvedValue({ count: 0 });
    prisma.timelogEntry.findFirst.mockResolvedValue({ id: 'entry' });
    await expect(new TimelogService(prisma).updateEntry('entry', 'user-a', 'org-a', {
      heures: 2, note: 'local preserved', lockVersion: 1,
    })).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.timelogEntry.updateMany.mock.calls[0][0].where.lockVersion).toBe(1);
  });

  it('does not delete when the version is stale', async () => {
    const prisma: any = { timelogEntry: model() };
    prisma.timelogEntry.deleteMany.mockResolvedValue({ count: 0 });
    prisma.timelogEntry.findFirst.mockResolvedValue({ id: 'entry' });
    await expect(new TimelogService(prisma).deleteEntry('entry', 'user-a', 'org-a', 1))
      .rejects.toBeInstanceOf(ConflictException);
  });
});
