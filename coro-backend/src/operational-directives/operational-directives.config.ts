export const OPERATIONAL_DIRECTIVES_FEATURE_FLAG =
  'OPERATIONAL_DIRECTIVES_ENABLED';
export const OPERATIONAL_FOLLOWUPS_FEATURE_FLAG =
  'OPERATIONAL_FOLLOWUPS_ENABLED';

export const operationalDirectivesEnabled = (
  environment: NodeJS.ProcessEnv = process.env,
) => environment[OPERATIONAL_DIRECTIVES_FEATURE_FLAG] === 'true';

export const operationalFollowUpsEnabled = (
  environment: NodeJS.ProcessEnv = process.env,
) => environment[OPERATIONAL_FOLLOWUPS_FEATURE_FLAG] === 'true';
