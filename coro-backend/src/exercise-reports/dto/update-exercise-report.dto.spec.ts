import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UpdateExerciseReportDto } from './update-exercise-report.dto';

describe('UpdateExerciseReportDto', () => {
  it('accepts explicit null for nullable scalar fields', async () => {
    const dto = plainToInstance(UpdateExerciseReportDto, {
      occurredAt: null,
      conclusion: null,
    });
    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it('rejects null for collections', async () => {
    const dto = plainToInstance(UpdateExerciseReportDto, {
      participants: null,
    });
    expect(await validate(dto)).not.toHaveLength(0);
  });

  it('rejects malformed keys', async () => {
    const dto = plainToInstance(UpdateExerciseReportDto, {
      participants: [{ key: 'bad key', name: 'A', order: 0 }],
    });
    expect(await validate(dto)).not.toHaveLength(0);
  });

  it('rejects oversized collections', async () => {
    const dto = plainToInstance(UpdateExerciseReportDto, {
      findings: Array.from({ length: 251 }, (_, index) => ({
        key: `finding-${index}`,
        type: 'GAP',
        description: 'Gap',
        order: index,
      })),
    });
    expect(await validate(dto)).not.toHaveLength(0);
  });

  it('rejects oversized text', async () => {
    const dto = plainToInstance(UpdateExerciseReportDto, {
      conclusion: 'x'.repeat(20001),
    });
    expect(await validate(dto)).not.toHaveLength(0);
  });
});
