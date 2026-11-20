export type ReportReviewAction =
  | "REVIEWED"
  | "CORRECTION_REQUESTED"
  | "APPROVED";

export function visibleReviewActions(
  permissions: readonly string[],
): ReportReviewAction[];

export const reviewActionPresentation: Readonly<
  Record<ReportReviewAction, Readonly<{ label: string; success: string }>>
>;
