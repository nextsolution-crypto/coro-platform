import {
  PopulationAlertChannel,
  PopulationAlertType,
  PopulationGovernanceMode,
} from '@prisma/client';
import { createHash } from 'crypto';
import { PopulationControlledLiveTestService } from './population-controlled-live-test.service';

const digest = (value: string) =>
  createHash('sha256').update(value).digest('hex');

describe('PopulationControlledLiveTestService', () => {
  const service = new PopulationControlledLiveTestService();
  const previous = { ...process.env };
  const email = 'owner@example.test';
  const phone = '+15145550123';

  beforeEach(() => {
    process.env.POPULATION_CONTROLLED_LIVE_TEST_ENABLED = 'true';
    process.env.POPULATION_CONTROLLED_LIVE_TEST_STOP = 'false';
    process.env.POPULATION_CONTROLLED_LIVE_TEST_ORGANIZATION_ID = 'org-test';
    process.env.POPULATION_CONTROLLED_LIVE_TEST_PROGRAM_ID = 'program-test';
    process.env.POPULATION_CONTROLLED_LIVE_TEST_EMAIL_SHA256 = digest(email);
    process.env.POPULATION_CONTROLLED_LIVE_TEST_SMS_SHA256 = digest(phone);
    process.env.POPULATION_CONTROLLED_LIVE_TEST_MAX_CAMPAIGN_CAD_CENTS = '100';
    process.env.POPULATION_BREVO_EMAIL_SENDER_VERIFIED = 'true';
    process.env.POPULATION_SMS_TFN_APPROVED = 'true';
    process.env.POPULATION_SMS_PRODUCTION_VALIDATED = 'true';
    process.env.POPULATION_BREVO_WEBHOOK_SECRET = 'e'.repeat(32);
    process.env.POPULATION_BREVO_SMS_WEBHOOK_SECRET = 's'.repeat(32);
  });

  afterAll(() => {
    process.env = previous;
  });

  const valid = () => ({
    organizationId: 'org-test',
    programId: 'program-test',
    governanceMode: PopulationGovernanceMode.DUAL_CONTROL,
    alert: {
      type: PopulationAlertType.TEST as PopulationAlertType,
      titleFR: 'EXERCICE / TEST — rejet fictif',
      titleEN: 'EXERCISE / TEST — fictional release',
      createdByType: 'CLIENT_USER',
      createdById: 'creator',
      approvedByType: 'CLIENT_USER',
      approvedById: 'approver',
    },
    deliveries: [
      {
        channel: PopulationAlertChannel.EMAIL,
        destinationSnapshot: email,
        subscriberId: 'owner',
      },
      {
        channel: PopulationAlertChannel.SMS,
        destinationSnapshot: phone,
        subscriberId: 'owner',
      },
    ],
  });

  it('autorise exactement un courriel et un SMS vers le même destinataire logique', () => {
    expect(service.assertCampaign(valid())).toBe(true);
  });

  it('ne s active jamais pour un autre tenant ou programme', () => {
    expect(
      service.assertCampaign({ ...valid(), organizationId: 'other-org' }),
    ).toBe(false);
    expect(
      service.assertCampaign({ ...valid(), programId: 'other-program' }),
    ).toBe(false);
  });

  it.each([
    [
      'arrêt',
      () => (process.env.POPULATION_CONTROLLED_LIVE_TEST_STOP = 'true'),
    ],
    [
      'mauvais type',
      () => (valid().alert.type = PopulationAlertType.EMERGENCY),
    ],
  ])('refuse %s', (_label, mutate) => {
    const input = valid();
    if (_label === 'arrêt') mutate();
    else input.alert.type = PopulationAlertType.EMERGENCY;
    expect(() => service.assertCampaign(input)).toThrow();
  });

  it('refuse le même acteur et une destination hors allowlist', () => {
    const sameActor = valid();
    sameActor.alert.approvedById = 'creator';
    expect(() => service.assertCampaign(sameActor)).toThrow(
      'CONTROLLED_TEST_DISTINCT_APPROVER_REQUIRED',
    );
    const outside = valid();
    outside.deliveries[0].destinationSnapshot = 'other@example.test';
    expect(() => service.assertCampaign(outside)).toThrow(
      'CONTROLLED_TEST_DESTINATION_NOT_ALLOWED',
    );
  });

  it('maintient le canal SMS bloqué tant que le TFN n’est pas approuvé', () => {
    process.env.POPULATION_SMS_TFN_APPROVED = 'false';
    expect(() => service.assertCampaign(valid())).toThrow(
      'CONTROLLED_TEST_TFN_NOT_APPROVED',
    );
  });

  it('refuse les doublons et masque sans exposer la destination', () => {
    const duplicate = valid();
    duplicate.deliveries.push({ ...duplicate.deliveries[0] });
    expect(() => service.assertCampaign(duplicate)).toThrow(
      'CONTROLLED_TEST_EXACT_ROSTER_REQUIRED',
    );
    expect(service.mask(PopulationAlertChannel.EMAIL, email)).toBe(
      'ow***@example.test',
    );
    expect(service.mask(PopulationAlertChannel.SMS, phone)).toBe('+1***23');
  });
});
