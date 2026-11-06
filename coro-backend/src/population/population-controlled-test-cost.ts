import { PopulationAlertChannel } from '@prisma/client';
import { ServiceUnavailableException } from '@nestjs/common';

const GSM_7_BASIC = new Set(
  [
    '@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞ',
    ' !"#¤%&\'()*+,-./0123456789:;<=>?',
    'ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿',
    'abcdefghijklmnopqrstuvwxyzäöñüà',
  ]
    .join('')
    .split(''),
);
const GSM_7_EXTENSION = new Set('^{}\\[~]|€'.split(''));

export type SmsSegmentEstimate = {
  encoding: 'GSM_7' | 'UCS_2';
  units: number;
  segments: number;
};

export type ControlledCampaignDeliveryCostInput = {
  channel: PopulationAlertChannel;
  messageSnapshot: string;
};

export type ControlledCampaignCostEstimate = {
  smsSegments: number;
  emailMessages: number;
  estimatedCadMicros: number;
  budgetCadMicros: number;
};

export function estimateSmsSegments(message: string): SmsSegmentEstimate {
  let septets = 0;
  let gsm = true;
  for (const character of message) {
    if (GSM_7_BASIC.has(character)) septets += 1;
    else if (GSM_7_EXTENSION.has(character)) septets += 2;
    else {
      gsm = false;
      break;
    }
  }
  if (gsm) {
    return {
      encoding: 'GSM_7',
      units: septets,
      segments: Math.max(1, Math.ceil(septets / (septets <= 160 ? 160 : 153))),
    };
  }

  const codeUnits = message.length;
  return {
    encoding: 'UCS_2',
    units: codeUnits,
    segments: Math.max(1, Math.ceil(codeUnits / (codeUnits <= 70 ? 70 : 67))),
  };
}

function requiredIntegerEnvironment(name: string, minimum: number) {
  const raw = process.env[name]?.trim();
  if (!raw || !/^\d+$/.test(raw)) {
    throw new ServiceUnavailableException(`${name}_INVALID`);
  }
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < minimum) {
    throw new ServiceUnavailableException(`${name}_INVALID`);
  }
  return value;
}

export function estimateControlledCampaignCost(
  deliveries: ControlledCampaignDeliveryCostInput[],
): ControlledCampaignCostEstimate {
  const budgetCents = requiredIntegerEnvironment(
    'POPULATION_CONTROLLED_LIVE_TEST_MAX_CAMPAIGN_CAD_CENTS',
    1,
  );
  if (budgetCents > 100) {
    throw new ServiceUnavailableException('CONTROLLED_TEST_BUDGET_INVALID');
  }
  const smsRateMicros = requiredIntegerEnvironment(
    'POPULATION_CONTROLLED_LIVE_TEST_SMS_CANADA_CAD_MICROS_PER_SEGMENT',
    1,
  );
  const emailRateMicros = requiredIntegerEnvironment(
    'POPULATION_CONTROLLED_LIVE_TEST_EMAIL_CAD_MICROS_PER_MESSAGE',
    0,
  );
  const sms = deliveries.filter(
    (delivery) => delivery.channel === PopulationAlertChannel.SMS,
  );
  const emailMessages = deliveries.filter(
    (delivery) => delivery.channel === PopulationAlertChannel.EMAIL,
  ).length;
  const smsSegments = sms.reduce(
    (total, delivery) =>
      total + estimateSmsSegments(delivery.messageSnapshot).segments,
    0,
  );
  const estimatedCadMicros =
    smsSegments * smsRateMicros + emailMessages * emailRateMicros;
  const budgetCadMicros = budgetCents * 10_000;
  if (!Number.isSafeInteger(estimatedCadMicros)) {
    throw new ServiceUnavailableException('CONTROLLED_TEST_COST_INVALID');
  }
  if (estimatedCadMicros > budgetCadMicros) {
    throw new ServiceUnavailableException('CONTROLLED_TEST_BUDGET_EXCEEDED');
  }
  return { smsSegments, emailMessages, estimatedCadMicros, budgetCadMicros };
}
