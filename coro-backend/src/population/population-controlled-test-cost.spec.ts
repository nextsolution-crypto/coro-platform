import { ServiceUnavailableException } from '@nestjs/common';
import { PopulationAlertChannel } from '@prisma/client';
import {
  estimateControlledCampaignCost,
  estimateSmsSegments,
} from './population-controlled-test-cost';

describe('controlled Population campaign cost', () => {
  const previous = { ...process.env };

  beforeEach(() => {
    process.env.POPULATION_CONTROLLED_LIVE_TEST_MAX_CAMPAIGN_CAD_CENTS = '100';
    process.env.POPULATION_CONTROLLED_LIVE_TEST_SMS_CANADA_CAD_MICROS_PER_SEGMENT =
      '75000';
    process.env.POPULATION_CONTROLLED_LIVE_TEST_EMAIL_CAD_MICROS_PER_MESSAGE =
      '1000';
  });

  afterAll(() => {
    process.env = previous;
  });

  it.each([
    ['GSM court', 'A'.repeat(160), 'GSM_7', 1],
    ['GSM concatene', 'A'.repeat(161), 'GSM_7', 2],
    ['extension GSM', '^'.repeat(81), 'GSM_7', 2],
    ['Unicode court', 'é'.repeat(70), 'GSM_7', 1],
    ['Unicode UCS-2', '漢'.repeat(71), 'UCS_2', 2],
    ['emoji UTF-16', '🚨'.repeat(36), 'UCS_2', 2],
  ])('%s', (_label, message, encoding, segments) => {
    expect(estimateSmsSegments(message)).toMatchObject({ encoding, segments });
  });

  it('additionne les segments SMS et le courriel avec des tarifs explicites', () => {
    const estimate = estimateControlledCampaignCost([
      {
        channel: PopulationAlertChannel.SMS,
        messageSnapshot: '漢'.repeat(71),
      },
      {
        channel: PopulationAlertChannel.EMAIL,
        messageSnapshot: 'EXERCICE / TEST',
      },
    ]);
    expect(estimate).toEqual({
      smsSegments: 2,
      emailMessages: 1,
      estimatedCadMicros: 151000,
      budgetCadMicros: 1000000,
    });
  });

  it.each([
    'POPULATION_CONTROLLED_LIVE_TEST_SMS_CANADA_CAD_MICROS_PER_SEGMENT',
    'POPULATION_CONTROLLED_LIVE_TEST_EMAIL_CAD_MICROS_PER_MESSAGE',
  ])('refuse un tarif inconnu : %s', (name) => {
    delete process.env[name];
    expect(() =>
      estimateControlledCampaignCost([
        {
          channel: PopulationAlertChannel.SMS,
          messageSnapshot: 'TEST',
        },
        {
          channel: PopulationAlertChannel.EMAIL,
          messageSnapshot: 'TEST',
        },
      ]),
    ).toThrow(ServiceUnavailableException);
  });

  it('refuse une estimation superieure au plafond', () => {
    process.env.POPULATION_CONTROLLED_LIVE_TEST_MAX_CAMPAIGN_CAD_CENTS = '10';
    expect(() =>
      estimateControlledCampaignCost([
        {
          channel: PopulationAlertChannel.SMS,
          messageSnapshot: 'A'.repeat(161),
        },
        {
          channel: PopulationAlertChannel.EMAIL,
          messageSnapshot: 'TEST',
        },
      ]),
    ).toThrow('CONTROLLED_TEST_BUDGET_EXCEEDED');
  });

  it('refuse un plafond configure au-dela de 100 cents', () => {
    process.env.POPULATION_CONTROLLED_LIVE_TEST_MAX_CAMPAIGN_CAD_CENTS =
      '101';
    expect(() =>
      estimateControlledCampaignCost([
        {
          channel: PopulationAlertChannel.SMS,
          messageSnapshot: 'TEST',
        },
      ]),
    ).toThrow('CONTROLLED_TEST_BUDGET_INVALID');
  });
});
