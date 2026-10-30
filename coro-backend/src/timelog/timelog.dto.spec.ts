import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateTimelogEntryDto, UpdateTimelogEntryDto } from './timelog.dto';

const valid = {
  date: '2026-10-29', heures: '1.25', category: 'admin', note: 'Test',
  clientRequestId: '6385ee1b-6aef-4e6d-9402-33f51331a74f',
};

describe('Timelog DTO', () => {
  it('accepts a finite positive numeric string from the current form', async () => {
    const dto = plainToInstance(CreateTimelogEntryDto, valid);
    expect(await validate(dto)).toHaveLength(0);
    expect(dto.heures).toBe(1.25);
  });

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY, null, undefined])(
    'rejects invalid duration %p', async heures => {
      const dto = plainToInstance(CreateTimelogEntryDto, { ...valid, heures });
      expect((await validate(dto)).length).toBeGreaterThan(0);
    },
  );

  it.each(['2025-02-29', '2026-02-30', '29-10-2026', '', null])(
    'rejects invalid civil date %p', async date => {
      const dto = plainToInstance(CreateTimelogEntryDto, { ...valid, date });
      expect((await validate(dto)).length).toBeGreaterThan(0);
    },
  );

  it('rejects an overlong note', async () => {
    const dto = plainToInstance(CreateTimelogEntryDto, { ...valid, note: 'x'.repeat(2001) });
    expect((await validate(dto)).length).toBeGreaterThan(0);
  });

  it('distinguishes an omitted optional note from an explicit empty note', async () => {
    const omitted = plainToInstance(UpdateTimelogEntryDto, { heures: 1, lockVersion: 0 });
    const empty = plainToInstance(UpdateTimelogEntryDto, { heures: 1, note: '', lockVersion: 0 });
    expect(await validate(omitted)).toHaveLength(0);
    expect(await validate(empty)).toHaveLength(0);
    expect(omitted.note).toBeUndefined();
    expect(empty.note).toBe('');
  });
});
