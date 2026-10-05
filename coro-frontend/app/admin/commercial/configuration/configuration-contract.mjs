export const GOVERNED_CONFIGURATION_DEFINITION = "professional-direct/v1";
export const GOVERNED_CONFIGURATION_STEPS = [
  "ANALYZE",
  "APPLY",
  "REVIEW",
  "APPROVE",
  "PUBLISH",
];
export const configurationCanApply = (analysis) =>
  analysis && !analysis.blockers?.length && analysis.changes > 0;
export const configurationCanApprove = (analysis) =>
  analysis?.status === "READY_FOR_REVIEW";
export const configurationCanPublish = (analysis) =>
  analysis?.status === "APPROVED" && analysis.approval?.current === true;
