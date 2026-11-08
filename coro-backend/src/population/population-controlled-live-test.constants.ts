export const POPULATION_CONTROLLED_LIVE_TEST_OPERATION =
  'POPULATION_CONTROLLED_LIVE_TEST';

export const POPULATION_CONTROLLED_LIVE_TEST_SMS_SENDER_E164 = '+18335886812';

export const POPULATION_CONTROLLED_LIVE_TEST_QA_PROGRAM_ID =
  '915d3ef5-8e6b-5cb3-94d5-c038ddbe06d7';

/** Server-owned, expiring authority for one campaign, never a public DTO. */
export function controlledPopulationCampaignPinned(
  env: NodeJS.ProcessEnv,
  scope: { organizationId: string; programId: string; alertId: string },
  now = Date.now(),
) {
  const deadline = Date.parse(
    env.POPULATION_CONTROLLED_LIVE_TEST_EXPIRES_AT ?? '',
  );
  return Boolean(
    scope.organizationId &&
    scope.programId &&
    scope.alertId &&
    env.POPULATION_CONTROLLED_LIVE_TEST_ORGANIZATION_ID ===
      scope.organizationId &&
    env.POPULATION_CONTROLLED_LIVE_TEST_PROGRAM_ID === scope.programId &&
    env.POPULATION_CONTROLLED_LIVE_TEST_ALERT_ID === scope.alertId &&
    Number.isFinite(deadline) &&
    deadline > now &&
    deadline - now <= 3_600_000,
  );
}
