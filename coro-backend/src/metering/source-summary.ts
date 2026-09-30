import { BadRequestException } from '@nestjs/common';
import { MeteringSourceSummaryV1 } from './metering.types';

export const buildSourceSummary = (
  input: Omit<MeteringSourceSummaryV1, 'schemaVersion'>,
): MeteringSourceSummaryV1 => {
  const summary: MeteringSourceSummaryV1 = {
    schemaVersion: '1',
    sourceModels: [...new Set(input.sourceModels)].sort(),
    contributingRows: input.contributingRows,
    ...(input.excludedRows === undefined
      ? {}
      : { excludedRows: input.excludedRows }),
    aggregation: input.aggregation,
    ...(input.earliestOccurredAt
      ? { earliestOccurredAt: input.earliestOccurredAt }
      : {}),
    ...(input.latestOccurredAt
      ? { latestOccurredAt: input.latestOccurredAt }
      : {}),
    warningCodes: [...new Set(input.warningCodes)].sort(),
  };
  if (Buffer.byteLength(JSON.stringify(summary), 'utf8') > 8192)
    throw new BadRequestException('Le résumé de source dépasse 8192 octets.');
  return summary;
};
